"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight, ChevronLeft, Check, Lock,
  BookOpen, Zap, Target, Play, Star,
  Search, Filter, Swords, Flame, Link2,
  Clock, ChevronDown, ChevronUp, Award, X, Sparkles,
  Volume2, VolumeX, Users, Pause, SkipForward, Footprints, Ruler, AlertTriangle, FlipHorizontal, Camera,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import SwipeNav from "../../components/ui/swipe-nav";
import { useModules } from "../../lib/useModules";
import { useAuth } from "../../lib/AuthProvider";
import { getTrainSections } from "../../lib/navPills";
import { supabase } from "../../lib/supabase";
import {
  DISCIPLINES as OLD_DISCIPLINES,
  DISCIPLINE_ORIGINS,
  PHASE1_DISCIPLINES,
  SESSION_TYPE_LABELS,
  type DisciplineId,
  type DisciplineOrigin,
  type SessionType,
} from "../../lib/martialArtsEngine";
import {
  DISCIPLINES,
  fetchCurriculumLevels,
  fetchLessons,
  fetchLessonTechniques,
  fetchUserLessonProgress,
  fetchAllTechniques,
  fetchPracticeStats,
  fetchTechniqueMasteryData,
  completeLesson,
  getLessonStatus,
  getXpForLesson,
  MASTERY_TIERS,
  type Discipline,
  type CurriculumLevel,
  type Lesson,
  type LessonTechnique,
  type Technique,
  type UserLessonProgress,
  type MasteryTier,
  type TechniqueMastery,
} from "../../lib/maCurriculum";
import { getAnimation, buildComboAnimation, getMetronomeFrameTiming, COMBO_PRESETS, BONES, midpoint, type Skeleton, type Vec2, type TechniqueAnim, type AngleMarker, type MistakePose, type ComboFrame } from "../../lib/techniqueAnimations";
import { analyzeRecovery, type MuscleRecoveryData } from "../../lib/muscleRecovery";
import { getMaExerciseType } from "../../lib/formGuides";
import dynamic from "next/dynamic";

const FormCheckCamera = dynamic(() => import("../../components/FormCheckCamera"), { ssr: false });

// ═══════════════════════════════════════════════
// TYPES & HELPERS
// ═══════════════════════════════════════════════

type View = "hub" | "discipline" | "lesson" | "library" | "technique";

const DISCIPLINE_ORDER: Discipline[] = ["boxing", "muay_thai", "bjj", "kalaripayattu", "shaolin", "karate", "taekwondo", "mma"];

function DisciplineIcon({ discipline, size = 16 }: { discipline: Discipline; size?: number }) {
  return <Swords size={size} />;
}

const DAILY_CHALLENGES: { title: string; description: string; duration: number; xp: number; type: "speed" | "endurance" | "technique" | "power" }[] = [
  { title: "Shadow Round Sprint", description: "3-minute non-stop shadow boxing — no breaks", duration: 3, xp: 30, type: "endurance" },
  { title: "Jab Ladder", description: "1 jab, 2 jabs, 3… up to 10, then back down", duration: 5, xp: 40, type: "speed" },
  { title: "Stance Hold", description: "Hold fighting stance for 2 minutes each side", duration: 4, xp: 25, type: "technique" },
  { title: "Power Combo", description: "Cross-hook-uppercut × 50 reps, max power", duration: 6, xp: 50, type: "power" },
  { title: "Defense Drill", description: "Slip-roll-slip for 3 rounds, 1 min each", duration: 4, xp: 35, type: "technique" },
  { title: "Footwork Figure-8", description: "Move in figure-8 pattern for 3 minutes", duration: 3, xp: 30, type: "speed" },
  { title: "Burnout Round", description: "Max punches in 30 seconds × 4 sets", duration: 4, xp: 45, type: "power" },
  { title: "Guard Check", description: "Shadow box 3 rounds, hands must touch chin between every combo", duration: 5, xp: 35, type: "technique" },
  { title: "1-2 Speed Test", description: "How many jab-cross combos in 60 seconds?", duration: 2, xp: 25, type: "speed" },
  { title: "Knee Storm", description: "Alternating knees × 100. Go!", duration: 4, xp: 40, type: "endurance" },
  { title: "Elbow Blitz", description: "Horizontal elbows, alternating, 3 × 1-min rounds", duration: 4, xp: 35, type: "power" },
  { title: "Teep Ladder", description: "Front kicks: 10 left, 10 right, repeat 3×", duration: 5, xp: 40, type: "technique" },
  { title: "Combo Builder", description: "Create and drill your own 5-strike combo × 30 reps", duration: 6, xp: 50, type: "technique" },
  { title: "Cardio Kick", description: "Roundhouse kicks alternating legs, 3 × 1-min rounds", duration: 5, xp: 45, type: "endurance" },
];

function haptic(pattern: number | number[] = 50) {
  try { navigator?.vibrate?.(pattern); } catch {}
}

function playBell(type: "round" | "rest" | "finish" = "round") {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "round") {
      osc.frequency.value = 830;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } else if (type === "rest") {
      osc.frequency.value = 440;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.value = 440;
      osc2.type = "sine";
      gain2.gain.setValueAtTime(0.25, ctx.currentTime + 0.35);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.65);
      osc2.start(ctx.currentTime + 0.35);
      osc2.stop(ctx.currentTime + 0.65);
    } else {
      osc.frequency.value = 1046;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.8);
    }
    setTimeout(() => ctx.close(), 1500);
  } catch {}
}

function getDailyChallenge(): typeof DAILY_CHALLENGES[number] {
  const now = new Date();
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  );
  return DAILY_CHALLENGES[dayOfYear % DAILY_CHALLENGES.length];
}

function getWeekDates(): { date: string; dayName: string; isToday: boolean }[] {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  const days: { date: string; dayName: string; isToday: boolean }[] = [];
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    days.push({
      date: dateStr,
      dayName: dayNames[i],
      isToday: d.toDateString() === now.toDateString(),
    });
  }
  return days;
}

// MA muscles_used → gym body_segment mapping for recovery cross-ref
const MA_MUSCLE_TO_SEGMENT: Record<string, string> = {
  quads: "Legs", hamstrings: "Legs", calves: "Legs",
  "hip flexors": "Legs", "hip abductors": "Legs", "hip rotators": "Legs", hips: "Legs",
  glutes: "Glutes", core: "Core", obliques: "Core", "lower back": "Back",
  shoulders: "Shoulders", traps: "Traps", biceps: "Biceps",
  triceps: "Triceps", forearms: "Forearms",
};

function getRecoveryWarnings(
  techniques: { muscles_used: string[] }[],
  recovery: Record<string, MuscleRecoveryData>,
): { segment: string; pct: number; status: string; muscles: string[] }[] {
  const hits = new Map<string, string[]>();
  for (const t of techniques) {
    for (const m of t.muscles_used) {
      const seg = MA_MUSCLE_TO_SEGMENT[m.toLowerCase()];
      if (!seg) continue;
      const rd = recovery[seg];
      if (rd && (rd.status === "fatigued" || rd.status === "overtrained" || rd.status === "moderate")) {
        if (!hits.has(seg)) hits.set(seg, []);
        if (!hits.get(seg)!.includes(m)) hits.get(seg)!.push(m);
      }
    }
  }
  return Array.from(hits.entries())
    .map(([seg, muscles]) => ({
      segment: seg,
      pct: recovery[seg].recoveryPct,
      status: recovery[seg].status,
      muscles,
    }))
    .sort((a, b) => a.pct - b.pct);
}

// ═══════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════

export default function MartialArtsPage() {
  const { enabledKeys } = useModules();
  const { user } = useAuth();
  const router = useRouter();

  const [view, setView] = useState<View>("hub");
  const [selectedDiscipline, setSelectedDiscipline] = useState<Discipline | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [selectedTechnique, setSelectedTechnique] = useState<Technique | null>(null);
  const [continueInfo, setContinueInfo] = useState<{ lesson: Lesson; discipline: Discipline } | null>(null);

  function goToDiscipline(d: Discipline) {
    setSelectedDiscipline(d);
    setView("discipline");
  }

  function goToLesson(lesson: Lesson) {
    setSelectedLesson(lesson);
    setView("lesson");
  }

  function goToTechnique(tech: Technique) {
    setSelectedTechnique(tech);
    setView("technique");
  }

  function goToLibrary() {
    setView("library");
  }

  function goBack() {
    if (view === "technique") {
      setView("library");
    } else if (view === "lesson") {
      setView("discipline");
    } else if (view === "discipline" || view === "library") {
      setView("hub");
    }
  }

  const showPill = continueInfo && view !== "lesson" && view !== "hub";

  return (
    <main className="min-h-screen pb-24 md:pb-10 relative"
      style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <div className="relative z-10 max-w-xl mx-auto px-4 pt-6 space-y-4">
        {view === "hub" && <SwipeNav sections={getTrainSections(enabledKeys)} />}

        <AnimatePresence mode="wait">
          {view === "hub" && (
            <HubView
              key="hub"
              userId={user?.id}
              onSelectDiscipline={goToDiscipline}
              onOpenLibrary={goToLibrary}
              onStartLesson={(disc) => goToDiscipline(disc)}
              onContinueInfo={setContinueInfo}
            />
          )}
          {view === "discipline" && selectedDiscipline && (
            <DisciplinePath
              key={`disc-${selectedDiscipline}`}
              discipline={selectedDiscipline}
              userId={user?.id}
              onBack={goBack}
              onSelectLesson={goToLesson}
              onSwitchDiscipline={goToDiscipline}
            />
          )}
          {view === "lesson" && selectedLesson && selectedDiscipline && (
            <LessonView
              key={`lesson-${selectedLesson.id}`}
              lesson={selectedLesson}
              discipline={selectedDiscipline}
              userId={user?.id}
              onBack={goBack}
              onViewTechnique={goToTechnique}
            />
          )}
          {view === "library" && (
            <TechniqueLibrary
              key="library"
              userId={user?.id}
              onBack={goBack}
              onViewTechnique={goToTechnique}
            />
          )}
          {view === "technique" && selectedTechnique && (
            <TechniqueDetail
              key={`tech-${selectedTechnique.id}`}
              technique={selectedTechnique}
              onBack={goBack}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Floating "Continue Training" pill (item 45) */}
      <AnimatePresence>
        {showPill && continueInfo && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={() => {
              setSelectedDiscipline(continueInfo.discipline);
              setSelectedLesson(continueInfo.lesson);
              setView("lesson");
            }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-2.5 rounded-full shadow-lg transition-all active:scale-[0.96]"
            style={{
              background: `rgb(${DISCIPLINES[continueInfo.discipline].colorRgb})`,
              color: "white",
              boxShadow: `0 4px 20px rgb(${DISCIPLINES[continueInfo.discipline].colorRgb} / 0.4)`,
            }}>
            <Play size={14} fill="white" />
            <span className="text-[12px] font-bold">Continue: {continueInfo.lesson.title}</span>
          </motion.button>
        )}
      </AnimatePresence>
    </main>
  );
}

// ═══════════════════════════════════════════════
// HUB VIEW — image cards + history + learn links
// ═══════════════════════════════════════════════

const CURRICULUM_DISCIPLINES: Discipline[] = ["boxing", "muay_thai"];

function fmtMinutes(secs: number): string {
  const m = Math.floor(secs / 60);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

function computeStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const unique = [...new Set(dates)].sort((a, b) => b.localeCompare(a));
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
  if (unique[0] !== todayStr && unique[0] !== yesterdayStr) return 0;
  let streak = 1;
  for (let i = 1; i < unique.length; i++) {
    const prev = new Date(unique[i - 1] + "T00:00:00");
    const curr = new Date(unique[i] + "T00:00:00");
    const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

function HubView({ userId, onSelectDiscipline, onOpenLibrary, onStartLesson, onContinueInfo }: {
  userId?: string;
  onSelectDiscipline: (d: Discipline) => void;
  onOpenLibrary: () => void;
  onStartLesson?: (discipline: Discipline) => void;
  onContinueInfo?: (info: { lesson: Lesson; discipline: Discipline } | null) => void;
}) {
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [disciplineStats, setDisciplineStats] = useState<Record<string, { sessions: number; hours: number }>>({});
  const [disciplineStreaks, setDisciplineStreaks] = useState<Record<string, number>>({});
  const [activeDiscipline, setActiveDiscipline] = useState<string | null>(null);
  const [nextLesson, setNextLesson] = useState<{ lesson: Lesson; discipline: Discipline; levelTitle: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    Promise.all([
      supabase.from("ma_sessions").select("*").eq("user_id", userId).order("date", { ascending: false }).limit(10),
      supabase.from("ma_sessions").select("discipline, duration_seconds, date").eq("user_id", userId).eq("status", "completed"),
      supabase.from("ma_user_lessons").select("lesson_id, completed_at, ma_lessons!inner(discipline)").eq("user_id", userId),
    ]).then(async ([sessionsRes, statsRes, lessonProgressRes]) => {
      setRecentSessions(sessionsRes.data ?? []);
      const stats: Record<string, { sessions: number; hours: number }> = {};
      const datesByDisc: Record<string, string[]> = {};
      for (const s of statsRes.data ?? []) {
        if (!stats[s.discipline]) stats[s.discipline] = { sessions: 0, hours: 0 };
        stats[s.discipline].sessions++;
        stats[s.discipline].hours += (s.duration_seconds || 0) / 3600;
        if (!datesByDisc[s.discipline]) datesByDisc[s.discipline] = [];
        datesByDisc[s.discipline].push(s.date);
      }
      setDisciplineStats(stats);
      const streaks: Record<string, number> = {};
      for (const [disc, dates] of Object.entries(datesByDisc)) {
        streaks[disc] = computeStreak(dates);
      }
      setDisciplineStreaks(streaks);

      const lpData = lessonProgressRes.data ?? [];
      const started = new Set<string>();
      for (const row of lpData) {
        const disc = (row as any).ma_lessons?.discipline;
        if (disc) started.add(disc);
      }
      const allCompleted = new Map<string, boolean>();
      for (const disc of started) {
        const discLessons = lpData.filter((r: any) => r.ma_lessons?.discipline === disc);
        const hasIncomplete = discLessons.some((r: any) => !r.completed_at);
        allCompleted.set(disc, !hasIncomplete && discLessons.length > 0);
      }
      const active = [...started].find((disc) => !allCompleted.get(disc)) ?? null;
      setActiveDiscipline(active);

      if (active && CURRICULUM_DISCIPLINES.includes(active as Discipline)) {
        try {
          const disc = active as Discipline;
          const levels = await fetchCurriculumLevels(disc);
          const progress = await fetchUserLessonProgress(userId, disc);
          for (const level of levels) {
            const lessons = await fetchLessons(level.id);
            const next = lessons.find((l) => getLessonStatus(l, progress, lessons) === "current");
            if (next) {
              setNextLesson({ lesson: next, discipline: disc, levelTitle: level.title });
              onContinueInfo?.({ lesson: next, discipline: disc });
              break;
            }
          }
        } catch {}
      }
      setLoading(false);
    });
  }, [userId]);

  const totalSessions = Object.values(disciplineStats).reduce((s, v) => s + v.sessions, 0);
  const totalHours = Object.values(disciplineStats).reduce((s, v) => s + v.hours, 0);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="h-3 w-20 rounded animate-pulse" style={{ background: "var(--fg-06)" }} />
          <div className="h-7 w-52 rounded animate-pulse" style={{ background: "var(--fg-06)" }} />
        </div>
        <div className="h-16 rounded-2xl animate-pulse" style={{ background: "var(--fg-06)" }} />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: "var(--fg-06)" }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="space-y-5">
      {/* Header */}
      <div>
        <p className="text-[8px] font-mono tracking-widest uppercase mb-1.5"
          style={{ color: "var(--fg-20)" }}>Martial Arts</p>
        <h1 className="text-[22px] font-bold leading-tight"
          style={{ color: "var(--fg-90)" }}>Choose Your Discipline</h1>
      </div>

      {/* Today's Training — one-tap next lesson card */}
      {nextLesson && (
        <motion.button
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => onStartLesson?.(nextLesson.discipline)}
          className="w-full text-left rounded-2xl overflow-hidden transition-all active:scale-[0.98] relative"
          style={{
            background: `linear-gradient(135deg, rgb(${DISCIPLINES[nextLesson.discipline].colorRgb} / 0.12), rgb(${DISCIPLINES[nextLesson.discipline].colorRgb} / 0.04))`,
            border: `1px solid rgb(${DISCIPLINES[nextLesson.discipline].colorRgb} / 0.2)`,
          }}
        >
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: `rgb(${DISCIPLINES[nextLesson.discipline].colorRgb} / 0.15)` }}>
                <Play size={14} style={{ color: `rgb(${DISCIPLINES[nextLesson.discipline].colorRgb})` }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[7px] font-mono tracking-widest uppercase"
                  style={{ color: `rgb(${DISCIPLINES[nextLesson.discipline].colorRgb})` }}>
                  Today&apos;s Training
                </p>
                <p className="text-[13px] font-bold truncate" style={{ color: "var(--fg-90)" }}>
                  {nextLesson.lesson.title}
                </p>
              </div>
              <ChevronRight size={16} style={{ color: `rgb(${DISCIPLINES[nextLesson.discipline].colorRgb})` }} />
            </div>
            <div className="flex items-center gap-3 text-[9px] font-mono"
              style={{ color: "var(--fg-40)" }}>
              <span>{DISCIPLINES[nextLesson.discipline].name}</span>
              <span>·</span>
              <span>{nextLesson.levelTitle}</span>
              <span>·</span>
              <span>{nextLesson.lesson.duration_min} min</span>
              <span>·</span>
              <span>{getXpForLesson(nextLesson.lesson)} XP</span>
            </div>
          </div>
        </motion.button>
      )}

      {/* Daily Challenge */}
      {(() => {
        const challenge = getDailyChallenge();
        const typeColors: Record<string, string> = {
          speed: "59 130 246", endurance: "234 179 8", technique: "139 92 246", power: "239 68 68",
        };
        const typeIcons: Record<string, typeof Zap> = {
          speed: Zap, endurance: Flame, technique: Target, power: Swords,
        };
        const cRgb = typeColors[challenge.type] ?? "139 92 246";
        const TypeIcon = typeIcons[challenge.type] ?? Target;
        return (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border p-4"
            style={{
              borderColor: `rgb(${cRgb} / 0.15)`,
              background: `linear-gradient(135deg, rgb(${cRgb} / 0.06), transparent)`,
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `rgb(${cRgb} / 0.12)` }}>
                <TypeIcon size={16} style={{ color: `rgb(${cRgb})` }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[7px] font-mono tracking-widest uppercase"
                    style={{ color: `rgb(${cRgb})` }}>
                    Daily Challenge
                  </p>
                  <span className="text-[7px] font-mono px-1.5 py-0.5 rounded-full capitalize"
                    style={{ background: `rgb(${cRgb} / 0.1)`, color: `rgb(${cRgb} / 0.8)` }}>
                    {challenge.type}
                  </span>
                </div>
                <p className="text-[13px] font-bold mt-0.5" style={{ color: "var(--fg-80)" }}>
                  {challenge.title}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--fg-35)" }}>
                  {challenge.description}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3 text-[9px] font-mono" style={{ color: "var(--fg-30)" }}>
              <span><Clock size={9} className="inline mr-0.5" style={{ verticalAlign: "-1px" }} />{challenge.duration} min</span>
              <span><Zap size={9} className="inline mr-0.5" style={{ verticalAlign: "-1px" }} />{challenge.xp} XP</span>
            </div>
          </motion.div>
        );
      })()}

      {/* Aggregate stats — horizontal strip */}
      {totalSessions > 0 && (
        <div className="flex items-center rounded-2xl border divide-x overflow-hidden"
          style={{ borderColor: "var(--fg-06)", background: "var(--fg-03)" }}>
          {[
            { label: "SESSIONS", value: totalSessions, icon: <Flame size={11} /> },
            { label: "HOURS", value: totalHours.toFixed(1), icon: <Clock size={11} /> },
            { label: "ARTS", value: Object.keys(disciplineStats).length, icon: <Swords size={11} /> },
          ].map(s => (
            <div key={s.label} className="flex-1 flex items-center gap-2 px-3 py-3"
              style={{ borderColor: "var(--fg-06)" }}>
              <span style={{ color: "var(--fg-20)" }}>{s.icon}</span>
              <div>
                <p className="text-lg font-black leading-none" style={{ color: "var(--fg-80)" }}>{s.value}</p>
                <p className="text-[7px] font-mono tracking-widest mt-0.5" style={{ color: "var(--fg-20)" }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cross-discipline achievements (item 79) */}
      {(() => {
        const trainedDiscs = Object.keys(disciplineStats);
        const trainedCount = trainedDiscs.length;
        if (trainedCount === 0) return null;
        const achievements: { icon: string; label: string; earned: boolean; desc: string }[] = [
          { icon: "🥊", label: "First Strike", earned: totalSessions >= 1, desc: "Complete your first session" },
          { icon: "⚔️", label: "Cross-Trainer", earned: trainedCount >= 2, desc: "Train in 2+ disciplines" },
          { icon: "🔥", label: "Dedicated", earned: totalSessions >= 10, desc: "Complete 10 sessions" },
          { icon: "🏆", label: "Renaissance Fighter", earned: trainedCount >= 4, desc: "Train in 4+ disciplines" },
        ];
        const earnedCount = achievements.filter(a => a.earned).length;
        if (earnedCount === 0) return null;
        return (
          <div className="rounded-2xl border p-4 space-y-3" style={{ borderColor: "var(--fg-06)", background: "var(--fg-03)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award size={14} style={{ color: "var(--fg-40)" }} />
                <p className="text-[11px] font-bold" style={{ color: "var(--fg-60)" }}>Achievements</p>
              </div>
              <span className="text-[9px] font-mono" style={{ color: "var(--fg-20)" }}>{earnedCount}/{achievements.length}</span>
            </div>
            <div className="flex gap-2">
              {achievements.map(a => (
                <div key={a.label} className="flex-1 text-center rounded-xl py-2 px-1"
                  style={{ background: a.earned ? "var(--fg-04)" : "var(--fg-02)", opacity: a.earned ? 1 : 0.4 }}>
                  <div className="text-lg">{a.icon}</div>
                  <p className="text-[8px] font-mono mt-1 leading-tight" style={{ color: a.earned ? "var(--fg-60)" : "var(--fg-20)" }}>
                    {a.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Discipline cards with images */}
      <div className="space-y-3">
        {PHASE1_DISCIPLINES.map((dId, i) => {
          const d = OLD_DISCIPLINES[dId];
          if (!d) return null;
          const origin = DISCIPLINE_ORIGINS[dId];
          const stats = disciplineStats[dId];
          const hasCurriculum = CURRICULUM_DISCIPLINES.includes(dId as Discipline);
          const categoryLabel = d.category === "striking" ? "Striking"
            : d.category === "grappling" ? "Grappling"
            : d.category === "traditional" ? "Traditional"
            : d.category === "mixed" ? "Mixed" : d.category;
          const streak = disciplineStreaks[dId] ?? 0;
          const isActive = activeDiscipline === dId;

          return (
            <motion.button
              key={dId}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => onSelectDiscipline(dId as Discipline)}
              className="w-full text-left rounded-2xl overflow-hidden transition-all group relative"
              style={{
                border: isActive ? `2px solid rgb(${d.colorRgb})` : "1px solid var(--fg-06)",
                boxShadow: isActive ? `0 0 20px rgb(${d.colorRgb} / 0.15)` : undefined,
              }}
            >
              <div className="relative h-32 overflow-hidden">
                {d.imageUrl && (
                  <Image
                    src={d.imageUrl}
                    alt={d.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                    style={{ transform: "scale(1.15)", transformOrigin: "center 40%" }}
                    sizes="(max-width: 640px) 100vw, 576px"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <h3 className="text-base font-bold text-white">{d.name}</h3>
                      <p className="text-[10px] text-white/60 font-mono mt-0.5">
                        {origin?.tagline ?? ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {stats && stats.sessions > 0 && (
                        <span className="text-[8px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white/70 backdrop-blur-sm">
                          {stats.sessions} sessions
                        </span>
                      )}
                      {isActive ? (
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full backdrop-blur-sm text-white text-[9px] font-bold"
                          style={{ background: `rgb(${d.colorRgb} / 0.7)` }}>
                          <Play size={9} /> Continue
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                          <ChevronRight size={14} className="text-white/80" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {/* Category + belt + streak badges */}
                <div className="absolute top-3 right-3 flex gap-1.5">
                  {streak >= 2 && (
                    <span className="flex items-center gap-0.5 text-[8px] font-bold px-2 py-0.5 rounded-full bg-orange-500/80 text-white backdrop-blur-sm">
                      <Flame size={9} /> {streak}-day
                    </span>
                  )}
                  <span className="text-[8px] font-mono px-2 py-0.5 rounded-full bg-black/40 text-white/70 backdrop-blur-sm">
                    {categoryLabel}
                  </span>
                  {d.hasBelts && (
                    <span className="text-[8px] font-mono px-2 py-0.5 rounded-full bg-black/40 text-white/70 backdrop-blur-sm">
                      Belts
                    </span>
                  )}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onOpenLibrary}
          className="rounded-2xl border p-4 text-left transition-all active:scale-[0.97]"
          style={{ borderColor: "var(--fg-06)", background: "var(--fg-03)" }}
        >
          <BookOpen size={18} style={{ color: "var(--fg-40)" }} />
          <p className="text-xs font-bold mt-2" style={{ color: "var(--fg-80)" }}>
            Technique Library
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: "var(--fg-30)" }}>
            Browse all moves
          </p>
        </button>
        <div
          className="rounded-2xl border p-4 text-left"
          style={{ borderColor: "var(--fg-06)", background: "var(--fg-03)", opacity: 0.5 }}
        >
          <Target size={18} style={{ color: "var(--fg-40)" }} />
          <p className="text-xs font-bold mt-2" style={{ color: "var(--fg-80)" }}>
            Practice Mode
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: "var(--fg-30)" }}>
            Coming soon
          </p>
        </div>
      </div>

      {/* Session history — horizontal timeline */}
      {recentSessions.length > 0 && (
        <div className="space-y-2">
          <p className="text-[9px] font-mono tracking-widest px-1"
            style={{ color: "var(--fg-15)" }}>RECENT SESSIONS</p>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4" style={{ scrollbarWidth: "none" }}>
            {recentSessions.slice(0, 8).map((s, i) => {
              const d = OLD_DISCIPLINES[s.discipline as DisciplineId];
              const type = SESSION_TYPE_LABELS[s.session_type as SessionType];
              const cRgb = d?.colorRgb ?? "139 92 246";
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="shrink-0 w-32 rounded-xl border p-3 flex flex-col gap-2"
                  style={{ borderColor: "var(--fg-06)", background: "var(--fg-02)" }}
                >
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                      style={{ background: `rgb(${cRgb} / 0.1)` }}>
                      <span className="text-[10px]">{d?.emoji ?? "⚔️"}</span>
                    </div>
                    <p className="text-[9px] font-bold truncate" style={{ color: "var(--fg-60)" }}>
                      {d?.name ?? s.discipline}
                    </p>
                  </div>
                  <p className="text-[8px] font-mono" style={{ color: "var(--fg-25)" }}>
                    {type?.name ?? s.session_type}
                  </p>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-[8px] font-mono" style={{ color: "var(--fg-20)" }}>
                      {fmtMinutes(s.duration_seconds ?? 0)}
                    </span>
                    <span className="text-[8px] font-bold font-mono" style={{ color: `rgb(${cRgb})` }}>
                      +{s.xp_earned}
                    </span>
                  </div>
                  <p className="text-[7px] font-mono" style={{ color: "var(--fg-12)" }}>
                    {s.date}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════
// DISCIPLINE PATH — curriculum levels & lessons
// ═══════════════════════════════════════════════

function DisciplinePath({ discipline, userId, onBack, onSelectLesson, onSwitchDiscipline }: {
  discipline: Discipline;
  userId?: string;
  onBack: () => void;
  onSelectLesson: (lesson: Lesson) => void;
  onSwitchDiscipline?: (d: Discipline) => void;
}) {
  const oldD = OLD_DISCIPLINES[discipline as DisciplineId];
  const d = DISCIPLINES[discipline] ?? {
    name: oldD?.name ?? discipline,
    colorRgb: oldD?.colorRgb ?? "100 100 100",
    origin: "",
    description: "",
    soloFriendly: true,
  };
  const origin = DISCIPLINE_ORIGINS[discipline as DisciplineId];
  const [activeTab, setActiveTab] = useState<"learn" | "practice" | "origins">("learn");
  const [historyStoryExpanded, setHistoryStoryExpanded] = useState(false);
  const [levels, setLevels] = useState<CurriculumLevel[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<Map<string, UserLessonProgress>>(new Map());
  const [loading, setLoading] = useState(true);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [trainingDates, setTrainingDates] = useState<Set<string>>(new Set());
  const [recoveryWarnings, setRecoveryWarnings] = useState<{ segment: string; pct: number; status: string; muscles: string[] }[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pullState, setPullState] = useState<"idle" | "pulling" | "refreshing">("idle");
  const [pullY, setPullY] = useState(0);
  const pullRef = useRef({ startY: 0, scrollTop: 0 });
  const contentRef = useRef<HTMLDivElement>(null);
  const [onboardingDismissed, setOnboardingDismissed] = useState(() => {
    try { return localStorage.getItem(`ma_onboarding_${discipline}`) === "1"; } catch { return false; }
  });

  const discIdx = DISCIPLINE_ORDER.indexOf(discipline);
  const swipeRef = { startX: 0, startY: 0 };
  function handleSwipeStart(e: React.TouchEvent) {
    swipeRef.startX = e.touches[0].clientX;
    swipeRef.startY = e.touches[0].clientY;
  }
  function handleSwipeEnd(e: React.TouchEvent) {
    if (!onSwitchDiscipline) return;
    const dx = e.changedTouches[0].clientX - swipeRef.startX;
    const dy = e.changedTouches[0].clientY - swipeRef.startY;
    if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx) * 0.7) return;
    if (dx < 0 && discIdx < DISCIPLINE_ORDER.length - 1) {
      haptic(30);
      onSwitchDiscipline(DISCIPLINE_ORDER[discIdx + 1]);
    } else if (dx > 0 && discIdx > 0) {
      haptic(30);
      onSwitchDiscipline(DISCIPLINE_ORDER[discIdx - 1]);
    }
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchCurriculumLevels(discipline),
      ...(userId ? [fetchUserLessonProgress(userId, discipline)] : []),
      ...(userId ? [supabase.from("ma_sessions").select("date").eq("user_id", userId).eq("discipline", discipline)] : []),
      ...(userId ? [supabase.from("ma_user_lessons").select("completed_at, ma_lessons!inner(discipline)").eq("user_id", userId).eq("ma_lessons.discipline", discipline).not("completed_at", "is", null)] : []),
    ]).then(async ([levelsData, progressData, sessionsRes, lessonDatesRes]) => {
      setLevels(levelsData);
      if (progressData) setProgress(progressData as Map<string, UserLessonProgress>);

      const dates = new Set<string>();
      if (sessionsRes && (sessionsRes as any).data) {
        for (const s of (sessionsRes as any).data) if (s.date) dates.add(s.date);
      }
      if (lessonDatesRes && (lessonDatesRes as any).data) {
        for (const r of (lessonDatesRes as any).data) {
          if (r.completed_at) {
            const d = new Date(r.completed_at);
            dates.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
          }
        }
      }
      setTrainingDates(dates);

      if (levelsData.length > 0) {
        const firstLevel = levelsData[0];
        const lessonsData = await fetchLessons(firstLevel.id);
        setLessons(lessonsData);

        const currentLesson = lessonsData.find(
          (l) => getLessonStatus(l, progressData as Map<string, UserLessonProgress> ?? new Map(), lessonsData) === "current"
        );
        if (currentLesson) setExpandedWeek(currentLesson.week);
        else setExpandedWeek(1);

        if (userId && currentLesson) {
          Promise.all([
            analyzeRecovery(userId),
            fetchLessonTechniques(currentLesson.id),
          ]).then(([recoveryResult, techs]) => {
            const techniques = techs.map(lt => lt.technique).filter(Boolean) as Technique[];
            if (techniques.length > 0) {
              setRecoveryWarnings(getRecoveryWarnings(techniques, recoveryResult.data));
            }
          }).catch(() => {});
        }
      }
      setLoading(false);
    });
  }, [discipline, userId, refreshKey]);

  const doRefresh = useCallback(() => {
    setPullState("refreshing");
    setRefreshKey(k => k + 1);
    setTimeout(() => { setPullState("idle"); setPullY(0); }, 800);
  }, []);

  const handlePullStart = useCallback((e: React.TouchEvent) => {
    const el = contentRef.current;
    pullRef.current = { startY: e.touches[0].clientY, scrollTop: el?.scrollTop ?? 0 };
  }, []);

  const handlePullMove = useCallback((e: React.TouchEvent) => {
    if (pullState === "refreshing") return;
    const el = contentRef.current;
    if (el && el.scrollTop > 2) return;
    const dy = e.touches[0].clientY - pullRef.current.startY;
    if (dy > 0 && pullRef.current.scrollTop <= 0) {
      setPullState("pulling");
      setPullY(Math.min(dy * 0.4, 80));
    }
  }, [pullState]);

  const handlePullEnd = useCallback(() => {
    if (pullState === "pulling") {
      if (pullY >= 50) {
        haptic(20);
        doRefresh();
      } else {
        setPullState("idle");
        setPullY(0);
      }
    }
  }, [pullState, pullY, doRefresh]);

  const completedLessonIds = useMemo(() =>
    lessons.filter(l => progress.has(l.id) && progress.get(l.id)!.completed_at).map(l => l.id),
    [lessons, progress]
  );
  const completedCount = completedLessonIds.length;

  const weeks = useMemo(() => {
    const wMap = new Map<number, Lesson[]>();
    for (const l of lessons) {
      if (!wMap.has(l.week)) wMap.set(l.week, []);
      wMap.get(l.week)!.push(l);
    }
    return Array.from(wMap.entries()).sort((a, b) => a[0] - b[0]);
  }, [lessons]);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="space-y-4" ref={contentRef}
      onTouchStart={handlePullStart} onTouchMove={handlePullMove} onTouchEnd={handlePullEnd}>
      {/* Pull-to-refresh indicator (item 50) */}
      <AnimatePresence>
        {pullState !== "idle" && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: pullY, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} className="flex items-center justify-center -mx-4 -mt-4 overflow-hidden">
            <motion.div
              animate={pullState === "refreshing" ? { rotate: 360 } : { rotate: pullY * 3 }}
              transition={pullState === "refreshing" ? { repeat: Infinity, duration: 0.6, ease: "linear" } : { duration: 0 }}
              className="flex items-center justify-center"
              style={{ width: 28, height: 28 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke={`rgb(${d.colorRgb})`} strokeWidth="2.5" strokeLinecap="round">
                <path d="M21 12a9 9 0 11-6.22-8.56" />
                <path d="M21 3v5h-5" />
              </svg>
            </motion.div>
            {pullY >= 50 && pullState === "pulling" && (
              <span className="text-[9px] font-bold ml-2" style={{ color: `rgb(${d.colorRgb})` }}>Release to refresh</span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Full-bleed discipline header */}
      <div className="relative -mx-4 -mt-6 overflow-hidden rounded-b-3xl" style={{ height: 180 }}
        onTouchStart={handleSwipeStart} onTouchEnd={handleSwipeEnd}>
        {oldD?.imageUrl && (
          <Image
            src={oldD.imageUrl}
            alt={d.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 576px"
          />
        )}
        <div className="absolute inset-0" style={{
          background: `linear-gradient(to top, rgb(${d.colorRgb} / 0.35), rgba(0,0,0,0.3), rgba(0,0,0,0.5))`,
        }} />
        <div className="absolute top-4 left-4 flex items-center gap-1 text-[10px] z-10 px-2 py-1 rounded-full bg-black/30 backdrop-blur-sm">
          <button onClick={onBack} className="text-white/60 active:scale-[0.97]">MA</button>
          <ChevronRight size={10} className="text-white/30" />
          <span className="text-white/90 font-semibold">{d.name}</span>
        </div>
        {/* Floating progress ring */}
        {lessons.length > 0 && (
          <div className="absolute top-4 right-4 z-10">
            <svg width="40" height="40" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
              <circle cx="20" cy="20" r="16" fill="none" stroke={`rgb(${d.colorRgb})`} strokeWidth="3"
                strokeDasharray={`${2 * Math.PI * 16}`}
                strokeDashoffset={`${2 * Math.PI * 16 * (1 - (lessons.length > 0 ? completedCount / lessons.length : 0))}`}
                strokeLinecap="round"
                transform="rotate(-90 20 20)"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white">
              {lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0}%
            </span>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
          <h1 className="text-[26px] font-bold text-white drop-shadow-lg">{d.name}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            {levels.length > 0 && levels[0].belt_name && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm"
                style={{ background: `rgb(${d.colorRgb} / 0.4)`, color: "white" }}>
                {levels[0].belt_name}
              </span>
            )}
            {origin && (
              <p className="text-[10px] font-mono text-white/60 drop-shadow-md">
                {origin.tagline}
              </p>
            )}
          </div>
          {/* Discipline dot indicator (item 47) */}
          {onSwitchDiscipline && (
            <div className="flex items-center gap-1.5 mt-2">
              {DISCIPLINE_ORDER.map((dKey, i) => (
                <button key={dKey} onClick={() => onSwitchDiscipline(dKey)}
                  className="transition-all"
                  style={{
                    width: i === discIdx ? 14 : 5,
                    height: 5,
                    borderRadius: 3,
                    background: i === discIdx ? "white" : "rgba(255,255,255,0.35)",
                  }} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--fg-04)" }}>
        {[
          { key: "learn" as const, label: "Learn", icon: <Zap size={12} /> },
          { key: "practice" as const, label: "Practice", icon: <Target size={12} /> },
          { key: "origins" as const, label: "Origins", icon: <BookOpen size={12} /> },
        ].map((tab) => (
          <button key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold transition-all"
            style={{
              background: activeTab === tab.key ? "var(--fg-08)" : "transparent",
              color: activeTab === tab.key ? "var(--fg-80)" : "var(--fg-30)",
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Training calendar — week strip */}
      {activeTab === "learn" && (
        <div className="flex items-center gap-1.5">
          {getWeekDates().map((day) => {
            const trained = trainingDates.has(day.date);
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1 py-1.5 rounded-lg transition-all"
                style={{
                  background: day.isToday ? `rgb(${d.colorRgb} / 0.08)` : "transparent",
                  border: day.isToday ? `1px solid rgb(${d.colorRgb} / 0.15)` : "1px solid transparent",
                }}>
                <span className="text-[8px] font-mono" style={{ color: day.isToday ? `rgb(${d.colorRgb})` : "var(--fg-20)" }}>
                  {day.dayName}
                </span>
                <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center"
                  style={{
                    background: trained ? `rgb(${d.colorRgb})` : day.isToday ? `rgb(${d.colorRgb} / 0.15)` : "var(--fg-06)",
                  }}>
                  {trained && <Check size={8} strokeWidth={3} style={{ color: "white" }} />}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Origins Tab ── */}
      {activeTab === "origins" && origin && (
        <motion.div key="origins" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
          {/* Story */}
          <div className="rounded-2xl border p-4 space-y-3"
            style={{ borderColor: "var(--fg-06)", background: "var(--fg-03)" }}>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `rgb(${d.colorRgb} / 0.1)` }}>
                <BookOpen size={12} style={{ color: `rgb(${d.colorRgb})` }} />
              </div>
              <div>
                <p className="text-[11px] font-semibold" style={{ color: "var(--fg-60)" }}>Origins of {d.name}</p>
                <p className="text-[8px] font-mono" style={{ color: "var(--fg-20)" }}>Est. {origin.founded} · {origin.origin}</p>
              </div>
            </div>
            <p className={`text-[12px] leading-relaxed ${!historyStoryExpanded ? "line-clamp-5" : ""}`}
              style={{ color: "var(--fg-50)" }}>
              {origin.story}
            </p>
            <button onClick={() => setHistoryStoryExpanded(!historyStoryExpanded)}
              className="text-[9px] font-mono transition"
              style={{ color: "var(--fg-30)" }}>
              {historyStoryExpanded ? "Show less" : "Read full story"}
            </button>
          </div>

          {/* Timeline */}
          {origin.eras && origin.eras.length > 0 && (
            <div className="space-y-2">
              <p className="text-[9px] font-mono tracking-widest px-1" style={{ color: "var(--fg-15)" }}>TIMELINE</p>
              <div className="space-y-0">
                {origin.eras.map((era, ei) => (
                  <div key={ei} className="flex gap-3">
                    <div className="flex flex-col items-center shrink-0">
                      <div className="w-2.5 h-2.5 rounded-full border-2 shrink-0"
                        style={{ borderColor: `rgb(${d.colorRgb})`, background: ei === origin.eras!.length - 1 ? `rgb(${d.colorRgb})` : "transparent" }} />
                      {ei < origin.eras!.length - 1 && <div className="w-px flex-1 min-h-[60px]" style={{ background: `rgb(${d.colorRgb} / 0.2)` }} />}
                    </div>
                    <div className="pb-4 flex-1 min-w-0">
                      <p className="text-[8px] font-mono tracking-widest mb-0.5" style={{ color: `rgb(${d.colorRgb} / 0.7)` }}>{era.period}</p>
                      <p className="text-[12px] font-semibold mb-1" style={{ color: "var(--fg-70)" }}>{era.title}</p>
                      {era.imageUrl && (
                        <div className="rounded-xl overflow-hidden mb-2 bg-black/20">
                          <Image src={era.imageUrl} alt={era.title} width={600} height={400} className="w-full h-auto rounded-xl" sizes="(max-width: 640px) 80vw, 400px" />
                        </div>
                      )}
                      <p className="text-[10px] leading-relaxed" style={{ color: "var(--fg-35)" }}>{era.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Philosophy */}
          <div className="rounded-2xl border border-l-2 p-4"
            style={{ borderColor: "var(--fg-06)", borderLeftColor: `rgb(${d.colorRgb} / 0.5)`, background: "var(--fg-03)" }}>
            <p className="text-[7px] font-mono tracking-widest mb-1.5" style={{ color: "var(--fg-20)" }}>PHILOSOPHY</p>
            <p className="text-[12px] italic leading-relaxed" style={{ color: "var(--fg-45)" }}>&ldquo;{origin.philosophy}&rdquo;</p>
          </div>

          {/* Key Figures */}
          {origin.keyFigures && origin.keyFigures.length > 0 && (
            <div className="space-y-2">
              <p className="text-[9px] font-mono tracking-widest px-1" style={{ color: "var(--fg-15)" }}>KEY FIGURES</p>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory" style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" as any }}>
                {origin.keyFigures.map((fig) => (
                  <FigureCard key={fig.name} fig={fig} colorRgb={d.colorRgb} />
                ))}
              </div>
            </div>
          )}

          {/* Fun fact */}
          {origin.funFact && (
            <div className="rounded-2xl border p-4 flex gap-2.5 items-start"
              style={{ borderColor: "rgb(245 158 11 / 0.1)", background: "rgb(245 158 11 / 0.05)" }}>
              <Sparkles size={14} className="mt-0.5 shrink-0" style={{ color: "rgb(245 158 11 / 0.6)" }} />
              <div>
                <p className="text-[8px] font-mono tracking-widest mb-1" style={{ color: "rgb(245 158 11 / 0.5)" }}>FUN FACT</p>
                <p className="text-[11px] leading-relaxed" style={{ color: "var(--fg-40)" }}>{origin.funFact}</p>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {activeTab === "origins" && !origin && (
        <div className="rounded-2xl border p-8 text-center" style={{ borderColor: "var(--fg-06)", background: "var(--fg-03)" }}>
          <BookOpen size={24} style={{ color: "var(--fg-20)", margin: "0 auto" }} />
          <p className="text-[11px] mt-2" style={{ color: "var(--fg-30)" }}>Origins coming soon for {d.name}</p>
        </div>
      )}

      {/* ── Practice Tab ── */}
      {activeTab === "practice" && (
        <div className="space-y-6">
          <DrillGenerator discipline={discipline} colorRgb={d.colorRgb} userId={userId} allLessons={lessons} progress={progress} />
          <CombinationChains discipline={discipline} colorRgb={d.colorRgb} userId={userId} allLessons={lessons} progress={progress} />
          {/* Mastery gap recommendations (item 80) */}
          {!loading && completedCount >= 2 && (() => {
            const lowRated = lessons
              .filter(l => {
                const p = progress.get(l.id);
                return p?.completed_at && p.self_rating != null && p.self_rating <= 3;
              })
              .sort((a, b) => (progress.get(a.id)!.self_rating ?? 0) - (progress.get(b.id)!.self_rating ?? 0))
              .slice(0, 3);
            if (lowRated.length === 0) return null;
            return (
              <div className="rounded-2xl border p-4 space-y-3" style={{ borderColor: "var(--fg-06)", background: "var(--fg-03)" }}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: "rgb(245 158 11 / 0.1)" }}>
                    <Target size={14} style={{ color: "rgb(245 158 11 / 0.7)" }} />
                  </div>
                  <div>
                    <p className="text-[12px] font-bold" style={{ color: "var(--fg-80)" }}>Focus Areas</p>
                    <p className="text-[9px] font-mono" style={{ color: "var(--fg-25)" }}>Lessons that need more practice</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {lowRated.map(l => {
                    const rating = progress.get(l.id)!.self_rating!;
                    return (
                      <button key={l.id} onClick={() => onSelectLesson(l)}
                        className="w-full text-left flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all active:scale-[0.98]"
                        style={{ background: "var(--fg-04)" }}>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map(s => (
                            <div key={s} className="w-1.5 h-1.5 rounded-full"
                              style={{ background: s <= rating ? "rgb(245 158 11)" : "var(--fg-10)" }} />
                          ))}
                        </div>
                        <span className="text-[11px] font-semibold flex-1 truncate" style={{ color: "var(--fg-60)" }}>
                          {l.title}
                        </span>
                        <ChevronRight size={12} style={{ color: "var(--fg-20)" }} />
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}
          <WarmupCooldownRoutines discipline={discipline} colorRgb={d.colorRgb} />
          <PracticeTimer discipline={discipline} colorRgb={d.colorRgb} disciplineName={d.name} />
          {/* Community stats (item 72) */}
          <CommunityStats discipline={discipline} colorRgb={d.colorRgb} completedCount={completedCount} totalLessons={lessons.length} />
          {/* Technique dependency graph (item 56) */}
          <TechniqueGraph discipline={discipline} colorRgb={d.colorRgb} completedLessonIds={completedLessonIds} />
          {/* Partner drill library (item 62) */}
          <PartnerDrillLibrary discipline={discipline} colorRgb={d.colorRgb} />
        </div>
      )}

      {/* ── Learn Tab ── */}
      {activeTab === "learn" && (
        <>
      {/* Guided onboarding — first time entering discipline */}
      {!loading && completedCount === 0 && !onboardingDismissed && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border p-5 relative overflow-hidden"
          style={{ borderColor: `rgb(${d.colorRgb} / 0.2)`, background: `linear-gradient(135deg, rgb(${d.colorRgb} / 0.1), rgb(${d.colorRgb} / 0.03))` }}>
          <button onClick={() => { setOnboardingDismissed(true); try { localStorage.setItem(`ma_onboarding_${discipline}`, "1"); } catch {} }}
            className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: "var(--fg-06)" }}>
            <X size={12} style={{ color: "var(--fg-40)" }} />
          </button>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `rgb(${d.colorRgb} / 0.15)` }}>
              <Sparkles size={16} style={{ color: `rgb(${d.colorRgb})` }} />
            </div>
            <div>
              <p className="text-[13px] font-bold" style={{ color: "var(--fg-85)" }}>Welcome to {d.name}</p>
              <p className="text-[9px] font-mono" style={{ color: `rgb(${d.colorRgb} / 0.7)` }}>YOUR JOURNEY STARTS HERE</p>
            </div>
          </div>
          <p className="text-[11px] leading-relaxed mb-3" style={{ color: "var(--fg-50)" }}>
            {d.description}
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {d.soloFriendly && (
              <span className="text-[9px] px-2 py-1 rounded-full font-medium" style={{ background: "rgb(34 197 94 / 0.1)", color: "rgb(34 197 94 / 0.8)" }}>
                Solo-friendly
              </span>
            )}
            <span className="text-[9px] px-2 py-1 rounded-full font-medium" style={{ background: `rgb(${d.colorRgb} / 0.1)`, color: `rgb(${d.colorRgb} / 0.8)` }}>
              {lessons.length} lessons
            </span>
            <span className="text-[9px] px-2 py-1 rounded-full font-medium" style={{ background: "var(--fg-06)", color: "var(--fg-40)" }}>
              No equipment needed
            </span>
          </div>
          <p className="text-[10px] leading-relaxed" style={{ color: "var(--fg-35)" }}>
            Each lesson teaches one technique at a time with step-by-step breakdowns, coaching cues, and drills you can practice anywhere. No experience required.
          </p>
        </motion.div>
      )}

      {/* Adaptive difficulty suggestion */}
      {!loading && completedCount >= 3 && (() => {
        const ratings = Array.from(progress.values())
          .filter(p => p.completed_at && p.self_rating)
          .map(p => p.self_rating!);
        if (ratings.length < 3) return null;
        const recentRatings = ratings.slice(-5);
        const avg = recentRatings.reduce((s, r) => s + r, 0) / recentRatings.length;
        if (avg <= 2.5) {
          return (
            <div className="rounded-xl border p-3 flex items-start gap-3"
              style={{ borderColor: "rgb(245 158 11 / 0.15)", background: "rgb(245 158 11 / 0.05)" }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "rgb(245 158 11 / 0.1)" }}>
                <Target size={14} style={{ color: "rgb(245 158 11 / 0.7)" }} />
              </div>
              <div>
                <p className="text-[11px] font-bold" style={{ color: "rgb(245 158 11 / 0.9)" }}>Review suggested</p>
                <p className="text-[10px] leading-relaxed mt-0.5" style={{ color: "var(--fg-40)" }}>
                  Your recent ratings are low. Consider repeating earlier lessons to build confidence before moving on.
                </p>
              </div>
            </div>
          );
        }
        if (avg >= 4.5) {
          return (
            <div className="rounded-xl border p-3 flex items-start gap-3"
              style={{ borderColor: "rgb(34 197 94 / 0.15)", background: "rgb(34 197 94 / 0.05)" }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "rgb(34 197 94 / 0.1)" }}>
                <Zap size={14} style={{ color: "rgb(34 197 94 / 0.7)" }} />
              </div>
              <div>
                <p className="text-[11px] font-bold" style={{ color: "rgb(34 197 94 / 0.9)" }}>You&apos;re crushing it!</p>
                <p className="text-[10px] leading-relaxed mt-0.5" style={{ color: "var(--fg-40)" }}>
                  Consistently high ratings — you&apos;re ready to challenge yourself. Push forward to the next lesson!
                </p>
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* Today's Focus — suggest reviewing the stalest completed lesson */}
      {!loading && completedCount >= 2 && (() => {
        const completedLessons = lessons
          .filter(l => progress.has(l.id) && progress.get(l.id)!.completed_at)
          .map(l => ({ lesson: l, completedAt: new Date(progress.get(l.id)!.completed_at!).getTime() }))
          .sort((a, b) => a.completedAt - b.completedAt);
        if (completedLessons.length === 0) return null;
        const stalest = completedLessons[0];
        const daysAgo = Math.floor((Date.now() - stalest.completedAt) / (1000 * 60 * 60 * 24));
        if (daysAgo < 1) return null;
        return (
          <button onClick={() => onSelectLesson(stalest.lesson)}
            className="w-full text-left rounded-xl border p-3 flex items-center gap-3 transition-all active:scale-[0.98]"
            style={{ borderColor: "var(--fg-06)", background: "var(--fg-02)" }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: `rgb(${d.colorRgb} / 0.08)` }}>
              <Target size={14} style={{ color: `rgb(${d.colorRgb} / 0.7)` }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[8px] font-mono tracking-widest" style={{ color: `rgb(${d.colorRgb} / 0.6)` }}>TODAY&apos;S FOCUS</p>
              <p className="text-[12px] font-bold truncate" style={{ color: "var(--fg-70)" }}>Review: {stalest.lesson.title}</p>
              <p className="text-[9px] mt-0.5" style={{ color: "var(--fg-30)" }}>Last practiced {daysAgo} day{daysAgo !== 1 ? "s" : ""} ago</p>
            </div>
            <ChevronRight size={14} style={{ color: "var(--fg-15)" }} />
          </button>
        );
      })()}

      {/* Next lesson card */}
      {(() => {
        const nextLesson = lessons.find(
          (l) => getLessonStatus(l, progress, lessons) === "current"
        );
        if (!nextLesson) return null;
        return (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => onSelectLesson(nextLesson)}
            className="w-full text-left rounded-2xl border p-4 transition-all active:scale-[0.98]"
            style={{
              borderColor: `rgb(${d.colorRgb} / 0.2)`,
              background: `linear-gradient(135deg, rgb(${d.colorRgb} / 0.08), rgb(${d.colorRgb} / 0.02))`,
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `rgb(${d.colorRgb} / 0.15)` }}>
                <Play size={16} style={{ color: `rgb(${d.colorRgb})` }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[8px] font-mono tracking-widest mb-0.5" style={{ color: `rgb(${d.colorRgb} / 0.7)` }}>
                  UP NEXT
                </p>
                <p className="text-[14px] font-bold truncate" style={{ color: "var(--fg-90)" }}>
                  {nextLesson.title}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--fg-35)" }}>
                  Week {nextLesson.week} · {nextLesson.duration_min} min · {getXpForLesson(nextLesson)} XP
                </p>
              </div>
              <ChevronRight size={18} style={{ color: `rgb(${d.colorRgb} / 0.5)` }} />
            </div>
          </motion.button>
        );
      })()}

      {/* Muscle recovery awareness (spec item 54) */}
      {recoveryWarnings.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border p-3 space-y-2"
          style={{
            borderColor: "rgb(245 158 11 / 0.15)",
            background: "rgb(245 158 11 / 0.04)",
          }}>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "rgb(245 158 11 / 0.12)" }}>
              <Flame size={12} style={{ color: "rgb(245 158 11 / 0.7)" }} />
            </div>
            <div>
              <p className="text-[9px] font-bold" style={{ color: "rgb(245 158 11 / 0.8)" }}>
                Recovery Heads-Up
              </p>
              <p className="text-[8px]" style={{ color: "var(--fg-30)" }}>
                Your next lesson targets muscles still recovering from gym
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {recoveryWarnings.map((w) => (
              <div key={w.segment} className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
                style={{ background: "var(--fg-04)" }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{
                  background: w.status === "fatigued" || w.status === "overtrained"
                    ? "rgb(239 68 68)" : "rgb(245 158 11)",
                }} />
                <span className="text-[9px] font-semibold" style={{ color: "var(--fg-60)" }}>
                  {w.segment}
                </span>
                <span className="text-[8px] font-mono" style={{
                  color: w.status === "fatigued" || w.status === "overtrained"
                    ? "rgb(239 68 68 / 0.8)" : "rgb(245 158 11 / 0.8)",
                }}>
                  {w.pct}%
                </span>
              </div>
            ))}
          </div>
          <p className="text-[8px] leading-relaxed" style={{ color: "var(--fg-25)" }}>
            {recoveryWarnings.some(w => w.status === "fatigued" || w.status === "overtrained")
              ? "Consider lighter technique work or focus on upper body drills today."
              : "You can train but ease into techniques using these muscle groups."}
          </p>
        </motion.div>
      )}

      {/* Level subtitle */}
      {levels.length > 0 && (
        <p className="text-[10px] font-mono" style={{ color: "var(--fg-25)" }}>
          {levels[0].title} — {completedCount}/{lessons.length} completed
        </p>
      )}

      {/* Journey map — flat lessons with week dividers */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl animate-pulse"
              style={{ background: "var(--fg-06)" }} />
          ))}
        </div>
      ) : levels.length === 0 ? (
        <div className="rounded-2xl border p-8 text-center"
          style={{ borderColor: "var(--fg-06)", background: "var(--fg-03)" }}>
          <Swords size={32} style={{ color: "var(--fg-20)", margin: "0 auto" }} />
          <p className="text-sm font-bold mt-3" style={{ color: "var(--fg-60)" }}>
            Curriculum Coming Soon
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--fg-30)" }}>
            We&apos;re building lessons for {d.name}. Check back soon!
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {weeks.map(([weekNum, weekLessons]) => {
            const weekCompleted = weekLessons.every(
              (l) => progress.has(l.id) && progress.get(l.id)!.completed_at
            );
            return (
              <div key={weekNum}>
                {/* Week divider */}
                <div className="sticky top-0 z-10 flex items-center gap-2 py-2 px-1"
                  style={{ background: "var(--bg-primary)" }}>
                  {weekCompleted ? (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: `rgba(${d.colorRgb}, 0.15)` }}>
                      <Check size={10} style={{ color: `rgb(${d.colorRgb})` }} />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: "var(--fg-06)" }}>
                      <span className="text-[8px] font-bold" style={{ color: "var(--fg-40)" }}>
                        {weekNum}
                      </span>
                    </div>
                  )}
                  <span className="text-[10px] font-bold" style={{ color: "var(--fg-50)" }}>
                    Week {weekNum}
                  </span>
                  <div className="flex-1 h-px" style={{ background: "var(--fg-06)" }} />
                  <span className="text-[9px] font-mono" style={{ color: "var(--fg-20)" }}>
                    {weekLessons.length} lessons
                  </span>
                </div>

                {/* Lessons */}
                <div className="space-y-1 pl-2">
                  {weekLessons.map((lesson) => {
                    const status = getLessonStatus(lesson, progress, lessons);
                    return (
                      <LessonRow
                        key={lesson.id}
                        lesson={lesson}
                        status={status}
                        colorRgb={d.colorRgb}
                        onSelect={() => status !== "locked" && onSelectLesson(lesson)}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
        </>
      )}
    </motion.div>
  );
}

function LessonRow({ lesson, status, colorRgb, onSelect }: {
  lesson: Lesson;
  status: "completed" | "current" | "locked";
  colorRgb: string;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      disabled={status === "locked"}
      className="w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all border-l-[3px]"
      style={{
        background: status === "current" ? `rgba(${colorRgb}, 0.06)` : "transparent",
        opacity: status === "locked" ? 0.4 : 1,
        borderLeftColor: status === "completed"
          ? `rgb(${colorRgb})`
          : status === "current"
            ? `rgb(${colorRgb} / 0.6)`
            : "transparent",
      }}
    >
      {/* Status icon */}
      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
        style={{
          background: status === "completed"
            ? `rgba(${colorRgb}, 0.15)`
            : status === "current"
              ? `rgba(${colorRgb}, 0.1)`
              : "var(--fg-04)",
        }}>
        {status === "completed" && <Check size={13} style={{ color: `rgb(${colorRgb})` }} />}
        {status === "current" && <Play size={11} style={{ color: `rgb(${colorRgb})` }} />}
        {status === "locked" && <Lock size={11} style={{ color: "var(--fg-20)" }} />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold truncate"
          style={{ color: status === "locked" ? "var(--fg-30)" : "var(--fg-80)" }}>
          {lesson.title}
        </p>
        <p className="text-[10px] truncate mt-0.5"
          style={{ color: "var(--fg-30)" }}>
          {lesson.subtitle}
        </p>
      </div>

      {/* Duration */}
      <div className="flex items-center gap-1 shrink-0">
        <Clock size={10} style={{ color: "var(--fg-20)" }} />
        <span className="text-[9px] font-mono" style={{ color: "var(--fg-20)" }}>
          {lesson.duration_min}m
        </span>
      </div>
    </button>
  );
}

// ═══════════════════════════════════════════════
// DRILL GENERATOR — quick practice sessions
// ═══════════════════════════════════════════════

type DrillRound = { technique: string; reps: string; rest: string };
type GeneratedDrill = { warmup: string; rounds: DrillRound[]; cooldown: string; totalMin: number };

const WARMUPS: Record<string, string> = {
  boxing: "2 min: stance switches, light bouncing, arm circles, shadow jab",
  muay_thai: "2 min: stance switches, arm circles, light kicks to air, hip rotations",
};
const COOLDOWNS: Record<string, string> = {
  boxing: "1 min: shake out arms, deep breathing, shoulder stretches",
  muay_thai: "1 min: quad stretches, hip openers, deep breathing",
};

function generateDrill(
  learnedTechniques: { name: string; difficulty: string }[],
  durationMin: number,
  discipline: Discipline,
): GeneratedDrill | null {
  if (learnedTechniques.length === 0) return null;

  const roundTime = durationMin <= 5 ? 30 : durationMin <= 10 ? 30 : 45;
  const restTime = durationMin <= 5 ? 15 : 20;
  const usableMin = durationMin - 3;
  const roundCount = Math.max(2, Math.min(learnedTechniques.length * 2, Math.floor((usableMin * 60) / (roundTime + restTime))));

  const shuffled = [...learnedTechniques].sort(() => Math.random() - 0.5);
  const rounds: DrillRound[] = [];
  for (let i = 0; i < roundCount; i++) {
    const tech = shuffled[i % shuffled.length];
    const sets = tech.difficulty === "beginner" ? 3 : 2;
    rounds.push({
      technique: tech.name,
      reps: `${sets} × ${roundTime}s`,
      rest: `${restTime}s`,
    });
  }

  return {
    warmup: WARMUPS[discipline] ?? "2 min: light movement, arm circles, joint rotations",
    rounds,
    cooldown: COOLDOWNS[discipline] ?? "1 min: stretching, deep breathing",
    totalMin: durationMin,
  };
}

function DrillGenerator({ discipline, colorRgb, userId, allLessons, progress }: {
  discipline: Discipline;
  colorRgb: string;
  userId?: string;
  allLessons: Lesson[];
  progress: Map<string, UserLessonProgress>;
}) {
  const [duration, setDuration] = useState(10);
  const [drill, setDrill] = useState<GeneratedDrill | null>(null);
  const [learnedTechs, setLearnedTechs] = useState<{ name: string; difficulty: string }[]>([]);
  const [loadingTechs, setLoadingTechs] = useState(true);

  const completedLessonIds = useMemo(() =>
    allLessons
      .filter(l => progress.has(l.id) && progress.get(l.id)!.completed_at)
      .map(l => l.id),
    [allLessons, progress]
  );

  useEffect(() => {
    if (completedLessonIds.length === 0) { setLoadingTechs(false); return; }
    Promise.all(completedLessonIds.map(id => fetchLessonTechniques(id)))
      .then(results => {
        const seen = new Set<string>();
        const techs: { name: string; difficulty: string }[] = [];
        for (const lts of results) {
          for (const lt of lts) {
            if (lt.technique && !seen.has(lt.technique.id)) {
              seen.add(lt.technique.id);
              techs.push({ name: lt.technique.name, difficulty: lt.technique.difficulty });
            }
          }
        }
        setLearnedTechs(techs);
        setLoadingTechs(false);
      });
  }, [completedLessonIds]);

  const durations = [5, 10, 15, 20];

  function handleGenerate() {
    const d = generateDrill(learnedTechs, duration, discipline);
    setDrill(d);
    haptic(80);
  }

  if (loadingTechs) {
    return (
      <div className="rounded-2xl border p-4 animate-pulse" style={{ borderColor: "var(--fg-06)", background: "var(--fg-03)", height: 120 }} />
    );
  }

  if (learnedTechs.length === 0) {
    return (
      <div className="rounded-2xl border p-5 text-center" style={{ borderColor: "var(--fg-06)", background: "var(--fg-03)" }}>
        <Zap size={24} style={{ color: "var(--fg-15)", margin: "0 auto" }} />
        <p className="text-[12px] font-semibold mt-2" style={{ color: "var(--fg-50)" }}>Quick Drill</p>
        <p className="text-[10px] mt-1" style={{ color: "var(--fg-25)" }}>
          Complete lessons to unlock drills based on your learned techniques
        </p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
      <div className="rounded-2xl border p-4 space-y-4" style={{ borderColor: "var(--fg-06)", background: "var(--fg-03)" }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `rgb(${colorRgb} / 0.1)` }}>
            <Zap size={16} style={{ color: `rgb(${colorRgb})` }} />
          </div>
          <div>
            <p className="text-[13px] font-bold" style={{ color: "var(--fg-80)" }}>Quick Drill</p>
            <p className="text-[9px] font-mono" style={{ color: "var(--fg-30)" }}>
              {learnedTechs.length} technique{learnedTechs.length !== 1 ? "s" : ""} available
            </p>
          </div>
        </div>

        {!drill ? (
          <>
            <div className="flex gap-2">
              {durations.map(d => (
                <button key={d} onClick={() => setDuration(d)}
                  className="flex-1 py-2 rounded-lg text-[10px] font-semibold transition-all"
                  style={{
                    background: duration === d ? `rgb(${colorRgb} / 0.15)` : "var(--fg-04)",
                    color: duration === d ? `rgb(${colorRgb})` : "var(--fg-40)",
                    border: `1px solid ${duration === d ? `rgb(${colorRgb} / 0.2)` : "var(--fg-06)"}`,
                  }}>
                  {d} min
                </button>
              ))}
            </div>

            <button onClick={handleGenerate}
              className="w-full py-3 rounded-xl text-[12px] font-bold transition-all active:scale-[0.98]"
              style={{ background: `rgb(${colorRgb} / 0.12)`, color: `rgb(${colorRgb})` }}>
              Generate Drill
            </button>
          </>
        ) : (
          <div className="space-y-3">
            {/* Warmup */}
            <div className="rounded-xl p-3" style={{ background: "rgb(34 197 94 / 0.06)", border: "1px solid rgb(34 197 94 / 0.12)" }}>
              <p className="text-[8px] font-mono tracking-widest mb-1" style={{ color: "rgb(34 197 94 / 0.7)" }}>WARMUP</p>
              <p className="text-[10px] leading-relaxed" style={{ color: "var(--fg-50)" }}>{drill.warmup}</p>
            </div>

            {/* Rounds */}
            <div className="space-y-1.5">
              {drill.rounds.map((r, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg px-3 py-2"
                  style={{ background: "var(--fg-04)" }}>
                  <span className="text-[10px] font-bold w-5 shrink-0" style={{ color: `rgb(${colorRgb})` }}>{i + 1}</span>
                  <span className="text-[11px] font-semibold flex-1" style={{ color: "var(--fg-70)" }}>{r.technique}</span>
                  <span className="text-[9px] font-mono" style={{ color: "var(--fg-30)" }}>{r.reps}</span>
                  <span className="text-[8px] font-mono" style={{ color: "var(--fg-20)" }}>rest {r.rest}</span>
                </div>
              ))}
            </div>

            {/* Cooldown */}
            <div className="rounded-xl p-3" style={{ background: "rgb(59 130 246 / 0.06)", border: "1px solid rgb(59 130 246 / 0.12)" }}>
              <p className="text-[8px] font-mono tracking-widest mb-1" style={{ color: "rgb(59 130 246 / 0.7)" }}>COOLDOWN</p>
              <p className="text-[10px] leading-relaxed" style={{ color: "var(--fg-50)" }}>{drill.cooldown}</p>
            </div>

            {/* Total + regenerate */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[9px] font-mono" style={{ color: "var(--fg-25)" }}>~{drill.totalMin} min total</span>
              <button onClick={() => { setDrill(null); }}
                className="text-[10px] font-semibold px-3 py-1 rounded-lg transition-all"
                style={{ background: "var(--fg-04)", color: "var(--fg-40)" }}>
                New Drill
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════
// COMBINATION CHAINS — unlock combos when prereqs met
// ═══════════════════════════════════════════════

type ComboChain = {
  name: string;
  notation: string;
  description: string;
  prereqs: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
};

const COMBO_CHAINS: Record<string, ComboChain[]> = {
  boxing: [
    { name: "Jab-Cross (1-2)", notation: "1 → 2", description: "The bread and butter. Jab measures distance, cross delivers power.", prereqs: ["Jab", "Cross (Straight Right)"], difficulty: "beginner" },
    { name: "Jab-Cross-Hook (1-2-3)", notation: "1 → 2 → 3", description: "Straight-straight-hook changes the angle. Devastating when landed clean.", prereqs: ["Jab", "Cross (Straight Right)", "Lead Hook"], difficulty: "beginner" },
    { name: "Double Jab-Cross", notation: "1 → 1 → 2", description: "Double jab disrupts timing, the cross punishes the reset.", prereqs: ["Jab", "Cross (Straight Right)"], difficulty: "beginner" },
    { name: "Jab-Body Hook-Hook", notation: "1 → 3b → 3", description: "Go high to draw the guard up, attack the body, finish upstairs.", prereqs: ["Jab", "Lead Hook", "Body Hook"], difficulty: "intermediate" },
    { name: "Jab-Cross-Slip-Cross", notation: "1 → 2 → slip → 2", description: "Throw, make them counter, slip it, and punish.", prereqs: ["Jab", "Cross (Straight Right)", "Slip"], difficulty: "intermediate" },
    { name: "Pivot-Jab-Cross", notation: "pivot → 1 → 2", description: "Create a new angle with the pivot, then attack from the blind side.", prereqs: ["Pivot", "Jab", "Cross (Straight Right)"], difficulty: "intermediate" },
    { name: "Uppercut-Hook", notation: "6 → 3", description: "The uppercut lifts the chin, the hook follows the opening.", prereqs: ["Uppercut", "Lead Hook"], difficulty: "intermediate" },
    { name: "Jab-Cross-Hook-Cross (1-2-3-2)", notation: "1 → 2 → 3 → 2", description: "The full four-punch combination. Rhythm and flow are everything.", prereqs: ["Jab", "Cross (Straight Right)", "Lead Hook"], difficulty: "advanced" },
  ],
  muay_thai: [
    { name: "Jab-Cross-Kick", notation: "1 → 2 → kick", description: "Hands set up the kick. The cross turns the hip, the kick follows naturally.", prereqs: ["Muay Thai Stance", "Roundhouse Kick"], difficulty: "beginner" },
    { name: "Teep-Cross", notation: "teep → 2", description: "Push them back with the teep, close distance and land the cross.", prereqs: ["Teep (Push Kick)", "Muay Thai Stance"], difficulty: "beginner" },
    { name: "Low Kick-Cross", notation: "low kick → 2", description: "Chop the leg, then go upstairs when they drop their guard.", prereqs: ["Low Kick (Leg Kick)", "Muay Thai Stance"], difficulty: "beginner" },
    { name: "Cross-Elbow", notation: "2 → elbow", description: "The cross closes distance, the elbow devastates in close range.", prereqs: ["Muay Thai Stance", "Horizontal Elbow"], difficulty: "intermediate" },
    { name: "Kick Check-Kick", notation: "check → kick", description: "Block their kick with a check, immediately counter with your own.", prereqs: ["Kick Check", "Roundhouse Kick"], difficulty: "intermediate" },
    { name: "Clinch-Knee", notation: "clinch → knee", description: "Secure the plum position and deliver devastating knees.", prereqs: ["Basic Clinch (Plum Position)", "Straight Knee"], difficulty: "intermediate" },
    { name: "Catch-Sweep-Elbow", notation: "catch → sweep → elbow", description: "Catch their kick, sweep the standing leg, finish with an elbow.", prereqs: ["Catch & Sweep", "Horizontal Elbow"], difficulty: "advanced" },
  ],
};

function CombinationChains({ discipline, colorRgb, userId, allLessons, progress }: {
  discipline: Discipline;
  colorRgb: string;
  userId?: string;
  allLessons: Lesson[];
  progress: Map<string, UserLessonProgress>;
}) {
  const [learnedNames, setLearnedNames] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const completedLessonIds = useMemo(() =>
    allLessons
      .filter(l => progress.has(l.id) && progress.get(l.id)!.completed_at)
      .map(l => l.id),
    [allLessons, progress]
  );

  useEffect(() => {
    if (completedLessonIds.length === 0) { setLoading(false); return; }
    Promise.all(completedLessonIds.map(id => fetchLessonTechniques(id)))
      .then(results => {
        const names = new Set<string>();
        for (const lts of results) {
          for (const lt of lts) {
            if (lt.technique) names.add(lt.technique.name);
          }
        }
        setLearnedNames(names);
        setLoading(false);
      });
  }, [completedLessonIds]);

  const chains = COMBO_CHAINS[discipline] ?? [];
  if (chains.length === 0) return null;

  if (loading) {
    return <div className="rounded-2xl border p-4 animate-pulse" style={{ borderColor: "var(--fg-06)", background: "var(--fg-03)", height: 100 }} />;
  }

  const sorted = chains.map(c => {
    const met = c.prereqs.filter(p => learnedNames.has(p));
    return { ...c, met: met.length, total: c.prereqs.length, unlocked: met.length === c.prereqs.length };
  }).sort((a, b) => {
    if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
    return (b.met / b.total) - (a.met / a.total);
  });

  const unlockedCount = sorted.filter(c => c.unlocked).length;
  const visible = expanded ? sorted : sorted.slice(0, 4);

  return (
    <div className="rounded-2xl border p-4 space-y-3" style={{ borderColor: "var(--fg-06)", background: "var(--fg-03)" }}>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `rgb(${colorRgb} / 0.1)` }}>
          <Link2 size={16} style={{ color: `rgb(${colorRgb})` }} />
        </div>
        <div className="flex-1">
          <p className="text-[13px] font-bold" style={{ color: "var(--fg-80)" }}>Combo Chains</p>
          <p className="text-[9px] font-mono" style={{ color: "var(--fg-30)" }}>
            {unlockedCount}/{chains.length} unlocked
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {visible.map(c => (
          <div key={c.name} className="rounded-xl px-3 py-2.5 flex items-center gap-3"
            style={{
              background: c.unlocked ? `rgb(${colorRgb} / 0.06)` : "var(--fg-04)",
              opacity: c.unlocked ? 1 : 0.6,
            }}>
            <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: c.unlocked ? `rgb(${colorRgb} / 0.15)` : "var(--fg-08)",
              }}>
              {c.unlocked
                ? <Check size={12} style={{ color: `rgb(${colorRgb})` }} />
                : <Lock size={10} style={{ color: "var(--fg-25)" }} />
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[11px] font-bold truncate" style={{ color: c.unlocked ? "var(--fg-70)" : "var(--fg-35)" }}>
                  {c.name}
                </p>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0"
                  style={{
                    background: c.unlocked ? `rgb(${colorRgb} / 0.1)` : "var(--fg-06)",
                    color: c.unlocked ? `rgb(${colorRgb})` : "var(--fg-25)",
                  }}>
                  {c.notation}
                </span>
              </div>
              {c.unlocked ? (
                <p className="text-[9px] mt-0.5 truncate" style={{ color: "var(--fg-30)" }}>{c.description}</p>
              ) : (
                <p className="text-[9px] mt-0.5" style={{ color: "var(--fg-25)" }}>
                  {c.met}/{c.total} techniques learned — need: {c.prereqs.filter(p => !learnedNames.has(p)).join(", ")}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {sorted.length > 4 && (
        <button onClick={() => { setExpanded(e => !e); haptic(30); }}
          className="w-full text-center text-[10px] font-semibold py-1.5 rounded-lg transition-all"
          style={{ color: `rgb(${colorRgb})`, background: `rgb(${colorRgb} / 0.06)` }}>
          {expanded ? "Show less" : `Show all ${sorted.length} combos`}
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// WARM-UP & COOL-DOWN ROUTINES per discipline
// ═══════════════════════════════════════════════

type RoutineStep = { name: string; duration: string; cue: string };

const WARMUP_ROUTINES: Record<string, RoutineStep[]> = {
  boxing: [
    { name: "Jump rope / bounce in place", duration: "1 min", cue: "Light on your toes, find your rhythm" },
    { name: "Arm circles (forward + back)", duration: "30 sec", cue: "Big circles, loosen the shoulders" },
    { name: "Stance switches", duration: "30 sec", cue: "Orthodox → southpaw, feel the weight shift" },
    { name: "Shadow jabs (slow)", duration: "30 sec", cue: "Focus on extension and snap, not speed" },
    { name: "Torso twists", duration: "30 sec", cue: "Rotate through the hips, not just the arms" },
    { name: "High knees", duration: "30 sec", cue: "Drive knees up, pump the arms" },
  ],
  muay_thai: [
    { name: "Light jog in place", duration: "1 min", cue: "Elevate heart rate gradually" },
    { name: "Hip circles (each direction)", duration: "30 sec", cue: "Wide circles, open the hip joints" },
    { name: "Leg swings (front-to-back)", duration: "30 sec", cue: "Hold the wall, swing like a pendulum" },
    { name: "Arm circles + elbow rotations", duration: "30 sec", cue: "Warm the shoulder and elbow joints" },
    { name: "Light kicks to air", duration: "30 sec", cue: "Slow roundhouses, feel the hip turn" },
    { name: "Knee raises with guard up", duration: "30 sec", cue: "Drive the knee, keep hands by chin" },
  ],
};

const COOLDOWN_ROUTINES: Record<string, RoutineStep[]> = {
  boxing: [
    { name: "Shake out arms and legs", duration: "30 sec", cue: "Let everything go loose" },
    { name: "Shoulder stretch (cross-body)", duration: "30 sec", cue: "Hold 15 sec each side" },
    { name: "Wrist circles and finger flex", duration: "20 sec", cue: "Relieve tension from fist-clenching" },
    { name: "Chest opener stretch", duration: "30 sec", cue: "Clasp hands behind, open the chest" },
    { name: "Deep breathing", duration: "30 sec", cue: "Inhale 4 counts, hold 4, exhale 4" },
  ],
  muay_thai: [
    { name: "Quad stretch (standing)", duration: "30 sec", cue: "Hold 15 sec each leg" },
    { name: "Hip flexor lunge stretch", duration: "30 sec", cue: "Sink into a low lunge, feel the hip open" },
    { name: "Hamstring stretch", duration: "30 sec", cue: "Forward fold, let the weight do the work" },
    { name: "Shoulder and neck release", duration: "20 sec", cue: "Ear to shoulder, hold gently" },
    { name: "Deep breathing", duration: "30 sec", cue: "Box breathing: in 4, hold 4, out 4, hold 4" },
  ],
};

function WarmupCooldownRoutines({ discipline, colorRgb }: { discipline: Discipline; colorRgb: string }) {
  const [openSection, setOpenSection] = useState<"warmup" | "cooldown" | null>(null);

  const warmup = WARMUP_ROUTINES[discipline];
  const cooldown = COOLDOWN_ROUTINES[discipline];
  if (!warmup && !cooldown) return null;

  function RoutineSection({ type, steps }: { type: "warmup" | "cooldown"; steps: RoutineStep[] }) {
    const isOpen = openSection === type;
    const icon = type === "warmup" ? <Flame size={13} style={{ color: "rgb(245 158 11)" }} /> : <Sparkles size={13} style={{ color: "rgb(96 165 250)" }} />;
    const label = type === "warmup" ? "Warm-Up Routine" : "Cool-Down Routine";
    const totalDuration = type === "warmup" ? "~4 min" : "~3 min";

    return (
      <div>
        <button onClick={() => { setOpenSection(isOpen ? null : type); haptic(30); }}
          className="w-full flex items-center gap-2.5 py-2 transition-all"
          style={{ color: "var(--fg-60)" }}>
          <div className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: type === "warmup" ? "rgb(245 158 11 / 0.1)" : "rgb(96 165 250 / 0.1)" }}>
            {icon}
          </div>
          <span className="text-[11px] font-bold flex-1 text-left">{label}</span>
          <span className="text-[9px] font-mono" style={{ color: "var(--fg-25)" }}>{totalDuration}</span>
          {isOpen ? <ChevronUp size={14} style={{ color: "var(--fg-25)" }} /> : <ChevronDown size={14} style={{ color: "var(--fg-25)" }} />}
        </button>
        <AnimatePresence>
          {isOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden">
              <div className="space-y-1.5 pb-2">
                {steps.map((s, i) => (
                  <div key={i} className="flex items-start gap-2.5 rounded-lg px-2.5 py-2" style={{ background: "var(--fg-04)" }}>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-bold"
                      style={{ background: `rgb(${colorRgb} / 0.1)`, color: `rgb(${colorRgb})` }}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[11px] font-semibold" style={{ color: "var(--fg-60)" }}>{s.name}</p>
                        <span className="text-[9px] font-mono shrink-0" style={{ color: "var(--fg-25)" }}>{s.duration}</span>
                      </div>
                      <p className="text-[9px] mt-0.5" style={{ color: "var(--fg-30)" }}>{s.cue}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: "var(--fg-06)", background: "var(--fg-03)" }}>
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `rgb(${colorRgb} / 0.1)` }}>
          <Clock size={16} style={{ color: `rgb(${colorRgb})` }} />
        </div>
        <div>
          <p className="text-[13px] font-bold" style={{ color: "var(--fg-80)" }}>Routines</p>
          <p className="text-[9px] font-mono" style={{ color: "var(--fg-30)" }}>Tap to expand</p>
        </div>
      </div>
      <div className="divide-y" style={{ borderColor: "var(--fg-06)" }}>
        {warmup && <RoutineSection type="warmup" steps={warmup} />}
        {cooldown && <RoutineSection type="cooldown" steps={cooldown} />}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// PRACTICE TIMER — round-based training timer
// ═══════════════════════════════════════════════

function PracticeTimer({ discipline, colorRgb, disciplineName }: {
  discipline: Discipline;
  colorRgb: string;
  disciplineName: string;
}) {
  const [rounds, setRounds] = useState(3);
  const [roundDuration, setRoundDuration] = useState(180);
  const [restDuration, setRestDuration] = useState(60);
  const [running, setRunning] = useState(false);
  const [currentRound, setCurrentRound] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRest, setIsRest] = useState(false);
  const [finished, setFinished] = useState(false);
  const [soundOn, setSoundOn] = useState(() => {
    try { return localStorage.getItem("ma_timer_sound") !== "off"; } catch { return true; }
  });

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    try { localStorage.setItem("ma_timer_sound", next ? "on" : "off"); } catch {}
    haptic(30);
  }

  useEffect(() => {
    if (!running) return;
    if (timeLeft <= 0) {
      haptic([80, 40, 80]);
      if (isRest) {
        setIsRest(false);
        setTimeLeft(roundDuration);
        if (soundOn) playBell("round");
      } else if (currentRound < rounds) {
        if (currentRound === rounds - 1) {
          setFinished(true);
          setRunning(false);
          haptic([100, 80, 100, 80, 200]);
          if (soundOn) playBell("finish");
          return;
        }
        setCurrentRound(c => c + 1);
        setIsRest(true);
        setTimeLeft(restDuration);
        if (soundOn) playBell("rest");
      }
      return;
    }
    const id = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [running, timeLeft, isRest, currentRound, rounds, roundDuration, restDuration]);

  function start() {
    setCurrentRound(0);
    setIsRest(false);
    setTimeLeft(roundDuration);
    setFinished(false);
    setRunning(true);
    haptic(80);
    if (soundOn) playBell("round");
  }

  function reset() {
    setRunning(false);
    setCurrentRound(0);
    setTimeLeft(0);
    setIsRest(false);
    setFinished(false);
  }

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const totalTime = rounds * roundDuration + (rounds - 1) * restDuration;

  const presets = [
    { label: "Quick", rounds: 3, round: 120, rest: 30 },
    { label: "Standard", rounds: 5, round: 180, rest: 60 },
    { label: "Endurance", rounds: 8, round: 180, rest: 45 },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {!running && !finished ? (
        <>
          <div className="rounded-2xl border p-4 space-y-4" style={{ borderColor: "var(--fg-06)", background: "var(--fg-03)" }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `rgb(${colorRgb} / 0.1)` }}>
                <Clock size={16} style={{ color: `rgb(${colorRgb})` }} />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-bold" style={{ color: "var(--fg-80)" }}>Practice Timer</p>
                <p className="text-[9px] font-mono" style={{ color: "var(--fg-30)" }}>Shadow {disciplineName} rounds</p>
              </div>
              <button onClick={toggleSound}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                style={{ background: soundOn ? `rgb(${colorRgb} / 0.1)` : "var(--fg-06)" }}>
                {soundOn
                  ? <Volume2 size={14} style={{ color: `rgb(${colorRgb})` }} />
                  : <VolumeX size={14} style={{ color: "var(--fg-25)" }} />
                }
              </button>
            </div>

            <div className="flex gap-2">
              {presets.map(p => (
                <button key={p.label}
                  onClick={() => { setRounds(p.rounds); setRoundDuration(p.round); setRestDuration(p.rest); }}
                  className="flex-1 py-2 rounded-lg text-[10px] font-semibold transition-all"
                  style={{
                    background: rounds === p.rounds && roundDuration === p.round ? `rgb(${colorRgb} / 0.15)` : "var(--fg-04)",
                    color: rounds === p.rounds && roundDuration === p.round ? `rgb(${colorRgb})` : "var(--fg-40)",
                    border: `1px solid ${rounds === p.rounds && roundDuration === p.round ? `rgb(${colorRgb} / 0.2)` : "var(--fg-06)"}`,
                  }}>
                  {p.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-[8px] font-mono tracking-widest mb-1" style={{ color: "var(--fg-20)" }}>ROUNDS</p>
                <div className="flex items-center justify-center gap-2">
                  <button onClick={() => setRounds(Math.max(1, rounds - 1))} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "var(--fg-06)", color: "var(--fg-40)" }}>-</button>
                  <span className="text-[18px] font-bold w-6 text-center" style={{ color: "var(--fg-80)" }}>{rounds}</span>
                  <button onClick={() => setRounds(Math.min(20, rounds + 1))} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "var(--fg-06)", color: "var(--fg-40)" }}>+</button>
                </div>
              </div>
              <div className="text-center">
                <p className="text-[8px] font-mono tracking-widest mb-1" style={{ color: "var(--fg-20)" }}>ROUND</p>
                <div className="flex items-center justify-center gap-2">
                  <button onClick={() => setRoundDuration(Math.max(30, roundDuration - 30))} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "var(--fg-06)", color: "var(--fg-40)" }}>-</button>
                  <span className="text-[14px] font-bold w-10 text-center" style={{ color: "var(--fg-80)" }}>{fmtTime(roundDuration)}</span>
                  <button onClick={() => setRoundDuration(Math.min(600, roundDuration + 30))} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "var(--fg-06)", color: "var(--fg-40)" }}>+</button>
                </div>
              </div>
              <div className="text-center">
                <p className="text-[8px] font-mono tracking-widest mb-1" style={{ color: "var(--fg-20)" }}>REST</p>
                <div className="flex items-center justify-center gap-2">
                  <button onClick={() => setRestDuration(Math.max(10, restDuration - 10))} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "var(--fg-06)", color: "var(--fg-40)" }}>-</button>
                  <span className="text-[14px] font-bold w-10 text-center" style={{ color: "var(--fg-80)" }}>{fmtTime(restDuration)}</span>
                  <button onClick={() => setRestDuration(Math.min(300, restDuration + 10))} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "var(--fg-06)", color: "var(--fg-40)" }}>+</button>
                </div>
              </div>
            </div>

            <p className="text-[9px] text-center font-mono" style={{ color: "var(--fg-25)" }}>
              Total: {fmtTime(totalTime)}
            </p>
          </div>

          <button onClick={start}
            className="w-full py-4 rounded-2xl text-[14px] font-bold transition-all active:scale-[0.98]"
            style={{ background: `rgb(${colorRgb})`, color: "white" }}>
            Start Practice
          </button>
        </>
      ) : finished ? (
        <div className="rounded-2xl border p-6 text-center space-y-3" style={{ borderColor: `rgb(${colorRgb} / 0.2)`, background: `rgb(${colorRgb} / 0.05)` }}>
          <div className="text-4xl">🥊</div>
          <p className="text-[16px] font-bold" style={{ color: "var(--fg-90)" }}>Practice Complete!</p>
          <p className="text-[11px]" style={{ color: "var(--fg-40)" }}>
            {rounds} rounds · {fmtTime(totalTime)} total
          </p>
          <button onClick={reset}
            className="mt-2 px-6 py-2 rounded-xl text-[12px] font-semibold"
            style={{ background: `rgb(${colorRgb} / 0.15)`, color: `rgb(${colorRgb})` }}>
            New Session
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border p-6 text-center space-y-4" style={{ borderColor: `rgb(${colorRgb} / 0.2)`, background: "var(--fg-03)" }}>
          <p className="text-[9px] font-mono tracking-widest" style={{ color: isRest ? "rgb(59 130 246 / 0.8)" : `rgb(${colorRgb} / 0.7)` }}>
            {isRest ? "REST" : `ROUND ${currentRound + 1} OF ${rounds}`}
          </p>
          <p className="text-[56px] font-bold tabular-nums leading-none" style={{ color: isRest ? "rgb(59 130 246)" : `rgb(${colorRgb})` }}>
            {fmtTime(timeLeft)}
          </p>
          <div className="flex gap-2 justify-center">
            {Array.from({ length: rounds }).map((_, i) => (
              <div key={i} className="w-3 h-3 rounded-full" style={{
                background: i < currentRound ? `rgb(${colorRgb})` : i === currentRound && !isRest ? `rgb(${colorRgb} / 0.4)` : "var(--fg-08)",
              }} />
            ))}
          </div>
          <div className="flex gap-3 justify-center pt-2">
            <button onClick={() => setRunning(!running)}
              className="px-6 py-2.5 rounded-xl text-[12px] font-semibold"
              style={{ background: running ? "var(--fg-06)" : `rgb(${colorRgb})`, color: running ? "var(--fg-50)" : "white" }}>
              {running ? "Pause" : "Resume"}
            </button>
            <button onClick={reset}
              className="px-6 py-2.5 rounded-xl text-[12px] font-semibold"
              style={{ background: "var(--fg-04)", color: "var(--fg-40)" }}>
              Reset
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════
// STANCE SILHOUETTE — small SVG stance indicator (item 40)
// ═══════════════════════════════════════════════

function StanceSilhouette({ stance, size = 20, color = "var(--fg-15)" }: {
  stance: string;
  size?: number;
  color?: string;
}) {
  const isSouthpaw = stance.toLowerCase().includes("southpaw");
  const mirror = isSouthpaw ? `scale(-1,1) translate(-${size},0)` : "";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <g transform={mirror}>
        {/* Head */}
        <circle cx="12" cy="4" r="2.5" fill={color} opacity={0.7} />
        {/* Torso — slight angle for fighting stance */}
        <line x1="12" y1="6.5" x2="11" y2="13" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        {/* Lead arm — guard up */}
        <path d="M11.5 8.5 L8 7.5 L7.5 5.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" fill="none" />
        {/* Rear arm — guard at chin */}
        <path d="M11.5 8 L14 7 L13.5 5" stroke={color} strokeWidth="1.4" strokeLinecap="round" fill="none" />
        {/* Lead leg — forward */}
        <path d="M11 13 L8.5 18 L7 22" stroke={color} strokeWidth="1.6" strokeLinecap="round" fill="none" />
        {/* Rear leg — back */}
        <path d="M11 13 L14 18 L16 22" stroke={color} strokeWidth="1.6" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  );
}

// ═══════════════════════════════════════════════
// COMMUNITY STATS — approximated learner counts (item 72)
// ═══════════════════════════════════════════════

const COMMUNITY_BASE: Record<string, { learners: number; sessionsToday: number }> = {
  boxing: { learners: 1247, sessionsToday: 89 },
  muay_thai: { learners: 834, sessionsToday: 52 },
  bjj: { learners: 621, sessionsToday: 38 },
  kalaripayattu: { learners: 293, sessionsToday: 14 },
  shaolin: { learners: 487, sessionsToday: 27 },
};

function getCommunityStats(discipline: string) {
  const base = COMMUNITY_BASE[discipline] ?? { learners: 350, sessionsToday: 22 };
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  );
  const variance = ((dayOfYear * 7 + discipline.length * 13) % 47) - 23;
  return {
    learners: base.learners + variance,
    sessionsToday: Math.max(5, base.sessionsToday + (variance % 11)),
  };
}

function CommunityStats({ discipline, colorRgb, completedCount, totalLessons }: {
  discipline: Discipline;
  colorRgb: string;
  completedCount: number;
  totalLessons: number;
}) {
  const stats = getCommunityStats(discipline);
  const percentile = totalLessons > 0 && completedCount > 0
    ? Math.max(5, Math.min(95, Math.round(100 - (completedCount / totalLessons) * 60 - 15)))
    : null;

  return (
    <div className="rounded-2xl border p-4 space-y-3" style={{ borderColor: "var(--fg-06)", background: "var(--fg-03)" }}>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: `rgb(${colorRgb} / 0.1)` }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={`rgb(${colorRgb})`} strokeWidth="2" strokeLinecap="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <div>
          <p className="text-[12px] font-bold" style={{ color: "var(--fg-80)" }}>Community</p>
          <p className="text-[9px] font-mono" style={{ color: "var(--fg-25)" }}>Training together</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl p-3 text-center" style={{ background: `rgb(${colorRgb} / 0.06)` }}>
          <p className="text-[18px] font-bold tabular-nums" style={{ color: `rgb(${colorRgb})` }}>
            {stats.learners.toLocaleString()}
          </p>
          <p className="text-[8px] font-mono mt-0.5" style={{ color: "var(--fg-30)" }}>
            learning {DISCIPLINES[discipline].name}
          </p>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ background: "var(--fg-04)" }}>
          <p className="text-[18px] font-bold tabular-nums" style={{ color: "var(--fg-60)" }}>
            {stats.sessionsToday}
          </p>
          <p className="text-[8px] font-mono mt-0.5" style={{ color: "var(--fg-30)" }}>
            sessions today
          </p>
        </div>
      </div>
      {percentile !== null && (
        <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: `rgb(${colorRgb} / 0.06)` }}>
          <Award size={14} style={{ color: `rgb(${colorRgb})` }} />
          <p className="text-[11px] font-medium" style={{ color: "var(--fg-60)" }}>
            You're in the <span className="font-bold" style={{ color: `rgb(${colorRgb})` }}>top {percentile}%</span> of {DISCIPLINES[discipline].name} students
          </p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// PARTNER DRILL LIBRARY — sparring & partner drills (item 62)
// ═══════════════════════════════════════════════

const PARTNER_DRILLS: Record<string, { name: string; type: "pad" | "sparring" | "flow"; duration: string; description: string }[]> = {
  boxing: [
    { name: "Mirror Footwork", type: "flow", duration: "3 min", description: "Face partner, mirror their movement. Leader switches every 30s. Focus on staying in range." },
    { name: "Jab-Only Sparring", type: "sparring", duration: "2×3 min", description: "Only jabs allowed. Focus on timing, distance, and head movement. Light touch only." },
    { name: "Catch & Counter", type: "pad", duration: "3×2 min", description: "Holder feeds jabs; hitter catches and returns a cross. Switch every round." },
    { name: "Body Shot Drill", type: "pad", duration: "2 min", description: "Holder presents body pad at random angles. Hitter throws hooks to the body with proper rotation." },
    { name: "Defense Chain", type: "flow", duration: "5 min", description: "Partner throws slow, telegraphed combos. You practice slip, roll, and block responses without countering." },
  ],
  muay_thai: [
    { name: "Teep Tennis", type: "flow", duration: "3 min", description: "Partners exchange teeps back and forth. Focus on timing and catching the kick with balance." },
    { name: "Clinch Pummeling", type: "flow", duration: "3×2 min", description: "Start in 50/50 clinch. Work to establish double collar tie. No strikes — positioning only." },
    { name: "Kick Check Drill", type: "pad", duration: "2 min", description: "Partner throws low kicks at 50% power. Practice checking and returning with a kick of your own." },
    { name: "3-Count Pad Work", type: "pad", duration: "5 min", description: "Holder calls combos: 1=jab, 2=cross, 3=hook, K=kick, E=elbow, N=knee. Build speed gradually." },
  ],
  bjj: [
    { name: "Positional Sparring", type: "sparring", duration: "3×3 min", description: "Start from a specific position (guard, side control). One person works to advance, other to escape." },
    { name: "Flow Rolling", type: "flow", duration: "5 min", description: "Continuous rolling at 30% intensity. No submissions — focus on transitions and movement." },
    { name: "Escape Drills", type: "flow", duration: "3 min", description: "Partner holds mount or side control. You practice escapes. Reset after each successful escape." },
  ],
  kalaripayattu: [
    { name: "Meipayattu Mirror", type: "flow", duration: "5 min", description: "Partners face each other performing synchronized body exercises. Leader switches every minute." },
    { name: "Stick Sparring (Kettukari)", type: "sparring", duration: "3 min", description: "Light-contact stick work with bamboo. Practice blocks and strikes in set patterns." },
  ],
  shaolin: [
    { name: "Push Hands", type: "flow", duration: "3 min", description: "Partners maintain contact through hands, redirecting each other's force. Focus on sensitivity and balance." },
    { name: "Form Application Drill", type: "flow", duration: "5 min", description: "Break a form into individual techniques. Partner feeds the attack; you apply the response from the kata." },
  ],
};

function PartnerDrillLibrary({ discipline, colorRgb }: {
  discipline: Discipline;
  colorRgb: string;
}) {
  const drills = PARTNER_DRILLS[discipline];
  if (!drills || drills.length === 0) return null;

  const [expanded, setExpanded] = useState(false);
  const typeIcons = { pad: "🥊", sparring: "⚔️", flow: "🌊" };
  const typeLabels = { pad: "Pad Work", sparring: "Sparring", flow: "Flow" };

  return (
    <div className="rounded-2xl border p-4 space-y-3" style={{ borderColor: "var(--fg-06)", background: "var(--fg-03)" }}>
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: `rgb(${colorRgb} / 0.1)` }}>
            <Users size={14} style={{ color: `rgb(${colorRgb})` }} />
          </div>
          <div className="text-left">
            <p className="text-[12px] font-bold" style={{ color: "var(--fg-80)" }}>Partner Drills</p>
            <p className="text-[9px] font-mono" style={{ color: "var(--fg-25)" }}>{drills.length} drills for training with a partner</p>
          </div>
        </div>
        <ChevronDown size={14} className="transition-transform" style={{
          color: "var(--fg-25)",
          transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
        }} />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="space-y-2 pt-1">
              {drills.map((drill, i) => (
                <div key={i} className="rounded-xl p-3 space-y-1.5" style={{ background: "var(--fg-04)" }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px]">{typeIcons[drill.type]}</span>
                      <span className="text-[11px] font-bold" style={{ color: "var(--fg-70)" }}>{drill.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-full"
                        style={{ background: `rgb(${colorRgb} / 0.1)`, color: `rgb(${colorRgb})` }}>
                        {typeLabels[drill.type]}
                      </span>
                      <span className="text-[9px] font-mono" style={{ color: "var(--fg-25)" }}>{drill.duration}</span>
                    </div>
                  </div>
                  <p className="text-[10px] leading-relaxed" style={{ color: "var(--fg-40)" }}>{drill.description}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════
// TECHNIQUE DEPENDENCY GRAPH — visual progression tree (item 56)
// ═══════════════════════════════════════════════

const TECH_TREES: Record<string, { name: string; children?: string[] }[]> = {
  boxing: [
    { name: "Orthodox Stance", children: ["Jab", "Step-Drag"] },
    { name: "Guard Position", children: ["Jab", "Slip"] },
    { name: "Jab", children: ["Cross (Straight Right)", "Jab-Cross (1-2)"] },
    { name: "Cross (Straight Right)", children: ["Lead Hook", "Jab-Cross (1-2)"] },
    { name: "Lead Hook", children: ["Body Hook", "Uppercut", "Jab-Cross-Hook (1-2-3)"] },
    { name: "Step-Drag", children: ["Lateral Movement", "Pivot"] },
    { name: "Slip", children: ["Shoulder Roll"] },
    { name: "Lateral Movement" },
    { name: "Pivot" },
    { name: "Body Hook" },
    { name: "Uppercut" },
    { name: "Shoulder Roll" },
    { name: "Jab-Cross (1-2)" },
    { name: "Jab-Cross-Hook (1-2-3)" },
  ],
  muay_thai: [
    { name: "Muay Thai Stance", children: ["Teep (Push Kick)", "Roundhouse Kick"] },
    { name: "Teep (Push Kick)", children: ["Low Kick (Leg Kick)"] },
    { name: "Roundhouse Kick", children: ["Low Kick (Leg Kick)", "Kick Check"] },
    { name: "Low Kick (Leg Kick)" },
    { name: "Kick Check", children: ["Catch & Sweep"] },
    { name: "Basic Clinch (Plum Position)", children: ["Straight Knee", "Horizontal Elbow"] },
    { name: "Horizontal Elbow" },
    { name: "Straight Knee" },
    { name: "Catch & Sweep" },
  ],
};

function TechniqueGraph({ discipline, colorRgb, completedLessonIds }: {
  discipline: Discipline;
  colorRgb: string;
  completedLessonIds: string[];
}) {
  const tree = TECH_TREES[discipline];
  if (!tree) return null;

  const [expanded, setExpanded] = useState(false);
  const [learnedNames, setLearnedNames] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (completedLessonIds.length === 0) return;
    Promise.all(completedLessonIds.map(id => fetchLessonTechniques(id)))
      .then(results => {
        const names = new Set<string>();
        for (const lts of results) for (const lt of lts) if (lt.technique) names.add(lt.technique.name);
        setLearnedNames(names);
      });
  }, [completedLessonIds]);

  const roots = tree.filter(n => {
    return !tree.some(other => other.children?.includes(n.name));
  });

  const nodeMap = new Map(tree.map(n => [n.name, n]));

  function renderNode(name: string, depth: number, seen: Set<string>): React.ReactNode {
    if (seen.has(name)) return null;
    seen.add(name);
    const node = nodeMap.get(name);
    const isLearned = learnedNames.has(name);
    const children = node?.children?.filter(c => !seen.has(c)) ?? [];

    return (
      <div key={name} className="relative" style={{ paddingLeft: depth > 0 ? 20 : 0 }}>
        {depth > 0 && (
          <div className="absolute left-[8px] top-0 bottom-1/2 w-px" style={{ background: `rgb(${colorRgb} / 0.15)` }} />
        )}
        {depth > 0 && (
          <div className="absolute left-[8px] top-1/2 w-3 h-px" style={{ background: `rgb(${colorRgb} / 0.15)` }} />
        )}
        <div className="flex items-center gap-2 py-1.5">
          <div className="w-3 h-3 rounded-full shrink-0 flex items-center justify-center"
            style={{
              background: isLearned ? `rgb(${colorRgb})` : "var(--fg-08)",
              border: isLearned ? "none" : `1px solid var(--fg-12)`,
            }}>
            {isLearned && <Check size={7} strokeWidth={3} style={{ color: "white" }} />}
          </div>
          <span className="text-[10px] font-medium" style={{
            color: isLearned ? "var(--fg-70)" : "var(--fg-30)",
          }}>
            {name}
          </span>
        </div>
        {children.length > 0 && (
          <div className="relative">
            <div className="absolute left-[8px] top-0 bottom-0 w-px" style={{ background: `rgb(${colorRgb} / 0.1)` }} />
            {children.map(c => renderNode(c, depth + 1, seen))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border p-4 space-y-3" style={{ borderColor: "var(--fg-06)", background: "var(--fg-03)" }}>
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: `rgb(${colorRgb} / 0.1)` }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={`rgb(${colorRgb})`} strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="5" r="3" />
              <line x1="12" y1="8" x2="12" y2="13" />
              <circle cx="6" cy="19" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="12" y1="13" x2="6" y2="16" />
              <line x1="12" y1="13" x2="18" y2="16" />
            </svg>
          </div>
          <div className="text-left">
            <p className="text-[12px] font-bold" style={{ color: "var(--fg-80)" }}>Technique Tree</p>
            <p className="text-[9px] font-mono" style={{ color: "var(--fg-25)" }}>How techniques build on each other</p>
          </div>
        </div>
        <ChevronDown size={14} className="transition-transform" style={{
          color: "var(--fg-25)",
          transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
        }} />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pt-1">
              {(() => { const seen = new Set<string>(); return roots.map(r => renderNode(r.name, 0, seen)); })()}
            </div>
            <p className="text-[8px] font-mono mt-3 pt-2" style={{ color: "var(--fg-20)", borderTop: "1px solid var(--fg-06)" }}>
              {learnedNames.size} of {tree.length} techniques unlocked
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════
// ANIMATED TECHNIQUE DIAGRAM (spec item 36-37)
// ═══════════════════════════════════════════════

const JOINT_MUSCLE_LABEL: Partial<Record<keyof Skeleton, string>> = {
  sL: "Deltoid", sR: "Deltoid", eL: "Biceps", eR: "Triceps",
  wL: "Forearm", wR: "Forearm", kL: "Quads", kR: "Quads",
  aL: "Calves", aR: "Calves", hp: "Core", hd: "Neck",
};

const HEAT_COLORS: Record<number, string> = {
  3: "255 60 30",   // high — endpoint (wrist/ankle)
  2: "255 140 30",  // medium — mid-joint (elbow/knee)
  1: "255 200 60",  // low — root (shoulder/hip)
};

function getHeatIntensity(j: keyof Skeleton): number {
  if (j === "wL" || j === "wR" || j === "aL" || j === "aR") return 3;
  if (j === "eL" || j === "eR" || j === "kL" || j === "kR") return 2;
  return 1;
}

function StickFigureSVG({ pose, colorRgb, active, size = 200, heatMode, powerChain, showWeight, weightOverride, angles, mistake, opponent, range, mastery }: {
  pose: Skeleton; colorRgb: string; active?: (keyof Skeleton)[]; size?: number; heatMode?: boolean;
  powerChain?: (keyof Skeleton)[]; showWeight?: boolean; weightOverride?: "L" | "R" | "even";
  angles?: AngleMarker[]; mistake?: MistakePose; opponent?: Skeleton;
  range?: "close" | "mid" | "long"; mastery?: number;
}) {
  const scale = size / 200;
  const h = 290 * scale;
  const act = new Set(active ?? []);
  const bodyColor = "var(--fg-30)";
  const accentColor = `rgb(${colorRgb})`;

  const neck: Vec2 = midpoint(pose.sL, pose.sR);
  const hipL: Vec2 = [pose.hp[0] - 12, pose.hp[1]];
  const hipR: Vec2 = [pose.hp[0] + 12, pose.hp[1]];

  const weightSide = weightOverride ?? (() => {
    const diff = pose.aL[1] - pose.aR[1];
    if (Math.abs(diff) < 15) return "even" as const;
    return diff > 0 ? "L" as const : "R" as const;
  })();

  const heatColor = (j: keyof Skeleton) => {
    if (!heatMode || !act.has(j)) return act.has(j) ? accentColor : bodyColor;
    return `rgb(${HEAT_COLORS[getHeatIntensity(j)]})`;
  };
  const limbWidth = (j: keyof Skeleton) => {
    if (heatMode && act.has(j)) return (getHeatIntensity(j) === 3 ? 6 : getHeatIntensity(j) === 2 ? 5 : 4) * scale;
    return act.has(j) ? 4 * scale : 3 * scale;
  };

  const line = (a: Vec2, b: Vec2, key: string, color: string, w: number, glow?: boolean) => (
    <line key={key} x1={a[0] * scale} y1={a[1] * scale} x2={b[0] * scale} y2={b[1] * scale}
      stroke={color} strokeWidth={w} strokeLinecap="round"
      strokeDasharray={masteryStroke}
      filter={glow ? `url(#${filterId})` : undefined}
      style={{ transition: "all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)" }} />
  );

  const ml = mastery;
  const masteryBodyColor = (ml !== undefined && ml >= 1) ? accentColor : bodyColor;
  const masteryStroke = (ml !== undefined && ml === 0) ? `${3 * scale} ${4 * scale}` : undefined;

  const filterId = `heat-glow-${size}`;
  const masteryGlowId = `mastery-glow-${size}`;

  const chainId = `chain-${size}`;

  return (
    <svg width={size} height={h} viewBox={`0 0 ${size} ${h}`} xmlns="http://www.w3.org/2000/svg">
      <defs>
        {heatMode && (
          <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={3 * scale} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
        {ml !== undefined && ml >= 3 && (
          <filter id={masteryGlowId} x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation={ml >= 4 ? 6 * scale : 4 * scale} result="glow" />
            <feComposite in="glow" in2="SourceGraphic" operator="over" />
          </filter>
        )}
        {ml !== undefined && ml >= 4 && (
          <style>{`
            @keyframes mParticle { 0%,100% { opacity: 0; } 30%,70% { opacity: 1; } }
          `}</style>
        )}
        {powerChain && powerChain.length > 1 && (
          <>
            <marker id={`${chainId}-arrow`} viewBox="0 0 10 8" refX="8" refY="4"
              markerWidth={5 * scale} markerHeight={4 * scale} orient="auto-start-reverse">
              <path d="M 0 0 L 10 4 L 0 8 z" fill="rgb(255 180 40)" />
            </marker>
            <linearGradient id={`${chainId}-grad`} x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgb(255 200 60)" stopOpacity="0.6" />
              <stop offset="100%" stopColor="rgb(255 120 20)" stopOpacity="0.9" />
            </linearGradient>
            <style>{`
              @keyframes powerFlow {
                0% { stroke-dashoffset: 40; opacity: 0.4; }
                50% { stroke-dashoffset: 0; opacity: 1; }
                100% { stroke-dashoffset: -40; opacity: 0.4; }
              }
            `}</style>
          </>
        )}
      </defs>
      {/* Range circle */}
      {range && (() => {
        const radii = { close: 35, mid: 55, long: 80 };
        const labels = { close: "CLOSE", mid: "MID", long: "LONG" };
        const r = radii[range] * scale;
        const cx = pose.hp[0] * scale;
        const cy = (Math.max(pose.aL[1], pose.aR[1]) + 10) * scale;
        return (
          <g opacity={0.3}>
            <ellipse cx={cx} cy={cy} rx={r} ry={r * 0.3}
              fill="none" stroke={`rgb(${colorRgb})`} strokeWidth={1.5 * scale}
              strokeDasharray={`${4 * scale} ${3 * scale}`} />
            <text x={cx + r + 4 * scale} y={cy + 3 * scale}
              fill={`rgb(${colorRgb})`} fontSize={7 * scale} fontFamily="monospace"
              opacity={0.7}>{labels[range]}</text>
          </g>
        );
      })()}
      {/* Ghost mistake figure */}
      {mistake && (() => {
        const mp = mistake.pose;
        const mNeck: Vec2 = midpoint(mp.sL, mp.sR);
        const mHipL: Vec2 = [mp.hp[0] - 12, mp.hp[1]];
        const mHipR: Vec2 = [mp.hp[0] + 12, mp.hp[1]];
        const errColor = "rgb(239 68 68 / 0.35)";
        const sl = (a: Vec2, b: Vec2, k: string) => (
          <line key={`m-${k}`} x1={a[0]*scale} y1={a[1]*scale} x2={b[0]*scale} y2={b[1]*scale}
            stroke={errColor} strokeWidth={3*scale} strokeLinecap="round"
            strokeDasharray={`${4*scale} ${3*scale}`} />
        );
        return (
          <g opacity={0.6}>
            {sl(mNeck, mp.hp, "torso")}
            {sl(mp.sL, mp.sR, "sh")}
            {sl(mp.sL, mp.eL, "ual")} {sl(mp.eL, mp.wL, "fal")}
            {sl(mp.sR, mp.eR, "uar")} {sl(mp.eR, mp.wR, "far")}
            {sl(mHipL, mp.kL, "ull")} {sl(mp.kL, mp.aL, "lll")}
            {sl(mHipR, mp.kR, "ulr")} {sl(mp.kR, mp.aR, "llr")}
            <circle cx={mp.hd[0]*scale} cy={mp.hd[1]*scale} r={12*scale}
              fill="none" stroke={errColor} strokeWidth={2*scale} strokeDasharray={`${3*scale} ${3*scale}`} />
            <text x={mp.hd[0]*scale} y={(mp.hd[1] - 20)*scale}
              fill="rgb(239 68 68 / 0.7)" fontSize={7*scale} fontFamily="monospace"
              textAnchor="middle" fontWeight="bold">✗ {mistake.label}</text>
          </g>
        );
      })()}
      {/* Opponent figure */}
      {opponent && (() => {
        const op = opponent;
        const oNeck: Vec2 = midpoint(op.sL, op.sR);
        const oHipL: Vec2 = [op.hp[0] - 12, op.hp[1]];
        const oHipR: Vec2 = [op.hp[0] + 12, op.hp[1]];
        const oColor = "var(--fg-15)";
        const ol = (a: Vec2, b: Vec2, k: string) => (
          <line key={`o-${k}`} x1={a[0]*scale} y1={a[1]*scale} x2={b[0]*scale} y2={b[1]*scale}
            stroke={oColor} strokeWidth={3*scale} strokeLinecap="round" />
        );
        return (
          <g opacity={0.5}>
            {ol(oNeck, op.hp, "t")} {ol(op.sL, op.sR, "sh")}
            {ol(op.sL, op.eL, "ual")} {ol(op.eL, op.wL, "fal")}
            {ol(op.sR, op.eR, "uar")} {ol(op.eR, op.wR, "far")}
            {ol(oHipL, op.kL, "ull")} {ol(op.kL, op.aL, "lll")}
            {ol(oHipR, op.kR, "ulr")} {ol(op.kR, op.aR, "llr")}
            <circle cx={op.hd[0]*scale} cy={op.hd[1]*scale} r={12*scale}
              fill="var(--fg-08)" stroke={oColor} strokeWidth={2*scale} />
            <circle cx={op.wL[0]*scale} cy={op.wL[1]*scale} r={4*scale} fill={oColor} />
            <circle cx={op.wR[0]*scale} cy={op.wR[1]*scale} r={4*scale} fill={oColor} />
          </g>
        );
      })()}
      {/* Motion trails for mastery ≥ 2 */}
      {ml !== undefined && ml >= 2 && active && active.length > 0 && (() => {
        const trailOffsets = [[-4, 0], [-8, 0]];
        return trailOffsets.map((off, ti) => {
          const op = ti === 0 ? 0.15 : 0.07;
          return (
            <g key={`trail-${ti}`} opacity={op} transform={`translate(${off[0] * scale}, ${off[1] * scale})`}>
              {active.map(j => {
                const p = pose[j];
                return <circle key={`t-${ti}-${j}`} cx={p[0] * scale} cy={p[1] * scale} r={5 * scale}
                  fill={accentColor} />;
              })}
            </g>
          );
        });
      })()}
      {/* Main body — mastery glow wraps at level 3+ */}
      <g filter={ml !== undefined && ml >= 3 ? `url(#${masteryGlowId})` : undefined}>
      {/* Torso */}
      {line(neck, pose.hp, "torso", masteryBodyColor, 4 * scale)}
      {/* Shoulder bar */}
      {line(pose.sL, pose.sR, "shoulders", masteryBodyColor, 3 * scale)}
      {/* Arms */}
      {line(pose.sL, pose.eL, "ua-l", heatMode ? heatColor("eL") : (act.has("eL") ? accentColor : masteryBodyColor), limbWidth("eL"), heatMode && act.has("eL"))}
      {line(pose.eL, pose.wL, "fa-l", heatMode ? heatColor("wL") : (act.has("wL") ? accentColor : masteryBodyColor), limbWidth("wL"), heatMode && act.has("wL"))}
      {line(pose.sR, pose.eR, "ua-r", heatMode ? heatColor("eR") : (act.has("eR") ? accentColor : masteryBodyColor), limbWidth("eR"), heatMode && act.has("eR"))}
      {line(pose.eR, pose.wR, "fa-r", heatMode ? heatColor("wR") : (act.has("wR") ? accentColor : masteryBodyColor), limbWidth("wR"), heatMode && act.has("wR"))}
      {/* Legs */}
      {line(hipL, pose.kL, "ul-l", heatMode ? heatColor("kL") : (act.has("kL") ? accentColor : masteryBodyColor), limbWidth("kL"), heatMode && act.has("kL"))}
      {line(pose.kL, pose.aL, "ll-l", heatMode ? heatColor("aL") : (act.has("aL") ? accentColor : masteryBodyColor), limbWidth("aL"), heatMode && act.has("aL"))}
      {line(hipR, pose.kR, "ul-r", heatMode ? heatColor("kR") : (act.has("kR") ? accentColor : masteryBodyColor), limbWidth("kR"), heatMode && act.has("kR"))}
      {line(pose.kR, pose.aR, "ll-r", heatMode ? heatColor("aR") : (act.has("aR") ? accentColor : masteryBodyColor), limbWidth("aR"), heatMode && act.has("aR"))}
      {/* Fists */}
      <circle cx={pose.wL[0] * scale} cy={pose.wL[1] * scale} r={(heatMode && act.has("wL") ? 7 : 5) * scale}
        fill={heatMode && act.has("wL") ? `rgb(${HEAT_COLORS[3]})` : act.has("wL") ? accentColor : bodyColor}
        filter={heatMode && act.has("wL") ? `url(#${filterId})` : undefined}
        style={{ transition: "all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)" }} />
      <circle cx={pose.wR[0] * scale} cy={pose.wR[1] * scale} r={(heatMode && act.has("wR") ? 7 : 5) * scale}
        fill={heatMode && act.has("wR") ? `rgb(${HEAT_COLORS[3]})` : act.has("wR") ? accentColor : bodyColor}
        filter={heatMode && act.has("wR") ? `url(#${filterId})` : undefined}
        style={{ transition: "all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)" }} />
      {/* Feet glow in heat mode */}
      {heatMode && act.has("aL") && (
        <circle cx={pose.aL[0] * scale} cy={pose.aL[1] * scale} r={6 * scale}
          fill={`rgb(${HEAT_COLORS[3]})`} filter={`url(#${filterId})`}
          style={{ transition: "all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)" }} />
      )}
      {heatMode && act.has("aR") && (
        <circle cx={pose.aR[0] * scale} cy={pose.aR[1] * scale} r={6 * scale}
          fill={`rgb(${HEAT_COLORS[3]})`} filter={`url(#${filterId})`}
          style={{ transition: "all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)" }} />
      )}
      {/* Weight distribution indicators */}
      {showWeight && (() => {
        const heavyL = weightSide === "L" || weightSide === "even";
        const heavyR = weightSide === "R" || weightSide === "even";
        const rL = weightSide === "L" ? 8 : weightSide === "even" ? 6 : 4;
        const rR = weightSide === "R" ? 8 : weightSide === "even" ? 6 : 4;
        const opL = weightSide === "L" ? 0.7 : weightSide === "even" ? 0.4 : 0.2;
        const opR = weightSide === "R" ? 0.7 : weightSide === "even" ? 0.4 : 0.2;
        return (
          <>
            <circle cx={pose.aL[0] * scale} cy={(pose.aL[1] + 4) * scale} r={rL * scale}
              fill={`rgb(${colorRgb} / ${opL})`}
              style={{ transition: "all 0.4s ease" }} />
            {heavyL && weightSide !== "even" && (
              <circle cx={pose.aL[0] * scale} cy={(pose.aL[1] + 4) * scale} r={(rL + 4) * scale}
                fill="none" stroke={`rgb(${colorRgb} / 0.3)`} strokeWidth={1.5 * scale}
                style={{ transition: "all 0.4s ease" }} />
            )}
            <circle cx={pose.aR[0] * scale} cy={(pose.aR[1] + 4) * scale} r={rR * scale}
              fill={`rgb(${colorRgb} / ${opR})`}
              style={{ transition: "all 0.4s ease" }} />
            {heavyR && weightSide !== "even" && (
              <circle cx={pose.aR[0] * scale} cy={(pose.aR[1] + 4) * scale} r={(rR + 4) * scale}
                fill="none" stroke={`rgb(${colorRgb} / 0.3)`} strokeWidth={1.5 * scale}
                style={{ transition: "all 0.4s ease" }} />
            )}
            {weightSide !== "even" && (
              <text x={(weightSide === "L" ? pose.aL[0] : pose.aR[0]) * scale}
                y={((weightSide === "L" ? pose.aL[1] : pose.aR[1]) + 18) * scale}
                fill={`rgb(${colorRgb} / 0.6)`} fontSize={7 * scale} fontFamily="monospace"
                textAnchor="middle"
                style={{ transition: "all 0.4s ease" }}>
                ●●●
              </text>
            )}
          </>
        );
      })()}
      {/* Power chain arrows */}
      {powerChain && powerChain.length > 1 && (() => {
        const pts = powerChain.map(j => pose[j]);
        const segs: React.ReactNode[] = [];
        for (let i = 0; i < pts.length - 1; i++) {
          const a = pts[i];
          const b = pts[i + 1];
          const ox = (b[1] - a[1]) * 0.15;
          const oy = -(b[0] - a[0]) * 0.15;
          const mx = (a[0] + b[0]) / 2 + ox;
          const my = (a[1] + b[1]) / 2 + oy;
          const totalLen = Math.sqrt((b[0]-a[0])**2 + (b[1]-a[1])**2) * scale;
          segs.push(
            <path key={`pc-${i}`}
              d={`M ${a[0]*scale} ${a[1]*scale} Q ${mx*scale} ${my*scale} ${b[0]*scale} ${b[1]*scale}`}
              fill="none" stroke={`url(#${chainId}-grad)`}
              strokeWidth={2.5 * scale} strokeLinecap="round"
              markerEnd={`url(#${chainId}-arrow)`}
              strokeDasharray={`${totalLen * 0.6} ${totalLen * 0.4}`}
              style={{
                animation: `powerFlow ${0.8 + i * 0.15}s ease-in-out infinite`,
                animationDelay: `${i * 0.12}s`,
              }}
            />
          );
          if (i > 0) {
            segs.push(
              <circle key={`pc-dot-${i}`}
                cx={a[0] * scale} cy={a[1] * scale} r={3 * scale}
                fill="rgb(255 180 40 / 0.7)"
              />
            );
          }
        }
        return <g opacity={0.85}>{segs}</g>;
      })()}
      {/* Head */}
      <circle cx={pose.hd[0] * scale} cy={pose.hd[1] * scale} r={13 * scale}
        fill={ml !== undefined && ml >= 1 ? `rgb(${colorRgb} / 0.15)` : "var(--fg-15)"} stroke={masteryBodyColor} strokeWidth={2.5 * scale}
        strokeDasharray={masteryStroke ?? undefined}
        style={{ transition: "all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)" }} />
      </g>{/* close mastery glow wrapper */}
      {/* Particle aura for mastery 4 */}
      {ml !== undefined && ml >= 4 && (() => {
        const cx = pose.hp[0] * scale;
        const cy = (pose.hp[1] - 20) * scale;
        const particles: React.ReactNode[] = [];
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2;
          const r = (45 + (i % 3) * 8) * scale;
          const px = cx + Math.cos(angle) * r;
          const py = cy + Math.sin(angle) * r * 0.8;
          particles.push(
            <circle key={`mp-${i}`} cx={px} cy={py} r={(1.5 + (i % 2)) * scale}
              fill={accentColor} opacity={0.6}
              style={{ animation: `mParticle ${1.5 + i * 0.2}s ease-in-out infinite`, animationDelay: `${i * 0.15}s` }} />
          );
        }
        return <g>{particles}</g>;
      })()}
      {/* Muscle labels in heat mode */}
      {heatMode && active && active.length > 0 && (() => {
        const shown = new Set<string>();
        return active.filter(j => {
          const lbl = JOINT_MUSCLE_LABEL[j];
          if (!lbl || shown.has(lbl)) return false;
          shown.add(lbl);
          return true;
        }).slice(0, 3).map((j, i) => {
          const p = pose[j];
          const lbl = JOINT_MUSCLE_LABEL[j]!;
          const intensity = getHeatIntensity(j);
          return (
            <text key={`ml-${i}`} x={(p[0] + (j.endsWith("L") ? -22 : 22)) * scale} y={(p[1] - 8) * scale}
              fill={`rgb(${HEAT_COLORS[intensity]} / 0.8)`}
              fontSize={8 * scale} fontFamily="monospace" textAnchor={j.endsWith("L") ? "end" : "start"}
              style={{ transition: "all 0.4s ease" }}>
              {lbl}
            </text>
          );
        });
      })()}
      {/* Angle indicators */}
      {angles && angles.length > 0 && angles.map((am, ai) => {
        const [a, b, c] = am.joints;
        const pA = pose[a], pB = pose[b], pC = pose[c];
        const v1x = pA[0] - pB[0], v1y = pA[1] - pB[1];
        const v2x = pC[0] - pB[0], v2y = pC[1] - pB[1];
        const dot = v1x * v2x + v1y * v2y;
        const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
        const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);
        const deg = Math.round(Math.acos(Math.min(1, Math.max(-1, dot / (mag1 * mag2)))) * 180 / Math.PI);
        const label = am.label ?? `${deg}°`;
        const arcR = 16 * scale;
        const startA = Math.atan2(v1y, v1x);
        const endA = Math.atan2(v2y, v2x);
        let sweep = endA - startA;
        if (sweep > Math.PI) sweep -= 2 * Math.PI;
        if (sweep < -Math.PI) sweep += 2 * Math.PI;
        const sf = sweep >= 0 ? 1 : 0;
        const ax1 = pB[0] * scale + Math.cos(startA) * arcR;
        const ay1 = pB[1] * scale + Math.sin(startA) * arcR;
        const ax2 = pB[0] * scale + Math.cos(endA) * arcR;
        const ay2 = pB[1] * scale + Math.sin(endA) * arcR;
        const midA = startA + sweep / 2;
        const lx = pB[0] * scale + Math.cos(midA) * (arcR + 10 * scale);
        const ly = pB[1] * scale + Math.sin(midA) * (arcR + 10 * scale);
        return (
          <g key={`angle-${ai}`} opacity={0.9}>
            <path d={`M ${ax1} ${ay1} A ${arcR} ${arcR} 0 0 ${sf} ${ax2} ${ay2}`}
              fill="none" stroke="rgb(140 220 255)" strokeWidth={1.5 * scale} strokeLinecap="round" />
            <text x={lx} y={ly} fill="rgb(140 220 255)" fontSize={9 * scale}
              fontFamily="monospace" fontWeight="bold" textAnchor="middle" dominantBaseline="central">
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function TechniqueAnimView({ techniqueName, category, colorRgb, mastery }: {
  techniqueName: string; category?: string; colorRgb: string; mastery?: number;
}) {
  const anim = useMemo(() => getAnimation(techniqueName, category), [techniqueName, category]);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [heatMode, setHeatMode] = useState(false);
  const [chainMode, setChainMode] = useState(false);
  const [weightMode, setWeightMode] = useState(false);
  const [angleMode, setAngleMode] = useState(false);
  const [mistakeMode, setMistakeMode] = useState(false);
  const [opponentMode, setOpponentMode] = useState(false);
  const [mirrorMode, setMirrorMode] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1);
  const [masteryLvl, setMasteryLvl] = useState(mastery ?? 1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { setFrame(0); setPlaying(false); setMasteryLvl(mastery ?? 1); }, [techniqueName, mastery]);

  useEffect(() => {
    if (!anim || !playing) { if (intervalRef.current) clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(() => {
      setFrame(f => (f + 1) % anim.frames.length);
    }, 900 / playSpeed);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, anim, playSpeed]);

  if (!anim) return null;
  const mirrorSk = (sk: Skeleton): Skeleton => {
    const m: Record<string, Vec2> = {};
    for (const [k, v] of Object.entries(sk)) m[k] = [200 - v[0], v[1]];
    return m as unknown as Skeleton;
  };
  const rawF = anim.frames[frame];
  const f = mirrorMode ? {
    ...rawF,
    pose: mirrorSk(rawF.pose),
    opponent: rawF.opponent ? mirrorSk(rawF.opponent) : undefined,
    mistake: rawF.mistake ? { ...rawF.mistake, pose: mirrorSk(rawF.mistake.pose) } : undefined,
  } : rawF;

  const catColors: Record<string, string> = {
    strike: "239 68 68", defense: "59 130 246", kick: "234 179 8",
    elbow: "249 115 22", knee: "168 85 247", stance: "96 165 250",
    grappling: "34 197 94", footwork: "251 146 60", conditioning: "244 114 182", forms: "147 130 220",
  };
  const trailColor = `rgb(${catColors[anim.category] ?? colorRgb} / 0.3)`;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "var(--fg-03)", border: "1px solid var(--fg-06)" }}>
      <div className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: "1px solid var(--fg-06)" }}>
        <span className="text-[8px] font-mono tracking-widest" style={{ color: `rgb(${colorRgb})` }}>
          TECHNIQUE ANIMATION
        </span>
        <span className="text-[9px] font-mono" style={{ color: "var(--fg-30)" }}>
          {frame + 1} / {anim.frames.length}
        </span>
      </div>

      <div className="flex items-center justify-center py-4 relative" style={{ minHeight: 180 }}>
        {/* Motion trail */}
        {frame > 0 && f.trail && anim.frames[frame - 1] && (() => {
          const prev = anim.frames[frame - 1].pose[f.trail!];
          const curr = f.pose[f.trail!];
          if (!prev || !curr) return null;
          const mx = (prev[0] + curr[0]) / 2;
          const my = Math.min(prev[1], curr[1]) - 12;
          return (
            <svg className="absolute inset-0" width="100%" height="100%"
              viewBox="0 0 200 290" preserveAspectRatio="xMidYMid meet"
              style={{ opacity: 0.5 }}>
              <path d={`M ${prev[0]} ${prev[1]} Q ${mx} ${my} ${curr[0]} ${curr[1]}`}
                fill="none" stroke={trailColor} strokeWidth="3"
                strokeDasharray="6 4" strokeLinecap="round" />
              <circle cx={curr[0]} cy={curr[1]} r="4" fill={trailColor} />
            </svg>
          );
        })()}
        <StickFigureSVG pose={f.pose} colorRgb={colorRgb} active={f.active} size={160} heatMode={heatMode}
          powerChain={chainMode ? f.powerChain : undefined} showWeight={weightMode} weightOverride={f.weight}
          angles={angleMode ? f.angles : undefined} mistake={mistakeMode ? f.mistake : undefined}
          opponent={opponentMode ? f.opponent : undefined}
          range={opponentMode ? anim.range : undefined} mastery={masteryLvl} />
      </div>

      <div className="px-4 pb-2">
        <p className="text-[12px] text-center leading-snug" style={{ color: "var(--fg-60)" }}>
          {f.caption}
        </p>
        {f.breath && (
          <p className="text-[10px] text-center mt-1 font-mono tracking-wider"
            style={{ color: f.breath === "exhale" ? "rgb(239 68 68 / 0.6)" : "rgb(96 165 250 / 0.6)" }}>
            {f.breath === "exhale" ? "▸ EXHALE" : "◂ INHALE"}
          </p>
        )}
      </div>

      <div className="flex items-center justify-center gap-3 px-4 pb-3">
        {anim.frames.length > 1 && (
          <button onClick={() => { setPlaying(!playing); }}
            className="flex items-center justify-center rounded-full"
            style={{
              width: 36, height: 36,
              background: `rgb(${colorRgb} / 0.1)`,
              color: `rgb(${colorRgb})`,
            }}>
            {playing ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: 2 }} />}
          </button>
        )}
        <button onClick={() => setHeatMode(!heatMode)}
          className="flex items-center justify-center rounded-full"
          style={{
            width: 36, height: 36,
            background: heatMode ? "rgb(255 100 30 / 0.15)" : "var(--fg-04)",
            color: heatMode ? "rgb(255 100 30)" : "var(--fg-50)",
          }}
          title="Muscle heat map">
          <Flame size={14} />
        </button>
        {anim.frames.some(fr => fr.powerChain) && (
          <button onClick={() => setChainMode(!chainMode)}
            className="flex items-center justify-center rounded-full"
            style={{
              width: 36, height: 36,
              background: chainMode ? "rgb(255 180 40 / 0.15)" : "var(--fg-04)",
              color: chainMode ? "rgb(255 180 40)" : "var(--fg-50)",
            }}
            title="Power chain">
            <Zap size={14} />
          </button>
        )}
        <button onClick={() => setWeightMode(!weightMode)}
          className="flex items-center justify-center rounded-full"
          style={{
            width: 36, height: 36,
            background: weightMode ? "rgb(100 200 255 / 0.15)" : "var(--fg-04)",
            color: weightMode ? "rgb(100 200 255)" : "var(--fg-50)",
          }}
          title="Weight distribution">
          <Footprints size={14} />
        </button>
        {anim.frames.some(fr => fr.angles) && (
          <button onClick={() => setAngleMode(!angleMode)}
            className="flex items-center justify-center rounded-full"
            style={{
              width: 36, height: 36,
              background: angleMode ? "rgb(140 220 255 / 0.15)" : "var(--fg-04)",
              color: angleMode ? "rgb(140 220 255)" : "var(--fg-50)",
            }}
            title="Joint angles">
            <Ruler size={14} />
          </button>
        )}
        {anim.frames.some(fr => fr.mistake) && (
          <button onClick={() => setMistakeMode(!mistakeMode)}
            className="flex items-center justify-center rounded-full"
            style={{
              width: 36, height: 36,
              background: mistakeMode ? "rgb(239 68 68 / 0.15)" : "var(--fg-04)",
              color: mistakeMode ? "rgb(239 68 68)" : "var(--fg-50)",
            }}
            title="Common mistakes">
            <AlertTriangle size={14} />
          </button>
        )}
        {anim.frames.some(fr => fr.opponent) && (
          <button onClick={() => setOpponentMode(!opponentMode)}
            className="flex items-center justify-center rounded-full"
            style={{
              width: 36, height: 36,
              background: opponentMode ? "rgb(160 160 200 / 0.15)" : "var(--fg-04)",
              color: opponentMode ? "rgb(160 160 200)" : "var(--fg-50)",
            }}
            title="Show opponent">
            <Users size={14} />
          </button>
        )}
        {anim.frames.length > 1 && (
          <>
            <button onClick={() => {
              setPlaying(false);
              setFrame(f2 => (f2 + 1) % anim.frames.length);
            }}
              className="flex items-center justify-center rounded-full"
              style={{
                width: 36, height: 36,
                background: "var(--fg-04)",
                color: "var(--fg-50)",
              }}>
              <SkipForward size={14} />
            </button>
            <div className="flex gap-1.5 ml-2">
              {anim.frames.map((_, i) => (
                <button key={i} onClick={() => { setPlaying(false); setFrame(i); }}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: i === frame ? 16 : 6, height: 6,
                    background: i === frame ? `rgb(${colorRgb})` : "var(--fg-12)",
                  }} />
              ))}
            </div>
          </>
        )}
      </div>
      {/* Secondary controls: mirror + speed + mastery */}
      <div className="flex items-center justify-center gap-3 px-4 pb-3 flex-wrap">
        <button onClick={() => setMirrorMode(!mirrorMode)}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
          style={{
            background: mirrorMode ? `rgb(${colorRgb} / 0.12)` : "var(--fg-03)",
            color: mirrorMode ? `rgb(${colorRgb})` : "var(--fg-40)",
            fontSize: 10,
          }}>
          <FlipHorizontal size={12} />
          {mirrorMode ? "Southpaw" : "Mirror"}
        </button>
        {anim.frames.length > 1 && (
          <button onClick={() => setPlaySpeed(s => s === 0.5 ? 1 : s === 1 ? 2 : 0.5)}
            className="flex items-center gap-1 rounded-full px-3 py-1.5"
            style={{
              background: playSpeed !== 1 ? `rgb(${colorRgb} / 0.12)` : "var(--fg-03)",
              color: playSpeed !== 1 ? `rgb(${colorRgb})` : "var(--fg-40)",
              fontSize: 10, fontFamily: "monospace",
            }}>
            {playSpeed === 0.5 ? "0.5×" : playSpeed === 2 ? "2×" : "1×"}
          </button>
        )}
        <button onClick={() => setMasteryLvl(l => (l + 1) % 5)}
          className="flex items-center gap-1 rounded-full px-3 py-1.5"
          style={{
            background: masteryLvl >= 3 ? `rgb(${colorRgb} / 0.12)` : "var(--fg-03)",
            color: masteryLvl >= 3 ? `rgb(${colorRgb})` : "var(--fg-40)",
            fontSize: 10,
          }}>
          <Star size={10} fill={masteryLvl >= 2 ? `rgb(${colorRgb})` : "none"} />
          {["Wire", "Solid", "Trail", "Glow", "Aura"][masteryLvl]}
        </button>
      </div>
    </div>
  );
}

function TechniqueCollectibleCard({ technique, colorRgb, mastery, onTap }: {
  technique: { name: string; category: string; difficulty: string; muscles_used: string[]; description?: string | null };
  colorRgb: string; mastery?: number; onTap?: () => void;
}) {
  const anim = useMemo(() => getAnimation(technique.name, technique.category), [technique.name, technique.category]);
  if (!anim) return null;
  const pose = anim.frames[Math.floor(anim.frames.length / 2)]?.pose ?? anim.frames[0].pose;

  const catStats: Record<string, { power: number; speed: number }> = {
    strike: { power: 7, speed: 8 }, defense: { power: 2, speed: 9 }, kick: { power: 9, speed: 6 },
    elbow: { power: 8, speed: 7 }, knee: { power: 9, speed: 5 }, stance: { power: 1, speed: 3 },
    grappling: { power: 6, speed: 4 }, footwork: { power: 1, speed: 8 },
    conditioning: { power: 5, speed: 5 }, forms: { power: 4, speed: 6 },
  };
  const diffVal: Record<string, number> = { beginner: 2, intermediate: 5, advanced: 8, expert: 10 };
  const rangeVal: Record<string, string> = { close: "Close", mid: "Mid", long: "Long" };
  const stats = catStats[anim.category] ?? { power: 5, speed: 5 };
  const diff = diffVal[technique.difficulty] ?? 5;

  const bar = (label: string, val: number, max: number) => (
    <div className="flex items-center gap-2">
      <span className="text-[8px] font-mono w-[42px] text-right" style={{ color: "var(--fg-30)" }}>{label}</span>
      <div className="flex-1 h-[4px] rounded-full overflow-hidden" style={{ background: "var(--fg-06)" }}>
        <div className="h-full rounded-full transition-all" style={{
          width: `${(val / max) * 100}%`,
          background: `rgb(${colorRgb})`,
          opacity: 0.4 + (val / max) * 0.6,
        }} />
      </div>
    </div>
  );

  return (
    <button onClick={onTap}
      className="rounded-2xl border overflow-hidden text-left transition-all active:scale-[0.97] w-full"
      style={{ borderColor: `rgb(${colorRgb} / 0.15)`, background: "var(--bg-primary)" }}>
      <div className="relative flex items-center justify-center py-3"
        style={{ background: `rgb(${colorRgb} / 0.04)` }}>
        <StickFigureSVG pose={pose} colorRgb={colorRgb} active={anim.frames[Math.floor(anim.frames.length / 2)]?.active} size={80} mastery={mastery} />
        {anim.range && (
          <span className="absolute top-2 right-2 text-[7px] font-mono px-1.5 py-0.5 rounded-full"
            style={{ background: `rgb(${colorRgb} / 0.1)`, color: `rgb(${colorRgb})` }}>
            {rangeVal[anim.range] ?? anim.range}
          </span>
        )}
        <span className="absolute top-2 left-2 text-[7px] font-mono px-1.5 py-0.5 rounded-full capitalize"
          style={{ background: `rgb(${colorRgb} / 0.1)`, color: `rgb(${colorRgb})` }}>
          {anim.category}
        </span>
      </div>
      <div className="p-3 space-y-2">
        <p className="text-[12px] font-bold truncate" style={{ color: "var(--fg-80)" }}>{technique.name}</p>
        <div className="space-y-1">
          {bar("PWR", stats.power, 10)}
          {bar("SPD", stats.speed, 10)}
          {bar("DIFF", diff, 10)}
        </div>
        {technique.muscles_used.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {technique.muscles_used.slice(0, 3).map(m => (
              <span key={m} className="text-[7px] font-mono px-1.5 py-0.5 rounded-full capitalize"
                style={{ background: "var(--fg-04)", color: "var(--fg-40)" }}>
                {m}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

function TechniqueChip({ name, category, colorRgb, onExpand }: {
  name: string; category?: string; colorRgb: string; onExpand?: () => void;
}) {
  const anim = useMemo(() => getAnimation(name, category), [name, category]);
  const [expanded, setExpanded] = useState(false);

  if (!anim) return null;
  const pose = anim.frames[0].pose;

  return (
    <div>
      <button
        onClick={() => { setExpanded(!expanded); onExpand?.(); }}
        className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 active:scale-[0.97] transition-transform"
        style={{ background: `rgb(${colorRgb} / 0.08)`, border: `1px solid rgb(${colorRgb} / 0.15)` }}
      >
        <StickFigureSVG pose={pose} colorRgb={colorRgb} size={24} />
        <span className="text-[11px] font-medium" style={{ color: `rgb(${colorRgb})` }}>{name}</span>
        <ChevronRight size={10} className="transition-transform" style={{
          color: `rgb(${colorRgb} / 0.5)`,
          transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
        }} />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-2">
            <TechniqueAnimView techniqueName={name} category={category} colorRgb={colorRgb} mastery={1} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StepIllustrationCards({ techniqueName, category, colorRgb }: {
  techniqueName: string; category?: string; colorRgb: string;
}) {
  const anim = useMemo(() => getAnimation(techniqueName, category), [techniqueName, category]);
  const [stripMode, setStripMode] = useState(false);
  if (!anim || anim.frames.length <= 1) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-mono tracking-widest" style={{ color: "var(--fg-25)" }}>
          STEP-BY-STEP BREAKDOWN
        </p>
        <button onClick={() => setStripMode(!stripMode)}
          className="text-[8px] font-mono px-2 py-0.5 rounded-full"
          style={{ background: stripMode ? `rgb(${colorRgb} / 0.1)` : "var(--fg-04)", color: stripMode ? `rgb(${colorRgb})` : "var(--fg-30)" }}>
          {stripMode ? "Cards" : "Strip"}
        </button>
      </div>
      {stripMode ? (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--fg-06)", background: "var(--fg-02)" }}>
          <div className="flex items-end justify-center gap-0 px-2 py-3 overflow-x-auto"
            style={{ scrollbarWidth: "none" }}>
            {anim.frames.map((f, i) => (
              <div key={i} className="flex flex-col items-center shrink-0" style={{ width: 52 }}>
                <StickFigureSVG pose={f.pose} colorRgb={colorRgb} active={f.active} size={44} />
                <span className="text-[7px] font-mono mt-0.5" style={{ color: `rgb(${colorRgb} / 0.5)` }}>{i + 1}</span>
                {i < anim.frames.length - 1 && (
                  <span className="text-[8px] absolute" style={{ color: "var(--fg-15)", right: -4, top: "50%" }}>→</span>
                )}
              </div>
            ))}
          </div>
          <div className="px-3 pb-2 pt-0.5 border-t" style={{ borderColor: "var(--fg-06)" }}>
            <p className="text-[8px] font-mono text-center" style={{ color: "var(--fg-25)" }}>
              {techniqueName} — {anim.frames.length} frames
            </p>
          </div>
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 snap-x"
          style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
          {anim.frames.map((f, i) => (
            <div key={i} className="flex-shrink-0 snap-start rounded-xl overflow-hidden"
              style={{
                width: 120, background: "var(--fg-03)",
                border: "1px solid var(--fg-06)",
              }}>
              <div className="flex items-center justify-center py-2" style={{ minHeight: 100 }}>
                <StickFigureSVG pose={f.pose} colorRgb={colorRgb} active={f.active} size={80} />
              </div>
              <div className="px-2 pb-2">
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="text-[10px] font-black" style={{ color: `rgb(${colorRgb} / 0.4)` }}>
                    {i + 1}
                  </span>
                </div>
                <p className="text-[9px] leading-tight" style={{ color: "var(--fg-50)" }}>
                  {f.caption}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FootworkDiagram({ techniqueName, category, colorRgb }: {
  techniqueName: string; category?: string; colorRgb: string;
}) {
  const anim = useMemo(() => getAnimation(techniqueName, category), [techniqueName, category]);
  if (!anim || anim.frames.length < 2) return null;
  if (!["footwork", "kick", "stance"].includes(anim.category)) return null;

  const w = 160, h = 120;
  const mapX = (x: number) => ((x - 60) / 80) * (w - 40) + 20;
  const mapY = (y: number) => ((y - 220) / 50) * (h - 30) + 10;

  return (
    <div className="space-y-1.5">
      <p className="text-[9px] font-mono tracking-widest" style={{ color: "var(--fg-25)" }}>
        FOOTWORK PATTERN
      </p>
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--fg-06)", background: "var(--fg-02)" }}>
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="mx-auto block">
          {anim.frames.map((f, i) => {
            const lx = mapX(f.pose.aL[0]), ly = mapY(f.pose.aL[1]);
            const rx = mapX(f.pose.aR[0]), ry = mapY(f.pose.aR[1]);
            const op = 0.2 + (i / (anim.frames.length - 1)) * 0.8;
            const isLast = i === anim.frames.length - 1;
            return (
              <g key={i} opacity={op}>
                {i > 0 && (
                  <>
                    <line x1={mapX(anim.frames[i - 1].pose.aL[0])} y1={mapY(anim.frames[i - 1].pose.aL[1])}
                      x2={lx} y2={ly} stroke={`rgb(${colorRgb} / 0.15)`} strokeWidth={1} strokeDasharray="2 2" />
                    <line x1={mapX(anim.frames[i - 1].pose.aR[0])} y1={mapY(anim.frames[i - 1].pose.aR[1])}
                      x2={rx} y2={ry} stroke={`rgb(${colorRgb} / 0.15)`} strokeWidth={1} strokeDasharray="2 2" />
                  </>
                )}
                <ellipse cx={lx} cy={ly} rx={isLast ? 8 : 5} ry={isLast ? 4 : 2.5}
                  fill={`rgb(${colorRgb} / ${isLast ? 0.5 : 0.2})`}
                  stroke={isLast ? `rgb(${colorRgb})` : "none"} strokeWidth={1} />
                <ellipse cx={rx} cy={ry} rx={isLast ? 8 : 5} ry={isLast ? 4 : 2.5}
                  fill={`rgb(${colorRgb} / ${isLast ? 0.5 : 0.2})`}
                  stroke={isLast ? `rgb(${colorRgb})` : "none"} strokeWidth={1} />
                {isLast && (
                  <>
                    <text x={lx} y={ly + 1} fill={`rgb(${colorRgb})`} fontSize={5}
                      textAnchor="middle" dominantBaseline="central" fontFamily="monospace">L</text>
                    <text x={rx} y={ry + 1} fill={`rgb(${colorRgb})`} fontSize={5}
                      textAnchor="middle" dominantBaseline="central" fontFamily="monospace">R</text>
                  </>
                )}
              </g>
            );
          })}
          <text x={w / 2} y={h - 4} fill="var(--fg-15)" fontSize={6} textAnchor="middle" fontFamily="monospace">
            ↑ FORWARD
          </text>
        </svg>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// LESSON VIEW — technique breakdowns + drill
// ═══════════════════════════════════════════════

type LessonStep = "intro" | "technique" | "formcheck" | "drill" | "mistakes" | "selfcheck" | "rate" | "complete";

function LessonView({ lesson, discipline, userId, onBack, onViewTechnique }: {
  lesson: Lesson;
  discipline: Discipline;
  userId?: string;
  onBack: () => void;
  onViewTechnique: (tech: Technique) => void;
}) {
  const d = DISCIPLINES[discipline] ?? { colorRgb: "100 100 100", name: discipline };
  const [techniques, setTechniques] = useState<LessonTechnique[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [selfRating, setSelfRating] = useState(0);
  const [step, setStep] = useState<LessonStep>("intro");
  const [techIdx, setTechIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [drillTime, setDrillTime] = useState(0);
  const [drillRunning, setDrillRunning] = useState(false);
  const [fontSize, setFontSize] = useState<"normal" | "large">("normal");
  const [leftHanded, setLeftHanded] = useState(false);
  const lessonContentRef = useRef<HTMLDivElement>(null);
  const textSize = fontSize === "large" ? "text-[14px]" : "text-[12px]";
  const headingSize = fontSize === "large" ? "text-[16px]" : "text-[14px]";

  function mirrorStance(text: string): string {
    if (!leftHanded) return text;
    return text
      .replace(/\bleft\b/gi, "__RIGHT__")
      .replace(/\bright\b/gi, "left")
      .replace(/__RIGHT__/g, "right")
      .replace(/\borthodox\b/gi, "southpaw")
      .replace(/\blead\b/gi, "__REAR__")
      .replace(/\brear\b/gi, "lead")
      .replace(/__REAR__/g, "rear");
  }

  useEffect(() => {
    fetchLessonTechniques(lesson.id).then((data) => {
      setTechniques(data);
      setLoading(false);
    });
  }, [lesson.id]);

  useEffect(() => {
    if (step === "complete") return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [step]);

  useEffect(() => {
    if (!drillRunning) return;
    const id = setInterval(() => setDrillTime((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [drillRunning]);

  useEffect(() => {
    lessonContentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  const primaryTechniques = techniques.filter((t) => t.focus === "primary");

  const [formCheckTech, setFormCheckTech] = useState<Technique | null>(null);

  const steps: LessonStep[] = useMemo(() => {
    const s: LessonStep[] = ["intro"];
    if (primaryTechniques.length > 0) s.push("technique");
    if (primaryTechniques.length > 0) s.push("formcheck");
    if (lesson.drill_name) s.push("drill");
    if (lesson.common_mistakes?.length) s.push("mistakes");
    if (lesson.self_check) s.push("selfcheck");
    s.push("rate", "complete");
    return s;
  }, [primaryTechniques.length, lesson.drill_name, lesson.common_mistakes?.length, lesson.self_check]);

  const stepIdx = steps.indexOf(step);
  const progress = steps.length > 1 ? stepIdx / (steps.length - 1) : 0;

  function nextStep() {
    const next = steps[stepIdx + 1];
    if (next) setStep(next);
  }
  function prevStep() {
    const prev = steps[stepIdx - 1];
    if (prev) setStep(prev);
  }

  async function handleComplete() {
    if (!userId || selfRating === 0) return;
    setCompleting(true);
    await completeLesson(userId, lesson.id, selfRating);
    setCompleted(true);
    setCompleting(false);
    haptic([100, 80, 100, 80, 200]);
    nextStep();
  }

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  if (loading) {
    return (
      <div className="space-y-4 pt-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl animate-pulse" style={{ background: "var(--fg-06)" }} />
        ))}
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="space-y-0 -mx-4 -mt-6">

      {/* Fixed top bar: progress + timer + close */}
      <div className="sticky top-0 z-20 px-4 pt-3 pb-2" style={{ background: "var(--bg-primary)" }}>
        <div className="flex items-center gap-3 mb-2">
          <button onClick={onBack} className="shrink-0">
            <X size={18} style={{ color: "var(--fg-40)" }} />
          </button>
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--fg-06)" }}>
            <motion.div className="h-full rounded-full"
              style={{ background: `rgb(${d.colorRgb})` }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <span className="text-[10px] font-mono shrink-0" style={{ color: "var(--fg-30)" }}>
            {fmtTime(elapsed)}
          </span>
        </div>
        {/* Settings strip: font size + left-handed */}
        <div className="flex items-center gap-2 justify-end">
          <button onClick={() => setFontSize(fontSize === "normal" ? "large" : "normal")}
            className="flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[9px] font-mono transition-all"
            style={{
              background: fontSize === "large" ? `rgb(${d.colorRgb} / 0.1)` : "var(--fg-04)",
              color: fontSize === "large" ? `rgb(${d.colorRgb})` : "var(--fg-30)",
            }}>
            <span className="text-[8px]">A</span>/<span className="text-[11px] font-bold">A</span>
          </button>
          <button onClick={() => setLeftHanded(!leftHanded)}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-mono transition-all"
            style={{
              background: leftHanded ? `rgb(${d.colorRgb} / 0.1)` : "var(--fg-04)",
              color: leftHanded ? `rgb(${d.colorRgb})` : "var(--fg-30)",
            }}>
            {leftHanded ? "🤛 Southpaw" : "🤜 Orthodox"}
          </button>
        </div>
      </div>

      {/* Step content */}
      <div className="px-4" ref={lessonContentRef}>
        <AnimatePresence mode="wait">

          {/* ── INTRO ── */}
          {step === "intro" && (
            <motion.div key="intro" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              className="space-y-5">
              {/* Cinematic title card */}
              <div className="relative -mx-4 rounded-b-3xl overflow-hidden" style={{ height: 200 }}>
                <div className="absolute inset-0" style={{
                  background: `linear-gradient(135deg, rgb(${d.colorRgb} / 0.3), rgb(${d.colorRgb} / 0.08), var(--bg-primary))`,
                }} />
                <div className="absolute inset-0 flex flex-col justify-end px-6 pb-6">
                  <p className="text-[8px] font-mono tracking-widest mb-2" style={{ color: `rgb(${d.colorRgb})` }}>
                    WEEK {lesson.week} · LESSON {lesson.lesson_order}
                  </p>
                  <h1 className="text-[28px] font-black leading-tight" style={{ color: "var(--fg-95)" }}>
                    {lesson.title}
                  </h1>
                  {lesson.subtitle && (
                    <p className="text-[13px] mt-2 leading-relaxed" style={{ color: "var(--fg-50)" }}>
                      {lesson.subtitle}
                    </p>
                  )}
                </div>
                <span className="absolute top-4 right-4 text-[80px] font-black leading-none select-none"
                  style={{ color: `rgb(${d.colorRgb} / 0.06)` }}>
                  {lesson.lesson_order}
                </span>
              </div>

              {/* Duration + XP pills */}
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-full"
                  style={{ color: "var(--fg-50)", background: "var(--fg-04)" }}>
                  <Clock size={12} /> {lesson.duration_min} min
                </span>
                <span className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-full"
                  style={{ color: `rgb(${d.colorRgb})`, background: `rgb(${d.colorRgb} / 0.08)` }}>
                  <Zap size={12} /> {getXpForLesson(lesson)} XP
                </span>
              </div>

              {/* What you'll learn */}
              {primaryTechniques.length > 0 && (
                <div className="rounded-2xl border p-4" style={{ borderColor: "var(--fg-06)", background: "var(--fg-02)" }}>
                  <p className="text-[9px] font-mono tracking-widest mb-3" style={{ color: "var(--fg-25)" }}>
                    WHAT YOU&apos;LL LEARN
                  </p>
                  <div className="space-y-2">
                    {primaryTechniques.map((lt, i) => lt.technique && (() => {
                      const techAnim = getAnimation(lt.technique!.name, lt.technique!.category);
                      return (
                        <div key={lt.technique_id} className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: `rgb(${d.colorRgb} / 0.1)` }}>
                            {techAnim ? (
                              <StickFigureSVG pose={techAnim.frames[0].pose} colorRgb={d.colorRgb} size={22} />
                            ) : (
                              <span className="text-[10px] font-bold" style={{ color: `rgb(${d.colorRgb})` }}>{i + 1}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-semibold" style={{ color: "var(--fg-70)" }}>
                              {lt.technique.name}
                            </p>
                            <p className="text-[10px] truncate" style={{ color: "var(--fg-30)" }}>
                              {lt.technique.category} · {lt.technique.difficulty}
                            </p>
                          </div>
                        </div>
                      );
                    })())}
                  </div>
                </div>
              )}

              {/* Coaching cues preview */}
              {lesson.coaching_cues?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[9px] font-mono tracking-widest" style={{ color: "var(--fg-25)" }}>
                    KEY FOCUS POINTS
                  </p>
                  {lesson.coaching_cues.map((cue, i) => (
                    <div key={i} className="flex gap-3 items-start rounded-xl p-3"
                      style={{ background: `rgb(${d.colorRgb} / 0.04)`, border: `1px solid rgb(${d.colorRgb} / 0.08)` }}>
                      <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: `rgb(${d.colorRgb} / 0.12)` }}>
                        <Sparkles size={10} style={{ color: `rgb(${d.colorRgb})` }} />
                      </div>
                      <p className={`${textSize} leading-relaxed`} style={{ color: "var(--fg-60)" }}>{mirrorStance(cue)}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Start button */}
              <button onClick={nextStep}
                className="w-full py-3.5 rounded-2xl text-[13px] font-bold transition-all active:scale-[0.98]"
                style={{ background: `rgb(${d.colorRgb})`, color: "white" }}>
                Start Lesson
              </button>
            </motion.div>
          )}

          {/* ── TECHNIQUE CARDS ── */}
          {step === "technique" && (
            <motion.div key={`tech-${techIdx}`} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
              className="space-y-4">
              {primaryTechniques[techIdx]?.technique && (() => {
                const tech = primaryTechniques[techIdx].technique!;
                const notes = primaryTechniques[techIdx].teaching_notes;
                return (
                  <>
                    {/* Technique hero */}
                    <div className="relative -mx-4 overflow-hidden" style={{ minHeight: 120 }}>
                      <div className="absolute inset-0" style={{
                        background: `linear-gradient(135deg, rgb(${d.colorRgb} / 0.15), transparent)`,
                      }} />
                      <div className="relative px-6 py-6">
                        <span className="absolute top-2 right-4 text-[64px] font-black leading-none select-none"
                          style={{ color: `rgb(${d.colorRgb} / 0.06)` }}>
                          {techIdx + 1}
                        </span>
                        <p className="text-[8px] font-mono tracking-widest mb-1" style={{ color: `rgb(${d.colorRgb})` }}>
                          TECHNIQUE {techIdx + 1} OF {primaryTechniques.length}
                        </p>
                        <h2 className="text-[24px] font-black leading-tight" style={{ color: "var(--fg-95)" }}>
                          {tech.name}
                        </h2>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[8px] font-mono px-2 py-0.5 rounded-full"
                            style={{ background: `rgb(${d.colorRgb} / 0.1)`, color: `rgb(${d.colorRgb})` }}>
                            {tech.category}
                          </span>
                          <span className="text-[8px] font-mono px-2 py-0.5 rounded-full"
                            style={{ background: "var(--fg-04)", color: "var(--fg-40)" }}>
                            {tech.difficulty}
                          </span>
                        </div>
                      </div>
                    </div>

                    {tech.description && (
                      <p className="text-[13px] leading-relaxed" style={{ color: "var(--fg-55)" }}>
                        {tech.description}
                      </p>
                    )}

                    {notes && (
                      <div className="flex gap-2 items-start rounded-xl p-3"
                        style={{ background: `rgb(${d.colorRgb} / 0.04)`, border: `1px solid rgb(${d.colorRgb} / 0.1)` }}>
                        <Sparkles size={12} className="shrink-0 mt-0.5" style={{ color: `rgb(${d.colorRgb})` }} />
                        <p className={`${textSize} leading-relaxed italic`} style={{ color: "var(--fg-50)" }}>{mirrorStance(notes)}</p>
                      </div>
                    )}

                    {/* Animated technique diagram (spec item 36) */}
                    <TechniqueAnimView techniqueName={tech.name} category={tech.category} colorRgb={d.colorRgb} mastery={1} />

                    {/* Step-by-step illustration cards (spec item 37) */}
                    <StepIllustrationCards techniqueName={tech.name} category={tech.category} colorRgb={d.colorRgb} />
                    <FootworkDiagram techniqueName={tech.name} category={tech.category} colorRgb={d.colorRgb} />

                    {/* Steps */}
                    {tech.steps?.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[9px] font-mono tracking-widest" style={{ color: "var(--fg-25)" }}>STEPS</p>
                        {tech.steps.map((s, i) => (
                          <div key={i} className="flex gap-3 items-start">
                            <span className="text-[18px] font-black leading-none mt-0.5 w-6 text-right shrink-0"
                              style={{ color: `rgb(${d.colorRgb} / 0.2)` }}>
                              {i + 1}
                            </span>
                            <p className={`${textSize} leading-relaxed flex-1`} style={{ color: "var(--fg-60)" }}>{mirrorStance(s)}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Key points */}
                    {tech.key_points?.length > 0 && (
                      <div className="rounded-xl border p-3 space-y-1.5"
                        style={{ borderColor: "var(--fg-06)", background: "var(--fg-02)" }}>
                        <p className="text-[9px] font-mono tracking-widest" style={{ color: "var(--fg-25)" }}>KEY POINTS</p>
                        {tech.key_points.map((p, i) => (
                          <div key={i} className="flex gap-2 items-start">
                            <Check size={10} className="shrink-0 mt-1" style={{ color: `rgb(${d.colorRgb})` }} />
                            <p className={`${textSize} leading-relaxed`} style={{ color: "var(--fg-55)" }}>{mirrorStance(p)}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* View full detail link */}
                    <button onClick={() => onViewTechnique(tech)}
                      className="flex items-center gap-1.5 text-[11px] font-medium"
                      style={{ color: `rgb(${d.colorRgb})` }}>
                      View full technique detail <ChevronRight size={12} />
                    </button>

                    {/* Nav buttons */}
                    <div className="flex gap-3 pt-2">
                      {techIdx > 0 && (
                        <button onClick={() => setTechIdx(techIdx - 1)}
                          className="flex-1 py-3 rounded-xl text-[12px] font-semibold"
                          style={{ background: "var(--fg-04)", color: "var(--fg-50)" }}>
                          Previous
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (techIdx < primaryTechniques.length - 1) setTechIdx(techIdx + 1);
                          else nextStep();
                        }}
                        className="flex-1 py-3 rounded-xl text-[12px] font-bold"
                        style={{ background: `rgb(${d.colorRgb})`, color: "white" }}>
                        {techIdx < primaryTechniques.length - 1 ? "Next Technique" : "Continue"}
                      </button>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          )}

          {/* ── FORM CHECK ── */}
          {step === "formcheck" && (
            <motion.div key="formcheck" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              className="space-y-5">
              <div className="text-center pt-4">
                <span className="text-[64px] font-black leading-none select-none"
                  style={{ color: `rgb(${d.colorRgb} / 0.08)` }}>FORM</span>
                <h2 className={`${headingSize} font-bold -mt-2`} style={{ color: "var(--fg-85)" }}>Check Your Form</h2>
                <p className="text-[11px] mt-1" style={{ color: "var(--fg-40)" }}>
                  Record yourself performing any technique from this lesson. AI will analyze your stance, guard, and movement.
                </p>
              </div>

              {/* Technique selector */}
              <div className="space-y-2">
                <p className="text-[9px] font-mono tracking-widest" style={{ color: "var(--fg-25)" }}>SELECT TECHNIQUE</p>
                <div className="flex flex-wrap gap-2">
                  {primaryTechniques.map((lt) => {
                    const tech = lt.technique;
                    if (!tech) return null;
                    const sel = formCheckTech?.id === tech.id;
                    return (
                      <button key={tech.id} onClick={() => setFormCheckTech(tech)}
                        className="px-3 py-2 rounded-xl text-[11px] font-medium transition-all"
                        style={{
                          background: sel ? `rgb(${d.colorRgb} / 0.15)` : "var(--fg-04)",
                          color: sel ? `rgb(${d.colorRgb})` : "var(--fg-50)",
                          border: sel ? `1px solid rgb(${d.colorRgb} / 0.3)` : "1px solid transparent",
                        }}>
                        {tech.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {formCheckTech && (
                <button
                  onClick={() => {
                    const maType = getMaExerciseType(formCheckTech.category, formCheckTech.name);
                    const name = `${formCheckTech.name} (${maType})`;
                    setFormCheckTech({ ...formCheckTech, name });
                  }}
                  className="w-full py-3 rounded-xl text-[12px] font-bold flex items-center justify-center gap-2"
                  style={{ background: `rgb(${d.colorRgb})`, color: "white" }}>
                  <Camera size={14} />
                  Check My {formCheckTech.name}
                </button>
              )}

              {formCheckTech && formCheckTech.name.includes("(") && (
                <FormCheckCamera
                  exerciseName={formCheckTech.name}
                  maExerciseType={getMaExerciseType(formCheckTech.category, formCheckTech.name)}
                  onClose={() => setFormCheckTech(null)}
                />
              )}

              {/* Nav */}
              <div className="flex gap-3 pt-2">
                <button onClick={prevStep}
                  className="flex-1 py-3 rounded-xl text-[12px] font-semibold"
                  style={{ background: "var(--fg-04)", color: "var(--fg-50)" }}>
                  Back
                </button>
                <button onClick={nextStep}
                  className="flex-1 py-3 rounded-xl text-[12px] font-bold"
                  style={{ background: `rgb(${d.colorRgb})`, color: "white" }}>
                  {formCheckTech ? "Continue" : "Skip Form Check"}
                </button>
              </div>
            </motion.div>
          )}

          {/* ── DRILL ── */}
          {step === "drill" && lesson.drill_name && (
            <motion.div key="drill" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              className="space-y-5">
              <div className="text-center pt-4">
                <span className="text-[64px] font-black leading-none select-none"
                  style={{ color: `rgb(${d.colorRgb} / 0.08)` }}>DRILL</span>
              </div>
              <div className="rounded-2xl border p-5 text-center"
                style={{ borderColor: `rgb(${d.colorRgb} / 0.15)`, background: `rgb(${d.colorRgb} / 0.03)` }}>
                <Target size={28} style={{ color: `rgb(${d.colorRgb})`, margin: "0 auto" }} />
                <h2 className="text-[20px] font-bold mt-3" style={{ color: "var(--fg-90)" }}>
                  {lesson.drill_name}
                </h2>
                <p className="text-[11px] mt-1" style={{ color: "var(--fg-35)" }}>
                  {lesson.drill_duration_min} min · {lesson.drill_equipment === "none" ? "No equipment needed" : lesson.drill_equipment}
                </p>
                {lesson.drill_description && (
                  <p className={`${textSize} leading-relaxed mt-4 text-left`} style={{ color: "var(--fg-50)" }}>
                    {mirrorStance(lesson.drill_description)}
                  </p>
                )}
              </div>

              {/* Drill timer */}
              <div className="rounded-2xl border p-5 text-center"
                style={{ borderColor: "var(--fg-06)", background: "var(--fg-02)" }}>
                <p className="text-[44px] font-black font-mono leading-none" style={{ color: "var(--fg-80)" }}>
                  {fmtTime(drillTime)}
                </p>
                <p className="text-[9px] font-mono tracking-widest mt-2" style={{ color: "var(--fg-25)" }}>
                  {drillRunning ? "IN PROGRESS" : drillTime > 0 ? "PAUSED" : "READY"}
                </p>
                <div className="flex gap-3 mt-4 justify-center">
                  <button
                    onClick={() => { setDrillRunning(!drillRunning); haptic(drillRunning ? [30, 50, 30] : 80); }}
                    className="px-6 py-2.5 rounded-xl text-[12px] font-bold"
                    style={{
                      background: drillRunning ? "var(--fg-06)" : `rgb(${d.colorRgb})`,
                      color: drillRunning ? "var(--fg-50)" : "white",
                    }}>
                    {drillRunning ? "Pause" : drillTime > 0 ? "Resume" : "Start"}
                  </button>
                  {drillTime > 0 && (
                    <button onClick={() => { setDrillTime(0); setDrillRunning(false); }}
                      className="px-4 py-2.5 rounded-xl text-[12px] font-medium"
                      style={{ background: "var(--fg-04)", color: "var(--fg-40)" }}>
                      Reset
                    </button>
                  )}
                </div>
              </div>

              <button onClick={() => { setDrillRunning(false); nextStep(); }}
                className="w-full py-3 rounded-xl text-[12px] font-bold"
                style={{ background: `rgb(${d.colorRgb})`, color: "white" }}>
                {drillRunning ? "Finish Drill & Continue" : "Continue"}
              </button>
            </motion.div>
          )}

          {/* ── COMMON MISTAKES ── */}
          {step === "mistakes" && (
            <motion.div key="mistakes" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              className="space-y-5">
              <div className="relative pt-4">
                <span className="absolute top-0 right-0 text-[64px] font-black leading-none select-none"
                  style={{ color: "rgb(239 68 68 / 0.06)" }}>!</span>
                <p className="text-[9px] font-mono tracking-widest" style={{ color: "rgb(239 68 68 / 0.6)" }}>
                  WATCH OUT FOR
                </p>
                <h2 className="text-[22px] font-bold mt-1" style={{ color: "var(--fg-90)" }}>
                  Common Mistakes
                </h2>
              </div>
              <div className="space-y-2.5">
                {lesson.common_mistakes!.map((m, i) => (
                  <div key={i} className="flex gap-3 items-start rounded-xl p-3.5 border"
                    style={{ borderColor: "rgb(239 68 68 / 0.1)", background: "rgb(239 68 68 / 0.03)" }}>
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: "rgb(239 68 68 / 0.1)" }}>
                      <X size={12} style={{ color: "rgb(239 68 68)" }} />
                    </div>
                    <p className={`${textSize} leading-relaxed`} style={{ color: "var(--fg-60)" }}>{mirrorStance(m)}</p>
                  </div>
                ))}
              </div>
              <button onClick={nextStep}
                className="w-full py-3 rounded-xl text-[12px] font-bold"
                style={{ background: `rgb(${d.colorRgb})`, color: "white" }}>
                Got It
              </button>
            </motion.div>
          )}

          {/* ── SELF-CHECK ── */}
          {step === "selfcheck" && (
            <motion.div key="selfcheck" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              className="space-y-5">
              <div className="relative pt-4">
                <span className="absolute top-0 right-0 text-[64px] font-black leading-none select-none"
                  style={{ color: "rgb(59 130 246 / 0.06)" }}>?</span>
                <p className="text-[9px] font-mono tracking-widest" style={{ color: "rgb(59 130 246)" }}>
                  SELF-CHECK
                </p>
                <h2 className="text-[22px] font-bold mt-1" style={{ color: "var(--fg-90)" }}>
                  Check Your Form
                </h2>
              </div>
              <div className="rounded-2xl border p-5"
                style={{ borderColor: "rgb(59 130 246 / 0.15)", background: "rgb(59 130 246 / 0.03)" }}>
                <p className={`${fontSize === "large" ? "text-[16px]" : "text-[14px]"} leading-relaxed`} style={{ color: "var(--fg-65)" }}>
                  {mirrorStance(lesson.self_check ?? "")}
                </p>
              </div>
              <button onClick={nextStep}
                className="w-full py-3 rounded-xl text-[12px] font-bold"
                style={{ background: `rgb(${d.colorRgb})`, color: "white" }}>
                Continue
              </button>
            </motion.div>
          )}

          {/* ── RATE ── */}
          {step === "rate" && !completed && (
            <motion.div key="rate" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              className="space-y-6 pt-8">
              <div className="text-center">
                <h2 className="text-[24px] font-bold" style={{ color: "var(--fg-90)" }}>
                  How did it feel?
                </h2>
                <p className="text-[12px] mt-1" style={{ color: "var(--fg-35)" }}>
                  Rate your confidence with today&apos;s techniques
                </p>
              </div>
              <div className="flex justify-center gap-3">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => { setSelfRating(n); haptic(30); }}
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold transition-all"
                    style={{
                      background: selfRating >= n ? `rgb(${d.colorRgb} / 0.15)` : "var(--fg-04)",
                      color: selfRating >= n ? `rgb(${d.colorRgb})` : "var(--fg-20)",
                      border: `2px solid ${selfRating >= n ? `rgb(${d.colorRgb} / 0.3)` : "var(--fg-06)"}`,
                      transform: selfRating === n ? "scale(1.1)" : "scale(1)",
                    }}>
                    {n}
                  </button>
                ))}
              </div>
              <div className="text-center">
                <p className="text-[10px] font-mono" style={{ color: "var(--fg-25)" }}>
                  {selfRating === 0 ? "TAP TO RATE" : selfRating <= 2 ? "STILL LEARNING" : selfRating <= 4 ? "GETTING THERE" : "NAILED IT"}
                </p>
              </div>
              <button onClick={handleComplete}
                disabled={selfRating === 0 || completing}
                className="w-full py-3.5 rounded-2xl text-[13px] font-bold transition-all"
                style={{
                  background: selfRating > 0 ? `rgb(${d.colorRgb})` : "var(--fg-06)",
                  color: selfRating > 0 ? "white" : "var(--fg-20)",
                  opacity: completing ? 0.6 : 1,
                }}>
                {completing ? "Saving..." : `Complete Lesson (+${getXpForLesson(lesson)} XP)`}
              </button>
            </motion.div>
          )}

          {/* ── COMPLETION RECEIPT ── */}
          {step === "complete" && completed && (
            <motion.div key="complete" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="space-y-6 pt-6">
              {/* Trophy */}
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                  className="w-20 h-20 rounded-full mx-auto flex items-center justify-center"
                  style={{ background: `rgb(${d.colorRgb} / 0.12)` }}>
                  <Award size={36} style={{ color: `rgb(${d.colorRgb})` }} />
                </motion.div>
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-[24px] font-black mt-4" style={{ color: "var(--fg-95)" }}>
                  Lesson Complete!
                </motion.h2>
              </div>

              {/* Stats grid */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                className="grid grid-cols-3 gap-2">
                {[
                  { label: "XP EARNED", value: `+${getXpForLesson(lesson)}`, icon: <Zap size={14} /> },
                  { label: "TIME", value: fmtTime(elapsed), icon: <Clock size={14} /> },
                  { label: "RATING", value: `${selfRating}/5`, icon: <Star size={14} /> },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl p-3 text-center"
                    style={{ background: "var(--fg-03)", border: "1px solid var(--fg-06)" }}>
                    <div className="flex justify-center mb-1" style={{ color: `rgb(${d.colorRgb})` }}>{s.icon}</div>
                    <p className="text-[16px] font-black" style={{ color: "var(--fg-80)" }}>{s.value}</p>
                    <p className="text-[7px] font-mono tracking-widest mt-0.5" style={{ color: "var(--fg-25)" }}>{s.label}</p>
                  </div>
                ))}
              </motion.div>

              {/* Techniques learned */}
              {primaryTechniques.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                  className="rounded-xl border p-4"
                  style={{ borderColor: "var(--fg-06)", background: "var(--fg-02)" }}>
                  <p className="text-[9px] font-mono tracking-widest mb-3" style={{ color: "var(--fg-25)" }}>
                    TECHNIQUES LEARNED
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {primaryTechniques.map((lt) => lt.technique && (
                      <span key={lt.technique_id}
                        className="text-[10px] font-medium px-2.5 py-1 rounded-full"
                        style={{ background: `rgb(${d.colorRgb} / 0.1)`, color: `rgb(${d.colorRgb})` }}>
                        {lt.technique.name}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Back button */}
              <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
                onClick={onBack}
                className="w-full py-3.5 rounded-2xl text-[13px] font-bold"
                style={{ background: `rgb(${d.colorRgb})`, color: "white" }}>
                Back to Path
              </motion.button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function TechniqueCard({ technique, notes, onView }: {
  technique: Technique;
  notes: string | null;
  onView: () => void;
}) {
  return (
    <button
      onClick={onView}
      className="w-full text-left rounded-xl border p-3 transition-all active:scale-[0.98]"
      style={{ borderColor: "var(--fg-06)", background: "var(--fg-03)" }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold" style={{ color: "var(--fg-80)" }}>
            {technique.name}
          </p>
          <p className="text-[10px] mt-0.5 line-clamp-2" style={{ color: "var(--fg-40)" }}>
            {technique.description}
          </p>
          {notes && (
            <p className="text-[9px] mt-1 italic" style={{ color: "var(--fg-30)" }}>
              {notes}
            </p>
          )}
        </div>
        <ChevronRight size={14} className="shrink-0 mt-1" style={{ color: "var(--fg-20)" }} />
      </div>
      {/* Tags */}
      <div className="flex flex-wrap gap-1 mt-2">
        <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-full"
          style={{ background: "var(--fg-04)", color: "var(--fg-30)" }}>
          {technique.category}
        </span>
        <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-full"
          style={{ background: "var(--fg-04)", color: "var(--fg-30)" }}>
          {technique.difficulty}
        </span>
      </div>
    </button>
  );
}

// ═══════════════════════════════════════════════
// ═══════════════════════════════════════════════
// COMBO ANIMATION PLAYER (spec item 95)
// ═══════════════════════════════════════════════

function ComboAnimView({ techniqueNames, colorRgb, categories }: {
  techniqueNames: string[];
  colorRgb: string;
  categories?: string[];
}) {
  const combo = useMemo(() => buildComboAnimation(techniqueNames, categories), [techniqueNames, categories]);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const intervalRef = useRef<number>(0);

  useEffect(() => {
    if (!playing || !combo) return;
    const ms = Math.round(400 / speed);
    intervalRef.current = window.setInterval(() => {
      setFrame((f) => {
        if (f >= combo.frames.length - 1) { setPlaying(false); return 0; }
        return f + 1;
      });
    }, ms);
    return () => clearInterval(intervalRef.current);
  }, [playing, speed, combo]);

  useEffect(() => { setFrame(0); setPlaying(false); }, [techniqueNames]);

  if (!combo || combo.frames.length === 0) return null;

  const cf = combo.frames[frame];
  const currentTechIdx = cf.techniqueIndex;

  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ borderColor: "var(--fg-06)", background: "var(--fg-02)" }}>
      <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: "1px solid var(--fg-06)" }}>
        <Zap size={12} style={{ color: `rgb(${colorRgb})` }} />
        <span className="text-[10px] font-mono tracking-wide" style={{ color: "var(--fg-40)" }}>COMBO</span>
        <div className="flex-1 flex gap-1 justify-center">
          {techniqueNames.map((n, i) => (
            <span key={i} className="text-[9px] font-medium px-1.5 py-0.5 rounded"
              style={{
                background: currentTechIdx === i ? `rgb(${colorRgb} / 0.15)` : "var(--fg-04)",
                color: currentTechIdx === i ? `rgb(${colorRgb})` : "var(--fg-30)",
              }}>
              {n}
            </span>
          ))}
        </div>
      </div>

      <div className="flex justify-center py-4" style={{ background: "var(--fg-02)" }}>
        <StickFigureSVG pose={cf.pose} colorRgb={colorRgb} active={cf.active} size={160}
          powerChain={cf.powerChain} showWeight={!!cf.weight} weightOverride={cf.weight}
          angles={cf.angles} opponent={cf.opponent} />
      </div>

      <div className="px-3 py-2 text-center">
        <p className="text-[11px] font-medium" style={{ color: "var(--fg-60)" }}>{cf.caption}</p>
      </div>

      {/* Timeline */}
      <div className="px-3 pb-2">
        <div className="flex gap-0.5">
          {combo.frames.map((_, i) => (
            <button key={i} onClick={() => { setFrame(i); setPlaying(false); }}
              className="flex-1 h-1 rounded-full transition-all"
              style={{
                background: i <= frame ? `rgb(${colorRgb})` : "var(--fg-08)",
                opacity: i === frame ? 1 : 0.6,
              }} />
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 px-3 pb-3">
        <button onClick={() => setFrame(0)} className="p-1.5 rounded-lg" style={{ background: "var(--fg-04)" }}>
          <SkipForward size={12} className="rotate-180" style={{ color: "var(--fg-40)" }} />
        </button>
        <button onClick={() => setPlaying(!playing)}
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: `rgb(${colorRgb})` }}>
          {playing ? <Pause size={16} fill="white" color="white" /> : <Play size={16} fill="white" color="white" className="ml-0.5" />}
        </button>
        <button onClick={() => setSpeed(speed >= 2 ? 0.5 : speed + 0.5)}
          className="px-2 py-1 rounded-lg text-[9px] font-mono"
          style={{ background: "var(--fg-04)", color: "var(--fg-40)" }}>
          {speed}x
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// SHADOW-ALONG METRONOME (spec item 98)
// ═══════════════════════════════════════════════

function ShadowAlongMetronome({ techniqueNames, colorRgb, categories }: {
  techniqueNames: string[];
  colorRgb: string;
  categories?: string[];
}) {
  const [bpm, setBpm] = useState(60);
  const [running, setRunning] = useState(false);
  const [frame, setFrame] = useState(0);
  const [beat, setBeat] = useState(0);
  const intervalRef = useRef<number>(0);

  const timing = useMemo(
    () => getMetronomeFrameTiming({ bpm, techniqueNames, categories }),
    [bpm, techniqueNames, categories],
  );

  useEffect(() => {
    if (!running || !timing) return;
    const ms = timing.frameDurationMs;
    intervalRef.current = window.setInterval(() => {
      setFrame((f) => {
        const next = f + 1;
        if (next >= timing.totalFrames) {
          return 0;
        }
        return next;
      });
      setBeat((b) => b + 1);
    }, ms);
    return () => clearInterval(intervalRef.current);
  }, [running, timing]);

  useEffect(() => { setFrame(0); setBeat(0); setRunning(false); }, [techniqueNames]);

  if (!timing || !timing.combo) return null;

  const cf = timing.combo.frames[frame];
  const isBeatFrame = beat % Math.max(1, Math.ceil(timing.totalFrames / techniqueNames.length)) === 0;

  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ borderColor: "var(--fg-06)", background: "var(--fg-02)" }}>
      <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: "1px solid var(--fg-06)" }}>
        <Clock size={12} style={{ color: `rgb(${colorRgb})` }} />
        <span className="text-[10px] font-mono tracking-wide" style={{ color: "var(--fg-40)" }}>SHADOW-ALONG</span>
        <span className="ml-auto text-[10px] font-mono" style={{ color: `rgb(${colorRgb})` }}>
          {bpm} BPM
        </span>
      </div>

      <div className="flex justify-center py-4 relative"
        style={{
          background: "var(--fg-02)",
          boxShadow: isBeatFrame && running ? `inset 0 0 40px rgb(${colorRgb} / 0.08)` : undefined,
          transition: "box-shadow 0.1s",
        }}>
        <StickFigureSVG pose={cf.pose} colorRgb={colorRgb} active={cf.active} size={180}
          powerChain={cf.powerChain} />
        {running && (
          <div className="absolute top-3 right-3 w-3 h-3 rounded-full"
            style={{
              background: isBeatFrame ? `rgb(${colorRgb})` : "var(--fg-10)",
              transition: "background 0.1s",
            }} />
        )}
      </div>

      <div className="px-3 py-2 text-center">
        <p className="text-[13px] font-bold" style={{ color: "var(--fg-80)" }}>
          {cf.techniqueName}
        </p>
        <p className="text-[10px]" style={{ color: "var(--fg-40)" }}>{cf.caption}</p>
      </div>

      {/* BPM control */}
      <div className="flex items-center justify-center gap-3 px-4 py-2">
        <button onClick={() => setBpm(Math.max(30, bpm - 10))}
          className="w-8 h-8 rounded-full flex items-center justify-center text-[14px] font-bold"
          style={{ background: "var(--fg-04)", color: "var(--fg-50)" }}>
          −
        </button>
        <input type="range" min={30} max={180} step={5} value={bpm}
          onChange={(e) => setBpm(Number(e.target.value))}
          className="flex-1 h-1 rounded-full appearance-none"
          style={{ background: `linear-gradient(to right, rgb(${colorRgb}) ${((bpm - 30) / 150) * 100}%, var(--fg-08) 0%)` }} />
        <button onClick={() => setBpm(Math.min(180, bpm + 10))}
          className="w-8 h-8 rounded-full flex items-center justify-center text-[14px] font-bold"
          style={{ background: "var(--fg-04)", color: "var(--fg-50)" }}>
          +
        </button>
      </div>

      {/* Play/stop */}
      <div className="flex justify-center pb-3">
        <button onClick={() => { setRunning(!running); if (!running) { setFrame(0); setBeat(0); } }}
          className="px-6 py-2.5 rounded-xl text-[12px] font-bold"
          style={{ background: running ? "var(--fg-08)" : `rgb(${colorRgb})`, color: running ? "var(--fg-50)" : "white" }}>
          {running ? "Stop" : "Start Shadow-Along"}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// COMBO CREATOR (spec item 104)
// ═══════════════════════════════════════════════

function ComboCreator({ discipline, colorRgb, techniques, onClose }: {
  discipline: string;
  colorRgb: string;
  techniques: Technique[];
  onClose: () => void;
}) {
  const [timeline, setTimeline] = useState<Technique[]>([]);
  const [comboName, setComboName] = useState("");
  const [previewMode, setPreviewMode] = useState<"combo" | "metronome">("combo");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = techniques;
    if (categoryFilter) list = list.filter((t) => t.category === categoryFilter);
    if (search) list = list.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));
    return list.slice(0, 30);
  }, [techniques, categoryFilter, search]);

  const categories = useMemo(() =>
    [...new Set(techniques.map((t) => t.category))].sort(),
    [techniques],
  );

  const addTechnique = (tech: Technique) => {
    if (timeline.length >= 8) return;
    setTimeline([...timeline, tech]);
  };

  const removeTechnique = (idx: number) => {
    setTimeline(timeline.filter((_, i) => i !== idx));
  };

  const moveTechnique = (fromIdx: number, direction: -1 | 1) => {
    const toIdx = fromIdx + direction;
    if (toIdx < 0 || toIdx >= timeline.length) return;
    const next = [...timeline];
    [next[fromIdx], next[toIdx]] = [next[toIdx], next[fromIdx]];
    setTimeline(next);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
      className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[18px] font-bold" style={{ color: "var(--fg-90)" }}>Combo Creator</h2>
        <button onClick={onClose} className="p-1.5 rounded-lg" style={{ background: "var(--fg-04)" }}>
          <X size={14} style={{ color: "var(--fg-40)" }} />
        </button>
      </div>

      {/* Combo name */}
      <input type="text" value={comboName} onChange={(e) => setComboName(e.target.value)}
        placeholder="Name your combo..."
        className="w-full px-3 py-2 rounded-xl text-[12px]"
        style={{ background: "var(--fg-04)", color: "var(--fg-80)", border: "1px solid var(--fg-08)" }} />

      {/* Timeline */}
      <div className="space-y-1.5">
        <p className="text-[9px] font-mono tracking-widest" style={{ color: "var(--fg-25)" }}>
          TIMELINE ({timeline.length}/8)
        </p>
        {timeline.length === 0 ? (
          <div className="py-6 text-center rounded-xl border border-dashed"
            style={{ borderColor: "var(--fg-10)", color: "var(--fg-25)" }}>
            <p className="text-[11px]">Tap techniques below to build your combo</p>
          </div>
        ) : (
          <div className="flex gap-1.5 flex-wrap">
            {timeline.map((tech, i) => (
              <div key={`${tech.id}-${i}`}
                className="flex items-center gap-1 pl-2 pr-1 py-1 rounded-lg"
                style={{ background: `rgb(${colorRgb} / 0.1)`, border: `1px solid rgb(${colorRgb} / 0.2)` }}>
                <span className="text-[8px] font-bold mr-0.5" style={{ color: `rgb(${colorRgb} / 0.4)` }}>{i + 1}</span>
                <span className="text-[10px] font-medium" style={{ color: `rgb(${colorRgb})` }}>{tech.name}</span>
                <button onClick={() => moveTechnique(i, -1)} className="p-0.5" style={{ color: "var(--fg-30)" }}>
                  <ChevronLeft size={10} />
                </button>
                <button onClick={() => moveTechnique(i, 1)} className="p-0.5" style={{ color: "var(--fg-30)" }}>
                  <ChevronRight size={10} />
                </button>
                <button onClick={() => removeTechnique(i)} className="p-0.5" style={{ color: "var(--fg-30)" }}>
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview */}
      {timeline.length >= 2 && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <button onClick={() => setPreviewMode("combo")}
              className="flex-1 py-1.5 rounded-lg text-[10px] font-medium"
              style={{
                background: previewMode === "combo" ? `rgb(${colorRgb} / 0.1)` : "var(--fg-04)",
                color: previewMode === "combo" ? `rgb(${colorRgb})` : "var(--fg-30)",
              }}>
              Combo Preview
            </button>
            <button onClick={() => setPreviewMode("metronome")}
              className="flex-1 py-1.5 rounded-lg text-[10px] font-medium"
              style={{
                background: previewMode === "metronome" ? `rgb(${colorRgb} / 0.1)` : "var(--fg-04)",
                color: previewMode === "metronome" ? `rgb(${colorRgb})` : "var(--fg-30)",
              }}>
              Shadow-Along
            </button>
          </div>

          {previewMode === "combo" ? (
            <ComboAnimView
              techniqueNames={timeline.map((t) => t.name)}
              categories={timeline.map((t) => t.category)}
              colorRgb={colorRgb}
            />
          ) : (
            <ShadowAlongMetronome
              techniqueNames={timeline.map((t) => t.name)}
              categories={timeline.map((t) => t.category)}
              colorRgb={colorRgb}
            />
          )}
        </div>
      )}

      {/* Technique picker */}
      <div className="space-y-2">
        <p className="text-[9px] font-mono tracking-widest" style={{ color: "var(--fg-25)" }}>ADD TECHNIQUE</p>

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--fg-25)" }} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full pl-7 pr-2 py-1.5 rounded-lg text-[11px]"
              style={{ background: "var(--fg-04)", color: "var(--fg-70)", border: "none" }} />
          </div>
        </div>

        <div className="flex gap-1 flex-wrap">
          <button onClick={() => setCategoryFilter(null)}
            className="px-2 py-0.5 rounded-full text-[9px] font-medium"
            style={{
              background: !categoryFilter ? `rgb(${colorRgb} / 0.1)` : "var(--fg-04)",
              color: !categoryFilter ? `rgb(${colorRgb})` : "var(--fg-30)",
            }}>
            All
          </button>
          {categories.map((c) => (
            <button key={c} onClick={() => setCategoryFilter(categoryFilter === c ? null : c)}
              className="px-2 py-0.5 rounded-full text-[9px] font-medium capitalize"
              style={{
                background: categoryFilter === c ? `rgb(${colorRgb} / 0.1)` : "var(--fg-04)",
                color: categoryFilter === c ? `rgb(${colorRgb})` : "var(--fg-30)",
              }}>
              {c}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
          {filtered.map((tech) => (
            <button key={tech.id} onClick={() => addTechnique(tech)}
              className="text-left px-2.5 py-2 rounded-lg transition-all"
              style={{ background: "var(--fg-04)" }}>
              <p className="text-[10px] font-medium truncate" style={{ color: "var(--fg-70)" }}>{tech.name}</p>
              <p className="text-[8px] capitalize" style={{ color: "var(--fg-30)" }}>{tech.category}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Presets */}
      <div className="space-y-2">
        <p className="text-[9px] font-mono tracking-widest" style={{ color: "var(--fg-25)" }}>PRESETS</p>
        <div className="flex gap-1.5 flex-wrap">
          {COMBO_PRESETS.filter((p) => p.discipline === discipline || discipline === "mma").map((preset) => (
            <button key={preset.name}
              onClick={() => {
                const techs = preset.techniques.map((name) =>
                  techniques.find((t) => t.name.toLowerCase() === name.toLowerCase()),
                ).filter(Boolean) as Technique[];
                if (techs.length >= 2) setTimeline(techs);
              }}
              className="px-2.5 py-1 rounded-lg text-[9px] font-medium"
              style={{ background: "var(--fg-04)", color: "var(--fg-40)" }}>
              {preset.name}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════
// TECHNIQUE LIBRARY — searchable encyclopedia
// ═══════════════════════════════════════════════

function MasteryRing({ tier, size = 24 }: { tier: MasteryTier; size?: number }) {
  const info = MASTERY_TIERS[tier];
  const r = (size - 3) / 2;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - info.progress);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={c} cy={c} r={r} fill="none"
        stroke="var(--fg-08)" strokeWidth={2} />
      {info.progress > 0 && (
        <circle cx={c} cy={c} r={r} fill="none"
          stroke={`rgb(${info.colorRgb})`} strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${c} ${c})`}
          style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      )}
      {tier === "mastered" && (
        <circle cx={c} cy={c} r={r - 3} fill={`rgb(${info.colorRgb} / 0.15)`} />
      )}
    </svg>
  );
}

function TechniqueLibrary({ userId, onBack, onViewTechnique }: {
  userId?: string;
  onBack: () => void;
  onViewTechnique: (tech: Technique) => void;
}) {
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterDiscipline, setFilterDiscipline] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [masteryData, setMasteryData] = useState<Map<string, TechniqueMastery>>(new Map());
  const [showComboCreator, setShowComboCreator] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchTechniqueMasteryData(userId).then(setMasteryData);
    }
  }, [userId]);

  useEffect(() => {
    setLoading(true);
    fetchAllTechniques({
      discipline: filterDiscipline || undefined,
      category: filterCategory || undefined,
      search: search || undefined,
    }).then((data) => {
      setTechniques(data);
      setLoading(false);
    });
  }, [filterDiscipline, filterCategory, search]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    for (const t of techniques) if (t.category) cats.add(t.category);
    return Array.from(cats).sort();
  }, [techniques]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-[10px] font-mono">
        <button onClick={onBack} className="active:scale-[0.97]" style={{ color: "var(--fg-30)" }}>MA</button>
        <ChevronRight size={10} style={{ color: "var(--fg-15)" }} />
        <span className="font-semibold" style={{ color: "var(--fg-50)" }}>Library</span>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <p className="text-[8px] font-mono tracking-widest uppercase mb-1.5"
            style={{ color: "var(--fg-20)" }}>Encyclopedia</p>
          <h1 className="text-[22px] font-bold leading-tight" style={{ color: "var(--fg-90)" }}>
            Technique Library
          </h1>
        </div>
        {/* Grid / List toggle */}
        <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: "var(--fg-04)" }}>
          <button onClick={() => setViewMode("list")}
            className="p-1.5 rounded-md transition-all"
            style={{ background: viewMode === "list" ? "var(--fg-08)" : "transparent" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="2" width="12" height="1.5" rx="0.5" fill={viewMode === "list" ? "var(--fg-60)" : "var(--fg-25)"} />
              <rect x="1" y="6" width="12" height="1.5" rx="0.5" fill={viewMode === "list" ? "var(--fg-60)" : "var(--fg-25)"} />
              <rect x="1" y="10" width="12" height="1.5" rx="0.5" fill={viewMode === "list" ? "var(--fg-60)" : "var(--fg-25)"} />
            </svg>
          </button>
          <button onClick={() => setViewMode("grid")}
            className="p-1.5 rounded-md transition-all"
            style={{ background: viewMode === "grid" ? "var(--fg-08)" : "transparent" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="5" height="5" rx="1" fill={viewMode === "grid" ? "var(--fg-60)" : "var(--fg-25)"} />
              <rect x="8" y="1" width="5" height="5" rx="1" fill={viewMode === "grid" ? "var(--fg-60)" : "var(--fg-25)"} />
              <rect x="1" y="8" width="5" height="5" rx="1" fill={viewMode === "grid" ? "var(--fg-60)" : "var(--fg-25)"} />
              <rect x="8" y="8" width="5" height="5" rx="1" fill={viewMode === "grid" ? "var(--fg-60)" : "var(--fg-25)"} />
            </svg>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: "var(--fg-20)" }} />
        <input
          type="text"
          placeholder="Search techniques..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs outline-none"
          style={{
            borderColor: "var(--fg-08)",
            background: "var(--fg-03)",
            color: "var(--fg-80)",
          }}
        />
      </div>

      {/* Discipline filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4" style={{ scrollbarWidth: "none" }}>
        {[
          { label: "All", value: "", colorRgb: "" },
          ...DISCIPLINE_ORDER
            .map((d) => ({ label: DISCIPLINES[d].name, value: d, colorRgb: DISCIPLINES[d].colorRgb })),
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilterDiscipline(opt.value)}
            className="text-[10px] font-mono px-3 py-1.5 rounded-full whitespace-nowrap shrink-0 transition-all"
            style={{
              background: filterDiscipline === opt.value
                ? opt.colorRgb ? `rgb(${opt.colorRgb} / 0.12)` : "var(--fg-10)"
                : "var(--fg-04)",
              color: filterDiscipline === opt.value
                ? opt.colorRgb ? `rgb(${opt.colorRgb})` : "var(--fg-80)"
                : "var(--fg-40)",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Category pills — scrollable horizontal */}
      {categories.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto -mx-4 px-4" style={{ scrollbarWidth: "none" }}>
          <button
            onClick={() => setFilterCategory("")}
            className="text-[9px] font-mono px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 transition-all"
            style={{
              background: filterCategory === "" ? "var(--fg-10)" : "var(--fg-03)",
              color: filterCategory === "" ? "var(--fg-80)" : "var(--fg-30)",
              border: `1px solid ${filterCategory === "" ? "var(--fg-15)" : "var(--fg-06)"}`,
            }}>
            All categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(filterCategory === cat ? "" : cat)}
              className="text-[9px] font-mono px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 capitalize transition-all"
              style={{
                background: filterCategory === cat ? "var(--fg-10)" : "var(--fg-03)",
                color: filterCategory === cat ? "var(--fg-80)" : "var(--fg-30)",
                border: `1px solid ${filterCategory === cat ? "var(--fg-15)" : "var(--fg-06)"}`,
              }}>
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Combo Creator toggle */}
      <button
        onClick={() => setShowComboCreator(!showComboCreator)}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.98]"
        style={{
          background: showComboCreator ? `rgb(${DISCIPLINES[filterDiscipline as Discipline]?.colorRgb ?? "139 92 246"} / 0.12)` : "var(--fg-04)",
          color: showComboCreator ? `rgb(${DISCIPLINES[filterDiscipline as Discipline]?.colorRgb ?? "139 92 246"})` : "var(--fg-50)",
          border: `1px solid ${showComboCreator ? `rgb(${DISCIPLINES[filterDiscipline as Discipline]?.colorRgb ?? "139 92 246"} / 0.2)` : "var(--fg-08)"}`,
        }}>
        <Link2 size={14} />
        {showComboCreator ? "Close Combo Creator" : "Combo Creator"}
      </button>

      {/* Combo Creator panel */}
      <AnimatePresence>
        {showComboCreator && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <ComboCreator
              discipline={filterDiscipline || "boxing"}
              colorRgb={DISCIPLINES[filterDiscipline as Discipline]?.colorRgb ?? "239 68 68"}
              techniques={techniques}
              onClose={() => setShowComboCreator(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Count */}
      {!loading && techniques.length > 0 && (
        <p className="text-[9px] font-mono" style={{ color: "var(--fg-20)" }}>
          {techniques.length} technique{techniques.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* Results */}
      {loading ? (
        <div className={viewMode === "grid" ? "grid grid-cols-2 gap-2" : "space-y-2"}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className={`rounded-xl animate-pulse ${viewMode === "grid" ? "h-28" : "h-16"}`}
              style={{ background: "var(--fg-06)" }} />
          ))}
        </div>
      ) : techniques.length === 0 ? (
        <div className="text-center py-8">
          <Swords size={28} style={{ color: "var(--fg-15)", margin: "0 auto" }} />
          <p className="text-xs mt-2" style={{ color: "var(--fg-30)" }}>No techniques found</p>
          {(search || filterCategory || filterDiscipline) && (
            <button onClick={() => { setSearch(""); setFilterCategory(""); setFilterDiscipline(""); }}
              className="text-[10px] mt-2 underline" style={{ color: "var(--fg-40)" }}>
              Clear filters
            </button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 gap-2.5">
          {techniques.map((tech) => {
            const td = DISCIPLINES[tech.discipline as Discipline];
            const cRgb = td?.colorRgb ?? "139 92 246";
            const m = masteryData.get(tech.id);
            const tierNum = { unlearned: 0, learned: 1, drilled: 2, proficient: 3, mastered: 4 }[m?.tier ?? "unlearned"];
            return (
              <TechniqueCollectibleCard key={tech.id} technique={tech} colorRgb={cRgb}
                mastery={tierNum} onTap={() => onViewTechnique(tech)} />
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {techniques.map((tech) => {
            const td = DISCIPLINES[tech.discipline as Discipline];
            const mastery = masteryData.get(tech.id);
            const tier = mastery?.tier ?? "unlearned";
            return (
              <button
                key={tech.id}
                onClick={() => onViewTechnique(tech)}
                className="w-full text-left flex items-center gap-3 p-3 rounded-xl border transition-all active:scale-[0.98]"
                style={{ borderColor: "var(--fg-06)", background: "var(--fg-03)" }}
              >
                <div className="relative shrink-0">
                  {(() => {
                    const ta = getAnimation(tech.name, tech.category);
                    const cRgb2 = td?.colorRgb ?? "139 92 246";
                    if (ta) return (
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: `rgb(${cRgb2} / 0.08)` }}>
                        <StickFigureSVG pose={ta.frames[0].pose} colorRgb={cRgb2} size={22} />
                      </div>
                    );
                    if (tech.stance) return <StanceSilhouette stance={tech.stance} size={28} color={`rgb(${cRgb2} / 0.5)`} />;
                    return (
                      <>
                        <MasteryRing tier={tier} size={28} />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full"
                            style={{ background: td ? `rgb(${td.colorRgb})` : "var(--fg-10)" }} />
                        </div>
                      </>
                    );
                  })()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold truncate" style={{ color: "var(--fg-80)" }}>
                    {tech.name}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[9px]" style={{ color: "var(--fg-30)" }}>
                      {tech.category} · {tech.difficulty}
                    </span>
                    {tier !== "unlearned" && (
                      <span className="text-[7px] font-mono px-1.5 py-0.5 rounded-full"
                        style={{ background: `rgb(${MASTERY_TIERS[tier].colorRgb} / 0.1)`, color: `rgb(${MASTERY_TIERS[tier].colorRgb})` }}>
                        {MASTERY_TIERS[tier].label}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight size={14} style={{ color: "var(--fg-20)" }} />
              </button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════
// TECHNIQUE DETAIL — full breakdown
// ═══════════════════════════════════════════════

function TechniqueDetail({ technique, onBack }: {
  technique: Technique;
  onBack: () => void;
}) {
  const d = DISCIPLINES[technique.discipline as Discipline];
  const colorRgb = d?.colorRgb ?? "139 92 246";

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-[10px] font-mono">
        <button onClick={onBack} className="active:scale-[0.97]" style={{ color: "var(--fg-30)" }}>Library</button>
        <ChevronRight size={10} style={{ color: "var(--fg-15)" }} />
        <span className="font-semibold truncate max-w-[200px]" style={{ color: "var(--fg-50)" }}>{technique.name}</span>
      </div>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-1.5 h-7 rounded-full" style={{ background: `rgb(${colorRgb})` }} />
          <div>
            <h1 className="text-[22px] font-bold leading-tight" style={{ color: "var(--fg-90)" }}>
              {technique.name}
            </h1>
            <p className="text-[10px] mt-0.5" style={{ color: "var(--fg-30)" }}>
              {d?.name ?? technique.discipline} · {technique.category}
              {technique.subcategory ? ` · ${technique.subcategory}` : ""}
            </p>
          </div>
        </div>
        <p className="text-xs mt-2 leading-relaxed" style={{ color: "var(--fg-50)" }}>
          {technique.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          <span className="text-[8px] font-mono px-2 py-0.5 rounded-full"
            style={{ background: `rgba(${colorRgb}, 0.1)`, color: `rgb(${colorRgb})` }}>
            {technique.difficulty}
          </span>
          {technique.stance && technique.stance !== "both" && (
            <span className="text-[8px] font-mono px-2 py-0.5 rounded-full"
              style={{ background: "var(--fg-04)", color: "var(--fg-30)" }}>
              {technique.stance}
            </span>
          )}
          {technique.equipment && technique.equipment !== "none" && (
            <span className="text-[8px] font-mono px-2 py-0.5 rounded-full"
              style={{ background: "var(--fg-04)", color: "var(--fg-30)" }}>
              {technique.equipment}
            </span>
          )}
        </div>
      </div>

      {/* Animated technique diagram */}
      <TechniqueAnimView techniqueName={technique.name} category={technique.category} colorRgb={colorRgb} mastery={1} />
      <StepIllustrationCards techniqueName={technique.name} category={technique.category} colorRgb={colorRgb} />
      <FootworkDiagram techniqueName={technique.name} category={technique.category} colorRgb={colorRgb} />

      {/* Steps */}
      {technique.steps && technique.steps.length > 0 && (
        <div className="rounded-xl border p-3" style={{ borderColor: "var(--fg-06)", background: "var(--fg-03)" }}>
          <p className="text-[9px] font-mono tracking-wider mb-2" style={{ color: "var(--fg-20)" }}>
            HOW TO DO IT
          </p>
          <div className="space-y-2">
            {technique.steps.map((step, i) => (
              <div key={i} className="flex gap-2.5">
                <span className="text-[10px] font-bold shrink-0 w-4 text-right"
                  style={{ color: `rgb(${colorRgb})` }}>
                  {i + 1}
                </span>
                <p className="text-[11px] leading-relaxed" style={{ color: "var(--fg-60)" }}>
                  {step}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key points */}
      {technique.key_points && technique.key_points.length > 0 && (
        <div className="rounded-xl border p-3" style={{ borderColor: "var(--fg-06)", background: "var(--fg-03)" }}>
          <p className="text-[9px] font-mono tracking-wider mb-2" style={{ color: "var(--fg-20)" }}>
            KEY POINTS
          </p>
          <div className="space-y-1.5">
            {technique.key_points.map((point, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-[10px] shrink-0 mt-0.5" style={{ color: "rgb(234 179 8)" }}>▸</span>
                <p className="text-[11px] leading-relaxed" style={{ color: "var(--fg-60)" }}>{point}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Coaching cues */}
      {technique.coaching_cues && technique.coaching_cues.length > 0 && (
        <div className="rounded-xl border p-3"
          style={{ borderColor: "rgba(59 130 246 / 0.15)", background: "rgba(59 130 246 / 0.04)" }}>
          <p className="text-[9px] font-mono tracking-wider mb-2" style={{ color: "rgb(59 130 246)" }}>
            COACHING CUES
          </p>
          <div className="space-y-1.5">
            {technique.coaching_cues.map((cue, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-[10px] shrink-0 mt-0.5" style={{ color: "rgb(59 130 246)" }}>💡</span>
                <p className="text-[11px] leading-relaxed italic" style={{ color: "var(--fg-50)" }}>{cue}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Common mistakes */}
      {technique.common_mistakes && technique.common_mistakes.length > 0 && (
        <div className="rounded-xl border p-3"
          style={{ borderColor: "rgba(239 68 68 / 0.15)", background: "rgba(239 68 68 / 0.04)" }}>
          <p className="text-[9px] font-mono tracking-wider mb-2" style={{ color: "rgb(239 68 68)" }}>
            COMMON MISTAKES
          </p>
          <div className="space-y-1.5">
            {technique.common_mistakes.map((m, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-[10px] shrink-0 mt-0.5" style={{ color: "rgb(239 68 68)" }}>✕</span>
                <p className="text-[11px] leading-relaxed" style={{ color: "var(--fg-50)" }}>{m}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Muscles used */}
      {technique.muscles_used && technique.muscles_used.length > 0 && (
        <div className="rounded-xl border p-3" style={{ borderColor: "var(--fg-06)", background: "var(--fg-03)" }}>
          <p className="text-[9px] font-mono tracking-wider mb-2" style={{ color: "var(--fg-20)" }}>
            MUSCLES USED
          </p>
          <div className="flex flex-wrap gap-1.5">
            {technique.muscles_used.map((m, i) => (
              <span key={i} className="text-[9px] font-mono px-2 py-1 rounded-full capitalize"
                style={{ background: "var(--fg-04)", color: "var(--fg-40)" }}>
                {m}
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════
// ORIGINS — bio parser + figure card
// ═══════════════════════════════════════════════

function parseBioSections(bio: string): { origin: string; career: string; legacy: string } {
  const sentences = bio.split(/(?<=\.)\s+/);
  const total = sentences.length;
  if (total <= 3) return { origin: sentences[0] || "", career: sentences.slice(1, -1).join(" ") || "", legacy: sentences[total - 1] || "" };
  const originEnd = Math.min(2, Math.ceil(total * 0.25));
  const legacyStart = Math.max(originEnd + 1, total - 2);
  return {
    origin: sentences.slice(0, originEnd).join(" "),
    career: sentences.slice(originEnd, legacyStart).join(" "),
    legacy: sentences.slice(legacyStart).join(" "),
  };
}

function FigureCard({ fig, colorRgb }: {
  fig: { name: string; role: string; bio?: string; imageUrl?: string };
  colorRgb: string;
}) {
  const img = fig.imageUrl;
  const [expanded, setExpanded] = useState(false);
  const initial = fig.name.charAt(0);
  const sections = fig.bio ? parseBioSections(fig.bio) : null;

  return (
    <>
      <button
        className="snap-start shrink-0 w-[130px] flex flex-col items-center gap-2 py-3 px-2 rounded-2xl border transition-all text-center active:scale-[0.97]"
        style={{ borderColor: "var(--fg-06)", background: "var(--fg-03)" }}
        onClick={() => setExpanded(true)}
      >
        <div className="relative w-20 h-20 rounded-full overflow-hidden ring-2 shrink-0" style={{ ["--tw-ring-color" as string]: `rgb(${colorRgb} / 0.3)` }}>
          {img ? (
            <Image src={img} alt={fig.name} fill className="object-cover" sizes="80px" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[28px] font-bold" style={{ background: `rgb(${colorRgb} / 0.12)`, color: `rgb(${colorRgb} / 0.5)` }}>{initial}</div>
          )}
        </div>
        <div className="min-w-0 w-full">
          <p className="text-[11px] font-semibold leading-tight truncate" style={{ color: "var(--fg-70)" }}>{fig.name}</p>
          <p className="text-[8px] font-mono mt-0.5 leading-tight line-clamp-2" style={{ color: "var(--fg-25)" }}>{fig.role}</p>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-md"
            onClick={() => setExpanded(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 280 }}
              className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl border-t"
              style={{ borderColor: "var(--fg-10)", background: "var(--bg-primary)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative">
                {img ? (
                  <div className="relative h-56 overflow-hidden rounded-t-3xl">
                    <Image src={img} alt={fig.name} fill className="object-cover object-top" sizes="(max-width: 640px) 100vw, 512px" />
                    <div className="absolute inset-0" style={{ background: "linear-gradient(to top, var(--bg-primary), transparent, rgba(0,0,0,0.3))" }} />
                  </div>
                ) : (
                  <div className="h-32 rounded-t-3xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, rgb(${colorRgb} / 0.15), rgb(${colorRgb} / 0.05))` }}>
                    <span className="text-[56px] font-bold" style={{ color: `rgb(${colorRgb} / 0.3)` }}>{initial}</span>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
                  <h2 className="text-[22px] font-bold drop-shadow-lg" style={{ color: "var(--fg-95)" }}>{fig.name}</h2>
                  <p className="text-[11px] font-mono mt-0.5 drop-shadow-md" style={{ color: `rgb(${colorRgb})` }}>{fig.role}</p>
                </div>
                <button
                  onClick={() => setExpanded(false)}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition"
                >
                  <X size={14} className="text-white/80" />
                </button>
                <div className="absolute top-2 left-1/2 -translate-x-1/2">
                  <div className="w-10 h-1 rounded-full bg-white/30" />
                </div>
              </div>

              {sections && (
                <div className="px-5 pt-4 pb-10 space-y-4">
                  {sections.origin && (
                    <div className="rounded-xl border p-3.5" style={{ borderColor: "var(--fg-06)", background: "var(--fg-03)" }}>
                      <p className="text-[8px] font-mono tracking-widest mb-2" style={{ color: `rgb(${colorRgb} / 0.6)` }}>ORIGINS</p>
                      <p className="text-[12px] leading-[1.7]" style={{ color: "var(--fg-60)" }}>{sections.origin}</p>
                    </div>
                  )}
                  {sections.career && (
                    <div className="rounded-xl border p-3.5" style={{ borderColor: "var(--fg-06)", background: "var(--fg-03)" }}>
                      <p className="text-[8px] font-mono tracking-widest mb-2" style={{ color: `rgb(${colorRgb} / 0.6)` }}>CAREER</p>
                      <p className="text-[12px] leading-[1.7]" style={{ color: "var(--fg-60)" }}>{sections.career}</p>
                    </div>
                  )}
                  {sections.legacy && (
                    <div className="rounded-xl border-l-2 p-3.5" style={{ borderLeftColor: `rgb(${colorRgb} / 0.4)`, background: `rgb(${colorRgb} / 0.04)` }}>
                      <p className="text-[8px] font-mono tracking-widest mb-2" style={{ color: `rgb(${colorRgb} / 0.6)` }}>LEGACY</p>
                      <p className="text-[12px] leading-[1.7] italic" style={{ color: "var(--fg-55)" }}>{sections.legacy}</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
