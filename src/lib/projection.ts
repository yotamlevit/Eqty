/**
 * EQTY projection engine.
 *
 * Pure TypeScript, no side effects. Monthly-compounded growth from starting
 * assets plus fixed monthly contributions, with a parallel inflation-deflated
 * ("real", today's dollars) track. Implements the ProjectionEngine contract in
 * lib/types.ts exactly.
 *
 * Percentages arrive as human numbers (7 = 7%) and are converted to fractions
 * at the boundary of each function.
 */

import type {
  Portfolio,
  ProjectionEngine,
  ProjectionPoint,
  ProjectionResult,
} from "./types";

export interface ProjectArgs {
  startingAssets: number;
  monthlyContribution: number;
  annualReturnPct: number;
  inflationPct: number;
  currentAge: number;
  horizonYears: number;
}

export interface ProjectOpts {
  /**
   * Grow the monthly contribution with inflation so it stays constant in
   * today's dollars (a fixed nominal contribution erodes in real terms). Off by
   * default — the base amount is held fixed.
   */
  escalateContributions?: boolean;
}

/**
 * Project a portfolio forward at monthly resolution.
 *
 * The monthly growth rate is the geometric twelfth-root of the annual rate,
 * r_m = (1 + annualReturnPct/100)^(1/12) - 1, so twelve compounded months
 * reproduce the annual return exactly. Each contribution lands at the START of
 * its month (annuity due): add first, then grow, so it earns that month's
 * return too — matching how money invested at the start of the month behaves.
 *
 * With `escalateContributions`, the monthly amount grows at the inflation rate
 * (constant in today's dollars); otherwise the nominal amount is fixed and its
 * real value erodes over time.
 *
 * Point 0 is today: nominal = real = contributed = startingAssets, age =
 * currentAge. The series runs month 0..horizonYears*12 inclusive.
 */
export function project(
  args: ProjectArgs,
  opts: ProjectOpts = {}
): ProjectionResult {
  const {
    startingAssets,
    monthlyContribution,
    annualReturnPct,
    inflationPct,
    currentAge,
    horizonYears,
  } = args;

  // Floor the growth factor at 0: returns below -100%/yr would put a negative
  // base under a fractional exponent and NaN the whole series. -100% means
  // "loses everything each year", which the floor preserves.
  const monthlyRate =
    Math.pow(Math.max(0, 1 + annualReturnPct / 100), 1 / 12) - 1;
  const contribGrowth = opts.escalateContributions ? inflationPct / 100 : 0;
  const totalMonths = Math.round(horizonYears * 12);

  const points: ProjectionPoint[] = [];
  let nominal = startingAssets;
  let contributed = startingAssets;

  for (let month = 0; month <= totalMonths; month++) {
    if (month > 0) {
      // Add this month's contribution at the start, then grow the whole balance.
      const c =
        monthlyContribution * Math.pow(1 + contribGrowth, (month - 1) / 12);
      nominal = (nominal + c) * (1 + monthlyRate);
      contributed += c;
    }
    const deflator = Math.pow(1 + inflationPct / 100, month / 12);
    points.push({
      month,
      age: currentAge + month / 12,
      nominal,
      real: nominal / deflator,
      contributed,
    });
  }

  return { points, blendedReturnPct: annualReturnPct, horizonYears };
}

/**
 * Real (today's-dollar) balance at each month if contributions stop after
 * `stopMonth` and the portfolio then compounds untouched. Identical to
 * `project`'s real track up to `stopMonth`, then diverges below it. Returned as
 * a flat array aligned to months 0..horizonYears*12, ready to graft onto the
 * projection points as the "if you stop investing" line.
 */
export function projectStopInvestReal(
  args: ProjectArgs,
  stopMonth: number,
  opts: ProjectOpts = {}
): number[] {
  const {
    startingAssets,
    monthlyContribution,
    annualReturnPct,
    inflationPct,
    horizonYears,
  } = args;
  const monthlyRate =
    Math.pow(Math.max(0, 1 + annualReturnPct / 100), 1 / 12) - 1;
  const contribGrowth = opts.escalateContributions ? inflationPct / 100 : 0;
  const totalMonths = Math.round(horizonYears * 12);

  const out: number[] = [];
  let nominal = startingAssets;
  for (let month = 0; month <= totalMonths; month++) {
    if (month > 0) {
      // Add at the start of the month (only while still investing), then grow —
      // same annuity-due timing and escalation as `project`.
      const c =
        month <= stopMonth
          ? monthlyContribution * Math.pow(1 + contribGrowth, (month - 1) / 12)
          : 0;
      nominal = (nominal + c) * (1 + monthlyRate);
    }
    const deflator = Math.pow(1 + inflationPct / 100, month / 12);
    out.push(nominal / deflator);
  }
  return out;
}

/**
 * Value-weighted mean of each holding's expected annual return, percent.
 * Weights are current market value (units * price) over total value. An empty
 * portfolio, or one whose total value is zero, returns 0.
 */
export function blendedReturnPct(portfolio: Portfolio): number {
  let totalValue = 0;
  for (const h of portfolio.holdings) {
    totalValue += h.units * h.price;
  }
  if (totalValue <= 0) return 0;

  let weighted = 0;
  for (const h of portfolio.holdings) {
    const value = h.units * h.price;
    weighted += (value / totalValue) * h.expectedReturnPct;
  }
  return weighted;
}

/**
 * First month whose real (today's-dollar) value reaches `target`, or null if
 * the target is never met within the projected horizon. A non-positive target
 * is already satisfied at month 0, so it returns 0.
 */
export function monthsToTarget(
  result: ProjectionResult,
  target: number
): number | null {
  if (target <= 0) return 0;
  for (const point of result.points) {
    if (point.real >= target) return point.month;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Coast FIRE
//
// "Coast" means: stop contributing entirely and let compounding alone carry
// the portfolio to the FIRE number by retirement. Because the FIRE number is
// expressed in today's dollars and compared against the REAL series, all
// coast math runs at the real (inflation-adjusted) growth rate.
// ---------------------------------------------------------------------------

/** Real (inflation-adjusted) annual growth fraction, floored at -100%/yr. */
export function realAnnualRate(
  annualReturnPct: number,
  inflationPct: number
): number {
  const nominal = Math.max(0, 1 + annualReturnPct / 100);
  const inflation = Math.max(1e-9, 1 + inflationPct / 100);
  return nominal / inflation - 1;
}

/**
 * Coast-FIRE requirement at each projected month, today's dollars, aligned
 * with `points`: the balance that, with zero further contributions, still
 * compounds (in real terms) to `fireNumber` by `retirementMonths`. Past
 * retirement the requirement is simply the FIRE number itself.
 */
export function coastCurve(
  points: ProjectionPoint[],
  fireNumber: number,
  retirementMonths: number,
  annualReturnPct: number,
  inflationPct: number
): number[] {
  const rReal = realAnnualRate(annualReturnPct, inflationPct);
  return points.map((p) => {
    const yearsLeft = Math.max(0, (retirementMonths - p.month) / 12);
    // With non-positive real growth, coasting can never grow the balance:
    // the requirement is the full FIRE number at every age.
    if (rReal <= 0) return fireNumber;
    return fireNumber / Math.pow(1 + rReal, yearsLeft);
  });
}

/**
 * First month at which the projected REAL balance meets the coast
 * requirement for that month, or null if it never does within the horizon.
 */
export function monthsToCoast(
  points: ProjectionPoint[],
  coast: number[]
): number | null {
  for (let i = 0; i < points.length && i < coast.length; i++) {
    if (points[i].real >= coast[i]) return points[i].month;
  }
  return null;
}

/**
 * Starting monthly contribution required for the REAL balance to reach
 * `fireNumber` (today's dollars) in exactly `months`. Inverts the same
 * start-of-month (annuity-due) recurrence `project` uses — with matching
 * escalation — so plugging the result back into `project` reproduces the
 * target. Returns null when months <= 0 and 0 when starting assets alone
 * already get there.
 */
export function requiredMonthlyContribution(args: {
  fireNumber: number;
  startingAssets: number;
  annualReturnPct: number;
  inflationPct: number;
  months: number;
  escalateContributions?: boolean;
}): number | null {
  const { fireNumber, startingAssets, annualReturnPct, inflationPct, months } =
    args;
  if (months <= 0) return null;

  const monthlyRate =
    Math.pow(Math.max(0, 1 + annualReturnPct / 100), 1 / 12) - 1;
  const contribGrowth = args.escalateContributions ? inflationPct / 100 : 0;
  const growth = Math.pow(1 + monthlyRate, months);
  const nominalTarget =
    fireNumber * Math.pow(1 + inflationPct / 100, months / 12);

  // Future value at `months` of a $1 starting contribution, added at the start
  // of each month (annuity due) and escalated: contribution m earns growth for
  // (months - m + 1) months. Summed directly — exact and cheap for planning
  // horizons, and matches project()'s recurrence exactly.
  let factor = 0;
  for (let m = 1; m <= months; m++) {
    const esc = Math.pow(1 + contribGrowth, (m - 1) / 12);
    factor += esc * Math.pow(1 + monthlyRate, months - m + 1);
  }
  if (factor <= 0) return null;

  const needed = (nominalTarget - startingAssets * growth) / factor;
  return Math.max(0, needed);
}

export const projectionEngine: ProjectionEngine = {
  project,
  blendedReturnPct,
  monthsToTarget,
};
