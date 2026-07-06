# User feedback round 9 (post Gemini-calculator comparison): added a "raise contributions with inflation" toggle and switched the engine to start-of-month (annuity-due) contribution timing — both applied consistently across projection, stop-invest line, and the required-contribution solver.

Context: the user compared EQTY to a Gemini-built FIRE calculator and got very
different numbers. Reverse-engineering Gemini showed it is an all-real, annual,
arithmetic-real-rate (growth − inflation) model with contributions held constant
in REAL terms (escalating with inflation) and start-of-year timing. The "which
is right" answer: the FIRE target formula is identical (net/(1−tax)/SWR) so
target differences are pure input differences (net spend, tax); the trajectory
gap was dominated by (a) growth rate — our complex-mode blended ~6.7% vs Gemini
10% (~73% swing) — and (b) Gemini escalating contributions with inflation while
we held them fixed nominal (~16% of the gap). Neither is "wrong"; ours is more
precise/conservative, Gemini simpler/optimistic.

Two changes from that:

1. **Escalate-contributions toggle** (`plan.escalateContributions`, default
   false). When on, the monthly contribution grows at the inflation rate so it
   stays constant in today's dollars — the assumption most people who raise
   savings over time actually live. Wired through `project`, the stop-invest
   line, AND `requiredMonthlyContribution`. Verified +15.9% on the 55-year worth,
   closing most of the gap to Gemini.

2. **Start-of-month (annuity-due) contribution timing.** User said they invest at
   the START of the month and asked for the more accurate convention. Switched
   `project`/`projectStopInvestReal` from "grow then add" (ordinary annuity, end
   of month) to "add then grow" (annuity due) so each contribution earns its
   first month. Small effect (+0.47%), but correct for start-of-month investing.

Key discipline — no side effects: the change touches THREE places that must
agree (project, projectStopInvestReal, requiredMonthlyContribution). Rederived
the required-contribution future-value factor as a direct sum
Σ (1+g)^((m-1)/12)·(1+r)^(months-m+1) so it matches the new annuity-due +
escalation recurrence exactly. Round-trip test: the required contribution plugged
back into project lands on the FIRE number to the dollar ($4,687,500) in BOTH
escalate on/off — proving the solver and the projection stayed consistent. When
you change a compounding convention, re-derive every closed-form inverse that
depended on the old one and round-trip-test it.

Verified: `tsc`, `next build`, numeric round-trip. Browser screenshot not
captured — the claude-in-chrome extension disconnected mid-session (root cause of
the prior "error page" failures too).
