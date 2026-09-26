"use client";

import { useRef, useState, useCallback, useEffect } from "react";

type DrumInputProps = {
    value: number;
    onChange: (v: number) => void;
    min?: number;
    max?: number;
    step?: number;
    placeholder?: string;
    className?: string;
    suffix?: string;
};

export default function DrumInput({
    value,
    onChange,
    min = 0,
    max = 300,
    step = 1,
    placeholder = "—",
    className = "",
    suffix,
}: DrumInputProps) {
    const [editing, setEditing] = useState(false);
    const [editText, setEditText] = useState("");
    const [offset, setOffset] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const accumulatedDelta = useRef(0);
    const lastY = useRef(0);
    const isTouching = useRef(false);
    const animRef = useRef<number>(0);

    const snap = useCallback((v: number) => {
        const snapped = Math.round(v / step) * step;
        return Math.round(Math.max(min, Math.min(max, snapped)) * 100) / 100;
    }, [min, max, step]);

    const fmt = useCallback((v: number) => {
        if (v < min || v > max) return "";
        return Number.isInteger(v) ? String(v) : v.toFixed(1);
    }, [min, max]);

    const settleOffset = useCallback(() => {
        cancelAnimationFrame(animRef.current);
        const decay = () => {
            setOffset(prev => {
                const next = prev * 0.6;
                if (Math.abs(next) < 0.5) return 0;
                animRef.current = requestAnimationFrame(decay);
                return next;
            });
        };
        animRef.current = requestAnimationFrame(decay);
    }, []);

    const haptic = useCallback(() => {
        try { navigator?.vibrate?.(5); } catch {}
    }, []);

    const nudge = useCallback((direction: 1 | -1) => {
        const next = snap(value + direction * step);
        onChange(next);
        haptic();
        setOffset(direction * -18);
        settleOffset();
    }, [value, step, onChange, snap, settleOffset, haptic]);

    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        nudge(e.deltaY > 0 ? -1 : 1);
    }, [nudge]);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        isTouching.current = true;
        lastY.current = e.touches[0].clientY;
        accumulatedDelta.current = 0;
        cancelAnimationFrame(animRef.current);
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!isTouching.current) return;
        e.preventDefault();
        const currentY = e.touches[0].clientY;
        const diff = lastY.current - currentY;
        accumulatedDelta.current += diff;
        lastY.current = currentY;

        setOffset(-accumulatedDelta.current * 0.8);

        const threshold = 22;
        if (Math.abs(accumulatedDelta.current) >= threshold) {
            const dir = Math.sign(accumulatedDelta.current) as 1 | -1;
            accumulatedDelta.current -= dir * threshold;
            onChange(snap(value + dir * step));
            haptic();
        }
    }, [value, step, onChange, snap, haptic]);

    const handleTouchEnd = useCallback(() => {
        isTouching.current = false;
        accumulatedDelta.current = 0;
        settleOffset();
    }, [settleOffset]);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const preventScroll = (e: TouchEvent) => {
            if (isTouching.current) e.preventDefault();
        };
        el.addEventListener("touchmove", preventScroll, { passive: false });
        return () => el.removeEventListener("touchmove", preventScroll);
    }, []);

    useEffect(() => () => cancelAnimationFrame(animRef.current), []);

    const startEdit = () => {
        setEditing(true);
        setEditText(value != null && value >= 0 ? String(value) : "");
        setTimeout(() => inputRef.current?.focus(), 0);
    };

    const finishEdit = () => {
        setEditing(false);
        const parsed = parseFloat(editText);
        if (!isNaN(parsed)) onChange(snap(parsed));
    };

    const displayValue = value != null && value >= 0 ? fmt(value) : "";
    const prevVal = fmt(snap(value - step));
    const nextVal = fmt(snap(value + step));

    if (editing) {
        return (
            <input
                ref={inputRef}
                type="number"
                inputMode="decimal"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onBlur={finishEdit}
                onKeyDown={(e) => { if (e.key === "Enter") finishEdit(); }}
                className={className}
                placeholder={placeholder}
                min={min}
                max={max}
                step={step}
            />
        );
    }

    const ROW_H = 22;

    return (
        <div
            ref={containerRef}
            className={`${className} cursor-ns-resize select-none touch-none relative overflow-hidden`}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={startEdit}
            role="spinbutton"
            aria-valuenow={value}
            aria-valuemin={min}
            aria-valuemax={max}
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === "ArrowUp") { e.preventDefault(); nudge(1); }
                if (e.key === "ArrowDown") { e.preventDefault(); nudge(-1); }
                if (e.key === "Enter") startEdit();
            }}
        >
            {/* Selection band */}
            <div className="absolute inset-x-1 rounded-md pointer-events-none" style={{ top: "50%", height: ROW_H + 2, transform: "translateY(-50%)", background: "rgb(var(--accent-rgb) / 0.08)", boxShadow: "inset 0 0.5px 0 rgb(var(--accent-rgb) / 0.15), inset 0 -0.5px 0 rgb(var(--accent-rgb) / 0.15)" }} />

            {/* Drum column */}
            <div className="flex flex-col items-center justify-center h-full relative" style={{ transform: `translateY(${offset}px)`, transition: isTouching.current ? "none" : undefined }}>
                {/* Higher value (swipe up to reach) */}
                <span className="text-[10px] font-mono text-[var(--fg-15)] leading-none" style={{ height: ROW_H, display: "flex", alignItems: "center" }}>
                    {prevVal}
                </span>
                {/* Current value */}
                <span className={`text-sm font-bold font-mono leading-none ${displayValue ? "text-[var(--fg-80)]" : "text-[var(--fg-25)]"}`} style={{ height: ROW_H, display: "flex", alignItems: "center" }}>
                    {displayValue || placeholder}
                </span>
                {/* Lower value (swipe down to reach) */}
                <span className="text-[10px] font-mono text-[var(--fg-15)] leading-none" style={{ height: ROW_H, display: "flex", alignItems: "center" }}>
                    {nextVal}
                </span>
            </div>

            {/* Top/bottom fade masks */}
            <div className="absolute inset-x-0 top-0 h-2.5 pointer-events-none" style={{ background: "linear-gradient(to bottom, var(--fg-03, var(--bg-primary)), transparent)" }} />
            <div className="absolute inset-x-0 bottom-0 h-2.5 pointer-events-none" style={{ background: "linear-gradient(to top, var(--fg-03, var(--bg-primary)), transparent)" }} />

            {suffix && <span className="text-[7px] font-mono text-[var(--fg-20)] absolute right-1 top-0.5">{suffix}</span>}
        </div>
    );
}
