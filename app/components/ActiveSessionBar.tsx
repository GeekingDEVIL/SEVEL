"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Flame, Dumbbell, Timer, Zap, Check } from "lucide-react";

export default function ActiveSessionBar() {
    const pathname = usePathname();
    const [active, setActive] = useState(false);
    const [exerciseName, setExerciseName] = useState<string | null>(null);
    const [elapsed, setElapsed] = useState("");
    const [setProgress, setSetProgress] = useState<string | null>(null);
    const [resting, setResting] = useState(false);
    const [momentum, setMomentum] = useState(0);

    const [isMa, setIsMa] = useState(false);
    useEffect(() => {
        function check() {
            try {
                const isGymActive = localStorage.getItem("sevel_active_session") === "true";
                const isMaActive = localStorage.getItem("sevel_ma_active_session") === "true";
                const isActive = isGymActive || isMaActive;
                setActive(isActive);
                setIsMa(isMaActive && !isGymActive);
                if (isActive) {
                    if (isMaActive && !isGymActive) {
                        setExerciseName(localStorage.getItem("sevel_ma_discipline") || "Martial Arts");
                        const start = localStorage.getItem("sevel_ma_session_start");
                        if (start) {
                            const s = Math.floor((Date.now() - Number(start)) / 1000);
                            setElapsed(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`);
                        }
                        setSetProgress(localStorage.getItem("sevel_ma_round_progress") || null);
                        setResting(false);
                        setMomentum(0);
                    } else {
                        setExerciseName(localStorage.getItem("sevel_current_exercise") || null);
                        const start = localStorage.getItem("sevel_session_start");
                        if (start) {
                            const s = Math.floor((Date.now() - Number(start)) / 1000);
                            setElapsed(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`);
                        }
                        setSetProgress(localStorage.getItem("sevel_set_progress") || null);
                        setResting(localStorage.getItem("sevel_resting") === "true");
                        const m = parseInt(localStorage.getItem("sevel_momentum") || "0", 10);
                        setMomentum(Math.min(100, Math.max(0, m)));
                    }
                }
            } catch {}
        }
        check();
        const id = setInterval(check, 2000);
        return () => clearInterval(id);
    }, [pathname]);

    if (!active || pathname === "/schedule") return null;

    return (
        <Link
            href="/schedule"
            className={`flex items-center gap-2 border-b text-xs font-mono py-2 px-4 transition ${
                resting
                    ? "bg-blue-500/10 border-blue-400/20 text-blue-300"
                    : momentum >= 80
                    ? "bg-amber-500/10 border-amber-400/20 text-amber-300"
                    : "bg-orange-500/15 border-orange-400/30 text-orange-300"
            }`}
        >
            {resting ? (
                <Timer size={12} className="shrink-0 animate-pulse" />
            ) : momentum >= 80 ? (
                <Zap size={12} className="shrink-0 text-amber-400" />
            ) : (
                <Flame size={12} className="shrink-0 animate-pulse" />
            )}
            <span className="truncate flex-1">
                {resting ? (
                    "RESTING..."
                ) : exerciseName ? (
                    <><Dumbbell size={10} className="inline -mt-0.5 mr-1" />{exerciseName}</>
                ) : "WORKOUT IN PROGRESS"}
            </span>
            {setProgress && <span className="shrink-0 opacity-60 text-[10px]">{setProgress}</span>}
            {elapsed && <span className="shrink-0 opacity-70 tabular-nums">{elapsed}</span>}
            {momentum >= 40 && (
                <div className="w-8 h-1 rounded-full overflow-hidden shrink-0" style={{ background: "rgba(255,255,255,0.1)" }}>
                    <div className="h-full rounded-full transition-all duration-700" style={{
                        width: `${momentum}%`,
                        background: momentum >= 80 ? "rgb(251 191 36 / 0.8)" : "rgb(255 255 255 / 0.3)",
                    }} />
                </div>
            )}
        </Link>
    );
}
