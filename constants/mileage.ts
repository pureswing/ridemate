// Shared reference rate for anywhere the app estimates a cost-per-mile
// figure from a trip's distance — the feed's price-context sheet
// (utils/priceAnalysis.ts) and the Dashboard's expense estimate
// (utils/dashboardStats.ts). Never a real transaction amount, always an
// estimate clearly labeled as such.
export const IRS_MILEAGE_RATE = 0.725; // $/mile
