"use client";

import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Mode } from "@/lib/types";

interface TopBarProps {
  mode: Mode;
  onModeChange: (m: Mode) => void;
  theme: "dark" | "light";
  onThemeChange: (t: "dark" | "light") => void;
}

export function TopBar({
  mode,
  onModeChange,
  theme,
  onThemeChange,
}: TopBarProps) {
  return (
    <header className="flex h-14 w-full items-center justify-between border-b px-4">
      <div className="flex items-center gap-4">
        <span className="font-mono text-base font-semibold tracking-[0.3em]">
          EQTY
        </span>
        <Separator orientation="vertical" className="h-6" />
        <span className="text-xs tracking-widest text-muted-foreground">
          PORTFOLIO / FIRE TERMINAL
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Toggle color theme"
          onClick={() => onThemeChange(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? <Sun /> : <Moon />}
        </Button>
        <Tabs value={mode} onValueChange={(v) => onModeChange(v as Mode)}>
          <TabsList>
            <TabsTrigger value="simple" className="text-xs tracking-[0.15em]">
              SIMPLE
            </TabsTrigger>
            <TabsTrigger value="complex" className="text-xs tracking-[0.15em]">
              PORTFOLIO
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </header>
  );
}
