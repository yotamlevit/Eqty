# User feedback round 7: per-row expandable lifestyle detail, Digital Nomad taxed at the US-citizen worldwide floor (not 0%), San Diego added, and all net/gross numbers re-verified live in the browser.

Three asks, all shipped and browser-verified:

1. **Expandable detail per lifestyle.** Added a `lifestyle` string to LocationProfile
   (a few sentences on the apartment, dining, transport, travel, feel) and a
   per-row chevron in the geo-matrix that toggles a colSpan detail row: lifestyle
   prose + "What it takes" (net → gross → effective tax → FIRE) + the full
   per-component tax breakdown + the location notes. Replaced the single
   active-row panel with this, plus one footnote. Gotcha: shadcn `TableCell`
   defaults to `whitespace-nowrap`, so the detail text ran off-screen until a
   `whitespace-normal` was added on the cell (the location blurb already carried
   `whitespace-normal` for the same reason — should have been the tell).

2. **Digital Nomad 0% was wrong for a US citizen.** US citizens owe US federal
   LTCG + NIIT on worldwide gains regardless of residency; with a zero-tax base
   there's no foreign tax to credit, so the floor is ~15%, not 0%. Changed nomad
   components from [] to [usFederalLtcg, usNiit] → 15.3% effective ($185k net →
   $218k gross, FIRE $5.46M). Note rewritten to explain the worldwide-taxation
   floor and that foreign tax credits can't push it below a higher foreign rate.
   The other foreign locations (Japan 20.3%, Israel 25%+, Portugal 28%) already
   exceed the US 15% floor, so modeling local-only there is ~correct for a US
   citizen — only the zero-tax nomad needed the floor added.

3. **San Diego added.** Researched net $140k (housing ~$50k coastal 1BR + car +
   full-price ACA + travel), sits between Austin $115k and NJ $150k. California
   taxes cap gains as ordinary income; added `caStateIncome` (2025 single
   schedule, 1%→12.3%, >$1M surcharge omitted). Effective 22.4%, FIRE $4.51M.

4. **Re-verified all net & gross.** Faithful engine port + live browser check:
   NJ 20.2% gross $188,063; NYC 24.7% $232,430; Tokyo 20.3% $131,769; Tel Aviv
   25.0% $160,000; Nomad 15.3% $218,473; Austin 15.0% $135,294; San Diego 22.4%
   $180,371; Lisbon 28.0% $131,944. All gross→net round-trips to the dollar.
   Also caught and fixed a stale NJ note still claiming "federal LTCG modeled
   after the standard deduction as an allowance" (untrue since round 6's flat-15%
   change) — lesson: when you change an engine assumption, grep the prose notes
   that described the old one.

5. **Chart FI tail unified to POST_RETIREMENT_YEARS (2y).** The window extends to
   max(retirement+2y, FI+2y, 10y-floor); when FI lands after the retirement age
   (user is "behind" their target), the chart correctly stretches to show the FI
   crossing rather than stopping at retirement+2 and hiding it.

Verified: `tsc`, `next build`, and a live browser drive (expand NJ + Nomad,
confirm wrapping, numbers, and the US-citizen note) all pass.
