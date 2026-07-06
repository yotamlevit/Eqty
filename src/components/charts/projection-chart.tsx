"use client";

/**
 * EQTY projection chart.
 *
 * Color now carries series identity (the monochrome rule is relaxed for data
 * marks): real is a neutral hero, nominal/coast/contributed take distinct hues.
 * Chrome stays neutral — grid, axes, panel, and ALL text are gray; a series
 * hue never touches text, only its line and its legend/tooltip swatch. Line
 * style (weight, the coast dash) still reinforces identity so the chart survives
 * color-vision deficiency and grayscale printing.
 *
 * Two validated palettes, selected by `appearance`. Hexes are inlined (not read
 * from globals.css) because Recharts SVG props can't resolve CSS custom
 * properties reliably across the render tree; they track the theme tokens.
 */

import { useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  LabelList,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipContentProps } from "recharts";

import type { ProjectionPoint } from "@/lib/types";
import { fmtUsd, fmtUsdCompact } from "@/lib/format";

type Appearance = "dark" | "light";

interface Palette {
  real: string; // hero series (neutral)
  nominal: string; // series hue
  contributed: string; // series hue (neutral gray by design)
  coast: string; // series hue (dashed path)
  stopInvest: string; // series hue — "if you stop investing" line
  grid: string; // hairline gridline
  axisText: string; // all chrome text — axes, legend, tooltip labels
  threshold: string; // dashed FIRE-target line
  hairline: string; // FI + retirement markers, tooltip crosshair
  panelBg: string; // tooltip panel
  panelBorder: string; // tooltip border
  labelText: string; // endpoint direct label / tooltip values
  dotRing: string; // surface ring around active/reference dots
  areaWash: number; // hero area fill opacity
}

const PALETTES: Record<Appearance, Palette> = {
  dark: {
    real: "#ffffff",
    nominal: "#7aa7ff",
    contributed: "#9aa0a6",
    coast: "#ffb74d",
    stopInvest: "#66bb6a",
    grid: "#454545",
    axisText: "#bdbdbd",
    threshold: "#a0a0a0",
    hairline: "#6a6a6a",
    panelBg: "#303030",
    panelBorder: "#4d4d4d",
    labelText: "#ffffff",
    dotRing: "#303030",
    areaWash: 0.12,
  },
  light: {
    real: "#111111",
    nominal: "#2563eb",
    contributed: "#6b7280",
    coast: "#d97706",
    stopInvest: "#16a34a",
    grid: "#e5e5e5",
    axisText: "#6b7280",
    threshold: "#9ca3af",
    hairline: "#d1d5db",
    panelBg: "#ffffff",
    panelBorder: "#e2e2e2",
    labelText: "#111111",
    dotRing: "#ffffff",
    areaWash: 0.08,
  },
};

// Dash patterns carry meaning independent of color: the coast PATH reads
// distinctly from the FIRE THRESHOLD, and neither is confusable with a solid
// data series.
const COAST_DASH = "7 4";
const FIRE_DASH = "3 3";

const BASE_YEAR = new Date().getFullYear();

export interface ProjectionChartProps {
  points: ProjectionPoint[];
  fireNumber: number;
  currentAge: number;
  monthsToFire: number | null;
  retirementAge: number;
  monthsToCoast: number | null;
  /** Age contributions stop, for the "if you stop investing" line + marker. */
  stopInvestingAge?: number | null;
  appearance?: Appearance;
}

type SeriesKey = "real" | "stopInvest" | "nominal" | "contributed" | "coast";

interface SeriesMeta {
  key: SeriesKey;
  label: string;
  color: string;
  dashed?: boolean;
}

/** Small legend/tooltip swatch: a solid bar, or a dashed line for coast. */
function Swatch({ color, dashed }: { color: string; dashed?: boolean }) {
  if (dashed) {
    return (
      <svg width={10} height={2} aria-hidden>
        <line
          x1={0}
          y1={1}
          x2={10}
          y2={1}
          stroke={color}
          strokeWidth={2}
          strokeDasharray="2 2"
        />
      </svg>
    );
  }
  return (
    <svg width={8} height={2} aria-hidden>
      <rect width={8} height={2} fill={color} />
    </svg>
  );
}

/**
 * Keep the series responsive without shipping ~500 points to SVG: above 200
 * points, sample to roughly quarterly resolution. Whole point objects pass
 * through, so `coast` (and every field) is preserved. The final point is
 * always retained so the endpoint label and the horizon edge stay exact.
 */
function downsample(points: ProjectionPoint[]): ProjectionPoint[] {
  if (points.length <= 200) return points;
  const step = 3; // months; quarterly
  const out: ProjectionPoint[] = [];
  for (let i = 0; i < points.length; i += step) out.push(points[i]);
  const last = points[points.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

/**
 * Integer age ticks across the projected span, with an adaptive step so ~8-12
 * labels show (denser than a fixed 5-year grid, which left long spans hard to
 * read). Step snaps to 1 / 2 / 3 / 5 / 10 years.
 */
function ageTicks(minAge: number, maxAge: number): number[] {
  const span = Math.max(1, maxAge - minAge);
  const step = [1, 2, 3, 5, 10].find((s) => span / s <= 12) ?? 10;
  const ticks: number[] = [];
  const first = Math.ceil(minAge / step) * step;
  for (let a = first; a <= maxAge; a += step) ticks.push(a);
  return ticks;
}

/**
 * Clean y-axis ticks from 0: step snapped to 1 / 2 / 2.5 / 5 x 10^k so labels
 * land on round dollar figures instead of arbitrary fractions of the max.
 */
function usdTicks(maxValue: number): number[] {
  if (maxValue <= 0) return [0];
  const raw = maxValue / 5;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step =
    [1, 2, 2.5, 5, 10].map((m) => m * mag).find((c) => c >= raw) ?? 10 * mag;
  const ticks: number[] = [];
  for (let v = 0; v < maxValue + step; v += step) ticks.push(v);
  return ticks;
}

/** "$5.00M" -> "$5M", "$2.50M" -> "$2.5M" for tick labels. */
function trimTick(label: string): string {
  return label.replace(/(\.\d*?)0+(?=[MBK]?$)/, "$1").replace(/\.(?=[MBK]?$)/, "");
}

/** A point's coast value when finite, else 0 — for the y-max scan. */
function coastOrZero(p: ProjectionPoint): number {
  return Number.isFinite(p.coast) ? (p.coast as number) : 0;
}

export function ProjectionChart({
  points,
  fireNumber,
  currentAge,
  monthsToFire,
  retirementAge,
  monthsToCoast,
  stopInvestingAge,
  appearance = "dark",
}: ProjectionChartProps) {
  const c = PALETTES[appearance];
  const series: SeriesMeta[] = [
    { key: "real", label: "Real (today's $)", color: c.real },
    { key: "stopInvest", label: "If you stop investing", color: c.stopInvest },
    { key: "coast", label: "Coast Path", color: c.coast, dashed: true },
    { key: "nominal", label: "Nominal", color: c.nominal },
    { key: "contributed", label: "Contributed", color: c.contributed },
  ];

  // Session-local legend toggles. Hiding a series removes it from the chart AND
  // from the y-max scan below, so the axis rescales to what remains visible.
  // Nominal and contributed start hidden to keep the default view legible —
  // real, the stop-investing line, and the coast path — matching the FIRE
  // threshold; users toggle the rest back on.
  const [hidden, setHidden] = useState<Set<SeriesKey>>(
    () => new Set<SeriesKey>(["nominal", "contributed"])
  );
  const shown = (key: SeriesKey) => !hidden.has(key);
  const toggle = (key: SeriesKey) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const visibleSeries = series.filter((s) => shown(s.key));

  const data = downsample(points);
  const lastIndex = data.length - 1;

  const minAge = points.length > 0 ? points[0].age : currentAge;
  const maxAge = points.length > 0 ? points[points.length - 1].age : currentAge;
  const ticks = ageTicks(minAge, maxAge);

  // Y-max scans ONLY the visible series (coast can exceed real early on).
  // fireNumber is always included so the FIRE-target line never leaves the
  // frame; if every series is hidden the axis collapses to fireNumber alone.
  const maxY = Math.max(
    fireNumber,
    ...points.map((p) => {
      let m = 0;
      if (shown("real")) m = Math.max(m, p.real);
      if (shown("stopInvest") && Number.isFinite(p.stopInvest))
        m = Math.max(m, p.stopInvest as number);
      if (shown("nominal")) m = Math.max(m, p.nominal);
      if (shown("contributed")) m = Math.max(m, p.contributed);
      if (shown("coast")) m = Math.max(m, coastOrZero(p));
      return m;
    })
  );
  const yTicks = usdTicks(maxY);
  const fiAge = monthsToFire !== null ? currentAge + monthsToFire / 12 : null;

  // The dot marks where the REAL series meets the coast path: place it on the
  // coast value at that month (which equals the real value at the crossing).
  const coastAge =
    monthsToCoast !== null ? currentAge + monthsToCoast / 12 : null;
  const coastPoint = monthsToCoast !== null ? points[monthsToCoast] : undefined;
  const coastCrossY =
    coastPoint != null
      ? Number.isFinite(coastPoint.coast)
        ? (coastPoint.coast as number)
        : coastPoint.real
      : null;

  return (
    <div className="flex h-[340px] w-full flex-col">
      {/* Interactive legend — click a series to toggle it; the y-axis rescales
          live to the visible series. Buttons are natively keyboard-operable. */}
      <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 pr-2 pb-1">
        {series.map((s) => {
          const isHidden = hidden.has(s.key);
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => toggle(s.key)}
              aria-pressed={!isHidden}
              className={`group flex cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 transition-opacity ${
                isHidden
                  ? "opacity-[0.35] hover:opacity-60"
                  : "opacity-100 hover:opacity-80"
              }`}
            >
              <Swatch color={s.color} dashed={s.dashed} />
              <span
                className={`text-[11px] uppercase tracking-wide ${
                  isHidden ? "line-through" : "group-hover:underline"
                }`}
                style={{ color: c.axisText }}
              >
                {s.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 16, right: 20, bottom: 8, left: 8 }}
          >
            {/* Both axes gridded now — vertical lines at the age ticks make it
                far easier to read a value at a given age and spot crossings. */}
            <CartesianGrid stroke={c.grid} strokeWidth={1} />

            <XAxis
              dataKey="age"
              type="number"
              domain={[minAge, maxAge]}
              ticks={ticks}
              allowDecimals={false}
              tickFormatter={(v: number) => String(Math.round(v))}
              tickLine={false}
              axisLine={false}
              height={20}
              tick={{ fontSize: 11, fill: c.axisText }}
            />

            <YAxis
              domain={[0, yTicks[yTicks.length - 1]]}
              ticks={yTicks}
              tickFormatter={(v: number) => trimTick(fmtUsdCompact(v))}
              tickLine={false}
              axisLine={false}
              width={56}
              tick={{
                fontSize: 11,
                fill: c.axisText,
                style: { fontVariantNumeric: "tabular-nums" },
              }}
            />

            <Tooltip
              cursor={{ stroke: c.hairline, strokeWidth: 1 }}
              content={makeTooltip(c, visibleSeries)}
              isAnimationActive={false}
            />

            {/* Contributed principal — thinnest line, bottom of the stack.
                Animation stays on so the axis rescale reads as a transition. */}
            {shown("contributed") && (
              <Line
                type="monotone"
                dataKey="contributed"
                stroke={c.contributed}
                strokeWidth={1.75}
                dot={false}
                activeDot={false}
                isAnimationActive
              />
            )}

            {/* Coast-FIRE requirement — dashed reference path, gaps not bridged. */}
            {shown("coast") && (
              <Line
                type="monotone"
                dataKey="coast"
                stroke={c.coast}
                strokeWidth={1.75}
                strokeDasharray={COAST_DASH}
                dot={false}
                activeDot={false}
                connectNulls={false}
                isAnimationActive
              />
            )}

            {/* Nominal value — hued line, no fill. */}
            {shown("nominal") && (
              <Line
                type="monotone"
                dataKey="nominal"
                stroke={c.nominal}
                strokeWidth={2}
                dot={false}
                activeDot={false}
                isAnimationActive
              />
            )}

            {/* If you stop investing — real balance when contributions cease at
                the chosen age. Tracks REAL until then, diverges below after. */}
            {shown("stopInvest") && (
              <Line
                type="monotone"
                dataKey="stopInvest"
                stroke={c.stopInvest}
                strokeWidth={2}
                dot={false}
                activeDot={{
                  r: 3,
                  fill: c.stopInvest,
                  stroke: c.dotRing,
                  strokeWidth: 1,
                }}
                isAnimationActive
              />
            )}

            {/* Real value — the hero: heaviest line + area wash. Hiding it also
                removes the area, active dot, and endpoint label (all children). */}
            {shown("real") && (
              <Area
                type="monotone"
                dataKey="real"
                stroke={c.real}
                strokeWidth={2.5}
                fill={c.real}
                fillOpacity={c.areaWash}
                dot={false}
                activeDot={{ r: 3, fill: c.real, stroke: c.dotRing, strokeWidth: 1 }}
                isAnimationActive
              >
                <LabelList
                  dataKey="real"
                  content={renderEndpointLabel(lastIndex, c.labelText)}
                />
              </Area>
            )}

            {/* FIRE target — a genuine threshold, so it is dashed ("3 3"). */}
            <ReferenceLine
              y={fireNumber}
              stroke={c.threshold}
              strokeWidth={1}
              strokeDasharray={FIRE_DASH}
              label={{
                value: "FIRE TARGET",
                position: "insideTopRight",
                fill: c.axisText,
                fontSize: 10,
              }}
            />

            {/* Retirement age — solid vertical marker. */}
            <ReferenceLine
              x={retirementAge}
              stroke={c.hairline}
              strokeWidth={1}
              label={{
                value: "RETIREMENT",
                position: "top",
                fill: c.axisText,
                fontSize: 11,
              }}
            />

            {/* Financial-independence crossing — subtle solid marker. */}
            {fiAge !== null && (
              <ReferenceLine
                x={fiAge}
                stroke={c.hairline}
                strokeWidth={1}
                label={{ value: "FI", position: "top", fill: c.axisText, fontSize: 10 }}
              />
            )}

            {/* Stop-investing age — green dashed marker matching its line. */}
            {stopInvestingAge != null &&
              Number.isFinite(stopInvestingAge) &&
              stopInvestingAge >= minAge &&
              stopInvestingAge <= maxAge && (
                <ReferenceLine
                  x={stopInvestingAge}
                  stroke={c.stopInvest}
                  strokeWidth={1}
                  strokeDasharray="2 3"
                  label={{
                    value: "STOP INVEST",
                    position: "insideBottomLeft",
                    fill: c.stopInvest,
                    fontSize: 10,
                  }}
                />
              )}

            {/* Coast crossing — where REAL meets the coast path. Surface-ringed.
                Tied to the coast series, so hiding COAST removes it too. */}
            {shown("coast") && coastAge !== null && coastCrossY !== null && (
              <ReferenceDot
                x={coastAge}
                y={coastCrossY}
                r={3.5}
                fill={c.real}
                stroke={c.dotRing}
                strokeWidth={2}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/**
 * Selective direct label: render a value only at the final data point of the
 * real series. Every other index returns an empty group.
 */
function renderEndpointLabel(lastIndex: number, labelText: string) {
  return function EndpointLabel(props: unknown) {
    const p = props as {
      x?: number;
      y?: number;
      index?: number;
      value?: number | string;
    };
    if (p.index !== lastIndex || p.x == null || p.y == null || p.value == null) {
      return <g />;
    }
    return (
      <text
        x={p.x}
        y={p.y}
        dx={-6}
        dy={-6}
        textAnchor="end"
        fill={labelText}
        fontSize={11}
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {fmtUsdCompact(Number(p.value))}
      </text>
    );
  };
}

/**
 * Custom dark/light tooltip panel. All values in full USD, tabular-aligned.
 * Labels stay neutral (axisText); only the swatch carries the series hue.
 */
function makeTooltip(c: Palette, series: SeriesMeta[]) {
  return function TooltipContent(props: TooltipContentProps): React.ReactNode {
    const { active, payload } = props;
    if (!active || !payload || payload.length === 0) return null;

    const datum = payload[0].payload as ProjectionPoint | undefined;
    if (!datum) return null;

    const year = BASE_YEAR + Math.floor(datum.month / 12);

    return (
      <div
        style={{
          background: c.panelBg,
          border: `1px solid ${c.panelBorder}`,
          borderRadius: 6,
          padding: "8px 10px",
          fontSize: 12,
          minWidth: 168,
        }}
      >
        <div
          className="uppercase tracking-wide"
          style={{ color: c.axisText, fontSize: 11, marginBottom: 6 }}
        >
          {`AGE ${datum.age.toFixed(1)} · ${year}`}
        </div>
        {series.map((s) => {
          // Coast is optional per point; only show a row when it has a value.
          const v = datum[s.key];
          if (v == null || !Number.isFinite(v)) return null;
          return (
            <div
              key={s.key}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                padding: "1px 0",
              }}
            >
              <span
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Swatch color={s.color} dashed={s.dashed} />
                <span style={{ color: c.axisText }}>{s.label}</span>
              </span>
              <span
                style={{ color: c.labelText, fontVariantNumeric: "tabular-nums" }}
              >
                {fmtUsd(v)}
              </span>
            </div>
          );
        })}
      </div>
    );
  };
}
