// ─── Theme Modes ────────────────────────────────────────────────────────────

export type ThemeMode = "dark" | "oled" | "daylight" | "auto";

const THEME_KEY = "sevel_theme";

export function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "dark";
  return (localStorage.getItem(THEME_KEY) as ThemeMode) || "dark";
}

export function setStoredTheme(mode: ThemeMode) {
  localStorage.setItem(THEME_KEY, mode);
}

export function resolveTheme(mode: ThemeMode): "dark" | "oled" | "daylight" {
  if (mode !== "auto") return mode;
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "daylight" : "dark";
}

export function applyTheme(mode: ThemeMode) {
  const resolved = resolveTheme(mode);
  document.documentElement.setAttribute("data-theme", resolved);
}

// ─── Accent Colors ──────────────────────────────────────────────────────────

export type AccentKey = "cyan" | "red" | "orange" | "violet" | "emerald" | "pink" | "blue" | "amber";

export type AccentPreset = { key: AccentKey; label: string; rgb: string; lightRgb: string };

// rgb/lightRgb are space-separated "R G B" (Tailwind's -400 / -200 shades) so they can be
// dropped into rgb(var(--accent-rgb) / <alpha>) for both CSS custom properties and inline styles.
export const ACCENT_PRESETS: AccentPreset[] = [
  { key: "cyan", label: "Cyan", rgb: "34 211 238", lightRgb: "165 243 252" },
  { key: "red", label: "Red", rgb: "248 113 113", lightRgb: "254 202 202" },
  { key: "orange", label: "Orange", rgb: "251 146 60", lightRgb: "254 215 170" },
  { key: "violet", label: "Violet", rgb: "167 139 250", lightRgb: "221 214 254" },
  { key: "emerald", label: "Emerald", rgb: "52 211 153", lightRgb: "167 243 208" },
  { key: "pink", label: "Pink", rgb: "244 114 182", lightRgb: "251 207 232" },
  { key: "blue", label: "Blue", rgb: "96 165 250", lightRgb: "191 219 254" },
  { key: "amber", label: "Amber", rgb: "251 191 36", lightRgb: "253 230 138" },
];

export const DEFAULT_ACCENT: AccentKey = "cyan";

export function getAccentPreset(key: string | null | undefined): AccentPreset {
  return ACCENT_PRESETS.find((p) => p.key === key) ?? ACCENT_PRESETS[0];
}

export function applyAccent(key: string | null | undefined) {
  const preset = getAccentPreset(key);
  document.documentElement.style.setProperty("--accent-rgb", preset.rgb);
  document.documentElement.style.setProperty("--accent-light-rgb", preset.lightRgb);
}
