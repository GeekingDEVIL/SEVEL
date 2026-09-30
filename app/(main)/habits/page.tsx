"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Flame, Plus, Check, Trash2, Star, Sparkles, Sun, Moon, Clock,
  Link, Dumbbell, Droplets, Scale, ChevronLeft, ChevronRight,
  X, Shield, Zap, Trophy, Target, TrendingUp, AlertTriangle,
  Gift, SkipForward, Edit3, Calendar, Ban, Award, Scroll, Share2,
} from "lucide-react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/AuthProvider";
import { useModules } from "../../lib/useModules";
import CubeLoader from "../../components/ui/cube-loader";
import { staggerContainer, staggerItem } from "../../lib/motion";
import { localDateStr } from "../../lib/dateUtils";
import {
  type Habit, type HabitContract, type LootItem, type DailyQuest, type HabitInsight, type LootDrop, type EvolutionTier,
  MILESTONES, EVOLUTION_STYLES, getEvolutionTier, isHabitScheduledForDay, getScheduleLabel,
  calculateMomentum, calculateStreak, getComboMultiplier, getPerfectWeekMultiplier, countPerfectWeeks,
  getDailyQuests, rollLootDrop, getReviveCost, getPrestigeMultiplier, canPrestige,
  getAuraLevel, AURA_STYLES, generateInsights, generateCorrelationInsights,
  generateMilestoneCard, generateMonthlyCard,
} from "../../lib/habitEngine";
import { shareCardImage } from "../../lib/shareCard";

// ─── Constants ──────────────────────────────────────────────────────────────

const AUTO_SOURCES = [
  { key: "workout_complete", label: "Workout", icon: Dumbbell, desc: "Auto-completes when you finish a workout" },
  { key: "water_goal", label: "Water Goal", icon: Droplets, desc: "Auto-completes when you hit your daily water goal" },
  { key: "weight_logged", label: "Weight Log", icon: Scale, desc: "Auto-completes when you log your weight" },
] as const;

const ROUTINES = [
  { key: "anytime", label: "Anytime", icon: Clock },
  { key: "morning", label: "Morning", icon: Sun },
  { key: "evening", label: "Evening", icon: Moon },
] as const;

const FREQUENCIES = [
  { key: "daily", label: "Daily" },
  { key: "weekdays", label: "Weekdays" },
  { key: "weekends", label: "Weekends" },
  { key: "custom", label: "Custom" },
  { key: "x_per_week", label: "X/Week" },
] as const;

const DAY_NAMES = ["S", "M", "T", "W", "T", "F", "S"];
const FULL_DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const HABIT_ICONS = ["💪", "🧘", "📖", "🏃", "💧", "🧠", "😴", "🥗", "🎯", "✅", "⏰", "🧹", "🚫", "🍎", "📵", "🧊"];

const DIFFICULTIES = [
  { key: "easy", label: "Easy", xp: 5, color: "16 185 129" },
  { key: "medium", label: "Medium", xp: 10, color: "59 130 246" },
  { key: "hard", label: "Hard", xp: 20, color: "239 68 68" },
] as const;

const SUGGESTED_HABITS: { name: string; icon: string; difficulty: string; auto_source?: string; is_negative?: boolean }[] = [
  { name: "Daily Workout", icon: "💪", difficulty: "hard", auto_source: "workout_complete" },
  { name: "Hit Water Goal", icon: "💧", difficulty: "easy", auto_source: "water_goal" },
  { name: "Log Weight", icon: "⚖️", difficulty: "easy", auto_source: "weight_logged" },
  { name: "10 Min Stretch", icon: "🧘", difficulty: "easy" },
  { name: "8 Hours Sleep", icon: "😴", difficulty: "medium" },
  { name: "No Junk Food", icon: "🚫", difficulty: "hard", is_negative: true },
  { name: "No Doomscrolling", icon: "📵", difficulty: "medium", is_negative: true },
  { name: "Read 20 Pages", icon: "📖", difficulty: "medium" },
];

const SKIP_REASONS = [
  { key: "sick", label: "Sick", icon: "🤒" },
  { key: "travel", label: "Travel", icon: "✈️" },
  { key: "rest_day", label: "Rest Day", icon: "😴" },
  { key: "injury", label: "Injury", icon: "🩹" },
  { key: "other", label: "Other", icon: "💬" },
] as const;

type Completion = { habit_id: string; completed_date: string; note?: string };
type Skip = { habit_id: string; skip_date: string; reason: string };

// ─── Flame component ────────────────────────────────────────────────────────

function StreakFlame({ streak, size = 20 }: { streak: number; size?: number }) {
  if (streak === 0) return null;
  const intensity = streak >= 100 ? 4 : streak >= 30 ? 3 : streak >= 7 ? 2 : 1;
  const outerColor = intensity >= 4 ? "#e91e63" : intensity >= 3 ? "#f44336" : intensity >= 2 ? "#ff5722" : "#ff6b35";
  const innerColor = intensity >= 3 ? "#ff9800" : "#fbbf24";
  const coreColor = intensity >= 2 ? "#fff176" : "#ffe082";
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size * 1.3 }}>
      <motion.svg
        viewBox="0 0 24 32" width={size} height={size * 1.3}
        animate={{ scaleY: [1, 1.08, 1], scaleX: [1, 0.95, 1] }}
        transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: "bottom center" }}
      >
        <defs>
          <linearGradient id={`flame-outer-${streak}`} x1="0.5" y1="1" x2="0.5" y2="0">
            <stop offset="0%" stopColor={outerColor} />
            <stop offset="100%" stopColor={outerColor} stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id={`flame-inner-${streak}`} x1="0.5" y1="1" x2="0.5" y2="0">
            <stop offset="0%" stopColor={innerColor} />
            <stop offset="100%" stopColor={innerColor} stopOpacity="0.4" />
          </linearGradient>
          <filter id={`flame-glow-${streak}`}>
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {/* Outer flame */}
        <motion.path
          d="M12 1C12 1 4 10 4 18C4 23 7.5 28 12 30C16.5 28 20 23 20 18C20 10 12 1 12 1Z"
          fill={`url(#flame-outer-${streak})`}
          filter={`url(#flame-glow-${streak})`}
          animate={{ d: [
            "M12 1C12 1 4 10 4 18C4 23 7.5 28 12 30C16.5 28 20 23 20 18C20 10 12 1 12 1Z",
            "M12 2C12 2 5 11 5 18C5 22 8 27 12 29C16 27 19 22 19 18C19 11 12 2 12 2Z",
            "M12 1C12 1 4 10 4 18C4 23 7.5 28 12 30C16.5 28 20 23 20 18C20 10 12 1 12 1Z",
          ] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Inner flame */}
        <motion.path
          d="M12 10C12 10 8 16 8 20C8 23 9.8 26 12 27C14.2 26 16 23 16 20C16 16 12 10 12 10Z"
          fill={`url(#flame-inner-${streak})`}
          animate={{ d: [
            "M12 10C12 10 8 16 8 20C8 23 9.8 26 12 27C14.2 26 16 23 16 20C16 16 12 10 12 10Z",
            "M12 12C12 12 9 17 9 20C9 22 10 25 12 26C14 25 15 22 15 20C15 17 12 12 12 12Z",
            "M12 10C12 10 8 16 8 20C8 23 9.8 26 12 27C14.2 26 16 23 16 20C16 16 12 10 12 10Z",
          ] }}
          transition={{ duration: 1, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
        />
        {/* Core */}
        <motion.ellipse
          cx="12" cy="23" rx="2.5" ry="3.5"
          fill={coreColor} opacity="0.8"
          animate={{ ry: [3.5, 2.8, 3.5], opacity: [0.8, 0.6, 0.8] }}
          transition={{ duration: 0.7, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.svg>
      <span className="absolute text-[8px] font-black text-[var(--text-primary)] drop-shadow-lg" style={{ bottom: size * 0.25 }}>
        {streak}
      </span>
    </div>
  );
}

// ─── Concentric Rings (Apple Watch style) ───────────────────────────────────

const RING_COLORS = [
  { from: "#ef4444", to: "#f87171" },   // red (move)
  { from: "#10b981", to: "#34d399" },   // green (exercise)
  { from: "#3b82f6", to: "#60a5fa" },   // blue (stand)
  { from: "#f59e0b", to: "#fbbf24" },   // amber
  { from: "#a855f7", to: "#c084fc" },   // purple
  { from: "#ec4899", to: "#f472b6" },   // pink
  { from: "#06b6d4", to: "#22d3ee" },   // cyan
  { from: "#f97316", to: "#fb923c" },   // orange
];

function triggerHaptic(style: "light" | "medium" | "heavy" | "success" = "light") {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    const patterns: Record<string, number[]> = {
      light: [10], medium: [20], heavy: [30, 10, 30], success: [10, 30, 10, 30, 50],
    };
    navigator.vibrate(patterns[style] ?? [10]);
  }
}

function AnimatedPercent({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    setDisplay(0);
    let cancelled = false;
    let raf: number;
    const timeout = setTimeout(() => {
      const duration = 1500;
      const start = performance.now();
      function tick(now: number) {
        if (cancelled) return;
        const t = Math.min((now - start) / duration, 1);
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        setDisplay(Math.round(value * eased));
        if (t < 1) raf = requestAnimationFrame(tick);
      }
      raf = requestAnimationFrame(tick);
    }, 500);
    return () => { cancelled = true; clearTimeout(timeout); cancelAnimationFrame(raf); };
  }, [value]);
  return (
    <span className="text-2xl font-black font-mono text-[var(--fg-80)]">
      {display}%
    </span>
  );
}

function SegmentRing({ segments, size, strokeW, className }: {
  segments: { done: boolean; color: { from: string; to: string } }[];
  size: number; strokeW: number; className?: string;
}) {
  const center = size / 2;
  const r = (size / 2) - (strokeW / 2) - 2;
  const n = segments.length;
  const gapAngle = n <= 3 ? 8 : n <= 6 ? 6 : 4;
  const segAngle = (360 - gapAngle * n) / n;

  function arcPath(startDeg: number, endDeg: number) {
    const s = (startDeg - 90) * Math.PI / 180;
    const e = (endDeg - 90) * Math.PI / 180;
    const x1 = center + r * Math.cos(s);
    const y1 = center + r * Math.sin(s);
    const x2 = center + r * Math.cos(e);
    const y2 = center + r * Math.sin(e);
    const large = (endDeg - startDeg) > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  }

  const uid = useMemo(() => Math.random().toString(36).slice(2, 6), []);

  return (
    <svg width={size} height={size} className={className}>
      <defs>
        {segments.map((seg, i) => (
          <linearGradient key={`sg-${uid}-${i}`} id={`sg-${uid}-${i}`}
            x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={seg.color.from} />
            <stop offset="100%" stopColor={seg.color.to} />
          </linearGradient>
        ))}
        <filter id={`glow-${uid}`}>
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {segments.map((seg, i) => {
        const startDeg = i * (segAngle + gapAngle);
        const endDeg = startDeg + segAngle;
        const d = arcPath(startDeg, endDeg);
        return (
          <g key={i}>
            {/* Track */}
            <path d={d} fill="none" stroke={`${seg.color.from}20`}
              strokeWidth={strokeW} strokeLinecap="round" />
            {/* Glow layer — draws behind, wider, blurred */}
            {seg.done && (
              <motion.path d={d} fill="none"
                stroke={seg.color.from} strokeWidth={strokeW + 4} strokeLinecap="round"
                filter={`url(#glow-${uid})`}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.3 }}
                transition={{ duration: 1, delay: 0.3 + i * 0.08, ease: "easeOut" }}
              />
            )}
            {/* Foreground segment */}
            <motion.path d={d} fill="none"
              stroke={seg.done ? `url(#sg-${uid}-${i})` : "transparent"}
              strokeWidth={strokeW} strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: seg.done ? 1 : 0 }}
              transition={{
                duration: 0.8,
                delay: i * 0.08,
                ease: [0.34, 1.56, 0.64, 1], // spring overshoot
              }}
            />
          </g>
        );
      })}
    </svg>
  );
}

function DailyRings({ habits, completionSet, today }: { habits: Habit[]; completionSet: Set<string>; today: string }) {
  const scheduled = habits.filter((h) => isHabitScheduledForDay(h, new Date()));
  const completed = scheduled.filter((h) => completionSet.has(`${h.id}:${today}`)).length;
  const total = scheduled.length;
  const allDone = total > 0 && completed === total;

  const segments = scheduled.map((h, i) => ({
    done: completionSet.has(`${h.id}:${today}`),
    color: RING_COLORS[i % RING_COLORS.length],
  }));

  return (
    <div className="rounded-2xl border border-[var(--fg-06)] bg-gradient-to-b from-[var(--fg-03)] to-transparent relative overflow-hidden">
      <AnimatePresence>
        {allDone && (
          <motion.div className="absolute inset-0 pointer-events-none z-0"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-emerald-500/[0.08] blur-3xl" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 flex items-center gap-4 p-4">
        {/* Segment ring */}
        <div className="relative shrink-0" style={{ width: 180, height: 180 }}>
          <SegmentRing segments={segments} size={180} strokeW={16} />
          {/* Center — animated percentage or checkmark */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {allDone ? (
              <motion.div initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.5 }}>
                <Check size={32} className="text-emerald-400/80" strokeWidth={3} />
              </motion.div>
            ) : (
              <AnimatedPercent value={total > 0 ? Math.round((completed / total) * 100) : 0} />
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {allDone && (
            <motion.p className="text-[10px] font-mono font-bold text-emerald-400/80 mb-1"
              initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}>
              PERFECT DAY!
            </motion.p>
          )}
          {scheduled.slice(0, 6).map((h, i) => {
            const done = completionSet.has(`${h.id}:${today}`);
            const c = RING_COLORS[i % RING_COLORS.length];
            return (
              <div key={h.id} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: done ? c.from : `${c.from}33`, boxShadow: done ? `0 0 6px ${c.from}40` : "none" }} />
                <span className={`text-[11px] truncate ${done ? "text-[var(--fg-60)] line-through" : "text-[var(--fg-40)]"}`}>{h.name}</span>
                {done && <Check size={10} className="text-emerald-400/60 shrink-0 ml-auto" />}
              </div>
            );
          })}
          {scheduled.length > 6 && (
            <p className="text-[9px] font-mono text-[var(--fg-15)]">+{scheduled.length - 6} more</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Month calendar ─────────────────────────────────────────────────────────

function MonthCalendar({ habits, completionSet, skipSet, username }: { habits: Habit[]; completionSet: Set<string>; skipSet: Set<string>; username?: string }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const now = new Date();
  const viewDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();
  const monthName = viewDate.toLocaleString("default", { month: "long" });
  const todayStr = localDateStr(now);

  const cells: (number | null)[] = Array(firstDow).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="rounded-xl border border-[var(--fg-06)] bg-[var(--fg-02)] p-4">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setMonthOffset((p) => p - 1)} className="p-1 text-[var(--fg-30)] hover:text-[var(--fg-60)]"><ChevronLeft size={16} /></button>
        <div className="flex items-center gap-2">
          <p className="text-xs font-mono font-bold text-[var(--fg-60)]">{monthName} {year}</p>
          <button
            onClick={() => {
              const card = generateMonthlyCard(habits, completionSet, month, year);
              shareCardImage(card, username);
            }}
            className="p-1 text-[var(--fg-20)] hover:text-[rgb(var(--accent-rgb))] transition-colors"
            title="Share month summary"
          >
            <Share2 size={12} />
          </button>
        </div>
        <button onClick={() => monthOffset < 0 ? setMonthOffset((p) => p + 1) : null} className={`p-1 ${monthOffset < 0 ? "text-[var(--fg-30)] hover:text-[var(--fg-60)]" : "text-[var(--fg-10)]"}`}><ChevronRight size={16} /></button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {DAY_NAMES.map((d, i) => (
          <div key={i} className="text-center text-[8px] font-mono text-[var(--fg-20)] pb-1">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const date = new Date(year, month, day);
          const scheduled = habits.filter((h) => isHabitScheduledForDay(h, date));
          const completed = scheduled.filter((h) => completionSet.has(`${h.id}:${dateStr}`));
          const skipped = habits.some((h) => skipSet.has(`${h.id}:${dateStr}`));
          const isToday = dateStr === todayStr;
          const isFuture = date > now;
          const ratio = scheduled.length > 0 ? completed.length / scheduled.length : 0;

          return (
            <div
              key={i}
              className={`relative aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 text-[10px] font-mono transition ${
                isToday ? "ring-1 ring-[rgb(var(--accent-rgb)/0.5)]" : ""
              } ${isFuture ? "opacity-20" : ""}`}
              style={{
                background: ratio === 1 ? "rgb(16 185 129 / 0.15)" :
                  ratio > 0 ? "rgb(251 191 36 / 0.1)" :
                  skipped ? "rgb(59 130 246 / 0.08)" : "var(--fg-03)",
              }}
            >
              <span className={`${ratio === 1 ? "text-emerald-400" : ratio > 0 ? "text-amber-400/70" : "text-[var(--fg-30)]"}`}>{day}</span>
              {scheduled.length > 0 && !isFuture && (
                <div className="flex gap-[2px]">
                  {scheduled.slice(0, 4).map((h) => (
                    <div
                      key={h.id}
                      className="w-[4px] h-[4px] rounded-full"
                      style={{
                        background: completed.some((c) => c.id === h.id)
                          ? `rgb(${h.color_rgb})`
                          : "var(--fg-15)",
                      }}
                    />
                  ))}
                </div>
              )}
              {skipped && <SkipForward size={6} className="absolute top-0.5 right-0.5 text-blue-400/40" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Loot drop toast ────────────────────────────────────────────────────────

function LootDropToast({ drop, onClose }: { drop: LootDrop; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <motion.div
      className="fixed top-16 left-1/2 z-50 -translate-x-1/2 rounded-xl border px-4 py-3 flex items-center gap-3 shadow-2xl"
      style={{ borderColor: `rgb(${drop.color} / 0.3)`, background: `linear-gradient(135deg, rgb(${drop.color} / 0.15), rgb(${drop.color} / 0.05))`, backdropFilter: "blur(20px)" }}
      initial={{ opacity: 0, y: -20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
    >
      <span className="text-2xl">{drop.icon}</span>
      <div>
        <p className="text-xs font-bold text-[var(--fg-90)]">{drop.label}</p>
        <p className="text-[9px] font-mono text-[var(--fg-40)]">{drop.rarity.toUpperCase()} DROP</p>
      </div>
      <Gift size={14} className="text-[var(--fg-20)]" />
    </motion.div>
  );
}

// ─── Milestone toast ────────────────────────────────────────────────────────

function MilestoneToast({ emoji, label, xp, habitName, milestoneDays, username, onClose }: { emoji: string; label: string; xp: number; habitName: string; milestoneDays: number; username?: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 8000); return () => clearTimeout(t); }, [onClose]);
  return (
    <motion.div
      className="fixed top-16 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/15 to-amber-600/10 px-5 py-3 shadow-2xl text-center"
      style={{ backdropFilter: "blur(20px)" }}
      initial={{ opacity: 0, y: -20, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
    >
      <p className="text-2xl mb-1">{emoji}</p>
      <p className="text-sm font-bold text-amber-300">{label} STREAK!</p>
      <p className="text-[10px] font-mono text-amber-400/60">+{xp} XP milestone bonus</p>
      <button
        onClick={() => {
          const habit = { name: habitName } as Habit;
          const card = generateMilestoneCard(habit, milestoneDays);
          shareCardImage(card, username);
        }}
        className="mt-2 flex items-center gap-1.5 mx-auto text-[10px] font-mono text-amber-300/70 hover:text-amber-300 transition-colors"
      >
        <Share2 size={11} /> Share
      </button>
    </motion.div>
  );
}

// ─── Undo toast ─────────────────────────────────────────────────────────────

function UndoToast({ message, onUndo, onClose }: { message: string; onUndo: () => void; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 5000); return () => clearTimeout(t); }, [onClose]);
  return (
    <motion.div
      className="fixed bottom-28 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-[var(--fg-10)] bg-[var(--fg-08)] backdrop-blur-xl px-4 py-2.5 flex items-center gap-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
    >
      <p className="text-xs text-[var(--fg-70)]">{message}</p>
      <button onClick={onUndo} className="text-xs font-bold text-[rgb(var(--accent-light-rgb))] hover:underline">UNDO</button>
    </motion.div>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────

export default function HabitsPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { enabledKeys } = useModules();

  // Core state
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [skips, setSkips] = useState<Skip[]>([]);
  const [contracts, setContracts] = useState<HabitContract[]>([]);
  const [loot, setLoot] = useState<LootItem[]>([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [view, setView] = useState<"today" | "calendar">("today");
  const [showAdd, setShowAdd] = useState(false);
  const [detailHabit, setDetailHabit] = useState<Habit | null>(null);
  const [editHabit, setEditHabit] = useState<Habit | null>(null);
  const [skipModal, setSkipModal] = useState<Habit | null>(null);
  const [xpPop, setXpPop] = useState<string | null>(null);
  const [comboPop, setComboPop] = useState<{ multiplier: number; habitId: string } | null>(null);
  const [perfectDay, setPerfectDay] = useState(false);
  const [lootDrop, setLootDrop] = useState<LootDrop | null>(null);
  const [milestoneToast, setMilestoneToast] = useState<{ emoji: string; label: string; xp: number; habitName: string; milestoneDays: number } | null>(null);
  const [undoAction, setUndoAction] = useState<{ message: string; undo: () => void } | null>(null);

  // Add habit form state
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("✅");
  const [newDifficulty, setNewDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [newRoutine, setNewRoutine] = useState<"morning" | "evening" | "anytime">("anytime");
  const [newAutoSource, setNewAutoSource] = useState<string | null>(null);
  const [newFrequency, setNewFrequency] = useState<string>("daily");
  const [newCustomDays, setNewCustomDays] = useState<number[]>([]);
  const [newFreqPerWeek, setNewFreqPerWeek] = useState(3);
  const [newIsNegative, setNewIsNegative] = useState(false);

  // Combo tracking
  const comboCount = useRef(0);
  const lastCompletionTime = useRef(0);

  const today = useMemo(() => localDateStr(), []);

  // ─── Data loading ───────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!user) return;
    const twelveWeeksAgo = new Date();
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);
    const since = localDateStr(twelveWeeksAgo);

    const [{ data: habitsData }, { data: compData }, { data: skipData }, { data: contractData }, { data: lootData }] = await Promise.all([
      supabase.from("habits")
        .select("id, name, icon, color_rgb, xp_reward, sort_order, routine, auto_source, frequency, custom_days, frequency_per_week, is_negative, prestige_level, best_streak, total_completions")
        .eq("user_id", user.id).eq("archived", false).order("sort_order"),
      supabase.from("habit_completions")
        .select("habit_id, completed_date, note")
        .eq("user_id", user.id).gte("completed_date", since),
      supabase.from("habit_skips")
        .select("habit_id, skip_date, reason")
        .eq("user_id", user.id).gte("skip_date", since),
      supabase.from("habit_contracts")
        .select("id, habit_id, duration_days, start_date, end_date, status, xp_reward")
        .eq("user_id", user.id).eq("status", "active"),
      supabase.from("habit_loot")
        .select("id, loot_type, quantity, used_at, expires_at")
        .eq("user_id", user.id).is("used_at", null),
    ]);

    setHabits(habitsData ?? []);
    setCompletions(compData ?? []);
    setSkips(skipData ?? []);
    setContracts(contractData ?? []);
    setLoot(lootData ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const onFocus = () => { if (!loading) loadData(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadData, loading]);

  // ─── Derived state ──────────────────────────────────────────────────────

  const completionSet = useMemo(() => {
    const s = new Set<string>();
    completions.forEach((c) => s.add(`${c.habit_id}:${c.completed_date}`));
    return s;
  }, [completions]);

  const skipSet = useMemo(() => {
    const s = new Set<string>();
    skips.forEach((sk) => s.add(`${sk.habit_id}:${sk.skip_date}`));
    return s;
  }, [skips]);

  const scheduledToday = useMemo(() => habits.filter((h) => isHabitScheduledForDay(h, new Date())), [habits]);
  const completedToday = scheduledToday.filter((h) => completionSet.has(`${h.id}:${today}`)).length;
  const todayTotal = scheduledToday.length;

  const freezeCount = useMemo(() => loot.filter((l) => l.loot_type === "streak_freeze" && !l.used_at).length, [loot]);

  const avgMomentum = useMemo(() => {
    if (habits.length === 0) return 0;
    const total = habits.reduce((sum, h) => sum + calculateMomentum(h, completionSet, skipSet), 0);
    return Math.round(total / habits.length);
  }, [habits, completionSet, skipSet]);

  const perfectWeeks = useMemo(() => countPerfectWeeks(habits, completionSet, skipSet), [habits, completionSet, skipSet]);
  const weekMultiplier = getPerfectWeekMultiplier(perfectWeeks);

  const dailyQuests = useMemo(() => user ? getDailyQuests(user.id, today, habits) : [], [user, today, habits]);
  const insights = useMemo(() => generateInsights(habits, completionSet, skipSet), [habits, completionSet, skipSet]);
  const [correlationInsights, setCorrelationInsights] = useState<HabitInsight[]>([]);
  useEffect(() => {
    if (!user || habits.length === 0) return;
    generateCorrelationInsights(user.id, habits, completionSet, supabase).then(setCorrelationInsights);
  }, [user, habits, completionSet]);
  const auraLevel = getAuraLevel(avgMomentum);
  const aura = AURA_STYLES[auraLevel];

  const [showWeeklyReview, setShowWeeklyReview] = useState(false);
  const weeklyReview = useMemo(() => {
    if (habits.length === 0) return null;
    const now = new Date();
    const last7: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      last7.push(localDateStr(d));
    }
    let totalScheduled = 0;
    let totalCompleted = 0;
    const perHabit: { name: string; icon: string; completed: number; scheduled: number; rate: number }[] = [];
    for (const h of habits) {
      let sched = 0;
      let comp = 0;
      for (const dateStr of last7) {
        const d = new Date(dateStr + "T12:00:00");
        if (isHabitScheduledForDay(h, d)) {
          sched++;
          if (completionSet.has(`${h.id}:${dateStr}`)) comp++;
        }
      }
      if (sched > 0) {
        totalScheduled += sched;
        totalCompleted += comp;
        perHabit.push({ name: h.name, icon: h.icon || "✅", completed: comp, scheduled: sched, rate: Math.round((comp / sched) * 100) });
      }
    }
    if (totalScheduled === 0) return null;
    const hitRate = Math.round((totalCompleted / totalScheduled) * 100);
    const best = perHabit.filter(h => h.rate === 100).sort((a, b) => b.scheduled - a.scheduled);
    const worst = perHabit.filter(h => h.rate < 100).sort((a, b) => a.rate - b.rate);
    const longestStreak = habits.reduce((max, h) => Math.max(max, calculateStreak(h, completionSet, skipSet)), 0);
    return { hitRate, totalCompleted, totalScheduled, best, worst, longestStreak, perHabit };
  }, [habits, completionSet]);

  // ─── Actions ────────────────────────────────────────────────────────────

  async function toggleHabit(habit: Habit) {
    if (!user) return;
    const key = `${habit.id}:${today}`;

    if (habit.is_negative) {
      // Negative habit: tapping = reporting a slip
      if (completionSet.has(key)) {
        triggerHaptic("light");
        await supabase.from("habit_completions").delete().eq("habit_id", habit.id).eq("completed_date", today);
        setCompletions((prev) => prev.filter((c) => !(c.habit_id === habit.id && c.completed_date === today)));
      } else {
        triggerHaptic("medium");
        await supabase.from("habit_completions").insert({ habit_id: habit.id, user_id: user.id, completed_date: today });
        setCompletions((prev) => [...prev, { habit_id: habit.id, completed_date: today }]);
      }
      return;
    }

    if (completionSet.has(key)) {
      // Undo completion
      triggerHaptic("light");
      await supabase.from("habit_completions").delete().eq("habit_id", habit.id).eq("completed_date", today);
      setCompletions((prev) => prev.filter((c) => !(c.habit_id === habit.id && c.completed_date === today)));
      setUndoAction(null);
      return;
    }

    // Complete habit
    triggerHaptic("medium");
    await supabase.from("habit_completions").insert({ habit_id: habit.id, user_id: user.id, completed_date: today });
    setCompletions((prev) => {
      const next = [...prev, { habit_id: habit.id, completed_date: today }];
      const newScheduled = scheduledToday.filter((h) => isHabitScheduledForDay(h, new Date()));
      const newCompleted = newScheduled.filter((h) =>
        h.id === habit.id || next.some((c) => c.habit_id === h.id && c.completed_date === today)
      ).length;
      if (newCompleted === newScheduled.length && newScheduled.length > 1) {
        triggerHaptic("success");
        setPerfectDay(true);
        setTimeout(() => setPerfectDay(false), 4000);
      }
      return next;
    });

    // XP pop
    setXpPop(habit.id);
    setTimeout(() => setXpPop(null), 1200);

    // Combo tracking
    const now = Date.now();
    if (now - lastCompletionTime.current < 3600000) {
      comboCount.current++;
      const multiplier = getComboMultiplier(comboCount.current);
      if (multiplier > 1) {
        setComboPop({ multiplier, habitId: habit.id });
        setTimeout(() => setComboPop(null), 1500);
      }
    } else {
      comboCount.current = 1;
    }
    lastCompletionTime.current = now;

    // Check milestones
    const streak = calculateStreak(habit, new Set([...completionSet, key]), skipSet, freezeCount);
    const milestone = MILESTONES.find((m) => m.days === streak);
    if (milestone) {
      const { data: existing } = await supabase.from("habit_milestones")
        .select("id").eq("habit_id", habit.id).eq("milestone_days", milestone.days).maybeSingle();
      if (!existing) {
        await supabase.from("habit_milestones").insert({
          habit_id: habit.id, user_id: user.id, milestone_days: milestone.days, xp_awarded: milestone.xp,
        });
        triggerHaptic("success");
        setMilestoneToast({ emoji: milestone.emoji, label: milestone.label, xp: milestone.xp, habitName: habit.name, milestoneDays: milestone.days });
      }
    }

    // Loot drop chance
    const drop = rollLootDrop();
    if (drop) {
      await supabase.from("habit_loot").insert({ user_id: user.id, loot_type: drop.type });
      triggerHaptic("heavy");
      setLootDrop(drop);
      setLoot((prev) => [...prev, { id: crypto.randomUUID(), loot_type: drop.type, quantity: 1, used_at: null, expires_at: null }]);
    }

    // Update best streak & total completions
    if (streak > (habit.best_streak ?? 0)) {
      await supabase.from("habits").update({ best_streak: streak, total_completions: (habit.total_completions ?? 0) + 1 }).eq("id", habit.id);
    } else {
      await supabase.from("habits").update({ total_completions: (habit.total_completions ?? 0) + 1 }).eq("id", habit.id);
    }

    // Auto-earn streak freeze on perfect week (check if this completion makes a perfect day that completes a perfect week)
    const updatedCompletions = new Set([...completionSet, key]);
    const allTodayDone = scheduledToday.every((h) => updatedCompletions.has(`${h.id}:${today}`));
    if (allTodayDone && scheduledToday.length > 0) {
      const newPerfectWeeks = countPerfectWeeks(habits, updatedCompletions, skipSet);
      if (newPerfectWeeks > perfectWeeks && freezeCount < 3) {
        await supabase.from("habit_loot").insert({ user_id: user.id, loot_type: "streak_freeze" });
        setLoot((prev) => [...prev, { id: crypto.randomUUID(), loot_type: "streak_freeze", quantity: 1, used_at: null, expires_at: null }]);
        setLootDrop({ type: "streak_freeze", label: "Streak Freeze earned!", icon: "🧊", rarity: "rare", color: "59 130 246" });
      }
    }

    // Set undo action
    setUndoAction({
      message: `${habit.name} completed`,
      undo: async () => {
        await supabase.from("habit_completions").delete().eq("habit_id", habit.id).eq("completed_date", today);
        setCompletions((prev) => prev.filter((c) => !(c.habit_id === habit.id && c.completed_date === today)));
        setUndoAction(null);
      },
    });
  }

  async function skipHabit(habit: Habit, reason: string) {
    if (!user) return;
    await supabase.from("habit_skips").insert({ habit_id: habit.id, user_id: user.id, skip_date: today, reason });
    setSkips((prev) => [...prev, { habit_id: habit.id, skip_date: today, reason }]);
    setSkipModal(null);
  }

  async function addHabit(name?: string, icon?: string, diff?: "easy" | "medium" | "hard", autoSource?: string, isNeg?: boolean) {
    if (!user) return;
    const habitName = name ?? newName.trim();
    const habitIcon = icon ?? newIcon;
    const difficulty = diff ?? newDifficulty;
    const source = autoSource ?? newAutoSource;
    const negative = isNeg ?? newIsNegative;
    if (!habitName) return;
    const xp = DIFFICULTIES.find((d) => d.key === difficulty)!.xp;
    const { data } = await supabase.from("habits").insert({
      user_id: user.id,
      name: habitName,
      icon: habitIcon,
      xp_reward: xp,
      routine: diff ? "anytime" : newRoutine,
      frequency: diff ? "daily" : newFrequency,
      custom_days: newFrequency === "custom" ? newCustomDays : null,
      frequency_per_week: newFrequency === "x_per_week" ? newFreqPerWeek : null,
      is_negative: negative,
      sort_order: habits.length,
      ...(source ? { auto_source: source } : {}),
    }).select("id, name, icon, color_rgb, xp_reward, sort_order, routine, auto_source, frequency, custom_days, frequency_per_week, is_negative, prestige_level, best_streak, total_completions").single();
    if (data) setHabits((prev) => [...prev, data]);
    resetAddForm();
  }

  function resetAddForm() {
    setNewName(""); setNewIcon("✅"); setNewDifficulty("medium"); setNewRoutine("anytime");
    setNewAutoSource(null); setNewFrequency("daily"); setNewCustomDays([]); setNewFreqPerWeek(3);
    setNewIsNegative(false); setShowAdd(false);
  }

  async function deleteHabit(habitId: string) {
    await supabase.from("habits").update({ archived: true }).eq("id", habitId);
    setHabits((prev) => prev.filter((h) => h.id !== habitId));
    setDetailHabit(null);
  }

  async function updateHabit(habit: Habit) {
    await supabase.from("habits").update({
      name: habit.name, icon: habit.icon, routine: habit.routine,
      frequency: habit.frequency, custom_days: habit.custom_days,
      frequency_per_week: habit.frequency_per_week, is_negative: habit.is_negative,
    }).eq("id", habit.id);
    setHabits((prev) => prev.map((h) => h.id === habit.id ? habit : h));
    setEditHabit(null);
  }

  async function startContract(habit: Habit, days: 21 | 66) {
    if (!user) return;
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + days);
    const xpReward = days === 21 ? 200 : 500;
    const { data } = await supabase.from("habit_contracts").insert({
      habit_id: habit.id, user_id: user.id, duration_days: days,
      start_date: localDateStr(start), end_date: localDateStr(end), xp_reward: xpReward,
    }).select("id, habit_id, duration_days, start_date, end_date, status, xp_reward").single();
    if (data) setContracts((prev) => [...prev, data]);
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] pb-24 md:pb-10 relative">
      <div className="relative z-10 max-w-xl mx-auto px-4 pt-6 space-y-4">
        <button onClick={() => router.push("/track")} className="flex items-center gap-1 text-[var(--fg-40)] hover:text-[var(--fg-60)] transition">
          <ChevronLeft size={18} />
          <span className="text-xs font-mono">Track</span>
        </button>

        {/* Header with aura */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold font-display text-[rgb(var(--accent-light-rgb))]">Habits</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-[11px] text-[var(--fg-30)]">Momentum</p>
              <div className="flex items-center gap-1">
                <div className="w-16 h-1.5 rounded-full bg-[var(--fg-04)] overflow-hidden">
                  <motion.div className="h-full rounded-full" style={{ background: `rgb(${aura.color})` }}
                    initial={{ width: 0 }} animate={{ width: `${avgMomentum}%` }} transition={{ duration: 1 }} />
                </div>
                <span className="text-[10px] font-mono font-bold" style={{ color: `rgb(${aura.color})` }}>{avgMomentum}%</span>
              </div>
            </div>
          </div>
          {/* Loot inventory */}
          <div className="flex items-center gap-1.5">
            {freezeCount > 0 && (
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400/70 flex items-center gap-1">
                🧊 {freezeCount}
              </span>
            )}
            {weekMultiplier > 1 && (
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400/70 flex items-center gap-1">
                <Zap size={8} /> {weekMultiplier}x
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <CubeLoader message="Loading habits…" />
        ) : (
          <>
            {/* Daily Rings */}
            {habits.length > 0 && <DailyRings habits={habits} completionSet={completionSet} today={today} />}

            {/* View tabs */}
            {habits.length > 0 && (
              <div className="flex gap-1 bg-[var(--fg-03)] rounded-lg p-0.5">
                {(["today", "calendar"] as const).map((v) => (
                  <button key={v} onClick={() => setView(v)}
                    className={`flex-1 py-1.5 rounded-md text-[10px] font-mono transition ${
                      view === v ? "bg-[var(--fg-08)] text-[var(--fg-80)]" : "text-[var(--fg-30)] hover:text-[var(--fg-50)]"
                    }`}>
                    {v === "today" ? "Today" : "Calendar"}
                  </button>
                ))}
              </div>
            )}

            {/* Daily Quests */}
            {view === "today" && dailyQuests.length > 0 && habits.length > 0 && (
              <div className="rounded-xl border border-amber-500/10 bg-amber-500/[0.03] p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Scroll size={11} className="text-amber-400/50" />
                  <p className="text-[9px] font-mono tracking-widest text-amber-400/40">DAILY QUESTS</p>
                </div>
                <div className="space-y-1.5">
                  {dailyQuests.map((q) => {
                    const done = q.check(habits, completionSet, today);
                    return (
                      <div key={q.id} className={`flex items-center gap-2 text-[11px] ${done ? "text-amber-400/60 line-through" : "text-[var(--fg-50)]"}`}>
                        {done ? <Check size={12} className="text-amber-400" /> : <Target size={12} className="text-[var(--fg-20)]" />}
                        <span className="flex-1">{q.description}</span>
                        <span className="text-[9px] font-mono text-amber-400/40">+{q.xp_reward}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Today view: habits grouped by routine */}
            {view === "today" && (["morning", "anytime", "evening"] as const).map((routineKey) => {
              const routineHabits = scheduledToday.filter((h) => h.routine === routineKey);
              if (routineHabits.length === 0) return null;
              const RoutineIcon = ROUTINES.find((r) => r.key === routineKey)!.icon;
              const routineLabel = ROUTINES.find((r) => r.key === routineKey)!.label;
              const allRoutineDone = routineHabits.every((h) => completionSet.has(`${h.id}:${today}`) || !!h.auto_source || skipSet.has(`${h.id}:${today}`));
              const manualUndone = routineHabits.filter((h) => !completionSet.has(`${h.id}:${today}`) && !h.auto_source && !skipSet.has(`${h.id}:${today}`) && !h.is_negative);
              return (
                <div key={routineKey}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <RoutineIcon size={11} className="text-[var(--fg-20)]" />
                      <p className="text-[9px] font-mono tracking-widest text-[var(--fg-20)]">{routineLabel.toUpperCase()}</p>
                    </div>
                    {manualUndone.length > 1 && (
                      <button onClick={() => manualUndone.forEach((h) => toggleHabit(h))}
                        className="text-[9px] font-mono px-2 py-1 rounded-md bg-[var(--fg-04)] border border-[var(--fg-06)] text-[var(--fg-30)] hover:text-[var(--fg-50)] transition active:scale-95">
                        Complete all
                      </button>
                    )}
                  </div>
                  <motion.div className="space-y-2 mb-3" variants={staggerContainer} initial="hidden" animate="visible">
                    {routineHabits.map((habit) => {
                      const isNeg = habit.is_negative;
                      const done = completionSet.has(`${habit.id}:${today}`);
                      const skipped = skipSet.has(`${habit.id}:${today}`);
                      const streak = calculateStreak(habit, completionSet, skipSet, freezeCount);
                      const momentum = calculateMomentum(habit, completionSet, skipSet);
                      const tier = getEvolutionTier(streak);
                      const evo = EVOLUTION_STYLES[tier];
                      const isAuto = !!habit.auto_source;
                      const autoInfo = AUTO_SOURCES.find((a) => a.key === habit.auto_source);
                      const contract = contracts.find((c) => c.habit_id === habit.id);
                      const xpMultiplier = getPrestigeMultiplier(habit.prestige_level) * weekMultiplier;
                      const effectiveXp = Math.round(habit.xp_reward * xpMultiplier);

                      const canSwipe = !isAuto && !skipped && !done;
                      return (
                        <motion.div
                          key={habit.id}
                          variants={staggerItem}
                          className={`relative rounded-xl border p-3 transition overflow-hidden ${evo.border} ${evo.bg} ${evo.glow} ${
                            isAuto || skipped ? "" : "cursor-pointer active:scale-[0.98]"
                          } ${done && !isNeg ? "border-emerald-500/20 bg-emerald-500/[0.04]" : ""} ${
                            isNeg && !done ? "border-emerald-500/15 bg-emerald-500/[0.03]" : ""
                          } ${isNeg && done ? "border-red-500/20 bg-red-500/[0.04]" : ""}`}
                          onClick={() => {
                            if (isAuto || skipped) return;
                            toggleHabit(habit);
                          }}
                          onContextMenu={(e) => { e.preventDefault(); setDetailHabit(habit); }}
                          {...(canSwipe ? {
                            drag: "x" as const,
                            dragConstraints: { left: 0, right: 0 },
                            dragElastic: 0.3,
                            onDragEnd: (_: any, info: { offset: { x: number } }) => {
                              if (info.offset.x > 80) toggleHabit(habit);
                            },
                          } : {})}
                        >
                          {/* Swipe hint background */}
                          {canSwipe && (
                            <div className="absolute inset-y-0 -left-1 w-16 flex items-center justify-center pointer-events-none">
                              <Check size={18} className="text-emerald-500/20" />
                            </div>
                          )}
                          {/* Evolution particles */}
                          {evo.particle && (
                            <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
                              {[...Array(3)].map((_, i) => (
                                <motion.div key={i}
                                  className="absolute w-1 h-1 rounded-full"
                                  style={{ background: tier === "legendary" ? "rgb(192 132 252 / 0.4)" : "rgb(251 191 36 / 0.4)" }}
                                  animate={{ x: [0, 20, -10, 0], y: [0, -15, -30], opacity: [0, 1, 0] }}
                                  transition={{ duration: 2 + i * 0.5, repeat: Infinity, delay: i * 0.7 }}
                                  initial={{ left: `${20 + i * 30}%`, bottom: "10%" }}
                                />
                              ))}
                            </div>
                          )}

                          <div className="flex items-center gap-3">
                            {/* Checkbox / icon */}
                            <div
                              className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition ${
                                isNeg
                                  ? done
                                    ? "bg-red-500/20 border border-red-500/30"
                                    : "bg-emerald-500/10 border border-emerald-500/20"
                                  : done
                                    ? "bg-emerald-500/20 border border-emerald-500/30"
                                    : "bg-[var(--fg-03)] border border-[var(--fg-10)]"
                              }`}
                            >
                              {isNeg ? (
                                done ? <AlertTriangle size={16} className="text-red-400" /> : <Shield size={16} className="text-emerald-400" />
                              ) : (
                                done ? <Check size={18} className="text-emerald-400" /> : <span className="text-lg">{habit.icon}</span>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className={`text-sm font-bold truncate ${done && !isNeg ? "text-[var(--fg-50)] line-through" : isNeg && done ? "text-red-400/70" : "text-[var(--fg-80)]"}`}>
                                  {habit.name}
                                </p>
                                <span className="relative">
                                  <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400/70">
                                    {xpMultiplier > 1 ? `${effectiveXp}` : `+${habit.xp_reward}`} XP
                                  </span>
                                  <AnimatePresence>
                                    {xpPop === habit.id && (
                                      <motion.span className="absolute -top-4 left-1/2 -translate-x-1/2 text-xs font-bold text-amber-400 whitespace-nowrap"
                                        initial={{ opacity: 1, y: 0 }} animate={{ opacity: 0, y: -16 }} exit={{ opacity: 0 }} transition={{ duration: 1 }}>
                                        +{effectiveXp} XP!
                                      </motion.span>
                                    )}
                                  </AnimatePresence>
                                  <AnimatePresence>
                                    {comboPop?.habitId === habit.id && (
                                      <motion.span className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs font-bold text-orange-400 whitespace-nowrap"
                                        initial={{ opacity: 1, y: 0, scale: 1.3 }} animate={{ opacity: 0, y: -12 }} exit={{ opacity: 0 }} transition={{ duration: 1.2 }}>
                                        {comboPop.multiplier}x COMBO!
                                      </motion.span>
                                    )}
                                  </AnimatePresence>
                                </span>
                                {habit.prestige_level > 0 && (
                                  <span className="text-[8px] font-mono text-purple-400/60">P{habit.prestige_level}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                {streak > 0 && <StreakFlame streak={streak} size={16} />}
                                {isAuto ? (
                                  <span className="flex items-center gap-1 text-[8px] font-mono text-cyan-400/50">
                                    <Link size={8} /> {done ? `✓ Done via ${autoInfo?.label ?? "auto"}` : autoInfo?.desc ?? "Auto-completes when done"}
                                  </span>
                                ) : skipped ? (
                                  <span className="text-[8px] font-mono text-blue-400/50">Skipped today</span>
                                ) : isNeg ? (
                                  <span className="text-[8px] font-mono text-[var(--fg-15)]">{done ? "Slipped — tap to undo" : "Holding strong"}</span>
                                ) : !done && (
                                  <span className="text-[8px] font-mono text-[var(--fg-15)]">Tap to complete</span>
                                )}
                                {contract && (
                                  <span className="text-[8px] font-mono px-1 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-400/60">
                                    📜 {contract.duration_days}d
                                  </span>
                                )}
                                <span className="text-[8px] font-mono text-[var(--fg-10)]">{getScheduleLabel(habit)}</span>
                              </div>
                              {/* Momentum bar */}
                              <div className="mt-1.5 h-1 rounded-full bg-[var(--fg-04)] overflow-hidden">
                                <motion.div className="h-full rounded-full" style={{
                                  background: momentum >= 80 ? "rgb(16 185 129 / 0.6)" : momentum >= 50 ? "rgb(251 191 36 / 0.5)" : "rgb(239 68 68 / 0.4)",
                                }} initial={{ width: 0 }} animate={{ width: `${momentum}%` }} transition={{ duration: 0.6 }} />
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-1 items-center">
                              {!isAuto && !done && !skipped && (
                                <button onClick={(e) => { e.stopPropagation(); setSkipModal(habit); }}
                                  className="p-1 text-[var(--fg-10)] hover:text-blue-400/50 transition" title="Skip with reason">
                                  <SkipForward size={12} />
                                </button>
                              )}
                              <button onClick={(e) => { e.stopPropagation(); setDetailHabit(habit); }}
                                className="p-1 text-[var(--fg-10)] hover:text-[var(--fg-40)] transition" title="Details">
                                <Calendar size={12} />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                </div>
              );
            })}

            {/* Calendar view */}
            {view === "calendar" && <MonthCalendar habits={habits} completionSet={completionSet} skipSet={skipSet} username={profile?.username} />}

            {/* Constellation view */}
            {/* Weekly Review Card (#30) */}
            {view === "today" && weeklyReview && (
              <div className="rounded-xl border border-[var(--fg-06)] bg-[var(--fg-02)] overflow-hidden">
                <button
                  onClick={() => setShowWeeklyReview(p => !p)}
                  className="w-full flex items-center justify-between p-4 hover:bg-[var(--fg-01)] transition"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                      <Scroll size={14} className="text-purple-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-[var(--fg-80)]">Weekly Review</p>
                      <p className="text-[10px] font-mono text-[var(--fg-30)]">
                        {weeklyReview.hitRate}% hit rate · {weeklyReview.totalCompleted}/{weeklyReview.totalScheduled} completed
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={14} className={`text-[var(--fg-20)] transition-transform ${showWeeklyReview ? "rotate-90" : ""}`} />
                </button>
                <AnimatePresence>
                  {showWeeklyReview && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-3 border-t border-[var(--fg-04)]">
                        {/* Overall stats */}
                        <div className="grid grid-cols-3 gap-2 mt-3">
                          <div className="rounded-lg bg-[var(--fg-02)] border border-[var(--fg-06)] p-2 text-center">
                            <p className="text-lg font-bold font-mono text-[var(--fg-90)]">{weeklyReview.hitRate}%</p>
                            <p className="text-[8px] font-mono text-[var(--fg-25)]">HIT RATE</p>
                          </div>
                          <div className="rounded-lg bg-[var(--fg-02)] border border-[var(--fg-06)] p-2 text-center">
                            <p className="text-lg font-bold font-mono text-[var(--fg-90)]">{weeklyReview.longestStreak}</p>
                            <p className="text-[8px] font-mono text-[var(--fg-25)]">BEST STREAK</p>
                          </div>
                          <div className="rounded-lg bg-[var(--fg-02)] border border-[var(--fg-06)] p-2 text-center">
                            <p className="text-lg font-bold font-mono text-[var(--fg-90)]">{perfectWeeks}</p>
                            <p className="text-[8px] font-mono text-[var(--fg-25)]">PERFECT WKS</p>
                          </div>
                        </div>
                        {/* Best habits */}
                        {weeklyReview.best.length > 0 && (
                          <div>
                            <p className="text-[9px] font-mono text-emerald-400/60 mb-1.5">PERFECT THIS WEEK</p>
                            <div className="flex flex-wrap gap-1.5">
                              {weeklyReview.best.slice(0, 5).map(h => (
                                <span key={h.name} className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/15 text-[10px] text-emerald-300">
                                  {h.icon} {h.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* Needs work */}
                        {weeklyReview.worst.length > 0 && (
                          <div>
                            <p className="text-[9px] font-mono text-amber-400/60 mb-1.5">NEEDS ATTENTION</p>
                            <div className="space-y-1">
                              {weeklyReview.worst.slice(0, 3).map(h => (
                                <div key={h.name} className="flex items-center justify-between text-[10px]">
                                  <span className="text-[var(--fg-50)]">{h.icon} {h.name}</span>
                                  <span className="font-mono text-amber-300">{h.completed}/{h.scheduled} ({h.rate}%)</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Smart Insights */}
            {view === "today" && (insights.length > 0 || correlationInsights.length > 0) && (
              <div className="space-y-2">
                <p className="text-[9px] font-mono tracking-widest text-[var(--fg-20)]">INSIGHTS</p>
                {[...insights, ...correlationInsights].map((insight, i) => (
                  <div key={i} className="rounded-lg border border-[var(--fg-06)] bg-[var(--fg-02)] p-3 flex items-start gap-2.5">
                    <span className="text-base">{insight.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold" style={{ color: `rgb(${insight.color})` }}>{insight.title}</p>
                      <p className="text-[10px] text-[var(--fg-40)] mt-0.5">{insight.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add habit button */}
            <AnimatePresence>
              {showAdd && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="rounded-xl border border-[var(--fg-06)] bg-[var(--fg-02)] p-4 space-y-3 overflow-hidden">
                  <p className="text-[9px] font-mono tracking-widest text-[var(--fg-25)]">NEW HABIT</p>
                  <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                    placeholder="Habit name…" maxLength={50} onKeyDown={(e) => e.key === "Enter" && addHabit()}
                    className="w-full bg-[var(--fg-04)] border border-[var(--fg-10)] rounded-lg px-3 py-2 text-sm text-[var(--fg-80)] placeholder:text-[var(--fg-20)] outline-none focus:border-[var(--fg-20)]" />

                  {/* Type toggle */}
                  <div className="flex gap-1.5">
                    <button onClick={() => setNewIsNegative(false)}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-mono flex items-center justify-center gap-1 transition ${
                        !newIsNegative ? "border bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "border border-[var(--fg-06)] text-[var(--fg-25)]"
                      }`}>
                      <Check size={10} /> Build
                    </button>
                    <button onClick={() => setNewIsNegative(true)}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-mono flex items-center justify-center gap-1 transition ${
                        newIsNegative ? "border bg-red-500/10 border-red-500/20 text-red-400" : "border border-[var(--fg-06)] text-[var(--fg-25)]"
                      }`}>
                      <Ban size={10} /> Break
                    </button>
                  </div>

                  {/* Icons */}
                  <div className="flex gap-1.5 flex-wrap">
                    {HABIT_ICONS.map((icon) => (
                      <button key={icon} onClick={() => setNewIcon(icon)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-base transition ${
                          newIcon === icon ? "bg-[var(--fg-10)] border border-[var(--fg-20)]" : "bg-[var(--fg-02)] border border-transparent hover:bg-[var(--fg-05)]"
                        }`}>{icon}</button>
                    ))}
                  </div>

                  {/* Difficulty */}
                  <div>
                    <p className="text-[8px] font-mono text-[var(--fg-20)] mb-1.5">DIFFICULTY</p>
                    <div className="flex gap-1.5">
                      {DIFFICULTIES.map((d) => (
                        <button key={d.key} onClick={() => setNewDifficulty(d.key as "easy" | "medium" | "hard")}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-mono text-center transition ${
                            newDifficulty === d.key ? `border bg-[rgb(${d.color}/0.15)] border-[rgb(${d.color}/0.3)] text-[var(--fg-80)]` : "border border-[var(--fg-06)] text-[var(--fg-25)]"
                          }`}>{d.label} (+{d.xp})</button>
                      ))}
                    </div>
                  </div>

                  {/* Schedule */}
                  <div>
                    <p className="text-[8px] font-mono text-[var(--fg-20)] mb-1.5">SCHEDULE</p>
                    <div className="flex gap-1 flex-wrap">
                      {FREQUENCIES.map((f) => (
                        <button key={f.key} onClick={() => setNewFrequency(f.key)}
                          className={`px-2 py-1.5 rounded-lg text-[10px] font-mono transition ${
                            newFrequency === f.key ? "border bg-[var(--fg-08)] border-[var(--fg-20)] text-[var(--fg-80)]" : "border border-[var(--fg-06)] text-[var(--fg-25)]"
                          }`}>{f.label}</button>
                      ))}
                    </div>
                    {newFrequency === "custom" && (
                      <div className="flex gap-1 mt-2">
                        {DAY_NAMES.map((d, i) => (
                          <button key={i} onClick={() => setNewCustomDays((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i])}
                            className={`w-8 h-8 rounded-lg text-[10px] font-mono transition ${
                              newCustomDays.includes(i) ? "bg-[rgb(var(--accent-rgb)/0.2)] border border-[rgb(var(--accent-rgb)/0.3)] text-[var(--fg-80)]" : "border border-[var(--fg-06)] text-[var(--fg-25)]"
                            }`}>{d}</button>
                        ))}
                      </div>
                    )}
                    {newFrequency === "x_per_week" && (
                      <div className="flex items-center gap-2 mt-2">
                        {[2, 3, 4, 5, 6].map((n) => (
                          <button key={n} onClick={() => setNewFreqPerWeek(n)}
                            className={`w-8 h-8 rounded-lg text-[10px] font-mono transition ${
                              newFreqPerWeek === n ? "bg-[rgb(var(--accent-rgb)/0.2)] border border-[rgb(var(--accent-rgb)/0.3)] text-[var(--fg-80)]" : "border border-[var(--fg-06)] text-[var(--fg-25)]"
                            }`}>{n}x</button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Routine */}
                  <div>
                    <p className="text-[8px] font-mono text-[var(--fg-20)] mb-1.5">ROUTINE</p>
                    <div className="flex gap-1.5">
                      {ROUTINES.map((r) => {
                        const Icon = r.icon;
                        return (
                          <button key={r.key} onClick={() => setNewRoutine(r.key as "morning" | "evening" | "anytime")}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-mono flex items-center justify-center gap-1 transition ${
                              newRoutine === r.key ? "border bg-[var(--fg-08)] border-[var(--fg-20)] text-[var(--fg-80)]" : "border border-[var(--fg-06)] text-[var(--fg-25)]"
                            }`}><Icon size={10} /> {r.label}</button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Auto-complete */}
                  {!newIsNegative && (
                    <div>
                      <p className="text-[8px] font-mono text-[var(--fg-20)] mb-1.5">AUTO-COMPLETE <span className="text-[var(--fg-10)]">(optional)</span></p>
                      <div className="flex gap-1.5">
                        <button onClick={() => setNewAutoSource(null)}
                          className={`px-2.5 py-1.5 rounded-lg text-[10px] font-mono transition ${
                            newAutoSource === null ? "border bg-[var(--fg-08)] border-[var(--fg-20)] text-[var(--fg-80)]" : "border border-[var(--fg-06)] text-[var(--fg-25)]"
                          }`}>Manual</button>
                        {AUTO_SOURCES.map((a) => {
                          const Icon = a.icon;
                          return (
                            <button key={a.key} onClick={() => setNewAutoSource(a.key)}
                              className={`flex-1 py-1.5 rounded-lg text-[10px] font-mono flex items-center justify-center gap-1 transition ${
                                newAutoSource === a.key ? "border bg-cyan-500/[0.08] border-cyan-500/20 text-cyan-400/80" : "border border-[var(--fg-06)] text-[var(--fg-25)]"
                              }`}><Icon size={10} /> {a.label}</button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button onClick={() => addHabit()} disabled={!newName.trim()}
                      className="flex-1 py-2 rounded-lg text-sm font-mono font-bold bg-[rgb(var(--accent-rgb)/0.2)] border border-[rgb(var(--accent-rgb)/0.3)] text-[var(--fg-80)] active:scale-95 transition disabled:opacity-30">
                      Add Habit
                    </button>
                    <button onClick={resetAddForm}
                      className="px-4 py-2 rounded-lg text-sm font-mono text-[var(--fg-30)] border border-[var(--fg-10)] active:scale-95 transition">
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button onClick={() => setShowAdd(!showAdd)}
              className="w-full py-3 rounded-xl border border-dashed border-[var(--fg-10)] text-[var(--fg-30)] hover:text-[var(--fg-50)] hover:border-[var(--fg-20)] flex items-center justify-center gap-2 transition active:scale-[0.98]">
              <Plus size={16} /> Add habit
            </button>

            {/* Perfect Day celebration */}
            <AnimatePresence>
              {perfectDay && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                  className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4 text-center">
                  <Star size={28} className="mx-auto mb-2 text-amber-400" />
                  <p className="text-sm font-bold text-amber-300">PERFECT DAY!</p>
                  <p className="text-[10px] font-mono text-amber-400/50 mt-1">All habits completed — bonus XP earned</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Empty state with suggestions */}
            {habits.length === 0 && !showAdd && (
              <div className="space-y-4">
                <div className="text-center py-6">
                  <Flame size={32} className="mx-auto mb-3 text-[var(--fg-15)]" />
                  <p className="text-sm font-semibold text-[var(--fg-25)]">NO HABITS YET</p>
                  <p className="text-xs text-[var(--fg-20)] mt-1">Add your first habit to start building streaks</p>
                </div>

                {/* How it works */}
                <div className="rounded-xl border border-[var(--fg-06)] bg-[var(--fg-02)] p-4 space-y-3">
                  <p className="text-[9px] font-mono tracking-widest text-[var(--fg-25)]">HOW IT WORKS</p>
                  {[
                    { icon: "✅", title: "Complete daily", body: "Tap or swipe right to mark a habit done. Build streaks for bonus XP." },
                    { icon: "📊", title: "Momentum over streaks", body: "Missing one day doesn't reset everything. Your momentum score uses a weighted average — consistency matters more than perfection." },
                    { icon: "⏭️", title: "Skip, don't break", body: "Sick or traveling? Skip with a reason and your momentum stays protected." },
                    { icon: "🎮", title: "Earn rewards", body: "Complete habits to earn XP, loot drops (streak freezes, double XP), and hit milestones at 7, 14, 30, 60, and 100 days." },
                    { icon: "⭐", title: "Level up", body: "Your habits evolve visually as streaks grow. Daily quests give bonus XP. Perfect weeks earn multipliers." },
                  ].map((item) => (
                    <div key={item.title} className="flex gap-2.5">
                      <span className="text-sm shrink-0 mt-0.5">{item.icon}</span>
                      <div>
                        <p className="text-[11px] font-bold text-[var(--fg-50)]">{item.title}</p>
                        <p className="text-[10px] text-[var(--fg-25)] leading-relaxed">{item.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border border-[var(--fg-06)] bg-[var(--fg-02)] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={12} className="text-amber-400/50" />
                    <p className="text-[9px] font-mono tracking-widest text-[var(--fg-25)]">SUGGESTED HABITS</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {SUGGESTED_HABITS.map((s) => {
                      const diff = DIFFICULTIES.find((d) => d.key === s.difficulty)!;
                      return (
                        <button key={s.name}
                          onClick={() => addHabit(s.name, s.icon, s.difficulty as "easy" | "medium" | "hard", s.auto_source, s.is_negative)}
                          className="flex items-center gap-2 p-2.5 rounded-lg border border-[var(--fg-06)] bg-[var(--fg-02)] hover:bg-[var(--fg-04)] text-left transition active:scale-95">
                          <span className="text-base">{s.icon}</span>
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-[var(--fg-60)] truncate">{s.name}</p>
                            <div className="flex items-center gap-1.5">
                              <p className="text-[8px] font-mono" style={{ color: `rgb(${diff.color} / 0.6)` }}>+{diff.xp} XP</p>
                              {s.auto_source && <span className="flex items-center gap-0.5 text-[7px] font-mono text-cyan-400/40"><Link size={7} />Auto</span>}
                              {s.is_negative && <span className="text-[7px] font-mono text-red-400/40">Break</span>}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── Skip modal ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {skipModal && (
          <motion.div className="fixed inset-0 z-50 flex items-end justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/60" onClick={() => setSkipModal(null)} />
            <motion.div className="relative w-full max-w-md bg-[var(--bg-elevated)] border-t border-[var(--fg-10)] rounded-t-2xl p-5 space-y-3"
              initial={{ y: 200 }} animate={{ y: 0 }} exit={{ y: 200 }}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-[var(--fg-80)]">Skip "{skipModal.name}"</p>
                <button onClick={() => setSkipModal(null)} className="text-[var(--fg-30)]"><X size={18} /></button>
              </div>
              <p className="text-[11px] text-[var(--fg-40)]">Your momentum won't be affected.</p>
              <div className="grid grid-cols-2 gap-2">
                {SKIP_REASONS.map((r) => (
                  <button key={r.key} onClick={() => skipHabit(skipModal, r.key)}
                    className="flex items-center gap-2 p-3 rounded-lg border border-[var(--fg-06)] bg-[var(--fg-02)] hover:bg-[var(--fg-04)] transition active:scale-95">
                    <span>{r.icon}</span>
                    <span className="text-xs text-[var(--fg-60)]">{r.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Detail modal ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {detailHabit && (
          <motion.div className="fixed inset-0 z-50 flex items-end justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/60" onClick={() => setDetailHabit(null)} />
            <motion.div className="relative w-full max-w-md bg-[var(--bg-elevated)] border-t border-[var(--fg-10)] rounded-t-2xl p-5 space-y-4 max-h-[80vh] overflow-y-auto"
              initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{detailHabit.icon}</span>
                  <div>
                    <p className="text-sm font-bold text-[var(--fg-90)]">{detailHabit.name}</p>
                    <p className="text-[9px] font-mono text-[var(--fg-30)]">{getScheduleLabel(detailHabit)} · {detailHabit.is_negative ? "Break habit" : "Build habit"}</p>
                  </div>
                </div>
                <button onClick={() => setDetailHabit(null)} className="text-[var(--fg-30)]"><X size={18} /></button>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Streak", value: `${calculateStreak(detailHabit, completionSet, skipSet, freezeCount)}d`, icon: "🔥" },
                  { label: "Best", value: `${detailHabit.best_streak}d`, icon: "🏆" },
                  { label: "Momentum", value: `${calculateMomentum(detailHabit, completionSet, skipSet)}%`, icon: "📊" },
                  { label: "Total", value: `${detailHabit.total_completions}`, icon: "✅" },
                  { label: "Prestige", value: `P${detailHabit.prestige_level}`, icon: "⭐" },
                  { label: "XP/day", value: `${Math.round(detailHabit.xp_reward * getPrestigeMultiplier(detailHabit.prestige_level))}`, icon: "⚡" },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg border border-[var(--fg-06)] bg-[var(--fg-02)] p-2.5 text-center">
                    <p className="text-base">{s.icon}</p>
                    <p className="text-sm font-bold font-mono text-[var(--fg-80)] mt-0.5">{s.value}</p>
                    <p className="text-[8px] font-mono text-[var(--fg-25)]">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Contract */}
              {!contracts.find((c) => c.habit_id === detailHabit.id) && (
                <div>
                  <p className="text-[9px] font-mono text-[var(--fg-25)] mb-2">START A CONTRACT</p>
                  <div className="flex gap-2">
                    <button onClick={() => startContract(detailHabit, 21)}
                      className="flex-1 py-2.5 rounded-lg border border-purple-500/20 bg-purple-500/[0.05] text-[11px] font-mono text-purple-400/70 hover:bg-purple-500/[0.1] transition">
                      21-Day (+200 XP)
                    </button>
                    <button onClick={() => startContract(detailHabit, 66)}
                      className="flex-1 py-2.5 rounded-lg border border-purple-500/20 bg-purple-500/[0.05] text-[11px] font-mono text-purple-400/70 hover:bg-purple-500/[0.1] transition">
                      66-Day (+500 XP)
                    </button>
                  </div>
                </div>
              )}

              {/* Revive broken streak */}
              {(() => {
                const currentStreak = calculateStreak(detailHabit, completionSet, skipSet, freezeCount);
                const bestStreak = detailHabit.best_streak ?? 0;
                if (currentStreak === 0 && bestStreak >= 7) {
                  const cost = getReviveCost(bestStreak);
                  return (
                    <div className="rounded-lg border border-orange-500/15 bg-orange-500/[0.04] p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold text-orange-400/80">Streak broken!</p>
                          <p className="text-[9px] font-mono text-[var(--fg-30)]">Sacrifice {cost} XP to revive your {bestStreak}-day streak</p>
                        </div>
                        <button onClick={async () => {
                          if (!user) return;
                          const yesterday = new Date();
                          yesterday.setDate(yesterday.getDate() - 1);
                          await supabase.from("habit_completions").insert({
                            habit_id: detailHabit.id, user_id: user.id, completed_date: localDateStr(yesterday), note: "revived",
                          });
                          setCompletions((prev) => [...prev, { habit_id: detailHabit.id, completed_date: localDateStr(yesterday), note: "revived" }]);
                          setDetailHabit(null);
                        }}
                          className="px-3 py-1.5 rounded-lg bg-orange-500/15 border border-orange-500/25 text-[10px] font-mono font-bold text-orange-400 hover:bg-orange-500/25 transition active:scale-95">
                          Revive
                        </button>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-[var(--fg-06)]">
                <button onClick={() => { setEditHabit(detailHabit); setDetailHabit(null); }}
                  className="flex-1 py-2 rounded-lg border border-[var(--fg-10)] text-xs font-mono text-[var(--fg-50)] flex items-center justify-center gap-1.5 hover:bg-[var(--fg-04)] transition">
                  <Edit3 size={12} /> Edit
                </button>
                <button onClick={() => deleteHabit(detailHabit.id)}
                  className="px-4 py-2 rounded-lg border border-red-500/15 text-xs font-mono text-red-400/50 flex items-center justify-center gap-1.5 hover:bg-red-500/[0.05] transition">
                  <Trash2 size={12} /> Archive
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Edit modal ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {editHabit && (
          <motion.div className="fixed inset-0 z-50 flex items-end justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/60" onClick={() => setEditHabit(null)} />
            <motion.div className="relative w-full max-w-md bg-[var(--bg-elevated)] border-t border-[var(--fg-10)] rounded-t-2xl p-5 space-y-3"
              initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }}>
              <p className="text-[9px] font-mono tracking-widest text-[var(--fg-25)]">EDIT HABIT</p>
              <input type="text" value={editHabit.name} onChange={(e) => setEditHabit({ ...editHabit, name: e.target.value })}
                className="w-full bg-[var(--fg-04)] border border-[var(--fg-10)] rounded-lg px-3 py-2 text-sm text-[var(--fg-80)] outline-none focus:border-[var(--fg-20)]" />
              <div className="flex gap-1.5 flex-wrap">
                {HABIT_ICONS.map((icon) => (
                  <button key={icon} onClick={() => setEditHabit({ ...editHabit, icon })}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-base transition ${
                      editHabit.icon === icon ? "bg-[var(--fg-10)] border border-[var(--fg-20)]" : "bg-[var(--fg-02)] border border-transparent"
                    }`}>{icon}</button>
                ))}
              </div>
              <div className="flex gap-1.5">
                {ROUTINES.map((r) => {
                  const Icon = r.icon;
                  return (
                    <button key={r.key} onClick={() => setEditHabit({ ...editHabit, routine: r.key as "morning" | "evening" | "anytime" })}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-mono flex items-center justify-center gap-1 transition ${
                        editHabit.routine === r.key ? "border bg-[var(--fg-08)] border-[var(--fg-20)] text-[var(--fg-80)]" : "border border-[var(--fg-06)] text-[var(--fg-25)]"
                      }`}><Icon size={10} /> {r.label}</button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <button onClick={() => updateHabit(editHabit)}
                  className="flex-1 py-2 rounded-lg text-sm font-mono font-bold bg-[rgb(var(--accent-rgb)/0.2)] border border-[rgb(var(--accent-rgb)/0.3)] text-[var(--fg-80)] active:scale-95 transition">
                  Save
                </button>
                <button onClick={() => setEditHabit(null)}
                  className="px-4 py-2 rounded-lg text-sm font-mono text-[var(--fg-30)] border border-[var(--fg-10)] active:scale-95 transition">
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Toasts ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {lootDrop && <LootDropToast drop={lootDrop} onClose={() => setLootDrop(null)} />}
      </AnimatePresence>
      <AnimatePresence>
        {milestoneToast && <MilestoneToast {...milestoneToast} username={profile?.username} onClose={() => setMilestoneToast(null)} />}
      </AnimatePresence>
      <AnimatePresence>
        {undoAction && <UndoToast message={undoAction.message} onUndo={undoAction.undo} onClose={() => setUndoAction(null)} />}
      </AnimatePresence>
    </main>
  );
}
