"use client";

import { useCallback, useEffect, useState } from "react";

export type Appearance = "dark" | "light";

const THEME_KEY = "eqty-theme";

/**
 * Theme state for the single-page app. The blocking script in layout.tsx has
 * already applied the persisted theme to <html> before first paint; this hook
 * reads that DOM truth after mount (so SSR markup stays deterministic) and
 * owns subsequent toggles.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Appearance>("dark");

  useEffect(() => {
    setThemeState(
      document.documentElement.classList.contains("dark") ? "dark" : "light"
    );
  }, []);

  const setTheme = useCallback((t: Appearance) => {
    setThemeState(t);
    document.documentElement.classList.toggle("dark", t === "dark");
    try {
      window.localStorage.setItem(THEME_KEY, t);
    } catch {
      // Storage unavailable: theme still applies for this visit.
    }
  }, []);

  return { theme, setTheme };
}
