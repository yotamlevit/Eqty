export interface StatTileProps {
  label: string;
  value: string;
  sub?: string;
  /** Already signed by the caller (e.g. "+4.2%"). */
  delta?: string;
}

export function StatTile({ label, value, sub, delta }: StatTileProps) {
  return (
    <div className="flex flex-col gap-1.5 p-4">
      <span className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </span>
      <span className="text-2xl font-semibold leading-none">{value}</span>
      {sub || delta ? (
        <div className="flex items-baseline gap-2">
          {sub ? (
            <span className="text-xs text-muted-foreground">{sub}</span>
          ) : null}
          {delta ? (
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {delta}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
