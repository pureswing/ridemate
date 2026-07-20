// Edge Function — "What the community says" AI summary on the public
// user-profile screen. Takes the REAL aggregated badge-tag counts given to
// this user (there's no free-text review field in the schema, only
// enum badge tags) and asks OpenAI to turn that into a short natural-
// language summary. Requires an OPENAI_API_KEY secret:
//   supabase secrets set OPENAI_API_KEY=sk-...
//   supabase functions deploy summarize-feedback
// Returns { summary: null } (not an error) when the key isn't configured
// yet, so the client can just omit the section instead of failing.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

interface BadgeCount {
  badge_type: string;
  count: number;
}

const BADGE_LABELS: Record<string, string> = {
  clean_car: 'a clean car',
  punctual: 'being very punctual',
  friendly: 'being very friendly',
  good_vibes: 'great atmosphere in the car',
  smooth_ride: 'a smooth ride',
  on_time: 'being on time',
  communicative: 'being a good communicator',
  respectful: 'being very respectful',
  tidy: 'keeping things tidy',
  great_company: 'being great company',
};

Deno.serve(async (req: Request) => {
  try {
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ summary: null }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { name, badges } = (await req.json()) as { name: string; badges: BadgeCount[] };
    const context = badges
      .filter((b) => b.count > 0)
      .map((b) => `${b.count}x ${BADGE_LABELS[b.badge_type] ?? b.badge_type}`)
      .join(', ');

    if (!context) {
      return new Response(JSON.stringify({ summary: null }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You summarize community feedback tag counts for a rideshare app profile into 2-3 warm, natural sentences. Never invent specifics beyond the given tags. No markdown.',
          },
          {
            role: 'user',
            content: `Rider/driver name: ${name}. Feedback tags received: ${context}.`,
          },
        ],
        max_tokens: 120,
        temperature: 0.6,
      }),
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ summary: null }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const json = await res.json();
    const summary: string | null = json.choices?.[0]?.message?.content?.trim() ?? null;

    return new Response(JSON.stringify({ summary }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ summary: null }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
