# Browser-driving the integrated app caught what unit checks cannot: default-tick ugliness, and it confirmed the tax engine against mental arithmetic.

Findings from the first integrated run (dev server + Chrome automation):

1. **Recharts default y-ticks violate the "clean rounded numbers" rule.**
   With an auto domain, ticks landed on $5.50M / $11.00M / $16.50M / $22.00M
   (quarters of the data max). Fix: explicit tick generation — step snapped to
   1 / 2 / 2.5 / 5 x 10^k targeting ~5 intervals from 0, plus trailing-zero
   trimming ("$5.00M" -> "$5M"). Recharts needs `domain={[0, lastTick]}` AND
   `ticks={...}` together or it re-derives its own.
2. **The engine numbers survived independent cross-checks.** Rendered
   effective rates matched mental math per jurisdiction: NJ 0.5% on an $83K
   draw at gain ratio 0.32 (gain base sits under the standard-deduction
   allowance + 0% LTCG bracket — near-zero federal tax for modest
   early-retiree draws is a real phenomenon, not a bug); Tokyo 6.5% =
   0.32 x 20.315%; Tel Aviv 7.9% = 0.32 x 25%; Lisbon 8.9% = 0.32 x 28%;
   Nomad exactly 0% with gross == net. Simple mode flipped the gain ratio to
   the 0.6 default and every rate scaled accordingly (Tokyo 12.2%) — the
   mode dispatch is visibly correct end-to-end.
3. **ESLint's react-hooks/set-state-in-effect fires on the standard
   localStorage-hydration pattern.** SSR must render defaults, so the
   persisted snapshot can only apply in a post-mount effect; a scoped
   eslint-disable with a justification comment is the pragmatic resolution.
   Note the rule flagged only the setState fed by external reads, not the
   plain `setHydrated(true)` — an added disable there was flagged as unused.
4. **`@ts-expect-error` on `.ts`-extension imports is only "used" on value
   imports.** `import type` specifiers are erased before the TS5097 extension
   check, so a directive above them fails tsc with TS2578 (unused directive).
