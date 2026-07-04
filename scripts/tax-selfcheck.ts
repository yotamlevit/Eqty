/**
 * Self-check for the geo-tax engine. Run with: node scripts/tax-selfcheck.ts
 *
 * The `@/` alias does not resolve under plain `node`, and this repo's tsconfig
 * targets a bundler (allowImportingTsExtensions is off), so a static `.ts`
 * import would trip TS5097. Loading the modules through a variable specifier
 * keeps both `node scripts/tax-selfcheck.ts` and `tsc --noEmit` green, while
 * `typeof import(...)` still gives the real static types.
 */

import type { WithdrawalTax } from "../src/lib/types";

const enginePath = "../src/lib/tax/engine.ts";
const locationsPath = "../src/lib/tax/locations.ts";
const { taxOnWithdrawal, grossForNet } = (await import(
  enginePath
)) as typeof import("../src/lib/tax/engine");
const { LOCATIONS, getLocation } = (await import(
  locationsPath
)) as typeof import("../src/lib/tax/locations");

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const NET_TARGETS = [30_000, 72_000, 150_000, 400_000];
const GAIN_RATIOS = [0.3, 0.6, 0.9];

const sampledRates: number[] = [];
function record(result: WithdrawalTax): WithdrawalTax {
  sampledRates.push(result.effectiveRate);
  return result;
}

// 1. Inversion: grossForNet round-trips through taxOnWithdrawal within $1.
for (const location of LOCATIONS) {
  for (const netTarget of NET_TARGETS) {
    for (const gainRatio of GAIN_RATIOS) {
      const solved = record(grossForNet(netTarget, location, gainRatio));
      const check = record(taxOnWithdrawal(solved.gross, location, gainRatio));
      const err = Math.abs(check.net - netTarget);
      assert(
        err <= 1,
        `Inversion failed for ${location.id} net=${netTarget} ratio=${gainRatio}: ` +
          `net=${check.net.toFixed(2)} err=${err.toFixed(4)}`
      );
    }
  }
}
console.log(
  "PASS inversion: grossForNet round-trips within $1 across all locations x targets x ratios"
);

// 2. Monotonicity: required gross is nondecreasing in the net target.
for (const location of LOCATIONS) {
  for (const gainRatio of GAIN_RATIOS) {
    let previous = -Infinity;
    for (const netTarget of NET_TARGETS) {
      const gross = grossForNet(netTarget, location, gainRatio).gross;
      assert(
        gross >= previous,
        `Monotonicity failed for ${location.id} ratio=${gainRatio}: ` +
          `gross=${gross.toFixed(2)} < previous=${previous.toFixed(2)} at net=${netTarget}`
      );
      previous = gross;
    }
  }
}
console.log(
  "PASS monotonicity: required gross is nondecreasing in the net target per location"
);

// 3. Digital nomad: 0% regime, so gross equals the net target exactly.
const nomad = getLocation("digital-nomad");
for (const netTarget of NET_TARGETS) {
  for (const gainRatio of GAIN_RATIOS) {
    const solved = grossForNet(netTarget, nomad, gainRatio);
    assert(
      solved.gross === netTarget,
      `Digital-nomad exactness failed net=${netTarget} ratio=${gainRatio}: gross=${solved.gross}`
    );
  }
}
console.log("PASS digital-nomad: gross equals the net target exactly (0% regime)");

// 4. Gain ratio 0 (all-basis withdrawal): US locations owe no tax.
const usLocations = [getLocation("nj-waterfront"), getLocation("austin-no-tax")];
for (const location of usLocations) {
  for (const gross of [50_000, 250_000, 900_000]) {
    const result = record(taxOnWithdrawal(gross, location, 0));
    assert(
      result.totalTax === 0 && result.net === gross,
      `Zero-gain-ratio tax failed for ${location.id} gross=${gross}: ` +
        `tax=${result.totalTax} net=${result.net}`
    );
  }
}
console.log("PASS gain-ratio-0: US locations owe no tax on an all-basis withdrawal");

// 5. Tokyo closed form: flat 20.315% on the gain portion of a large gross.
const tokyo = getLocation("tokyo-central");
const tokyoGross = 1_000_000;
const tokyoRatio = 0.8;
const tokyoResult = record(taxOnWithdrawal(tokyoGross, tokyo, tokyoRatio));
const expectedTokyoTax = tokyoGross * tokyoRatio * 0.20315;
assert(
  Math.abs(tokyoResult.totalTax - expectedTokyoTax) <= 1,
  `Tokyo closed-form failed: tax=${tokyoResult.totalTax}, expected=${expectedTokyoTax}`
);
console.log("PASS tokyo closed-form: flat 20.315% on the gain matches within $1");

// 6. State-tax drag: NJ needs a larger gross than Austin for identical net.
const njGross = record(grossForNet(150_000, getLocation("nj-waterfront"), 0.6)).gross;
const austinGross = record(grossForNet(150_000, getLocation("austin-no-tax"), 0.6)).gross;
assert(
  njGross > austinGross,
  `Expected NJ gross (${njGross.toFixed(2)}) > Austin gross (${austinGross.toFixed(2)}) for net=150000 ratio=0.6`
);
console.log(
  `PASS state-tax drag: NJ gross ${njGross.toFixed(0)} > Austin gross ${austinGross.toFixed(0)} for identical net`
);

// 7. NYC city-tax stack: NYC needs a larger gross than NJ for the identical net,
// because the NYC resident tax stacks on top of the shared federal + state layers.
const nycStackGross = record(grossForNet(150_000, getLocation("nyc-manhattan"), 0.6)).gross;
const njStackGross = record(grossForNet(150_000, getLocation("nj-waterfront"), 0.6)).gross;
assert(
  nycStackGross > njStackGross,
  `Expected NYC gross (${nycStackGross.toFixed(2)}) > NJ gross (${njStackGross.toFixed(2)}) for net=150000 ratio=0.6`
);
console.log(
  `PASS nyc city-tax stack: NYC gross ${nycStackGross.toFixed(0)} > NJ gross ${njStackGross.toFixed(0)} for identical net`
);

// 8. NYC closed form: taxOnWithdrawal on gross=300,000, ratio=0.6 (gain=180,000),
// hand-derived component by component.
//   Federal LTCG: base 180,000 - 16,100 = 163,900; 0% to 49,450, then
//                 (163,900 - 49,450) = 114,450 @ 15%            = 17,167.50
//   NIIT:         gain 180,000 < 200,000 threshold             =      0.00
//   NY State:     base 180,000 - 8,000 = 172,000; walk brackets
//                 8,500 @ 3.9% + 3,200 @ 4.4% + 2,200 @ 5.15%
//                 + 66,750 @ 5.4% + 91,350 @ 5.9%              =  9,579.75
//   NYC resident: base 172,000; walk brackets
//                 12,000 @ 3.078% + 13,000 @ 3.762%
//                 + 25,000 @ 3.819% + 122,000 @ 3.876%         =  6,541.89
//   Total                                                       = 33,289.14
const nyc = getLocation("nyc-manhattan");
const nycResult = record(taxOnWithdrawal(300_000, nyc, 0.6));
const expectedNycTax = 17_167.5 + 0 + 9_579.75 + 6_541.89; // = 33,289.14
assert(
  Math.abs(nycResult.totalTax - expectedNycTax) <= 0.01,
  `NYC closed-form failed: tax=${nycResult.totalTax.toFixed(2)}, expected=${expectedNycTax.toFixed(2)}`
);
console.log(
  `PASS nyc closed-form: federal + NIIT + NY state + NYC city = ${expectedNycTax.toFixed(2)} within $0.01`
);

// 9. Effective-rate bounds: every sampled rate lands in [0, 0.5).
const minRate = Math.min(...sampledRates);
const maxRate = Math.max(...sampledRates);
assert(
  minRate >= 0 && maxRate < 0.5,
  `Effective rates out of [0, 0.5): min=${minRate}, max=${maxRate}`
);
console.log(
  `PASS effective-rate bounds: all ${sampledRates.length} sampled rates in [0, 0.5) ` +
    `(min=${(minRate * 100).toFixed(2)}%, max=${(maxRate * 100).toFixed(2)}%)`
);

console.log("ALL CHECKS PASSED");
