"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "sevel_onboarding_dismissed";

function getDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function dismiss(id: string) {
  try {
    const set = getDismissed();
    set.add(id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {}
}

type Props = {
  id: string;
  message: string;
  position?: "top" | "bottom";
  delay?: number;
};

export default function OnboardingTooltip({ id, message, position = "bottom", delay = 800 }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!getDismissed().has(id)) setVisible(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [id, delay]);

  function handleDismiss() {
    dismiss(id);
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: position === "bottom" ? -6 : 6, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: position === "bottom" ? -6 : 6, scale: 0.95 }}
          className={`absolute left-1/2 -translate-x-1/2 z-50 ${
            position === "bottom" ? "top-full mt-2" : "bottom-full mb-2"
          }`}
        >
          <div className="relative bg-[rgb(var(--accent-rgb)/0.15)] border border-[rgb(var(--accent-rgb)/0.25)] backdrop-blur-md rounded-lg px-3 py-2 flex items-center gap-2 shadow-lg whitespace-nowrap">
            <p className="text-[10px] font-mono text-[var(--fg-70)]">{message}</p>
            <button onClick={handleDismiss} className="text-[var(--fg-30)] hover:text-[var(--fg-60)] transition shrink-0">
              <X size={12} />
            </button>
            <div
              className={`absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-[rgb(var(--accent-rgb)/0.15)] border-[rgb(var(--accent-rgb)/0.25)] rotate-45 ${
                position === "bottom"
                  ? "-top-1 border-l border-t"
                  : "-bottom-1 border-r border-b"
              }`}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function useOnboardingComplete(id: string) {
  return {
    markComplete: () => dismiss(id),
    isComplete: () => getDismissed().has(id),
  };
}
