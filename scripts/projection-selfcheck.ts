/**
 * Projection engine self-check.
 *
 * Runs the pure engine against closed-form financial identities and prints a
 * PASS line per property. Throws (non-zero exit) on the first failure.
 *
 *   node scripts/projection-selfcheck.ts
 *
 * Imports are RELATIVE with explicit .ts extensions: this runs under plain
 * `node` type-stripping, where the @/ alias does not resolve.
 */

// Node's type-stripping resolver requires the explicit .ts extension here;
// this repo's tsconfig doesn't enable allowImportingTsExtensions, so tsc would
// otherwise flag the specifier. The extension is mandatory for `node` to run it.
// prettier-ignore
// @ts-expect-error -- runtime (node) needs the .ts extension; tsc rejects it (TS5097)
import { project, blendedReturnPct, monthsToTarget, coastCurve, monthsToCoast, realAnnualRate, requiredMonthlyContribution } from "../src/lib/projection.ts";
import type { Portfolio } from "../src/lib/types.ts";

let checks = 0;

function assert(cond: boolean, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

function close(a: number, b: number, eps: number, msg: string): void {
  assert(Math.abs(a - b) <= eps, `${msg} — got ${a}, expected ${b} (eps ${eps})`);
}

function pass(msg: string): void {
  checks++;
  console.log(`PASS  ${msg}`);
}

// ---------------------------------------------------------------------------
// 1. Zero return, zero inflation: nominal is exactly principal, real == nominal.
// ---------------------------------------------------------------------------
{
  const start = 100_000;
  const c = 1_000;
  const res = project({
    startingAssets: start,
    monthlyContribution: c,
    annualReturnPct: 0,
    inflationPct: 0,
    currentAge: 30,
    horizonYears: 10,
  });
  for (const p of res.points) {
    close(p.nominal, start + c * p.month, 1e-6, `zero/zero nominal at month ${p.month}`);
    assert(p.real === p.nominal, `zero/zero real === nominal at month ${p.month}`);
    close(p.contributed, start + c * p.month, 1e-6, `zero/zero contributed at month ${p.month}`);
  }
  assert(res.points[0].nominal === start, "point 0 nominal === startingAssets");
  assert(res.points[0].contributed === start, "point 0 contributed === startingAssets");
  assert(res.points.length === 121, "10yr horizon yields 121 monthly points");
  pass("zero return / zero inflation: nominal = start + c*m, real === nominal");
}

// ---------------------------------------------------------------------------
// 2. Future-value closed form: lump sum, no contributions.
//    nominal(120) === start * (1 + r)^10
// ---------------------------------------------------------------------------
{
  const start = 100_000;
  const res = project({
    startingAssets: start,
    monthlyContribution: 0,
    annualReturnPct: 7,
    inflationPct: 0,
    currentAge: 40,
    horizonYears: 10,
  });
  const expected = start * Math.pow(1.07, 10);
  close(res.points[120].nominal, expected, 1, "FV lump-sum nominal at month 120");
  pass("future value: nominal(120) === start*(1.07)^10 within $1");
}

// ---------------------------------------------------------------------------
// 3. Annuity closed form: no starting assets, contributions only.
//    nominal(m) === c * ((1+i)^m - 1) / i,  i = (1.06)^(1/12) - 1
// ---------------------------------------------------------------------------
{
  const c = 1_000;
  const i = Math.pow(1.06, 1 / 12) - 1;
  const res = project({
    startingAssets: 0,
    monthlyContribution: c,
    annualReturnPct: 6,
    inflationPct: 0,
    currentAge: 25,
    horizonYears: 10,
  });
  for (const m of [1, 12, 60, 120]) {
    const expected = (c * (Math.pow(1 + i, m) - 1)) / i;
    close(res.points[m].nominal, expected, 1, `annuity nominal at month ${m}`);
  }
  pass("annuity: nominal(m) === c*((1+i)^m - 1)/i within $1");
}

// ---------------------------------------------------------------------------
// 4. Deflation: real is nominal divided by the cumulative inflation factor.
//    real(120) === nominal(120) / (1.025)^10
// ---------------------------------------------------------------------------
{
  const res = project({
    startingAssets: 250_000,
    monthlyContribution: 2_500,
    annualReturnPct: 7,
    inflationPct: 2.5,
    currentAge: 35,
    horizonYears: 10,
  });
  const expected = res.points[120].nominal / Math.pow(1.025, 10);
  close(res.points[120].real, expected, 1, "deflated real at month 120");
  pass("deflation: real(120) === nominal(120)/(1.025)^10 within $1");
}

// ---------------------------------------------------------------------------
// 5. blendedReturnPct: 75% at 8% and 25% at 4% blend to 7%.
// ---------------------------------------------------------------------------
{
  const portfolio: Portfolio = {
    monthlyContribution: 0,
    holdings: [
      {
        id: "a",
        ticker: "AAA",
        name: "Seventy-five",
        assetClass: "equity",
        units: 750,
        price: 100, // value 75,000 -> 75%
        costBasisPerUnit: 100,
        expectedReturnPct: 8,
      },
      {
        id: "b",
        ticker: "BBB",
        name: "Twenty-five",
        assetClass: "bond",
        units: 250,
        price: 100, // value 25,000 -> 25%
        costBasisPerUnit: 100,
        expectedReturnPct: 4,
      },
    ],
  };
  close(blendedReturnPct(portfolio), 7, 1e-9, "blended 75/25 of 8 and 4");

  // Empty and zero-value portfolios return 0.
  close(blendedReturnPct({ monthlyContribution: 0, holdings: [] }), 0, 1e-9, "blended empty portfolio");
  const zeroValue: Portfolio = {
    monthlyContribution: 0,
    holdings: [
      { id: "z", ticker: "ZZZ", name: "Zero", assetClass: "cash", units: 0, price: 0, costBasisPerUnit: 0, expectedReturnPct: 5 },
    ],
  };
  close(blendedReturnPct(zeroValue), 0, 1e-9, "blended zero-value portfolio");
  pass("blendedReturnPct: 75/25 of 8 and 4 === 7; empty/zero-value === 0");
}

// ---------------------------------------------------------------------------
// 6. monthsToTarget: first crossing month, and null when unreachable.
// ---------------------------------------------------------------------------
{
  const res = project({
    startingAssets: 100_000,
    monthlyContribution: 1_000,
    annualReturnPct: 7,
    inflationPct: 0,
    currentAge: 30,
    horizonYears: 40,
  });
  const target = 500_000;

  // Independently find the first month whose real value clears the target.
  let expectedMonth: number | null = null;
  for (const p of res.points) {
    if (p.real >= target) {
      expectedMonth = p.month;
      break;
    }
  }
  assert(expectedMonth !== null, "sanity: target is reachable within horizon");
  assert(monthsToTarget(res, target) === expectedMonth, "monthsToTarget returns first crossing month");
  // Confirm it is genuinely the FIRST crossing: the prior month is below target.
  assert(
    expectedMonth === 0 || res.points[expectedMonth - 1].real < target,
    "the month before the crossing is strictly below target"
  );

  // Unreachable within horizon -> null.
  assert(monthsToTarget(res, 1e12) === null, "monthsToTarget is null when unreachable");
  // Non-positive target -> already met at month 0.
  assert(monthsToTarget(res, 0) === 0, "monthsToTarget(0) === 0");
  assert(monthsToTarget(res, -5) === 0, "monthsToTarget(negative) === 0");
  pass("monthsToTarget: first crossing month; null when unreachable; 0 for <= 0 target");
}

// ---------------------------------------------------------------------------
// 7. Coast curve: equals the FIRE number at retirement; the month-0 value
//    compounds (real) back up to the FIRE number; flat when real growth <= 0.
// ---------------------------------------------------------------------------
{
  const fireNumber = 2_000_000;
  const retirementMonths = 23 * 12; // retire at 55, currently 32
  const res = project({
    startingAssets: 450_000,
    monthlyContribution: 6_000,
    annualReturnPct: 10,
    inflationPct: 3,
    currentAge: 32,
    horizonYears: 40,
  });
  const coast = coastCurve(res.points, fireNumber, retirementMonths, 10, 3);

  close(coast[retirementMonths], fireNumber, 1e-6, "coast at retirement === FIRE number");
  const rReal = realAnnualRate(10, 3);
  close(
    coast[0] * Math.pow(1 + rReal, retirementMonths / 12),
    fireNumber,
    1,
    "coast[0] compounds to the FIRE number by retirement"
  );
  // Monotone nondecreasing up to retirement (requirement rises as time shrinks).
  for (let m = 1; m <= retirementMonths; m++) {
    assert(coast[m] >= coast[m - 1] - 1e-9, `coast is nondecreasing at month ${m}`);
  }
  // Non-positive real growth: coasting cannot help, requirement is flat at F.
  const flat = coastCurve(res.points, fireNumber, retirementMonths, 2, 5);
  assert(flat.every((v) => v === fireNumber), "coast is flat at F when real growth <= 0");
  pass("coastCurve: anchors at FIRE number, real-compounds from month 0, flat when real rate <= 0");
}

// ---------------------------------------------------------------------------
// 8. monthsToCoast: first month the real balance meets the coast requirement.
// ---------------------------------------------------------------------------
{
  const fireNumber = 2_000_000;
  const retirementMonths = 23 * 12;
  const res = project({
    startingAssets: 450_000,
    monthlyContribution: 6_000,
    annualReturnPct: 10,
    inflationPct: 3,
    currentAge: 32,
    horizonYears: 40,
  });
  const coast = coastCurve(res.points, fireNumber, retirementMonths, 10, 3);
  const m = monthsToCoast(res.points, coast);
  assert(m !== null, "coast crossing is reachable in the default scenario");
  assert(res.points[m].real >= coast[m], "real >= coast at the crossing");
  assert(m === 0 || res.points[m - 1].real < coast[m - 1], "prior month is below the coast line");
  // A balance already above the requirement coasts from day one.
  const rich = project({
    startingAssets: 5_000_000,
    monthlyContribution: 0,
    annualReturnPct: 10,
    inflationPct: 3,
    currentAge: 32,
    horizonYears: 40,
  });
  assert(monthsToCoast(rich.points, coastCurve(rich.points, fireNumber, retirementMonths, 10, 3)) === 0, "already-coasting portfolio crosses at month 0");
  pass("monthsToCoast: first real-vs-coast crossing; 0 when already above the line");
}

// ---------------------------------------------------------------------------
// 9. requiredMonthlyContribution inverts project(): contributing exactly the
//    returned amount reaches the FIRE number (real) at the target month.
// ---------------------------------------------------------------------------
{
  const fireNumber = 2_000_000;
  const months = 20 * 12;
  const startingAssets = 100_000; // genuine gap: alone this cannot reach 2M real
  const c = requiredMonthlyContribution({
    fireNumber,
    startingAssets,
    annualReturnPct: 10,
    inflationPct: 3,
    months,
  });
  assert(c !== null && c > 0, "solver returns a positive contribution for a real gap");
  const res = project({
    startingAssets,
    monthlyContribution: c as number,
    annualReturnPct: 10,
    inflationPct: 3,
    currentAge: 32,
    horizonYears: 20,
  });
  close(res.points[months].real, fireNumber, 1, "plugging the solved contribution back reproduces the FIRE number");

  // At the 10% default, 450k over 23 years is already fully funded: $0/mo.
  const funded = requiredMonthlyContribution({
    fireNumber,
    startingAssets: 450_000,
    annualReturnPct: 10,
    inflationPct: 3,
    months: 23 * 12,
  });
  close(funded as number, 0, 1e-9, "default 450k at 10% needs $0/mo for 2M by 55");

  // Already-funded portfolios need nothing.
  const zero = requiredMonthlyContribution({
    fireNumber: 100_000,
    startingAssets: 5_000_000,
    annualReturnPct: 10,
    inflationPct: 3,
    months,
  });
  close(zero as number, 0, 1e-9, "already-funded portfolio requires $0/mo");
  // Degenerate horizon.
  assert(
    requiredMonthlyContribution({ fireNumber, startingAssets, annualReturnPct: 10, inflationPct: 3, months: 0 }) === null,
    "months <= 0 returns null"
  );
  pass("requiredMonthlyContribution: inverts project() within $1; $0 when funded; null for no horizon");
}

console.log(`\nAll ${checks} projection checks passed.`);
