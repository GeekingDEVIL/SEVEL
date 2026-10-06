"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { flushSync } from "react-dom";
import { Minus, Plus } from "lucide-react";

type StepperInputProps = {
    value: number;
    onChange: (v: number) => void;
    min?: number;
    max?: number;
    step?: number;
    placeholder?: string;
    className?: string;
    suffix?: string;
    label?: string;
    compact?: boolean;
    focused?: boolean;
    onFocus?: () => void;
};

export default function StepperInput({
    value,
    onChange,
    min = 0,
    max = 999,
    step = 1,
    placeholder = "—",
    className = "",
    suffix,
    label,
    compact = false,
    focused = false,
    onFocus,
}: StepperInputProps) {
    const [editing, setEditing] = useState(false);
    const [editText, setEditText] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const longPressActive = useRef(false);

    const snap = useCallback((v: number) => {
        const snapped = Math.round(v / step) * step;
        return Math.round(Math.max(min, Math.min(max, snapped)) * 100) / 100;
    }, [min, max, step]);

    const haptic = useCallback(() => {
        try { navigator?.vibrate?.(5); } catch {}
    }, []);

    const nudge = useCallback((direction: 1 | -1) => {
        const next = snap(value + direction * step);
        if (next !== value) {
            onChange(next);
            haptic();
        }
    }, [value, step, onChange, snap, haptic]);

    const startLongPress = useCallback((direction: 1 | -1) => {
        longPressActive.current = false;
        longPressTimer.current = setTimeout(() => {
            longPressActive.current = true;
            let speed = 150;
            const tick = () => {
                nudge(direction);
                speed = Math.max(50, speed * 0.85);
                longPressTimer.current = setTimeout(tick, speed);
            };
            tick();
        }, 300);
    }, [nudge]);

    const stopLongPress = useCallback(() => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    }, []);

    useEffect(() => () => stopLongPress(), [stopLongPress]);

    const startEdit = () => {
        onFocus?.();
        const txt = value > 0 ? String(value) : "";
        flushSync(() => {
            setEditing(true);
            setEditText(txt);
        });
        inputRef.current?.focus();
        inputRef.current?.select();
    };

    const finishEdit = () => {
        setEditing(false);
        const parsed = parseFloat(editText);
        if (!isNaN(parsed)) {
            const clamped = Math.round(Math.max(min, Math.min(max, parsed)) * 100) / 100;
            onChange(clamped);
        }
    };

    const displayValue = value > 0 ? (Number.isInteger(value) ? String(value) : value.toFixed(1)) : "";

    const btnSize = compact ? 14 : 16;
    const btnPad = compact ? "px-1.5" : "px-2.5";
    const btnColor = focused
        ? "text-[rgb(var(--accent-rgb))] hover:bg-[rgb(var(--accent-rgb)/0.08)]"
        : "text-[var(--fg-20)] hover:bg-[var(--fg-06)]";

    if (editing) {
        return (
            <div className={`${className} flex items-center justify-center`}>
                <input
                    ref={inputRef}
                    type="number"
                    inputMode="decimal"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onBlur={finishEdit}
                    onKeyDown={(e) => { if (e.key === "Enter") finishEdit(); }}
                    className="w-full h-full bg-transparent text-center text-lg font-bold font-mono text-[var(--fg-80)] focus:outline-none"
                    placeholder={placeholder}
                    min={min}
                    max={max}
                    step={step}
                />
            </div>
        );
    }

    return (
        <div className={`${className} flex items-center`}>
            <button
                onPointerDown={() => { onFocus?.(); startLongPress(-1); }}
                onPointerUp={() => { stopLongPress(); if (!longPressActive.current) nudge(-1); }}
                onPointerLeave={stopLongPress}
                className={`h-full ${btnPad} flex items-center justify-center ${btnColor} active:scale-90 transition select-none touch-none rounded-l-lg`}
                aria-label="Decrease"
            >
                <Minus size={btnSize} strokeWidth={2.5} />
            </button>

            <button
                onClick={startEdit}
                className="flex-1 h-full flex flex-col items-center justify-center min-w-0"
            >
                <span className={`${compact ? "text-base" : "text-lg"} font-bold font-mono leading-none ${displayValue ? "text-[var(--fg-85)]" : "text-[var(--fg-25)]"}`}>
                    {displayValue || placeholder}
                </span>
                {(suffix || label) && (
                    <span className="text-[8px] font-mono text-[var(--fg-25)] mt-0.5">{suffix || label}</span>
                )}
            </button>

            <button
                onPointerDown={() => { onFocus?.(); startLongPress(1); }}
                onPointerUp={() => { stopLongPress(); if (!longPressActive.current) nudge(1); }}
                onPointerLeave={stopLongPress}
                className={`h-full ${btnPad} flex items-center justify-center ${btnColor} active:scale-90 transition select-none touch-none rounded-r-lg`}
                aria-label="Increase"
            >
                <Plus size={btnSize} strokeWidth={2.5} />
            </button>
        </div>
    );
}
