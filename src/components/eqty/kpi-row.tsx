import * as React from "react";

import { Card } from "@/components/ui/card";
import { StatTile, type StatTileProps } from "./stat-tile";

interface KpiRowProps {
  items: StatTileProps[];
}

/**
 * A single bordered card holding a row of stat tiles: two columns on mobile,
 * one column per item on desktop, with 1px dividers between tiles.
 */
export function KpiRow({ items }: KpiRowProps) {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div
        className="grid grid-cols-2 md:divide-x md:[grid-template-columns:repeat(var(--kpi-cols),minmax(0,1fr))]"
        style={{ "--kpi-cols": items.length } as React.CSSProperties}
      >
        {items.map((item, i) => (
          <StatTile key={i} {...item} />
        ))}
      </div>
    </Card>
  );
}
