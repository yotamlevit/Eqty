"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { fmtUsd } from "@/lib/format";
import type { Mode, PlanInputs, SimpleInputs } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Panel } from "./panel";

interface InputsPanelProps {
  mode: Mode;
  simple: SimpleInputs;
  plan: PlanInputs;
  portfolioMonthlyContribution: number;
  activeLocationLabel: string;
  onSimpleChange: (patch: Partial<SimpleInputs>) => void;
  onPlanChange: (patch: Partial<PlanInputs>) => void;
  onPortfolioContributionChange: (value: number) => void;
}

/**
 * Permissive numeric parse: strip currency/percent chrome. Returns null when
 * the draft is empty or a partial token ("-", ".", "-.") that is not yet a
 * number, so callers can hold the draft instead of committing a stray 0.
 */
function parseNumberOrNull(raw: string): number | null {
  const cleaned = raw.replace(/[$,%\s]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === "." || cleaned === "-.") {
    return null;
  }
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function clamp(n: number, min?: number, max?: number): number {
  let out = n;
  if (min !== undefined) out = Math.max(min, out);
  if (max !== undefined) out = Math.min(max, out);
  return out;
}

function inRange(n: number, min?: number, max?: number): boolean {
  if (min !== undefined && n < min) return false;
  if (max !== undefined && n > max) return false;
  return true;
}

/**
 * Numeric input that commits live on every keystroke while the parsed value is
 * finite and within [min,max]; otherwise it holds the draft and clamp-commits
 * on blur or Enter. Focused it always shows the raw editable draft (never
 * reformats mid-type); idle it shows a formatted figure.
 */
function NumberInput({
  value,
  onCommit,
  min,
  max,
  step,
  currency = false,
  ariaLabel,
  className,
}: {
  value: number;
  onCommit: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  currency?: boolean;
  ariaLabel: string;
  className?: string;
}) {
  const [draft, setDraft] = React.useState<string | null>(null);
  const display =
    draft !== null ? draft : currency ? fmtUsd(value) : String(value);

  const commit = () => {
    if (draft === null) return;
    onCommit(clamp(parseNumberOrNull(draft) ?? 0, min, max));
    setDraft(null);
  };

  return (
    <Input
      inputMode="decimal"
      aria-label={ariaLabel}
      value={display}
      step={step}
      onFocus={() => setDraft(String(value))}
      onChange={(e) => {
        const raw = e.target.value;
        setDraft(raw);
        const parsed = parseNumberOrNull(raw);
        if (parsed !== null && inRange(parsed, min, max)) {
          onCommit(parsed);
        }
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
          e.currentTarget.blur();
        }
      }}
      className={cn("h-8 text-right font-mono tabular-nums", className)}
    />
  );
}

function FieldRow({
  label,
  helper,
  children,
}: {
  label: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className="w-40">{children}</div>
      </div>
      {helper ? (
        <p className="text-xs text-muted-foreground/70">{helper}</p>
      ) : null}
    </div>
  );
}

/** Slider paired with a typeable numeric input; both drive the same value. */
function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onCommit,
  caption,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onCommit: (n: number) => void;
  caption?: string;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs text-muted-foreground">{label}</span>
        <NumberInput
          value={value}
          min={min}
          max={max}
          step={step}
          ariaLabel={label}
          onCommit={onCommit}
          className="h-7 w-16"
        />
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        aria-label={label}
        onValueChange={(v) => onCommit(v[0] ?? value)}
      />
      {caption ? (
        <p className="text-xs text-muted-foreground/70">{caption}</p>
      ) : null}
    </div>
  );
}

export function InputsPanel({
  mode,
  simple,
  plan,
  portfolioMonthlyContribution,
  activeLocationLabel,
  onSimpleChange,
  onPlanChange,
  onPortfolioContributionChange,
}: InputsPanelProps) {
  const baseContribution =
    mode === "simple"
      ? simple.monthlyContribution
      : portfolioMonthlyContribution;
  const totalContribution = baseContribution + plan.extraMonthlyContribution;

  return (
    <Panel title="PARAMETERS">
      <div className="flex flex-col gap-4">
        {mode === "simple" ? (
          <>
            <FieldRow label="Current assets">
              <NumberInput
                currency
                min={0}
                value={simple.currentAssets}
                ariaLabel="Current assets"
                onCommit={(n) => onSimpleChange({ currentAssets: n })}
              />
            </FieldRow>
            <FieldRow label="Monthly contribution">
              <NumberInput
                currency
                min={0}
                value={simple.monthlyContribution}
                ariaLabel="Monthly contribution"
                onCommit={(n) => onSimpleChange({ monthlyContribution: n })}
              />
            </FieldRow>
          </>
        ) : (
          <FieldRow label="Monthly contribution">
            <NumberInput
              currency
              min={0}
              value={portfolioMonthlyContribution}
              ariaLabel="Monthly contribution"
              onCommit={(n) => onPortfolioContributionChange(n)}
            />
          </FieldRow>
        )}

        <SliderRow
          label="Additional contribution"
          value={plan.extraMonthlyContribution}
          min={0}
          max={5000}
          step={100}
          caption={`Total ${fmtUsd(totalContribution)} /mo`}
          onCommit={(n) => onPlanChange({ extraMonthlyContribution: n })}
        />

        {mode === "simple" ? (
          <SliderRow
            label="Expected return"
            value={simple.expectedReturnPct}
            min={0}
            max={14}
            step={0.1}
            onCommit={(n) => onSimpleChange({ expectedReturnPct: n })}
          />
        ) : null}

        <FieldRow label="Current age">
          <NumberInput
            min={16}
            max={80}
            value={plan.currentAge}
            ariaLabel="Current age"
            onCommit={(n) => onPlanChange({ currentAge: n })}
          />
        </FieldRow>

        <FieldRow label="Retirement age">
          <NumberInput
            min={plan.currentAge + 1}
            max={80}
            value={plan.retirementAge}
            ariaLabel="Retirement age"
            onCommit={(n) => onPlanChange({ retirementAge: n })}
          />
        </FieldRow>

        <SliderRow
          label="Inflation"
          value={plan.inflationPct}
          min={0}
          max={8}
          step={0.1}
          onCommit={(n) => onPlanChange({ inflationPct: n })}
        />

        <SliderRow
          label="Safe withdrawal rate"
          value={plan.swrPct}
          min={2}
          max={6}
          step={0.1}
          onCommit={(n) => onPlanChange({ swrPct: n })}
        />

        <FieldRow
          label="Target net spend / yr"
          helper={`Net of tax in ${activeLocationLabel}. Selecting a lifestyle in the matrix overwrites this with its researched cost.`}
        >
          <NumberInput
            currency
            min={0}
            value={plan.targetNetAnnualSpend}
            ariaLabel="Target net spend per year"
            onCommit={(n) => onPlanChange({ targetNetAnnualSpend: n })}
          />
        </FieldRow>
      </div>
    </Panel>
  );
}
