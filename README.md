# EQTY

A hyper-focused, professional financial utility app. EQTY bridges active asset
tracking with long-term predictive compounding forecasting.

## What it does

- **Dual-mode planning.** Simple mode takes flat manual inputs (assets,
  contribution, expected return). Portfolio mode derives starting assets,
  blended growth, and the taxable-gain ratio from an active holdings ledger.
- **Geo-tax engine.** A lifestyle matrix (NJ Waterfront, Tokyo Central,
  Tel Aviv Tech-Hub, Digital Nomad, Austin, Lisbon) back-calculates the gross
  withdrawal each jurisdiction requires to fund your target net spend —
  progressive brackets, surtaxes, and capital-gains treatment per locale,
  inverted by bisection.
- **Compounding trajectory.** Monthly-compounded nominal and real projections
  with FIRE-crossover detection, rendered with Recharts.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui · Recharts.
Aesthetic: "New York Minimalist Slate" — single dark monochrome theme, thin
hairline borders, tabular numerals, zero decoration.

## Layout

```
src/lib/types.ts        Domain contracts (modes, ledger, tax, projection)
src/lib/tax/            Geo-tax engine: location profiles + bracket math + net->gross solver
src/lib/projection.ts   Compounding engine: monthly series, blended returns, FI crossover
src/lib/selectors.ts    Mode-aware derived values
src/lib/use-eqty-state.ts  Persistent app state (localStorage)
src/components/charts/  Recharts projection + allocation visuals
src/components/eqty/    Presentational panels (top bar, KPIs, inputs, ledger, geo matrix)
scripts/*-selfcheck.ts  Engine assertion suites (run: node scripts/<name>.ts)
lessons/                Build-time lessons log, one lesson per file
```

## Run

```
npm install
npm run dev
```

Engine self-checks: `node scripts/tax-selfcheck.ts` and
`node scripts/projection-selfcheck.ts` (Node >= 23 runs TypeScript directly).

EQTY produces planning-grade estimates, not tax advice.
