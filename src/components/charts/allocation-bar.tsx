"use client";

/**
 * EQTY allocation bar — a single horizontal stacked bar of holdings by current
 * market value, with a chip legend beneath it.
 *
 * Pure divs (no Recharts): one bar is cheaper and crisper than a chart here.
 * Color follows the ENTITY — a holding's asset class, not its position — so
 * every equity reads the same hue whatever its size, and identity survives
 * re-sorting. Beyond five holdings the tail folds into a single neutral "OTHER"
 * segment. Segments are separated by a thin gap in the surface color and share
 * the class hue when they share a class; the chip ticker disambiguates.
 *
 * Two validated palettes, selected by `appearance`; hexes track the globals.css
 * chart tokens (chrome stays neutral — gaps and text are gray, hues are data).
 */

import type { AssetClass, Holding } from "@/lib/types";
import { fmtPct, fmtUsd } from "@/lib/format";

type Appearance = "dark" | "light";

interface BarPalette {
  /** Hue per asset class — identity is the class, not the array index. */
  classes: Record<AssetClass, string>;
  /** Neutral fill for the grouped tail. */
  other: string;
  /** Gap color between segments (card surface). */
  surface: string;
  /** Chip text. */
  mutedText: string;
}

const BAR_PALETTES: Record<Appearance, BarPalette> = {
  dark: {
    classes: {
      equity: "#7aa7ff",
      bond: "#57c793",
      crypto: "#ffb74d",
      cash: "#9aa0a6",
      "real-estate": "#b18aff",
    },
    other: "#454545",
    surface: "#2a2a2a",
    mutedText: "#bdbdbd",
  },
  light: {
    classes: {
      equity: "#2563eb",
      bond: "#059669",
      crypto: "#d97706",
      cash: "#6b7280",
      "real-estate": "#7c3aed",
    },
    other: "#e5e7eb",
    surface: "#ffffff",
    mutedText: "#6b7280",
  },
};

const MAX_SEGMENTS = 5;

export interface AllocationBarProps {
  holdings: Holding[];
  appearance?: Appearance;
}

interface Segment {
  key: string;
  ticker: string;
  value: number;
  weight: number; // fraction of total
  color: string;
}

function buildSegments(
  holdings: Holding[],
  palette: BarPalette
): { segments: Segment[]; total: number } {
  const valued = holdings
    .map((h) => ({ h, value: h.units * h.price }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value);

  const total = valued.reduce((sum, x) => sum + x.value, 0);
  if (total <= 0) return { segments: [], total: 0 };

  const segments: Segment[] = [];
  // The five largest holdings each show individually, colored by asset class.
  // Anything past that is folded into a single neutral OTHER segment.
  const named = valued.slice(0, MAX_SEGMENTS);
  const tail = valued.slice(MAX_SEGMENTS);

  named.forEach((x) => {
    segments.push({
      key: x.h.id,
      ticker: x.h.ticker,
      value: x.value,
      weight: x.value / total,
      color: palette.classes[x.h.assetClass],
    });
  });

  if (tail.length > 0) {
    const otherValue = tail.reduce((sum, x) => sum + x.value, 0);
    segments.push({
      key: "__other__",
      ticker: "OTHER",
      value: otherValue,
      weight: otherValue / total,
      color: palette.other,
    });
  }

  return { segments, total };
}

export function AllocationBar({
  holdings,
  appearance = "dark",
}: AllocationBarProps) {
  const palette = BAR_PALETTES[appearance];
  const { segments } = buildSegments(holdings, palette);

  if (segments.length === 0) {
    return (
      <div className="text-[11px]" style={{ color: palette.mutedText }}>
        No holdings to allocate.
      </div>
    );
  }

  return (
    <div className="w-full">
      <div
        className="flex w-full overflow-hidden"
        style={{ height: 20, gap: 2, borderRadius: 4, background: palette.surface }}
        role="img"
        aria-label="Portfolio allocation by current value"
      >
        {segments.map((s) => (
          <div
            key={s.key}
            title={`${s.ticker} · ${fmtUsd(s.value)} · ${fmtPct(s.weight)}`}
            style={{
              flexGrow: s.weight,
              flexBasis: 0,
              minWidth: 2,
              background: s.color,
            }}
          />
        ))}
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span
              aria-hidden
              style={{
                width: 8,
                height: 8,
                background: s.color,
                display: "inline-block",
                borderRadius: 1,
              }}
            />
            <span className="text-[11px]" style={{ color: palette.mutedText }}>
              {s.ticker}
            </span>
            <span
              className="text-[11px] tabular-nums"
              style={{ color: palette.mutedText }}
            >
              {fmtPct(s.weight)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
