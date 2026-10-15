// Weekly cached AI feedback summary for the Dashboard's Feedback card.
// Cron-only (see supabase/migrations/061_weekly_feedback_summary_cron.sql,
// Sundays) — batch-processes every user whose badge/note counts changed
// since the last generation (get_users_needing_summary_refresh(), see
// 060_community_summary_cache.sql), same cost-saving cadence as Amazon's
// cached AI review summaries: unchanged users cost zero OpenAI calls.
// Requires OPENAI_API_KEY secret (already configured for the old
// summarize-feedback function, reused here):
//   supabase functions deploy generate-weekly-feedback-summaries
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const BATCH_SIZE = 100; // caps one run's cost/runtime — the next Sunday picks up any overflow
const NOTES_PER_USER = 10;

// gpt-6-luna replaced gpt-4o-mini (shut down 2027-01-14). 'none' effort:
// this is pure rewording of the counts/notes given, nothing to reason out,
// and it runs for up to BATCH_SIZE users per Sunday. With reasoning off,
// Luna still rejects max_tokens (needs max_completion_tokens).
const AI_MODEL = 'gpt-6-luna';
const AI_REASONING_EFFORT = 'none';
const AI_MAX_COMPLETION_TOKENS = 400; // two 2-3 sentence copies

// Both languages from one call — see 067_ai_text_spanish.sql for why.
const BILINGUAL_FORMAT = {
  type: 'json_schema',
  json_schema: {
    name: 'feedback_summary',
    strict: true,
    schema: {
      type: 'object',
      properties: { en: { type: 'string' }, es: { type: 'string' } },
      required: ['en', 'es'],
      additionalProperties: false,
    },
  },
};

// Full 18-value catalog from 035_badge_catalog_expansion.sql — the old
// summarize-feedback function's map was stale (only had the original 10).
const BADGE_LABELS: Record<string, string> = {
  punctual: 'being punctual', clean_car: 'a clean car', friendly: 'being friendly',
  good_music: 'great music', fresh_air: 'fresh air in the car', shares_snacks: 'sharing snacks',
  pet_friendly: 'being pet friendly', vip_service: 'VIP-level service', good_navigation: 'good navigation',
  flexible_hours: 'flexible hours', city_expert: 'being a city expert', careful_cargo: 'careful cargo handling',
  fast_delivery: 'fast delivery', on_time: 'being on time', respectful: 'being respectful',
  tidy: 'keeping things tidy', communicative: 'being a good communicator', great_chat: 'great conversation',
};

Deno.serve(async () => {
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiKey) {
    return new Response(JSON.stringify({ summary: null, error: 'OPENAI_API_KEY not configured' }), { status: 500 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: due, error: dueError } = await supabase
    .rpc('get_users_needing_summary_refresh')
    .limit(BATCH_SIZE);
  if (dueError) {
    return new Response(JSON.stringify({ error: dueError.message }), { status: 500 });
  }

  let processed = 0;
  const errors: string[] = [];

  for (const row of (due ?? []) as { user_id: string; badge_count: number; note_count: number }[]) {
    try {
      const [{ data: badgeRows }, { data: noteRows }, { data: profile }] = await Promise.all([
        supabase.rpc('get_badge_counts', { target_user_id: row.user_id }),
        supabase
          .from('feedback_notes')
          .select('note')
          .eq('receiver_id', row.user_id)
          .order('created_at', { ascending: false })
          .limit(NOTES_PER_USER),
        supabase.from('profiles').select('full_name').eq('id', row.user_id).single(),
      ]);

      const badgeContext = ((badgeRows ?? []) as { badge_type: string; count: number }[])
        .filter((b) => b.count > 0)
        .map((b) => `${b.count}x ${BADGE_LABELS[b.badge_type] ?? b.badge_type}`)
        .join(', ');
      const noteContext = ((noteRows ?? []) as { note: string }[]).map((n) => n.note).join(' | ');

      const userContent = [
        `Name: ${profile?.full_name ?? 'this user'}.`,
        badgeContext ? `Badge tags received: ${badgeContext}.` : null,
        noteContext ? `Notes left by other users: ${noteContext}` : null,
      ].filter(Boolean).join(' ');

      const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: AI_MODEL,
          reasoning_effort: AI_REASONING_EFFORT,
          messages: [
            {
              role: 'system',
              content: 'You summarize a week of community feedback (badge tag counts, and any free-text notes left by other users) for a rideshare app dashboard into 2-3 warm, natural sentences. Never invent specifics beyond what is given. No markdown. Return the same summary twice: "en" in English, and "es" in natural, neutral Latin American Spanish (translate English notes, keep the person\'s name as given).',
            },
            { role: 'user', content: userContent },
          ],
          response_format: BILINGUAL_FORMAT,
          max_completion_tokens: AI_MAX_COMPLETION_TOKENS,
        }),
      });
      if (!aiRes.ok) { errors.push(`user ${row.user_id}: OpenAI ${aiRes.status} ${(await aiRes.json().catch(() => null))?.error?.message ?? ''}`); continue; }
      const aiJson = await aiRes.json();
      let summary: string | null = null;
      let summaryEs: string | null = null;
      try {
        const parsed = JSON.parse(aiJson?.choices?.[0]?.message?.content ?? '');
        summary = parsed?.en?.trim() || null;
        summaryEs = parsed?.es?.trim() || null;
      } catch {}
      if (!summary) { errors.push(`user ${row.user_id}: empty summary (finish_reason ${aiJson?.choices?.[0]?.finish_reason})`); continue; }

      await supabase.from('community_summary_cache').upsert({
        user_id: row.user_id,
        summary,
        summary_es: summaryEs,
        badge_count_at_gen: row.badge_count,
        note_count_at_gen: row.note_count,
        generated_at: new Date().toISOString(),
      });
      processed++;
    } catch (e) {
      errors.push(`user ${row.user_id}: ${String(e)}`);
    }
  }

  return new Response(JSON.stringify({ processed, errors }), { headers: { 'Content-Type': 'application/json' } });
});
