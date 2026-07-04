"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fmtPct, fmtPctNum, fmtUsd } from "@/lib/format";
import type { AssetClass, Holding } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Panel } from "./panel";

interface LedgerTableProps {
  holdings: Holding[];
  onChange: (holdings: Holding[]) => void;
}

const ASSET_CLASSES: { value: AssetClass; label: string }[] = [
  { value: "equity", label: "Equity" },
  { value: "bond", label: "Bond" },
  { value: "cash", label: "Cash" },
  { value: "crypto", label: "Crypto" },
  { value: "real-estate", label: "Real Estate" },
];

const headClass =
  "h-9 px-2 text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground";
const cellInputClass =
  "h-7 border-transparent bg-transparent px-1 text-sm shadow-none dark:bg-transparent";

function parseNumber(raw: string): number {
  const cleaned = raw.replace(/[$,\s]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === "." || cleaned === "-.") {
    return 0;
  }
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/** Signed gain percent with explicit +/-, em dash when undefined. */
function signedPct(fraction: number): string {
  if (!Number.isFinite(fraction)) return "—";
  const sign = fraction > 0 ? "+" : fraction < 0 ? "-" : "";
  return `${sign}${fmtPct(Math.abs(fraction))}`;
}

function CellText({
  value,
  onCommit,
  uppercase = false,
  ariaLabel,
  className,
}: {
  value: string;
  onCommit: (v: string) => void;
  uppercase?: boolean;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <Input
      aria-label={ariaLabel}
      value={value}
      onChange={(e) =>
        onCommit(uppercase ? e.target.value.toUpperCase() : e.target.value)
      }
      className={cn(
        cellInputClass,
        uppercase && "font-mono uppercase",
        className
      )}
    />
  );
}

function CellNumber({
  value,
  onCommit,
  min,
  ariaLabel,
}: {
  value: number;
  onCommit: (n: number) => void;
  min?: number;
  ariaLabel: string;
}) {
  const [draft, setDraft] = React.useState<string | null>(null);
  return (
    <Input
      inputMode="decimal"
      aria-label={ariaLabel}
      value={draft ?? String(value)}
      onFocus={() => setDraft(String(value))}
      onChange={(e) => {
        setDraft(e.target.value);
        const n = parseNumber(e.target.value);
        onCommit(min !== undefined ? Math.max(min, n) : n);
      }}
      onBlur={() => setDraft(null)}
      className={cn(cellInputClass, "text-right font-mono tabular-nums")}
    />
  );
}

export function LedgerTable({ holdings, onChange }: LedgerTableProps) {
  const patch = (id: string, p: Partial<Holding>) =>
    onChange(holdings.map((h) => (h.id === id ? { ...h, ...p } : h)));
  const remove = (id: string) =>
    onChange(holdings.filter((h) => h.id !== id));
  const add = () =>
    onChange([
      ...holdings,
      {
        id: crypto.randomUUID(),
        ticker: "",
        name: "",
        assetClass: "equity",
        units: 0,
        price: 0,
        costBasisPerUnit: 0,
        expectedReturnPct: 6,
      },
    ]);

  const totalValue = holdings.reduce((s, h) => s + h.units * h.price, 0);
  const weightedGrowth =
    totalValue > 0
      ? holdings.reduce(
          (s, h) => s + h.units * h.price * h.expectedReturnPct,
          0
        ) / totalValue
      : 0;

  return (
    <Panel
      title="PORTFOLIO LEDGER"
      contentClassName="p-0"
      action={
        <Button variant="outline" size="sm" onClick={add}>
          <Plus />
          Add holding
        </Button>
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className={headClass}>Ticker</TableHead>
            <TableHead className={headClass}>Name</TableHead>
            <TableHead className={headClass}>Class</TableHead>
            <TableHead className={cn(headClass, "text-right")}>Units</TableHead>
            <TableHead className={cn(headClass, "text-right")}>Price</TableHead>
            <TableHead className={cn(headClass, "text-right")}>
              Cost Basis
            </TableHead>
            <TableHead className={cn(headClass, "text-right")}>
              Growth %
            </TableHead>
            <TableHead className={cn(headClass, "text-right")}>Value</TableHead>
            <TableHead className={cn(headClass, "text-right")}>Gain</TableHead>
            <TableHead className={headClass}>
              <span className="sr-only">Remove</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {holdings.map((h) => {
            const value = h.units * h.price;
            const gain =
              h.costBasisPerUnit > 0
                ? (h.price - h.costBasisPerUnit) / h.costBasisPerUnit
                : NaN;
            return (
              <TableRow key={h.id}>
                <TableCell className="p-1">
                  <CellText
                    value={h.ticker}
                    uppercase
                    ariaLabel="Ticker"
                    onCommit={(v) => patch(h.id, { ticker: v })}
                  />
                </TableCell>
                <TableCell className="max-w-[220px] p-1">
                  <CellText
                    value={h.name}
                    ariaLabel="Name"
                    className="truncate"
                    onCommit={(v) => patch(h.id, { name: v })}
                  />
                </TableCell>
                <TableCell className="p-1">
                  <Select
                    value={h.assetClass}
                    onValueChange={(v) =>
                      patch(h.id, { assetClass: v as AssetClass })
                    }
                  >
                    <SelectTrigger
                      size="sm"
                      className="h-7 w-full border-transparent bg-transparent px-1 text-xs shadow-none dark:bg-transparent"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSET_CLASSES.map((c) => (
                        <SelectItem
                          key={c.value}
                          value={c.value}
                          className="text-xs"
                        >
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="p-1">
                  <CellNumber
                    value={h.units}
                    min={0}
                    ariaLabel="Units"
                    onCommit={(n) => patch(h.id, { units: n })}
                  />
                </TableCell>
                <TableCell className="p-1">
                  <CellNumber
                    value={h.price}
                    min={0}
                    ariaLabel="Price"
                    onCommit={(n) => patch(h.id, { price: n })}
                  />
                </TableCell>
                <TableCell className="p-1">
                  <CellNumber
                    value={h.costBasisPerUnit}
                    min={0}
                    ariaLabel="Cost basis per unit"
                    onCommit={(n) => patch(h.id, { costBasisPerUnit: n })}
                  />
                </TableCell>
                <TableCell className="p-1">
                  <CellNumber
                    value={h.expectedReturnPct}
                    min={-100}
                    ariaLabel="Expected growth percent"
                    onCommit={(n) => patch(h.id, { expectedReturnPct: n })}
                  />
                </TableCell>
                <TableCell className="p-2 text-right font-mono font-semibold tabular-nums">
                  {fmtUsd(value)}
                </TableCell>
                <TableCell className="p-2 text-right font-mono tabular-nums text-muted-foreground">
                  {signedPct(gain)}
                </TableCell>
                <TableCell className="p-1 text-right">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Remove holding"
                    onClick={() => remove(h.id)}
                  >
                    <X />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
          {holdings.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={10}
                className="p-6 text-center text-xs text-muted-foreground"
              >
                No holdings. Add one to begin.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell
              colSpan={6}
              className="p-2 text-[11px] uppercase tracking-[0.15em] text-muted-foreground"
            >
              Total
            </TableCell>
            <TableCell className="p-2 text-right font-mono tabular-nums">
              {fmtPctNum(weightedGrowth)}
            </TableCell>
            <TableCell className="p-2 text-right font-mono font-semibold tabular-nums">
              {fmtUsd(totalValue)}
            </TableCell>
            <TableCell colSpan={2} />
          </TableRow>
        </TableFooter>
      </Table>
    </Panel>
  );
}
