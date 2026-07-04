# The new shadcn CLI skips utils/theme/deps when components.json is handwritten; install runtime deps manually.

The current `shadcn` CLI (mid-2026) replaced `init --base-color` with
`init -t <template> -b <base> -p <preset>` and prompts interactively when it
finds no `components.json`. Handwriting `components.json` (style `new-york`,
baseColor `neutral`, Tailwind v4 with empty `tailwind.config`) makes
`shadcn add <components...> -y` work non-interactively — but with three silent
gaps:

1. `src/lib/utils.ts` (the `cn` helper every component imports) is never
   created — `init` owns that step.
2. Theme CSS variables are never injected into `globals.css` — also an `init`
   step. We authored the full token set by hand anyway (single dark monochrome
   theme), which is the better outcome for a bespoke design.
3. Runtime deps (`class-variance-authority`, `clsx`, `tailwind-merge`,
   `lucide-react`) are imported by the generated components but not added to
   `package.json` — install them explicitly. `tw-animate-css` is likewise
   needed by select/tooltip animation classes.

Also note: components import from the consolidated `radix-ui` package
(`import { Select as SelectPrimitive } from "radix-ui"`), not per-package
`@radix-ux/react-*` modules.
