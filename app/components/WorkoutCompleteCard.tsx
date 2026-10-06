"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Calendar, Share2, ChevronRight } from "lucide-react";
import type { WorkoutExercise, SetEntry, SessionSummary, TodaySession, RecentSession } from "../lib/useWorkoutSession";
import { formatClock, kgToUnit } from "../lib/useWorkoutSession";
import MuscleHeatMap from "./MuscleHeatMap";
import type { MuscleInput } from "./MuscleHeatMap";

type Props = {
    dayTitle: string;
    summary: SessionSummary;
    exercisesList: WorkoutExercise[];
    logs: Record<string, SetEntry[]>;
    todaySessions: TodaySession[];
    weekDays: boolean[];
    prCount: number;
    prExerciseIds?: Set<string>;
    weightUnit: string;
    cycleProfile: { phase: string; cycleDay: number; styleName: string; banner: { color: string } } | null;
    sharing: boolean;
    maxSessions: number;
    sessionCount: number;
    nextSession: { name: string; exerciseCount: number; dayLabel: string } | null;
    recentSessions: RecentSession[];
    queuedExercises?: { name: string; type: string }[];
    muscles?: MuscleInput[];
    onShare: () => void;
    onSchedule: () => void;
    onProgress: () => void;
    onStartAnother: () => void;
};

const INSCRIPTIONS = [
    "The iron remembers what the body forgets.",
    "Each rep is a rune carved in steel.",
    "Strength is not given. It is forged.",
    "The scroll grows longer. So do you.",
    "What was heavy becomes light. What was impossible becomes routine.",
    "You did not come this far to only come this far.",
    "The weight does not lie. Neither does the scroll.",
    "Another chapter written in sweat and iron.",
];

/* ─── SCROLL STYLES ─── */
const SCROLL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=MedievalSharp&family=JetBrains+Mono:wght@400;700&display=swap');

.scroll-container {
    width: 100%; position: relative;
}
.scroll-border { position: absolute; top: -2px; left: -2px; width: calc(100% + 4px); height: calc(100% + 4px); pointer-events: none; z-index: 2; }
.scroll-border rect { fill: none; stroke: var(--fg-08); stroke-width: 1.5; rx: 16; stroke-dasharray: 2400; stroke-dashoffset: 2400; animation: drawBorder 1.8s ease-out 0.2s forwards; }
.scroll-border .inner { stroke: rgb(var(--accent-rgb) / 0.4); stroke-width: 0.5; stroke-dasharray: 2400; stroke-dashoffset: 2400; animation: drawBorder 2.2s ease-out 0.5s forwards; opacity: 0.5; }
.scroll-border .knot { fill: none; stroke: var(--fg-12); stroke-width: 0.8; stroke-dasharray: 200; stroke-dashoffset: 200; animation: drawBorder 1s ease-out 1.4s forwards; opacity: 0.35; }
@keyframes drawBorder { to { stroke-dashoffset: 0; } }

.corner-rune { position: absolute; width: 24px; height: 24px; opacity: 0; animation: runeAppear 0.4s ease-out forwards; z-index: 3; }
.corner-rune.tl { top: 4px; left: 4px; animation-delay: 1.6s; }
.corner-rune.tr { top: 4px; right: 4px; animation-delay: 1.7s; transform: scaleX(-1); }
.corner-rune.bl { bottom: 4px; left: 4px; animation-delay: 1.8s; transform: scaleY(-1); }
.corner-rune.br { bottom: 4px; right: 4px; animation-delay: 1.9s; transform: scale(-1); }
@keyframes runeAppear { from { opacity: 0; filter: blur(4px); } to { opacity: 0.5; filter: blur(0); } }

.scroll-body {
    background: var(--bg-card);
    border-radius: 16px; padding: 28px 20px 24px;
    position: relative; overflow: hidden;
}
.scroll-body::before {
    content: ''; position: absolute; inset: 0;
    background: repeating-linear-gradient(0deg, transparent, transparent 3px, rgb(var(--fg-rgb) / 0.006) 3px, rgb(var(--fg-rgb) / 0.006) 4px);
    pointer-events: none;
}
.scroll-content { clip-path: inset(50% 0 50% 0); animation: unfurl 1s ease-out 0.3s forwards; }
@keyframes unfurl { to { clip-path: inset(0 0 0 0); } }

.reveal { opacity: 0; transform: translateY(8px); animation: revealIn 0.5s ease-out forwards; }
.reveal.d1 { animation-delay: 0.6s; } .reveal.d2 { animation-delay: 0.85s; }
.reveal.d3 { animation-delay: 1.1s; } .reveal.d4 { animation-delay: 1.35s; }
.reveal.d5 { animation-delay: 1.6s; } .reveal.d6 { animation-delay: 1.85s; }
.reveal.d7 { animation-delay: 2.1s; } .reveal.d8 { animation-delay: 2.35s; }
.reveal.d9 { animation-delay: 2.6s; } .reveal.d10 { animation-delay: 2.85s; }
.reveal.d11 { animation-delay: 3.1s; } .reveal.d12 { animation-delay: 3.35s; }
.reveal.d13 { animation-delay: 3.6s; }
@keyframes revealIn { to { opacity: 1; transform: translateY(0); } }

.header-eyebrow { font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 3px; color: var(--fg-35); text-align: center; margin-bottom: 4px; }
.header-title { font-family: 'MedievalSharp', cursive; font-size: 26px; color: rgb(var(--accent-rgb)); text-align: center; margin-bottom: 2px; text-shadow: 0 0 30px rgb(var(--accent-rgb) / 0.15); }
.session-count-label { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: var(--fg-35); text-align: center; letter-spacing: 1.5px; }

.ornament { display: flex; align-items: center; gap: 8px; margin: 16px 0; }
.ornament-line { flex: 1; height: 1px; background: linear-gradient(90deg, transparent, var(--fg-12), transparent); }
.ornament-diamond { width: 5px; height: 5px; background: rgb(var(--accent-rgb)); transform: rotate(45deg); opacity: 0.4; box-shadow: 0 0 6px rgb(var(--accent-rgb) / 0.15); }

.workout-name { font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 700; color: var(--fg-90); text-align: center; margin-bottom: 3px; }
.workout-date { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: var(--fg-35); text-align: center; letter-spacing: 1.5px; }

.stats-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 2px; margin-top: 16px; border-radius: 10px; overflow: hidden; background: rgb(var(--accent-rgb) / 0.03); border: 1px solid rgb(var(--accent-rgb) / 0.08); }
.stat-cell { padding: 12px 6px; text-align: center; background: rgb(var(--fg-rgb) / 0.02); }
.stat-value { font-family: 'JetBrains Mono', monospace; font-size: 20px; font-weight: 700; color: var(--fg-90); line-height: 1; font-variant-numeric: tabular-nums; }
.stat-unit { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: rgb(var(--accent-rgb) / 0.4); }
.stat-label { font-family: 'JetBrains Mono', monospace; font-size: 7px; letter-spacing: 2px; color: var(--fg-35); margin-top: 5px; }

.xp-section { margin-top: 16px; }
.xp-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; }
.xp-label { font-family: 'JetBrains Mono', monospace; font-size: 8px; letter-spacing: 2px; color: var(--fg-35); }
.xp-earned { font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 700; color: rgb(var(--accent-rgb)); }
.xp-bar-track { height: 6px; border-radius: 3px; background: rgb(var(--accent-rgb) / 0.08); overflow: hidden; position: relative; }
.xp-bar-fill { position: absolute; left: 0; top: 0; height: 100%; background: rgb(var(--accent-rgb)); border-radius: 3px; width: 0; animation: xpFill 1.2s ease-out 1.8s forwards; box-shadow: 0 0 8px rgb(var(--accent-rgb) / 0.4); }
@keyframes xpFill { to { width: var(--xp-pct); } }
.xp-footer { display: flex; justify-content: space-between; margin-top: 4px; }
.xp-level { font-family: 'JetBrains Mono', monospace; font-size: 8px; color: var(--fg-35); letter-spacing: 1px; }

.best-moment { margin-top: 16px; padding: 10px 14px; border-radius: 8px; background: rgba(251,191,36,0.04); border: 1px solid rgba(251,191,36,0.12); display: flex; align-items: center; gap: 10px; }
.best-moment-icon { font-size: 16px; line-height: 1; }
.best-moment-text { flex: 1; }
.best-moment-label { font-family: 'JetBrains Mono', monospace; font-size: 7px; letter-spacing: 2px; color: #fbbf24; opacity: 0.7; margin-bottom: 2px; }
.best-moment-value { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--fg-90); }

.rpe-section { margin-top: 16px; }
.rpe-label { font-family: 'JetBrains Mono', monospace; font-size: 7px; letter-spacing: 2px; color: var(--fg-35); margin-bottom: 6px; }
.rpe-strip { display: flex; gap: 2px; align-items: flex-end; }
.rpe-block { flex: 1; border-radius: 2px; min-height: 4px; opacity: 0; animation: rpeIn 0.15s ease-out forwards; }
@keyframes rpeIn { to { opacity: 1; } }
.rpe-legend { display: flex; justify-content: space-between; margin-top: 4px; font-family: 'JetBrains Mono', monospace; font-size: 7px; color: var(--fg-35); letter-spacing: 0.5px; }

.exercise-list { margin-top: 16px; display: flex; flex-direction: column; }
.exercise-header-label { font-family: 'JetBrains Mono', monospace; font-size: 7px; letter-spacing: 2px; color: var(--fg-35); margin-bottom: 8px; }
.exercise-row { border-bottom: 1px solid rgb(var(--accent-rgb) / 0.08); cursor: pointer; user-select: none; }
.exercise-row:last-child { border-bottom: none; }
.exercise-main { display: flex; align-items: center; justify-content: space-between; padding: 9px 0; gap: 8px; }
.exercise-name { font-size: 11px; color: var(--fg-90); display: flex; align-items: center; gap: 7px; min-width: 0; }
.exercise-idx { font-family: 'JetBrains Mono', monospace; font-size: 8px; color: var(--fg-35); width: 14px; text-align: right; flex-shrink: 0; }
.exercise-name-text { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.exercise-detail { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: var(--fg-50); display: flex; align-items: center; gap: 5px; flex-shrink: 0; }
.pr-badge { font-size: 7px; font-weight: 700; letter-spacing: 1px; color: #fbbf24; background: rgba(251,191,36,0.1); border: 1px solid rgba(251,191,36,0.2); padding: 1px 4px; border-radius: 3px; }
.expand-arrow { font-size: 8px; color: var(--fg-35); transition: transform 0.2s; margin-left: 2px; }
.exercise-row.open .expand-arrow { transform: rotate(180deg); }
.set-detail { max-height: 0; overflow: hidden; transition: max-height 0.3s ease; padding: 0 0 0 22px; }
.exercise-row.open .set-detail { max-height: 300px; }
.set-line { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; font-family: 'JetBrains Mono', monospace; font-size: 9px; }
.set-num { color: var(--fg-35); width: 32px; }
.set-data { color: var(--fg-50); }
.set-rpe { font-size: 8px; padding: 1px 4px; border-radius: 3px; }
.set-rpe.easy { color: #4ade80; background: rgba(74,222,128,0.08); }
.set-rpe.mod { color: #facc15; background: rgba(250,204,21,0.08); }
.set-rpe.hard { color: #f97316; background: rgba(249,115,22,0.08); }
.set-rpe.max { color: #ef4444; background: rgba(239,68,68,0.08); }

.muscle-section { margin-top: 16px; }
.muscle-label { font-family: 'JetBrains Mono', monospace; font-size: 7px; letter-spacing: 2px; color: var(--fg-35); margin-bottom: 8px; }
.scanner-wrap { display: flex; justify-content: center; gap: 6px; align-items: flex-start; }
.scanner-view { text-align: center; }
.scanner-view-label { font-family: 'JetBrains Mono', monospace; font-size: 7px; color: var(--fg-35); letter-spacing: 1px; margin-bottom: 4px; }
.scanner-canvas { display: block; margin: 0 auto; opacity: 0; animation: scannerIn 0.8s ease-out 2.5s forwards; }
@keyframes scannerIn { to { opacity: 1; } }
.muscle-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 10px; justify-content: center; }
.muscle-tag { font-family: 'JetBrains Mono', monospace; font-size: 8px; padding: 2px 8px; border-radius: 4px; letter-spacing: 0.5px; }
.muscle-tag.primary { color: rgb(var(--accent-rgb)); background: rgb(var(--accent-rgb) / 0.12); border: 1px solid rgb(var(--accent-rgb) / 0.3); }
.muscle-tag.secondary { color: rgb(var(--accent-rgb) / 0.5); background: rgb(var(--accent-rgb) / 0.05); border: 1px solid rgb(var(--accent-rgb) / 0.12); }

.weekly-section { margin-top: 16px; display: flex; align-items: center; gap: 14px; padding: 10px 14px; border-radius: 8px; background: rgb(var(--accent-rgb) / 0.03); border: 1px solid rgb(var(--accent-rgb) / 0.08); }
.ring-container { position: relative; width: 44px; height: 44px; flex-shrink: 0; }
.ring-container svg { width: 44px; height: 44px; transform: rotate(-90deg); }
.ring-bg { fill: none; stroke: rgb(var(--accent-rgb) / 0.08); stroke-width: 4; }
.ring-fill { fill: none; stroke: rgb(var(--accent-rgb)); stroke-width: 4; stroke-linecap: round; stroke-dasharray: 113; stroke-dashoffset: 113; animation: ringFill 1s ease-out 2.6s forwards; }
@keyframes ringFill { to { stroke-dashoffset: var(--ring-offset); } }
.ring-text { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 700; color: var(--fg-90); }
.weekly-info { flex: 1; }
.weekly-title { font-family: 'JetBrains Mono', monospace; font-size: 8px; letter-spacing: 2px; color: var(--fg-35); margin-bottom: 3px; }
.weekly-detail { font-size: 11px; color: var(--fg-50); }

.next-session { margin-top: 10px; padding: 10px 14px; border-radius: 8px; border: 1px dashed var(--fg-08); display: flex; align-items: center; gap: 10px; }
.next-icon { color: var(--fg-35); font-size: 14px; }
.next-info { flex: 1; }
.next-label { font-family: 'JetBrains Mono', monospace; font-size: 7px; letter-spacing: 2px; color: var(--fg-35); margin-bottom: 2px; }
.next-name { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--fg-90); }
.next-meta { font-family: 'JetBrains Mono', monospace; font-size: 8px; color: var(--fg-35); margin-top: 1px; }


.seal-group { text-align: center; padding: 8px 0; }
.seal-container { display: inline-block; position: relative; opacity: 0; animation: sealStamp 0.5s cubic-bezier(0.34,1.56,0.64,1) 3.2s forwards; }
@keyframes sealStamp { 0% { opacity: 0; transform: scale(2.5) rotate(-15deg); } 60% { opacity: 1; transform: scale(0.95) rotate(2deg); } 100% { opacity: 1; transform: scale(1) rotate(0deg); } }
.seal-svg { width: 64px; height: 64px; filter: drop-shadow(0 0 12px rgba(201,148,62,0.3)); }
.seal-ring { fill: none; stroke: #c9943e; stroke-width: 2; }
.seal-inner { fill: none; stroke: #c9943e; stroke-width: 1; opacity: 0.5; }
.seal-text-cls { font-family: 'MedievalSharp', cursive; font-size: 7px; fill: #c9943e; }
.seal-center { font-family: 'MedievalSharp', cursive; font-size: 14px; fill: #c9943e; }

.seal-group .signature { margin-top: 6px; font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 1.5px; color: var(--fg-50); text-align: center; }
.seal-group .signature .sig-name { color: var(--fg-70); }
.seal-group .signature .sig-tier { color: rgb(var(--accent-rgb) / 0.7); }

.seal-group .inscription { margin-top: 6px; font-family: 'MedievalSharp', cursive; font-size: 14px; color: var(--fg-50); text-align: center; font-style: italic; line-height: 1.4; padding: 0 8px; }

.glow-pulse { position: absolute; inset: 0; border-radius: 16px; box-shadow: inset 0 0 40px rgb(var(--accent-rgb) / 0.15); opacity: 0; animation: glowSettle 1.5s ease-out 3.0s forwards; pointer-events: none; }
@keyframes glowSettle { 0% { opacity: 0; } 50% { opacity: 1; } 100% { opacity: 0.3; } }

.scroll-actions { margin-top: 14px; display: flex; gap: 8px; }
.scroll-btn-outline { flex: 1; font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 1px; padding: 10px 0; border-radius: 10px; border: 1px solid var(--fg-08); background: transparent; color: var(--fg-50); cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 4px; }
.scroll-btn-outline:hover { color: var(--fg-90); border-color: var(--fg-12); }
.scroll-btn-primary { flex: 1; font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 1px; font-weight: 700; padding: 10px 0; border-radius: 10px; border: none; background: rgb(var(--accent-rgb)); color: var(--bg-primary); cursor: pointer; transition: all 0.2s; }
.scroll-btn-primary:hover { filter: brightness(1.1); }
.scroll-btn-icon { width: 36px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border-radius: 10px; border: 1px solid var(--fg-08); background: transparent; color: var(--fg-35); cursor: pointer; transition: all 0.2s; padding: 10px 0; }
.scroll-btn-icon:hover { color: var(--fg-50); border-color: var(--fg-12); }
.scroll-btn-icon:disabled { opacity: 0.4; cursor: default; }
.another-btn { margin-top: 8px; width: 100%; font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 1.5px; padding: 11px 0; border-radius: 10px; border: 1px solid var(--fg-10); background: transparent; color: var(--fg-45); cursor: pointer; transition: all 0.2s; }
.another-btn:hover { color: var(--fg-50); border-color: var(--fg-12); }

.recent-section { margin-top: 20px; }
.recent-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.recent-title { font-family: 'JetBrains Mono', monospace; font-size: 8px; letter-spacing: 2px; color: var(--fg-35); }
.recent-view-all { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: rgb(var(--accent-rgb)); cursor: pointer; background: none; border: none; padding: 0; }
.recent-list { display: flex; flex-direction: column; }
.recent-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--fg-06); }
.recent-row:last-child { border-bottom: none; }
.recent-name { font-size: 12px; color: var(--fg-85); }
.recent-date { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: var(--fg-35); }

.session-pills { display: flex; gap: 4px; justify-content: center; flex-wrap: wrap; margin-top: 12px; }
.session-pill { font-family: 'JetBrains Mono', monospace; font-size: 8px; letter-spacing: 1px; padding: 5px 10px; border-radius: 8px; border: 1px solid var(--fg-08); background: transparent; color: var(--fg-35); cursor: pointer; transition: all 0.2s; white-space: nowrap; }
.session-pill:hover { border-color: rgb(var(--accent-rgb) / 0.3); color: var(--fg-60); }
.session-pill.active { background: rgb(var(--accent-rgb) / 0.12); border-color: rgb(var(--accent-rgb) / 0.4); color: rgb(var(--accent-rgb)); }
`;

/* ─── MAIN COMPONENT ─── */
export default function WorkoutCompleteCard({
    dayTitle, summary, exercisesList, logs, todaySessions, weekDays, prCount, prExerciseIds, weightUnit,
    cycleProfile, sharing, maxSessions, sessionCount, nextSession,
    recentSessions, queuedExercises, muscles: musclesProp, onShare, onSchedule, onProgress, onStartAnother,
}: Props) {
    const MA_DISCIPLINES = new Set(["boxing", "muay_thai", "kickboxing", "bjj", "wrestling", "judo", "mma", "karate", "taekwondo"]);
    const [openExercise, setOpenExercise] = useState<number | null>(null);
    const [inscription] = useState(() => INSCRIPTIONS[Math.floor(Math.random() * INSCRIPTIONS.length)]);
    const [activePill, setActivePill] = useState<number | null>(null);
    const multiSession = todaySessions.length > 1;
    const setsRef = useRef<HTMLSpanElement>(null);
    const volRef = useRef<HTMLSpanElement>(null);
    const durRef = useRef<HTMLSpanElement>(null);

    const activeSession = activePill !== null ? todaySessions[activePill] : null;
    const isMaSession = activeSession ? activeSession.volume === 0 && activeSession.sets > 0 : false;

    const filteredExercises = useMemo(() => {
        if (activePill === null) return exercisesList;
        if (isMaSession) return exercisesList.filter(ex => MA_DISCIPLINES.has(ex.discipline || ""));
        return exercisesList.filter(ex => !MA_DISCIPLINES.has(ex.discipline || ""));
    }, [exercisesList, activePill, isMaSession]);

    const segmentIntensities = useMemo(() => {
        const volBySegment = new Map<string, number>();
        const countBySegment = new Map<string, number>();
        filteredExercises.forEach(ex => {
            const sets = (logs[ex.id] ?? []).filter(s => s.completed && !s.is_warmup);
            if (sets.length === 0) return;
            const vol = sets.reduce((sum, s) => sum + (Number(s.weight) || 0) * (Number(s.reps) || 0), 0);
            const seg = ex.body_segment;
            if (!seg || seg === "Other" || seg === "Cardio") return;
            volBySegment.set(seg, (volBySegment.get(seg) || 0) + vol);
            countBySegment.set(seg, (countBySegment.get(seg) || 0) + sets.length);
        });
        if (countBySegment.size === 0) return new Map<string, number>();
        const maxVol = Math.max(...volBySegment.values());
        const intensities = new Map<string, number>();
        if (maxVol > 0) {
            volBySegment.forEach((vol, seg) => intensities.set(seg, 0.3 + 0.7 * (vol / maxVol)));
        } else {
            const maxCount = Math.max(...countBySegment.values());
            countBySegment.forEach((count, seg) => intensities.set(seg, 0.3 + 0.7 * (count / maxCount)));
        }
        return intensities;
    }, [filteredExercises, logs]);

    const heroMuscles = useMemo<MuscleInput[]>(() => {
        return Array.from(segmentIntensities.entries()).map(([seg, intensity]) => ({
            muscle: seg,
            intensity: Math.round(intensity * 10),
        }));
    }, [segmentIntensities]);

    type BestMoment = { name: string; weight: number; reps: number; isPr: boolean };
    const bestMoment = useMemo<BestMoment | null>(() => {
        let best: BestMoment | null = null;
        let bestVol = 0;
        for (const ex of filteredExercises.filter(e => !MA_DISCIPLINES.has(e.discipline || ""))) {
            for (const s of (logs[ex.id] ?? []).filter(s => s.completed && !s.is_warmup)) {
                const w = Number(s.weight) || 0, r = Number(s.reps) || 0, v = w * r;
                if (v > 0 && v > bestVol) { best = { name: ex.name, weight: w, reps: r, isPr: prExerciseIds ? prExerciseIds.has(ex.exercise_id) : prCount > 0 }; bestVol = v; }
            }
        }
        return best;
    }, [filteredExercises, logs, prCount]);

    const DISCIPLINE_COLORS: Record<string, string> = {
        boxing: "#ef4444", muay_thai: "#f97316", kickboxing: "#f97316",
        bjj: "#a78bfa", wrestling: "#8b5cf6", judo: "#7c3aed", mma: "#ec4899",
        karate: "#3b82f6", taekwondo: "#60a5fa",
        calisthenics: "#34d399", cardio: "#fbbf24", mobility: "#22d3ee",
        strength: "", other: "",
    };

    const exerciseDetails = useMemo(() => filteredExercises.map((ex, idx) => {
        const sets = (logs[ex.id] ?? []).filter(s => s.completed && !s.is_warmup);
        const maxW = sets.reduce((m, s) => Math.max(m, Number(s.weight) || 0), 0);
        const maxSet = sets.find(s => (Number(s.weight) || 0) === maxW);
        const topReps = maxSet ? (Number(maxSet.reps) || 0) : (sets[0] ? (Number(sets[0].reps) || 0) : 0);
        const mode = ex.tracking_mode || "weight_reps";
        const disc = ex.discipline || "strength";
        return { idx: idx + 1, name: ex.name, sets, segment: ex.body_segment, maxWeight: maxW, topReps, mode, disc };
    }).filter(e => e.sets.length > 0), [filteredExercises, logs]);

    const rpeData = useMemo(() => {
        const d: { rpe: number }[] = [];
        filteredExercises.filter(ex => !MA_DISCIPLINES.has(ex.discipline || "")).forEach(ex => {
            (logs[ex.id] ?? []).filter(s => s.completed && !s.is_warmup).forEach(s => {
                if (s.rpe) {
                    d.push({ rpe: s.rpe });
                } else {
                    const w = Number(s.weight) || 0, r = Number(s.reps) || 0;
                    const estimated = w > 0 && r > 0 ? Math.min(10, Math.max(4, Math.round(6 + (w * r) / 500))) : 5;
                    d.push({ rpe: estimated });
                }
            });
        });
        return d;
    }, [filteredExercises, logs]);

    const doneCount = weekDays.filter(Boolean).length;
    const ringOffset = 113 - (doneCount / 7) * 113;
    const unit = weightUnit as "kg" | "lbs";

    const combinedStats = useMemo(() => {
        if (!multiSession) return null;
        const totalSets = todaySessions.reduce((s, t) => s + t.sets, 0);
        const totalVol = todaySessions.reduce((s, t) => s + t.volume, 0);
        const totalDur = todaySessions.reduce((s, t) => s + t.duration, 0);
        const totalXp = todaySessions.reduce((s, t) => s + t.xp, 0);
        return { sets: totalSets, volume: totalVol, duration: totalDur, xp: totalXp };
    }, [multiSession, todaySessions]);

    const displaySets = activeSession ? activeSession.sets : combinedStats ? combinedStats.sets : summary.sets;
    const displayVol = activeSession ? Math.round(kgToUnit(activeSession.volume, unit)) : combinedStats ? Math.round(kgToUnit(combinedStats.volume, unit)) : Math.round(kgToUnit(summary.volume, unit));
    const displayDur = activeSession ? activeSession.duration : combinedStats ? combinedStats.duration : summary.duration;
    const displayDurMin = Math.floor(displayDur / 60);
    const displayXp = activeSession ? activeSession.xp : combinedStats ? combinedStats.xp : summary.xpBreakdown.total;
    const displayTitle = activeSession ? activeSession.title : multiSession ? "All Sessions" : dayTitle;

    const dur = summary.duration;
    const durMin = Math.floor(dur / 60);
    const vol = Math.round(kgToUnit(summary.volume, unit));
    const xpPct = Math.min(((summary.xpBreakdown.total % 100) / 100) * 100, 100);
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" }).toUpperCase() + " · " + formatClock(dur);

    // Counter animation
    useEffect(() => {
        let cancelled = false;
        const animate = (el: HTMLSpanElement | null, target: number, delay: number) => {
            if (!el) return;
            const node = el;
            const start = performance.now();
            function tick(now: number) {
                if (cancelled) return;
                const elapsed = now - start - delay;
                if (elapsed < 0) { requestAnimationFrame(tick); return; }
                const p = Math.min(elapsed / 1200, 1);
                const eased = 1 - Math.pow(1 - p, 3);
                node.textContent = Math.round(target * eased).toLocaleString();
                if (p < 1) requestAnimationFrame(tick);
            }
            requestAnimationFrame(tick);
        };
        animate(setsRef.current, displaySets, 1100);
        animate(volRef.current, displayVol, 1100);
        animate(durRef.current, displayDurMin, 1100);
        return () => { cancelled = true; };
    }, [displaySets, displayVol, displayDurMin]);

    function rpeColor(rpe: number) {
        if (rpe <= 5) return "#4ade80";
        if (rpe <= 7) return "#facc15";
        if (rpe <= 8) return "#f97316";
        return "#ef4444";
    }
    function rpeClass(rpe: number) {
        if (rpe <= 5) return "easy";
        if (rpe <= 7) return "mod";
        if (rpe <= 8) return "hard";
        return "max";
    }

    const CornerRune = () => (
        <svg viewBox="0 0 24 24"><path d="M3 3 L10 3 L3 10 Z" fill="none" stroke="rgba(74,222,128,0.4)" strokeWidth="0.8"/><path d="M5 3 L5 8 M3 5 L8 5" fill="none" stroke="rgba(74,222,128,0.4)" strokeWidth="0.4" opacity="0.6"/><circle cx="6" cy="6" r="1.2" fill="#4ade80" opacity="0.4"/></svg>
    );

    const Ornament = () => (
        <div className="ornament"><div className="ornament-line" /><div className="ornament-diamond" /><div className="ornament-line" /></div>
    );

    return (
        <>
            <style>{SCROLL_CSS}</style>
            <div className="scroll-container">
                {/* Ornamental border */}
                <svg className="scroll-border" viewBox="0 0 384 1600" preserveAspectRatio="none">
                    <rect x="1" y="1" width="382" height="1598" />
                    <rect className="inner" x="6" y="6" width="372" height="1588" />
                    <path className="knot" d="M20 16 Q28 8 36 16 Q28 24 20 16 Z" />
                    <path className="knot" d="M348 16 Q356 8 364 16 Q356 24 348 16 Z" />
                    <path className="knot" d="M20 1584 Q28 1576 36 1584 Q28 1592 20 1584 Z" />
                    <path className="knot" d="M348 1584 Q356 1576 364 1584 Q356 1592 348 1584 Z" />
                    <path className="knot" d="M3 200 L3 220 M3 400 L3 420 M3 600 L3 620 M3 800 L3 820" />
                    <path className="knot" d="M381 200 L381 220 M381 400 L381 420 M381 600 L381 620 M381 800 L381 820" />
                </svg>

                {/* Corner runes */}
                <div className="corner-rune tl"><CornerRune /></div>
                <div className="corner-rune tr"><CornerRune /></div>
                <div className="corner-rune bl"><CornerRune /></div>
                <div className="corner-rune br"><CornerRune /></div>

                <div className="scroll-body">
                    <div className="glow-pulse" />
                    <div className="scroll-content">

                        {/* 1. Header */}
                        <div className="reveal d1">
                            <div className="header-eyebrow">CHAPTER INSCRIBED</div>
                            <div className="header-title">Session Complete</div>
                            <div className="session-count-label">SCROLL #{sessionCount}</div>
                        </div>

                        <div className="reveal d2"><Ornament /></div>

                        {/* Session pills (multi-session only) */}
                        {multiSession && (
                            <div className="reveal d2">
                                <div className="session-pills">
                                    <button className={`session-pill ${activePill === null ? "active" : ""}`} onClick={() => setActivePill(null)}>Summary</button>
                                    {todaySessions.map((s, i) => (
                                        <button key={s.id} className={`session-pill ${activePill === i ? "active" : ""}`} onClick={() => setActivePill(i)}>{s.title}</button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 2. Workout name + date */}
                        <div className="reveal d2">
                            <div className="workout-name">{displayTitle}</div>
                            <div className="workout-date">{dateStr}</div>
                        </div>

                        {/* Cycle phase */}
                        {cycleProfile && (
                            <div className="reveal d3" style={{marginTop:12,padding:"6px 12px",borderRadius:8,border:"1px solid rgba(139,92,246,0.15)",background:"rgba(139,92,246,0.04)",textAlign:"center"}}>
                                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:"rgba(139,92,246,0.6)"}}>
                                    Trained in {cycleProfile.phase} phase · Day {cycleProfile.cycleDay} · {cycleProfile.styleName}
                                </span>
                            </div>
                        )}

                        {/* 3. Stats grid */}
                        <div className="reveal d4">
                            <div className="stats-grid">
                                <div className="stat-cell">
                                    <div className="stat-value"><span ref={setsRef}>0</span></div>
                                    <div className="stat-label">SETS</div>
                                </div>
                                <div className="stat-cell">
                                    <div className="stat-value"><span ref={volRef}>0</span><span className="stat-unit">{weightUnit}</span></div>
                                    <div className="stat-label">VOLUME</div>
                                </div>
                                <div className="stat-cell">
                                    <div className="stat-value"><span ref={durRef}>0</span><span className="stat-unit">m</span></div>
                                    <div className="stat-label">DURATION</div>
                                </div>
                            </div>
                        </div>

                        {/* 4. XP bar */}
                        <div className="reveal d5">
                            <div className="xp-section">
                                <div className="xp-header">
                                    <span className="xp-label">EXPERIENCE</span>
                                    <span className="xp-earned">+{displayXp} XP</span>
                                </div>
                                <div className="xp-bar-track" style={{"--xp-pct":`${xpPct}%`} as React.CSSProperties}>
                                    <div className="xp-bar-fill" />
                                </div>
                                <div className="xp-footer">
                                    <span className="xp-level">Lv.{summary.level} {summary.rankName.toUpperCase()}</span>
                                    <span className="xp-level">{summary.xpBreakdown.total % 100} / 100 XP</span>
                                </div>
                            </div>
                        </div>

                        {/* 5. Best moment (only on summary or gym sessions with volume) */}
                        {bestMoment && (activePill === null || (activeSession && activeSession.volume > 0)) && (
                            <div className="reveal d6">
                                <div className="best-moment">
                                    <div className="best-moment-icon">{"⚔"}</div>
                                    <div className="best-moment-text">
                                        <div className="best-moment-label">BEST MOMENT</div>
                                        <div className="best-moment-value">
                                            {bestMoment.name} — {kgToUnit(bestMoment.weight, unit)}{weightUnit} × {bestMoment.reps}
                                            {bestMoment.isPr && " (PR)"}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 6. RPE heatmap (only on summary or gym sessions with volume) */}
                        {rpeData.length > 0 && (activePill === null || (activeSession && activeSession.volume > 0)) && (
                            <div className="reveal d7">
                                <div className="rpe-section">
                                    <div className="rpe-label">INTENSITY BY SET</div>
                                    <div className="rpe-strip">
                                        {rpeData.map((d, i) => (
                                            <div key={i} className="rpe-block" style={{
                                                height: `${(d.rpe / 10) * 24}px`,
                                                background: rpeColor(d.rpe),
                                                animationDelay: `${2.0 + i * 0.05}s`,
                                            }} />
                                        ))}
                                    </div>
                                    <div className="rpe-legend"><span>SET 1</span><span>SET {rpeData.length}</span></div>
                                </div>
                            </div>
                        )}

                        <div className="reveal d7"><Ornament /></div>

                        {/* 5.4: Category breakdown timeline */}
                        {exerciseDetails.length > 0 && (() => {
                            const cats = new Map<string, { count: number; sets: number; disc: string }>();
                            exerciseDetails.forEach(ex => {
                                const key = ex.disc !== "strength" && DISCIPLINE_COLORS[ex.disc] ? ex.disc : ex.segment;
                                const prev = cats.get(key) ?? { count: 0, sets: 0, disc: ex.disc };
                                cats.set(key, { count: prev.count + 1, sets: prev.sets + ex.sets.length, disc: ex.disc });
                            });
                            const total = exerciseDetails.reduce((s, e) => s + e.sets.length, 0);
                            if (cats.size <= 1) return null;
                            const SEGMENT_COLORS: Record<string, string> = { Chest: "#ef4444", Shoulders: "#f97316", Back: "#3b82f6", Arms: "#a855f7", Legs: "#10b981", Core: "#eab308", Cardio: "#ec4899", Other: "#6b7280" };
                            return (
                                <div className="reveal d7">
                                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:7,letterSpacing:2,color:"var(--fg-35)",marginBottom:8}}>SESSION BREAKDOWN</div>
                                    <div style={{display:"flex",gap:2,height:8,borderRadius:4,overflow:"hidden",marginBottom:8}}>
                                        {Array.from(cats.entries()).map(([key, val]) => (
                                            <div key={key} style={{ flex: val.sets / total, background: DISCIPLINE_COLORS[key] || SEGMENT_COLORS[key] || SEGMENT_COLORS.Other, borderRadius: 2, minWidth: 4 }} />
                                        ))}
                                    </div>
                                    <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                                        {Array.from(cats.entries()).map(([key, val]) => (
                                            <div key={key} style={{display:"flex",alignItems:"center",gap:4}}>
                                                <div style={{width:6,height:6,borderRadius:3,background: DISCIPLINE_COLORS[key] || SEGMENT_COLORS[key] || SEGMENT_COLORS.Other}} />
                                                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:8,color:"var(--fg-50)"}}>{key.replace(/_/g," ")} · {val.count}ex · {val.sets}s</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* 7. Exercise list — unified debrief scroll with category indicators (1.5) */}
                        {exerciseDetails.length > 0 && (
                            <div className="reveal d8">
                                <div className="exercise-header-label">EXERCISES LOGGED</div>
                                <div className="exercise-list">
                                    {exerciseDetails.map((ex, exIdx) => {
                                        const catKey = ex.disc !== "strength" && DISCIPLINE_COLORS[ex.disc] ? ex.disc : ex.segment === "Cardio" ? "cardio" : "gym";
                                        const prevCatKey = exIdx > 0 ? (() => {
                                            const p = exerciseDetails[exIdx - 1];
                                            return p.disc !== "strength" && DISCIPLINE_COLORS[p.disc] ? p.disc : p.segment === "Cardio" ? "cardio" : "gym";
                                        })() : null;
                                        const showCatHeader = exerciseDetails.length > 1 && catKey !== prevCatKey && (() => {
                                            const cats = new Set(exerciseDetails.map(e => e.disc !== "strength" && DISCIPLINE_COLORS[e.disc] ? e.disc : e.segment === "Cardio" ? "cardio" : "gym"));
                                            return cats.size > 1;
                                        })();
                                        const catLabel = catKey === "gym" ? "STRENGTH" : catKey === "cardio" ? "CARDIO" : catKey.toUpperCase().replace(/_/g, " ");
                                        const catColor = catKey === "gym" ? "rgb(var(--accent-rgb))" : catKey === "cardio" ? "#ec4899" : (DISCIPLINE_COLORS[catKey] || "var(--fg-50)");
                                        return (<>
                                        {showCatHeader && (
                                            <div key={`cat-${catKey}`} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 0 4px",marginTop: exIdx > 0 ? 4 : 0}}>
                                                <div style={{width:8,height:2,borderRadius:1,background:catColor}} />
                                                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:7,letterSpacing:2,color:catColor,opacity:0.7}}>{catLabel}</span>
                                                <div style={{flex:1,height:1,background:"var(--fg-06)"}} />
                                            </div>
                                        )}
                                        {(() => {
                                        const isOpen = openExercise === ex.idx;
                                        const discColor = DISCIPLINE_COLORS[ex.disc] || "";
                                        const intensityLabel = (v: number) => v <= 1 ? "Light" : v >= 3 ? "Hard" : "Med";
                                        const fmtSec = (sec: number) => sec >= 60 ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}` : `${sec}s`;
                                        return (
                                            <div key={ex.idx} className={`exercise-row ${isOpen ? "open" : ""}`} onClick={() => setOpenExercise(isOpen ? null : ex.idx)}>
                                                <div className="exercise-main">
                                                    <div className="exercise-name">
                                                        {discColor && <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: discColor, marginRight: 6, flexShrink: 0 }} />}
                                                        <span className="exercise-idx">{ex.idx}</span>
                                                        <span className="exercise-name-text">{ex.name}</span>
                                                    </div>
                                                    <div className="exercise-detail">
                                                        {ex.mode === "rounds_duration" ? (
                                                            <>{ex.sets.length} {ex.sets.length === 1 ? "round" : "rounds"}</>
                                                        ) : ex.mode === "duration_only" ? (
                                                            <>{ex.sets.length} {ex.sets.length === 1 ? "hold" : "holds"}</>
                                                        ) : ex.mode === "distance_time" ? (
                                                            <>{ex.sets[0]?.duration ? `${ex.sets[0].duration}min` : ""}{ex.sets[0]?.distance ? ` · ${ex.sets[0].distance}km` : ""}</>
                                                        ) : (
                                                            <>{ex.sets.length}×{ex.topReps} · {kgToUnit(ex.maxWeight, unit)}{weightUnit}</>
                                                        )}
                                                        <span className="expand-arrow">{"▾"}</span>
                                                    </div>
                                                </div>
                                                <div className="set-detail">
                                                    {ex.sets.map((s, j) => (
                                                        <div key={j} className="set-line">
                                                            <span className="set-num">{ex.mode === "rounds_duration" ? `R${j + 1}` : ex.mode === "duration_only" ? `Hold ${j + 1}` : `Set ${j + 1}`}</span>
                                                            <span className="set-data">
                                                                {ex.mode === "rounds_duration" ? (
                                                                    <>{fmtSec(Number(s.duration) || 0)} · {intensityLabel(Number(s.reps) || 2)}</>
                                                                ) : ex.mode === "duration_only" ? (
                                                                    <>{fmtSec(Number(s.duration) || 0)}</>
                                                                ) : ex.mode === "distance_time" ? (
                                                                    <>{s.duration ? `${s.duration}min` : ""}{s.distance ? ` · ${s.distance}km` : ""}{s.weight ? ` · ${s.weight}km/h` : ""}</>
                                                                ) : (
                                                                    <>{kgToUnit(Number(s.weight) || 0, unit)}{weightUnit} × {s.reps}</>
                                                                )}
                                                            </span>
                                                            {s.rpe && <span className={`set-rpe ${rpeClass(s.rpe)}`}>RPE {s.rpe}</span>}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                        })()}
                                        </>);
                                    })}
                                </div>
                            </div>
                        )}

                        {/* 8. Muscle map */}
                        {(heroMuscles.length > 0 || (musclesProp && musclesProp.length > 0)) && (
                            <div className="reveal d9">
                                <div className="muscle-section">
                                    <div className="muscle-label">MUSCLES ACTIVATED</div>
                                    <MuscleHeatMap muscles={heroMuscles.length > 0 ? heroMuscles : musclesProp!} height={320} showToggle showLegend={false} />
                                    <div className="muscle-tags">
                                        {(heroMuscles.length > 0
                                            ? Array.from(segmentIntensities.entries())
                                                .filter(([s]) => s !== "Cardio" && s !== "Other")
                                                .sort((a, b) => b[1] - a[1])
                                            : (musclesProp ?? [])
                                                .filter(m => m.muscle !== "Cardio" && m.muscle !== "Other")
                                                .sort((a, b) => (b.intensity ?? 0) - (a.intensity ?? 0))
                                                .map(m => [m.muscle, (m.intensity ?? 0) / 10] as [string, number])
                                        ).map(([seg, intensity]) => (
                                                <span key={seg} className={`muscle-tag ${intensity > 0.7 ? "primary" : "secondary"}`}>{seg}</span>
                                            ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="reveal d10"><Ornament /></div>

                        {/* 9. Weekly ring */}
                        <div className="reveal d10">
                            <div className="weekly-section">
                                <div className="ring-container">
                                    <svg viewBox="0 0 44 44">
                                        <circle className="ring-bg" cx="22" cy="22" r="18" />
                                        <circle className="ring-fill" cx="22" cy="22" r="18" style={{"--ring-offset": ringOffset} as React.CSSProperties} />
                                    </svg>
                                    <div className="ring-text">{doneCount}/7</div>
                                </div>
                                <div className="weekly-info">
                                    <div className="weekly-title">THIS WEEK</div>
                                    <div className="weekly-detail">{doneCount} of 7 sessions complete</div>
                                </div>
                            </div>
                        </div>

                        {/* Next Session Preview */}
                        {nextSession && (
                            <div className="reveal d10">
                                <div className="next-session">
                                    <div className="next-icon">{"▶"}</div>
                                    <div className="next-info">
                                        <div className="next-label">UP NEXT</div>
                                        <div className="next-name">{nextSession.name}</div>
                                        <div className="next-meta">{nextSession.dayLabel} · {nextSession.exerciseCount} exercises</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 2.7 Queued exercises prompt */}
                        {queuedExercises && queuedExercises.length > 0 && (
                            <div className="reveal d10">
                                <div style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(251,191,36,0.15)", background: "rgba(251,191,36,0.04)" }}>
                                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 7, letterSpacing: 2, color: "#fbbf24", opacity: 0.7, marginBottom: 6 }}>STILL QUEUED TODAY</div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                        {queuedExercises.map((q, i) => (
                                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <div style={{ width: 4, height: 4, borderRadius: 2, background: "rgba(251,191,36,0.5)", flexShrink: 0 }} />
                                                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "var(--fg-60)" }}>{q.name}</span>
                                                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, color: "var(--fg-25)", marginLeft: "auto" }}>{q.type}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="reveal d11"><Ornament /></div>

                        {/* 10. Seal + Signature + Inscription — grouped */}
                        <div className="reveal d11">
                            <div className="seal-group">
                                <div className="seal-container">
                                    <svg className="seal-svg" viewBox="0 0 72 72">
                                        <circle className="seal-ring" cx="36" cy="36" r="32" />
                                        <circle className="seal-inner" cx="36" cy="36" r="26" />
                                        <circle cx="36" cy="36" r="20" fill="rgba(201,148,62,0.08)" stroke="#c9943e" strokeWidth="0.5"/>
                                        <path id="sealTextPath" d="M36 8 A28 28 0 1 1 35.99 8" fill="none"/>
                                        <text className="seal-text-cls"><textPath href="#sealTextPath" startOffset="0%">{`· SEVEL · ${summary.rankName.toUpperCase()} · LV.${summary.level} · SCROLL #${sessionCount} ·`}</textPath></text>
                                        <text className="seal-center" x="36" y="40" textAnchor="middle">S</text>
                                    </svg>
                                </div>
                                <div className="signature">
                                    FORGED BY <span className="sig-name">{dayTitle.split("—")[0]?.trim() || "YOU"}</span> · <span className="sig-tier">{summary.rankName.toUpperCase()}</span> · LV.{summary.level}
                                </div>
                                <div className="inscription">&ldquo;{inscription}&rdquo;</div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="reveal d13">
                            <div className="scroll-actions">
                                <button className="scroll-btn-outline" onClick={onSchedule}>
                                    <Calendar size={13} />Schedule
                                </button>
                                <button className="scroll-btn-primary" onClick={onProgress}>
                                    View Progress
                                </button>
                                <button className="scroll-btn-icon" onClick={onShare} disabled={sharing}>
                                    {sharing ? <div style={{width:14,height:14,border:"2px solid #475569",borderTop:"2px solid #4ade80",borderRadius:"50%",animation:"spin 0.6s linear infinite"}} /> : <Share2 size={13} />}
                                </button>
                            </div>
                            {todaySessions.length >= maxSessions ? (
                                <div style={{marginTop:8,textAlign:"center",fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:"#475569",letterSpacing:1}}>
                                    Daily limit reached ({maxSessions}/{maxSessions})
                                </div>
                            ) : (
                                <button className="another-btn" onClick={onStartAnother}>
                                    START ANOTHER WORKOUT ({todaySessions.length}/{maxSessions})
                                </button>
                            )}
                        </div>

                    </div>
                </div>
            </div>

            {/* Recent Sessions — outside the scroll card */}
            {recentSessions?.length > 0 && (
                <div className="recent-section">
                    <div className="recent-header">
                        <span className="recent-title">RECENT SESSIONS</span>
                        <button className="recent-view-all" onClick={onProgress}>View All</button>
                    </div>
                    <div className="recent-list">
                        {recentSessions.slice(0, 5).map((s) => {
                            const d = new Date(s.date + "T00:00:00");
                            const today = new Date();
                            const diffDays = Math.round((today.getTime() - d.getTime()) / 86400000);
                            const label = diffDays === 0 ? "Today" : diffDays === 1 ? "Yesterday" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                            return (
                                <div key={s.id} className="recent-row">
                                    <span className="recent-name">{s.title}</span>
                                    <span className="recent-date">{label}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </>
    );
}
