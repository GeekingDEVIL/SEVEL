"use client";

// MuscleHeatMap — anatomical body map with muscle highlighting
// Uses body-muscles library (Apache-2.0 License)
// Copyright body-muscles contributors — see node_modules/body-muscles/LICENSE

import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { BodyChart, ViewSide } from "body-muscles";
import type { BodyState } from "body-muscles";

type MuscleInput = {
  muscle: string;
  intensity?: number; // 1-10, default 5
};

type Props = {
  muscles: MuscleInput[];
  className?: string;
  height?: number;
  showToggle?: boolean;
  showLegend?: boolean;
  showLabels?: boolean;
  compact?: boolean;
  interactive?: boolean;
  dualView?: boolean;
  selectedSegments?: Set<string>;
  onSegmentClick?: (segment: string) => void;
};

const SEGMENT_TO_MUSCLES: Record<string, string[]> = {
  Chest: ["chest-upper-left", "chest-upper-right", "chest-lower-left", "chest-lower-right"],
  Shoulders: ["shoulder-front-left", "shoulder-front-right", "shoulder-side-left", "shoulder-side-right", "deltoid-rear-left", "deltoid-rear-right"],
  "Rear Delts": ["deltoid-rear-left", "deltoid-rear-right"],
  Biceps: ["biceps-left", "biceps-right"],
  Triceps: ["triceps-long-left", "triceps-long-right", "triceps-lateral-left", "triceps-lateral-right"],
  Forearms: ["forearm-left", "forearm-right", "forearm-flexors-left", "forearm-flexors-right", "forearm-extensors-left", "forearm-extensors-right"],
  Back: ["lats-upper-left", "lats-upper-right", "lats-mid-left", "lats-mid-right", "lats-lower-left", "lats-lower-right"],
  Lats: ["lats-upper-left", "lats-upper-right", "lats-mid-left", "lats-mid-right", "lats-lower-left", "lats-lower-right"],
  Traps: ["traps-upper-left", "traps-upper-right", "traps-mid-left", "traps-mid-right", "traps-lower-left", "traps-lower-right"],
  Core: ["abs-upper-left", "abs-upper-right", "abs-lower-left", "abs-lower-right", "obliques-left", "obliques-right", "serratus-anterior-left", "serratus-anterior-right"],
  Abs: ["abs-upper-left", "abs-upper-right", "abs-lower-left", "abs-lower-right"],
  Obliques: ["obliques-left", "obliques-right"],
  Legs: ["quads-left", "quads-right", "hamstrings-medial-left", "hamstrings-medial-right", "hamstrings-lateral-left", "hamstrings-lateral-right"],
  Quads: ["quads-left", "quads-right"],
  Hamstrings: ["hamstrings-medial-left", "hamstrings-medial-right", "hamstrings-lateral-left", "hamstrings-lateral-right"],
  Glutes: ["gluteus-maximus-left", "gluteus-maximus-right", "gluteus-medius-left", "gluteus-medius-right"],
  Calves: ["calves-gastroc-medial-left", "calves-gastroc-medial-right", "calves-gastroc-lateral-left", "calves-gastroc-lateral-right", "calves-soleus-left", "calves-soleus-right"],
  Adductors: ["adductors-left", "adductors-right"],
  Abductors: ["gluteus-medius-left", "gluteus-medius-right"],
  "Lower Back": ["lower-back-erectors-left", "lower-back-erectors-right", "lower-back-ql-left", "lower-back-ql-right"],
  "Hip Flexors": ["hip-flexor-left", "hip-flexor-right"],
  Arms: ["biceps-left", "biceps-right", "triceps-long-left", "triceps-long-right", "triceps-lateral-left", "triceps-lateral-right", "forearm-left", "forearm-right", "forearm-flexors-left", "forearm-flexors-right"],
};

const MUSCLE_TO_SEGMENT: Record<string, string> = {};
const BROAD_SEGMENTS = new Set(["Back", "Legs", "Arms", "Shoulders"]);
for (const [seg, ids] of Object.entries(SEGMENT_TO_MUSCLES)) {
  for (const id of ids) {
    if (!MUSCLE_TO_SEGMENT[id] || BROAD_SEGMENTS.has(MUSCLE_TO_SEGMENT[id])) MUSCLE_TO_SEGMENT[id] = seg;
  }
}

function buildBodyState(muscles: MuscleInput[], selectedSegments?: Set<string>): BodyState {
  const state: BodyState = {};
  for (const { muscle, intensity = 5 } of muscles) {
    const ids = SEGMENT_TO_MUSCLES[muscle];
    if (!ids) continue;
    const isSelected = selectedSegments?.has(muscle) ?? false;
    for (const id of ids) {
      const existing = state[id];
      const val = Math.min(10, Math.max(1, intensity));
      if (!existing || existing.intensity < val) {
        state[id] = { intensity: val, selected: isSelected };
      }
    }
  }
  if (selectedSegments) {
    for (const seg of selectedSegments) {
      const ids = SEGMENT_TO_MUSCLES[seg];
      if (!ids) continue;
      for (const id of ids) {
        if (!state[id]) state[id] = { intensity: 6, selected: true };
        else state[id] = { ...state[id], selected: true };
      }
    }
  }
  return state;
}

const FRONT_IDS = new Set(["chest-upper-left", "chest-upper-right", "chest-lower-left", "chest-lower-right", "shoulder-front-left", "shoulder-front-right", "shoulder-side-left", "shoulder-side-right", "biceps-left", "biceps-right", "forearm-left", "forearm-right", "abs-upper-left", "abs-upper-right", "abs-lower-left", "abs-lower-right", "obliques-left", "obliques-right", "serratus-anterior-left", "serratus-anterior-right", "quads-left", "quads-right", "adductors-left", "adductors-right", "hip-flexor-left", "hip-flexor-right", "tibialis-anterior-left", "tibialis-anterior-right"]);

function bestDefaultView(state: BodyState): ViewSide {
  let front = 0, back = 0;
  for (const id of Object.keys(state)) {
    const s = state[id];
    if (!s) continue;
    if (FRONT_IDS.has(id)) front += s.intensity;
    else back += s.intensity;
  }
  return back > front ? ViewSide.BACK : ViewSide.FRONT;
}

type LabelDef = { muscle: string; side: "left" | "right"; yPct: number };

// Expand broad DB body_segments into granular sub-groups for labeling
const SEGMENT_EXPAND: Record<string, { front: string[]; back: string[] }> = {
  Back: { front: [], back: ["Traps", "Lats", "Lower Back"] },
  Shoulders: { front: ["Shoulders"], back: ["Rear Delts"] },
  Chest: { front: ["Chest"], back: [] },
  Biceps: { front: ["Biceps"], back: [] },
  Triceps: { front: [], back: ["Triceps"] },
  Forearms: { front: ["Forearms"], back: [] },
  Core: { front: ["Abs", "Obliques"], back: [] },
  Abs: { front: ["Abs"], back: [] },
  Obliques: { front: ["Obliques"], back: [] },
  Legs: { front: ["Quads"], back: ["Hamstrings", "Glutes"] },
  Quads: { front: ["Quads"], back: [] },
  Hamstrings: { front: [], back: ["Hamstrings"] },
  Glutes: { front: [], back: ["Glutes"] },
  Calves: { front: ["Calves"], back: ["Calves"] },
  Adductors: { front: ["Adductors"], back: [] },
  "Hip Flexors": { front: ["Hip Flexors"], back: [] },
  "Lower Back": { front: [], back: ["Lower Back"] },
  Traps: { front: [], back: ["Traps"] },
  Lats: { front: [], back: ["Lats"] },
  Arms: { front: ["Biceps", "Forearms"], back: ["Triceps"] },
};

const FRONT_LABELS: LabelDef[] = [
  { muscle: "Shoulders", side: "left", yPct: 19 },
  { muscle: "Chest", side: "left", yPct: 28 },
  { muscle: "Biceps", side: "right", yPct: 30 },
  { muscle: "Forearms", side: "left", yPct: 40 },
  { muscle: "Abs", side: "right", yPct: 38 },
  { muscle: "Obliques", side: "left", yPct: 48 },
  { muscle: "Hip Flexors", side: "right", yPct: 52 },
  { muscle: "Quads", side: "left", yPct: 62 },
  { muscle: "Adductors", side: "right", yPct: 62 },
  { muscle: "Calves", side: "left", yPct: 80 },
];
const BACK_LABELS: LabelDef[] = [
  { muscle: "Traps", side: "left", yPct: 16 },
  { muscle: "Rear Delts", side: "left", yPct: 24 },
  { muscle: "Lats", side: "right", yPct: 28 },
  { muscle: "Triceps", side: "left", yPct: 34 },
  { muscle: "Lower Back", side: "right", yPct: 40 },
  { muscle: "Glutes", side: "right", yPct: 52 },
  { muscle: "Hamstrings", side: "left", yPct: 62 },
  { muscle: "Calves", side: "left", yPct: 80 },
];

export default function MuscleHeatMap({ muscles, className = "", height = 280, showToggle = true, showLegend = false, showLabels = false, compact = false, interactive = false, dualView = false, selectedSegments, onSegmentClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const backContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<BodyChart | null>(null);
  const backChartRef = useRef<BodyChart | null>(null);
  const bodyState = useMemo(() => buildBodyState(muscles, selectedSegments), [muscles, selectedSegments]);
  const defaultView = bestDefaultView(bodyState);
  const [view, setView] = useState<ViewSide>(defaultView);
  const prevMusclesLen = useRef(muscles.length);
  useEffect(() => {
    if (prevMusclesLen.current === 0 && muscles.length > 0) {
      setView(bestDefaultView(bodyState));
    }
    prevMusclesLen.current = muscles.length;
  }, [muscles, bodyState]);
  const callbackRef = useRef(onSegmentClick);
  callbackRef.current = onSegmentClick;

  const handleMuscleClick = useCallback((id: string) => {
    if (!callbackRef.current) return;
    const seg = MUSCLE_TO_SEGMENT[id];
    if (seg) callbackRef.current(seg);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    chartRef.current?.destroy();
    chartRef.current = new BodyChart(containerRef.current, {
      view: dualView ? ViewSide.FRONT : view,
      bodyState,
      enableTransitions: true,
      className: "muscle-heat-map-chart",
      ...(interactive ? { onMuscleClick: handleMuscleClick } : {}),
    });
    return () => { chartRef.current?.destroy(); chartRef.current = null; };
  }, [view, interactive, handleMuscleClick, dualView]);

  useEffect(() => {
    if (!dualView || !backContainerRef.current) return;
    backChartRef.current?.destroy();
    backChartRef.current = new BodyChart(backContainerRef.current, {
      view: ViewSide.BACK,
      bodyState,
      enableTransitions: true,
      className: "muscle-heat-map-chart",
      ...(interactive ? { onMuscleClick: handleMuscleClick } : {}),
    });
    return () => { backChartRef.current?.destroy(); backChartRef.current = null; };
  }, [dualView, interactive, handleMuscleClick]);

  const recolorContainer = useCallback((container: HTMLElement) => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue("--accent-rgb").trim();
    const [r, g, b] = raw ? raw.split(/\s+/).map(Number) : [34, 211, 238];
    const a = (opacity: number) => `rgba(${r},${g},${b},${opacity})`;
    const REMAP: Record<string, { fill: string; filter?: string }> = {
      "#94a3b8": { fill: "rgba(148,163,184,0.15)" },
      "#cbd5e1": { fill: "rgba(148,163,184,0.10)" },
      "#fde047": { fill: a(0.45) },
      "#facc15": { fill: a(0.55) },
      "#eab308": { fill: a(0.65) },
      "#fb923c": { fill: a(0.75), filter: `drop-shadow(0 0 4px ${a(0.3)})` },
      "#f97316": { fill: a(0.8), filter: `drop-shadow(0 0 6px ${a(0.4)})` },
      "#ea580c": { fill: a(0.85), filter: `drop-shadow(0 0 8px ${a(0.45)})` },
      "#ef4444": { fill: a(0.9), filter: `drop-shadow(0 0 10px ${a(0.55)})` },
      "#dc2626": { fill: a(0.95), filter: `drop-shadow(0 0 12px ${a(0.6)})` },
      "#b91c1c": { fill: a(1), filter: `drop-shadow(0 0 14px ${a(0.65)})` },
      "#7f1d1d": { fill: a(1), filter: `drop-shadow(0 0 18px ${a(0.75)}) drop-shadow(0 0 4px ${a(0.9)})` },
    };
    const HIGH_INTENSITY = new Set(["#ef4444", "#dc2626", "#b91c1c", "#7f1d1d"]);
    const recolor = (p: Element) => {
      const fill = p.getAttribute("fill")?.toLowerCase();
      if (!fill) return;
      const mapped = REMAP[fill];
      if (mapped) {
        p.setAttribute("fill", mapped.fill);
        const el = p as HTMLElement;
        if (mapped.filter) el.style.filter = mapped.filter;
        else el.style.filter = "";
        if (HIGH_INTENSITY.has(fill)) el.style.animation = "musclePulse 2.5s ease-in-out infinite";
        else el.style.animation = "";
      }
    };
    const observer = new MutationObserver(mutations => {
      for (const m of mutations) {
        if (m.type === "attributes" && m.attributeName === "fill" && m.target instanceof Element) {
          recolor(m.target);
        }
        if (m.type === "childList") {
          m.addedNodes.forEach(n => {
            if (n instanceof Element) {
              if (n.tagName === "path") recolor(n);
              n.querySelectorAll?.("path")?.forEach(recolor);
            }
          });
        }
      }
    });
    observer.observe(container, { subtree: true, childList: true, attributes: true, attributeFilter: ["fill"] });
    container.querySelectorAll("svg path").forEach(recolor);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    return recolorContainer(containerRef.current);
  }, [bodyState, view, recolorContainer]);

  useEffect(() => {
    if (!dualView || !backContainerRef.current) return;
    return recolorContainer(backContainerRef.current);
  }, [bodyState, dualView, recolorContainer]);

  useEffect(() => {
    chartRef.current?.update({ bodyState, view: dualView ? ViewSide.FRONT : view });
  }, [bodyState, view, dualView]);

  useEffect(() => {
    if (!dualView) return;
    backChartRef.current?.update({ bodyState, view: ViewSide.BACK });
  }, [bodyState, dualView]);

  const muscleCount = muscles.filter(m => SEGMENT_TO_MUSCLES[m.muscle]).length;
  const expandedSet = useMemo(() => {
    const set = new Set<string>();
    const side = view === ViewSide.FRONT ? "front" : "back";
    for (const { muscle } of muscles) {
      const expand = SEGMENT_EXPAND[muscle];
      if (expand) {
        for (const sub of expand[side]) set.add(sub);
      } else {
        set.add(muscle);
      }
    }
    return set;
  }, [muscles, view]);

  const activeLabels = useMemo(() => {
    const source = view === ViewSide.FRONT ? FRONT_LABELS : BACK_LABELS;
    const raw = source.filter(l => expandedSet.has(l.muscle));
    const left = raw.filter(l => l.side === "left").sort((a, b) => a.yPct - b.yPct);
    const right = raw.filter(l => l.side === "right").sort((a, b) => a.yPct - b.yPct);
    const spread = (arr: LabelDef[]) => {
      for (let i = 1; i < arr.length; i++) {
        if (arr[i].yPct - arr[i - 1].yPct < 10) {
          arr[i] = { ...arr[i], yPct: arr[i - 1].yPct + 10 };
        }
      }
    };
    spread(left);
    spread(right);
    return [...left, ...right];
  }, [view, expandedSet]);

  return (
    <div className={`relative ${className}`}>
      <style>{`
        .muscle-heat-map-chart svg {
          width: 100%;
          height: 100%;
          display: block;
          margin: 0 auto;
        }
        .muscle-heat-map-chart svg path {
          stroke: rgb(var(--accent-rgb) / 0.06);
          stroke-width: 0.15;
          transition: fill 0.3s ease, filter 0.3s ease;
          ${interactive ? "cursor: pointer;" : ""}
        }
        .muscle-heat-map-chart svg path:hover {
          ${interactive ? "filter: brightness(1.3); stroke-width: 0.3;" : ""}
        }
        .muscle-heat-map-chart svg text { display: none; }
        .muscle-heat-map-chart .body-chart-background { display: none !important; }
        .body-chart-container { background: none !important; }
        .muscle-heat-map-chart .body-chart-svg { filter: none !important; background: transparent !important; }
        @keyframes musclePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.75; }
        }
      `}</style>
      {dualView ? (
        <div className="flex items-start justify-center gap-2" style={{ minHeight: height }}>
          <div className="flex flex-col items-center flex-1" style={{ maxWidth: compact ? 90 : undefined }}>
            <div ref={containerRef} className="w-full" />
            {!compact && <span className="text-[7px] font-mono tracking-widest text-[var(--fg-20)] mt-0.5">FRONT</span>}
          </div>
          <div className="flex flex-col items-center flex-1" style={{ maxWidth: compact ? 90 : undefined }}>
            <div ref={backContainerRef} className="w-full" />
            {!compact && <span className="text-[7px] font-mono tracking-widest text-[var(--fg-20)] mt-0.5">BACK</span>}
          </div>
        </div>
      ) : showLabels && activeLabels.length > 0 ? (
        <div className="relative" style={{ height }}>
          <div key={view} ref={containerRef} className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2" style={{ width: Math.round(height / 2.66), maxWidth: "42%" }} />
          {activeLabels.map((l) => (
            <div key={`${l.muscle}-${l.side}`} className="absolute flex items-center pointer-events-none" style={{
              top: `${l.yPct}%`,
              ...(l.side === "left"
                ? { left: 0, right: "58%", flexDirection: "row" }
                : { right: 0, left: "58%", flexDirection: "row-reverse" }),
            }}>
              <span className="text-[10px] font-semibold tracking-wide px-2.5 py-1 rounded-lg whitespace-nowrap"
                style={{
                  background: "rgb(var(--accent-rgb) / 0.12)",
                  border: "1px solid rgb(var(--accent-rgb) / 0.25)",
                  color: "rgb(var(--accent-light-rgb))",
                  flexShrink: 0,
                }} >{l.muscle}</span>
              <div className="flex-1 min-w-[6px]" style={{ height: 0, borderTop: "1.5px dashed rgb(var(--accent-rgb) / 0.35)" }} />
            </div>
          ))}
        </div>
      ) : (
        <div ref={containerRef} className="mx-auto" style={{ maxWidth: 180 }} />
      )}
      {showToggle && !dualView && (
        <div className="relative z-10 flex items-center justify-center gap-1 mt-2">
          <button onClick={() => setView(ViewSide.FRONT)} className={`text-[9px] font-mono tracking-widest px-3 py-1 rounded-md transition ${view === ViewSide.FRONT ? "bg-[var(--fg-10)] text-[var(--fg-80)]" : "text-[var(--fg-30)] hover:text-[var(--fg-50)]"}`}>FRONT</button>
          <button onClick={() => setView(ViewSide.BACK)} className={`text-[9px] font-mono tracking-widest px-3 py-1 rounded-md transition ${view === ViewSide.BACK ? "bg-[var(--fg-10)] text-[var(--fg-80)]" : "text-[var(--fg-30)] hover:text-[var(--fg-50)]"}`}>BACK</button>
        </div>
      )}
      {showLegend && muscleCount > 0 && (
        <div className="flex items-center justify-center gap-3 mt-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: "#f97316" }} />
            <span className="text-[8px] font-mono text-[var(--fg-30)]">WORKED</span>
          </div>
          <span className="text-[8px] font-mono text-[var(--fg-20)]">{muscleCount} muscle group{muscleCount !== 1 ? "s" : ""}</span>
        </div>
      )}
    </div>
  );
}

export { SEGMENT_TO_MUSCLES, MUSCLE_TO_SEGMENT, buildBodyState };
export type { MuscleInput };
