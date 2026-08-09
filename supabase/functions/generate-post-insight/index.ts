// Route Intelligence — generates the per-post AI insight (traffic + weather
// + nearby events), batch-processing whatever's due on each cron tick
// instead of a live per-view call. Refresh rules live in the DB triggers
// (see supabase/migrations/042_route_intelligence.sql):
//   * next_refresh_at due → 24h since last generation, or the post was just
//     created/edited (both reset it to now()).
//   * driver_prepickup_refresh_at due & not yet refreshed → the one extra
//     refresh 2h before pickup, only after an agreement was accepted.
// Requires GOOGLE_MAPS_KEY and OPENAI_API_KEY secrets:
//   supabase secrets set GOOGLE_MAPS_KEY=...
//   supabase secrets set OPENAI_API_KEY=...
//   supabase functions deploy generate-post-insight
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const BATCH_SIZE = 25; // caps one run's cost/runtime — the next tick picks up any overflow

interface DuePost {
  post_id: string;
  origin_lat: number | null;
  origin_lng: number | null;
  destination_lat: number | null;
  destination_lng: number | null;
  origin_city: string;
  destination_city: string;
  scheduled_at: string;
  driver_prepickup_refresh_at: string | null;
  driver_prepickup_refreshed: boolean;
}

// A swing this big (minutes) between the previous and new delay is what
// separates "route update" from "all clear" in the notification — matches
// the design's route-alert example deltas (+25m) without hardcoding one
// single number from the mock.
const DELAY_CHANGE_THRESHOLD_MIN = 10;
// Same fixed set the design's route-alert chips use — these are time-shift
// suggestions the user applies themselves in the post editor, never an
// auto-applied change (surge-pricing-style auto-adjustment is off the table
// per the TNC-compliance notes: RideMate never sets a fare or a schedule).
const ADJUST_OPTIONS_MIN = [5, 10, 15, 20, 30];

function codeToLabel(code: number): string {
  if (code === 0 || code === 1) return 'clear';
  if (code === 2 || code === 3) return code === 3 ? 'overcast' : 'partly cloudy';
  if (code === 45 || code === 48) return 'foggy';
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'rain';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow';
  if ([95, 96, 99].includes(code)) return 'thunderstorms';
  return 'cloudy';
}

async function getTraffic(googleKey: string, origin: [number, number], destination: [number, number], departureAt: Date) {
  const params = new URLSearchParams({
    origin: `${origin[0]},${origin[1]}`,
    destination: `${destination[0]},${destination[1]}`,
    key: googleKey,
  });
  // departure_time only accepted for a future timestamp — a post whose
  // scheduled_at has already passed (e.g. a stale prepickup trigger) just
  // falls back to a plain (traffic-less) duration instead of erroring.
  const departureSeconds = Math.floor(departureAt.getTime() / 1000);
  if (departureSeconds > Date.now() / 1000) {
    params.set('departure_time', String(departureSeconds));
    params.set('traffic_model', 'best_guess');
  }
  const res = await fetch(`https://maps.googleapis.com/maps/api/directions/json?${params}`);
  const data = await res.json();
  const leg = data?.routes?.[0]?.legs?.[0];
  return {
    baselineSeconds: leg?.duration?.value ?? null as number | null,
    trafficSeconds: leg?.duration_in_traffic?.value ?? null as number | null,
  };
}

async function getWeatherAt(lat: number, lng: number, at: Date) {
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=auto&forecast_days=16`
  );
  const data = await res.json();
  const times: string[] = data?.hourly?.time ?? [];
  if (times.length === 0) return null;
  // Closest hour to the target timestamp — Open-Meteo only returns exact
  // on-the-hour slots, not the arbitrary arrival minute.
  let bestIdx = 0;
  let bestDiff = Infinity;
  for (let i = 0; i < times.length; i++) {
    const diff = Math.abs(new Date(times[i]).getTime() - at.getTime());
    if (diff < bestDiff) { bestDiff = diff; bestIdx = i; }
  }
  // Forecast only reaches 16 days out — a post scheduled further ahead has
  // no matching slot yet, so skip weather for it entirely rather than
  // showing a wildly mismatched hour.
  if (bestDiff > 6 * 60 * 60 * 1000) return null;
  return {
    tempF: data.hourly.temperature_2m[bestIdx] as number,
    code: data.hourly.weather_code[bestIdx] as number,
  };
}

Deno.serve(async () => {
  const googleKey = Deno.env.get('GOOGLE_MAPS_KEY');
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  if (!googleKey || !openaiKey) {
    return new Response(JSON.stringify({ error: 'GOOGLE_MAPS_KEY or OPENAI_API_KEY not configured' }), { status: 500 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const nowIso = new Date().toISOString();
  const { data: due, error: dueError } = await supabase
    .from('ride_post_insights')
    .select('post_id, driver_prepickup_refresh_at, driver_prepickup_refreshed, generated_at, traffic_duration_seconds, baseline_duration_seconds, ride_posts!inner(user_id, kind, origin_lat, origin_lng, destination_lat, destination_lng, origin_city, destination_city, scheduled_at)')
    .or(`next_refresh_at.lte.${nowIso},and(driver_prepickup_refresh_at.lte.${nowIso},driver_prepickup_refreshed.eq.false)`)
    .limit(BATCH_SIZE);

  if (dueError) {
    return new Response(JSON.stringify({ error: dueError.message }), { status: 500 });
  }

  let processed = 0;
  const errors: string[] = [];

  for (const row of (due ?? []) as any[]) {
    try {
      const post = row.ride_posts;
      const post_id = row.post_id as string;
      if (!post?.origin_lat || !post?.origin_lng || !post?.destination_lat || !post?.destination_lng) {
        // No route to analyze (e.g. hauling with disposal:'driver') — skip,
        // but still push next_refresh_at out so it doesn't get retried every tick.
        await supabase.from('ride_post_insights').update({ next_refresh_at: new Date(Date.now() + 24 * 3600_000).toISOString() }).eq('post_id', post_id);
        continue;
      }

      const scheduledAt = new Date(post.scheduled_at);
      const origin: [number, number] = [post.origin_lat, post.origin_lng];
      const destination: [number, number] = [post.destination_lat, post.destination_lng];

      const { baselineSeconds, trafficSeconds } = await getTraffic(googleKey, origin, destination, scheduledAt);
      const arrivalAt = new Date(scheduledAt.getTime() + (trafficSeconds ?? baselineSeconds ?? 0) * 1000);
      const weather = await getWeatherAt(post.destination_lat, post.destination_lng, arrivalAt);

      const windowStart = new Date(scheduledAt.getTime() - 12 * 3600_000).toISOString();
      const windowEnd = new Date(scheduledAt.getTime() + 12 * 3600_000).toISOString();
      const { data: events } = await supabase
        .from('cached_fl_events')
        .select('name, venue_name, venue_city, event_date')
        .in('venue_city', [post.origin_city, post.destination_city].filter(Boolean))
        .gte('event_date', windowStart)
        .lte('event_date', windowEnd)
        .limit(5);

      const delayMinutes = baselineSeconds != null && trafficSeconds != null
        ? Math.round((trafficSeconds - baselineSeconds) / 60)
        : null;

      const promptFacts = [
        delayMinutes != null
          ? (delayMinutes > 2 ? `Traffic is adding about ${delayMinutes} minutes vs. normal.` : 'Traffic looks normal, no significant delay expected.')
          : 'Traffic data unavailable.',
        weather ? `Weather near arrival: ${Math.round(weather.tempF)}°F, ${codeToLabel(weather.code)}.` : 'Weather forecast unavailable (too far out).',
        events && events.length > 0
          ? `Nearby events around this trip's time: ${events.map((e: any) => `${e.name} at ${e.venue_name} (${e.venue_city})`).join('; ')}.`
          : 'No major nearby events found.',
      ].join(' ');

      const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You write a short, helpful 2-3 sentence "route intelligence" note for a rideshare listing app, combining traffic/weather/nearby-event facts given to you. Never invent specifics beyond what is given. Plain text, no markdown, no greeting.' },
            { role: 'user', content: promptFacts },
          ],
          max_tokens: 150,
          temperature: 0.5,
        }),
      });
      const aiJson = await aiRes.json();
      const insightText: string | null = aiJson?.choices?.[0]?.message?.content?.trim() ?? null;

      const isPrepickupRun = row.driver_prepickup_refresh_at && !row.driver_prepickup_refreshed && new Date(row.driver_prepickup_refresh_at) <= new Date();

      await supabase.from('ride_post_insights').update({
        traffic_duration_seconds: trafficSeconds,
        baseline_duration_seconds: baselineSeconds,
        weather_temp_f: weather?.tempF ?? null,
        weather_code: weather?.code ?? null,
        nearby_events: events ?? [],
        insight_text: insightText,
        generated_at: new Date().toISOString(),
        next_refresh_at: new Date(Date.now() + 24 * 3600_000).toISOString(),
        ...(isPrepickupRun ? { driver_prepickup_refreshed: true } : {}),
      }).eq('post_id', post_id);

      // Notify the creator on RE-checks only (row.generated_at means this
      // post already had a prior analysis) — the very first generation at
      // post-creation time isn't worth a notification, since the creator
      // already sees it live on the post they just made. Route Intelligence
      // itself is donor-gated on the viewing side (RouteIntelligenceCard),
      // so the accompanying notification follows the same gate rather than
      // pinging every post's creator regardless of plan.
      if (row.generated_at) {
        const oldDelay = row.traffic_duration_seconds != null && row.baseline_duration_seconds != null
          ? Math.round((row.traffic_duration_seconds - row.baseline_duration_seconds) / 60)
          : null;
        const { data: donorRow } = await supabase
          .from('donor_status')
          .select('is_donor')
          .eq('user_id', post.user_id)
          .maybeSingle();

        if (donorRow?.is_donor) {
          const hasUpdate = delayMinutes != null && oldDelay != null && (delayMinutes - oldDelay) >= DELAY_CHANGE_THRESHOLD_MIN;
          await supabase.from('notifications').insert({
            user_id: post.user_id,
            type: 'route_alert',
            title: hasUpdate
              ? `Route update: ${post.origin_city} → ${post.destination_city}`
              : `Route looks good: ${post.origin_city} → ${post.destination_city}`,
            body: hasUpdate
              ? `New conditions reported. Est. delay +${delayMinutes} min — tap to adjust your departure.`
              : 'No new disruptions detected. Conditions look clear for your scheduled departure.',
            data: {
              post_id,
              post_kind: post.kind,
              has_update: hasUpdate,
              adjust_options: ADJUST_OPTIONS_MIN,
              delay_minutes: delayMinutes ?? 0,
            },
          });
        }
      }

      processed++;
    } catch (e) {
      errors.push(String(e));
    }
  }

  return new Response(JSON.stringify({ processed, errors }), { headers: { 'Content-Type': 'application/json' } });
});
