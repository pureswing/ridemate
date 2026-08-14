// Route Intelligence, construction piece — daily refresh of FDOT's public
// "Active Construction Projects" feature service into
// public.cached_fl_construction. No API key required (see
// supabase/migrations/048_fl_construction_cache.sql's comment for the
// source URL and why a simple bbox is stored instead of the full polyline).
// Meant to run on a schedule (migration 049's pg_cron job), not per request.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const FDOT_QUERY_URL = 'https://gis.fdot.gov/arcgis/rest/services/Active_Construction_Projects/FeatureServer/1/query';
const PAGE_SIZE = 1000; // this layer's own maxRecordCount
const MAX_PAGES = 5;    // statewide active-construction count is in the low hundreds; plenty of headroom

interface FdotFeature {
  attributes: {
    OBJECTID: number;
    ContractId: string | null;
    County: string | null;
    Description: string | null;
    RoadwayId: string | null;
    BeginMP: number | null;
    StartDate: number | null;   // epoch ms
    EstEndDate: number | null;  // epoch ms
  };
  geometry?: { paths: [number, number][][] }; // [lng, lat] pairs, WGS84 (outSR=4326)
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    // Service role — this function is the only writer to cached_fl_construction.
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const rows: Record<string, unknown>[] = [];

  try {
    for (let page = 0; page < MAX_PAGES; page++) {
      const url = new URL(FDOT_QUERY_URL);
      // is820days='N' — the layer's own "Active Construction" vs. "Project
      // in Warranty" (Y) distinction, see the renderer in the layer's own
      // metadata. Warranty-phase projects aren't active roadwork.
      url.searchParams.set('where', "is820days='N'");
      url.searchParams.set('outFields', 'OBJECTID,ContractId,County,Description,RoadwayId,BeginMP,StartDate,EstEndDate');
      url.searchParams.set('geometryPrecision', '4');
      url.searchParams.set('outSR', '4326');
      url.searchParams.set('f', 'json');
      url.searchParams.set('resultRecordCount', String(PAGE_SIZE));
      url.searchParams.set('resultOffset', String(page * PAGE_SIZE));

      const res = await fetch(url.toString());
      if (!res.ok) break;
      const json = await res.json();
      const features: FdotFeature[] = json?.features ?? [];
      if (features.length === 0) break;

      for (const f of features) {
        const paths = f.geometry?.paths;
        if (!paths || paths.length === 0) continue;
        let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
        for (const path of paths) {
          for (const [lng, lat] of path) {
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
            if (lng < minLng) minLng = lng;
            if (lng > maxLng) maxLng = lng;
          }
        }
        if (!isFinite(minLat) || !isFinite(minLng)) continue;

        const a = f.attributes;
        // The layer's own OBJECTID — ContractId+RoadwayId+BeginMP looked
        // unique but the live data has genuine duplicates on that combo
        // (multiple line pieces for the same logical segment), which broke
        // upsert's "ON CONFLICT" (same key twice in one batch). OBJECTID may
        // reshuffle on FDOT's nightly regeneration, but that's harmless here
        // — stale rows just get pruned after 36h like any other churn.
        const externalId = String(a.OBJECTID);
        rows.push({
          external_id: externalId,
          contract_id: a.ContractId,
          county: a.County,
          description: a.Description?.trim() ?? null,
          roadway_id: a.RoadwayId,
          start_date: a.StartDate ? new Date(a.StartDate).toISOString() : null,
          end_date: a.EstEndDate ? new Date(a.EstEndDate).toISOString() : null,
          min_lat: minLat,
          max_lat: maxLat,
          min_lng: minLng,
          max_lng: maxLng,
          fetched_at: new Date().toISOString(),
        });
      }

      if (features.length < PAGE_SIZE) break; // last page
    }

    if (rows.length > 0) {
      const { error } = await supabase.from('cached_fl_construction').upsert(rows, { onConflict: 'external_id' });
      if (error) throw error;
    }

    // Prune segments that dropped out of the active feed (contract finished,
    // moved to warranty, etc.) — anything not refreshed in the last day and
    // a half survives one missed run before falling off.
    await supabase
      .from('cached_fl_construction')
      .delete()
      .lt('fetched_at', new Date(Date.now() - 36 * 3600_000).toISOString());

    return new Response(JSON.stringify({ fetched: rows.length }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : JSON.stringify(e);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
});
