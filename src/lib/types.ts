/**
 * EQTY core domain contracts.
 *
 * All engine code (tax, projection) is pure TypeScript against these types.
 * All monetary values are USD unless a display layer converts for flavor.
 * Percentages are expressed as human-readable numbers (7 = 7%) in inputs,
 * and as fractions (0.07) inside engine math — convert at the boundary.
 */

// ---------------------------------------------------------------------------
// Modes
// ---------------------------------------------------------------------------

export type Mode = "simple" | "complex";

// ---------------------------------------------------------------------------
// Simple mode: flat manual inputs
// ---------------------------------------------------------------------------

export interface SimpleInputs {
  /** Total investable assets today, USD. */
  currentAssets: number;
  /** New money invested per month, USD. */
  monthlyContribution: number;
  /** Nominal expected annual return, percent (e.g. 7 = 7%). */
  expectedReturnPct: number;
}

// ---------------------------------------------------------------------------
// Complex mode: active portfolio ledger
// ---------------------------------------------------------------------------

export type AssetClass = "equity" | "bond" | "cash" | "crypto" | "real-estate";

export interface Holding {
  id: string;
  ticker: string;
  name: string;
  assetClass: AssetClass;
  units: number;
  /** Current price per unit, USD. */
  price: number;
  /** Average acquisition cost per unit, USD. Drives the taxable-gain ratio. */
  costBasisPerUnit: number;
  /** Nominal expected annual return for this holding, percent. */
  expectedReturnPct: number;
}

export interface Portfolio {
  holdings: Holding[];
  /**
   * New money per month. The projection adds it to the aggregate balance and
   * compounds at the blended portfolio rate (no per-holding allocation).
   */
  monthlyContribution: number;
}

// ---------------------------------------------------------------------------
// Shared plan inputs
// ---------------------------------------------------------------------------

export interface PlanInputs {
  currentAge: number;
  /** Age at which withdrawals begin. Anchors the Coast-FIRE math. */
  retirementAge: number;
  /**
   * Additional monthly contribution layered on top of the active mode's base
   * contribution, USD. Driven by the what-if slider in the parameters panel.
   */
  extraMonthlyContribution: number;
  /** Expected annual inflation, percent. */
  inflationPct: number;
  /** Safe withdrawal rate, percent (e.g. 4 = 4%). */
  swrPct: number;
  /**
   * Desired annual spend net of all taxes, USD — the headline planning target.
   * Editable directly, and overwritten with a location's fixed net spend when
   * that lifestyle is selected in the matrix. Drives the FIRE number, years to
   * FI, and coast math against the active location's tax regime.
   */
  targetNetAnnualSpend: number;
  /** Active lifestyle location (LocationProfile.id). */
  locationId: string;
}

export interface AppState {
  mode: Mode;
  simple: SimpleInputs;
  portfolio: Portfolio;
  plan: PlanInputs;
}

// ---------------------------------------------------------------------------
// Geo-tax engine
// ---------------------------------------------------------------------------

/**
 * One marginal bracket of a progressive schedule.
 * `upTo` is the bracket's upper bound on the taxed base (USD); null = top.
 */
export interface TaxBracket {
  upTo: number | null;
  /** Marginal rate as a fraction (0.15 = 15%). */
  rate: number;
}

/**
 * One tax levied by a jurisdiction on retirement withdrawals.
 *
 * `base` selects what the component taxes:
 *  - "gain": only the capital-gain portion of the withdrawal (gross * gainRatio)
 *  - "gross": the entire withdrawal (e.g. health-insurance style levies)
 */
export interface TaxComponent {
  id: string;
  label: string;
  kind: "progressive" | "flat";
  /** Required when kind = "progressive". */
  brackets?: TaxBracket[];
  /** Required when kind = "flat"; fraction. */
  rate?: number;
  /** Flat components only apply to the taxed base above this floor (USD). */
  threshold?: number;
  /** Annual deduction/allowance subtracted from the taxed base first (USD). */
  allowance?: number;
  base: "gain" | "gross";
}

export interface LocationProfile {
  id: string;
  /** Short display name, e.g. "NJ Waterfront". */
  label: string;
  city: string;
  country: string;
  /** ISO currency code, display flavor only — the engine works in USD. */
  currency: string;
  /**
   * Fixed, researched cost of the target premium single lifestyle here — the
   * annual spend net of all taxes, USD. This is the matrix's source of truth:
   * "how much money it takes to live this life in this place." The displayed
   * cost-of-living index is derived from it (netAnnualSpend / US baseline), so
   * the two can never disagree the way a separately hand-set index once did.
   */
  netAnnualSpend: number;
  /** One-line feel of the lifestyle there, rendered under the location name. */
  blurb?: string;
  /**
   * A few sentences on what daily life actually buys here — the apartment,
   * dining, transport, travel, and feel. Shown in the row's expandable detail.
   */
  lifestyle: string;
  components: TaxComponent[];
  /** Short factual notes on the regime, rendered in the matrix detail. */
  notes: string[];
}

export interface TaxComponentAmount {
  id: string;
  label: string;
  amount: number;
}

/** Result of taxing a given gross withdrawal in a given location. */
export interface WithdrawalTax {
  gross: number;
  net: number;
  totalTax: number;
  /** totalTax / gross; 0 when gross is 0. */
  effectiveRate: number;
  byComponent: TaxComponentAmount[];
}

/**
 * Full lifestyle-matrix row for one location: the fixed cost of living that
 * lifestyle there, and what portfolio that demands.
 */
export interface LocationPlan {
  location: LocationProfile;
  /** Fixed researched net spend for this location, USD (= location.netAnnualSpend). */
  netAnnualSpend: number;
  /** Gross withdrawal required so that net-of-tax equals netAnnualSpend. */
  tax: WithdrawalTax;
  /** tax.gross / (swrPct / 100): required portfolio in today's dollars. */
  fireNumber: number;
  /** Months until real projected value crosses fireNumber; null if > horizon. */
  monthsToFire: number | null;
}

// ---------------------------------------------------------------------------
// Projection engine
// ---------------------------------------------------------------------------

export interface ProjectionPoint {
  /** Months from today (0 = now). */
  month: number;
  age: number;
  /** Portfolio value, nominal USD. */
  nominal: number;
  /** Portfolio value deflated to today's dollars. */
  real: number;
  /** Cumulative principal contributed (initial + monthly), nominal USD. */
  contributed: number;
  /**
   * Coast-FIRE requirement at this age, today's dollars: the portfolio that,
   * left alone, still reaches the FIRE number by retirement. Populated by the
   * dashboard when a coast overlay is displayed.
   */
  coast?: number;
}

export interface ProjectionResult {
  points: ProjectionPoint[];
  /** Weighted nominal annual return driving the projection, percent. */
  blendedReturnPct: number;
  horizonYears: number;
}

// ---------------------------------------------------------------------------
// Engine function contracts (implemented in lib/tax and lib/projection)
// ---------------------------------------------------------------------------

export interface TaxEngine {
  /** Tax owed on a gross annual withdrawal. gainRatio in [0, 1]. */
  taxOnWithdrawal(
    gross: number,
    profile: LocationProfile,
    gainRatio: number
  ): WithdrawalTax;
  /**
   * Back-calculate: smallest gross withdrawal whose net-of-tax value equals
   * `netTarget` (within $1). Monotone in gross, solved by bisection.
   */
  grossForNet(
    netTarget: number,
    profile: LocationProfile,
    gainRatio: number
  ): WithdrawalTax;
}

export interface ProjectionEngine {
  /**
   * Monthly-compounded projection from starting assets and contributions.
   * returnPct/inflationPct are annual percents; compounding is monthly at
   * the equivalent monthly rate: (1 + r)^(1/12) - 1.
   */
  project(args: {
    startingAssets: number;
    monthlyContribution: number;
    annualReturnPct: number;
    inflationPct: number;
    currentAge: number;
    horizonYears: number;
  }): ProjectionResult;
  /** Value-weighted expected return of a portfolio, percent. */
  blendedReturnPct(portfolio: Portfolio): number;
  /** First month whose real value >= target; null if never within horizon. */
  monthsToTarget(result: ProjectionResult, target: number): number | null;
}
