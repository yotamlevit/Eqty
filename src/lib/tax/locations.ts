/**
 * Lifestyle-matrix location profiles.
 *
 * Single-filer, planning-grade 2026 approximations. Withdrawals are modeled as
 * long-term capital gains, and — because a decades-long retirement eventually
 * exhausts cost basis — the matrix taxes the FULL draw as gain (gainRatio = 1).
 * That yields the mature, steady-state effective rate rather than an optimistic
 * early-retirement snapshot.
 *
 * `netAnnualSpend` is a FIXED, researched figure per location: the cost of the
 * target premium single lifestyle there, net of tax. It is the matrix's source
 * of truth and does not scale with any global slider. Figures are deliberately
 * coarse: they exist to compare regimes, not to file a return. Per-location
 * caveats live in `notes`.
 */

import type { LocationProfile, TaxComponent } from "../types";

// US federal long-term capital gains, modeled at the REAL planning rate: 15%
// on the gain, 20% above the top-bracket threshold. The 0% bracket and the
// standard-deduction allowance are deliberately excluded — a high-net-worth
// retiree's gains stack on top of other income, so the low-bracket shelter is
// already used up. This is the rate you actually pay, not the sole-income best
// case that dilutes the headline 15% toward zero.
const usFederalLtcg: TaxComponent = {
  id: "us-federal-ltcg",
  label: "US Federal LTCG",
  kind: "progressive",
  base: "gain",
  brackets: [
    { upTo: 545_500, rate: 0.15 },
    { upTo: null, rate: 0.2 },
  ],
};

// Net Investment Income Tax: flat 3.8% on gain above the MAGI threshold.
const usNiit: TaxComponent = {
  id: "us-niit",
  label: "Net Investment Income Tax",
  kind: "flat",
  base: "gain",
  rate: 0.038,
  threshold: 200_000,
};

// New Jersey taxes capital gains as ordinary income; no preferential CG rate.
const njStateIncome: TaxComponent = {
  id: "nj-state-income",
  label: "NJ State Income Tax",
  kind: "progressive",
  base: "gain",
  brackets: [
    { upTo: 20_000, rate: 0.014 },
    { upTo: 35_000, rate: 0.0175 },
    { upTo: 40_000, rate: 0.035 },
    { upTo: 75_000, rate: 0.05525 },
    { upTo: 500_000, rate: 0.0637 },
    { upTo: 1_000_000, rate: 0.0897 },
    { upTo: null, rate: 0.1075 },
  ],
};

// New York State taxes capital gains as ordinary income. 2026 single schedule
// (mid brackets were cut in the FY2026 budget). Brackets are statutory taxable-
// income bounds, so they walk over the gain after the $8,000 NY standard
// deduction (modeled as an allowance), mirroring the federal treatment.
const nyStateIncome: TaxComponent = {
  id: "ny-state-income",
  label: "NY State Income Tax",
  kind: "progressive",
  base: "gain",
  allowance: 8_000,
  brackets: [
    { upTo: 8_500, rate: 0.039 },
    { upTo: 11_700, rate: 0.044 },
    { upTo: 13_900, rate: 0.0515 },
    { upTo: 80_650, rate: 0.054 },
    { upTo: 215_400, rate: 0.059 },
    { upTo: 1_077_550, rate: 0.0685 },
    { upTo: 5_000_000, rate: 0.0965 },
    { upTo: 25_000_000, rate: 0.103 },
    { upTo: null, rate: 0.109 },
  ],
};

// NYC resident income tax. The city computes on NY State taxable income, so it
// shares the $8,000 allowance; gains are taxed as ordinary income here too.
const nycResidentIncome: TaxComponent = {
  id: "nyc-resident-income",
  label: "NYC Resident Income Tax",
  kind: "progressive",
  base: "gain",
  allowance: 8_000,
  brackets: [
    { upTo: 12_000, rate: 0.03078 },
    { upTo: 25_000, rate: 0.03762 },
    { upTo: 50_000, rate: 0.03819 },
    { upTo: null, rate: 0.03876 },
  ],
};

// California taxes capital gains as ordinary income (no preferential CG rate).
// 2025 single schedule (planning-grade; thresholds inflation-indexed). The 1%
// Mental Health Services surcharge above $1M is omitted — draws fall well under.
const caStateIncome: TaxComponent = {
  id: "ca-state-income",
  label: "CA State Income Tax",
  kind: "progressive",
  base: "gain",
  brackets: [
    { upTo: 10_800, rate: 0.01 },
    { upTo: 25_500, rate: 0.02 },
    { upTo: 40_250, rate: 0.04 },
    { upTo: 55_900, rate: 0.06 },
    { upTo: 70_600, rate: 0.08 },
    { upTo: 360_700, rate: 0.093 },
    { upTo: 432_800, rate: 0.103 },
    { upTo: 721_300, rate: 0.113 },
    { upTo: null, rate: 0.123 },
  ],
};

export const LOCATIONS: LocationProfile[] = [
  {
    id: "nj-waterfront",
    label: "NJ Waterfront",
    city: "Jersey City",
    country: "United States",
    currency: "USD",
    netAnnualSpend: 150_000,
    blurb:
      "High-rise living on the Hudson waterfront with a short PATH commute into Manhattan.",
    lifestyle:
      "A luxury high-rise apartment on the Hudson with skyline views and a 15-minute PATH ride into Manhattan. Dining out several times a week, weekend city culture, a gym in the building, and 3–4 premium trips a year — a Manhattan life at a slight discount to living in Manhattan itself.",
    components: [usFederalLtcg, usNiit, njStateIncome],
    notes: [
      "Premium single lifestyle here ≈ $150,000/yr net — central luxury 1BR (~$54k), dining, ~3-4 premium trips/yr (~$27k), and full-price health cover (researched 2026, renter).",
      "Gains taxed as ordinary income at the state level; no NJ preferential CG rate.",
      "Federal LTCG modeled at a flat 15% (20% above the top bracket); the 0% bracket and standard-deduction shelter are excluded, reflecting gains stacked on other income.",
    ],
  },
  {
    id: "nyc-manhattan",
    label: "NYC Manhattan",
    city: "New York",
    country: "United States",
    currency: "USD",
    netAnnualSpend: 175_000,
    blurb:
      "Walk-everywhere Manhattan density, culture on every block, and nonstop city energy.",
    lifestyle:
      "A doorman one-bedroom in the middle of Manhattan — no car, subway and walking everywhere. Dinners out most nights, world-class culture on your block, and 3–4 premium international trips a year. The densest, highest-energy version of city life, and you pay for every square foot.",
    components: [usFederalLtcg, usNiit, nyStateIncome, nycResidentIncome],
    notes: [
      "Premium single lifestyle here ≈ $175,000/yr net — doorman 1BR (~$70k), heavy Manhattan dining, ~3-4 premium trips/yr, health cover (researched 2026, renter).",
      "Federal, NY State, and NYC resident income taxes stack; the city keeps taxing gains as ordinary income.",
      "NY State and NYC both compute on NY taxable income; the $8,000 state standard deduction is modeled as an allowance on both.",
    ],
  },
  {
    id: "tokyo-central",
    label: "Tokyo Central",
    city: "Tokyo",
    country: "Japan",
    currency: "JPY",
    netAnnualSpend: 105_000,
    blurb:
      "Dense, efficient city life among neon districts, rail links, and world-class cuisine.",
    lifestyle:
      "A sleek one-bedroom in Minato or Shibuya, spotless transit at your door, and some of the world's best food at every price point. Premium living that a weak yen keeps surprisingly affordable, a private gym, and 3–4 long-haul trips a year.",
    components: [
      {
        id: "jp-securities",
        label: "Securities Capital Gains",
        kind: "flat",
        base: "gain",
        // 15.315% national (incl. 2.1% reconstruction surtax) + 5% inhabitant.
        rate: 0.20315,
      },
    ],
    notes: [
      "Premium single lifestyle here ≈ $105,000/yr net — central 1LDK, dining, ~3-4 premium trips/yr; held down by the weak yen (researched 2026, renter).",
      "Separate self-assessment taxation for listed securities.",
      "National health insurance premiums for early retirees are excluded from the model.",
    ],
  },
  {
    id: "tlv-tech-hub",
    label: "Tel Aviv Tech-Hub",
    city: "Tel Aviv",
    country: "Israel",
    currency: "ILS",
    netAnnualSpend: 120_000,
    blurb:
      "Mediterranean beach mornings giving way to a restless startup and nightlife scene.",
    lifestyle:
      "A central apartment minutes from the Mediterranean — beach mornings, a restless café and nightlife scene, and a high-energy tech city. Expensive for food and daily life, but the sea, sun, and 3–4 premium trips a year balance the ledger.",
    components: [
      {
        id: "il-cgt",
        label: "Capital Gains Tax",
        kind: "flat",
        base: "gain",
        rate: 0.25,
      },
      {
        id: "il-surtax",
        label: "High-Income Surtax",
        kind: "flat",
        base: "gain",
        // 2026: 3% general "Mas yesef" plus a 2% surtax on capital-source
        // income above the high-income threshold (approx ILS 721,560) = 5%.
        rate: 0.05,
        threshold: 190_000,
      },
    ],
    notes: [
      "Premium single lifestyle here ≈ $120,000/yr net — central 1BR, an expensive city for food and utilities, ~3-4 premium trips/yr (researched 2026, renter).",
      "25% applies to real (CPI-adjusted) gains; modeled here on nominal gains, so conservative.",
      "5% surtax on gain above the high-income threshold (3% general plus 2% on capital income, 2026).",
    ],
  },
  {
    id: "digital-nomad",
    label: "Digital Nomad",
    city: "Roaming",
    country: "Territorial base",
    currency: "USD",
    netAnnualSpend: 185_000,
    blurb:
      "Premium roaming at the high-floor tier — a quarter in Tokyo, a stretch in Europe, months stateside, and a long spell in Tel Aviv.",
    lifestyle:
      "No fixed address: a quarter in Tokyo, a stretch in Europe, months in the US, a long spell in Tel Aviv — always in serviced apartments at the high-floor tier. Daily café work, constant discovery, and heavy travel between bases. Total freedom, at the highest price tag on this list.",
    components: [usFederalLtcg, usNiit],
    notes: [
      "Premium multi-city rotation (~3mo Tokyo, Europe, ~3mo US, ~4mo Tel Aviv) at the high-floor tier: serviced apartments (a premium over annual leases), daily cafés, and ~6-8 relocation flights/yr. ~$185,000/yr net — the most expensive lifestyle here (researched 2026).",
      "Short-term stays and constant flights carry a real logistics premium over a single-city annual lease, so this runs pricier than any one of its stops.",
      "As a US citizen you owe US federal LTCG (15%, 20% above the top bracket) plus NIIT on worldwide gains wherever you roam — the floor is ~15%, not 0%. No US state tax while a non-resident.",
      "Long stints in a high-tax country (e.g. ~4mo/yr in Israel) can trigger local tax residency and push the rate above the US floor; foreign tax credits offset US tax but not below the foreign rate.",
    ],
  },
  {
    id: "austin-no-tax",
    label: "Austin No-State-Tax",
    city: "Austin",
    country: "United States",
    currency: "USD",
    netAnnualSpend: 115_000,
    blurb:
      "Live-music venues, food trucks, and lakeside trails in a fast-growing tech capital.",
    lifestyle:
      "A central luxury apartment in a fast-growing Texas tech hub, a car for the lakes and hill country, live music and food trucks a few nights a week. No state income tax and lower daily costs than the coasts, plus 3–4 premium trips a year.",
    components: [usFederalLtcg, usNiit],
    notes: [
      "Premium single lifestyle here ≈ $115,000/yr net — central luxury 1BR, car ownership, ~3-4 premium trips/yr, full-price health cover (researched 2026, renter).",
      "Texas levies no personal income tax.",
      "Property and sales taxes show up in cost of living, not withdrawal tax.",
    ],
  },
  {
    id: "san-diego",
    label: "San Diego Coast",
    city: "San Diego",
    country: "United States",
    currency: "USD",
    netAnnualSpend: 140_000,
    blurb:
      "Near-perfect weather, Pacific beaches, and a laid-back coastal-California pace.",
    lifestyle:
      "A premium apartment near the coast — Little Italy or a La Jolla-adjacent high-rise — with near-perfect weather year-round, beaches, and a car for the freeways. California's high cost and income tax, softened by the climate and an easy outdoor life, plus 3–4 premium trips a year.",
    components: [usFederalLtcg, usNiit, caStateIncome],
    notes: [
      "Premium single lifestyle here ≈ $140,000/yr net — coastal central 1BR (~$50k), car ownership, ~3-4 premium trips/yr, full-price health cover (researched 2026, renter).",
      "California taxes capital gains as ordinary income; at this draw level most of the gain lands in the 9.3% state bracket.",
      "The 1% Mental Health Services surcharge on income above $1M is omitted (draws fall well below).",
    ],
  },
  {
    id: "lisbon-atlantic",
    label: "Lisbon Atlantic",
    city: "Lisbon",
    country: "Portugal",
    currency: "EUR",
    netAnnualSpend: 95_000,
    blurb:
      "Hillside tiled streets and Atlantic light, with trams and an easy Old-World cafe pace.",
    lifestyle:
      "A bright apartment on Lisbon's tiled hillsides — trams, Atlantic light, and an easy Old-World café pace. The most affordable base here: inexpensive dining, cheap private health, and 3–4 premium trips a year from a well-connected European hub.",
    components: [
      {
        id: "pt-cgt",
        label: "Investment Gains Tax",
        kind: "flat",
        base: "gain",
        rate: 0.28,
      },
    ],
    notes: [
      "Premium single lifestyle here ≈ $95,000/yr net — the cheapest base: central 1BR, inexpensive dining, cheap private health, ~3-4 premium trips/yr (researched 2026, renter).",
      "Standard 28% autonomous rate on investment gains.",
      "Optional aggregation and long-hold exclusions are ignored.",
    ],
  },
];

/** Look up a location by id, falling back to the first profile. */
export function getLocation(id: string): LocationProfile {
  return LOCATIONS.find((location) => location.id === id) ?? LOCATIONS[0];
}
