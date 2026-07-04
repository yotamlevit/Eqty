# When verified-correct numbers still "look weird" to the user, the fix is visible arithmetic, not more verification; and explanations beat definitions only when they use the user's own numbers.

Round-3 feedback carried two lessons about trust and one about display scaling:

1. **"The taxes look weird" was a UX bug, not a math bug.** A fully
   independent audit (hand-built bracket walker, no engine code) matched the
   engine to the penny across all six locations and both modes, and proved
   the counterintuitive cases correct (Austin 0.0%: the gain slice minus the
   standard deduction sits inside the federal 0% LTCG band; NJ ~0.5%: only
   the from-dollar-one state tax on the gain remains). Correct output that
   surprises the user still fails. Resolution: render the arithmetic chain in
   the UI — the active row now shows gross draw, taxable-gain share, every
   component INCLUDING the $0 ones, and the total. A "$0 Federal LTCG" line
   is what makes a 0.5% effective rate believable.
2. **Definitions do not explain; the user's own numbers do.** The COL
   footnote ("index relative to your baseline") failed twice. What worked:
   per-row deltas ("-32% vs your base") and a worked example with live
   values ("Tokyo at index 68 turns your $72,000 target into $48,960").
   If an explainer contains no number the user recognizes as theirs, expect
   it to fail.
3. **Fixed chart horizons waste the x-axis.** A 40-year window made a
   retire-at-50 plan occupy a corner of the plot. The window now derives
   from the plan: (retirement - currentAge) + 10 years of post-retirement
   runway, stretched to FI + 3y when FI lands later, clamped to [10, 50].
   Compute the full 50y series once and slice for display, so off-chart
   metrics (matrix years-to-FI, value-at-retirement) keep the long series.
4. Theme note: this is the SECOND brightness lift (near-black -> dark slate
   -> graphite #212121/#4d4d4d borders). Two rounds of "too dark" feedback on
   a monochrome theme suggests starting future dark monochrome themes at
   graphite luminance, not cinematic black — and if a third round comes, the
   right move is a light theme option, not more lifting.
