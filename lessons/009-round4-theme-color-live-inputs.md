# A stopped agent's work may already be on disk — diff before redoing; live inputs need commit-in-range-while-typing; theme toggles need a pre-paint script.

Round 4 (light mode, chromatic data marks, live inputs, NYC, premium
baseline) lessons:

1. **Check the filesystem before redoing a killed agent's task.** The tax
   verifier was stopped mid-run, but its file work (NYC location with NY
   State + NYC city components, extended self-check) was already written and
   passing — only its final report was lost. A grep + self-check run showed
   the work was done; redoing it would have wasted the round.
2. **"Hot" numeric inputs without fighting the user:** commit on every
   keystroke ONLY when the parsed value is finite and inside [min, max];
   otherwise hold the draft and clamp-commit on blur/Enter. Typing "50" for a
   retirement age with min 33 stays quiet at "5" and commits at "50". Parse
   partial drafts ("", "-", ".") to null, never 0.
3. **Theme toggle without flash:** default class on <html> + a blocking
   inline script in <head> that reads localStorage before first paint; the
   React hook reads the DOM truth after mount instead of guessing. SSR markup
   stays deterministic; suppressHydrationWarning on <html> absorbs the class
   difference.
4. **Color re-introduction discipline:** the user relaxed monochrome for
   data marks only. Chrome stays token-neutral in both registers; each chart
   selects a validated palette via an `appearance` prop (Recharts cannot
   reliably read CSS variables in SVG props, so palettes are inlined
   per-theme). Categorical color follows the ENTITY (asset class), never the
   array index. The neutral hero/gray slots fail the validator's chroma
   floor BY DESIGN (emphasis pattern) — CVD separation and 3:1 contrast pass
   on both surfaces.
5. **A location-independent premium floor breaks pure index scaling.**
   Researched premium budgets imply different index-100 baselines per city
   (74k-93k) because trips/wardrobe/club costs do not scale with local
   prices. A single baseline (85k) minimizes error to ~7% — acceptable, but
   worth remembering that COL indices model local prices, not lifestyle
   fixed costs.
