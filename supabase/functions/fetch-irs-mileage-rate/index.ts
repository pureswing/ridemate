// Weekly refresh of the IRS business standard mileage rate into
// public.irs_mileage_rate (see supabase/migrations/066_irs_mileage_rate.sql).
// The IRS has no API, so this parses the first (newest) row of the
// "Mileage rates for all years" table on the official page. Any parse
// failure or implausible value leaves the stored row untouched — the app
// keeps showing the last verified rate rather than a bad one.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const IRS_URL = 'https://www.irs.gov/tax-professionals/standard-mileage-rates';

// Sanity bounds in $/mile — the business rate has sat between ~$0.50 and
// ~$0.80 for the last 15 years. Anything outside this is a parse error.
const MIN_RATE = 0.3;
const MAX_RATE = 2.0;

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function cellText(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

// The table's Period column comes in three shapes:
//   "2026 (July 1 – Dec. 31)"  "2025"  "7/1/2022-12/31/2022"
// Returns the period's start date as YYYY-MM-DD.
function parseEffectiveDate(period: string): string | null {
  const slash = period.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slash) return `${slash[3]}-${pad(+slash[1])}-${pad(+slash[2])}`;

  const yearMatch = period.match(/^(\d{4})/);
  if (!yearMatch) return null;
  const year = yearMatch[1];

  const range = period.match(/\(\s*([A-Za-z]+)\.?\s+(\d{1,2})/);
  if (range) {
    const month = MONTHS[range[1].slice(0, 3).toLowerCase()];
    if (!month) return null;
    return `${year}-${pad(month)}-${pad(+range[2])}`;
  }
  return `${year}-01-01`;
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    // Service role — this function is the only writer to irs_mileage_rate.
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const res = await fetch(IRS_URL, { headers: { 'User-Agent': 'Mozilla/5.0 (BoteGo mileage-rate check)' } });
    if (!res.ok) throw new Error(`IRS page returned ${res.status}`);
    const html = await res.text();

    const tableStart = html.search(/Mileage rates for all years/i);
    if (tableStart < 0) throw new Error('Rates table heading not found');
    const tbody = html.slice(tableStart).match(/<tbody>([\s\S]*?)<\/tbody>/i)?.[1];
    if (!tbody) throw new Error('Rates table body not found');
    const firstRow = tbody.match(/<tr>([\s\S]*?)<\/tr>/i)?.[1];
    if (!firstRow) throw new Error('No rows in rates table');
    const cells = [...firstRow.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => cellText(m[1]));
    if (cells.length < 2) throw new Error('Unexpected row shape');

    const periodLabel = cells[0];
    const cents = parseFloat(cells[1]);
    const rate = Math.round(cents * 10) / 1000; // cents -> $, keep 0.1¢ precision
    const effectiveDate = parseEffectiveDate(periodLabel);

    if (!isFinite(rate) || rate < MIN_RATE || rate > MAX_RATE) throw new Error(`Implausible rate: "${cells[1]}"`);
    if (!effectiveDate) throw new Error(`Unparseable period: "${periodLabel}"`);

    const { error } = await supabase.from('irs_mileage_rate').upsert({
      id: 1,
      rate_per_mile: rate,
      effective_date: effectiveDate,
      period_label: periodLabel,
      source_url: IRS_URL,
      checked_at: new Date().toISOString(),
    });
    if (error) throw error;

    return new Response(JSON.stringify({ rate, effectiveDate, periodLabel }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : JSON.stringify(e);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
});
