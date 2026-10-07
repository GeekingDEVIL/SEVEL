"use client";

import { useState } from "react";
import { useUnits } from "../lib/useUnits";
import { kgToUnit } from "../lib/units";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar, Cell, ReferenceLine } from "recharts";
import { type PredictionAccuracy } from "../lib/predictionReality";
import { type AnomalyExplanation } from "../lib/anomalyExplainer";
import { type AdaptationSignal } from "../lib/metabolicAdaptation";
import { type LeanMassSignal } from "../lib/leanMassSignal";
import { type WeeklyBudget } from "../lib/weeklyBudget";
import { type RecoveryAdjustment } from "../lib/recoveryEngine";
import { type RecompAssessment } from "../lib/recompMode";
import { type ScenarioResult } from "../lib/scenarioModeling";
import { type CycleAwareComparison, type CyclePhase, getCyclePhaseInfo } from "../lib/cycleAwareTrend";
import { type SessionExpenditure } from "../lib/exerciseExpenditure";
import { type PatternWarning } from "../lib/energyGuardrails";
import { type MonthlyComparison } from "../lib/monthlyInsights";
import { type StrengthBenchmarkResult } from "../lib/strengthBenchmark";
import { type PhasePerformanceResult } from "../lib/phasePerformance";

function InfoTip({ term, text }: { term: string; text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block ml-1">
      <button onClick={(e) => { e.stopPropagation(); setOpen(!open); }} className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border border-[var(--fg-15)] text-[7px] font-mono text-[var(--fg-30)] hover:text-[var(--fg-50)] hover:border-[var(--fg-30)] transition">?</button>
      {open && (
        <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 w-56 p-2.5 rounded-md bg-[var(--bg-elevated)] border border-[var(--fg-15)] text-[9px] font-mono text-[var(--fg-50)] leading-relaxed shadow-lg" onClick={(e) => e.stopPropagation()}>
          <strong className="text-[var(--fg-70)]">{term}</strong> — {text}
        </span>
      )}
    </span>
  );
}

function Card({ title, subtitle, children, accent }: { title: string; subtitle?: string; children: React.ReactNode; accent?: string }) {
  return (
    <div className={`rounded-lg border ${accent ? `border-${accent}/20 bg-${accent}/[0.03]` : "border-[rgb(var(--accent-rgb)/0.15)] bg-[var(--fg-02)]"} p-4`} style={{ boxShadow: "inset 0 1px 0 rgb(var(--accent-rgb) / 0.06)" }}>
      <p className="text-[10px] font-mono tracking-widest text-[var(--fg-25)] mb-1">{title}</p>
      {subtitle && <p className="text-[8px] font-mono text-[var(--fg-15)] mb-3">{subtitle}</p>}
      {!subtitle && <div className="mb-2" />}
      {children}
    </div>
  );
}

export function PredictionVsRealityCard({ data }: { data: PredictionAccuracy }) {
  const wu = useUnits();
  if (data.points.length < 7) return null;
  const chartData = data.points.filter((_, i) => i % Math.max(1, Math.floor(data.points.length / 30)) === 0).map((p) => ({
    date: p.date.slice(5),
    predicted: Number(kgToUnit(p.predicted, wu).toFixed(1)),
    actual: p.actual != null ? Number(kgToUnit(p.actual, wu).toFixed(1)) : null,
  }));

  const dirColor = data.direction === "accurate" ? "text-emerald-300" : data.direction === "overshoot" ? "text-cyan-300" : "text-amber-300";
  const displayError = Number(kgToUnit(data.avgErrorKg, wu).toFixed(1));

  return (
    <Card title="EXPECTED VS ACTUAL" subtitle="How your real weight compares to what the math predicted">
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          <XAxis dataKey="date" tick={{ fontSize: 7, fill: "var(--fg-15)" }} axisLine={false} tickLine={false} />
          <YAxis domain={["auto", "auto"]} tick={{ fontSize: 7, fill: "var(--fg-15)" }} axisLine={false} tickLine={false} width={30} />
          <Tooltip contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--fg-10)", borderRadius: 6, fontSize: 10, fontFamily: "monospace" }} />
          <Line type="monotone" dataKey="predicted" stroke="var(--fg-20)" strokeDasharray="4 2" dot={false} name="Expected" />
          <Line type="monotone" dataKey="actual" stroke="rgb(34,211,238)" dot={false} strokeWidth={2} name="Actual" connectNulls />
        </LineChart>
      </ResponsiveContainer>
      <p className={`text-[9px] font-mono mt-2 ${dirColor}`}>{data.message}</p>
      <p className="text-[7px] font-mono text-[var(--fg-15)] mt-1">Average difference: {displayError > 0 ? "+" : ""}{displayError} {wu}</p>
    </Card>
  );
}

export function AnomalyCard({ data }: { data: AnomalyExplanation }) {
  if (!data.detected) return null;
  return (
    <Card title="WHY YOUR WEIGHT CHANGED" subtitle="Possible reasons for today's shift — not always fat gain or loss">
      <p className="text-sm font-bold font-mono text-amber-300 mb-2">{data.summary}</p>
      <div className="space-y-2">
        {data.explanations.map((e, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${e.likelihood === "high" ? "bg-emerald-400" : e.likelihood === "medium" ? "bg-amber-400" : "bg-[var(--fg-20)]"}`} />
            <div>
              <p className="text-[9px] font-mono text-[var(--fg-50)]">{e.factor}</p>
              <p className="text-[8px] font-mono text-[var(--fg-25)]">{e.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function AdaptationCard({ data }: { data: AdaptationSignal }) {
  if (!data.detected) return null;
  return (
    <Card title="YOUR BODY IS ADJUSTING" subtitle="Your metabolism may have slowed down — this is normal during a diet">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-2 h-2 rounded-full ${data.suggestDietBreak ? "bg-amber-400" : "bg-cyan-400"}`} />
        <p className="text-[9px] font-mono text-[var(--fg-50)]">
          Burning ~{data.tdeeDrop} fewer calories/day over {data.overWeeks} weeks
          <InfoTip term="Why this happens" text="When you eat less for a while, your body adapts by burning slightly fewer calories. This is natural and temporary." />
        </p>
      </div>
      <p className="text-[8px] font-mono text-[var(--fg-30)]">{data.message}</p>
    </Card>
  );
}

export function LeanMassCard({ data }: { data: LeanMassSignal }) {
  const colors = { favorable: "text-emerald-300", neutral: "text-[var(--fg-40)]", concerning: "text-amber-300" };
  const icons = { favorable: "bg-emerald-400", neutral: "bg-[var(--fg-20)]", concerning: "bg-amber-400" };
  const signals = { favorable: "LOOKING GOOD", neutral: "HOLDING STEADY", concerning: "KEEP AN EYE ON THIS" };
  return (
    <Card title="MUSCLE VS FAT CHECK" subtitle="Are you losing fat, gaining muscle, or both?">
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="rounded-md bg-[var(--fg-03)] border border-[var(--fg-04)] p-2 text-center">
          <p className="text-[8px] font-mono text-[var(--fg-30)]">SCALE WEIGHT</p>
          <p className={`text-sm font-bold font-mono ${data.weightTrend === "falling" ? "text-emerald-300" : data.weightTrend === "rising" ? "text-amber-300" : "text-[var(--fg-40)]"}`}>
            {data.weightTrend === "falling" ? "↓ Going down" : data.weightTrend === "rising" ? "↑ Going up" : "→ Steady"}
          </p>
        </div>
        <div className="rounded-md bg-[var(--fg-03)] border border-[var(--fg-04)] p-2 text-center">
          <p className="text-[8px] font-mono text-[var(--fg-30)]">LIFT STRENGTH</p>
          <p className={`text-sm font-bold font-mono ${data.strengthTrend === "rising" ? "text-emerald-300" : data.strengthTrend === "falling" ? "text-red-300" : "text-[var(--fg-40)]"}`}>
            {data.strengthTrend === "rising" ? "↑ Getting stronger" : data.strengthTrend === "falling" ? "↓ Dropping" : "→ Steady"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-2 h-2 rounded-full ${icons[data.signal]}`} />
        <p className={`text-[9px] font-mono ${colors[data.signal]}`}>{signals[data.signal]}</p>
      </div>
      <p className="text-[8px] font-mono text-[var(--fg-25)]">{data.message}</p>
    </Card>
  );
}

export function WeeklyBudgetCard({ data }: { data: WeeklyBudget }) {
  const pct = data.weeklyTarget > 0 ? Math.min((data.consumed / data.weeklyTarget) * 100, 100) : 0;
  const expectedPct = (data.daysPassed / 7) * 100;
  const ahead = pct > expectedPct + 5;

  return (
    <Card title="WEEKLY CALORIE BUDGET" subtitle="Your total calorie allowance for this week">
      <div className="text-center mb-3">
        <p className="text-2xl font-bold font-mono text-[rgb(var(--accent-light-rgb))]">{data.remaining.toLocaleString()}</p>
        <p className="text-[9px] font-mono text-[var(--fg-30)]">calories left this week</p>
      </div>
      <div className="relative h-3 rounded-full bg-[var(--fg-06)] overflow-hidden mb-2">
        <div className={`h-full rounded-full transition-all ${data.onTrack ? "bg-emerald-400/60" : "bg-amber-400/60"}`} style={{ width: `${pct}%` }} />
        <div className="absolute top-0 h-full w-0.5 bg-[var(--fg-20)]" style={{ left: `${expectedPct}%` }} />
      </div>
      <div className="flex justify-between text-[7px] font-mono text-[var(--fg-20)]">
        <span>{data.consumed.toLocaleString()} eaten so far</span>
        <span>{data.weeklyTarget.toLocaleString()} total budget</span>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="rounded-md bg-[var(--fg-03)] border border-[var(--fg-04)] p-2 text-center">
          <p className="text-[8px] font-mono text-[var(--fg-30)]">AVG PER DAY</p>
          <p className={`text-sm font-bold font-mono ${data.onTrack ? "text-emerald-300" : "text-amber-300"}`}>{data.dailyPace}</p>
          <p className="text-[7px] font-mono text-[var(--fg-20)]">calories/day</p>
        </div>
        <div className="rounded-md bg-[var(--fg-03)] border border-[var(--fg-04)] p-2 text-center">
          <p className="text-[8px] font-mono text-[var(--fg-30)]">{data.daysLeft > 0 ? "YOU CAN EAT" : "WEEK DONE"}</p>
          <p className="text-sm font-bold font-mono text-[rgb(var(--accent-light-rgb))]">{data.dailyRemaining}</p>
          <p className="text-[7px] font-mono text-[var(--fg-20)]">{data.daysLeft > 0 ? `per day for ${data.daysLeft} more days` : "great work"}</p>
        </div>
      </div>
      {ahead && <p className="text-[8px] font-mono text-amber-300/50 mt-2 text-center">You're eating a bit fast — try lighter meals the rest of the week to stay on track.</p>}
    </Card>
  );
}

export function RecoveryCard({ data }: { data: RecoveryAdjustment }) {
  if (data.severity === "none") return null;
  const colors = { mild: "text-cyan-300", moderate: "text-amber-300", aggressive: "text-red-300", none: "text-[var(--fg-40)]" };
  const labels = { mild: "Small", moderate: "Moderate", aggressive: "Large", none: "" };
  return (
    <Card title="RECOVERY CHECK" subtitle="How your calorie deficit affects your gym performance">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-2 h-2 rounded-full ${data.severity === "aggressive" ? "bg-red-400" : data.severity === "moderate" ? "bg-amber-400" : "bg-cyan-400"}`} />
        <p className={`text-[9px] font-mono ${colors[data.severity]}`}>
          {data.deficitPct}% calorie cut — {labels[data.severity].toLowerCase()} impact on recovery
          <InfoTip term="Why this matters" text="Eating fewer calories means your body has less energy to repair muscles after training. A bigger deficit = slower recovery." />
        </p>
      </div>
      <p className="text-[8px] font-mono text-[var(--fg-25)]">{data.recommendation}</p>
      <p className="text-[7px] font-mono text-[var(--fg-15)] mt-1">Consider doing {Math.round(data.volumeMultiplier * 100)}% of your normal training volume</p>
    </Card>
  );
}

export function RecompCard({ data }: { data: RecompAssessment }) {
  return (
    <Card title="BODY RECOMPOSITION" subtitle="Building muscle while losing fat — tracked by weight + strength changes">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${data.successScore >= 70 ? "bg-emerald-400" : data.successScore >= 40 ? "bg-amber-400" : "bg-[var(--fg-20)]"}`} />
          <p className="text-[9px] font-mono text-[var(--fg-50)]">Progress: {data.successScore}/100</p>
        </div>
        <p className="text-[8px] font-mono text-[var(--fg-20)]">{data.weeksTracked} weeks tracked</p>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--fg-06)] overflow-hidden mb-3">
        <div className={`h-full rounded-full ${data.successScore >= 70 ? "bg-emerald-400/60" : data.successScore >= 40 ? "bg-amber-400/60" : "bg-[var(--fg-10)]"}`} style={{ width: `${data.successScore}%` }} />
      </div>
      <p className="text-[8px] font-mono text-[var(--fg-30)]">{data.message}</p>
    </Card>
  );
}

export function CycleCard({ data, phaseInfo }: { data: CycleAwareComparison; phaseInfo: string }) {
  const wu = useUnits();
  const phaseColors: Record<CyclePhase, string> = {
    follicular: "text-emerald-300",
    ovulation: "text-cyan-300",
    luteal: "text-amber-300",
    menstrual: "text-rose-300",
  };
  const phaseLabels: Record<CyclePhase, string> = {
    follicular: "Follicular (energy rising)",
    ovulation: "Ovulation (peak energy)",
    luteal: "Luteal (may feel heavier)",
    menstrual: "Period (water weight is normal)",
  };
  return (
    <Card title="CYCLE-AWARE TREND" subtitle="Weight naturally fluctuates with your cycle — this adjusts for that">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-2 h-2 rounded-full ${data.currentPhase === "luteal" ? "bg-amber-400" : data.currentPhase === "menstrual" ? "bg-rose-400" : "bg-emerald-400"}`} />
        <p className={`text-[9px] font-mono ${phaseColors[data.currentPhase]}`}>{phaseLabels[data.currentPhase]}</p>
      </div>
      <p className="text-[8px] font-mono text-[var(--fg-25)] mb-2">{phaseInfo}</p>
      {data.samePhaseLastCycle !== null && (
        <div className="rounded-md bg-[var(--fg-03)] border border-[var(--fg-04)] p-2 mt-2">
          <p className="text-[8px] font-mono text-[var(--fg-30)]">VS SAME POINT LAST CYCLE</p>
          <p className={`text-sm font-bold font-mono ${data.deltaKg !== null && data.deltaKg < 0 ? "text-emerald-300" : "text-[var(--fg-50)]"}`}>
            {data.deltaKg !== null ? `${data.deltaKg > 0 ? "+" : ""}${Number(kgToUnit(data.deltaKg, wu).toFixed(1))} ${wu}` : "—"}
          </p>
          <p className="text-[7px] font-mono text-[var(--fg-20)]">{data.adjustedTrend}</p>
        </div>
      )}
    </Card>
  );
}

export function ExerciseExpenditureCard({ data, adaptiveMode }: { data: SessionExpenditure; adaptiveMode: boolean }) {
  return (
    <Card title="WORKOUT CALORIES BURNED" subtitle="Estimated energy used during this session">
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center">
          <p className="text-[8px] font-mono text-[var(--fg-30)]">BURNED</p>
          <p className="text-lg font-bold font-mono text-[rgb(var(--accent-light-rgb))]">{data.kcal}</p>
          <p className="text-[7px] font-mono text-[var(--fg-20)]">calories</p>
        </div>
        <div className="text-center">
          <p className="text-[8px] font-mono text-[var(--fg-30)]">INTENSITY<InfoTip term="Intensity (MET)" text="How hard your body worked compared to rest. Higher = more intense. Walking is ~3, lifting weights is ~5." /></p>
          <p className="text-lg font-bold font-mono text-[var(--fg-60)]">{data.met}</p>
        </div>
        <div className="text-center">
          <p className="text-[8px] font-mono text-[var(--fg-30)]">TIME</p>
          <p className="text-lg font-bold font-mono text-[var(--fg-60)]">{data.durationMinutes}</p>
          <p className="text-[7px] font-mono text-[var(--fg-20)]">min</p>
        </div>
      </div>
      {adaptiveMode && (
        <p className="text-[7px] font-mono text-cyan-300/30 mt-2 text-center">For display only — your daily targets already account for exercise</p>
      )}
    </Card>
  );
}

export function PatternWarningsCard({ warnings }: { warnings: PatternWarning[] }) {
  if (warnings.length === 0) return null;
  return (
    <Card title="HEADS UP" subtitle="We noticed something in your recent data">
      <div className="space-y-2">
        {warnings.map((w, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className={`text-[9px] mt-0.5 shrink-0 ${w.severity === "concern" ? "text-red-400" : w.severity === "warning" ? "text-amber-400" : "text-cyan-400"}`}>
              {w.severity === "concern" ? "⚠" : w.severity === "warning" ? "◆" : "ⓘ"}
            </span>
            <div>
              <p className="text-[9px] font-mono text-[var(--fg-50)]">{w.pattern}</p>
              <p className="text-[8px] font-mono text-[var(--fg-25)]">{w.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function ScenarioCard({ scenario, onDateChange, onTargetChange }: {
  scenario: ScenarioResult;
  onDateChange: (days: number) => void;
  onTargetChange: (kcal: number) => void;
}) {
  return (
    <Card title="WHAT IF?" subtitle="Drag the slider to see how timeline changes affect your daily calories">
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="rounded-md bg-[var(--fg-03)] border border-[var(--fg-04)] p-2 text-center">
          <p className="text-[8px] font-mono text-[var(--fg-30)]">DAILY TARGET</p>
          <p className="text-sm font-bold font-mono text-[rgb(var(--accent-light-rgb))]">{scenario.dailyTarget}</p>
          <p className="text-[7px] font-mono text-[var(--fg-20)]">calories</p>
        </div>
        <div className="rounded-md bg-[var(--fg-03)] border border-[var(--fg-04)] p-2 text-center">
          <p className="text-[8px] font-mono text-[var(--fg-30)]">GOAL DATE</p>
          <p className="text-sm font-bold font-mono text-[var(--fg-60)]">{scenario.etaDays}d</p>
          <p className="text-[7px] font-mono text-[var(--fg-20)]">{scenario.etaDate}</p>
        </div>
      </div>
      <div className="space-y-2">
        <div>
          <p className="text-[7px] font-mono text-[var(--fg-25)] mb-1">Adjust timeline</p>
          <input
            type="range"
            min={30}
            max={365}
            value={scenario.etaDays}
            onChange={(e) => onDateChange(Number(e.target.value))}
            className="w-full h-1 accent-[rgb(var(--accent-rgb))] bg-[var(--fg-10)] rounded-full appearance-none"
          />
          <div className="flex justify-between text-[7px] font-mono text-[var(--fg-15)]">
            <span>1 month</span>
            <span>1 year</span>
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className={`w-1.5 h-1.5 rounded-full ${scenario.feasibility.feasible ? "bg-emerald-400" : "bg-amber-400"}`} />
        <p className="text-[8px] font-mono text-[var(--fg-30)]">{scenario.feasibility.reason}</p>
      </div>
      <p className="text-[7px] font-mono text-[var(--fg-15)] mt-1">Rate: {scenario.rateKgPerWeek} kg/week</p>
    </Card>
  );
}

export function DietBreakCard({ onStart, suggestion }: { onStart: () => void; suggestion: string }) {
  return (
    <Card title="TIME FOR A BREAK?" subtitle="Your body may benefit from eating at maintenance for a bit">
      <p className="text-[8px] font-mono text-[var(--fg-30)] mb-3">{suggestion}</p>
      <button
        onClick={onStart}
        className="w-full text-[9px] font-mono py-2 rounded-lg border border-[rgb(var(--accent-rgb)/0.3)] text-[rgb(var(--accent-light-rgb)/0.6)] hover:text-[rgb(var(--accent-light-rgb))] hover:border-[rgb(var(--accent-rgb)/0.5)] transition"
      >
        Start a diet break (7-14 days at normal eating)
      </button>
    </Card>
  );
}

export function MonthlyInsightsCard({ data, weightUnit }: { data: MonthlyComparison; weightUnit: string }) {
  const kgToUnit = (v: number, u: string) => u === "lbs" ? v * 2.20462 : v;
  const fmtVol = (v: number) => { const c = kgToUnit(v, weightUnit); return c >= 1000 ? `${(c / 1000).toFixed(1)}k` : String(Math.round(c)); };
  const fmtDur = (s: number) => { const m = Math.floor(s / 60); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`; };
  const maxVol = Math.max(...data.months.map((m) => m.totalVolume), 1);

  return (
    <Card title="MONTHLY PERFORMANCE" subtitle="How this month compares to your recent training">
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="rounded-md bg-[var(--fg-03)] border border-[var(--fg-04)] p-2 text-center">
          <p className="text-lg font-bold font-mono text-[var(--fg-90)]">{data.current.workouts}</p>
          <p className="text-[7px] font-mono text-[var(--fg-25)]">workouts</p>
          {data.frequencyChange != null && (
            <p className={`text-[8px] font-mono mt-0.5 ${data.frequencyChange > 0 ? "text-emerald-300" : data.frequencyChange < 0 ? "text-orange-300" : "text-[var(--fg-30)]"}`}>
              {data.frequencyChange > 0 ? "+" : ""}{data.frequencyChange}%
            </p>
          )}
        </div>
        <div className="rounded-md bg-[var(--fg-03)] border border-[var(--fg-04)] p-2 text-center">
          <p className="text-lg font-bold font-mono text-[rgb(var(--accent-light-rgb))]">{fmtVol(data.current.totalVolume)}</p>
          <p className="text-[7px] font-mono text-[var(--fg-25)]">volume ({weightUnit})</p>
          {data.volumeChange != null && (
            <p className={`text-[8px] font-mono mt-0.5 ${data.volumeChange > 0 ? "text-emerald-300" : data.volumeChange < 0 ? "text-orange-300" : "text-[var(--fg-30)]"}`}>
              {data.volumeChange > 0 ? "+" : ""}{data.volumeChange}%
            </p>
          )}
        </div>
        <div className="rounded-md bg-[var(--fg-03)] border border-[var(--fg-04)] p-2 text-center">
          <p className="text-lg font-bold font-mono text-[var(--fg-90)]">{fmtDur(data.current.avgDuration)}</p>
          <p className="text-[7px] font-mono text-[var(--fg-25)]">avg session</p>
          {data.durationChange != null && (
            <p className={`text-[8px] font-mono mt-0.5 ${Math.abs(data.durationChange) <= 10 ? "text-[var(--fg-30)]" : data.durationChange > 0 ? "text-cyan-300" : "text-orange-300"}`}>
              {data.durationChange > 0 ? "+" : ""}{data.durationChange}%
            </p>
          )}
        </div>
      </div>
      <div className="flex items-end gap-[3px] h-16 mb-2">
        {data.months.map((m, i) => {
          const pct = Math.max(8, (m.totalVolume / maxVol) * 100);
          const isCurrent = i === data.months.length - 1;
          return (
            <div key={m.month} className="flex-1 flex flex-col items-center">
              <div
                className={`w-full rounded-md transition-all ${isCurrent ? "bg-gradient-to-t from-[rgb(var(--accent-rgb))] to-[rgb(var(--accent-light-rgb))]" : "bg-[var(--fg-06)]"}`}
                style={{ height: `${pct}%`, ...(isCurrent ? { boxShadow: "0 0 12px -3px rgb(var(--accent-rgb) / 0.5)" } : {}) }}
              />
              <p className={`text-[7px] font-mono mt-1 ${isCurrent ? "text-[rgb(var(--accent-light-rgb)/0.6)]" : "text-[var(--fg-15)]"}`}>
                {m.label.split(" ")[0]}
              </p>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3 text-[8px] font-mono text-[var(--fg-25)]">
        {data.streak > 1 && <span className="text-emerald-300/60">{data.streak}-month streak</span>}
        {data.bestMonth && <span>Best: {data.bestMonth.label} ({fmtVol(data.bestMonth.totalVolume)} {weightUnit})</span>}
      </div>
    </Card>
  );
}

export function StrengthBenchmarkCard({ data, weightUnit }: { data: StrengthBenchmarkResult; weightUnit: string }) {
  const kgToUnit = (v: number, u: string) => u === "lbs" ? v * 2.20462 : v;
  const top = data.exercises.slice(0, 8);

  return (
    <Card title="STRENGTH BENCHMARK" subtitle={data.period}>
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-[8px] font-mono text-[var(--fg-30)]">{data.totalUp} up</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-[var(--fg-20)]" />
          <span className="text-[8px] font-mono text-[var(--fg-30)]">{data.totalStable} stable</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-orange-400" />
          <span className="text-[8px] font-mono text-[var(--fg-30)]">{data.totalDown} down</span>
        </div>
      </div>
      <div className="space-y-1.5">
        {top.map((ex) => (
          <div key={ex.exerciseId} className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-mono text-[var(--fg-60)] truncate">{ex.exerciseName}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[8px] font-mono text-[var(--fg-25)]">
                {Math.round(kgToUnit(ex.previousE1rm, weightUnit))} → {Math.round(kgToUnit(ex.currentE1rm, weightUnit))}
              </span>
              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                ex.trend === "up" ? "text-emerald-300 bg-emerald-400/10" :
                ex.trend === "down" ? "text-orange-300 bg-orange-400/10" :
                "text-[var(--fg-30)] bg-[var(--fg-04)]"
              }`}>
                {ex.changePercent > 0 ? "+" : ""}{ex.changePercent}%
              </span>
            </div>
          </div>
        ))}
      </div>
      {data.strongestGain && (
        <p className="text-[8px] font-mono text-emerald-300/50 mt-2">
          Biggest gain: {data.strongestGain.exerciseName} (+{data.strongestGain.changePercent}%)
        </p>
      )}
      {data.biggestDrop && (
        <p className="text-[8px] font-mono text-orange-300/50 mt-1">
          Needs attention: {data.biggestDrop.exerciseName} ({data.biggestDrop.changePercent}%)
        </p>
      )}
    </Card>
  );
}

export function PhasePerformanceCard({ data, weightUnit }: { data: PhasePerformanceResult; weightUnit: string }) {
  const kgToUnit = (v: number, u: string) => u === "lbs" ? v * 2.20462 : v;
  const maxAvg = Math.max(...data.phases.map((p) => p.avgVolume), 1);
  const fmtDur = (s: number) => { const m = Math.floor(s / 60); return `${m}m`; };

  return (
    <Card title="CYCLE PHASE PERFORMANCE" subtitle="Your training output by menstrual cycle phase">
      <div className="grid grid-cols-4 gap-1.5 mb-3">
        {data.phases.map((p) => {
          const pct = Math.max(10, (p.avgVolume / maxAvg) * 100);
          const isBest = data.bestPhase?.phase === p.phase;
          return (
            <div key={p.phase} className="text-center">
              <div className="h-16 flex items-end justify-center mb-1">
                <div
                  className="w-full rounded-md"
                  style={{
                    height: `${pct}%`,
                    backgroundColor: p.color,
                    opacity: isBest ? 1 : 0.4,
                    boxShadow: isBest ? `0 0 12px -3px ${p.color}` : "none",
                  }}
                />
              </div>
              <p className="text-[8px] font-mono text-[var(--fg-50)]">{p.label.slice(0, 4)}</p>
              <p className="text-[7px] font-mono text-[var(--fg-25)]">{p.workouts}w</p>
              <p className="text-[7px] font-mono text-[var(--fg-20)]">{Math.round(kgToUnit(p.avgVolume, weightUnit))} {weightUnit}</p>
            </div>
          );
        })}
      </div>
      <p className="text-[8px] font-mono text-[var(--fg-35)] leading-relaxed">{data.recommendation}</p>
    </Card>
  );
}
