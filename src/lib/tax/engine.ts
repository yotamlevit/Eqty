/**
 * Geo-tax engine: pure functions over LocationProfile tax schedules.
 *
 * All money is USD. `gainRatio` in [0, 1] is the fraction of a withdrawal that
 * is taxable capital gain; the rest is return of basis and never taxed here.
 * Inputs are clamped so callers can pass raw slider values without guarding.
 */

import type {
  LocationProfile,
  TaxBracket,
  TaxComponent,
  TaxComponentAmount,
  TaxEngine,
  WithdrawalTax,
} from "../types";

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function nonNegative(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

/** Marginal walk over a progressive schedule; `upTo: null` is the top slice. */
function progressiveTax(base: number, brackets: TaxBracket[]): number {
  let tax = 0;
  let lower = 0;
  for (const bracket of brackets) {
    if (base <= lower) break;
    const upper = bracket.upTo ?? Number.POSITIVE_INFINITY;
    const slice = Math.min(base, upper) - lower;
    if (slice > 0) tax += slice * bracket.rate;
    lower = upper;
  }
  return tax;
}

function componentTax(
  component: TaxComponent,
  gross: number,
  gainRatio: number
): number {
  const rawBase = component.base === "gain" ? gross * gainRatio : gross;
  const base = Math.max(0, rawBase - (component.allowance ?? 0));
  if (base <= 0) return 0;
  if (component.kind === "flat") {
    const rate = component.rate ?? 0;
    const threshold = component.threshold ?? 0;
    return rate * Math.max(0, base - threshold);
  }
  return progressiveTax(base, component.brackets ?? []);
}

/** Tax owed on a gross annual withdrawal in a given location. */
export function taxOnWithdrawal(
  gross: number,
  profile: LocationProfile,
  gainRatio: number
): WithdrawalTax {
  const g = nonNegative(gross);
  const ratio = clamp01(gainRatio);

  const byComponent: TaxComponentAmount[] = [];
  let totalTax = 0;
  for (const component of profile.components) {
    const amount = componentTax(component, g, ratio);
    byComponent.push({ id: component.id, label: component.label, amount });
    totalTax += amount;
  }

  return {
    gross: g,
    net: g - totalTax,
    totalTax,
    effectiveRate: g === 0 ? 0 : totalTax / g,
    byComponent,
  };
}

/**
 * Smallest gross withdrawal whose net-of-tax value equals `netTarget` (within
 * $1). net(gross) is monotone nondecreasing in gross, so the answer is found
 * by bisection.
 */
export function grossForNet(
  netTarget: number,
  profile: LocationProfile,
  gainRatio: number
): WithdrawalTax {
  const ratio = clamp01(gainRatio);
  if (!(netTarget > 0)) return taxOnWithdrawal(0, profile, ratio);

  const netOf = (gross: number) => taxOnWithdrawal(gross, profile, ratio).net;

  // net(gross) <= gross for any nonnegative tax, so netTarget is a valid lower
  // bound on the required gross.
  const lo0 = netTarget;
  if (netOf(lo0) >= netTarget) {
    // Zero-tax regime (e.g. all-basis withdrawal or a no-tax location): net
    // equals gross, so netTarget is the exact answer.
    return taxOnWithdrawal(lo0, profile, ratio);
  }

  let lo = lo0;
  let hi = netTarget * 1.5;
  // net is nondecreasing, so doubling hi is guaranteed to bracket the target.
  // 60 doublings covers any planning-grade effective rate below 100%.
  let doublings = 0;
  while (netOf(hi) < netTarget && doublings < 60) {
    hi *= 2;
    doublings += 1;
  }

  // Invariant: net(lo) < netTarget <= net(hi). The interval halves each step,
  // so 200 iterations drives it far below the $1 tolerance; `result` tracks the
  // smallest gross seen that still clears the target.
  let result = taxOnWithdrawal(hi, profile, ratio);
  for (let i = 0; i < 200 && hi - lo > 1e-6; i += 1) {
    const mid = (lo + hi) / 2;
    const candidate = taxOnWithdrawal(mid, profile, ratio);
    if (candidate.net < netTarget) {
      lo = mid;
    } else {
      hi = mid;
      result = candidate;
    }
  }
  return result;
}

export const taxEngine: TaxEngine = {
  taxOnWithdrawal,
  grossForNet,
};
