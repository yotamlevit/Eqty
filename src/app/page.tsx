"use client";

import { useMemo } from "react";

import {
  GeoMatrix,
  InputsPanel,
  KpiRow,
  LedgerTable,
  Panel,
  StatTile,
  TopBar,
} from "@/components/eqty";
import { AllocationBar } from "@/components/charts/allocation-bar";
import { ProjectionChart } from "@/components/charts/projection-chart";
import {
  MAX_HORIZON_YEARS,
  POST_RETIREMENT_YEARS,
  US_BASELINE_NET_SPEND,
} from "@/lib/defaults";
import {
  fmtMonthsAsYears,
  fmtPct,
  fmtPctNum,
  fmtUsd,
  fmtUsdCompact,
} from "@/lib/format";
import {
  coastCurve,
  monthsToCoast,
  monthsToTarget,
  project,
  projectStopInvestReal,
  requiredMonthlyContribution,
} from "@/lib/projection";
import {
  expectedReturnPct,
  monthlyContribution,
  portfolioCostBasis,
  startingAssets,
} from "@/lib/selectors";
import { cn } from "@/lib/utils";
import { grossForNet, LOCATIONS } from "@/lib/tax";
import type { LocationPlan, LocationProfile } from "@/lib/types";
import { useEqtyState } from "@/lib/use-eqty-state";
import { useTheme } from "@/lib/use-theme";

export default function Home() {
  const {
    state,
    hydrated,
    setMode,
    patchSimple,
    patchPlan,
    setHoldings,
    setPortfolioContribution,
    reset,
  } = useEqtyState();
  const { theme, setTheme } = useTheme();

  const derived = useMemo(() => {
    const start = startingAssets(state);
    const contrib = monthlyContribution(state);
    const returnPct = expectedReturnPct(state);

    const projectArgs = {
      startingAssets: start,
      monthlyContribution: contrib,
      annualReturnPct: returnPct,
      inflationPct: state.plan.inflationPct,
      currentAge: state.plan.currentAge,
      horizonYears: MAX_HORIZON_YEARS,
    };
    const projOpts = {
      escalateContributions: state.plan.escalateContributions,
    };
    const projection = project(projectArgs, projOpts);

    // The Custom row: a synthetic "location" whose tax is a single flat rate the
    // user sets directly (customTaxPct) on the whole draw. It is the escape
    // hatch from the preset lifestyles — set net spend and tax freely, no
    // location bracket schedule. It uses the live target net spend, not a fixed
    // figure, and leads the matrix so it sits at the top.
    const customLocation: LocationProfile = {
      id: "custom",
      label: "Custom",
      city: "Manual entry",
      country: "your own numbers",
      currency: "USD",
      netAnnualSpend: state.plan.targetNetAnnualSpend,
      blurb: "Set your own net spend and tax rate — not tied to any location.",
      lifestyle:
        "Your own numbers. Set the target net spend and a flat tax rate in the Parameters panel; the gross withdrawal and FIRE number update live. Use this when none of the preset lifestyles fit — you are not locked to the matrix.",
      components: [
        {
          id: "custom-flat",
          label: `Custom flat tax (${state.plan.customTaxPct}%)`,
          kind: "flat",
          base: "gain",
          rate: state.plan.customTaxPct / 100,
        },
      ],
      notes: [
        "Flat tax on the whole draw — edit the net spend and tax % directly in the Parameters panel.",
      ],
    };

    // One matrix row per lifestyle: real rows invert their FIXED researched net
    // spend through the local tax rules (taxing the FULL draw as capital gain,
    // gainRatio = 1 — the mature rate once basis is exhausted); the Custom row
    // uses the live target net spend and the flat custom rate.
    const makeRow = (location: LocationProfile, net: number): LocationPlan => {
      const tax = grossForNet(net, location, 1);
      const fireNumber = tax.gross / (state.plan.swrPct / 100);
      return {
        location,
        netAnnualSpend: net,
        tax,
        fireNumber,
        monthsToFire: monthsToTarget(projection, fireNumber),
      };
    };
    const rows: LocationPlan[] = [
      makeRow(customLocation, state.plan.targetNetAnnualSpend),
      ...LOCATIONS.map((location) => makeRow(location, location.netAnnualSpend)),
    ];

    // rows[1] (first real lifestyle) is the fallback, since rows[0] is Custom.
    const active =
      rows.find((r) => r.location.id === state.plan.locationId) ?? rows[1];

    // The headline plan runs off the manually-set target net spend (seeded by
    // clicking a matrix row, but freely editable in the parameters), grossed up
    // in the ACTIVE tax regime — a location's brackets, or the flat Custom rate.
    const activeTax = grossForNet(
      state.plan.targetNetAnnualSpend,
      active.location,
      1
    );
    const activeFireNumber = activeTax.gross / (state.plan.swrPct / 100);
    const activeMonthsToFire = monthsToTarget(projection, activeFireNumber);

    // Coast FIRE: the requirement curve for the active plan's FIRE number,
    // anchored at the chosen retirement age, overlaid on the projection.
    const retirementMonths = Math.max(
      0,
      Math.round((state.plan.retirementAge - state.plan.currentAge) * 12)
    );
    const coast = coastCurve(
      projection.points,
      activeFireNumber,
      retirementMonths,
      returnPct,
      state.plan.inflationPct
    );
    const coastMonths = monthsToCoast(projection.points, coast);

    // "Stop investing" line: contributions run until this age, then stop and the
    // balance compounds untouched. Defaults (null) to the coast age — the point
    // where coasting alone still reaches FI by retirement — but is overridable.
    const coastAge =
      coastMonths !== null
        ? state.plan.currentAge + coastMonths / 12
        : state.plan.retirementAge;
    const stopInvestingAge = state.plan.stopInvestingAge ?? coastAge;
    const totalMonths = projection.points.length - 1;
    const stopMonth = Math.min(
      totalMonths,
      Math.max(
        0,
        Math.round((stopInvestingAge - state.plan.currentAge) * 12)
      )
    );
    const stopInvestReal = projectStopInvestReal(
      projectArgs,
      stopMonth,
      projOpts
    );

    // The chart window scales to the plan instead of a fixed span: a couple
    // years past retirement, stretched if FI lands later, never under 10y.
    const chartMonths = Math.min(
      MAX_HORIZON_YEARS * 12,
      Math.max(
        retirementMonths + POST_RETIREMENT_YEARS * 12,
        (activeMonthsToFire ?? 0) + POST_RETIREMENT_YEARS * 12,
        120
      )
    );
    const chartPoints = projection.points
      .slice(0, chartMonths + 1)
      .map((p, i) => ({ ...p, coast: coast[i], stopInvest: stopInvestReal[i] }));
    const coastNow = coast[0];
    const retirementPoint =
      projection.points[
        Math.min(retirementMonths, projection.points.length - 1)
      ];
    const requiredMonthly = requiredMonthlyContribution({
      fireNumber: activeFireNumber,
      startingAssets: start,
      annualReturnPct: returnPct,
      inflationPct: state.plan.inflationPct,
      months: retirementMonths,
      escalateContributions: state.plan.escalateContributions,
    });

    return {
      start,
      contrib,
      returnPct,
      projection,
      rows,
      active,
      activeTax,
      activeFireNumber,
      activeMonthsToFire,
      activeIsCustom: active.location.id === "custom",
      activeEffectiveTaxPct: activeTax.effectiveRate * 100,
      activeGross: activeTax.gross,
      coastAge,
      stopInvestingAge,
      retirementMonths,
      chartMonths,
      chartPoints,
      coastMonths,
      coastNow,
      retirementPoint,
      requiredMonthly,
    };
  }, [state]);

  const { active } = derived;

  const kpis = [
    {
      label: "Net worth",
      value: fmtUsdCompact(derived.start),
      sub:
        state.mode === "complex"
          ? `${state.portfolio.holdings.length} holdings · ledger`
          : "manual input",
      delta: (() => {
        if (state.mode !== "complex") return undefined;
        const basis = portfolioCostBasis(state.portfolio);
        if (basis <= 0) return undefined;
        const pct = ((derived.start - basis) / basis) * 100;
        return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}% unrealized`;
      })(),
    },
    {
      label: "FIRE number",
      value: fmtUsdCompact(derived.activeFireNumber),
      sub: `${active.location.label} · ${fmtPctNum(state.plan.swrPct)} SWR`,
    },
    {
      label: "Years to FI",
      value: fmtMonthsAsYears(derived.activeMonthsToFire),
      sub:
        derived.activeMonthsToFire === null
          ? `beyond ${MAX_HORIZON_YEARS}y horizon`
          : `age ${(state.plan.currentAge + derived.activeMonthsToFire / 12).toFixed(1)}`,
    },
    {
      label: state.mode === "complex" ? "Blended return" : "Expected return",
      value: fmtPctNum(derived.returnPct),
      sub: "nominal / yr",
    },
    {
      label: "Effective tax",
      value: fmtPct(derived.activeTax.effectiveRate),
      sub: `on ${fmtUsdCompact(derived.activeTax.gross)} gross draw`,
    },
  ];

  const coastSurplus = derived.start - derived.coastNow;
  const extraMonthly =
    derived.requiredMonthly === null
      ? null
      : Math.max(0, derived.requiredMonthly - derived.contrib);
  const coastKpis = [
    {
      label: "Coast number (today)",
      value: fmtUsdCompact(derived.coastNow),
      sub: `no new savings, FI by ${state.plan.retirementAge}`,
    },
    {
      label: "Coast gap",
      value: `${coastSurplus >= 0 ? "+" : ""}${fmtUsdCompact(coastSurplus)}`,
      sub:
        coastSurplus >= 0
          ? "surplus — already past the coast line"
          : "shortfall vs coast number",
    },
    {
      label: "Years to coast FI",
      value: fmtMonthsAsYears(derived.coastMonths),
      sub:
        derived.coastMonths === null
          ? `beyond ${MAX_HORIZON_YEARS}y horizon`
          : derived.coastMonths === 0
            ? "you can stop contributing today"
            : `age ${(state.plan.currentAge + derived.coastMonths / 12).toFixed(1)}`,
    },
    {
      label: `Value at ${state.plan.retirementAge}`,
      value: fmtUsdCompact(derived.retirementPoint.real),
      sub: `today's $ · nominal ${fmtUsdCompact(derived.retirementPoint.nominal)}`,
    },
    {
      label: `Extra monthly for FI at ${state.plan.retirementAge}`,
      value:
        extraMonthly === null
          ? "—"
          : extraMonthly === 0
            ? "$0"
            : fmtUsd(Math.round(extraMonthly)),
      sub:
        extraMonthly === null
          ? "retirement age not ahead of today"
          : extraMonthly === 0
            ? "on track at current contribution"
            : `total ${fmtUsd(Math.round(derived.requiredMonthly ?? 0))}/mo`,
    },
  ];

  return (
    // Invisible until the localStorage snapshot is applied: a returning user
    // must never see a frame of seeded defaults wearing their dashboard.
    <div className={cn("flex min-h-screen flex-col", !hydrated && "invisible")}>
      <TopBar
        mode={state.mode}
        onModeChange={setMode}
        theme={theme}
        onThemeChange={setTheme}
      />

      <main className="mx-auto w-full max-w-[1440px] flex-1 space-y-4 px-4 py-5 lg:px-6">
        <KpiRow items={kpis} />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
          <InputsPanel
            mode={state.mode}
            simple={state.simple}
            plan={state.plan}
            portfolioMonthlyContribution={state.portfolio.monthlyContribution}
            activeLocationLabel={active.location.label}
            isCustom={derived.activeIsCustom}
            activeEffectiveTaxPct={derived.activeEffectiveTaxPct}
            activeGross={derived.activeGross}
            coastAge={derived.coastAge}
            effectiveStopInvestingAge={derived.stopInvestingAge}
            onSimpleChange={patchSimple}
            onPlanChange={patchPlan}
            onPortfolioContributionChange={setPortfolioContribution}
          />

          <div className="min-w-0 space-y-4">
            <Panel
              title={`Compounding trajectory — to age ${Math.round(
                state.plan.currentAge + derived.chartMonths / 12
              )}`}
            >
              <ProjectionChart
                points={derived.chartPoints}
                fireNumber={derived.activeFireNumber}
                currentAge={state.plan.currentAge}
                monthsToFire={derived.activeMonthsToFire}
                retirementAge={state.plan.retirementAge}
                monthsToCoast={derived.coastMonths}
                stopInvestingAge={derived.stopInvestingAge}
                appearance={theme}
              />
            </Panel>

            <Panel
              title={`Coast to FIRE — retire at ${state.plan.retirementAge}`}
              contentClassName="p-0"
            >
              <div className="grid grid-cols-2 md:grid-cols-5 md:divide-x md:divide-border">
                {coastKpis.map((item) => (
                  <StatTile key={item.label} {...item} />
                ))}
              </div>
            </Panel>

            {state.mode === "complex" && (
              <Panel title="Allocation">
                <AllocationBar
                  holdings={state.portfolio.holdings}
                  appearance={theme}
                />
              </Panel>
            )}
          </div>
        </div>

        {state.mode === "complex" && (
          <LedgerTable
            holdings={state.portfolio.holdings}
            onChange={setHoldings}
          />
        )}

        <GeoMatrix
          rows={derived.rows}
          activeId={active.location.id}
          // Selecting a lifestyle adopts its tax regime AND overwrites the manual
          // target net spend with that lifestyle's researched cost. Selecting
          // Custom keeps the current net but unlocks the tax field, seeding it
          // from whatever effective rate was active so the switch is continuous.
          onSelect={(id) => {
            if (id === "custom") {
              patchPlan({
                locationId: "custom",
                customTaxPct: Math.round(derived.activeEffectiveTaxPct * 10) / 10,
              });
              return;
            }
            const loc = LOCATIONS.find((l) => l.id === id);
            patchPlan({
              locationId: id,
              ...(loc ? { targetNetAnnualSpend: loc.netAnnualSpend } : {}),
            });
          }}
          baselineNetSpend={US_BASELINE_NET_SPEND}
        />
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-4 py-3 text-xs text-muted-foreground lg:px-6">
          <span className="flex items-center gap-3">
            EQTY — planning-grade estimates, not tax advice.
            <button
              type="button"
              onClick={reset}
              className="uppercase tracking-wide underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              Reset data
            </button>
          </span>
          <span className="font-mono tabular-nums">
            SWR {fmtPctNum(state.plan.swrPct)} · INFLATION{" "}
            {fmtPctNum(state.plan.inflationPct)} · FULL-GAIN TAX
          </span>
        </div>
      </footer>
    </div>
  );
}
