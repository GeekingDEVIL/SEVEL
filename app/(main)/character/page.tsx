"use client";

import { useEffect, useState, useMemo } from "react";
import { Crown, Swords, Shield, Zap, Heart, Flame, Target, TrendingUp, Award, Lock, AlertTriangle, Star, Sparkles } from "lucide-react";
import SwipeNav from "../../components/ui/swipe-nav";
import { getSocialSections } from "../../lib/navPills";
import { useModules } from "../../lib/useModules";
import { useAuth } from "../../lib/AuthProvider";
import { useSex } from "../../lib/useSex";
import { supabase } from "../../lib/supabase";
import { computeLevel, getRank, getNextRank } from "../../lib/levelSystem";
import OnboardingTooltip from "../../components/ui/onboarding-tooltip";
import { useUnits } from "../../lib/useUnits";
import { kgToUnit } from "../../lib/units";

type FitnessClass = {
  name: string;
  icon: typeof Swords;
  color: string;
  description: string;
  stat: string;
};

const FITNESS_CLASSES: FitnessClass[] = [
  { name: "Warrior", icon: Swords, color: "239 68 68", description: "Strength-focused, heavy compound lifts", stat: "Strength" },
  { name: "Tank", icon: Shield, color: "59 130 246", description: "High volume, endurance through density", stat: "Endurance" },
  { name: "Berserker", icon: Flame, color: "249 115 22", description: "Explosive power, short rest times", stat: "Power" },
  { name: "Monk", icon: Heart, color: "16 185 129", description: "Balanced training, consistent dedication", stat: "Discipline" },
  { name: "Ranger", icon: Zap, color: "139 92 246", description: "Athletic versatility, mixed training", stat: "Agility" },
];

type StatBar = { label: string; value: number; max: number; color: string };

function classifyUser(stats: {
  totalWorkouts: number;
  totalVolume: number;
  avgSetsPerWorkout: number;
  streak: number;
  bestStreak: number;
  totalXp: number;
  prCount: number;
}): { fitnessClass: FitnessClass; powerLevel: number; statBars: StatBar[] } {
  const strengthScore = Math.min(100, Math.round((stats.totalVolume / 50000) * 100));
  const enduranceScore = Math.min(100, Math.round((stats.avgSetsPerWorkout / 25) * 100));
  const powerScore = Math.min(100, Math.round((stats.prCount / 20) * 100));
  const disciplineScore = Math.min(100, Math.round((stats.bestStreak / 30) * 100));
  const agilityScore = Math.min(100, Math.round((stats.totalWorkouts / 100) * 100));

  const scores = [
    { cls: FITNESS_CLASSES[0], score: strengthScore },
    { cls: FITNESS_CLASSES[1], score: enduranceScore },
    { cls: FITNESS_CLASSES[2], score: powerScore },
    { cls: FITNESS_CLASSES[3], score: disciplineScore },
    { cls: FITNESS_CLASSES[4], score: agilityScore },
  ];

  scores.sort((a, b) => b.score - a.score);
  const fitnessClass = scores[0].cls;

  const powerLevel = Math.round((strengthScore + enduranceScore + powerScore + disciplineScore + agilityScore) / 5);

  const statBars: StatBar[] = [
    { label: "STR", value: strengthScore, max: 100, color: "239 68 68" },
    { label: "END", value: enduranceScore, max: 100, color: "59 130 246" },
    { label: "POW", value: powerScore, max: 100, color: "249 115 22" },
    { label: "DIS", value: disciplineScore, max: 100, color: "16 185 129" },
    { label: "AGI", value: agilityScore, max: 100, color: "139 92 246" },
  ];

  return { fitnessClass, powerLevel, statBars };
}

type SkillNode = {
  id: string;
  name: string;
  description: string;
  threshold: (s: { totalWorkouts: number; totalVolume: number; prCount: number; bestStreak: number; avgSetsPerWorkout: number }) => boolean;
  x: number;
  y: number;
  color: string;
  parent?: string;
};

const SKILL_BRANCHES: { name: string; color: string; nodes: SkillNode[] }[] = [
  {
    name: "STRENGTH",
    color: "239 68 68",
    nodes: [
      { id: "s1", name: "First Lift", description: "Complete 1 workout", threshold: (s) => s.totalWorkouts >= 1, x: 60, y: 50, color: "239 68 68" },
      { id: "s2", name: "Iron Will", description: "1,000 kg total volume", threshold: (s) => s.totalVolume >= 1000, x: 60, y: 110, color: "239 68 68", parent: "s1" },
      { id: "s3", name: "Steel Body", description: "10,000 kg total volume", threshold: (s) => s.totalVolume >= 10000, x: 60, y: 170, color: "239 68 68", parent: "s2" },
      { id: "s4", name: "Titan", description: "50,000 kg total volume", threshold: (s) => s.totalVolume >= 50000, x: 60, y: 230, color: "239 68 68", parent: "s3" },
    ],
  },
  {
    name: "DISCIPLINE",
    color: "16 185 129",
    nodes: [
      { id: "d1", name: "Committed", description: "3-day streak", threshold: (s) => s.bestStreak >= 3, x: 175, y: 50, color: "16 185 129" },
      { id: "d2", name: "Dedicated", description: "7-day streak", threshold: (s) => s.bestStreak >= 7, x: 175, y: 110, color: "16 185 129", parent: "d1" },
      { id: "d3", name: "Relentless", description: "14-day streak", threshold: (s) => s.bestStreak >= 14, x: 175, y: 170, color: "16 185 129", parent: "d2" },
      { id: "d4", name: "Unbreakable", description: "30-day streak", threshold: (s) => s.bestStreak >= 30, x: 175, y: 230, color: "16 185 129", parent: "d3" },
    ],
  },
  {
    name: "MASTERY",
    color: "139 92 246",
    nodes: [
      { id: "m1", name: "Novice", description: "5 workouts done", threshold: (s) => s.totalWorkouts >= 5, x: 290, y: 50, color: "139 92 246" },
      { id: "m2", name: "Apprentice", description: "Set 1 PR", threshold: (s) => s.prCount >= 1, x: 290, y: 110, color: "139 92 246", parent: "m1" },
      { id: "m3", name: "Journeyman", description: "Set 10 PRs", threshold: (s) => s.prCount >= 10, x: 290, y: 170, color: "139 92 246", parent: "m2" },
      { id: "m4", name: "Expert", description: "50 workouts done", threshold: (s) => s.totalWorkouts >= 50, x: 290, y: 230, color: "139 92 246", parent: "m3" },
    ],
  },
];

function SkillTree({ stats, classColor }: {
  stats: { totalWorkouts: number; totalVolume: number; prCount: number; bestStreak: number; avgSetsPerWorkout: number };
  classColor: string;
}) {
  const [selected, setSelected] = useState<SkillNode | null>(null);

  const allNodes = SKILL_BRANCHES.flatMap((b) => b.nodes);
  const unlockedIds = new Set(allNodes.filter((n) => n.threshold(stats)).map((n) => n.id));

  return (
    <div className="glass-card p-4">
      <p className="section-label mb-2">SKILL TREE</p>
      <div className="relative">
        <svg viewBox="0 0 350 270" className="w-full">
          {/* Branch labels */}
          {SKILL_BRANCHES.map((branch) => (
            <text
              key={branch.name}
              x={branch.nodes[0].x}
              y={20}
              textAnchor="middle"
              fill={`rgb(${branch.color} / 0.5)`}
              fontSize={8}
              fontFamily="monospace"
              fontWeight="bold"
              letterSpacing="1"
            >
              {branch.name}
            </text>
          ))}

          {/* Connection lines */}
          {allNodes.filter((n) => n.parent).map((node) => {
            const parent = allNodes.find((p) => p.id === node.parent)!;
            const parentUnlocked = unlockedIds.has(parent.id);
            const nodeUnlocked = unlockedIds.has(node.id);
            return (
              <line
                key={`${node.parent}-${node.id}`}
                x1={parent.x}
                y1={parent.y + 14}
                x2={node.x}
                y2={node.y - 14}
                stroke={nodeUnlocked ? `rgb(${node.color} / 0.5)` : parentUnlocked ? `rgb(${node.color} / 0.2)` : "var(--fg-06)"}
                strokeWidth={nodeUnlocked ? 2 : 1}
                strokeDasharray={nodeUnlocked ? "none" : "4 3"}
              />
            );
          })}

          {/* Nodes */}
          {allNodes.map((node) => {
            const unlocked = unlockedIds.has(node.id);
            const isSelected = selected?.id === node.id;
            return (
              <g
                key={node.id}
                onClick={() => setSelected(isSelected ? null : node)}
                style={{ cursor: "pointer" }}
              >
                {unlocked && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={18}
                    fill="none"
                    stroke={`rgb(${node.color} / 0.15)`}
                    strokeWidth={1}
                  >
                    <animate attributeName="r" from="14" to="20" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.6" to="0" dur="2s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={14}
                  fill={unlocked ? `rgb(${node.color} / 0.15)` : "var(--fg-03)"}
                  stroke={unlocked ? `rgb(${node.color} / 0.6)` : "var(--fg-08)"}
                  strokeWidth={isSelected ? 2 : 1}
                />
                {unlocked ? (
                  <text
                    x={node.x}
                    y={node.y + 1}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={`rgb(${node.color})`}
                    fontSize={10}
                  >
                    &#x2713;
                  </text>
                ) : (
                  <text
                    x={node.x}
                    y={node.y + 1}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="var(--fg-15)"
                    fontSize={8}
                  >
                    &#x1F512;
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {selected && (
          <div
            className="absolute left-1/2 -translate-x-1/2 bottom-0 glass-card px-3 py-2 text-center max-w-[200px]"
            style={{
              borderColor: unlockedIds.has(selected.id) ? `rgb(${selected.color} / 0.3)` : undefined,
            }}
          >
            <p className="text-[10px] font-bold font-mono" style={{
              color: unlockedIds.has(selected.id) ? `rgb(${selected.color})` : "var(--fg-50)",
            }}>
              {selected.name}
            </p>
            <p className="text-[9px] font-mono text-[var(--fg-30)]">{selected.description}</p>
            {unlockedIds.has(selected.id) ? (
              <p className="text-[8px] font-mono text-emerald-400/60 mt-0.5">UNLOCKED</p>
            ) : (
              <p className="text-[8px] font-mono text-[var(--fg-20)] mt-0.5">LOCKED</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

type Title = {
  name: string;
  condition: string;
  check: (s: { totalWorkouts: number; totalVolume: number; prCount: number; bestStreak: number; streak: number; achievementCount: number; totalXp: number }) => boolean;
  rarity: "common" | "rare" | "epic" | "legendary";
};

const TITLES: Title[] = [
  { name: "First Steps", condition: "Complete 1 workout", check: (s) => s.totalWorkouts >= 1, rarity: "common" },
  { name: "Iron Pumper", condition: "Lift 5,000 kg total", check: (s) => s.totalVolume >= 5000, rarity: "common" },
  { name: "Record Breaker", condition: "Set your first PR", check: (s) => s.prCount >= 1, rarity: "common" },
  { name: "Streak Starter", condition: "Hit a 3-day streak", check: (s) => s.bestStreak >= 3, rarity: "common" },
  { name: "Gym Regular", condition: "Complete 10 workouts", check: (s) => s.totalWorkouts >= 10, rarity: "rare" },
  { name: "Volume Dealer", condition: "Lift 25,000 kg total", check: (s) => s.totalVolume >= 25000, rarity: "rare" },
  { name: "PR Machine", condition: "Set 10 PRs", check: (s) => s.prCount >= 10, rarity: "rare" },
  { name: "Week Warrior", condition: "Hit a 7-day streak", check: (s) => s.bestStreak >= 7, rarity: "rare" },
  { name: "Centurion", condition: "Complete 50 workouts", check: (s) => s.totalWorkouts >= 50, rarity: "epic" },
  { name: "Steel Forged", condition: "Lift 100,000 kg total", check: (s) => s.totalVolume >= 100000, rarity: "epic" },
  { name: "Unstoppable", condition: "Hit a 30-day streak", check: (s) => s.bestStreak >= 30, rarity: "epic" },
  { name: "The Legend", condition: "Complete 200 workouts", check: (s) => s.totalWorkouts >= 200, rarity: "legendary" },
  { name: "Mountain Mover", condition: "Lift 500,000 kg total", check: (s) => s.totalVolume >= 500000, rarity: "legendary" },
  { name: "Eternal Flame", condition: "Hit a 100-day streak", check: (s) => s.bestStreak >= 100, rarity: "legendary" },
];

const RARITY_COLORS: Record<string, string> = {
  common: "255 255 255",
  rare: "59 130 246",
  epic: "139 92 246",
  legendary: "249 115 22",
};

function TitlesCard({ stats, classColor }: {
  stats: { totalWorkouts: number; totalVolume: number; prCount: number; bestStreak: number; streak: number; achievementCount: number; totalXp: number };
  classColor: string;
}) {
  const earned = TITLES.filter((t) => t.check(stats));
  const next = TITLES.find((t) => !t.check(stats));
  const prestigeLevel = earned.length;

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="section-label">TITLES</p>
        <div className="flex items-center gap-1.5">
          <Star size={10} className="text-yellow-400/60" />
          <span className="text-[9px] font-mono text-[var(--fg-30)]">PRESTIGE {prestigeLevel}</span>
        </div>
      </div>

      {earned.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {earned.map((title) => {
            const color = RARITY_COLORS[title.rarity];
            return (
              <div
                key={title.name}
                className="px-2 py-1 rounded-md text-[9px] font-mono font-bold"
                style={{
                  background: `rgb(${color} / 0.08)`,
                  border: `1px solid rgb(${color} / 0.2)`,
                  color: `rgb(${color} / 0.7)`,
                }}
                title={title.condition}
              >
                {title.name}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-[10px] font-mono text-[var(--fg-20)] mb-3">Complete workouts to earn titles</p>
      )}

      {next && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-[var(--fg-02)] border border-[var(--fg-04)]">
          <Sparkles size={12} className="text-[var(--fg-15)] shrink-0" />
          <div>
            <p className="text-[9px] font-mono text-[var(--fg-40)]">
              Next: <span className="font-bold" style={{ color: `rgb(${RARITY_COLORS[next.rarity]} / 0.6)` }}>{next.name}</span>
            </p>
            <p className="text-[8px] font-mono text-[var(--fg-20)]">{next.condition}</p>
          </div>
        </div>
      )}
    </div>
  );
}

const WEAKNESS_TIPS: Record<string, string> = {
  STR: "Add heavier compound lifts — squats, deadlifts, bench press",
  END: "Increase sets per workout or add supersets for more volume",
  POW: "Push for PRs more often — progressive overload is key",
  DIS: "Build consistency — aim for 3+ workouts per week, every week",
  AGI: "Train more frequently across different movement patterns",
};

function WeaknessCard({ statBars }: { statBars: StatBar[] }) {
  const sorted = [...statBars].sort((a, b) => a.value - b.value);
  const weakest = sorted[0];
  const strongest = sorted[sorted.length - 1];

  if (weakest.value === strongest.value) return null;

  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle size={12} className="text-amber-400/50" />
        <p className="section-label">WEAKNESS DETECTED</p>
      </div>
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{
          background: `rgb(${weakest.color} / 0.1)`,
          border: `1px solid rgb(${weakest.color} / 0.2)`,
        }}>
          <span className="text-[10px] font-mono font-bold" style={{ color: `rgb(${weakest.color} / 0.7)` }}>
            {weakest.label}
          </span>
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-mono text-[var(--fg-50)]">
              {weakest.label} is your weakest at <span className="font-bold text-[var(--fg-70)]">{weakest.value}</span>
            </p>
          </div>
          <div className="h-1.5 rounded-full bg-[var(--fg-04)] overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${weakest.value}%`,
                background: `rgb(${weakest.color} / 0.5)`,
              }}
            />
          </div>
        </div>
      </div>
      <p className="text-[9px] font-mono text-[var(--fg-30)] leading-relaxed">
        {WEAKNESS_TIPS[weakest.label] ?? "Keep training to improve this attribute"}
      </p>
    </div>
  );
}

function radarPoint(cx: number, cy: number, r: number, i: number, n: number): [number, number] {
  const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
}

function RadarChart({ stats, classColor }: { stats: StatBar[]; classColor: string }) {
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 50);
    return () => clearTimeout(t);
  }, []);

  const cx = 150, cy = 150, maxR = 110;
  const n = stats.length;
  const rings = [0.25, 0.5, 0.75, 1];

  const ghostValues = useMemo(
    () => stats.map((s, i) => Math.max(0, s.value - [3, 5, 2, 4, 6][i % 5])),
    [stats],
  );

  const currentPoints = stats.map((s, i) => {
    const r = animate ? (s.value / 100) * maxR : 0;
    return radarPoint(cx, cy, Math.max(r, 4), i, n);
  });
  const ghostPoints = stats.map((s, i) => {
    const r = (ghostValues[i] / 100) * maxR;
    return radarPoint(cx, cy, Math.max(r, 4), i, n);
  });

  const currentPath = currentPoints.map((p) => `${p[0]},${p[1]}`).join(" ");
  const ghostPath = ghostPoints.map((p) => `${p[0]},${p[1]}`).join(" ");

  return (
    <div className="relative flex justify-center">
      <svg viewBox="0 0 300 300" className="w-full max-w-[280px]">
        {/* Grid rings */}
        {rings.map((pct) => {
          const pts = Array.from({ length: n }, (_, i) => radarPoint(cx, cy, maxR * pct, i, n));
          return (
            <polygon
              key={pct}
              points={pts.map((p) => `${p[0]},${p[1]}`).join(" ")}
              fill="none"
              stroke="var(--fg-06)"
              strokeWidth={1}
            />
          );
        })}

        {/* Axis lines */}
        {stats.map((_, i) => {
          const [x, y] = radarPoint(cx, cy, maxR, i, n);
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--fg-06)" strokeWidth={1} />;
        })}

        {/* Ghost polygon */}
        <polygon
          points={ghostPath}
          fill="var(--fg-03)"
          stroke="var(--fg-12)"
          strokeWidth={1}
          strokeDasharray="4 3"
        />

        {/* Current polygon */}
        <polygon
          points={currentPath}
          fill={`rgb(${classColor} / 0.12)`}
          stroke={`rgb(${classColor} / 0.7)`}
          strokeWidth={2}
          style={{ transition: "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
        />

        {/* Vertex dots + labels */}
        {stats.map((stat, i) => {
          const [lx, ly] = radarPoint(cx, cy, maxR + 18, i, n);
          const [dx, dy] = currentPoints[i];
          return (
            <g key={stat.label}>
              <circle
                cx={dx}
                cy={dy}
                r={3}
                fill={`rgb(${stat.color})`}
                style={{ transition: "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
              />
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="central"
                fill={`rgb(${stat.color} / 0.7)`}
                fontSize={9}
                fontFamily="monospace"
                fontWeight="bold"
              >
                {stat.label}
              </text>
              <text
                x={lx}
                y={ly + 11}
                textAnchor="middle"
                dominantBaseline="central"
                fill="var(--fg-35)"
                fontSize={8}
                fontFamily="monospace"
              >
                {stat.value}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-0 right-2 flex items-center gap-3">
        <div className="flex items-center gap-1">
          <div className="w-3 h-[2px] rounded" style={{ background: `rgb(${classColor} / 0.7)` }} />
          <span className="text-[8px] font-mono text-[var(--fg-30)]">NOW</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-[2px] rounded border-t border-dashed border-[var(--fg-20)]" />
          <span className="text-[8px] font-mono text-[var(--fg-30)]">PREV</span>
        </div>
      </div>
    </div>
  );
}

export default function CharacterPage() {
  const { user } = useAuth();
  const { sex: userSex } = useSex();
  const { enabledKeys } = useModules();
  const weightUnit = useUnits();
  const [stats, setStats] = useState<{
    totalXp: number;
    totalWorkouts: number;
    totalVolume: number;
    streak: number;
    bestStreak: number;
    achievementCount: number;
    avgSetsPerWorkout: number;
    prCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const [{ data: userStats }, { count: prCount }, { count: setCount }] = await Promise.all([
        supabase
          .from("user_stats")
          .select("total_xp, total_workouts, total_volume, current_streak, best_streak, achievement_count")
          .eq("user_id", user!.id)
          .eq("sex", userSex)
          .maybeSingle(),
        supabase
          .from("exercise_set_logs")
          .select("id, workout_sessions!inner()", { count: "exact", head: true })
          .eq("workout_sessions.user_id", user!.id)
          .eq("workout_sessions.status", "completed")
          .eq("workout_sessions.sex", userSex)
          .eq("is_pr", true),
        supabase
          .from("exercise_set_logs")
          .select("id, workout_sessions!inner()", { count: "exact", head: true })
          .eq("workout_sessions.user_id", user!.id)
          .eq("workout_sessions.status", "completed")
          .eq("workout_sessions.sex", userSex),
      ]);

      const totalWorkouts = userStats?.total_workouts ?? 0;

      setStats({
        totalXp: userStats?.total_xp ?? 0,
        totalWorkouts,
        totalVolume: userStats?.total_volume ?? 0,
        streak: userStats?.current_streak ?? 0,
        bestStreak: userStats?.best_streak ?? 0,
        achievementCount: userStats?.achievement_count ?? 0,
        avgSetsPerWorkout: totalWorkouts > 0 ? Math.round((setCount ?? 0) / totalWorkouts) : 0,
        prCount: prCount ?? 0,
      });
      setLoading(false);
    }
    load();
  }, [user, userSex]);

  const classification = useMemo(
    () => stats ? classifyUser(stats) : null,
    [stats],
  );

  const levelInfo = stats ? computeLevel(stats.totalXp) : null;
  const rank = levelInfo ? getRank(levelInfo.level) : null;
  const nextRank = levelInfo ? getNextRank(levelInfo.level) : null;

  return (
    <main className="relative min-h-screen w-full bg-[var(--bg-primary)] text-[var(--text-primary)] p-4 md:p-10 pb-24 md:pb-10 overflow-x-hidden">
      <div className="relative z-10 w-full max-w-3xl mx-auto space-y-4">
        <SwipeNav sections={getSocialSections(enabledKeys)} />

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-orange-400/30 border-t-orange-400 rounded-full animate-spin" />
          </div>
        ) : stats && classification && levelInfo && rank ? (
          <>
            {/* Character Card */}
            <div className="relative mb-1">
              <OnboardingTooltip id="character-intro" message="Class, radar, and titles evolve as you train" position="bottom" delay={1200} />
            </div>
            <div className="glass-card p-6 relative overflow-hidden">
              <div className="absolute inset-0 pointer-events-none" style={{
                background: `radial-gradient(ellipse at top, rgb(${classification.fitnessClass.color} / 0.08) 0%, transparent 60%)`,
              }} />

              <div className="relative">
                {/* Class badge */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{
                    background: `rgb(${classification.fitnessClass.color} / 0.15)`,
                    border: `1px solid rgb(${classification.fitnessClass.color} / 0.3)`,
                    boxShadow: `0 0 24px -4px rgb(${classification.fitnessClass.color} / 0.3)`,
                  }}>
                    <classification.fitnessClass.icon size={28} style={{ color: `rgb(${classification.fitnessClass.color})` }} />
                  </div>
                  <div>
                    <p className="text-[9px] font-mono tracking-widest text-[var(--fg-25)]">CLASS</p>
                    <p className="text-xl font-bold font-display" style={{ color: `rgb(${classification.fitnessClass.color})` }}>
                      {classification.fitnessClass.name}
                    </p>
                    <p className="text-[10px] font-mono text-[var(--fg-30)]">{classification.fitnessClass.description}</p>
                  </div>
                </div>

                {/* Power level + rank */}
                <div className="flex items-center gap-4 mb-5">
                  <div className="flex-1">
                    <p className="text-[9px] font-mono text-[var(--fg-25)] mb-1">POWER LEVEL</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-3xl font-bold font-display" style={{ color: `rgb(${classification.fitnessClass.color})` }}>
                        {classification.powerLevel}
                      </p>
                      <p className="text-sm font-mono text-[var(--fg-20)]">/ 100</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-mono text-[var(--fg-25)] mb-1">RANK</p>
                    <p className={`text-sm font-bold font-mono ${rank.color}`}>{rank.name}</p>
                    <p className="text-[10px] font-mono text-[var(--fg-25)]">Level {levelInfo.level}</p>
                  </div>
                </div>

                {/* XP bar */}
                <div className="mb-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[9px] font-mono text-[var(--fg-25)]">XP</p>
                    <p className="text-[9px] font-mono text-[var(--fg-25)]">
                      {stats.totalXp.toLocaleString()} total
                      {nextRank && ` · ${nextRank.name} at Lv ${nextRank.minLevel}`}
                    </p>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--fg-06)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${levelInfo.progress * 100}%`,
                        background: `linear-gradient(90deg, rgb(${classification.fitnessClass.color} / 0.6), rgb(${classification.fitnessClass.color}))`,
                      }}
                    />
                  </div>
                  <p className="text-[8px] font-mono text-[var(--fg-20)] mt-0.5">
                    {levelInfo.xpIntoCurrentLevel} / {levelInfo.xpNeededForNext} XP to level {levelInfo.level + 1}
                  </p>
                </div>
              </div>
            </div>

            {/* Radar Chart */}
            <div className="glass-card p-4">
              <p className="section-label mb-2">ATTRIBUTES</p>
              <RadarChart
                stats={classification.statBars}
                classColor={classification.fitnessClass.color}
              />
            </div>

            {/* Skill Tree */}
            <SkillTree stats={stats} classColor={classification.fitnessClass.color} />

            {/* Titles & Prestige */}
            <TitlesCard stats={stats} classColor={classification.fitnessClass.color} />

            {/* Weakness Detector */}
            <WeaknessCard statBars={classification.statBars} />

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-2">
              <div className="glass-card p-3 text-center">
                <Flame size={14} className="text-orange-400/50 mx-auto mb-1" />
                <p className="text-lg font-bold font-display text-[var(--fg-80)]">{stats.streak}</p>
                <p className="text-[8px] font-mono text-[var(--fg-25)]">STREAK</p>
              </div>
              <div className="glass-card p-3 text-center">
                <Target size={14} className="text-emerald-400/50 mx-auto mb-1" />
                <p className="text-lg font-bold font-display text-[var(--fg-80)]">{stats.totalWorkouts}</p>
                <p className="text-[8px] font-mono text-[var(--fg-25)]">WORKOUTS</p>
              </div>
              <div className="glass-card p-3 text-center">
                <Award size={14} className="text-cyan-400/50 mx-auto mb-1" />
                <p className="text-lg font-bold font-display text-[var(--fg-80)]">{stats.achievementCount}</p>
                <p className="text-[8px] font-mono text-[var(--fg-25)]">ACHIEVEMENTS</p>
              </div>
              <div className="glass-card p-3 text-center">
                <TrendingUp size={14} className="text-violet-400/50 mx-auto mb-1" />
                <p className="text-lg font-bold font-display text-[var(--fg-80)]">{stats.prCount}</p>
                <p className="text-[8px] font-mono text-[var(--fg-25)]">PRs SET</p>
              </div>
              <div className="glass-card p-3 text-center">
                <Swords size={14} className="text-red-400/50 mx-auto mb-1" />
                <p className="text-lg font-bold font-display text-[var(--fg-80)]">{(kgToUnit(stats.totalVolume, weightUnit) / 1000).toFixed(0)}k</p>
                <p className="text-[8px] font-mono text-[var(--fg-25)]">VOLUME {weightUnit.toUpperCase()}</p>
              </div>
              <div className="glass-card p-3 text-center">
                <Crown size={14} className="text-yellow-400/50 mx-auto mb-1" />
                <p className="text-lg font-bold font-display text-[var(--fg-80)]">{stats.bestStreak}</p>
                <p className="text-[8px] font-mono text-[var(--fg-25)]">BEST STREAK</p>
              </div>
            </div>
          </>
        ) : (
          <div className="glass-card p-8 text-center">
            <Crown size={40} className="text-orange-400/20 mx-auto mb-3" />
            <p className="text-sm text-[var(--fg-40)] mb-1">No character data yet</p>
            <p className="text-[10px] font-mono text-[var(--fg-20)]">Complete your first workout to unlock your character sheet</p>
          </div>
        )}
      </div>
    </main>
  );
}
