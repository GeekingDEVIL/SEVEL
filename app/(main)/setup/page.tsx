"use client";

import { useState, useEffect, useCallback } from "react";
import { Settings, Palette, Ruler, Droplets, Building2, Home, Briefcase, Plane, ChevronRight, Check, Compass, Zap, LogOut, Sun, Moon, Smartphone, Monitor } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/AuthProvider";
import { ACCENT_PRESETS, applyAccent, type AccentKey, type ThemeMode } from "../../lib/theme";
import { useTheme } from "../../lib/useTheme";
import { broadcastUnitChange } from "../../lib/useUnits";
import { broadcastEquipmentChange } from "../../lib/useEquipment";
import { useModules } from "../../lib/useModules";
import { MODULE_REGISTRY, OPTIONAL_MODULES, type ModuleKey } from "../../lib/modules";
import { staggerContainer, staggerItem } from "../../lib/motion";
import SwipeNav from "../../components/ui/swipe-nav";
import { getYouSections } from "../../lib/navPills";
import CubeLoader from "../../components/ui/cube-loader";
import OnboardingTooltip from "../../components/ui/onboarding-tooltip";

const GYM_PROFILES = [
  { value: "commercial_gym", label: "Commercial Gym", desc: "Full access", icon: Building2, equipment: ["Barbell", "Dumbbell", "Kettlebell", "Cable", "Machine", "Pull-up Bar", "Resistance Band", "Bench", "Squat Rack", "Smith Machine", "Dip Station", "EZ Curl Bar", "Leg Press", "Lat Pulldown", "Cable Crossover"] },
  { value: "home_gym", label: "Home Gym", desc: "Free weights + basics", icon: Home, equipment: ["Barbell", "Dumbbell", "Kettlebell", "Resistance Band", "Pull-up Bar", "Bench", "Squat Rack", "EZ Curl Bar"] },
  { value: "small_gym", label: "Small Gym", desc: "Limited machines", icon: Briefcase, equipment: ["Barbell", "Dumbbell", "Kettlebell", "Cable", "Machine", "Bench", "Squat Rack", "Pull-up Bar"] },
  { value: "traveling", label: "Traveling", desc: "Bodyweight + bands", icon: Plane, equipment: ["Resistance Band"] },
];

const WATER_GOALS = [
  { ml: 2000, label: "2L" },
  { ml: 2500, label: "2.5L" },
  { ml: 3000, label: "3L" },
  { ml: 3500, label: "3.5L" },
  { ml: 4000, label: "4L" },
];

export default function SetupPage() {
  const { user, profile } = useAuth();
  const { enabledKeys, toggleModule } = useModules();
  const { mode: themeMode, setTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [accent, setAccent] = useState<AccentKey>("cyan");
  const [unit, setUnit] = useState<"metric" | "imperial">("metric");
  const [gymProfile, setGymProfile] = useState<string | null>(null);
  const [waterGoal, setWaterGoal] = useState(3000);

  const loadSettings = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("unit_preference, avatar_color, gym_type, equipment_access")
      .eq("id", user.id)
      .single();
    if (data) {
      setUnit((data.unit_preference as "metric" | "imperial") ?? "metric");
      setAccent((data.avatar_color as AccentKey) ?? "cyan");
      setGymProfile(data.gym_type ?? null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  async function saveUnit(next: "metric" | "imperial") {
    if (!user) return;
    setUnit(next);
    await supabase.from("profiles").update({ unit_preference: next }).eq("id", user.id);
    broadcastUnitChange(next);
    flash();
  }

  async function saveAccent(key: AccentKey) {
    if (!user) return;
    setAccent(key);
    applyAccent(key);
    await supabase.from("profiles").update({ avatar_color: key }).eq("id", user.id);
    flash();
  }

  async function saveGymProfile(value: string) {
    if (!user) return;
    const gp = GYM_PROFILES.find((g) => g.value === value);
    if (!gp) return;
    setGymProfile(value);
    await supabase.from("profiles").update({ equipment_access: gp.equipment, gym_type: value }).eq("id", user.id);
    broadcastEquipmentChange(gp.equipment, value);
    flash();
  }

  function flash() {
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <SwipeNav sections={getYouSections(enabledKeys)} />
        <div className="flex items-center justify-center py-20"><CubeLoader /></div>
      </div>
    );
  }

  const topModules = OPTIONAL_MODULES.filter((m) => m.phase <= 2 && !m.sexGate).slice(0, 8);

  return (
    <div className="flex flex-col min-h-screen pb-28">
      <SwipeNav sections={getYouSections(enabledKeys)} />

      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="px-4 space-y-5">
        {/* Header */}
        <motion.div variants={staggerItem} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight">My Setup</h1>
            <p className="text-xs text-[var(--fg-40)] font-mono mt-0.5">Customize your experience</p>
          </div>
          {saved && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 text-emerald-400 text-xs font-mono"
            >
              <Check size={14} /> Saved
            </motion.div>
          )}
        </motion.div>

        {/* Theme Mode */}
        <motion.div variants={staggerItem} className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Monitor size={16} className="text-[rgb(var(--accent-rgb))]" />
            <h2 className="text-xs font-mono uppercase tracking-widest text-[var(--fg-50)]">Theme</h2>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {([
              { key: "dark" as ThemeMode, label: "Dark", icon: Moon, preview: "#050914" },
              { key: "oled" as ThemeMode, label: "OLED", icon: Moon, preview: "#000000" },
              { key: "daylight" as ThemeMode, label: "Daylight", icon: Sun, preview: "#f5f3ee" },
              { key: "auto" as ThemeMode, label: "Auto", icon: Smartphone, preview: "linear-gradient(135deg, #050914 50%, #f5f3ee 50%)" },
            ]).map((t) => {
              const Icon = t.icon;
              const active = themeMode === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTheme(t.key)}
                  className={`relative flex flex-col items-center gap-1.5 py-2.5 rounded-lg border transition ${
                    active
                      ? "border-[rgb(var(--accent-rgb)/0.5)] bg-[rgb(var(--accent-rgb)/0.08)]"
                      : "border-[var(--fg-05)] hover:border-[var(--fg-10)]"
                  }`}
                >
                  <div
                    className="w-6 h-6 rounded-full border border-[var(--fg-15)]"
                    style={{ background: t.preview }}
                  />
                  <span className="text-[9px] font-mono text-[var(--fg-50)]">{t.label}</span>
                  {active && (
                    <div className="absolute top-1 right-1">
                      <Check size={10} className="text-[rgb(var(--accent-rgb))]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Accent Theme */}
        <motion.div variants={staggerItem} className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Palette size={16} className="text-[rgb(var(--accent-rgb))]" />
            <h2 className="text-xs font-mono uppercase tracking-widest text-[var(--fg-50)]">Accent Color</h2>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {ACCENT_PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => saveAccent(p.key)}
                className={`relative flex flex-col items-center gap-1.5 py-2.5 rounded-lg border transition ${
                  accent === p.key
                    ? "border-[rgb(var(--accent-rgb)/0.5)] bg-[rgb(var(--accent-rgb)/0.08)]"
                    : "border-[var(--fg-05)] hover:border-[var(--fg-10)]"
                }`}
              >
                <div className="w-5 h-5 rounded-full" style={{ background: `rgb(${p.rgb})` }} />
                <span className="text-[9px] font-mono text-[var(--fg-50)]">{p.label}</span>
                {accent === p.key && (
                  <div className="absolute top-1 right-1">
                    <Check size={10} className="text-[rgb(var(--accent-rgb))]" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Units */}
        <motion.div variants={staggerItem} className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Ruler size={16} className="text-[rgb(var(--accent-rgb))]" />
            <h2 className="text-xs font-mono uppercase tracking-widest text-[var(--fg-50)]">Units</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(["metric", "imperial"] as const).map((u) => (
              <button
                key={u}
                onClick={() => saveUnit(u)}
                className={`py-2.5 rounded-lg border text-sm font-mono transition ${
                  unit === u
                    ? "border-[rgb(var(--accent-rgb)/0.5)] bg-[rgb(var(--accent-rgb)/0.08)] text-[var(--text-primary)]"
                    : "border-[var(--fg-05)] text-[var(--fg-40)] hover:border-[var(--fg-10)]"
                }`}
              >
                {u === "metric" ? "Metric (kg/cm)" : "Imperial (lb/in)"}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Gym Profile */}
        <motion.div variants={staggerItem} className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Building2 size={16} className="text-[rgb(var(--accent-rgb))]" />
            <h2 className="text-xs font-mono uppercase tracking-widest text-[var(--fg-50)]">Gym Profile</h2>
          </div>
          <div className="relative">
            <OnboardingTooltip id="setup-gym" message="Pick your gym type to filter exercises" position="top" />
            <div className="space-y-2">
              {GYM_PROFILES.map((gp) => {
                const Icon = gp.icon;
                const active = gymProfile === gp.value;
                return (
                  <button
                    key={gp.value}
                    onClick={() => saveGymProfile(gp.value)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition text-left ${
                      active
                        ? "border-[rgb(var(--accent-rgb)/0.5)] bg-[rgb(var(--accent-rgb)/0.08)]"
                        : "border-[var(--fg-05)] hover:border-[var(--fg-10)]"
                    }`}
                  >
                    <Icon size={18} className={active ? "text-[rgb(var(--accent-rgb))]" : "text-[var(--fg-30)]"} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${active ? "text-[var(--text-primary)]" : "text-[var(--fg-60)]"}`}>{gp.label}</p>
                      <p className="text-[10px] font-mono text-[var(--fg-30)]">{gp.desc} — {gp.equipment.length} items</p>
                    </div>
                    {active && <Check size={14} className="text-[rgb(var(--accent-rgb))] shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Quick Module Toggles */}
        <motion.div variants={staggerItem} className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-[rgb(var(--accent-rgb))]" />
              <h2 className="text-xs font-mono uppercase tracking-widest text-[var(--fg-50)]">Modules</h2>
            </div>
            <a href="/discover" className="text-[10px] font-mono text-[rgb(var(--accent-rgb))] flex items-center gap-0.5">
              All modules <ChevronRight size={10} />
            </a>
          </div>
          <div className="space-y-1.5">
            {topModules.map((mod) => {
              const Icon = mod.icon;
              const enabled = enabledKeys.includes(mod.key);
              return (
                <button
                  key={mod.key}
                  onClick={() => toggleModule(mod.key)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-[var(--fg-02)] transition text-left"
                >
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center"
                    style={{ background: `rgb(${mod.colorRgb} / ${enabled ? 0.15 : 0.05})` }}
                  >
                    <Icon size={14} style={{ color: enabled ? `rgb(${mod.colorRgb})` : "var(--fg-20)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${enabled ? "text-[var(--text-primary)]" : "text-[var(--fg-40)]"}`}>{mod.name}</p>
                  </div>
                  <div
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                      enabled ? "bg-[rgb(var(--accent-rgb))]" : "bg-[var(--fg-10)]"
                    }`}
                  >
                    <motion.div
                      className="w-4 h-4 rounded-full bg-white shadow-sm"
                      animate={{ x: enabled ? 16 : 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Sign Out */}
        <motion.div variants={staggerItem}>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-500/10 text-red-400/60 hover:text-red-400 hover:border-red-500/20 transition text-sm font-mono"
          >
            <LogOut size={14} /> Sign Out
          </button>
        </motion.div>

        <motion.div variants={staggerItem} className="text-center py-2">
          <p className="text-[9px] font-mono text-[var(--fg-15)]">SEVEL v0.3.0</p>
        </motion.div>
      </motion.div>
    </div>
  );
}
