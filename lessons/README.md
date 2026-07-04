# EQTY — Lessons Log

One lesson per file, one-line summary at the top of each. This is the project's
working memory across the build: architectural decisions, gotchas, and audit
results, written as they happen.

## Index

- [001-npm-name-restrictions.md](001-npm-name-restrictions.md) — create-next-app refuses capitalized directories; scaffold lowercase elsewhere and move in.
- [002-shadcn-cli-drift.md](002-shadcn-cli-drift.md) — the new shadcn CLI skips utils/theme/deps when components.json is handwritten; install runtime deps manually.
- [003-monochrome-dataviz-audit.md](003-monochrome-dataviz-audit.md) — monochrome chart palette: CVD separation passes on luminance alone; chroma floor is a deliberate spec-driven violation; one contrast WARN remediated.
- [004-contracts-before-fanout.md](004-contracts-before-fanout.md) — freeze types/formatters/defaults before dispatching parallel agents on disjoint file sets.
- [005-integration-and-visual-audit.md](005-integration-and-visual-audit.md) — browser-driving the integrated app caught default-tick ugliness and confirmed the tax engine against mental arithmetic.
- [006-verification-pass-1.md](006-verification-pass-1.md) — spec audit all-PASS; adversarial review found the two real bugs at trust boundaries (UI input -> engine, storage -> state), not in the math.
- [007-feedback-round-coast-fire.md](007-feedback-round-coast-fire.md) — the matrix goal-link needed re-baselining, not literal wiring; independent data verification caught a real COL inversion.
- [008-transparency-beats-correctness-claims.md](008-transparency-beats-correctness-claims.md) — verified-correct numbers that "look weird" need visible arithmetic in the UI; explanations only land when they use the user's own numbers.
- [009-round4-theme-color-live-inputs.md](009-round4-theme-color-live-inputs.md) — diff before redoing a killed agent's work; commit-in-range-while-typing for hot inputs; pre-paint script for theme toggles; color follows entity.
- [010-round5-fixed-matrix-full-gain-tax.md](010-round5-fixed-matrix-full-gain-tax.md) — matrix net spend is now a fixed per-location researched figure (COL index derived from it, not stored); tax the full draw as gain for the mature rate; reversed round-007's goal-linked baseline; Digital Nomad re-modeled premium.
- [011-round6-researched-spend-real-tax-override.md](011-round6-researched-spend-real-tax-override.md) — re-grounded net spend via a research pass (incl. travel + full-price health); federal LTCG set to the real flat 15%/20% stacked rate (no 0% bracket); net-spend parameter returned as a click-overwritten override; chart runway 10y→2y. Partly supersedes 010.
- [012-round7-expandable-rows-us-citizen-tax-san-diego.md](012-round7-expandable-rows-us-citizen-tax-san-diego.md) — per-row expandable lifestyle detail (mind shadcn's whitespace-nowrap cells); Digital Nomad taxed at the US-citizen worldwide floor (~15%, not 0%); San Diego + California tax added; all net/gross re-verified live; grep prose notes when an engine assumption changes.

## Verification cadence

Self-verification runs every ~1 hour of active building: parallel subagents
audit the code against the product spec and adversarially attack the math,
findings are fixed and re-verified the same hour, and the pass is recorded
here as a lesson. Pass 1: 2026-07-04 ~13:50 (build hour 1). Next pass due
after another hour of active work.
