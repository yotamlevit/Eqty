# Verification pass 1: spec audit all-PASS; adversarial math review found the two real bugs unit checks missed — both at trust boundaries, not in the math.

Hour-1 self-verification ran as two parallel subagents against the frozen
product spec, roughly 40 minutes after the build started.

**Spec auditor:** every spec line PASS (dual-mode wiring, geo-tax back-calc,
Recharts reactivity, monochrome guardrails, lessons system). Its useful output
was the polish list: the unused `hydrated` flag (flash-of-defaults for
returning users), the dead `reset` callback, the dead `StatTile.delta` prop,
and a type comment promising pro-rata contribution allocation the engine does
not do. All four fixed within the hour.

**Adversarial math reviewer:** executed every attack vector as real scripts
against the shipped modules. The engines' math held (bisection converges to
~2e-7 dollars at $50M net targets; allowance/threshold semantics match the
contract exactly; non-finite tax inputs already clamped). The two VERIFIED
defects were both at trust boundaries, not in the arithmetic:

1. HIGH: ledger "Growth %" had no lower bound; any value below -100 sent a
   negative base through a fractional exponent (`(1+r)^(1/12)`), NaN-ing the
   entire projection series and blanking the chart. Fixed at BOTH boundaries:
   `Math.max(0, 1 + r/100)` in the engine, `min={-100}` on the input cell.
2. LOW: `reviveState` merged persisted JSON without numeric validation, so a
   hand-edited snapshot with `swrPct: 0` divided the gross draw to Infinity
   ("$InfinityB" KPI). Fixed by re-validating every numeric field on revive
   (`finiteOr` + clamps), then verified end-to-end by injecting a corrupt
   snapshot via the browser: SWR fell back to 4%, string/negative/absurd
   holding values clamped, zero console errors.

**Transferable lessons:**
- Unit self-checks written by a module's author verify the happy math; the
  bugs live where UNVALIDATED VALUES CROSS A BOUNDARY (UI field -> engine,
  storage -> state). Point adversarial review explicitly at boundaries.
- "Verify by execution, no speculative findings" is the right contract for a
  review agent — every reported finding came with a runnable repro, which made
  the fix round mechanical (fix, rerun repro, rerun suites).
- Injecting corrupt localStorage through the running browser is a cheap,
  fully end-to-end regression test for revive/sanitize logic.
