# User feedback round: the matrix goal-link needed re-baselining, not literal wiring; independent data verification caught a real COL inversion.

Ten user feedback items landed at once (theme too dark, new defaults, Coast
FIRE feature set, matrix explanations). Notable decisions and catches:

1. **"Clicking the matrix should set my target spend" hides a feedback
   loop.** Literally writing the row's COL-scaled spend back into the
   baseline would re-scale it on the next render (clicking Tokyo twice keeps
   shrinking the number). Resolution: keep ONE stored baseline (index 100)
   and make the parameters field DISPLAY and EDIT in active-location terms
   (display = base x COL/100, commit = entered x 100/COL). Selecting a row
   now visibly changes the goal figure with no loop, and the helper text
   shows the baseline. Lesson: when a user asks for two views of one number
   to write to each other, re-baseline through a single source of truth
   instead of wiring them directly.
2. **Coast-FIRE math must run in real terms end to end.** The FIRE number is
   today's dollars and the chart compares against the REAL series, so the
   coast curve discounts at the real rate ((1+nominal)/(1+inflation) - 1),
   and the required-contribution solver inverts the exact nominal recurrence
   `project()` uses, then targets F x (1+inflation)^years. Mixing nominal
   growth with a real target silently overstates readiness.
3. **A "wrong" self-check assertion was a wrong premise, not a wrong
   solver.** With the new 10% default return, $450k over 23 years already
   exceeds a $2M real target, so requiredMonthlyContribution correctly
   returned $0 and my "must be positive" assertion failed. Verify the
   scenario premise before blaming the code under test.
4. **Independent data verification pays.** A web-checking subagent found the
   Tokyo COL index (88) inverted against Lisbon (74) versus Numbeo ordering
   (Tokyo is cheaper) — corrected to 68 — and Israel's 2026 capital-income
   surtax is 5% (3% general + 2% capital) per PwC, not the 3% I specced from
   memory. Domain data supplied from memory should be treated as draft until
   a source pass runs.
5. **Brightening a monochrome theme is a one-file operation** because every
   surface/border/text color lives in globals.css tokens — but chart hexes
   are INLINED (Recharts SVG props cannot read CSS custom properties
   reliably), so the chart palette must be updated in lockstep or the chart
   visibly lags the theme.
