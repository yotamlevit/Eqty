# User feedback round 6: net spend re-grounded with a research pass (incl. travel + health), federal tax set to the real 15% stacked rate, and the net-spend parameter returned as a click-overwritten override. Partly supersedes 010.

Four more items on the matrix, sharpening round 5. Notable points:

1. **The fixed net-spend figures were too low — travel and health were
   missing.** A web-research subagent re-derived premium-single 2026 costs
   bottom-up (housing + living + 3-4 premium trips/yr + full-price post-subsidy
   ACA health). Every number rose: NJ $100k->$150k, NYC $130k->$175k, Tokyo
   $62k->$105k, Tel Aviv $80k->$120k, Austin $77k->$115k, Lisbon $55k->$95k,
   Digital Nomad $90k->$185k. Lesson: "premium lifestyle" budgets that omit
   travel and (US) health insurance understate by 30-50%; name the line items.

2. **Digital Nomad had to become the MOST expensive, not the cheapest.**
   Round 5 already flipped it from budget to premium ($90k); research put the
   serviced-apartment premium + 6-8 relocation flights at $185k — top of the
   table. The archetype's *tax* (0%) is cheap; its *lifestyle* is the priciest.
   Don't let a low tax rate anchor the cost.

3. **"Real tax value" means no 0%-bracket/allowance shelter.** User: "federal
   capital gains is 15%, why do you show 10.7%?" The old model taxed gains as
   sole income, so the federal 0% bracket + standard deduction diluted the
   headline 15% toward zero. Changed federal LTCG to flat 15% (20% above
   $545,500), no 0% bracket, no allowance — the rate gains actually face when
   stacked on other income. NJ 10.7%->20.2% (15.0% federal + 5.2% state), Austin
   2.6%->15.0%. NIIT (>$200k) and state schedules unchanged. Lesson: model the
   marginal rate the user will actually pay, not the theoretical best case.

4. **Reversed part of round 5 / lesson 010: the net-spend parameter came back,
   as an OVERRIDE.** Round 5 removed the slider to make the matrix fixed. User
   still wanted to type their own number sometimes. Resolution: matrix rows stay
   fixed (reference), and `targetNetAnnualSpend` is a directly-editable plan
   field that the headline KPIs/coast/projection run off, grossed up in the
   active location's tax. Clicking a lifestyle OVERWRITES it with that location's
   researched cost (patchPlan sets locationId + targetNetAnnualSpend together).
   This is the opposite of round 5's lesson-007-loop worry: an explicit
   destructive overwrite is exactly what the user asked for, and it's clean
   because the matrix figure is fixed (no feedback loop to re-scale).

5. **Chart post-retirement runway 10y -> 2y.** POST_RETIREMENT_YEARS was too
   long; the chart ran a decade past retirement. Now ends ~2y after retirement
   age (a 120-month floor still guarantees legibility for near-term retirement).

Verified: faithful engine port reproduced every cell (NJ 20.2%, gross $188,063,
FIRE $4.70M; Nomad top at $185k/$4.63M), gross->net round-trips to the dollar,
`tsc` and `next build` both pass. Data caveats from the research pass: US health
line +/-$5k, nomad serviced-apartment/flight mix +/-$15-20k.
