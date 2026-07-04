"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  AppState,
  Holding,
  Mode,
  PlanInputs,
  SimpleInputs,
} from "./types";
import { DEFAULT_STATE } from "./defaults";

const STORAGE_KEY = "eqty-state-v1";

/** Persisted numbers pass through user-editable storage: trust nothing. */
function finiteOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

/**
 * Merge a persisted snapshot over the defaults slice-by-slice, so adding new
 * fields in a release never strands users on a broken shape. Every numeric
 * field is re-validated: a hand-edited or corrupt snapshot (e.g. swrPct 0 or
 * NaN) must not reach the engines, where it would divide to Infinity or NaN
 * out the projection.
 */
function reviveState(raw: string): AppState {
  const parsed = JSON.parse(raw) as Partial<AppState>;
  const d = DEFAULT_STATE;
  return {
    mode: parsed.mode === "simple" ? "simple" : "complex",
    simple: {
      currentAssets: Math.max(
        0,
        finiteOr(parsed.simple?.currentAssets, d.simple.currentAssets)
      ),
      monthlyContribution: Math.max(
        0,
        finiteOr(parsed.simple?.monthlyContribution, d.simple.monthlyContribution)
      ),
      expectedReturnPct: Math.max(
        -100,
        finiteOr(parsed.simple?.expectedReturnPct, d.simple.expectedReturnPct)
      ),
    },
    portfolio: {
      monthlyContribution: Math.max(
        0,
        finiteOr(
          parsed.portfolio?.monthlyContribution,
          d.portfolio.monthlyContribution
        )
      ),
      holdings: Array.isArray(parsed.portfolio?.holdings)
        ? parsed.portfolio.holdings.map((h) => ({
            ...h,
            units: Math.max(0, finiteOr(h.units, 0)),
            price: Math.max(0, finiteOr(h.price, 0)),
            costBasisPerUnit: Math.max(0, finiteOr(h.costBasisPerUnit, 0)),
            expectedReturnPct: Math.max(-100, finiteOr(h.expectedReturnPct, 0)),
          }))
        : d.portfolio.holdings,
    },
    plan: {
      currentAge: Math.max(0, finiteOr(parsed.plan?.currentAge, d.plan.currentAge)),
      retirementAge: Math.max(
        0,
        finiteOr(parsed.plan?.retirementAge, d.plan.retirementAge)
      ),
      extraMonthlyContribution: Math.max(
        0,
        finiteOr(
          parsed.plan?.extraMonthlyContribution,
          d.plan.extraMonthlyContribution
        )
      ),
      inflationPct: Math.max(0, finiteOr(parsed.plan?.inflationPct, d.plan.inflationPct)),
      // The SWR divides the gross draw; zero or negative would blow up to
      // Infinity, so anything below a sane floor falls back to the default.
      swrPct:
        finiteOr(parsed.plan?.swrPct, d.plan.swrPct) > 0
          ? finiteOr(parsed.plan?.swrPct, d.plan.swrPct)
          : d.plan.swrPct,
      targetNetAnnualSpend: Math.max(
        0,
        finiteOr(parsed.plan?.targetNetAnnualSpend, d.plan.targetNetAnnualSpend)
      ),
      locationId:
        typeof parsed.plan?.locationId === "string"
          ? parsed.plan.locationId
          : d.plan.locationId,
    },
  };
}

export function useEqtyState() {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  // Render defaults on the server pass, hydrate from localStorage after mount.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      // One-shot hydration from storage after mount: SSR must render defaults,
      // so the persisted snapshot can only be applied client-side, and doing it
      // synchronously here avoids a frame of stale numbers.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setState(reviveState(raw));
    } catch {
      // Corrupt snapshot: keep defaults.
    }
     
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage unavailable (private mode, quota): stay in-memory.
    }
  }, [state, hydrated]);

  const setMode = useCallback((mode: Mode) => {
    setState((s) => ({ ...s, mode }));
  }, []);

  const patchSimple = useCallback((patch: Partial<SimpleInputs>) => {
    setState((s) => ({ ...s, simple: { ...s.simple, ...patch } }));
  }, []);

  const patchPlan = useCallback((patch: Partial<PlanInputs>) => {
    setState((s) => ({ ...s, plan: { ...s.plan, ...patch } }));
  }, []);

  const setHoldings = useCallback((holdings: Holding[]) => {
    setState((s) => ({ ...s, portfolio: { ...s.portfolio, holdings } }));
  }, []);

  const setPortfolioContribution = useCallback((monthlyContribution: number) => {
    setState((s) => ({
      ...s,
      portfolio: { ...s.portfolio, monthlyContribution },
    }));
  }, []);

  const reset = useCallback(() => setState(DEFAULT_STATE), []);

  return {
    state,
    hydrated,
    setMode,
    patchSimple,
    patchPlan,
    setHoldings,
    setPortfolioContribution,
    reset,
  };
}
