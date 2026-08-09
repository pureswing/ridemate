// Route Intelligence — weekly Florida events refresh (Ticketmaster Discovery
// API), upserted into public.cached_fl_events. Meant to run on a schedule
// (see supabase/migrations/040_fl_events_cache.sql's pg_cron job), not per
// request — one fetch/week covers every user's route lookups for that week.
// Requires a TICKETMASTER_API_KEY secret:
//   supabase secrets set TICKETMASTER_API_KEY=...
//   supabase functions deploy fetch-fl-events
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

interface TmEvent {
  id: string;
  name: string;
  url?: string;
  classifications?: { segment?: { name?: string } }[];
  dates?: { start?: { dateTime?: string } };
  _embedded?: {
    venues?: { name?: string; city?: { name?: string }; location?: { latitude?: string; longitude?: string } }[];
  };
}

const PAGE_SIZE = 200; // Ticketmaster's max per page
const MAX_PAGES = 5;   // caps a single run at 1000 events — plenty for one state/week

Deno.serve(async () => {
  const tmKey = Deno.env.get('TICKETMASTER_API_KEY');
  if (!tmKey) {
    return new Response(JSON.stringify({ error: 'TICKETMASTER_API_KEY not configured' }), { status: 500 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    // Service role — this function is the only writer to cached_fl_events,
    // and RLS on that table only grants SELECT to normal clients.
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const rows: Record<string, unknown>[] = [];
  let page = 0;

  try {
    while (page < MAX_PAGES) {
      const url = new URL('https://app.ticketmaster.com/discovery/v2/events.json');
      url.searchParams.set('apikey', tmKey);
      url.searchParams.set('stateCode', 'FL');
      url.searchParams.set('countryCode', 'US');
      url.searchParams.set('size', String(PAGE_SIZE));
      url.searchParams.set('page', String(page));
      // Only what's still ahead — no point caching events that already happened.
      url.searchParams.set('startDateTime', new Date().toISOString().slice(0, 19) + 'Z');

      const res = await fetch(url.toString());
      if (!res.ok) break;
      const json = await res.json();
      const events: TmEvent[] = json._embedded?.events ?? [];
      if (events.length === 0) break;

      for (const e of events) {
        const venue = e._embedded?.venues?.[0];
        rows.push({
          external_id: e.id,
          name: e.name,
          segment: e.classifications?.[0]?.segment?.name ?? null,
          event_date: e.dates?.start?.dateTime ?? null,
          venue_name: venue?.name ?? null,
          venue_city: venue?.city?.name ?? null,
          venue_lat: venue?.location?.latitude ? Number(venue.location.latitude) : null,
          venue_lng: venue?.location?.longitude ? Number(venue.location.longitude) : null,
          url: e.url ?? null,
          fetched_at: new Date().toISOString(),
        });
      }

      // Last page — Ticketmaster's own page.totalPages tells us when to stop
      // instead of guessing from a short final page.
      const totalPages = json.page?.totalPages ?? page + 1;
      page++;
      if (page >= totalPages) break;
    }

    if (rows.length > 0) {
      const { error } = await supabase.from('cached_fl_events').upsert(rows, { onConflict: 'external_id' });
      if (error) throw error;
    }

    return new Response(JSON.stringify({ fetched: rows.length }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
