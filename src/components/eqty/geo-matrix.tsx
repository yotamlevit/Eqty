"use client";

import { Fragment, useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fmtMonthsAsYears, fmtPct, fmtUsd, fmtUsdCompact } from "@/lib/format";
import type { LocationPlan } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Panel } from "./panel";

interface GeoMatrixProps {
  rows: LocationPlan[];
  activeId: string;
  onSelect: (id: string) => void;
  /** Reference net spend for an average-cost US city (index 100), USD. */
  baselineNetSpend: number;
}

const headClass =
  "h-9 px-3 text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground";
const numClass = "px-3 text-right align-top font-mono tabular-nums";
/** Bright, tabular figure embedded in the muted explainer prose. */
const figClass = "font-mono tabular-nums text-foreground";

/**
 * Cost-of-living index derived from a location's fixed net spend against the
 * average-cost US baseline (100). Deriving it here — rather than storing a
 * separate hand-set index — guarantees the COL column and the Net Spend column
 * always tell the same story.
 */
function colIndexOf(netAnnualSpend: number, baselineNetSpend: number): number {
  if (baselineNetSpend <= 0) return 100;
  return Math.round((netAnnualSpend / baselineNetSpend) * 100);
}

/** Signed cost-of-living delta vs baseline: "+15%", "-32%", "+0%". */
function colDiffPct(colIndex: number): string {
  const diff = Math.round(colIndex - 100);
  return `${diff >= 0 ? "+" : "-"}${Math.abs(diff)}%`;
}

/** COL cell caption: "+15% vs US base", "-32% vs US base", "US base". */
function colDeltaCaption(colIndex: number): string {
  if (Math.round(colIndex - 100) === 0) return "US base";
  return `${colDiffPct(colIndex)} vs US base`;
}

export function GeoMatrix({
  rows,
  activeId,
  onSelect,
  baselineNetSpend,
}: GeoMatrixProps) {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Panel title="LIFESTYLE MATRIX — GEO-TAX ENGINE" contentClassName="p-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className={headClass}>Location</TableHead>
            <TableHead className={cn(headClass, "text-right")}>
              Cost of Living
            </TableHead>
            <TableHead className={cn(headClass, "text-right")}>
              Net Spend /yr
            </TableHead>
            <TableHead className={cn(headClass, "text-right")}>
              Eff. Tax
            </TableHead>
            <TableHead className={cn(headClass, "text-right")}>
              Gross Draw /yr
            </TableHead>
            <TableHead className={cn(headClass, "text-right")}>
              Fire Number
            </TableHead>
            <TableHead className={cn(headClass, "text-right")}>
              Years to FI
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const isActive = r.location.id === activeId;
            const isExpanded = expanded.has(r.location.id);
            const colIndex = colIndexOf(r.netAnnualSpend, baselineNetSpend);
            return (
              <Fragment key={r.location.id}>
                <TableRow
                  role="button"
                  tabIndex={0}
                  aria-pressed={isActive}
                  onClick={() => onSelect(r.location.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(r.location.id);
                    }
                  }}
                  className={cn(
                    "cursor-pointer",
                    isActive ? "bg-accent hover:bg-accent" : "hover:bg-accent/50"
                  )}
                >
                  <TableCell
                    className={cn(
                      "px-3 align-top",
                      isActive && "shadow-[inset_2px_0_0_0_var(--foreground)]"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <button
                        type="button"
                        aria-label={
                          isExpanded ? "Collapse details" : "Expand details"
                        }
                        aria-expanded={isExpanded}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggle(r.location.id);
                        }}
                        className="mt-0.5 shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <span
                          className={cn(
                            "inline-block text-[10px] leading-none transition-transform",
                            isExpanded && "rotate-90"
                          )}
                        >
                          ▶
                        </span>
                      </button>
                      <div className="flex flex-col gap-0.5">
                        <span className="flex items-center gap-2 font-semibold">
                          {r.location.label}
                          {isActive ? (
                            <Badge
                              variant="outline"
                              className="px-1.5 py-0 text-[10px] leading-none"
                            >
                              ACTIVE
                            </Badge>
                          ) : null}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {r.location.city}, {r.location.country}
                        </span>
                        {r.location.blurb ? (
                          <span className="max-w-xs whitespace-normal text-xs text-muted-foreground">
                            {r.location.blurb}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-3 text-right align-top">
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="font-mono tabular-nums">{colIndex}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {colDeltaCaption(colIndex)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className={numClass}>
                    {fmtUsd(r.netAnnualSpend)}
                  </TableCell>
                  <TableCell className={numClass}>
                    {fmtPct(r.tax.effectiveRate)}
                  </TableCell>
                  <TableCell className={numClass}>
                    {fmtUsd(r.tax.gross)}
                  </TableCell>
                  <TableCell className={cn(numClass, "font-semibold")}>
                    {fmtUsdCompact(r.fireNumber)}
                  </TableCell>
                  <TableCell className={numClass}>
                    {fmtMonthsAsYears(r.monthsToFire)}
                  </TableCell>
                </TableRow>

                {isExpanded ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={7}
                      className="whitespace-normal bg-muted/40 px-4 py-3.5 align-top"
                    >
                      <div className="flex max-w-3xl flex-col gap-3">
                        <p className="text-sm leading-relaxed text-foreground/90">
                          {r.location.lifestyle}
                        </p>

                        <p className="text-xs leading-relaxed text-muted-foreground">
                          <span className="uppercase tracking-[0.1em] text-foreground/80">
                            What it takes
                          </span>
                          {" — net spend "}
                          <span className={figClass}>
                            {fmtUsd(r.netAnnualSpend)}
                          </span>
                          {"/yr · gross withdrawal "}
                          <span className={figClass}>{fmtUsd(r.tax.gross)}</span>
                          {"/yr · effective tax "}
                          <span className={figClass}>
                            {fmtPct(r.tax.effectiveRate)}
                          </span>
                          {" · FIRE number "}
                          <span className={figClass}>
                            {fmtUsdCompact(r.fireNumber)}
                          </span>
                          {"."}
                        </p>

                        {r.tax.byComponent.length > 0 ? (
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            <span className="uppercase tracking-[0.1em] text-foreground/80">
                              Tax on draw
                            </span>
                            {" — full draw taxed as capital gain:"}
                            {r.tax.byComponent.map((c, i) => (
                              <span key={c.id}>
                                {i === 0 ? " " : " · "}
                                {c.label}{" "}
                                <span className={figClass}>
                                  {fmtUsd(c.amount)}
                                </span>
                              </span>
                            ))}
                            {" · TOTAL "}
                            <span className={figClass}>
                              {fmtUsd(r.tax.totalTax)}
                            </span>
                            {" = "}
                            <span className={figClass}>
                              {fmtPct(r.tax.effectiveRate)}
                            </span>
                            {"."}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            No withdrawal tax modeled here.
                          </p>
                        )}

                        {r.location.notes.length > 0 ? (
                          <ul className="flex flex-col gap-1">
                            {r.location.notes.map((note, i) => (
                              <li
                                key={i}
                                className="text-xs leading-relaxed text-muted-foreground"
                              >
                                — {note}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : null}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
      <div className="border-t px-4 py-3">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Click a lifestyle to plan to it; expand any row (▶) for what it
          includes and the full cost breakdown. The cost-of-living index is each
          lifestyle&apos;s net spend against an average-cost US city (100 ={" "}
          <span className={figClass}>{fmtUsd(baselineNetSpend)}</span>/yr).
          Effective tax assumes a single filer taxed on the full draw as
          long-term capital gains — the mature rate once a long retirement has
          drawn cost basis down; current-law brackets; planning-grade estimates.
        </p>
      </div>
    </Panel>
  );
}
