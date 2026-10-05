"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Camera, Square, RotateCcw, ChevronRight, Circle } from "lucide-react";
import { analyzeForm, analyzeMaForm, getScoreColor, getScoreLabel, checkFormRealtime, checkMaFormRealtime, RepDetector, type FormFrame, type FormAnalysisResult, type BarPathPoint, type JointStatus, type RepResult, type MaExerciseType } from "../lib/formAnalysis";
import { LandmarkSmoother } from "../lib/oneEuroFilter";
import { getExerciseGuide, SILHOUETTE_PATHS } from "../lib/formGuides";
import { supabase } from "../lib/supabase";

type PoseLandmarker = any;

const MAX_DURATION_MS = 60_000;
const COUNTDOWN_SECONDS = 3;

const STATUS_COLORS: Record<JointStatus, { line: string; glow: string; dot: string }> = {
    good: { line: "#00ffaa", glow: "rgba(0, 255, 170, 0.5)", dot: "#66ffc8" },
    warn: { line: "#ffb800", glow: "rgba(255, 184, 0, 0.5)", dot: "#ffd566" },
    bad:  { line: "#ff4466", glow: "rgba(255, 68, 102, 0.5)", dot: "#ff8899" },
};
const DEFAULT_STATUS: JointStatus = "good";

const POSE_CONNECTIONS = [
    [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
    [11, 23], [12, 24], [23, 24], [23, 25], [24, 26],
    [25, 27], [26, 28],
];

type Phase = "loading" | "ready" | "countdown" | "recording" | "analyzing" | "results";

export default function FormCheckCamera({ exerciseName, onClose, maExerciseType }: { exerciseName: string; onClose: () => void; maExerciseType?: MaExerciseType }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
    const landmarkerRef = useRef<PoseLandmarker | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const framesRef = useRef<FormFrame[]>([]);
    const rafRef = useRef<number>(0);
    const startTimeRef = useRef(0);
    const smootherRef = useRef(new LandmarkSmoother());
    const detectedExerciseRef = useRef<"squat" | "deadlift" | "bench" | "overhead_press" | "general">("general");
    const feedbackRef = useRef<ReturnType<typeof checkFormRealtime> | null>(null);
    const frameCountRef = useRef(0);
    const repDetectorRef = useRef(new RepDetector());
    const lastFormStatusRef = useRef<JointStatus>("good");

    const distanceHintRef = useRef<"close" | "far" | "ok">("ok");

    const [phase, setPhase] = useState<Phase>("loading");
    const [elapsed, setElapsed] = useState(0);
    const [countdownNum, setCountdownNum] = useState(3);
    const [result, setResult] = useState<FormAnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
    const [distanceHint, setDistanceHint] = useState<"close" | "far" | "ok">("ok");
    const [repCount, setRepCount] = useState(0);
    const [repFlash, setRepFlash] = useState(false);

    const guide = getExerciseGuide(exerciseName);

    const cleanup = useCallback(() => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        streamRef.current?.getTracks().forEach((t) => t.stop());
        landmarkerRef.current?.close?.();
        streamRef.current = null;
        landmarkerRef.current = null;
    }, []);

    useEffect(() => {
        return cleanup;
    }, [cleanup]);

    useEffect(() => {
        let cancelled = false;

        async function init() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } },
                    audio: false,
                });
                if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
                streamRef.current = stream;

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                }

                const vision = await import("@mediapipe/tasks-vision");
                if (cancelled) return;

                const { PoseLandmarker, FilesetResolver } = vision;
                const filesetResolver = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
                );
                if (cancelled) return;

                const poseLandmarker = await PoseLandmarker.createFromOptions(filesetResolver, {
                    baseOptions: {
                        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
                        delegate: "GPU",
                    },
                    runningMode: "VIDEO",
                    numPoses: 1,
                });
                if (cancelled) { poseLandmarker.close(); return; }

                landmarkerRef.current = poseLandmarker;
                setPhase("ready");
            } catch (err: any) {
                if (!cancelled) setError(err.message || "Failed to initialize camera");
            }
        }

        init();
        return () => { cancelled = true; };
    }, [facingMode]);

    const drawSkeleton = useCallback((landmarks: any[], isRecording: boolean) => {
        const canvas = overlayCanvasRef.current;
        const video = videoRef.current;
        if (!canvas || !video) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!landmarks || landmarks.length === 0) return;

        const smoothed = smootherRef.current.smooth(landmarks);
        const w = canvas.width;
        const h = canvas.height;

        // Get per-joint color feedback during recording
        const fb = feedbackRef.current;
        const getConnStatus = (a: number, b: number): JointStatus => {
            if (!fb || !isRecording) return DEFAULT_STATUS;
            const key = `${Math.min(a, b)}-${Math.max(a, b)}`;
            return fb.connectionStatus.get(key) ?? DEFAULT_STATUS;
        };
        const getJointStatus = (idx: number): JointStatus => {
            if (!fb || !isRecording) return DEFAULT_STATUS;
            return fb.jointStatus.get(idx) ?? DEFAULT_STATUS;
        };

        // Pass 1: outer glow (per-connection color)
        ctx.save();
        ctx.lineWidth = 6;
        ctx.lineCap = "round";
        for (const [a, b] of POSE_CONNECTIONS) {
            if (smoothed[a] && smoothed[b] && (smoothed[a].visibility ?? 0) > 0.5 && (smoothed[b].visibility ?? 0) > 0.5) {
                const status = getConnStatus(a, b);
                const colors = STATUS_COLORS[status];
                ctx.shadowColor = colors.glow;
                ctx.shadowBlur = 16;
                ctx.strokeStyle = colors.line;
                ctx.beginPath();
                ctx.moveTo(smoothed[a].x * w, smoothed[a].y * h);
                ctx.lineTo(smoothed[b].x * w, smoothed[b].y * h);
                ctx.stroke();
            }
        }
        ctx.restore();

        // Pass 2: crisp inner line
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        for (const [a, b] of POSE_CONNECTIONS) {
            if (smoothed[a] && smoothed[b] && (smoothed[a].visibility ?? 0) > 0.5 && (smoothed[b].visibility ?? 0) > 0.5) {
                ctx.strokeStyle = "#ffffff";
                ctx.beginPath();
                ctx.moveTo(smoothed[a].x * w, smoothed[a].y * h);
                ctx.lineTo(smoothed[b].x * w, smoothed[b].y * h);
                ctx.stroke();
            }
        }

        // Joint dots with per-joint color
        ctx.save();
        for (let i = 0; i < smoothed.length; i++) {
            const p = smoothed[i];
            const vis = p.visibility ?? 0;
            if (vis > 0.3) {
                const alpha = vis > 0.8 ? 1 : vis > 0.5 ? 0.7 : 0.35;
                const status = getJointStatus(i);
                const colors = STATUS_COLORS[status];
                ctx.shadowColor = colors.glow;
                ctx.shadowBlur = 12;
                ctx.globalAlpha = alpha;
                ctx.fillStyle = colors.dot;
                ctx.beginPath();
                ctx.arc(p.x * w, p.y * h, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = alpha * 0.3;
                ctx.strokeStyle = colors.dot;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(p.x * w, p.y * h, 8, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
        ctx.restore();
    }, []);

    const processFrame = useCallback(() => {
        const video = videoRef.current;
        const landmarker = landmarkerRef.current;
        if (!video || !landmarker || video.readyState < 2) {
            rafRef.current = requestAnimationFrame(processFrame);
            return;
        }

        const now = performance.now();
        const result = landmarker.detectForVideo(video, now);
        const isRecording = phase === "recording";

        if (result?.landmarks?.[0]) {
            const rawLandmarks = result.landmarks[0];

            if (isRecording) {
                framesRef.current.push({ timestamp: now, landmarks: rawLandmarks });
                frameCountRef.current++;

                // Detect exercise type from early frames (after 15 frames)
                if (frameCountRef.current === 15) {
                    const earlyFrames = framesRef.current.slice(0, 15);
                    let hipBelowKnee = 0, wristAbove = 0;
                    for (const f of earlyFrames) {
                        const lm = f.landmarks;
                        const hipY = (lm[23].y + lm[24].y) / 2;
                        const kneeY = (lm[25].y + lm[26].y) / 2;
                        const shoulderY = (lm[11].y + lm[12].y) / 2;
                        const wristY = (lm[15].y + lm[16].y) / 2;
                        if (hipY > kneeY - 0.02) hipBelowKnee++;
                        if (wristY < shoulderY - 0.05) wristAbove++;
                    }
                    if (wristAbove / earlyFrames.length > 0.4) detectedExerciseRef.current = "overhead_press";
                    else if (hipBelowKnee / earlyFrames.length > 0.15) detectedExerciseRef.current = "squat";
                    else detectedExerciseRef.current = "general";
                    repDetectorRef.current.setExerciseType(detectedExerciseRef.current);
                }

                // Run real-time form check every 3rd frame for performance
                if (frameCountRef.current % 3 === 0) {
                    const prevStatus = lastFormStatusRef.current;
                    feedbackRef.current = maExerciseType
                        ? checkMaFormRealtime(rawLandmarks, maExerciseType)
                        : checkFormRealtime(rawLandmarks, detectedExerciseRef.current);

                    // Haptic on form break (1.7)
                    let worst: JointStatus = "good";
                    for (const [, s] of feedbackRef.current.jointStatus) {
                        if (s === "bad") { worst = "bad"; break; }
                        if (s === "warn") worst = "warn";
                    }
                    if (worst === "bad" && prevStatus !== "bad") {
                        try { navigator.vibrate?.([50, 30, 50]); } catch {}
                    }
                    lastFormStatusRef.current = worst;
                }

                // Rep detection
                const rep = repDetectorRef.current.processFrame(rawLandmarks, now);
                if (rep) {
                    setRepCount(rep.repNumber);
                    setRepFlash(true);
                    setTimeout(() => setRepFlash(false), 600);
                    try { navigator.vibrate?.(40); } catch {}
                }
            }

            drawSkeleton(rawLandmarks, isRecording);

            // Distance estimation: hip width relative to frame
            if (frameCountRef.current % 10 === 0 || !isRecording) {
                const lHip = rawLandmarks[23];
                const rHip = rawLandmarks[24];
                if (lHip && rHip && (lHip.visibility ?? 0) > 0.5 && (rHip.visibility ?? 0) > 0.5) {
                    const hipWidth = Math.abs(rHip.x - lHip.x);
                    const hint = hipWidth < 0.08 ? "far" : hipWidth > 0.35 ? "close" : "ok";
                    if (hint !== distanceHintRef.current) {
                        distanceHintRef.current = hint;
                        setDistanceHint(hint);
                    }
                }
            }
        }

        if (startTimeRef.current > 0) {
            const el = now - startTimeRef.current;
            setElapsed(Math.round(el / 1000));
            if (el >= MAX_DURATION_MS) {
                stopRecording();
                return;
            }
        }

        rafRef.current = requestAnimationFrame(processFrame);
    }, [phase, drawSkeleton]);

    useEffect(() => {
        if (phase === "ready" || phase === "countdown" || phase === "recording") {
            rafRef.current = requestAnimationFrame(processFrame);
        }
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, [phase, processFrame]);

    // Countdown timer
    useEffect(() => {
        if (phase !== "countdown") return;
        setCountdownNum(COUNTDOWN_SECONDS);

        let count = COUNTDOWN_SECONDS;
        const interval = setInterval(() => {
            count--;
            if (count <= 0) {
                clearInterval(interval);
                beginRecording();
            } else {
                setCountdownNum(count);
                try { navigator.vibrate?.(50); } catch {}
            }
        }, 800);

        try { navigator.vibrate?.(50); } catch {}

        return () => clearInterval(interval);
    }, [phase]);

    function startCountdown() {
        setPhase("countdown");
    }

    function beginRecording() {
        framesRef.current = [];
        frameCountRef.current = 0;
        feedbackRef.current = null;
        detectedExerciseRef.current = "general";
        repDetectorRef.current.reset();
        lastFormStatusRef.current = "good";
        startTimeRef.current = performance.now();
        setElapsed(0);
        setRepCount(0);
        setRepFlash(false);
        setPhase("recording");
        try { navigator.vibrate?.(80); } catch {}
    }

    function stopRecording() {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        setPhase("analyzing");
        startTimeRef.current = 0;

        setTimeout(() => {
            const analysis = maExerciseType
                ? analyzeMaForm(framesRef.current, maExerciseType)
                : analyzeForm(framesRef.current);
            setResult(analysis);
            setPhase("results");
            // Auto-save to DB (fire and forget)
            saveFormCheck(analysis, exerciseName);
        }, 300);
    }

    function handleRetry() {
        setResult(null);
        framesRef.current = [];
        setElapsed(0);
        smootherRef.current.reset();
        setPhase("ready");
        rafRef.current = requestAnimationFrame(processFrame);
    }

    function flipCamera() {
        cleanup();
        smootherRef.current.reset();
        setPhase("loading");
        setFacingMode((m) => (m === "user" ? "environment" : "user"));
    }

    if (error) {
        return createPortal(
            <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center p-6">
                <Camera size={48} className="text-red-400 mb-4" />
                <p className="text-sm text-white/60 text-center mb-2">Camera access failed</p>
                <p className="text-xs text-white/30 text-center mb-6">{error}</p>
                <button onClick={onClose} className="px-6 py-2 rounded-lg bg-white/10 text-white/60 text-sm">Close</button>
            </div>,
            document.body
        );
    }

    return createPortal(
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-[env(safe-area-inset-top,12px)] pb-3 bg-gradient-to-b from-black/90 to-black/0 z-10">
                <button onClick={() => { cleanup(); onClose(); }} className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white active:scale-95 transition">
                    <X size={18} />
                </button>
                <div className="text-center">
                    <p className="text-[10px] font-mono tracking-[0.2em] text-emerald-400/80">FORM CHECK</p>
                    <p className="text-xs font-medium text-white/70 max-w-[200px] truncate">{exerciseName}</p>
                </div>
                <button onClick={flipCamera} className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white active:scale-95 transition">
                    <RotateCcw size={16} />
                </button>
            </div>

            {/* Camera feed */}
            {phase !== "results" && (
                <div className="flex-1 relative overflow-hidden bg-black">
                    <video
                        ref={videoRef}
                        className="absolute inset-0 w-full h-full object-cover"
                        playsInline
                        muted
                        style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
                    />
                    <canvas
                        ref={overlayCanvasRef}
                        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                        style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Body silhouette guide */}
                    {(phase === "ready" || phase === "countdown") && (
                        <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-500 ${phase === "countdown" ? "opacity-20" : "opacity-100"}`}>
                            <svg viewBox="0 0 100 130" className="w-[45%] max-w-[200px]" style={{ opacity: 0.18 }}>
                                <path d={SILHOUETTE_PATHS[guide.angle]} fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    )}

                    {/* Loading overlay */}
                    {phase === "loading" && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
                            <div className="w-12 h-12 border-2 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin mb-4" />
                            <p className="text-sm font-medium text-white/60">Loading pose model...</p>
                            <p className="text-[11px] text-white/30 mt-1">First load may take a moment</p>
                        </div>
                    )}

                    {/* Countdown overlay */}
                    {phase === "countdown" && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span
                                key={countdownNum}
                                className="text-[120px] font-bold text-white tabular-nums select-none animate-[countPulse_0.8s_ease-out]"
                                style={{ textShadow: "0 0 40px rgba(0,255,170,0.4), 0 0 80px rgba(0,255,170,0.15)" }}
                            >
                                {countdownNum}
                            </span>
                            <style>{`
                                @keyframes countPulse {
                                    0% { transform: scale(1.4); opacity: 0.3; }
                                    30% { opacity: 1; }
                                    100% { transform: scale(1); opacity: 1; }
                                }
                            `}</style>
                        </div>
                    )}

                    {/* Analyzing overlay */}
                    {phase === "analyzing" && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
                            <div className="w-12 h-12 border-2 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin mb-4" />
                            <p className="text-sm font-medium text-white/60">Analyzing form...</p>
                        </div>
                    )}

                    {/* Recording indicator */}
                    {phase === "recording" && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
                            <div className="flex items-center gap-3 bg-red-500/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg shadow-red-500/20">
                                <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                                <span className="text-sm font-mono font-medium text-white tracking-wide">{elapsed}s / 60s</span>
                                {repCount > 0 && (
                                    <>
                                        <span className="w-px h-4 bg-white/20" />
                                        <span className="text-sm font-mono font-bold text-white">{repCount} rep{repCount !== 1 ? "s" : ""}</span>
                                    </>
                                )}
                            </div>
                            <LiveFormBadge feedbackRef={feedbackRef} />
                        </div>
                    )}

                    {/* +1 rep flash */}
                    {repFlash && (
                        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 pointer-events-none animate-[repPop_0.6s_ease-out_forwards]">
                            <span className="text-5xl font-black text-emerald-400 drop-shadow-[0_0_20px_rgba(0,255,170,0.6)]">+1</span>
                        </div>
                    )}
                    <style>{`
                        @keyframes repPop {
                            0% { transform: translateX(-50%) scale(0.5) translateY(0); opacity: 0; }
                            20% { transform: translateX(-50%) scale(1.2) translateY(-10px); opacity: 1; }
                            100% { transform: translateX(-50%) scale(0.8) translateY(-60px); opacity: 0; }
                        }
                    `}</style>

                    {/* Ready state guide */}
                    {phase === "ready" && (
                        <div className="absolute bottom-24 left-4 right-4 text-center space-y-2">
                            <div className="inline-flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2">
                                <span className="text-[10px] font-mono tracking-wider text-emerald-400/80">{guide.label}</span>
                                <span className="w-px h-3 bg-white/10" />
                                <span className="text-[11px] text-white/40">{guide.tip}</span>
                            </div>
                            {distanceHint !== "ok" && (
                                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold ${distanceHint === "far" ? "bg-amber-500/20 text-amber-300" : "bg-amber-500/20 text-amber-300"}`}>
                                    {distanceHint === "far" ? "Step closer to the camera" : "Step back from the camera"}
                                </div>
                            )}
                            <p className="text-[10px] text-white/20">All processing happens on your device</p>
                        </div>
                    )}

                    {/* Distance hint during recording */}
                    {phase === "recording" && distanceHint !== "ok" && (
                        <div className="absolute bottom-24 left-1/2 -translate-x-1/2">
                            <div className="bg-amber-500/80 backdrop-blur-sm px-3 py-1.5 rounded-full">
                                <span className="text-[11px] font-semibold text-white">
                                    {distanceHint === "far" ? "Step closer" : "Step back"}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Results view */}
            {phase === "results" && result && <ResultsView result={result} onRetry={handleRetry} onClose={() => { cleanup(); onClose(); }} />}

            {/* Controls */}
            {phase !== "results" && (
                <div className="px-4 pt-4 pb-[max(env(safe-area-inset-bottom,20px),20px)] bg-gradient-to-t from-black via-black/90 to-black/0 flex justify-center">
                    {phase === "ready" && (
                        <button onClick={startCountdown} className="w-[72px] h-[72px] rounded-full bg-red-500 flex items-center justify-center ring-4 ring-red-500/30 ring-offset-2 ring-offset-black active:scale-90 transition-transform">
                            <Circle size={28} className="text-white" fill="white" />
                        </button>
                    )}
                    {phase === "countdown" && (
                        <button onClick={() => setPhase("ready")} className="w-[72px] h-[72px] rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center active:scale-90 transition-transform">
                            <X size={24} className="text-white/60" />
                        </button>
                    )}
                    {phase === "recording" && (
                        <button onClick={stopRecording} className="w-[72px] h-[72px] rounded-full bg-red-500 flex items-center justify-center ring-4 ring-red-500/30 ring-offset-2 ring-offset-black animate-pulse active:scale-90 transition-transform">
                            <Square size={24} className="text-white" fill="white" />
                        </button>
                    )}
                    {(phase === "loading" || phase === "analyzing") && (
                        <div className="w-[72px] h-[72px] rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                            <Camera size={24} className="text-white/20" />
                        </div>
                    )}
                </div>
            )}
        </div>,
        document.body
    );
}

async function saveFormCheck(result: FormAnalysisResult, exerciseName: string) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase.from("form_checks").insert({
            user_id: user.id,
            exercise_name: exerciseName,
            exercise_type: result.exerciseType,
            overall_score: result.overallScore,
            duration_s: result.duration,
            frame_count: result.frameCount,
            rep_count: result.reps?.length ?? 0,
            depth_angle: result.depth?.minAngle ?? null,
            depth_passed: result.depth?.passed ?? null,
            symmetry_diff: result.symmetry?.diff ?? null,
            symmetry_passed: result.symmetry?.passed ?? null,
            knee_cave_detected: result.kneeCave?.detected ?? null,
            knee_cave_side: result.kneeCave?.detected ? result.kneeCave.side : null,
            reps: result.reps ?? null,
            tips: result.tips,
        });
    } catch {}
}

function LiveFormBadge({ feedbackRef }: { feedbackRef: React.RefObject<ReturnType<typeof checkFormRealtime> | null> }) {
    const [status, setStatus] = useState<"good" | "warn" | "bad">("good");
    const [message, setMessage] = useState("");

    useEffect(() => {
        const interval = setInterval(() => {
            const fb = feedbackRef.current;
            if (!fb) return;

            let worst: JointStatus = "good";
            for (const [, s] of fb.jointStatus) {
                if (s === "bad") { worst = "bad"; break; }
                if (s === "warn") worst = "warn";
            }
            setStatus(worst);

            if (fb.kneeCave) {
                setMessage("Knees caving in!");
            } else if (worst === "bad") {
                setMessage("Check your form");
            } else if (worst === "warn") {
                setMessage("Watch your form");
            } else {
                setMessage("");
            }
        }, 200);
        return () => clearInterval(interval);
    }, [feedbackRef]);

    if (!message) return null;

    const bg = status === "bad" ? "bg-red-500/80" : "bg-amber-500/80";
    return (
        <div className={`${bg} backdrop-blur-sm px-3 py-1 rounded-full animate-pulse`}>
            <span className="text-[11px] font-semibold text-white">{message}</span>
        </div>
    );
}

function BarPathViz({ points }: { points: BarPathPoint[] }) {
    if (points.length < 3) return null;

    const padding = 16;
    const w = 80;
    const h = 120;
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const minX = Math.min(...xs); const maxX = Math.max(...xs);
    const minY = Math.min(...ys); const maxY = Math.max(...ys);
    const rangeX = maxX - minX || 0.01;
    const rangeY = maxY - minY || 0.01;

    const step = Math.max(1, Math.floor(points.length / 30));
    const sampled = points.filter((_, i) => i % step === 0 || i === points.length - 1);

    const scaled = sampled.map((p) => ({
        x: padding + ((p.x - minX) / rangeX) * (w - padding * 2),
        y: padding + ((p.y - minY) / rangeY) * (h - padding * 2),
    }));

    const pathD = scaled.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

    return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
            <defs>
                <linearGradient id="barPathGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00ffaa" />
                    <stop offset="100%" stopColor="#00cc88" />
                </linearGradient>
            </defs>
            <rect x="0" y="0" width={w} height={h} rx="8" fill="rgba(255,255,255,0.03)" />
            <path d={pathD} fill="none" stroke="url(#barPathGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
            <circle cx={scaled[0].x} cy={scaled[0].y} r="3" fill="#00ffaa" />
            <circle cx={scaled[scaled.length - 1].x} cy={scaled[scaled.length - 1].y} r="3" fill="#66ffc8" />
        </svg>
    );
}

function ResultsView({ result, onRetry, onClose }: { result: FormAnalysisResult; onRetry: () => void; onClose: () => void }) {
    const scoreColor = getScoreColor(result.overallScore);
    const scoreLabel = getScoreLabel(result.overallScore);
    const exerciseLabel = result.exerciseType !== "general" ? result.exerciseType.replace("_", " ") : "exercise";
    const hasBarPath = result.barPath && result.barPath.length > 3;

    return (
        <div className="flex-1 overflow-y-auto bg-black px-5 pt-2">
            {/* Score hero */}
            <div className="flex items-center gap-5 mb-5">
                <div className="relative w-24 h-24 shrink-0">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
                        <circle cx="50" cy="50" r="42" fill="none" stroke={scoreColor} strokeWidth="7" strokeLinecap="round"
                            strokeDasharray={`${(result.overallScore / 100) * 264} 264`}
                            style={{ filter: `drop-shadow(0 0 6px ${scoreColor}40)` }}
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold text-white">{result.overallScore}</span>
                        <span className="text-[10px] font-semibold tracking-wide" style={{ color: scoreColor }}>{scoreLabel}</span>
                    </div>
                </div>
                <div className="min-w-0">
                    <p className="text-[10px] font-mono tracking-[0.15em] text-white/30 uppercase mb-1">Analysis</p>
                    <p className="text-sm font-semibold text-white/80 capitalize mb-1">{exerciseLabel}</p>
                    <p className="text-[11px] text-white/30 font-mono">{result.duration}s · {result.frameCount} frames{result.reps ? ` · ${result.reps.length} reps` : ""}</p>
                </div>
            </div>

            {/* Per-rep dots */}
            {result.reps && result.reps.length > 0 && (
                <div className="mb-4">
                    <p className="text-[10px] font-semibold tracking-[0.15em] text-white/30 uppercase mb-2">Per-Rep Quality</p>
                    <div className="flex gap-1.5 flex-wrap">
                        {result.reps.map((rep) => {
                            const c = rep.score >= 80 ? "#00ffaa" : rep.score >= 60 ? "#facc15" : "#f87171";
                            return (
                                <div key={rep.repNumber} className="flex flex-col items-center gap-1">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-black" style={{ backgroundColor: c }}>
                                        {rep.score}
                                    </div>
                                    <span className="text-[8px] text-white/30">R{rep.repNumber}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Metric cards row */}
            <div className="flex gap-2.5 mb-4">
                {result.depth && (
                    <div className={`flex-1 rounded-xl p-3 ${result.depth.passed ? "bg-emerald-500/10 border border-emerald-500/15" : "bg-amber-500/10 border border-amber-500/15"}`}>
                        <div className="flex items-center justify-between mb-1.5">
                            <span className={`text-[10px] font-semibold tracking-wide uppercase ${result.depth.passed ? "text-emerald-400" : "text-amber-400"}`}>Depth</span>
                            <span className={`text-[10px] ${result.depth.passed ? "text-emerald-400" : "text-amber-400"}`}>{result.depth.passed ? "✓" : "!"}</span>
                        </div>
                        <p className="text-lg font-bold text-white/90 leading-none mb-0.5">{result.depth.minAngle}°</p>
                        <p className="text-[9px] text-white/30">threshold {result.depth.threshold}°</p>
                    </div>
                )}

                {result.symmetry && (
                    <div className={`flex-1 rounded-xl p-3 ${result.symmetry.passed ? "bg-emerald-500/10 border border-emerald-500/15" : "bg-amber-500/10 border border-amber-500/15"}`}>
                        <div className="flex items-center justify-between mb-1.5">
                            <span className={`text-[10px] font-semibold tracking-wide uppercase ${result.symmetry.passed ? "text-emerald-400" : "text-amber-400"}`}>Symmetry</span>
                            <span className={`text-[10px] ${result.symmetry.passed ? "text-emerald-400" : "text-amber-400"}`}>{result.symmetry.passed ? "✓" : "!"}</span>
                        </div>
                        <p className="text-lg font-bold text-white/90 leading-none mb-0.5">{result.symmetry.diff}°</p>
                        <p className="text-[9px] text-white/30">L{result.symmetry.leftAngle}° R{result.symmetry.rightAngle}°</p>
                    </div>
                )}

                {result.kneeCave && (
                    <div className={`flex-1 rounded-xl p-3 ${!result.kneeCave.detected ? "bg-emerald-500/10 border border-emerald-500/15" : "bg-red-500/10 border border-red-500/15"}`}>
                        <div className="flex items-center justify-between mb-1.5">
                            <span className={`text-[10px] font-semibold tracking-wide uppercase ${!result.kneeCave.detected ? "text-emerald-400" : "text-red-400"}`}>Knee Cave</span>
                            <span className={`text-[10px] ${!result.kneeCave.detected ? "text-emerald-400" : "text-red-400"}`}>{!result.kneeCave.detected ? "✓" : "!"}</span>
                        </div>
                        <p className="text-lg font-bold text-white/90 leading-none mb-0.5">{result.kneeCave.detected ? result.kneeCave.side : "None"}</p>
                        <p className="text-[9px] text-white/30">{result.kneeCave.detected ? "valgus detected" : "tracking well"}</p>
                    </div>
                )}

                {hasBarPath && (
                    <div className="flex-1 rounded-xl p-3 bg-white/[0.03] border border-white/[0.06] flex flex-col items-center justify-center">
                        <span className="text-[10px] font-semibold tracking-wide uppercase text-white/40 mb-1">Bar Path</span>
                        <BarPathViz points={result.barPath!} />
                    </div>
                )}
            </div>

            {/* Tips */}
            {result.tips.length > 0 && (
                <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3.5 mb-5">
                    <p className="text-[10px] font-semibold tracking-[0.15em] text-white/30 uppercase mb-2.5">Tips</p>
                    <div className="space-y-2">
                        {result.tips.map((tip, i) => (
                            <div key={i} className="flex items-start gap-2">
                                <div className="w-1 h-1 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                                <p className="text-[12px] leading-relaxed text-white/50">{tip}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pb-[max(env(safe-area-inset-bottom,20px),20px)]">
                <button onClick={onRetry} className="flex-1 py-3.5 rounded-xl border border-white/10 text-sm font-semibold text-white/50 active:scale-[0.97] transition">
                    Try Again
                </button>
                <button onClick={onClose} className="flex-1 py-3.5 rounded-xl bg-emerald-500 text-black text-sm font-bold active:scale-[0.97] transition" style={{ boxShadow: "0 4px 16px rgba(0,255,170,0.2)" }}>
                    Done
                </button>
            </div>
        </div>
    );
}
