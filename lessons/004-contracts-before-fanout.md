# Freeze types/formatters/defaults before dispatching parallel agents on disjoint file sets.

Three subagents build the tax engine, the projection/chart layer, and the UI
shell concurrently. What makes that safe:

1. **Contracts first, owned by the orchestrator.** `src/lib/types.ts` (domain
   model + engine interfaces), `src/lib/format.ts` (shared formatting),
   `src/lib/defaults.ts` (seed state) were written before fan-out and declared
   read-only to every agent. Interfaces like `TaxEngine`/`ProjectionEngine`
   let each agent typecheck against the contract without seeing the others'
   code.
2. **Disjoint write sets.** tax -> `src/lib/tax/*`; projection ->
   `src/lib/projection.ts` + `src/components/charts/*`; UI ->
   `src/components/eqty/*`. Nobody touches `page.tsx`, `globals.css`,
   `package.json` — integration is a separate, single-writer phase.
3. **Self-checks per module.** Each engine agent ships a `scripts/*-selfcheck.ts`
   assertion script (Node 25 runs TypeScript directly, so `node script.ts`
   works — but only with relative imports; the `@/` alias resolves in Next,
   not in plain Node).
4. **Verification is a distinct phase** against the spec, not against what got
   built — hourly cadence, subagent-driven.
