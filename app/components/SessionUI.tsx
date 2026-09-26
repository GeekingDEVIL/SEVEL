"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Check, ChevronDown, ChevronRight, RefreshCw, Dumbbell, TrendingUp, Pause, Info } from "lucide-react";
import { useSwipeable } from "react-swipeable";

/* ─── CARD WRAPPER ─── */
export function CardPanel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`rounded-2xl border border-[var(--fg-06)] bg-[var(--fg-03)] ${className}`}>{children}</div>
    );
}

/* ─── MUSCLE HIT MAP ─── */
const MUSCLE_REGIONS: Record<string, { label: string; paths: string[] }> = {
    Chest:     { label: "Chest",     paths: ["M32,28 Q40,26 48,28 L48,36 Q40,38 32,36 Z"] },
    Shoulders: { label: "Shoulders", paths: ["M24,24 Q28,22 32,26 L32,30 Q28,30 24,28 Z", "M48,26 Q52,22 56,24 L56,28 Q52,30 48,30 Z"] },
    Biceps:    { label: "Biceps",    paths: ["M20,32 Q22,30 24,32 L24,42 Q22,44 20,42 Z", "M56,32 Q58,30 60,32 L60,42 Q58,44 56,42 Z"] },
    Triceps:   { label: "Triceps",   paths: ["M16,32 Q18,30 20,32 L20,42 Q18,44 16,42 Z", "M60,32 Q62,30 64,32 L64,42 Q62,44 60,42 Z"] },
    Forearms:  { label: "Forearms",  paths: ["M18,44 Q20,42 22,44 L21,54 Q19,55 17,54 Z", "M58,44 Q60,42 62,44 L63,54 Q61,55 59,54 Z"] },
    Core:      { label: "Core",      paths: ["M34,38 Q40,37 46,38 L46,52 Q40,54 34,52 Z"] },
    Back:      { label: "Back",      paths: ["M33,28 Q40,26 47,28 L47,38 Q40,40 33,38 Z"] },
    Traps:     { label: "Traps",     paths: ["M30,20 Q40,18 50,20 L48,26 Q40,24 32,26 Z"] },
    Legs:      { label: "Legs",      paths: ["M30,54 Q34,52 38,54 L37,72 Q33,74 29,72 Z", "M42,54 Q46,52 50,54 L51,72 Q47,74 43,72 Z"] },
    Glutes:    { label: "Glutes",    paths: ["M32,50 Q40,48 48,50 L48,56 Q40,58 32,56 Z"] },
};

export function MuscleHitMap({ hitSegments }: { hitSegments: Set<string> }) {
    if (hitSegments.size === 0) return null;
    const hitCount = hitSegments.size;
    return (
        <div className="glass-card p-3 mb-4">
            <p className="text-[9px] font-mono tracking-widest text-[var(--fg-25)] mb-2 text-center">MUSCLES TARGETED</p>
            <div className="flex items-center justify-center gap-4">
                <svg viewBox="10 14 60 64" width="90" height="90" className="shrink-0">
                    {Object.entries(MUSCLE_REGIONS).map(([seg, { paths }]) => {
                        const hit = hitSegments.has(seg);
                        return paths.map((d, i) => (
                            <path
                                key={`${seg}-${i}`}
                                d={d}
                                fill={hit ? "rgb(var(--accent-rgb) / 0.5)" : "rgb(var(--fg-rgb) / 0.06)"}
                                stroke={hit ? "rgb(var(--accent-rgb) / 0.7)" : "rgb(var(--fg-rgb) / 0.1)"}
                                strokeWidth="0.5"
                                strokeLinejoin="round"
                            />
                        ));
                    })}
                </svg>
                <div className="flex flex-wrap gap-1 max-w-[180px]">
                    {Array.from(hitSegments).filter(s => s !== "Cardio" && s !== "Other").map(seg => (
                        <span key={seg} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[rgb(var(--accent-rgb)/0.1)] border border-[rgb(var(--accent-rgb)/0.2)] text-[rgb(var(--accent-light-rgb))]">
                            {seg}
                        </span>
                    ))}
                    {hitCount > 0 && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 text-[var(--fg-25)]">
                            {hitCount} group{hitCount !== 1 ? "s" : ""}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ─── STAT CELL ─── */
export function StatCell({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
    return (
        <div className="glass-card px-3 py-2.5 text-center">
            <p className="text-[8px] font-mono tracking-widest text-[var(--fg-25)] mb-0.5">{label}</p>
            <p className={`text-lg font-bold font-mono ${accent ? "text-[rgb(var(--accent-rgb))]" : "text-[var(--fg-90)]"}`}>{value}</p>
        </div>
    );
}

/* ─── SWIPE-TO-COMPLETE SET ─── */
const SWIPE_THRESHOLD = 80;

export function SwipeSet({ completed, onComplete, children }: { completed: boolean; onComplete: () => void; children: React.ReactNode }) {
    const [dragX, setDragX] = useState(0);
    const [swiping, setSwiping] = useState(false);
    const pastThreshold = dragX >= SWIPE_THRESHOLD;

    const handlers = useSwipeable({
        onSwiping: (e) => {
            if (completed || e.dir !== "Right") return;
            setSwiping(true);
            setDragX(Math.max(0, Math.min(e.deltaX, SWIPE_THRESHOLD * 1.5)));
        },
        onSwiped: (e) => {
            if (!completed && e.dir === "Right" && e.deltaX >= SWIPE_THRESHOLD) {
                onComplete();
            }
            setDragX(0);
            setSwiping(false);
        },
        trackMouse: true,
    });

    if (completed) return <>{children}</>;

    return (
        <div className="relative overflow-hidden rounded-lg">
            <div
                className="absolute inset-0 flex items-center pl-4 bg-[rgb(var(--accent-rgb)/0.2)] rounded-lg pointer-events-none"
                style={{ opacity: dragX > 4 ? 1 : 0 }}
            >
                <span className={`text-[10px] font-mono font-bold flex items-center gap-1.5 transition-transform ${pastThreshold ? "text-[rgb(var(--accent-light-rgb))] scale-110" : "text-[rgb(var(--accent-light-rgb)/0.7)]"}`}>
                    <Check size={pastThreshold ? 16 : 12} />
                    {pastThreshold ? "RELEASE TO LOG" : "SWIPE TO LOG →"}
                </span>
            </div>
            <div {...handlers} style={{ transform: `translateX(${dragX}px)`, transition: swiping ? "none" : "transform 0.2s ease" }}>
                {children}
            </div>
        </div>
    );
}

/* ─── SPLIT-FLAP DIGIT ─── */
export function FlapDigit({ digit, delay = 0 }: { digit: string; delay?: number }) {
    const isNum = /\d/.test(digit);
    const [current, setCurrent] = useState(digit);
    const [prev, setPrev] = useState(digit);
    const [flipping, setFlipping] = useState(false);
    const [highlight, setHighlight] = useState(false);
    const prevRef = useRef(digit);

    const innerTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
    useEffect(() => {
        if (digit === prevRef.current) return;
        const old = prevRef.current;
        prevRef.current = digit;
        if (!isNum) { setCurrent(digit); setPrev(digit); return; }
        const t0 = setTimeout(() => {
            setPrev(old);
            setFlipping(true);
            setHighlight(true);
            const t1 = setTimeout(() => { setCurrent(digit); }, 150);
            const t2 = setTimeout(() => { setFlipping(false); setPrev(digit); }, 300);
            const t3 = setTimeout(() => { setHighlight(false); }, 600);
            innerTimers.current = [t1, t2, t3];
        }, delay);
        return () => { clearTimeout(t0); innerTimers.current.forEach(clearTimeout); innerTimers.current = []; };
    }, [digit, delay, isNum]);

    if (!isNum) return <span className="inline-flex items-center justify-center w-[0.3em] text-[var(--fg-15)]">{digit}</span>;

    return (
        <span className="flap-slot inline-flex relative" style={{ width: "0.65em", height: "1.3em" }}>
            <span className="absolute inset-0 rounded-[3px] flap-track" />
            <span className="absolute inset-0 flex items-center justify-center flap-digit-text" style={{ clipPath: "inset(50% 0 0 0)" }}>
                {current}
            </span>
            <span className={`absolute inset-0 flex items-center justify-center flap-digit-text ${highlight ? "flap-highlight" : ""}`} style={{ clipPath: "inset(0 0 50% 0)" }}>
                {current}
            </span>
            {flipping && (
                <span className="absolute inset-0 flex items-center justify-center flap-digit-text flap-flip" style={{ clipPath: "inset(0 0 50% 0)", transformOrigin: "bottom center" }}>
                    {prev}
                </span>
            )}
            <span className="absolute left-[1px] right-[1px] top-1/2 h-px bg-[var(--fg-06)]" />
        </span>
    );
}

export function FlapNumber({ value, suffix = "", accent = false }: { value: string; suffix?: string; accent?: boolean }) {
    const chars = value.split("");
    const len = chars.length;
    return (
        <span className={`inline-flex items-center font-mono font-bold tabular-nums gap-px ${accent ? "flap-accent" : ""}`}>
            {chars.map((ch, i) => <FlapDigit key={`${len}-${i}`} digit={ch} delay={(len - 1 - i) * 60} />)}
            {suffix && <span className="text-[0.4em] font-medium text-[var(--fg-25)] self-end mb-[0.15em] ml-1">{suffix}</span>}
        </span>
    );
}

export function DeltaToast({ value }: { value: number }) {
    const [show, setShow] = useState(true);
    useEffect(() => { const t = setTimeout(() => setShow(false), 1500); return () => clearTimeout(t); }, []);
    if (!show || value <= 0) return null;
    return (
        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[11px] font-mono font-bold text-emerald-400 animate-delta-fly pointer-events-none whitespace-nowrap">
            +{Math.round(value).toLocaleString()}
        </span>
    );
}

/* ─── MINI RUNE CIRCLE PROGRESS ─── */
export const RUNE_PATHS = [
    "M8 16V4M8 4L3 0M8 4L13 0",
    "M8 16V0M8 0L3 5M8 0L13 5",
    "M3 0L13 8L3 16",
    "M8 0L16 8L8 16L0 8Z",
    "M0 0H16L0 16H16M0 0V16M16 0V16",
    "M4 16V6L8 0L12 6V16M4 6H12",
    "M3 0L13 6L3 10L13 16",
    "M0 16V0L8 10L16 0V16",
    "M3 16V0M3 0L13 4M3 7L13 11",
    "M4 16V0M4 0H12L12 8H4",
    "M4 16V0H11L11 7H4M8 7L13 16",
    "M0 0L16 16M16 0L0 16",
    "M3 0V16M13 0V16M3 8H13",
    "M8 0V16M4 0H12M4 16H12",
    "M8 0V16M3 5L13 11",
    "M4 16V0M4 4L12 8M4 8L12 12",
];

export function useRunePathParser() {
    return useMemo(() => RUNE_PATHS.map((d) => {
        const cmds: Array<{ type: string; args: number[] }> = [];
        const re = /([MLHVZ])([^MLHVZ]*)/gi;
        let m;
        while ((m = re.exec(d)) !== null) {
            const type = m[1].toUpperCase();
            const args = m[2].trim().split(/[\s,]+/).filter(Boolean).map(Number);
            cmds.push({ type, args });
        }
        return cmds;
    }), []);
}

export type ParsedRunePath = Array<{ type: string; args: number[] }>;

export function drawRune(ctx: CanvasRenderingContext2D, cmds: ParsedRunePath, cx: number, cy: number, glyphSize: number, drawFraction = 1) {
    const scale = glyphSize / 16;
    const ox = cx - glyphSize / 2;
    const oy = cy - glyphSize / 2;
    let curX = 0, curY = 0;
    const segments: Array<[number, number, number, number]> = [];
    for (const { type, args } of cmds) {
        switch (type) {
            case "M": curX = args[0]; curY = args[1]; break;
            case "L": segments.push([curX, curY, args[0], args[1]]); curX = args[0]; curY = args[1]; break;
            case "H": segments.push([curX, curY, args[0], curY]); curX = args[0]; break;
            case "V": segments.push([curX, curY, curX, args[0]]); curY = args[0]; break;
            case "Z": break;
        }
    }
    const totalSegs = segments.length;
    const segsToShow = Math.ceil(totalSegs * drawFraction);
    ctx.beginPath();
    for (let si = 0; si < segsToShow; si++) {
        const [x1, y1, x2, y2] = segments[si];
        const sx1 = ox + x1 * scale, sy1 = oy + y1 * scale;
        const sx2 = ox + x2 * scale, sy2 = oy + y2 * scale;
        if (si === segsToShow - 1 && drawFraction < 1) {
            const segFrac = (drawFraction * totalSegs) - si;
            ctx.moveTo(sx1, sy1);
            ctx.lineTo(sx1 + (sx2 - sx1) * segFrac, sy1 + (sy2 - sy1) * segFrac);
        } else {
            ctx.moveTo(sx1, sy1);
            ctx.lineTo(sx2, sy2);
        }
    }
    ctx.stroke();
}

export function MiniRuneCircle({ completed, total, circleSize = 64 }: { completed: number; total: number; circleSize?: number }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const stateRef = useRef({
        prevCompleted: completed,
        flashRunes: new Map<number, number>(),
        shimmerAngle: 0,
        revealProgress: new Map<number, number>(),
        globalRotation: 0,
    });
    const frameRef = useRef(0);
    const accentRef = useRef("45, 212, 191");

    const cTotal = Math.max(total, 1);
    const cCompleted = Math.min(completed, cTotal);
    const SIZE = circleSize;
    const RADIUS = SIZE * 0.36;
    const GLYPH_SIZE = Math.max(5, SIZE * 0.09);

    const parsedPaths = useRunePathParser();

    const getAngle = useCallback((i: number, rot: number) => (i / cTotal) * Math.PI * 2 - Math.PI / 2 + rot, [cTotal]);

    useEffect(() => {
        const st = stateRef.current;
        if (completed > st.prevCompleted) {
            const prev = st.prevCompleted;
            for (let i = prev; i < completed; i++) {
                st.flashRunes.set(i, 0);
                st.revealProgress.set(i, 0);
            }
            st.prevCompleted = completed;
        } else {
            st.prevCompleted = completed;
        }
    }, [completed]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        accentRef.current = (getComputedStyle(document.documentElement).getPropertyValue("--accent-rgb").trim() || "45 212 191").replace(/\s+/g, ", ");

        let lastTime = 0;
        const loop = (time: number) => {
            const dt = Math.min((time - lastTime) / 1000, 0.05);
            lastTime = time;
            const st = stateRef.current;
            const accent = accentRef.current;

            const dpr = window.devicePixelRatio || 2;
            canvas.width = SIZE * dpr;
            canvas.height = SIZE * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, SIZE, SIZE);

            const mx = SIZE / 2;
            const my = SIZE / 2;

            st.globalRotation += dt * 0.017;
            const rot = st.globalRotation;

            st.shimmerAngle = (st.shimmerAngle + dt * 1.2) % (Math.PI * 2);

            for (const [idx, prog] of st.flashRunes) {
                const np = prog + dt * 2;
                if (np >= 1) st.flashRunes.delete(idx);
                else st.flashRunes.set(idx, np);
            }

            for (const [idx, prog] of st.revealProgress) {
                const np = prog + dt * 2.5;
                if (np >= 1) { st.revealProgress.set(idx, 1); setTimeout(() => st.revealProgress.delete(idx), 100); }
                else st.revealProgress.set(idx, np);
            }

            const pulsePhase = (time / 1000) % 2.5 / 2.5;
            const pulseVal = 0.5 + Math.sin(pulsePhase * Math.PI * 2) * 0.5;

            if (cCompleted > 0) {
                const fraction = cCompleted / cTotal;
                const cGrad = ctx.createRadialGradient(mx, my, 0, mx, my, RADIUS * 0.55);
                cGrad.addColorStop(0, `rgba(${accent}, ${0.04 + fraction * 0.06})`);
                cGrad.addColorStop(1, `rgba(${accent}, 0)`);
                ctx.fillStyle = cGrad;
                ctx.beginPath();
                ctx.arc(mx, my, RADIUS * 0.55, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.setLineDash([2, 6]);
            ctx.strokeStyle = `rgba(${accent}, 0.06)`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.arc(mx, my, RADIUS, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            for (let i = 0; i < cTotal; i++) {
                const a = getAngle(i, rot);
                const gx = mx + Math.cos(a) * RADIUS;
                const gy = my + Math.sin(a) * RADIUS;
                const isActive = i < cCompleted;
                const isLatest = i === cCompleted - 1;
                const runeIdx = i % parsedPaths.length;
                const isRevealing = st.revealProgress.has(i);
                const isFlashing = st.flashRunes.has(i);

                ctx.save();
                ctx.lineCap = "round";
                ctx.lineJoin = "round";

                if (!isActive) {
                    ctx.strokeStyle = `rgba(${accent}, 0.07)`;
                    ctx.lineWidth = 0.8;
                    drawRune(ctx, parsedPaths[runeIdx], gx, gy, GLYPH_SIZE);
                    ctx.restore();
                    continue;
                }

                let angleDist = Math.abs(a - (st.shimmerAngle - Math.PI / 2 + rot));
                if (angleDist > Math.PI) angleDist = Math.PI * 2 - angleDist;
                const shimmerBoost = angleDist < 0.6 ? (1 - angleDist / 0.6) * 0.4 : 0;
                const intensity = isLatest ? 1 : Math.min(1, (0.25 + (i / Math.max(cCompleted - 1, 1)) * 0.55) + shimmerBoost);

                const uR = isLatest ? GLYPH_SIZE * 1.8 : GLYPH_SIZE * 1.0;
                const uAlpha = isLatest ? 0.15 : 0.03 + (i / Math.max(cCompleted, 1)) * 0.06;
                const uGrad = ctx.createRadialGradient(gx, gy, 0, gx, gy, uR);
                uGrad.addColorStop(0, `rgba(${accent}, ${uAlpha})`);
                uGrad.addColorStop(1, `rgba(${accent}, 0)`);
                ctx.fillStyle = uGrad;
                ctx.beginPath();
                ctx.arc(gx, gy, uR, 0, Math.PI * 2);
                ctx.fill();

                if (isFlashing) {
                    const fp = st.flashRunes.get(i)!;
                    const flashR = GLYPH_SIZE * (0.8 + fp * 1.2);
                    const flashAlpha = (1 - fp) * 0.5;
                    const whiteAmount = Math.max(0, 1 - fp * 2);
                    ctx.shadowColor = `rgba(255, 255, 255, ${flashAlpha * whiteAmount})`;
                    ctx.shadowBlur = 16;
                    const fg = ctx.createRadialGradient(gx, gy, 0, gx, gy, flashR);
                    fg.addColorStop(0, `rgba(${whiteAmount > 0.5 ? "255, 255, 255" : accent}, ${flashAlpha})`);
                    fg.addColorStop(1, `rgba(${accent}, 0)`);
                    ctx.fillStyle = fg;
                    ctx.beginPath();
                    ctx.arc(gx, gy, flashR, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }

                if (isLatest && !isFlashing) {
                    const haloR = GLYPH_SIZE * (0.9 + pulseVal * 0.5);
                    const haloAlpha = 0.06 + pulseVal * 0.1;
                    const hg = ctx.createRadialGradient(gx, gy, 0, gx, gy, haloR);
                    hg.addColorStop(0, `rgba(${accent}, ${haloAlpha})`);
                    hg.addColorStop(1, `rgba(${accent}, 0)`);
                    ctx.fillStyle = hg;
                    ctx.beginPath();
                    ctx.arc(gx, gy, haloR, 0, Math.PI * 2);
                    ctx.fill();
                }

                const drawFrac = isRevealing ? st.revealProgress.get(i)! : 1;
                const flashProg = isFlashing ? st.flashRunes.get(i)! : 0;
                const strokeColor = isFlashing
                    ? (flashProg < 0.4
                        ? `rgba(255, 255, 255, ${1 - flashProg})`
                        : `rgba(${accent}, ${0.5 + (flashProg - 0.4) * 0.83})`)
                    : isLatest
                        ? `rgba(${accent}, ${0.7 + pulseVal * 0.3})`
                        : `rgba(${accent}, ${intensity})`;

                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = isLatest ? 1.8 : 1.2;

                if (isLatest || isFlashing) {
                    ctx.shadowColor = isFlashing ? `rgba(255, 255, 255, ${0.6 * (1 - flashProg)})` : `rgba(${accent}, ${0.3 + pulseVal * 0.4})`;
                    ctx.shadowBlur = isFlashing ? 12 : 6 + pulseVal * 6;
                }

                drawRune(ctx, parsedPaths[runeIdx], gx, gy, GLYPH_SIZE, drawFrac);

                if (isLatest && !isFlashing) {
                    ctx.strokeStyle = `rgba(${accent}, ${0.12 + pulseVal * 0.18})`;
                    ctx.lineWidth = 2.5;
                    ctx.shadowBlur = 10 + pulseVal * 8;
                    drawRune(ctx, parsedPaths[runeIdx], gx, gy, GLYPH_SIZE, drawFrac);
                }

                ctx.restore();
            }

            const pct = cTotal > 0 ? Math.round((cCompleted / cTotal) * 100) : 0;
            const fontSize = Math.max(9, SIZE * 0.15);
            ctx.font = `700 ${fontSize}px "JetBrains Mono", monospace`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = `rgba(${accent}, ${0.5 + pulseVal * 0.2})`;
            ctx.shadowColor = `rgba(${accent}, 0.3)`;
            ctx.shadowBlur = 4;
            ctx.fillText(`${pct}%`, mx, my);
            ctx.shadowBlur = 0;

            frameRef.current = requestAnimationFrame(loop);
        };
        frameRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frameRef.current);
    }, [cCompleted, cTotal, parsedPaths, getAngle, SIZE, RADIUS, GLYPH_SIZE]);

    return (
        <div className="flex justify-center">
            <canvas ref={canvasRef} style={{ width: `${SIZE}px`, height: `${SIZE}px` }} />
        </div>
    );
}

/* ─── SESSION COUNTER PANEL ─── */
export type ExVolumeEntry = { name: string; volume: number; color?: string };

export function SessionCounterPanel({ sets, totalSets, volume, elapsed, weightUnit, lastDelta, lastSessionVolume, exerciseVolumes, qualityScore }: {
    sets: number; totalSets: number; volume: number; elapsed: number; weightUnit: string; lastDelta: number;
    lastSessionVolume: number; exerciseVolumes: ExVolumeEntry[]; qualityScore?: number;
}) {
    const volStr = Math.round(volume).toLocaleString();
    const min = String(Math.floor(elapsed / 60)).padStart(2, "0");
    const sec = String(elapsed % 60).padStart(2, "0");
    const [deltaKey, setDeltaKey] = useState(0);
    const prevDelta = useRef(lastDelta);
    const [expanded, setExpanded] = useState(false);
    const [showCalInfo, setShowCalInfo] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (lastDelta !== prevDelta.current && lastDelta > 0) {
            prevDelta.current = lastDelta;
            setDeltaKey((k) => k + 1);
        }
    }, [lastDelta]);

    useEffect(() => {
        if (!expanded) return;
        function handleClick(e: MouseEvent) {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setExpanded(false);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [expanded]);

    const volDiff = lastSessionVolume > 0 ? volume - lastSessionVolume : 0;
    const kcalEstimate = Math.round(volume * 0.05);
    const evs = exerciseVolumes ?? [];
    const maxExVol = Math.max(...evs.map((e) => e.volume), 1);

    return (
        <div ref={panelRef} className="rounded-2xl border border-[var(--fg-06)] overflow-hidden flap-panel">
            <div className="flex items-stretch cursor-pointer" onClick={() => setExpanded((e) => !e)}>
                <div className="flex-1 py-3 px-2 text-center border-r border-[var(--fg-04)]">
                    <p className="text-[7px] font-mono tracking-[0.2em] text-[var(--fg-20)] mb-1.5">SETS</p>
                    <div className="text-xl leading-none">
                        <FlapNumber value={String(sets)} />
                        <span className="text-[var(--fg-12)] text-[0.5em] mx-0.5 font-mono">/</span>
                        <span className="text-[0.5em] text-[var(--fg-20)] font-mono">{totalSets}</span>
                    </div>
                </div>
                <div className="flex-[2] py-3 px-2 text-center relative">
                    <p className="text-[7px] font-mono tracking-[0.2em] text-[var(--fg-20)] mb-1.5">VOLUME</p>
                    <div className="text-2xl leading-none">
                        <FlapNumber value={volStr} suffix={weightUnit} accent />
                    </div>
                    {deltaKey > 0 && <DeltaToast key={deltaKey} value={lastDelta} />}
                    {lastSessionVolume > 0 && (
                        <>
                            <div className="relative w-full h-1 rounded-full bg-[var(--fg-06)] mt-2 mx-auto" style={{ maxWidth: "90%" }}>
                                <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-500" style={{
                                    width: `${Math.min(100, (volume / lastSessionVolume) * 100)}%`,
                                    background: volDiff >= 0 ? "rgb(74 222 128 / 0.5)" : "rgb(var(--accent-rgb) / 0.4)",
                                }} />
                                <div className="absolute top-0 bottom-0 w-px bg-[var(--fg-30)]" style={{ left: "100%" }} title="Last session" />
                            </div>
                            <p className={`text-[8px] font-mono mt-1 ${volDiff >= 0 ? "text-emerald-400/60" : "text-red-400/50"}`}>
                                {volDiff >= 0 ? "↑" : "↓"} {Math.abs(Math.round(volDiff)).toLocaleString()}{weightUnit} vs last
                            </p>
                        </>
                    )}
                </div>
                <div className="flex-1 py-3 px-2 text-center border-l border-[var(--fg-04)]">
                    <p className="text-[7px] font-mono tracking-[0.2em] text-[var(--fg-20)] mb-1.5">ELAPSED</p>
                    <div className="text-xl leading-none">
                        <FlapNumber value={min} />
                        <span className="text-[var(--fg-15)] mx-px animate-pulse font-mono">:</span>
                        <FlapNumber value={sec} />
                    </div>
                </div>
            </div>
            <div className="cursor-pointer border-t border-[var(--fg-04)]" onClick={() => setExpanded((e) => !e)}>
                {!expanded && (
                    <div className="py-2">
                        <MiniRuneCircle completed={sets} total={totalSets} circleSize={64} />
                        <p className="text-[7px] font-mono text-[var(--fg-15)] text-center mt-0.5 tracking-wider">tap for details</p>
                    </div>
                )}
                {expanded && (
                    <div className="py-3 space-y-3">
                        <MiniRuneCircle completed={sets} total={totalSets} circleSize={120} />
                        <div className="px-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[9px] font-mono text-[var(--fg-25)]">EST. CALORIES</span>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setShowCalInfo((v) => !v); }}
                                        className="w-3.5 h-3.5 rounded-full border border-[var(--fg-15)] flex items-center justify-center text-[8px] font-mono text-[var(--fg-30)] hover:text-[var(--fg-60)] hover:border-[var(--fg-30)] transition"
                                    >i</button>
                                </div>
                                <span className="text-sm font-mono font-bold text-amber-400/70">{kcalEstimate} kcal</span>
                            </div>
                            {showCalInfo && (
                                <div className="text-[8px] font-mono text-[var(--fg-30)] bg-[var(--fg-03)] rounded-lg px-3 py-2 leading-relaxed">
                                    Estimated as total volume × 0.05 kcal/kg. Rough approximation based on mechanical work. Actual burn varies by exercise type, rest, body composition, and intensity.
                                </div>
                            )}
                            {elapsed > 60 && sets > 0 && (
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-mono text-[var(--fg-25)]">PACE</span>
                                    <span className="text-sm font-mono font-bold text-[var(--fg-50)]">{(sets / (elapsed / 60)).toFixed(1)} <span className="text-[8px] text-[var(--fg-25)]">sets/min</span></span>
                                </div>
                            )}
                            {qualityScore != null && qualityScore > 0 && (
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-mono text-[var(--fg-25)]">SESSION QUALITY</span>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-16 h-1.5 rounded-full bg-[var(--fg-06)] overflow-hidden">
                                            <div className="h-full rounded-full transition-all duration-700" style={{
                                                width: `${qualityScore}%`,
                                                background: qualityScore >= 70 ? "rgb(74 222 128 / 0.7)" : qualityScore >= 40 ? "rgb(250 204 21 / 0.7)" : "rgb(239 68 68 / 0.6)",
                                            }} />
                                        </div>
                                        <span className={`text-sm font-mono font-bold ${qualityScore >= 70 ? "text-emerald-400/70" : qualityScore >= 40 ? "text-amber-400/70" : "text-red-400/60"}`}>{Math.round(qualityScore)}</span>
                                    </div>
                                </div>
                            )}
                            {evs.length > 0 && (
                                <div className="space-y-1.5">
                                    <p className="text-[8px] font-mono tracking-widest text-[var(--fg-20)]">VOLUME BY EXERCISE</p>
                                    {evs.map((ev) => (
                                        <div key={ev.name} className="flex items-center gap-2">
                                            <span className="text-[9px] font-mono text-[var(--fg-40)] w-24 truncate shrink-0">{ev.name}</span>
                                            <div className="flex-1 h-1.5 rounded-full bg-[var(--fg-06)] overflow-hidden">
                                                <div className="h-full rounded-full bg-[rgb(var(--accent-rgb))] transition-all duration-500" style={{ width: `${(ev.volume / maxExVol) * 100}%` }} />
                                            </div>
                                            <span className="text-[8px] font-mono text-[var(--fg-25)] w-12 text-right shrink-0">{Math.round(ev.volume).toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─── TRACKING MODE HELPERS ─── */
export type { TrackingMode } from "../lib/useWorkoutSession";

export function getTrackingModeLogLabel(mode: string): string {
    switch (mode) {
        case "rounds_duration": return "LOG ROUNDS ✓";
        case "duration_only": return "LOG HOLD ✓";
        case "distance_time": return "LOG CARDIO ✓";
        default: return "LOG SET ✓";
    }
}

/* ─── ROTATION CARD ─── */
export function RotationCard({ exercises, onSwap, currentExerciseIds }: {
    exercises: Array<{ id: string; name: string; body_segment: string; lastDone: string; daysSince: number }>;
    onSwap: (exerciseId: string, name: string) => void;
    currentExerciseIds: Set<string>;
}) {
    const [expanded, setExpanded] = useState(false);
    const grouped = useMemo(() => {
        const map = new Map<string, typeof exercises>();
        for (const ex of exercises) {
            const seg = ex.body_segment || "Other";
            if (!map.has(seg)) map.set(seg, []);
            map.get(seg)!.push(ex);
        }
        return Array.from(map.entries()).sort((a, b) => b[1][0].daysSince - a[1][0].daysSince);
    }, [exercises]);

    const preview = exercises.slice(0, 3);

    return (
        <div className="rounded-2xl border border-[var(--fg-06)] bg-[var(--fg-02)] overflow-hidden">
            <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
                <RefreshCw size={14} className="text-[rgb(var(--accent-rgb)/0.5)] shrink-0" />
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-mono tracking-widest text-[var(--fg-25)]">ROTATE BACK IN</p>
                    <p className="text-[9px] text-[var(--fg-20)] mt-0.5 truncate">
                        {exercises.length} exercise{exercises.length !== 1 ? "s" : ""} not done in 3+ weeks
                    </p>
                </div>
                {expanded ? <ChevronDown size={14} className="text-[var(--fg-15)] shrink-0" /> : <ChevronRight size={14} className="text-[var(--fg-15)] shrink-0" />}
            </button>

            {!expanded && (
                <div className="px-4 pb-3 flex gap-1.5 flex-wrap">
                    {preview.map(ex => (
                        <span key={ex.id} className="text-[8px] font-mono px-2 py-0.5 rounded-full bg-[var(--fg-04)] text-[var(--fg-30)]">
                            {ex.name} · {ex.daysSince}d
                        </span>
                    ))}
                    {exercises.length > 3 && (
                        <span className="text-[8px] font-mono px-2 py-0.5 rounded-full bg-[var(--fg-04)] text-[var(--fg-15)]">
                            +{exercises.length - 3}
                        </span>
                    )}
                </div>
            )}

            {expanded && (
                <div className="px-4 pb-3 space-y-3">
                    {grouped.map(([segment, exs]) => (
                        <div key={segment}>
                            <p className="text-[7px] font-mono tracking-widest text-[var(--fg-15)] mb-1.5">{segment.toUpperCase()}</p>
                            <div className="space-y-1">
                                {exs.map(ex => {
                                    const alreadyInPlan = currentExerciseIds.has(ex.id);
                                    return (
                                        <div key={ex.id} className="flex items-center gap-2 rounded-lg bg-[var(--fg-03)] px-3 py-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[10px] font-medium text-[var(--fg-50)] truncate">{ex.name}</p>
                                                <p className="text-[8px] font-mono text-[var(--fg-20)]">{ex.daysSince} days ago</p>
                                            </div>
                                            {alreadyInPlan ? (
                                                <span className="text-[8px] font-mono text-[var(--fg-15)] px-2 py-1">In plan</span>
                                            ) : (
                                                <button
                                                    onClick={() => onSwap(ex.id, ex.name)}
                                                    className="text-[8px] font-mono px-2.5 py-1 rounded-lg border border-[rgb(var(--accent-rgb)/0.2)] text-[rgb(var(--accent-rgb))] hover:bg-[rgb(var(--accent-rgb)/0.08)] transition"
                                                >
                                                    Swap in
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
