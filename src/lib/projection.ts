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

/**
 * Project a portfolio forward at monthly resolution.
 *
 * The monthly growth rate is the geometric twelfth-root of the annual rate,
 * r_m = (1 + annualReturnPct/100)^(1/12) - 1, so twelve compounded months
 * reproduce the annual return exactly. Each contribution lands at the END of
 * its month (ordinary annuity): grow first, then add.
 *
 * Point 0 is today: nominal = real = contributed = startingAssets, age =
 * currentAge. The series runs month 0..horizonYears*12 inclusive.
 */
export function project(args: ProjectArgs): ProjectionResult {
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
  const totalMonths = Math.round(horizonYears * 12);

  const points: ProjectionPoint[] = [];
  let nominal = startingAssets;

  for (let month = 0; month <= totalMonths; month++) {
    if (month > 0) {
      // Grow the standing balance, then add this month's contribution.
      nominal = nominal * (1 + monthlyRate) + monthlyContribution;
    }
    const deflator = Math.pow(1 + inflationPct / 100, month / 12);
    points.push({
      month,
      age: currentAge + month / 12,
      nominal,
      real: nominal / deflator,
      contributed: startingAssets + monthlyContribution * month,
    });
  }

  return { points, blendedReturnPct: annualReturnPct, horizonYears };
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
 * Constant nominal monthly contribution required for the REAL balance to
 * reach `fireNumber` (today's dollars) in exactly `months`. Inverts the same
 * ordinary-annuity recurrence `project` uses, so plugging the result back
 * into `project` reproduces the target. Returns null when months <= 0 and 0
 * when the starting assets alone already get there.
 */
export function requiredMonthlyContribution(args: {
  fireNumber: number;
  startingAssets: number;
  annualReturnPct: number;
  inflationPct: number;
  months: number;
}): number | null {
  const { fireNumber, startingAssets, annualReturnPct, inflationPct, months } =
    args;
  if (months <= 0) return null;

  const monthlyRate =
    Math.pow(Math.max(0, 1 + annualReturnPct / 100), 1 / 12) - 1;
  const growth = Math.pow(1 + monthlyRate, months);
  const nominalTarget =
    fireNumber * Math.pow(1 + inflationPct / 100, months / 12);
  const annuityFactor =
    monthlyRate === 0 ? months : (growth - 1) / monthlyRate;

  const needed = (nominalTarget - startingAssets * growth) / annuityFactor;
  return Math.max(0, needed);
}

export const projectionEngine: ProjectionEngine = {
  project,
  blendedReturnPct,
  monthsToTarget,
};
