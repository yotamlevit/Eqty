import type { AppState } from "./types";

/**
 * Boot-state for a first visit. Chosen to be plausible for a tech-income
 * household mid-accumulation, so every panel renders meaningful numbers
 * before the user touches anything.
 */
export const DEFAULT_STATE: AppState = {
  mode: "complex",
  simple: {
    currentAssets: 450_000,
    monthlyContribution: 6_000,
    expectedReturnPct: 10,
  },
  portfolio: {
    monthlyContribution: 6_000,
    holdings: [
      {
        id: "h-vti",
        ticker: "VTI",
        name: "Vanguard Total Stock Market",
        assetClass: "equity",
        units: 950,
        price: 295,
        costBasisPerUnit: 182,
        expectedReturnPct: 7.2,
      },
      {
        id: "h-vxus",
        ticker: "VXUS",
        name: "Vanguard Total International",
        assetClass: "equity",
        units: 1_100,
        price: 68,
        costBasisPerUnit: 55,
        expectedReturnPct: 6.5,
      },
      {
        id: "h-bnd",
        ticker: "BND",
        name: "Vanguard Total Bond Market",
        assetClass: "bond",
        units: 520,
        price: 74,
        costBasisPerUnit: 71,
        expectedReturnPct: 4.2,
      },
      {
        id: "h-btc",
        ticker: "BTC",
        name: "Bitcoin",
        assetClass: "crypto",
        units: 0.42,
        price: 104_000,
        costBasisPerUnit: 38_000,
        expectedReturnPct: 9,
      },
      {
        id: "h-cash",
        ticker: "USD",
        name: "High-Yield Cash",
        assetClass: "cash",
        units: 38_000,
        price: 1,
        costBasisPerUnit: 1,
        expectedReturnPct: 3.8,
      },
    ],
  },
  plan: {
    currentAge: 32,
    retirementAge: 55,
    extraMonthlyContribution: 0,
    inflationPct: 3,
    swrPct: 4,
    // Seeded to the default location's (NJ Waterfront) researched net spend;
    // freely editable, and overwritten when another lifestyle is selected.
    targetNetAnnualSpend: 150_000,
    locationId: "nj-waterfront",
  },
};

/**
 * Reference net spend for a representative-cost US city (cost-of-living index
 * 100), benchmarked to the Austin figure: the premium single-person tier,
 * researched 2026 bottom-up (central 1BR, frequent dining, ~3-4 premium trips/
 * yr, and full-price ACA health cover). Locations don't scale off this — each
 * carries its own fixed netAnnualSpend — it only anchors the displayed
 * cost-of-living index: colIndex = netAnnualSpend / this * 100.
 */
export const US_BASELINE_NET_SPEND = 115_000;

/** Fallback taxable-gain share of withdrawals when no ledger is available. */
export const SIMPLE_MODE_GAIN_RATIO = 0.6;

/**
 * Maximum projection span computed by the engine. The dashboard renders a
 * shorter window scaled to the plan: about a decade past retirement, extended
 * if FI lands later than that.
 */
export const MAX_HORIZON_YEARS = 50;

/** Years of post-retirement runway always kept visible on the chart. */
export const POST_RETIREMENT_YEARS = 2;
