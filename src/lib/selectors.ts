import type { AppState, Portfolio } from "./types";
import { SIMPLE_MODE_GAIN_RATIO } from "./defaults";
import { blendedReturnPct } from "./projection";

/** Current market value of the ledger. */
export function portfolioValue(portfolio: Portfolio): number {
  return portfolio.holdings.reduce((sum, h) => sum + h.units * h.price, 0);
}

/** Total acquisition cost of the ledger. */
export function portfolioCostBasis(portfolio: Portfolio): number {
  return portfolio.holdings.reduce(
    (sum, h) => sum + h.units * h.costBasisPerUnit,
    0
  );
}

/**
 * Share of the portfolio that is unrealized gain — the fraction of any
 * withdrawal the tax engine should treat as taxable. Falls back to the
 * simple-mode assumption when the ledger is empty.
 */
export function portfolioGainRatio(portfolio: Portfolio): number {
  const value = portfolioValue(portfolio);
  if (value <= 0) return SIMPLE_MODE_GAIN_RATIO;
  const ratio = (value - portfolioCostBasis(portfolio)) / value;
  return Math.min(1, Math.max(0, ratio));
}

/** Mode-aware starting assets for the projection. */
export function startingAssets(state: AppState): number {
  return state.mode === "simple"
    ? state.simple.currentAssets
    : portfolioValue(state.portfolio);
}

/** Mode-aware monthly contribution, including the what-if extra slider. */
export function monthlyContribution(state: AppState): number {
  const base =
    state.mode === "simple"
      ? state.simple.monthlyContribution
      : state.portfolio.monthlyContribution;
  return base + state.plan.extraMonthlyContribution;
}

/** Mode-aware nominal expected annual return, percent. */
export function expectedReturnPct(state: AppState): number {
  return state.mode === "simple"
    ? state.simple.expectedReturnPct
    : blendedReturnPct(state.portfolio);
}

/** Mode-aware taxable-gain share of withdrawals. */
export function gainRatio(state: AppState): number {
  return state.mode === "simple"
    ? SIMPLE_MODE_GAIN_RATIO
    : portfolioGainRatio(state.portfolio);
}
