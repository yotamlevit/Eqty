# User feedback round 8: a Custom (manual net + flat tax → gross) mode that unlocks the user from the matrix, a "stop investing age" with its own chart line, and a chart-legibility pass.

Three asks:

1. **Custom tax/gross mode.** The user felt "locked to the matrix" because tax was
   always a location's bracket schedule. Added a synthetic "Custom" row at the
   TOP of the matrix (a LocationProfile with one flat TaxComponent at
   `customTaxPct`), so the same `grossForNet` engine handles it uniformly. The
   Parameters panel now stacks Target net spend → Tax rate → Gross draw: net is
   always editable, tax is editable ONLY in Custom mode (else read-only, showing
   the active lifestyle's effective rate), gross is always the computed result.
   Selecting a lifestyle overrides net+tax+gross; selecting Custom keeps the net
   but unlocks tax, seeded from whatever rate was active so the switch is
   continuous. Verified: net $150k at 20% flat → gross $187,500, FIRE $4.6875M.

2. **"Stop investing age" + chart line.** New `plan.stopInvestingAge: number|null`
   (null = auto, tracks the coast age). Added `projectStopInvestReal(args,
   stopMonth)` — contributions run until stopMonth, then the balance compounds
   untouched — grafted onto the chart points as `stopInvest` (real $). Drawn as a
   green line + a dashed "STOP INVEST" marker. Equals the real line until the
   stop age, then diverges below (verified: $3.09M vs $3.30M at 57). The
   parameters field shows the auto coast age with a "reset to coast age" link
   once overridden. Storing null-as-auto (vs a frozen number) keeps it tracking
   the coast calc until the user deliberately overrides.

3. **Chart legibility.** Complaint: ages, numbers, and line crossings hard to
   read (with a cleaner reference calculator shown). Changes: adaptive age ticks
   (1/2/3/5/10-yr step targeting ~8-12 labels, vs a fixed 5-yr grid that left
   long spans sparse); enabled VERTICAL gridlines (was horizontal-only) so a
   value at a given age and the crossings are readable; and defaulted Nominal +
   Contributed to HIDDEN so the default view is just Real + Stop-investing +
   Coast against the FIRE threshold — matching the reference's clean 3-line look.
   All series stay toggleable in the interactive legend.

Process note: could not capture a browser screenshot this session — the
claude-in-chrome extension showed an "error page" on fresh tabs across both
localhost and 127.0.0.1 while curl returned 200, i.e. a browser-side
session/permission issue, not an app fault. Fell back to `tsc` + `next build`
(the build server-renders the page, proving no render crash) + a numeric port of
the new custom-tax and stop-invest math. When the browser harness is flaky,
build+numeric verification is the backstop; don't keep retrying the extension.
