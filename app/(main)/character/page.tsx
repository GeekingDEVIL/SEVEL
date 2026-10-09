"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Crown, Sword, Swords, Shield, ShieldCheck, Zap, Heart, Flame, Target,
  TrendingUp, Award, Star, Sparkles, ChevronRight, Crosshair, Wind,
  Footprints, Dumbbell, Activity, Lock, AlertTriangle, Axe, Hammer,
  Compass, Mountain, Eye, Anchor, Skull, Feather, HandMetal, Tornado,
  Trophy, Check, Gift, Calendar,
} from "lucide-react";
import SwipeNav from "../../components/ui/swipe-nav";
import { getSocialSections } from "../../lib/navPills";
import { useModules } from "../../lib/useModules";
import { useAuth } from "../../lib/AuthProvider";
import { useSex } from "../../lib/useSex";
import { useUnits } from "../../lib/useUnits";
import { kgToUnit } from "../../lib/units";
import {
  getRankForLevel, getNextRankDef, computeCharacterLevel,
  DOMAIN_KEYS, DOMAIN_COLORS,
  assignArchetype, detectSpecialization,
  type DomainKey, type DomainScores,
} from "../../lib/characterEngine";
import {
  fetchCharacterData, persistDomainScores, saveDomainSnapshot,
  getOrCreateWeeklyChallenges, getOrCreateMonthlyChallenges, claimChallengeReward,
  type CharacterData, type ActiveChallenge,
} from "../../lib/characterData";

const DOMAIN_ICONS: Record<DomainKey, typeof Dumbbell> = {
  force: Dumbbell,
  form: Crosshair,
  flow: Wind,
  fight: Swords,
  function: Activity,
  fortitude: Flame,
};

const DOMAIN_READABLE: Record<DomainKey, string> = {
  force: "Force",
  form: "Form",
  flow: "Flow",
  fight: "Fight",
  function: "Function",
  fortitude: "Fortitude",
};

const DOMAIN_WHAT: Record<DomainKey, string> = {
  force: "Strength & lifting power",
  form: "Movement quality & control",
  flow: "Cardio & endurance",
  fight: "Combat & martial arts",
  function: "Athletic versatility",
  fortitude: "Consistency & discipline",
};

function radarPoint(cx: number, cy: number, r: number, i: number, n: number): [number, number] {
  const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
}

function DomainRadarChart({ scores, ghostScores }: {
  scores: DomainScores;
  ghostScores: DomainScores | null;
}) {
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(t);
  }, []);

  const cx = 160, cy = 160, maxR = 100;
  const n = DOMAIN_KEYS.length;
  const rings = [0.25, 0.5, 0.75, 1];

  const currentPoints = DOMAIN_KEYS.map((key, i) => {
    const val = animate ? scores[key] : 0;
    const r = (val / 100) * maxR;
    return radarPoint(cx, cy, Math.max(r, 4), i, n);
  });

  const ghostPoints = ghostScores
    ? DOMAIN_KEYS.map((key, i) => {
        const r = (ghostScores[key] / 100) * maxR;
        return radarPoint(cx, cy, Math.max(r, 4), i, n);
      })
    : null;

  const currentPath = currentPoints.map(p => `${p[0]},${p[1]}`).join(" ");
  const ghostPath = ghostPoints?.map(p => `${p[0]},${p[1]}`).join(" ");

  return (
    <div className="relative flex justify-center">
      <svg viewBox="0 0 320 320" className="w-full max-w-[300px]">
        {rings.map(pct => {
          const pts = Array.from({ length: n }, (_, i) => radarPoint(cx, cy, maxR * pct, i, n));
          return (
            <polygon
              key={pct}
              points={pts.map(p => `${p[0]},${p[1]}`).join(" ")}
              fill="none"
              stroke="var(--fg-06)"
              strokeWidth={1}
            />
          );
        })}

        {DOMAIN_KEYS.map((_, i) => {
          const [x, y] = radarPoint(cx, cy, maxR, i, n);
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--fg-06)" strokeWidth={1} />;
        })}

        {ghostPath && (
          <polygon
            points={ghostPath}
            fill="var(--fg-03)"
            stroke="var(--fg-12)"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
        )}

        <polygon
          points={currentPath}
          fill="rgb(var(--accent-rgb) / 0.12)"
          stroke="rgb(var(--accent-rgb) / 0.7)"
          strokeWidth={2}
          style={{ transition: "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
        />

        {DOMAIN_KEYS.map((key, i) => {
          const [lx, ly] = radarPoint(cx, cy, maxR + 28, i, n);
          const [dx, dy] = currentPoints[i];
          const color = DOMAIN_COLORS[key];
          return (
            <g key={key}>
              <circle
                cx={dx}
                cy={dy}
                r={3}
                fill={`rgb(${color})`}
                style={{ transition: "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
              />
              <text
                x={lx}
                y={ly - 5}
                textAnchor="middle"
                dominantBaseline="central"
                fill={`rgb(${color} / 0.9)`}
                fontSize={9}
                fontFamily="monospace"
                fontWeight="bold"
              >
                {DOMAIN_READABLE[key]}
              </text>
              <text
                x={lx}
                y={ly + 7}
                textAnchor="middle"
                dominantBaseline="central"
                fill="var(--fg-40)"
                fontSize={10}
                fontFamily="monospace"
                fontWeight="bold"
              >
                {Math.round(scores[key])}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="absolute bottom-0 right-2 flex items-center gap-3">
        <div className="flex items-center gap-1">
          <div className="w-3 h-[2px] rounded bg-[rgb(var(--accent-rgb)/0.7)]" />
          <span className="text-[8px] font-mono text-[var(--fg-30)]">NOW</span>
        </div>
        {ghostScores && (
          <div className="flex items-center gap-1">
            <div className="w-3 h-[2px] rounded border-t border-dashed border-[var(--fg-20)]" />
            <span className="text-[8px] font-mono text-[var(--fg-30)]">PREV</span>
          </div>
        )}
      </div>
    </div>
  );
}

type TitleDef = { key: string; label: string; check: (s: Stats) => boolean; color: string };
const TITLE_DEFS: TitleDef[] = [
  { key: "first_steps",     label: "First Steps",     check: s => s.totalWorkouts >= 1,   color: "var(--fg-50)" },
  { key: "iron_pumper",     label: "Iron Pumper",      check: s => s.totalWorkouts >= 10,  color: "var(--fg-50)" },
  { key: "streak_starter",  label: "Streak Starter",   check: s => s.bestStreak >= 3,      color: "var(--fg-50)" },
  { key: "gym_regular",     label: "Gym Regular",      check: s => s.totalWorkouts >= 25,  color: "rgb(239 68 68)" },
  { key: "volume_dealer",   label: "Volume Dealer",    check: s => s.totalVolume >= 50000,  color: "rgb(59 130 246)" },
  { key: "week_warrior",    label: "Week Warrior",     check: s => s.bestStreak >= 7,       color: "rgb(139 92 246)" },
  { key: "steel_forged",    label: "Steel Forged",     check: s => s.totalWorkouts >= 50,   color: "rgb(239 68 68)" },
  { key: "record_breaker",  label: "Record Breaker",   check: s => s.prCount >= 1,          color: "rgb(234 179 8)" },
  { key: "century_club",    label: "Century Club",     check: s => s.totalWorkouts >= 100,  color: "rgb(234 179 8)" },
  { key: "pr_machine",      label: "PR Machine",       check: s => s.prCount >= 10,         color: "rgb(234 179 8)" },
  { key: "iron_will",       label: "Iron Will",        check: s => s.bestStreak >= 30,      color: "rgb(249 115 22)" },
  { key: "variety_king",    label: "Variety King",     check: s => s.exerciseVariety >= 25,  color: "rgb(16 185 129)" },
];

type SkillNode = { label: string; unlocked: boolean };
function computeSkillTree(s: Stats): { strength: SkillNode[]; discipline: SkillNode[]; mastery: SkillNode[] } {
  return {
    strength: [
      { label: "Lift 1",      unlocked: s.totalWorkouts >= 1 },
      { label: "Lift 10",     unlocked: s.totalWorkouts >= 10 },
      { label: "Lift 25",     unlocked: s.totalWorkouts >= 25 },
      { label: "Lift 50",     unlocked: s.totalWorkouts >= 50 },
    ],
    discipline: [
      { label: "Streak 3",    unlocked: s.bestStreak >= 3 },
      { label: "Streak 7",    unlocked: s.bestStreak >= 7 },
      { label: "Streak 14",   unlocked: s.bestStreak >= 14 },
      { label: "Streak 30",   unlocked: s.bestStreak >= 30 },
    ],
    mastery: [
      { label: "5 types",     unlocked: s.exerciseVariety >= 5 },
      { label: "10 types",    unlocked: s.exerciseVariety >= 10 },
      { label: "25 types",    unlocked: s.exerciseVariety >= 25 },
      { label: "50 types",    unlocked: s.exerciseVariety >= 50 },
    ],
  };
}

const TREE_COLORS = {
  strength:   { active: "rgb(239 68 68)",   border: "rgb(239 68 68 / 0.4)", bg: "rgb(239 68 68 / 0.1)" },
  discipline: { active: "rgb(16 185 129)",  border: "rgb(16 185 129 / 0.4)", bg: "rgb(16 185 129 / 0.1)" },
  mastery:    { active: "rgb(139 92 246)",  border: "rgb(139 92 246 / 0.4)", bg: "rgb(139 92 246 / 0.1)" },
};

type Stats = CharacterData;

export default function CharacterPage() {
  const { user } = useAuth();
  const { sex: userSex } = useSex();
  const { enabledKeys } = useModules();
  const weightUnit = useUnits();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [domainScores, setDomainScores] = useState<DomainScores | null>(null);
  const [ghostScores, setGhostScores] = useState<DomainScores | null>(null);
  const [challenges, setChallenges] = useState<ActiveChallenge[]>([]);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const data = await fetchCharacterData(user!.id, userSex);
      if (!data) { setLoading(false); return; }

      setStats(data);
      setDomainScores(data.domainScores);
      setGhostScores(data.prevSnapshot);

      const arch = assignArchetype(data.domainScores);
      const spec = detectSpecialization(arch, null);

      persistDomainScores(user!.id, userSex, data.domainScores, arch.name, spec?.name ?? null);
      saveDomainSnapshot(user!.id, userSex, data.domainScores);

      const [weekly, monthly] = await Promise.all([
        getOrCreateWeeklyChallenges(user!.id, userSex, arch.name).catch(() => [] as ActiveChallenge[]),
        getOrCreateMonthlyChallenges(user!.id, userSex, arch.name).catch(() => [] as ActiveChallenge[]),
      ]);
      setChallenges([...weekly, ...monthly]);

      setLoading(false);
    }
    load();
  }, [user, userSex]);

  async function handleClaimReward(ch: ActiveChallenge) {
    if (!user || claimingId) return;
    setClaimingId(ch.id);
    const ok = await claimChallengeReward(user.id, userSex, ch.id, ch.xpReward, ch.title);
    if (ok) {
      setChallenges(prev => prev.map(c => c.id === ch.id ? { ...c, rewardClaimed: true } : c));
    }
    setClaimingId(null);
  }

  const levelInfo = useMemo(
    () => stats ? computeCharacterLevel(stats.totalXp, stats.reforgeCount) : null,
    [stats],
  );
  const rank = useMemo(() => levelInfo ? getRankForLevel(levelInfo.level) : null, [levelInfo]);
  const nextRank = useMemo(() => levelInfo ? getNextRankDef(levelInfo.level) : null, [levelInfo]);

  const archetype = useMemo(
    () => domainScores ? assignArchetype(domainScores) : null,
    [domainScores],
  );
  const specialization = useMemo(
    () => archetype ? detectSpecialization(archetype, null) : null,
    [archetype],
  );

  const powerLevel = useMemo(() => {
    if (!domainScores) return 0;
    const avg = DOMAIN_KEYS.reduce((s, k) => s + domainScores[k], 0) / DOMAIN_KEYS.length;
    return Math.round(avg);
  }, [domainScores]);

  const earnedTitles = useMemo(() => {
    if (!stats) return [];
    return TITLE_DEFS.filter(t => t.check(stats));
  }, [stats]);

  const nextTitle = useMemo(() => {
    if (!stats) return null;
    return TITLE_DEFS.find(t => !t.check(stats)) ?? null;
  }, [stats]);

  const skillTree = useMemo(() => stats ? computeSkillTree(stats) : null, [stats]);

  const weakness = useMemo(() => {
    if (!domainScores) return null;
    let min = Infinity;
    let minKey: DomainKey = "force";
    for (const k of DOMAIN_KEYS) {
      if (domainScores[k] < min) { min = domainScores[k]; minKey = k; }
    }
    return { key: minKey, value: Math.round(min) };
  }, [domainScores]);

  const WEAKNESS_TIPS: Record<DomainKey, string> = {
    force: "Add heavier compound lifts — progressive overload is key",
    form: "Focus on form checks and mobility work",
    flow: "Add cardio or mobility sessions to your routine",
    fight: "Try martial arts or combat-style training",
    function: "Mix in more exercise variety and bodyweight work",
    fortitude: "Build consistency — show up even on low-energy days",
  };

  type ClassInfo = { name: string; desc: string; icon: typeof Swords; color: string };
  const CLASS_MAP: Record<string, ClassInfo> = {
    Juggernaut:  { name: "Warrior",      desc: "Strength-focused, heavy compound lifts",  icon: Swords,      color: "#EF4444" },
    Sentinel:    { name: "Paladin",      desc: "Precision and control, perfect technique", icon: ShieldCheck, color: "#F59E0B" },
    Strider:     { name: "Ranger",       desc: "Endurance machine, cardio and mobility",   icon: Compass,     color: "#22C55E" },
    Striker:     { name: "Gladiator",    desc: "Combat specialist, explosive power",       icon: Axe,         color: "#F97316" },
    Phantom:     { name: "Rogue",        desc: "Versatile athlete, adaptable training",    icon: Eye,         color: "#A855F7" },
    Warden:      { name: "Knight",       desc: "Unbreakable consistency, iron discipline", icon: Shield,      color: "#6366F1" },
    Titan:       { name: "Titan",        desc: "Power with perfect technique",             icon: Mountain,    color: "#EAB308" },
    Colossus:    { name: "Tank",         desc: "Strength that never fades",                icon: Anchor,      color: "#64748B" },
    Berserker:   { name: "Berserker",    desc: "Devastating striking power",               icon: Flame,       color: "#DC2626" },
    Golem:       { name: "Guardian",     desc: "Functional raw strength",                  icon: Shield,      color: "#059669" },
    Monolith:    { name: "Warlord",      desc: "Relentless powerhouse",                    icon: Crown,       color: "#991B1B" },
    Monk:        { name: "Monk",         desc: "Graceful endurance",                       icon: HandMetal,   color: "#14B8A6" },
    Bladedancer: { name: "Bladedancer",  desc: "Technical combat artist",                  icon: Sword,       color: "#C084FC" },
    Artisan:     { name: "Sage",         desc: "Movement perfectionist",                   icon: Sparkles,    color: "#818CF8" },
    Stoic:       { name: "Templar",      desc: "Disciplined precision",                    icon: ShieldCheck, color: "#D97706" },
    Tempest:     { name: "Tempest",      desc: "Tireless fighter",                         icon: Tornado,     color: "#0EA5E9" },
    Nomad:       { name: "Nomad",        desc: "Enduring versatility",                     icon: Footprints,  color: "#D4A574" },
    Pilgrim:     { name: "Crusader",     desc: "The long-distance grinder",                icon: Compass,     color: "#FBBF24" },
    Ronin:       { name: "Ronin",        desc: "Adaptable warrior",                        icon: Sword,       color: "#78716C" },
    Spartan:     { name: "Spartan",      desc: "Relentless combatant",                     icon: Swords,      color: "#B91C1C" },
    Centurion:   { name: "Centurion",    desc: "Versatile and unyielding",                 icon: Crown,       color: "#7C3AED" },
    Ascendant:   { name: "Ascendant",    desc: "Balanced across all domains",              icon: Star,        color: "#F59E0B" },
  };

  const classInfo = useMemo<ClassInfo>(() => {
    if (!archetype) return { name: "Warrior", desc: "Begin your training journey", icon: Swords, color: "#EF4444" };
    return CLASS_MAP[archetype.name] ?? { name: archetype.name, desc: archetype.identity, icon: Swords, color: "#EF4444" };
  }, [archetype]);

  return (
    <main className="relative min-h-screen w-full bg-[var(--bg-primary)] text-[var(--text-primary)] p-4 md:p-10 pb-24 md:pb-10 overflow-x-hidden">
      <div className="relative z-10 w-full max-w-3xl mx-auto space-y-4">
        <SwipeNav sections={getSocialSections(enabledKeys)} />

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[rgb(var(--accent-rgb)/0.3)] border-t-[rgb(var(--accent-rgb))] rounded-full animate-spin" />
          </div>
        ) : stats && levelInfo && rank ? (
          <>
            {/* ── Hero: Class + Power Level + Rank ── */}
            <div className="glass-card p-6 relative overflow-hidden">
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: `radial-gradient(ellipse at top, ${classInfo.color}15 0%, transparent 60%)` }}
              />
              <div className="relative">
                {/* Class identity */}
                <div className="flex items-center gap-4 mb-5">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                    style={{
                      background: `${classInfo.color}15`,
                      border: `2px solid ${classInfo.color}35`,
                    }}
                  >
                    <classInfo.icon size={26} style={{ color: classInfo.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-mono tracking-widest text-[var(--fg-25)] mb-0.5">CLASS</p>
                    <p className="text-xl font-bold" style={{ color: classInfo.color }}>{classInfo.name}</p>
                    <p className="text-[10px] font-mono text-[var(--fg-35)]">{classInfo.desc}</p>
                  </div>
                </div>

                {/* Power Level + Rank row */}
                <div className="flex items-end justify-between mb-4">
                  <div>
                    <p className="text-[9px] font-mono tracking-widest text-[var(--fg-25)] mb-1">POWER LEVEL</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold font-display" style={{ color: classInfo.color }}>{powerLevel}</span>
                      <span className="text-lg font-mono text-[var(--fg-20)]">/ 100</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-mono tracking-widest text-[var(--fg-25)] mb-1">RANK</p>
                    <p className="text-xl font-bold" style={{ color: rank.color }}>{rank.name.toUpperCase()}</p>
                    <p className="text-[10px] font-mono text-[var(--fg-35)]">Level {levelInfo.level}</p>
                  </div>
                </div>

                {/* XP Bar */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[9px] font-mono text-[var(--fg-25)]">XP</p>
                    <p className="text-[9px] font-mono text-[var(--fg-25)]">
                      {stats.totalXp.toLocaleString()} total
                      {nextRank && ` · ${nextRank.name.toUpperCase()} at Lv ${nextRank.minLevel}`}
                    </p>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--fg-06)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${levelInfo.progress * 100}%`,
                        background: `linear-gradient(90deg, ${rank.color}99, ${rank.color})`,
                      }}
                    />
                  </div>
                  <p className="text-[8px] font-mono text-[var(--fg-20)] mt-0.5">
                    {levelInfo.isMaxLevel
                      ? "MAX LEVEL — Ready to Reforge"
                      : `${levelInfo.xpIntoCurrentLevel.toLocaleString()} / ${levelInfo.xpNeededForNext.toLocaleString()} XP to level ${levelInfo.level + 1}`}
                  </p>
                </div>
              </div>
            </div>

            {/* ── Attributes Radar ── */}
            {domainScores && (
              <div className="glass-card p-4">
                <p className="section-label mb-1">ATTRIBUTES</p>
                <DomainRadarChart scores={domainScores} ghostScores={ghostScores} />
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-[var(--fg-04)]">
                  {DOMAIN_KEYS.map(key => {
                    const DIcon = DOMAIN_ICONS[key];
                    const color = DOMAIN_COLORS[key];
                    return (
                      <div key={key} className="flex items-center gap-2">
                        <DIcon size={11} style={{ color: `rgb(${color})` }} className="shrink-0" />
                        <span className="text-[9px] font-mono text-[var(--fg-50)]">
                          <span style={{ color: `rgb(${color})` }} className="font-bold">{DOMAIN_READABLE[key]}</span>
                          {" — "}{DOMAIN_WHAT[key]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Active Challenges ── */}
            {challenges.length > 0 && (
              <div className="glass-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Trophy size={14} className="text-[rgb(var(--accent-rgb))]" />
                    <p className="section-label">ACTIVE CHALLENGES</p>
                  </div>
                  <span className="text-[9px] font-mono text-[var(--fg-20)]">
                    {challenges.filter(c => c.completed).length}/{challenges.length} DONE
                  </span>
                </div>
                <div className="space-y-3">
                  {challenges.map(ch => {
                    const pct = Math.min(100, Math.round((ch.current / ch.target) * 100));
                    const isMonthly = ch.challengeType === "monthly";
                    const barColor = ch.completed
                      ? "rgb(16 185 129)"
                      : isMonthly
                        ? "rgb(234 179 8)"
                        : "rgb(var(--accent-rgb))";
                    return (
                      <div
                        key={ch.id}
                        className="p-3 rounded-xl border"
                        style={{
                          borderColor: ch.completed ? "rgb(16 185 129 / 0.2)" : "var(--fg-06)",
                          background: ch.completed ? "rgb(16 185 129 / 0.04)" : "var(--fg-02)",
                        }}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            {isMonthly && (
                              <span className="text-[7px] font-mono font-bold px-1.5 py-0.5 rounded bg-[rgb(234_179_8/0.12)] text-[rgb(234_179_8)]">
                                MONTHLY
                              </span>
                            )}
                            <span className="text-[11px] font-mono font-bold text-[var(--fg-70)] truncate">
                              {ch.title}
                            </span>
                          </div>
                          {ch.completed && !ch.rewardClaimed ? (
                            <button
                              onClick={() => handleClaimReward(ch)}
                              disabled={claimingId === ch.id}
                              className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold transition-colors"
                              style={{
                                background: "rgb(var(--accent-rgb) / 0.15)",
                                color: "rgb(var(--accent-rgb))",
                              }}
                            >
                              <Gift size={10} />
                              {claimingId === ch.id ? "..." : `+${ch.xpReward} XP`}
                            </button>
                          ) : ch.completed && ch.rewardClaimed ? (
                            <span className="flex items-center gap-1 text-[9px] font-mono text-[rgb(16_185_129)]">
                              <Check size={10} /> CLAIMED
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono text-[var(--fg-25)]">
                              +{ch.xpReward} XP
                            </span>
                          )}
                        </div>
                        <p className="text-[9px] font-mono text-[var(--fg-30)] mb-2">
                          {ch.description}
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-[var(--fg-06)] overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${pct}%`,
                                background: barColor,
                              }}
                            />
                          </div>
                          <span className="text-[9px] font-mono text-[var(--fg-35)] shrink-0">
                            {ch.current}/{ch.target}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-[var(--fg-04)]">
                  <Calendar size={10} className="text-[var(--fg-20)]" />
                  <span className="text-[8px] font-mono text-[var(--fg-20)]">
                    Challenges reset weekly (Mon) · Super challenge resets monthly
                  </span>
                </div>
              </div>
            )}

            {/* ── Skill Tree ── */}
            {skillTree && (
              <div className="glass-card p-5">
                <p className="section-label mb-4">SKILL TREE</p>
                <div className="grid grid-cols-3 gap-4">
                  {(["strength", "discipline", "mastery"] as const).map(path => {
                    const nodes = skillTree[path];
                    const colors = TREE_COLORS[path];
                    return (
                      <div key={path} className="flex flex-col items-center">
                        <p className="text-[9px] font-mono font-bold tracking-wider mb-3" style={{ color: colors.active }}>
                          {path.toUpperCase()}
                        </p>
                        <div className="flex flex-col items-center gap-0">
                          {nodes.map((node, i) => (
                            <div key={i} className="flex flex-col items-center">
                              {i > 0 && (
                                <div
                                  className="w-[1px] h-5"
                                  style={{
                                    background: node.unlocked ? colors.border : "var(--fg-08)",
                                    ...(node.unlocked ? {} : { borderLeft: "1px dashed var(--fg-10)", width: 0 }),
                                  }}
                                />
                              )}
                              <div
                                className="w-10 h-10 rounded-full flex items-center justify-center border-2"
                                style={{
                                  borderColor: node.unlocked ? colors.border : "var(--fg-08)",
                                  background: node.unlocked ? colors.bg : "var(--fg-02)",
                                }}
                              >
                                {node.unlocked ? (
                                  <span className="text-sm" style={{ color: colors.active }}>&#10003;</span>
                                ) : (
                                  <Lock size={12} className="text-[var(--fg-15)]" />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Titles ── */}
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="section-label">TITLES</p>
                <div className="flex items-center gap-1.5">
                  <Star size={12} className="text-[var(--fg-25)]" />
                  <span className="text-[10px] font-mono text-[var(--fg-30)]">
                    PRESTIGE {earnedTitles.length}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {earnedTitles.map(t => (
                  <span
                    key={t.key}
                    className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg border"
                    style={{ borderColor: `${t.color}40`, color: t.color }}
                  >
                    {t.label}
                  </span>
                ))}
                {earnedTitles.length === 0 && (
                  <span className="text-[10px] font-mono text-[var(--fg-20)]">Complete workouts to earn titles</span>
                )}
              </div>
              {nextTitle && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[var(--fg-02)] border border-[var(--fg-04)]">
                  <Sparkles size={14} className="text-[var(--fg-20)] shrink-0" />
                  <div>
                    <p className="text-[10px] font-mono text-[var(--fg-40)]">
                      Next: <span className="font-bold text-[var(--fg-60)]">{nextTitle.label}</span>
                    </p>
                    <p className="text-[8px] font-mono text-[var(--fg-20)]">
                      {nextTitle.key === "record_breaker" ? "Set your first PR" :
                       nextTitle.key === "iron_pumper" ? "Complete 10 workouts" :
                       nextTitle.key === "streak_starter" ? "Maintain a 3-day streak" :
                       nextTitle.key === "gym_regular" ? "Complete 25 workouts" :
                       nextTitle.key === "volume_dealer" ? "Lift 50,000 kg total" :
                       nextTitle.key === "week_warrior" ? "Maintain a 7-day streak" :
                       nextTitle.key === "steel_forged" ? "Complete 50 workouts" :
                       nextTitle.key === "century_club" ? "Complete 100 workouts" :
                       nextTitle.key === "pr_machine" ? "Set 10 personal records" :
                       nextTitle.key === "iron_will" ? "Maintain a 30-day streak" :
                       nextTitle.key === "variety_king" ? "Log 25 different exercises" :
                       "Keep training"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* ── Weakness Detected ── */}
            {weakness && (
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={14} className="text-[rgb(var(--accent-rgb))]" />
                  <p className="section-label">WEAKNESS DETECTED</p>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background: `rgb(${DOMAIN_COLORS[weakness.key]} / 0.1)`,
                      border: `1px solid rgb(${DOMAIN_COLORS[weakness.key]} / 0.25)`,
                    }}
                  >
                    <span className="text-[10px] font-mono font-bold" style={{ color: `rgb(${DOMAIN_COLORS[weakness.key]})` }}>
                      {DOMAIN_READABLE[weakness.key]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-mono text-[var(--fg-50)]">
                      {DOMAIN_READABLE[weakness.key]} is your weakest at <span className="font-bold text-[var(--fg-70)]">{weakness.value}</span>
                    </p>
                    <div className="h-1 rounded-full bg-[var(--fg-06)] overflow-hidden mt-1.5 mb-1">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${weakness.value}%`, background: `rgb(${DOMAIN_COLORS[weakness.key]} / 0.5)` }}
                      />
                    </div>
                    <p className="text-[9px] font-mono text-[var(--fg-25)]">{WEAKNESS_TIPS[weakness.key]}</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── Stats 3x2 Grid ── */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: Flame, value: stats.streak, label: "STREAK", color: "249 115 22" },
                { icon: Target, value: stats.totalWorkouts, label: "WORKOUTS", color: "16 185 129" },
                { icon: Award, value: stats.achievementCount, label: "ACHIEVEMENTS", color: "59 130 246" },
                { icon: TrendingUp, value: stats.prCount, label: "PRs SET", color: "139 92 246" },
                {
                  icon: Dumbbell,
                  value: `${(kgToUnit(stats.totalVolume, weightUnit) / 1000).toFixed(0)}k`,
                  label: `VOLUME ${weightUnit.toUpperCase()}`,
                  color: "236 72 153",
                },
                { icon: Zap, value: stats.bestStreak, label: "BEST STREAK", color: "234 179 8" },
              ].map(({ icon: Icon, value, label, color }) => (
                <div key={label} className="glass-card p-3 text-center">
                  <Icon size={14} style={{ color: `rgb(${color} / 0.5)` }} className="mx-auto mb-1" />
                  <p className="text-xl font-bold font-display text-[var(--fg-80)]">{value}</p>
                  <p className="text-[7px] font-mono text-[var(--fg-25)]">{label}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="glass-card p-8 text-center">
            <Shield size={40} className="text-[var(--fg-10)] mx-auto mb-3" />
            <p className="text-sm text-[var(--fg-40)] mb-1">No character data yet</p>
            <p className="text-[10px] font-mono text-[var(--fg-20)]">
              Complete your first workout to begin your journey
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
