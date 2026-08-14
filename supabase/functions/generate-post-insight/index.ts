// Route Intelligence — generates the per-post AI insight (traffic + weather
// + nearby events), batch-processing whatever's due on each cron tick
// instead of a live per-view call. Refresh rules live in the DB triggers
// (see supabase/migrations/042_route_intelligence.sql):
//   * next_refresh_at due → 24h since last generation, or the post was just
//     created/edited (both reset it to now()).
//   * driver_prepickup_refresh_at due & not yet refreshed → the one extra
//     refresh 2h before pickup, only after an agreement was accepted.
// A caller may also pass { post_id } in the request body to force-process
// one specific post immediately regardless of next_refresh_at — used by
// the client right after a post is created, so the first analysis doesn't
// wait for the next cron tick (see hooks/useRides.ts's createPost).
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

// Listing-specific facts drawn from the post's own details, captured at
// creation/edit time (this is what makes the insight regenerate rather than
// stay static — a changed load type or flight resets next_refresh_at, see
// migration 042's edit trigger). Kept separate from the generic
// traffic/weather/events/construction facts above so a listing with nothing
// kind-specific to say (e.g. a package with no declared content) doesn't
// force an empty sentence into the prompt.
function kindFacts(kind: string, details: Record<string, any> | null, airport: boolean, flightNumber: string | null): string | null {
  if (kind === 'hauling') {
    const parts: string[] = [];
    if (details?.loadTypes?.length) parts.push(`load type: ${details.loadTypes.join(', ')}`);
    if (details?.loadSize) parts.push(`load size: ${details.loadSize}`);
    if (parts.length === 0) return null;
    return `This is a hauling listing (${parts.join('; ')}). If rain is in the forecast, advise covering/tarping or otherwise protecting this load.`;
  }
  if (kind === 'package') {
    const parts: string[] = [];
    if (details?.contentTags?.length) parts.push(`contents: ${details.contentTags.join(', ')}`);
    if (details?.handling?.length) parts.push(`handling: ${details.handling.join(', ')}`);
    if (parts.length === 0) return null;
    return `This is a package/courier listing (${parts.join('; ')}). If rain is in the forecast, advise weatherproof packaging appropriate to the declared contents.`;
  }
  // 'ride'
  const flight = details?.flightInfo;
  const rideParts: string[] = [];
  if (airport && flight) {
    const leg = flight.arrival?.delayMinutes ?? flight.departure?.delayMinutes;
    rideParts.push(
      `This is an airport ride for flight ${flightNumber ?? flight.flightNumber} (${flight.airline}), status: ${flight.status}` +
      (leg ? `, currently running about ${leg} minutes ${leg > 0 ? 'delayed' : 'early'}` : '') + '.'
    );
  }
  rideParts.push('This is a passenger ride listing. If rain is in the forecast, suggest passengers bring an umbrella or rain layer.');
  return rideParts.join(' ');
}

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

Deno.serve(async (req) => {
  const googleKey = Deno.env.get('GOOGLE_MAPS_KEY');
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  if (!googleKey || !openaiKey) {
    return new Response(JSON.stringify({ error: 'GOOGLE_MAPS_KEY or OPENAI_API_KEY not configured' }), { status: 500 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // A body is only present on the client's fire-and-forget "just created this
  // post" call — the cron tick posts an empty '{}' body, which still parses
  // fine and falls through to the normal batch-due query below.
  let forcedPostId: string | null = null;
  try {
    const body = await req.json();
    if (body?.post_id) forcedPostId = String(body.post_id);
  } catch {}

  const selectCols = 'post_id, driver_prepickup_refresh_at, driver_prepickup_refreshed, ride_posts!inner(user_id, kind, origin_lat, origin_lng, destination_lat, destination_lng, origin_city, destination_city, scheduled_at, airport, flight_number, details)';

  const nowIso = new Date().toISOString();
  const { data: due, error: dueError } = forcedPostId
    ? await supabase.from('ride_post_insights').select(selectCols).eq('post_id', forcedPostId).limit(1)
    : await supabase
      .from('ride_post_insights')
      .select(selectCols)
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

      // "Anytime this week" hauling posts (details.flexibleDate) store a fake
      // scheduled_at placeholder (Date.now() + 7 days, see app/post/hauling.tsx)
      // just to satisfy the NOT NULL column — it's never shown to the user.
      // Forecasting weather/events for that made-up date and presenting it as
      // real is actively misleading, not just imprecise, so those are skipped
      // entirely here; only route-based facts (traffic baseline, construction)
      // still apply since those don't depend on a specific date/time.
      const isFlexibleDate = (post.details as any)?.flexibleDate === true;
      const scheduledAt = new Date(post.scheduled_at);
      const origin: [number, number] = [post.origin_lat, post.origin_lng];
      const destination: [number, number] = [post.destination_lat, post.destination_lng];

      const { baselineSeconds, trafficSeconds } = await getTraffic(googleKey, origin, destination, isFlexibleDate ? new Date() : scheduledAt);

      let weather: { tempF: number; code: number } | null = null;
      let events: { name: string; venue_name: string | null; venue_city: string | null; event_date: string | null }[] = [];
      if (!isFlexibleDate) {
        const arrivalAt = new Date(scheduledAt.getTime() + (trafficSeconds ?? baselineSeconds ?? 0) * 1000);
        weather = await getWeatherAt(post.destination_lat, post.destination_lng, arrivalAt);

        const windowStart = new Date(scheduledAt.getTime() - 12 * 3600_000).toISOString();
        const windowEnd = new Date(scheduledAt.getTime() + 12 * 3600_000).toISOString();
        const eventsRes = await supabase
          .from('cached_fl_events')
          .select('name, venue_name, venue_city, event_date')
          .in('venue_city', [post.origin_city, post.destination_city].filter(Boolean))
          .gte('event_date', windowStart)
          .lte('event_date', windowEnd)
          .limit(5);
        events = eventsRes.data ?? [];
      }

      // Construction along the route — a simple bbox around origin+destination
      // (buffered ~10mi), overlap-tested against each cached segment's own
      // bbox. Not the actual driving path, but close enough for a "heads up"
      // note rather than turn-by-turn routing (this app has no PostGIS).
      const BBOX_BUFFER_DEG = 0.15;
      const routeMinLat = Math.min(post.origin_lat, post.destination_lat) - BBOX_BUFFER_DEG;
      const routeMaxLat = Math.max(post.origin_lat, post.destination_lat) + BBOX_BUFFER_DEG;
      const routeMinLng = Math.min(post.origin_lng, post.destination_lng) - BBOX_BUFFER_DEG;
      const routeMaxLng = Math.max(post.origin_lng, post.destination_lng) + BBOX_BUFFER_DEG;
      const { data: construction } = await supabase
        .from('cached_fl_construction')
        .select('description, county, start_date, end_date')
        .lte('min_lat', routeMaxLat)
        .gte('max_lat', routeMinLat)
        .lte('min_lng', routeMaxLng)
        .gte('max_lng', routeMinLng)
        .or(`end_date.is.null,end_date.gte.${nowIso}`)
        .limit(5);

      const delayMinutes = baselineSeconds != null && trafficSeconds != null
        ? Math.round((trafficSeconds - baselineSeconds) / 60)
        : null;

      const promptFacts = [
        isFlexibleDate
          ? 'This job has no fixed date/time (the poster selected "Anytime this week") — do not state or imply a specific date, time, or weather forecast anywhere in your note.'
          : null,
        delayMinutes != null
          ? (delayMinutes > 2 ? `Traffic is adding about ${delayMinutes} minutes vs. normal.` : 'Traffic looks normal, no significant delay expected.')
          : 'Traffic data unavailable.',
        isFlexibleDate ? null : (weather ? `Weather near arrival: ${Math.round(weather.tempF)}°F, ${codeToLabel(weather.code)}.` : 'Weather forecast unavailable (too far out).'),
        isFlexibleDate ? null : (
          events.length > 0
            ? `Nearby events around this trip's time: ${events.map((e) => `${e.name} at ${e.venue_name} (${e.venue_city})`).join('; ')}.`
            : 'No major nearby events found.'
        ),
        construction && construction.length > 0
          ? `Active road construction reported near this route: ${construction.map((c: any) => `${c.description}${c.county ? ` (${c.county} County)` : ''}`).join('; ')}. Factor this into your recommendation (e.g. suggest allowing extra time or an alternate window).`
          : 'No active road construction reported near this route.',
        kindFacts(post.kind, post.details, post.airport, post.flight_number),
      ].filter(Boolean).join(' ');

      const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You write a short, helpful 2-3 sentence "route intelligence" note for a rideshare listing app, combining traffic/weather/nearby-event/road-construction facts given to you. If active construction is reported, weigh it alongside traffic when advising on timing — it is a real factor in the recommendation, not just a footnote. The facts also tell you what kind of listing this is (ride, package/courier, or hauling) and its own details (load type, package contents/handling, or flight status) — tailor the advice to that listing type instead of writing something generic, e.g. covering a load, weatherproofing a package, or noting a flight delay, whenever those facts and the weather/timing call for it. Never invent specifics beyond what is given. Plain text, no markdown, no greeting.' },
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
        road_construction: construction ?? [],
        insight_text: insightText,
        generated_at: new Date().toISOString(),
        next_refresh_at: new Date(Date.now() + 24 * 3600_000).toISOString(),
        ...(isPrepickupRun ? { driver_prepickup_refreshed: true } : {}),
      }).eq('post_id', post_id);

      processed++;
    } catch (e) {
      errors.push(String(e));
    }
  }

  return new Response(JSON.stringify({ processed, errors }), { headers: { 'Content-Type': 'application/json' } });
});
