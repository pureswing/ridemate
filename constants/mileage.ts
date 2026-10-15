// Fallback reference rate for anywhere the app estimates a cost-per-mile
// figure from a trip's distance. The live value comes from
// public.irs_mileage_rate (kept current weekly from irs.gov by the
// fetch-irs-mileage-rate Edge Function) — these constants are only used if
// that read fails. Never a real transaction amount, always an estimate
// clearly labeled as such.
export const IRS_MILEAGE_RATE = 0.76; // $/mile
export const IRS_MILEAGE_RATE_EFFECTIVE = '2026-07-01';

export interface IrsMileageRate {
  ratePerMile: number;
  effectiveDate: string;    // YYYY-MM-DD
  checkedAt: string | null; // last time it was verified against irs.gov
}

export const IRS_MILEAGE_RATE_FALLBACK: IrsMileageRate = {
  ratePerMile: IRS_MILEAGE_RATE,
  effectiveDate: IRS_MILEAGE_RATE_EFFECTIVE,
  checkedAt: null,
};
