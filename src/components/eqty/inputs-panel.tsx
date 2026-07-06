"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
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
  /** True when the Custom matrix row is active — unlocks the tax-rate field. */
  isCustom: boolean;
  /** Effective tax rate of the active plan, percent (location brackets or flat). */
  activeEffectiveTaxPct: number;
  /** Gross annual withdrawal the active net target requires, USD. */
  activeGross: number;
  /** The coast age — the auto value for "stop investing age". */
  coastAge: number;
  /** Effective stop-investing age (override, or coastAge when on auto). */
  effectiveStopInvestingAge: number;
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
  percent = false,
  ariaLabel,
  className,
}: {
  value: number;
  onCommit: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  currency?: boolean;
  percent?: boolean;
  ariaLabel: string;
  className?: string;
}) {
  const [draft, setDraft] = React.useState<string | null>(null);
  const display =
    draft !== null
      ? draft
      : currency
        ? fmtUsd(value)
        : percent
          ? `${value}%`
          : String(value);

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

/** Read-only computed figure, styled like a NumberInput but not editable. */
function ReadonlyField({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className="flex h-8 w-40 items-center justify-end rounded-md border border-input bg-muted/40 px-3 font-mono text-sm tabular-nums text-muted-foreground">
          {value}
        </div>
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
  isCustom,
  activeEffectiveTaxPct,
  activeGross,
  coastAge,
  effectiveStopInvestingAge,
  onSimpleChange,
  onPlanChange,
  onPortfolioContributionChange,
}: InputsPanelProps) {
  const baseContribution =
    mode === "simple"
      ? simple.monthlyContribution
      : portfolioMonthlyContribution;
  const totalContribution = baseContribution + plan.extraMonthlyContribution;
  const stopIsAuto = plan.stopInvestingAge === null;

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

        {/* Escalate the contribution with inflation (constant in today's $) or
            hold it fixed in nominal dollars. */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">
              Raise with inflation
            </span>
            <span className="text-[11px] text-muted-foreground/70">
              Grow contributions so they stay constant in today&apos;s $
            </span>
          </div>
          <Switch
            size="sm"
            checked={plan.escalateContributions}
            onCheckedChange={(v) =>
              onPlanChange({ escalateContributions: v })
            }
            aria-label="Raise contributions with inflation"
          />
        </div>

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

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-muted-foreground">
              Stop investing age
            </span>
            <div className="w-40">
              <NumberInput
                min={plan.currentAge}
                max={90}
                value={Math.round(effectiveStopInvestingAge)}
                ariaLabel="Stop investing age"
                onCommit={(n) => onPlanChange({ stopInvestingAge: n })}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground/70">
            {stopIsAuto ? (
              <>Auto — your coast age ({Math.round(coastAge)}). Draws the graph line
              for stopping contributions here.</>
            ) : (
              <>
                Custom.{" "}
                <button
                  type="button"
                  onClick={() => onPlanChange({ stopInvestingAge: null })}
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  Reset to coast age ({Math.round(coastAge)})
                </button>
              </>
            )}
          </p>
        </div>

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

        {/* Net → tax → gross. Net is always editable; tax is editable only in
            Custom mode (else it shows the active lifestyle's effective rate);
            gross is always the computed result. Selecting a lifestyle in the
            matrix overwrites all three. */}
        <div className="flex flex-col gap-3 border-t pt-4">
          <FieldRow label="Target net spend / yr">
            <NumberInput
              currency
              min={0}
              value={plan.targetNetAnnualSpend}
              ariaLabel="Target net spend per year"
              onCommit={(n) => onPlanChange({ targetNetAnnualSpend: n })}
            />
          </FieldRow>

          {isCustom ? (
            <FieldRow
              label="Tax rate"
              helper="Custom flat rate on the whole draw — edit freely."
            >
              <NumberInput
                percent
                min={0}
                max={100}
                step={0.1}
                value={plan.customTaxPct}
                ariaLabel="Custom tax rate percent"
                onCommit={(n) => onPlanChange({ customTaxPct: n })}
              />
            </FieldRow>
          ) : (
            <ReadonlyField
              label="Tax rate"
              value={`${activeEffectiveTaxPct.toFixed(1)}%`}
              helper={`Effective rate in ${activeLocationLabel}. Pick "Custom" atop the matrix to set your own.`}
            />
          )}

          <ReadonlyField
            label="Gross draw / yr"
            value={fmtUsd(Math.round(activeGross))}
            helper="Pre-tax withdrawal needed to net your target; drives the FIRE number."
          />
        </div>
      </div>
    </Panel>
  );
}
