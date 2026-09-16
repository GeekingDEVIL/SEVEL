"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Award, Trophy, ChevronRight, Crown, Medal, Flame } from "lucide-react";
import { motion } from "framer-motion";
import SwipeNav from "../../components/ui/swipe-nav";
import { getSocialSections } from "../../lib/navPills";
import { useModules } from "../../lib/useModules";
import { useAuth } from "../../lib/AuthProvider";
import { useSex } from "../../lib/useSex";
import { supabase } from "../../lib/supabase";
import { computeLevel, getRank } from "../../lib/levelSystem";
import { staggerContainer, staggerItem } from "../../lib/motion";

type Achievement = {
  id: string;
  message: string;
  created_at: string;
};

type LeaderboardEntry = {
  user_id: string;
  display_name: string;
  total_xp: number;
  level: number;
};

export default function SocialHub() {
  const router = useRouter();
  const { user } = useAuth();
  const { enabledKeys } = useModules();
  const { sex: userSex } = useSex();

  const [totalXp, setTotalXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user) return;

      const [{ data: statsRow }, { data: notifs }, { data: allStats }] = await Promise.all([
        supabase.from("user_stats").select("total_xp, current_streak, total_workouts, achievement_count").eq("user_id", user.id).eq("sex", userSex).maybeSingle(),
        supabase.from("notifications").select("id, message, created_at").eq("user_id", user.id).eq("sex", userSex).like("message", "%achievement%").order("created_at", { ascending: false }).limit(5),
        supabase.from("user_stats").select("user_id, total_xp, total_workouts").eq("sex", userSex).order("total_xp", { ascending: false }).limit(100),
      ]);

      if (cancelled) return;

      let myXp = 0;
      if (statsRow) {
        myXp = statsRow.total_xp ?? 0;
        setTotalXp(myXp);
        setStreak(statsRow.current_streak ?? 0);
        setTotalWorkouts(statsRow.total_workouts ?? 0);
      } else {
        const { data: xpData } = await supabase
          .from("workout_sessions")
          .select("xp_earned")
          .eq("user_id", user.id)
          .eq("status", "completed")
          .eq("sex", userSex);
        if (!cancelled) {
          myXp = (xpData ?? []).reduce((s, r: any) => s + (r.xp_earned || 0), 0);
          setTotalXp(myXp);
        }
      }

      const entries = allStats ?? [];
      setTotalUsers(entries.length);

      const myIdx = entries.findIndex((e: any) => e.user_id === user.id);
      setUserRank(myIdx >= 0 ? myIdx + 1 : null);

      const topUserIds = entries.slice(0, 5).map((e: any) => e.user_id);
      let profileMap: Record<string, string> = {};
      if (topUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", topUserIds);
        if (profiles) {
          for (const p of profiles) {
            profileMap[p.id] = p.display_name || "Challenger";
          }
        }
      }
      if (cancelled) return;

      const top5: LeaderboardEntry[] = entries.slice(0, 5).map((e: any) => ({
        user_id: e.user_id,
        display_name: profileMap[e.user_id] || "Challenger",
        total_xp: e.total_xp ?? 0,
        level: computeLevel(e.total_xp ?? 0).level,
      }));
      setLeaderboard(top5);

      setAchievements(
        (notifs ?? []).map((n: any) => ({
          id: n.id,
          message: n.message,
          created_at: n.created_at,
        })),
      );
      setLoaded(true);
    }
    load();
    return () => { cancelled = true; };
  }, [user, userSex]);

  const levelInfo = computeLevel(totalXp);
  const rank = getRank(levelInfo.level);

  const RANK_ICONS = [Crown, Medal, Medal];
  const RANK_COLORS = ["text-yellow-400", "text-gray-300", "text-amber-600"];

  return (
    <main className="relative min-h-screen w-full bg-[var(--bg-primary)] text-[var(--text-primary)] pb-24 md:pb-10 overflow-x-hidden">
      <motion.div
        className="relative z-10 w-full max-w-xl mx-auto px-4 pt-4 space-y-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.h1 variants={staggerItem} className="text-xl font-bold font-display text-[var(--fg-90)]">
          Social
        </motion.h1>

        <motion.div variants={staggerItem}>
          <SwipeNav sections={getSocialSections(enabledKeys)} />
        </motion.div>

        {/* Your Rank — compact */}
        <motion.div variants={staggerItem} className="glass-card p-4">
          <div className="flex items-center gap-4">
            {/* Level ring */}
            {(() => {
              const pct = levelInfo.isMaxLevel ? 100 : Math.round(levelInfo.progress * 100);
              const r = 28;
              const circ = 2 * Math.PI * r;
              const offset = circ - (pct / 100) * circ;
              return (
                <div className="relative w-16 h-16 shrink-0">
                  <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
                    <circle cx="32" cy="32" r={r} fill="none" stroke="var(--fg-04)" strokeWidth="4" />
                    <circle cx="32" cy="32" r={r} fill="none" stroke="rgb(var(--accent-rgb))" strokeWidth="4" strokeLinecap="round"
                      strokeDasharray={circ} strokeDashoffset={offset} className="transition-all duration-700" />
                  </svg>
                  <span className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-base font-bold font-mono text-[var(--fg-90)]">{loaded ? levelInfo.level : "—"}</span>
                    <span className="text-[6px] font-mono text-[var(--fg-25)]">LVL</span>
                  </span>
                </div>
              );
            })()}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <p className="text-xl font-bold font-mono text-[var(--fg-90)]">
                  {loaded ? totalXp.toLocaleString() : "—"}
                </p>
                <span className="text-xs font-mono text-[var(--fg-25)]">XP</span>
              </div>
              <p className="text-[10px] font-mono text-[var(--fg-30)] mt-0.5">
                <span className={rank.color}>{rank.name}</span>
                <span className="text-[var(--fg-15)]"> · {levelInfo.isMaxLevel ? "MAX" : `${levelInfo.xpIntoCurrentLevel}/${levelInfo.xpNeededForNext}`}</span>
              </p>
            </div>
            {userRank !== null && (
              <div className="text-right shrink-0">
                <p className="text-lg font-bold font-mono text-[rgb(var(--accent-rgb))]">#{userRank}</p>
                <p className="text-[9px] font-mono text-[var(--fg-20)]">of {totalUsers}</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Stats row */}
        <motion.div variants={staggerItem} className="grid grid-cols-3 gap-2">
          <div className="glass-card p-3 text-center">
            <p className="text-xl font-bold font-mono text-[var(--fg-90)]">{loaded ? totalWorkouts : "—"}</p>
            <p className="text-[9px] font-mono text-[var(--fg-25)] mt-0.5">Workouts</p>
          </div>
          <div className="glass-card p-3 text-center">
            <p className="text-xl font-bold font-mono text-[var(--fg-90)]">{loaded ? streak : "—"}</p>
            <p className="text-[9px] font-mono text-[var(--fg-25)] mt-0.5">Streak</p>
          </div>
          <div className="glass-card p-3 text-center">
            <p className="text-xl font-bold font-mono text-[var(--fg-90)]">{loaded ? levelInfo.level : "—"}</p>
            <p className="text-[9px] font-mono text-[var(--fg-25)] mt-0.5">Level</p>
          </div>
        </motion.div>

        {/* Top 5 Leaderboard */}
        <motion.div variants={staggerItem} className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy size={14} className="text-yellow-400/60" />
              <p className="text-[9px] font-mono tracking-widest text-yellow-400/60">LEADERBOARD</p>
            </div>
            <button
              onClick={() => router.push("/rankings")}
              className="flex items-center gap-0.5 text-[9px] font-mono text-[rgb(var(--accent-rgb)/0.5)] hover:text-[rgb(var(--accent-rgb))] transition"
            >
              Full Rankings <ChevronRight size={10} />
            </button>
          </div>
          {loaded && leaderboard.length > 0 ? (
            <div className="space-y-0.5">
              {leaderboard.map((entry, i) => {
                const isMe = entry.user_id === user?.id;
                const RankIcon = i < 3 ? RANK_ICONS[i] : null;
                const rankColor = i < 3 ? RANK_COLORS[i] : "";
                const entryRank = getRank(entry.level);
                return (
                  <div
                    key={entry.user_id}
                    className={`flex items-center gap-3 py-2 px-2 rounded-lg transition ${
                      isMe ? "bg-[rgb(var(--accent-rgb)/0.06)] border border-[rgb(var(--accent-rgb)/0.1)]" : ""
                    }`}
                  >
                    <span className="w-5 text-center shrink-0">
                      {RankIcon ? (
                        <RankIcon size={14} className={rankColor} />
                      ) : (
                        <span className="text-[10px] font-mono text-[var(--fg-25)]">{i + 1}</span>
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${isMe ? "text-[var(--text-primary)] font-medium" : "text-[var(--fg-60)]"}`}>
                        {isMe ? "You" : entry.display_name}
                      </p>
                    </div>
                    <span className={`text-[9px] font-mono ${entryRank.color} shrink-0`}>{entryRank.name}</span>
                    <span className="text-xs font-mono text-[var(--fg-30)] w-14 text-right shrink-0">
                      {entry.total_xp.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-[var(--fg-20)] text-center py-4">
              {loaded ? "No rankings yet" : "Loading..."}
            </p>
          )}
        </motion.div>

        {/* Recent Achievements */}
        <motion.div variants={staggerItem} className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Award size={14} className="text-amber-400/60" />
              <p className="text-[9px] font-mono tracking-widest text-amber-400/60">RECENT ACHIEVEMENTS</p>
            </div>
            <button onClick={() => router.push("/achievements")} className="flex items-center gap-0.5 text-[9px] font-mono text-[rgb(var(--accent-rgb)/0.5)] hover:text-[rgb(var(--accent-rgb))] transition">
              View All <ChevronRight size={10} />
            </button>
          </div>
          {achievements.length > 0 ? (
            <div className="space-y-0.5">
              {achievements.slice(0, 4).map((a) => (
                <div key={a.id} className="flex items-center gap-2.5 py-1.5 px-1">
                  <Award size={13} className="text-amber-400/50 shrink-0" />
                  <span className="text-xs text-[var(--fg-60)] flex-1 truncate">{a.message}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[var(--fg-20)] text-center py-4">
              {loaded ? "Complete workouts to unlock achievements" : "Loading..."}
            </p>
          )}
        </motion.div>

      </motion.div>
    </main>
  );
}
