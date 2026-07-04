# User feedback round 5: the Lifestyle Matrix became a fixed reference (net spend per location) taxed at the mature full-gain rate; this superseded round-007's goal-linked baseline.

Four feedback items on the Lifestyle Matrix, all pointing the same way — the
matrix is a fixed "what this lifestyle costs here" reference, not a control
wired to the parameters. Decisions and catches:

1. **Two disagreeing sources of truth for net spend.** The table computed
   `net = target x COL/100` while each row's `notes` carried a separately
   researched figure ("~$80k/yr"). They drifted 10-15% (Tel Aviv COL-implied
   $91.8k vs researched $80k; Lisbon $62.9k vs $55k). Resolution: the
   researched figure is now the single stored `netAnnualSpend` per location,
   and the displayed COL index is DERIVED from it (`netAnnualSpend / US
   baseline x 100`). Deriving the index kills the drift permanently — the two
   columns can no longer tell different stories. Lesson: when two displayed
   numbers must agree, store one and derive the other; never hand-set both.

2. **This reversed round-007's re-baselining.** Lesson 007 solved "clicking a
   row sets my target" with a clever loop-free single-baseline + display-in-
   active-terms scheme. The user ultimately didn't want a goal-linked control
   at all — the matrix should be fixed. The elegant fix to the wrong model was
   still the wrong model. `targetNetAnnualSpend` was removed from PlanInputs,
   defaults, revival, and the parameters panel entirely. Lesson: re-confirm
   the product model before polishing the mechanism inside it.

3. **Effective tax was an optimistic snapshot, not the plan rate.** The engine
   taxed only the portfolio's *current* embedded-gain share (~32%), so a 25-28%
   headline CGT showed as 0-9%. Over a decades-long retirement basis gets
   exhausted, so the matrix now taxes the FULL draw as gain (`grossForNet(net,
   loc, 1)`). Austin 0->2.6%, NJ 0.5->10.7%, Lisbon 8.9->28.0%. The engine
   still accepts a gainRatio; only the caller changed. Real finding it surfaces:
   US single-filer-no-other-income keeps US rates low (federal 0% LTCG bracket)
   while flat-rate countries bite in full.

4. **User's own gain-ratio arithmetic (39% at $5M) was a good instinct, wrong
   number.** $2M invested -> $5M is a 60% nominal gain share, not 39% (39%
   implies ~$3M basis, or a CPI-adjusted real basis). But the instinct — "it
   climbs and eventually it's all gain" — is exactly why the model moved to
   full-gain. Meet the user at their reasoning even when the figure is off.

5. **Digital Nomad was modeled backwards.** It was the CHEAPEST row (index 62,
   $58k) as "rootless roaming between affordable bases." The user wants premium
   high-floor roaming (Tokyo/Europe/US/Tel Aviv), which is one of the most
   EXPENSIVE lifestyles here — re-set to $90k (index 106), blurb/notes rewritten,
   plus a transparency caveat that ~4mo/yr in Israel risks Israeli tax residency
   and worldwide CGT, making the 0% optimistic for that itinerary.

Verified end to end: faithful engine port reproduced every cell; `tsc`, ESLint
(only the pre-existing use-theme warning), and `next build` all pass.
