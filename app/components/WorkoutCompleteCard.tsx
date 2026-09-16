"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Calendar, Share2 } from "lucide-react";
import type { WorkoutExercise, SetEntry, SessionSummary, TodaySession } from "../lib/useWorkoutSession";
import { formatClock, kgToUnit } from "../lib/useWorkoutSession";

type Props = {
    dayTitle: string;
    summary: SessionSummary;
    exercisesList: WorkoutExercise[];
    logs: Record<string, SetEntry[]>;
    todaySessions: TodaySession[];
    weekDays: boolean[];
    prCount: number;
    weightUnit: string;
    sessionRating: number | null;
    cycleProfile: { phase: string; cycleDay: number; styleName: string; banner: { color: string } } | null;
    sharing: boolean;
    maxSessions: number;
    sessionCount: number;
    nextSession: { name: string; exerciseCount: number; dayLabel: string } | null;
    onRate: (val: number) => void;
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

.rating-section { margin-top: 16px; text-align: center; }
.rating-label { font-family: 'JetBrains Mono', monospace; font-size: 7px; letter-spacing: 2px; color: var(--fg-35); margin-bottom: 8px; }
.rating-row { display: flex; justify-content: center; gap: 6px; }
.rating-btn { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 6px 10px; border-radius: 10px; border: 1px solid rgb(var(--accent-rgb) / 0.08); background: transparent; cursor: pointer; transition: all 0.2s; }
.rating-btn:hover { border-color: rgb(var(--accent-rgb) / 0.2); background: rgb(var(--accent-rgb) / 0.04); }
.rating-btn.selected { background: rgb(var(--accent-rgb) / 0.15); border-color: rgb(var(--accent-rgb) / 0.4); transform: scale(1.1); }
.rating-btn.dimmed { opacity: 0.35; }
.rating-emoji { font-size: 20px; line-height: 1; }
.rating-text { font-family: 'JetBrains Mono', monospace; font-size: 7px; color: var(--fg-35); }
.rating-btn.selected .rating-text { color: rgb(var(--accent-rgb)); }

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
`;

/* ─── MUSCLE SCANNER CANVAS ─── */
function MuscleScanner({ hitSegments, side }: { hitSegments: Set<string>; side: "front" | "back" }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animRef = useRef(0);
    const frameRef = useRef(0);

    const segmentToMuscle: Record<string, string[]> = useMemo(() => ({
        Chest: ["lpec", "rpec"], Shoulders: ["lfdelt", "rfdelt", "lrdelt", "rrdelt"],
        Biceps: ["lbicep", "rbicep"], Triceps: ["ltri", "rtri"],
        Back: ["uback", "traps", "llat", "rlat", "lback"], Core: ["abs", "lobl", "robl"],
        Legs: ["lquad", "rquad", "lham", "rham", "lshin", "rshin", "lcalf", "rcalf"],
        Glutes: ["glutes"], Forearms: ["lfarm", "rfarm"], Traps: ["traps"],
    }), []);

    const activeMuscles = useMemo(() => {
        const s = new Set<string>();
        hitSegments.forEach(seg => { segmentToMuscle[seg]?.forEach(m => s.add(m)); });
        return s;
    }, [hitSegments, segmentToMuscle]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d")!;
        if (!ctx) return;
        const W = 300, H = 560, CX = 150;
        type M = { name: string; intensity: number; phase: number; amp: number; path: (c: CanvasRenderingContext2D) => void };

        function i(name: string, hi: number) { return activeMuscles.has(name) ? hi : 0; }

        const front: M[] = [
            { name:"head", intensity:0, phase:0, amp:0, path:c=>{c.ellipse(CX,40,20,24,0,0,Math.PI*2);} },
            { name:"neck", intensity:0, phase:0, amp:0, path:c=>{c.moveTo(CX-9,62);c.lineTo(CX-11,80);c.lineTo(CX+11,80);c.lineTo(CX+9,62);c.closePath();} },
            { name:"lpec", intensity:i("lpec",0.95), phase:0, amp:0.08, path:c=>{c.moveTo(CX-4,92);c.quadraticCurveTo(CX-8,88,CX-38,84);c.quadraticCurveTo(CX-50,86,CX-52,96);c.lineTo(CX-48,120);c.quadraticCurveTo(CX-40,134,CX-20,138);c.quadraticCurveTo(CX-8,136,CX-4,128);c.closePath();} },
            { name:"rpec", intensity:i("rpec",0.95), phase:0.1, amp:0.08, path:c=>{c.moveTo(CX+4,92);c.quadraticCurveTo(CX+8,88,CX+38,84);c.quadraticCurveTo(CX+50,86,CX+52,96);c.lineTo(CX+48,120);c.quadraticCurveTo(CX+40,134,CX+20,138);c.quadraticCurveTo(CX+8,136,CX+4,128);c.closePath();} },
            { name:"lfdelt", intensity:i("lfdelt",0.85), phase:0.4, amp:0.07, path:c=>{c.moveTo(CX-38,82);c.quadraticCurveTo(CX-56,76,CX-70,82);c.quadraticCurveTo(CX-78,90,CX-76,102);c.lineTo(CX-70,116);c.lineTo(CX-56,108);c.lineTo(CX-52,94);c.closePath();} },
            { name:"rfdelt", intensity:i("rfdelt",0.85), phase:0.5, amp:0.07, path:c=>{c.moveTo(CX+38,82);c.quadraticCurveTo(CX+56,76,CX+70,82);c.quadraticCurveTo(CX+78,90,CX+76,102);c.lineTo(CX+70,116);c.lineTo(CX+56,108);c.lineTo(CX+52,94);c.closePath();} },
            { name:"lbicep", intensity:i("lbicep",0.7), phase:0.6, amp:0.05, path:c=>{c.moveTo(CX-70,118);c.lineTo(CX-74,172);c.quadraticCurveTo(CX-76,182,CX-68,184);c.lineTo(CX-58,180);c.lineTo(CX-56,118);c.closePath();} },
            { name:"rbicep", intensity:i("rbicep",0.7), phase:0.7, amp:0.05, path:c=>{c.moveTo(CX+70,118);c.lineTo(CX+74,172);c.quadraticCurveTo(CX+76,182,CX+68,184);c.lineTo(CX+58,180);c.lineTo(CX+56,118);c.closePath();} },
            { name:"lfarm", intensity:i("lfarm",0.5), phase:0, amp:0, path:c=>{c.moveTo(CX-68,188);c.lineTo(CX-72,260);c.quadraticCurveTo(CX-74,270,CX-68,272);c.lineTo(CX-58,268);c.lineTo(CX-56,188);c.closePath();} },
            { name:"rfarm", intensity:i("rfarm",0.5), phase:0, amp:0, path:c=>{c.moveTo(CX+68,188);c.lineTo(CX+72,260);c.quadraticCurveTo(CX+74,270,CX+68,272);c.lineTo(CX+58,268);c.lineTo(CX+56,188);c.closePath();} },
            { name:"abs", intensity:i("abs",0.6), phase:0.9, amp:0.04, path:c=>{c.moveTo(CX-18,140);c.lineTo(CX-20,200);c.quadraticCurveTo(CX-22,240,CX-18,254);c.lineTo(CX+18,254);c.quadraticCurveTo(CX+22,240,CX+20,200);c.lineTo(CX+18,140);c.closePath();} },
            { name:"lobl", intensity:i("lobl",0.4), phase:0, amp:0, path:c=>{c.moveTo(CX-48,124);c.lineTo(CX-44,180);c.quadraticCurveTo(CX-40,220,CX-34,248);c.lineTo(CX-20,248);c.lineTo(CX-20,200);c.lineTo(CX-22,140);c.closePath();} },
            { name:"robl", intensity:i("robl",0.4), phase:0, amp:0, path:c=>{c.moveTo(CX+48,124);c.lineTo(CX+44,180);c.quadraticCurveTo(CX+40,220,CX+34,248);c.lineTo(CX+20,248);c.lineTo(CX+20,200);c.lineTo(CX+22,140);c.closePath();} },
            { name:"lquad", intensity:i("lquad",0.65), phase:0, amp:0.03, path:c=>{c.moveTo(CX-32,258);c.lineTo(CX-36,380);c.quadraticCurveTo(CX-34,394,CX-26,396);c.lineTo(CX-6,396);c.lineTo(CX-4,258);c.closePath();} },
            { name:"rquad", intensity:i("rquad",0.65), phase:0, amp:0.03, path:c=>{c.moveTo(CX+32,258);c.lineTo(CX+36,380);c.quadraticCurveTo(CX+34,394,CX+26,396);c.lineTo(CX+6,396);c.lineTo(CX+4,258);c.closePath();} },
            { name:"lshin", intensity:i("lshin",0.3), phase:0, amp:0, path:c=>{c.moveTo(CX-34,400);c.lineTo(CX-36,500);c.lineTo(CX-40,530);c.lineTo(CX-8,530);c.lineTo(CX-8,400);c.closePath();} },
            { name:"rshin", intensity:i("rshin",0.3), phase:0, amp:0, path:c=>{c.moveTo(CX+34,400);c.lineTo(CX+36,500);c.lineTo(CX+40,530);c.lineTo(CX+8,530);c.lineTo(CX+8,400);c.closePath();} },
        ];
        const back: M[] = [
            { name:"head", intensity:0, phase:0, amp:0, path:c=>{c.ellipse(CX,40,20,24,0,0,Math.PI*2);} },
            { name:"neck", intensity:0, phase:0, amp:0, path:c=>{c.moveTo(CX-9,62);c.lineTo(CX-11,80);c.lineTo(CX+11,80);c.lineTo(CX+9,62);c.closePath();} },
            { name:"traps", intensity:i("traps",0.6), phase:0, amp:0.04, path:c=>{c.moveTo(CX-12,80);c.quadraticCurveTo(CX-30,78,CX-48,84);c.lineTo(CX-40,108);c.lineTo(CX-8,100);c.lineTo(CX-4,92);c.closePath();c.moveTo(CX+12,80);c.quadraticCurveTo(CX+30,78,CX+48,84);c.lineTo(CX+40,108);c.lineTo(CX+8,100);c.lineTo(CX+4,92);c.closePath();} },
            { name:"lrdelt", intensity:i("lrdelt",0.55), phase:0.6, amp:0.05, path:c=>{c.moveTo(CX-48,82);c.quadraticCurveTo(CX-66,76,CX-72,86);c.quadraticCurveTo(CX-78,96,CX-74,108);c.lineTo(CX-66,116);c.lineTo(CX-54,106);c.lineTo(CX-50,92);c.closePath();} },
            { name:"rrdelt", intensity:i("rrdelt",0.55), phase:0.7, amp:0.05, path:c=>{c.moveTo(CX+48,82);c.quadraticCurveTo(CX+66,76,CX+72,86);c.quadraticCurveTo(CX+78,96,CX+74,108);c.lineTo(CX+66,116);c.lineTo(CX+54,106);c.lineTo(CX+50,92);c.closePath();} },
            { name:"uback", intensity:i("uback",0.5), phase:0, amp:0, path:c=>{c.moveTo(CX-6,92);c.lineTo(CX-38,88);c.lineTo(CX-42,130);c.quadraticCurveTo(CX-30,142,CX-6,140);c.closePath();c.moveTo(CX+6,92);c.lineTo(CX+38,88);c.lineTo(CX+42,130);c.quadraticCurveTo(CX+30,142,CX+6,140);c.closePath();} },
            { name:"ltri", intensity:i("ltri",0.6), phase:0.2, amp:0.05, path:c=>{c.moveTo(CX-66,118);c.lineTo(CX-72,174);c.quadraticCurveTo(CX-74,184,CX-66,186);c.lineTo(CX-56,182);c.lineTo(CX-54,118);c.closePath();} },
            { name:"rtri", intensity:i("rtri",0.6), phase:0.3, amp:0.05, path:c=>{c.moveTo(CX+66,118);c.lineTo(CX+72,174);c.quadraticCurveTo(CX+74,184,CX+66,186);c.lineTo(CX+56,182);c.lineTo(CX+54,118);c.closePath();} },
            { name:"lfarm", intensity:i("lfarm",0.4), phase:0, amp:0, path:c=>{c.moveTo(CX-66,190);c.lineTo(CX-70,262);c.quadraticCurveTo(CX-72,272,CX-66,274);c.lineTo(CX-56,270);c.lineTo(CX-54,190);c.closePath();} },
            { name:"rfarm", intensity:i("rfarm",0.4), phase:0, amp:0, path:c=>{c.moveTo(CX+66,190);c.lineTo(CX+70,262);c.quadraticCurveTo(CX+72,272,CX+66,274);c.lineTo(CX+56,270);c.lineTo(CX+54,190);c.closePath();} },
            { name:"llat", intensity:i("llat",0.5), phase:0, amp:0, path:c=>{c.moveTo(CX-42,134);c.lineTo(CX-46,190);c.quadraticCurveTo(CX-42,220,CX-36,244);c.lineTo(CX-22,244);c.lineTo(CX-20,160);c.closePath();} },
            { name:"rlat", intensity:i("rlat",0.5), phase:0, amp:0, path:c=>{c.moveTo(CX+42,134);c.lineTo(CX+46,190);c.quadraticCurveTo(CX+42,220,CX+36,244);c.lineTo(CX+22,244);c.lineTo(CX+20,160);c.closePath();} },
            { name:"lback", intensity:i("lback",0.35), phase:0, amp:0, path:c=>{c.moveTo(CX-18,160);c.lineTo(CX-20,244);c.lineTo(CX+20,244);c.lineTo(CX+18,160);c.closePath();} },
            { name:"glutes", intensity:i("glutes",0.5), phase:0, amp:0, path:c=>{c.moveTo(CX-34,248);c.quadraticCurveTo(CX-36,268,CX-28,280);c.quadraticCurveTo(CX-14,290,CX,286);c.quadraticCurveTo(CX+14,290,CX+28,280);c.quadraticCurveTo(CX+36,268,CX+34,248);c.closePath();} },
            { name:"lham", intensity:i("lham",0.55), phase:0, amp:0, path:c=>{c.moveTo(CX-30,284);c.lineTo(CX-34,388);c.quadraticCurveTo(CX-32,398,CX-24,400);c.lineTo(CX-4,400);c.lineTo(CX-2,284);c.closePath();} },
            { name:"rham", intensity:i("rham",0.55), phase:0, amp:0, path:c=>{c.moveTo(CX+30,284);c.lineTo(CX+34,388);c.quadraticCurveTo(CX+32,398,CX+24,400);c.lineTo(CX+4,400);c.lineTo(CX+2,284);c.closePath();} },
            { name:"lcalf", intensity:i("lcalf",0.3), phase:0, amp:0, path:c=>{c.moveTo(CX-32,404);c.lineTo(CX-34,500);c.lineTo(CX-38,530);c.lineTo(CX-6,530);c.lineTo(CX-6,404);c.closePath();} },
            { name:"rcalf", intensity:i("rcalf",0.3), phase:0, amp:0, path:c=>{c.moveTo(CX+32,404);c.lineTo(CX+34,500);c.lineTo(CX+38,530);c.lineTo(CX+6,530);c.lineTo(CX+6,404);c.closePath();} },
        ];

        function muscleColor(intensity: number) {
            if (intensity <= 0.05) return { fill:"rgba(35,42,56,0.9)", stroke:"rgba(55,65,85,0.4)", glow:null as string|null };
            const t = Math.min(1,(intensity-0.05)/0.95);
            const r=Math.round(30+t*44),g=Math.round(60+t*162),b=Math.round(50+t*78),a=0.3+t*0.6;
            return { fill:`rgba(${r},${g},${b},${a})`, stroke:`rgba(74,222,128,${(0.15+t*0.45).toFixed(2)})`, glow:t>0.4?`rgba(74,222,128,${(t*0.25).toFixed(2)})`:null };
        }

        const muscles = side === "front" ? front : back;
        const seeds = muscles.map(() => Math.random() * 1000);

        function render() {
            frameRef.current++;
            const t = frameRef.current * 0.015;
            ctx.clearRect(0, 0, W, H);
            const scanY = (t * 40) % (H + 60) - 30;
            muscles.forEach((m, idx) => {
                const breathe = Math.sin(t + m.phase * Math.PI * 2);
                const flicker = Math.sin(t * 3.9 + seeds[idx]) * 0.02 + Math.sin(t * 7.7 + seeds[idx] * 2.1) * 0.01;
                const intNow = Math.max(0, Math.min(1, m.intensity * (1 + breathe * m.amp + flicker)));
                const colors = muscleColor(intNow);
                if (colors.glow) { ctx.save(); ctx.shadowColor = colors.glow; ctx.shadowBlur = 12 + intNow * 8; ctx.beginPath(); m.path(ctx); ctx.fillStyle = colors.fill; ctx.fill(); ctx.restore(); }
                ctx.save(); ctx.beginPath(); m.path(ctx); ctx.fillStyle = colors.fill; ctx.fill(); ctx.restore();
                ctx.save(); ctx.beginPath(); m.path(ctx); ctx.strokeStyle = colors.stroke; ctx.lineWidth = 0.8; ctx.stroke(); ctx.restore();
            });
            const sg = ctx.createLinearGradient(0, scanY - 20, 0, scanY + 20);
            sg.addColorStop(0,"rgba(74,222,128,0)"); sg.addColorStop(0.4,"rgba(74,222,128,0.06)"); sg.addColorStop(0.5,"rgba(74,222,128,0.12)"); sg.addColorStop(0.6,"rgba(74,222,128,0.06)"); sg.addColorStop(1,"rgba(74,222,128,0)");
            ctx.fillStyle = sg; ctx.fillRect(0, scanY - 20, W, 40);
            ctx.strokeStyle = "rgba(74,222,128,0.03)"; ctx.lineWidth = 0.5;
            for (let y=0;y<H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
            for (let x=0;x<W;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
            animRef.current = requestAnimationFrame(render);
        }
        render();
        return () => cancelAnimationFrame(animRef.current);
    }, [activeMuscles, side]);

    return <canvas ref={canvasRef} className="scanner-canvas" width={300} height={560} style={{width:"130px",height:"243px"}} />;
}

/* ─── MAIN COMPONENT ─── */
export default function WorkoutCompleteCard({
    dayTitle, summary, exercisesList, logs, todaySessions, weekDays, prCount, weightUnit,
    sessionRating, cycleProfile, sharing, maxSessions, sessionCount, nextSession,
    onRate, onShare, onSchedule, onProgress, onStartAnother,
}: Props) {
    const [openExercise, setOpenExercise] = useState<number | null>(null);
    const [inscription] = useState(() => INSCRIPTIONS[Math.floor(Math.random() * INSCRIPTIONS.length)]);
    const setsRef = useRef<HTMLSpanElement>(null);
    const volRef = useRef<HTMLSpanElement>(null);
    const durRef = useRef<HTMLSpanElement>(null);

    const hitSegments = useMemo(() => {
        const s = new Set<string>();
        exercisesList.forEach(ex => { if (logs[ex.id]?.some(s => s.completed)) s.add(ex.body_segment); });
        return s;
    }, [exercisesList, logs]);

    type BestMoment = { name: string; weight: number; reps: number; isPr: boolean };
    const bestMoment = useMemo<BestMoment | null>(() => {
        let best: BestMoment | null = null;
        let bestVol = 0;
        for (const ex of exercisesList) {
            for (const s of (logs[ex.id] ?? []).filter(s => s.completed && !s.is_warmup)) {
                const w = Number(s.weight) || 0, r = Number(s.reps) || 0, v = w * r;
                if (v > 0 && v > bestVol) { best = { name: ex.name, weight: w, reps: r, isPr: prCount > 0 }; bestVol = v; }
            }
        }
        return best;
    }, [exercisesList, logs, prCount]);

    const exerciseDetails = useMemo(() => exercisesList.map((ex, idx) => {
        const sets = (logs[ex.id] ?? []).filter(s => s.completed && !s.is_warmup);
        return { idx: idx + 1, name: ex.name, sets, segment: ex.body_segment };
    }).filter(e => e.sets.length > 0), [exercisesList, logs]);

    const rpeData = useMemo(() => {
        const d: { rpe: number }[] = [];
        exercisesList.forEach(ex => (logs[ex.id] ?? []).filter(s => s.completed && !s.is_warmup && s.rpe).forEach(s => d.push({ rpe: s.rpe! })));
        return d;
    }, [exercisesList, logs]);

    const doneCount = weekDays.filter(Boolean).length;
    const ringOffset = 113 - (doneCount / 7) * 113;
    const dur = summary.duration;
    const durMin = Math.floor(dur / 60);
    const unit = weightUnit as "kg" | "lbs";
    const vol = Math.round(kgToUnit(summary.volume, unit));
    const xpPct = Math.min(((summary.xpBreakdown.total % 100) / 100) * 100, 100);
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" }).toUpperCase() + " · " + formatClock(dur);

    // Counter animation
    useEffect(() => {
        const animate = (el: HTMLSpanElement | null, target: number, delay: number) => {
            if (!el) return;
            const node = el;
            const start = performance.now();
            function tick(now: number) {
                const elapsed = now - start - delay;
                if (elapsed < 0) { requestAnimationFrame(tick); return; }
                const p = Math.min(elapsed / 1200, 1);
                const eased = 1 - Math.pow(1 - p, 3);
                node.textContent = Math.round(target * eased).toLocaleString();
                if (p < 1) requestAnimationFrame(tick);
            }
            requestAnimationFrame(tick);
        };
        animate(setsRef.current, summary.sets, 1100);
        animate(volRef.current, vol, 1100);
        animate(durRef.current, durMin, 1100);
    }, [summary.sets, vol, durMin]);

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

                        {/* 2. Workout name + date */}
                        <div className="reveal d2">
                            <div className="workout-name">{dayTitle}</div>
                            <div className="workout-date">{dateStr}</div>
                        </div>

                        {/* Session Rating */}
                        <div className="reveal d3">
                            <div className="rating-section">
                                <div className="rating-label">HOW WAS THIS SESSION?</div>
                                <div className="rating-row">
                                    {[{ emoji:"😵", label:"Brutal" },{ emoji:"😐", label:"Meh" },{ emoji:"😊", label:"Good" },{ emoji:"💪", label:"Strong" },{ emoji:"🔥", label:"Fire" }].map((r,i) => {
                                        const val = i + 1;
                                        const selected = sessionRating === val;
                                        return (
                                            <button key={val} onClick={() => onRate(val)} className={`rating-btn ${selected ? "selected" : sessionRating ? "dimmed" : ""}`}>
                                                <span className="rating-emoji">{r.emoji}</span>
                                                <span className="rating-text">{r.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
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
                                    <span className="xp-earned">+{summary.xpBreakdown.total} XP</span>
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

                        {/* 5. Best moment */}
                        {bestMoment && (
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

                        {/* 6. RPE heatmap */}
                        {rpeData.length > 0 && (
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

                        {/* 7. Exercise list */}
                        {exerciseDetails.length > 0 && (
                            <div className="reveal d8">
                                <div className="exercise-header-label">EXERCISES LOGGED</div>
                                <div className="exercise-list">
                                    {exerciseDetails.map((ex) => {
                                        const isOpen = openExercise === ex.idx;
                                        const totalW = ex.sets.length > 0 ? (Number(ex.sets[0].weight) || 0) : 0;
                                        const totalR = ex.sets.length > 0 ? (Number(ex.sets[0].reps) || 0) : 0;
                                        return (
                                            <div key={ex.idx} className={`exercise-row ${isOpen ? "open" : ""}`} onClick={() => setOpenExercise(isOpen ? null : ex.idx)}>
                                                <div className="exercise-main">
                                                    <div className="exercise-name">
                                                        <span className="exercise-idx">{ex.idx}</span>
                                                        <span className="exercise-name-text">{ex.name}</span>
                                                    </div>
                                                    <div className="exercise-detail">
                                                        {ex.sets.length}×{totalR} · {kgToUnit(totalW, unit)}{weightUnit}
                                                        <span className="expand-arrow">{"▾"}</span>
                                                    </div>
                                                </div>
                                                <div className="set-detail">
                                                    {ex.sets.map((s, j) => (
                                                        <div key={j} className="set-line">
                                                            <span className="set-num">Set {j + 1}</span>
                                                            <span className="set-data">{kgToUnit(Number(s.weight) || 0, unit)}{weightUnit} × {s.reps}</span>
                                                            {s.rpe && <span className={`set-rpe ${rpeClass(s.rpe)}`}>RPE {s.rpe}</span>}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* 8. Muscle scanner */}
                        {hitSegments.size > 0 && (
                            <div className="reveal d9">
                                <div className="muscle-section">
                                    <div className="muscle-label">MUSCLES ACTIVATED</div>
                                    <div className="scanner-wrap">
                                        <div className="scanner-view">
                                            <div className="scanner-view-label">FRONT</div>
                                            <MuscleScanner hitSegments={hitSegments} side="front" />
                                        </div>
                                        <div className="scanner-view">
                                            <div className="scanner-view-label">BACK</div>
                                            <MuscleScanner hitSegments={hitSegments} side="back" />
                                        </div>
                                    </div>
                                    <div className="muscle-tags">
                                        {Array.from(hitSegments).filter(s => s !== "Cardio" && s !== "Other").map(seg => (
                                            <span key={seg} className="muscle-tag primary">{seg}</span>
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
        </>
    );
}
