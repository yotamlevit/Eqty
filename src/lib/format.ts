/**
 * Shared number formatting. Engine values are USD; formatting is the only
 * place display concerns live.
 */

/** Compact currency for axis ticks, KPIs, chart labels: $1.24M, $860K, $950. */
export function fmtUsdCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 10_000) return `${sign}$${Math.round(abs / 1_000)}K`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${Math.round(abs)}`;
}

/** Full currency for table cells: $1,234,567. */
export function fmtUsd(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

/** Percent with one decimal: 23.4%. Input is a fraction (0.234). */
export function fmtPct(fraction: number, decimals = 1): string {
  return `${(fraction * 100).toFixed(decimals)}%`;
}

/** Percent already expressed as a number (7.2 -> "7.2%"). */
export function fmtPctNum(pct: number, decimals = 1): string {
  return `${pct.toFixed(decimals)}%`;
}

/** Months -> "12.4 yr", "8 mo", or an em dash when unreachable. */
export function fmtMonthsAsYears(months: number | null): string {
  if (months === null) return "—";
  if (months <= 0) return "Now";
  if (months < 12) return `${months} mo`;
  return `${(months / 12).toFixed(1)} yr`;
}

/** Months from now -> the age reached, given a current age. */
export function ageAtMonths(currentAge: number, months: number): number {
  return currentAge + months / 12;
}
