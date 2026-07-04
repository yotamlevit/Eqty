import * as React from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PanelProps {
  title: string;
  /** Optional right-aligned slot in the header row (e.g. an action button). */
  action?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  children: React.ReactNode;
}

/**
 * Shared chrome for every EQTY panel: a bordered header row carrying the
 * section title, with an optional action slot, above a content area.
 */
export function Panel({
  title,
  action,
  className,
  contentClassName,
  children,
}: PanelProps) {
  return (
    <Card className={cn("gap-0 overflow-hidden py-0", className)}>
      <div className="flex min-h-11 items-center justify-between gap-4 border-b px-4 py-2.5">
        <h2 className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
          {title}
        </h2>
        {action ? <div className="flex items-center">{action}</div> : null}
      </div>
      <div className={cn("p-4", contentClassName)}>{children}</div>
    </Card>
  );
}
