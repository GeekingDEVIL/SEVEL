"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Award, Lock, ChevronLeft, Sparkles, Search, SlidersHorizontal, X } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/AuthProvider";
import { ACHIEVEMENT_DEFS, RARITY_COLORS, type AchievementDef } from "../../lib/achievements";
import CubeLoader from "../../components/ui/cube-loader";
import SwipeNav from "../../components/ui/swipe-nav";
import { getSocialSections } from "../../lib/navPills";
import { useModules } from "../../lib/useModules";
import { useSex } from "../../lib/useSex";
import { staggerContainer, staggerItem } from "../../lib/motion";
import { computeCharacterLevel } from "../../lib/characterEngine";
import OnboardingTooltip from "../../components/ui/onboarding-tooltip";

type ProgressStats = {
  workouts: number;
  streak: number;
  prCount: number;
  volume: number;
  exercises: number;
  xp: number;
  level: number;
};

function getProgress(key: string, stats: ProgressStats): { current: number; target: number } | null {
  const m: Record<string, [number, number]> = {
    first_workout: [stats.workouts, 1], workouts_10: [stats.workouts, 10], workouts_25: [stats.workouts, 25],
    workouts_50: [stats.workouts, 50], workouts_100: [stats.workouts, 100], workouts_250: [stats.workouts, 250], workouts_500: [stats.workouts, 500],
    streak_7: [stats.streak, 7], streak_14: [stats.streak, 14], streak_30: [stats.streak, 30], streak_60: [stats.streak, 60], streak_100: [stats.streak, 100],
    first_pr: [stats.prCount, 1], prs_10: [stats.prCount, 10], prs_25: [stats.prCount, 25], prs_50: [stats.prCount, 50], prs_100: [stats.prCount, 100],
    volume_10k: [stats.volume, 10000], volume_50k: [stats.volume, 50000], volume_100k: [stats.volume, 100000], volume_500k: [stats.volume, 500000], volume_1m: [stats.volume, 1000000],
    exercises_10: [stats.exercises, 10], exercises_25: [stats.exercises, 25], exercises_50: [stats.exercises, 50],
    xp_1000: [stats.xp, 1000], xp_5000: [stats.xp, 5000], xp_10000: [stats.xp, 10000], xp_50000: [stats.xp, 50000], xp_100000: [stats.xp, 100000],
    rank_iron: [stats.level, 5], rank_bronze: [stats.level, 10], rank_silver: [stats.level, 20], rank_gold: [stats.level, 35],
    rank_platinum: [stats.level, 50], rank_diamond: [stats.level, 70], rank_master: [stats.level, 90], rank_grandmaster: [stats.level, 110],
    rank_legend: [stats.level, 130], rank_mythic: [stats.level, 145], rank_transcendent: [stats.level, 150],
  };
  const entry = m[key];
  return entry ? { current: entry[0], target: entry[1] } : null;
}

export default function AchievementsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { enabledKeys } = useModules();
  const { sex: userSex } = useSex();
  const [earnedKeys, setEarnedKeys] = useState<Set<string>>(new Set());
  const [earnedDates, setEarnedDates] = useState<Record<string, string>>({});
  const [progressStats, setProgressStats] = useState<ProgressStats>({ workouts: 0, streak: 0, prCount: 0, volume: 0, exercises: 0, xp: 0, level: 1 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "earned" | "locked">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [rarityFilter, setRarityFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    async function load() {
      if (!user) return;
      const [{ data: achData }, { data: statsRow }, { count: prCount }, { data: exData }] = await Promise.all([
        supabase.from("achievements").select("achievement_key, earned_at").eq("user_id", user.id),
        supabase.from("user_stats").select("total_xp, total_workouts, total_volume, current_streak, best_streak").eq("user_id", user.id).eq("sex", userSex).maybeSingle(),
        supabase.from("exercise_set_logs").select("id, workout_sessions!inner()", { count: "exact", head: true })
          .eq("workout_sessions.user_id", user.id).eq("workout_sessions.status", "completed").eq("workout_sessions.sex", userSex).eq("is_pr", true),
        supabase.from("exercise_set_logs").select("exercise_id, workout_sessions!inner()").eq("workout_sessions.user_id", user.id)
          .eq("workout_sessions.status", "completed").eq("workout_sessions.sex", userSex).limit(1000),
      ]);

      const keys = new Set((achData ?? []).map((a: any) => a.achievement_key));
      const dates: Record<string, string> = {};
      (achData ?? []).forEach((a: any) => { dates[a.achievement_key] = a.earned_at; });
      setEarnedKeys(keys);
      setEarnedDates(dates);

      const totalXp = statsRow?.total_xp ?? 0;
      setProgressStats({
        workouts: statsRow?.total_workouts ?? 0,
        streak: Math.max(statsRow?.current_streak ?? 0, statsRow?.best_streak ?? 0),
        prCount: prCount ?? 0,
        volume: statsRow?.total_volume ?? 0,
        exercises: new Set((exData ?? []).map((e: any) => e.exercise_id)).size,
        xp: totalXp,
        level: computeCharacterLevel(totalXp).level,
      });
      setLoading(false);
    }
    load();
  }, [user, userSex]);

  const categories = ["all", ...Array.from(new Set(ACHIEVEMENT_DEFS.map((a) => a.category)))];
  const rarities = ["all", ...Array.from(new Set(ACHIEVEMENT_DEFS.map((a) => a.rarity)))];

  const activeAdvancedCount = (categoryFilter !== "all" ? 1 : 0) + (rarityFilter !== "all" ? 1 : 0);

  const filtered = ACHIEVEMENT_DEFS.filter((a) => {
    if (categoryFilter !== "all" && a.category !== categoryFilter) return false;
    if (rarityFilter !== "all" && a.rarity !== rarityFilter) return false;
    if (filter === "earned" && !earnedKeys.has(a.key)) return false;
    if (filter === "locked" && earnedKeys.has(a.key)) return false;
    const isSecret = a.secret && !earnedKeys.has(a.key);
    if (search.trim() && isSecret) return false;
    if (search.trim() && !`${a.name} ${a.description}`.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  });

  const grouped: Record<string, AchievementDef[]> = {};
  filtered.forEach((a) => {
    if (!grouped[a.category]) grouped[a.category] = [];
    grouped[a.category].push(a);
  });

  const totalEarned = ACHIEVEMENT_DEFS.filter((a) => earnedKeys.has(a.key)).length;
  const totalAchievements = ACHIEVEMENT_DEFS.length;
  const completionPct = Math.round((totalEarned / totalAchievements) * 100);

  const recentlyEarned = ACHIEVEMENT_DEFS
    .filter((a) => earnedKeys.has(a.key) && earnedDates[a.key])
    .sort((a, b) => new Date(earnedDates[b.key]).getTime() - new Date(earnedDates[a.key]).getTime())
    .slice(0, 3);

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function getChainProgress(chainName: string): { earned: number; total: number } {
    const chainAchs = ACHIEVEMENT_DEFS.filter((a) => a.chain === chainName);
    const earned = chainAchs.filter((a) => earnedKeys.has(a.key)).length;
    return { earned, total: chainAchs.length };
  }

  function isNewlyEarned(key: string): boolean {
    const d = earnedDates[key];
    if (!d) return false;
    return Date.now() - new Date(d).getTime() < 86400000;
  }

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] pb-24 md:pb-10 relative">

      <div className="relative z-10 max-w-xl mx-auto px-4 pt-6 space-y-5">
        <SwipeNav sections={getSocialSections(enabledKeys)} />

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold font-display text-[rgb(var(--accent-light-rgb))]">Achievements</h1>
            <p className="text-[11px] text-[var(--fg-30)] mt-0.5">Your training milestones and records</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold font-mono text-[var(--fg-90)]">{totalEarned}<span className="text-sm text-[var(--fg-30)]">/{totalAchievements}</span></p>
            <p className="text-[9px] font-mono text-[var(--fg-30)]">{completionPct}% complete</p>
          </div>
        </div>

        <div className="relative">
          <OnboardingTooltip id="achievements-chains" message="Look for chain dots — complete achievement chains for bonus progression!" position="bottom" />
        </div>

        <div className="h-2.5 rounded-full bg-[var(--fg-06)] overflow-hidden border border-[var(--fg-04)]">
          <div
            className="h-full bg-gradient-to-r from-[rgb(var(--accent-rgb))] to-[rgb(var(--accent-light-rgb))] rounded-full transition-all"
            style={{ width: `${completionPct}%` }}
          />
        </div>

        {recentlyEarned.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2.5">
              <Sparkles size={12} className="text-yellow-300" />
              <p className="text-[10px] font-mono tracking-widest text-[var(--fg-25)]">RECENTLY EARNED</p>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {recentlyEarned.map((a) => {
                const rarity = RARITY_COLORS[a.rarity];
                return (
                  <div key={a.key} className={`flex-shrink-0 w-32 rounded-xl border ${rarity.border} ${rarity.bg} p-3 text-center`}>
                    <div className="text-3xl mb-1.5">{a.icon}</div>
                    <p className="text-[11px] font-bold text-[var(--fg-90)] truncate">{a.name}</p>
                    <span className={`text-[8px] font-mono ${rarity.text}`}>{a.rarity}</span>
                    <p className="text-[9px] font-mono text-[var(--fg-25)] mt-1">{timeAgo(earnedDates[a.key])}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-20)]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search achievements…"
                className="w-full text-[11px] font-mono glass-input pl-8 pr-3 py-2"
              />
            </div>
            <button
              onClick={() => setMoreOpen((v) => !v)}
              className={`flex items-center gap-1.5 text-[10px] font-mono px-3 py-2 rounded-lg border transition shrink-0 ${
                moreOpen || activeAdvancedCount > 0 ? "border-[rgb(var(--accent-rgb)/0.4)] bg-[rgb(var(--accent-rgb)/0.1)] text-[rgb(var(--accent-light-rgb))]" : "border-[var(--fg-08)] text-[var(--fg-40)] hover:text-[var(--fg-70)]"
              }`}
            >
              <SlidersHorizontal size={12} /> Filters{activeAdvancedCount > 0 && ` (${activeAdvancedCount})`}
            </button>
          </div>

          <div className="flex gap-2 flex-wrap">
            {(["all", "earned", "locked"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-[10px] font-mono px-3 py-1.5 rounded-lg border transition ${
                  filter === f ? "border-[rgb(var(--accent-rgb)/0.4)] bg-[rgb(var(--accent-rgb)/0.1)] text-[rgb(var(--accent-light-rgb))]" : "border-[var(--fg-10)] text-[var(--fg-40)] hover:text-[var(--fg-70)]"
                }`}
              >
                {f.toUpperCase()} {f === "earned" ? `(${totalEarned})` : f === "locked" ? `(${totalAchievements - totalEarned})` : ""}
              </button>
            ))}
          </div>

          {moreOpen && (
            <div className="glass-card p-3 space-y-3">
              <div>
                <p className="text-[8px] font-mono tracking-widest text-[var(--fg-25)] mb-1.5">CATEGORY</p>
                <div className="flex gap-1.5 flex-wrap">
                  {categories.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCategoryFilter(c)}
                      className={`text-[10px] font-mono px-2.5 py-1.5 rounded-lg border transition ${
                        categoryFilter === c ? "border-[rgb(var(--accent-rgb)/0.4)] bg-[rgb(var(--accent-rgb)/0.1)] text-[rgb(var(--accent-light-rgb))]" : "border-[var(--fg-10)] text-[var(--fg-30)] hover:text-[var(--fg-60)]"
                      }`}
                    >
                      {c === "all" ? "ALL" : c.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[8px] font-mono tracking-widest text-[var(--fg-25)] mb-1.5">RARITY</p>
                <div className="flex gap-1.5 flex-wrap">
                  {rarities.map((r) => {
                    const active = rarityFilter === r;
                    const rc = r !== "all" ? RARITY_COLORS[r as keyof typeof RARITY_COLORS] : null;
                    return (
                      <button
                        key={r}
                        onClick={() => setRarityFilter(r)}
                        className={`text-[10px] font-mono px-2.5 py-1.5 rounded-lg border transition ${
                          active ? (rc ? `${rc.border} ${rc.bg} ${rc.text}` : "border-[rgb(var(--accent-rgb)/0.4)] bg-[rgb(var(--accent-rgb)/0.1)] text-[rgb(var(--accent-light-rgb))]") : "border-[var(--fg-10)] text-[var(--fg-30)] hover:text-[var(--fg-60)]"
                        }`}
                      >
                        {r === "all" ? "ALL" : r}
                      </button>
                    );
                  })}
                </div>
              </div>
              {activeAdvancedCount > 0 && (
                <button
                  onClick={() => { setCategoryFilter("all"); setRarityFilter("all"); }}
                  className="flex items-center gap-1 text-[9px] font-mono text-[var(--fg-30)] hover:text-[var(--fg-60)] transition"
                >
                  <X size={10} /> Clear filters
                </button>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <CubeLoader message="Loading achievements…" />
        ) : Object.keys(grouped).length === 0 ? (
          <div className="text-center py-16">
            <Award size={32} className="mx-auto mb-3 text-[var(--fg-15)]" />
            <p className="text-sm font-semibold text-[var(--fg-25)]">NO ACHIEVEMENTS FOUND</p>
            <p className="text-xs text-[var(--fg-20)] mt-1">Try a different filter.</p>
          </div>
        ) : (
          Object.entries(grouped).map(([category, achievements]) => (
            <div key={category}>
              <p className="text-[10px] font-mono tracking-widest text-[rgb(var(--accent-light-rgb)/0.6)] mb-2.5">{category.toUpperCase()}</p>
              <motion.div className="grid grid-cols-1 sm:grid-cols-2 gap-2" variants={staggerContainer} initial="hidden" animate="visible">
                {achievements.map((a) => {
                  const isEarned = earnedKeys.has(a.key);
                  const isSecret = a.secret && !isEarned;
                  const newlyEarned = isEarned && isNewlyEarned(a.key);
                  const rarity = RARITY_COLORS[a.rarity];
                  const chain = a.chain ? getChainProgress(a.chain) : null;
                  return (
                    <motion.div
                      key={a.key}
                      variants={staggerItem}
                      className={`relative flex items-start gap-3 rounded-xl border p-3 transition overflow-hidden ${
                        isEarned ? `${rarity.border} ${rarity.bg}` : "border-[var(--fg-06)] bg-[var(--fg-01)] opacity-50"
                      }`}
                    >
                      {newlyEarned && (
                        <div className="achievement-celebrate" />
                      )}
                      <div className="text-2xl shrink-0 mt-0.5 relative z-[1]">
                        {isEarned ? a.icon : isSecret ? <span className="text-xl">❓</span> : <Lock size={20} className="text-[var(--fg-20)]" />}
                      </div>
                      <div className="flex-1 min-w-0 relative z-[1]">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-bold ${isEarned ? "text-[var(--fg-90)]" : "text-[var(--fg-30)]"} truncate`}>
                            {isSecret ? "???" : a.name}
                          </p>
                          <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${rarity.text} ${rarity.bg} border ${rarity.border} shrink-0`}>
                            {isSecret ? "SECRET" : a.rarity}
                          </span>
                        </div>
                        <p className={`text-[10px] font-mono mt-0.5 ${isEarned ? "text-[var(--fg-50)]" : "text-[var(--fg-20)]"}`}>
                          {isSecret ? "Hidden achievement — keep training to discover it" : a.description}
                        </p>
                        {isEarned && earnedDates[a.key] && (
                          <p className="text-[9px] font-mono text-[var(--fg-25)] mt-1">
                            {newlyEarned && <span className="text-[rgb(var(--accent-light-rgb))]">NEW! </span>}
                            Earned {timeAgo(earnedDates[a.key])}
                          </p>
                        )}
                        {chain && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <div className="flex gap-0.5">
                              {Array.from({ length: chain.total }, (_, i) => (
                                <div
                                  key={i}
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    i < chain.earned ? "bg-[rgb(var(--accent-rgb))]" : "bg-[var(--fg-10)]"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-[8px] font-mono text-[var(--fg-20)]">{chain.earned}/{chain.total}</span>
                          </div>
                        )}
                        {!isEarned && !isSecret && (() => {
                          const prog = getProgress(a.key, progressStats);
                          if (!prog) return null;
                          const pct = Math.min(100, Math.round((prog.current / prog.target) * 100));
                          const fmt = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n);
                          return (
                            <div className="mt-1.5">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-[8px] font-mono text-[var(--fg-25)]">{fmt(prog.current)} / {fmt(prog.target)}</span>
                                <span className="text-[8px] font-mono text-[var(--fg-20)]">{pct}%</span>
                              </div>
                              <div className="h-1 rounded-full bg-[var(--fg-04)] overflow-hidden">
                                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: `linear-gradient(90deg, rgb(var(--accent-rgb) / 0.4), rgb(var(--accent-rgb) / 0.7))` }} />
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
