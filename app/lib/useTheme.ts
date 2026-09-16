"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  type ThemeMode,
  getStoredTheme,
  setStoredTheme,
  applyTheme,
  resolveTheme,
} from "./theme";

const THEME_EVENT = "sevel:theme-changed";

function subscribe(cb: () => void) {
  window.addEventListener(THEME_EVENT, cb);
  const mq = window.matchMedia("(prefers-color-scheme: light)");
  mq.addEventListener("change", cb);
  return () => {
    window.removeEventListener(THEME_EVENT, cb);
    mq.removeEventListener("change", cb);
  };
}

function getSnapshot(): ThemeMode {
  return getStoredTheme();
}

function getServerSnapshot(): ThemeMode {
  return "dark";
}

export function useTheme() {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const resolved = useMemo(() => resolveTheme(mode), [mode]);

  useEffect(() => {
    applyTheme(mode);
  }, [mode]);

  useEffect(() => {
    if (mode !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const handler = () => applyTheme("auto");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode]);

  const setTheme = useCallback((next: ThemeMode) => {
    setStoredTheme(next);
    applyTheme(next);
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  return { mode, resolved, setTheme };
}
