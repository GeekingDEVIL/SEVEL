"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Flame, Trash2 } from "lucide-react";
import CubeLoader from "../../../components/ui/cube-loader";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../lib/AuthProvider";
import { useSex } from "../../../lib/useSex";
import { useUnits } from "../../../lib/useUnits";
import { kgToUnit } from "../../../lib/units";
import { ResponsiveContainer, BarChart, Bar, Cell, ReferenceLine, LabelList, XAxis, Tooltip } from "recharts";
import { type WeightEntry, type WeightContext, rematerializeWeightTrend } from "../../../lib/weightTrend";
import { type FoodEntry, type MealSlot, MEAL_SLOTS, rematerializeDailyIntake, calcAdherence } from "../../../lib/intakeLog";
import { buildLedger, avgDailyNet, projectWeightChange, projectWeightAtDate, daysUntil, type DailyBalance } from "../../../lib/energyLedger";
import { getFullCalorieSummary, ageFromDOB, type CalorieSummary, type GoalType, type ActivityLevel, type DietPreference, type Sex } from "../../../lib/calorieEngine";
import { checkFeasibility, type FeasibilityVerdict } from "../../../lib/energyGuardrails";
import { estimateObservedTdee, blendTdee, type TdeeEstimate } from "../../../lib/energyEstimator";
import { buildEnergyReceipt, type EnergyReceipt } from "../../../lib/systemValue";
import EnergyReceiptPanel from "../../../components/EnergyReceipt";
import { PredictionVsRealityCard, AnomalyCard, AdaptationCard, LeanMassCard, WeeklyBudgetCard, RecoveryCard, RecompCard, PatternWarningsCard, ScenarioCard, DietBreakCard, CycleCard, ExerciseExpenditureCard } from "../../../components/InsightsPanel";
import { buildPredictionVsReality, type PredictionAccuracy } from "../../../lib/predictionReality";
import { explainWeightAnomaly, type AnomalyExplanation } from "../../../lib/anomalyExplainer";
import { detectAdaptation, type AdaptationSignal } from "../../../lib/metabolicAdaptation";
import { assessLeanMassSignal, type LeanMassSignal } from "../../../lib/leanMassSignal";
import { calcWeeklyBudget, type WeeklyBudget } from "../../../lib/weeklyBudget";
import { getRecoveryAdjustment, type RecoveryAdjustment } from "../../../lib/recoveryEngine";
import { assessRecomp, type RecompAssessment } from "../../../lib/recompMode";
import { detectPatterns, type PatternWarning } from "../../../lib/energyGuardrails";
import { modelScenario, type ScenarioResult } from "../../../lib/scenarioModeling";
import { shouldSuggestDietBreak, planDietBreak } from "../../../lib/dietBreaks";
import { comparePhaseToPhase, estimateCyclePhase, getCyclePhaseInfo, computeAdaptiveCycleLength, fetchCycleLogs, type CycleAwareComparison } from "../../../lib/cycleAwareTrend";
import { estimateSessionExpenditure, type SessionExpenditure } from "../../../lib/exerciseExpenditure";
import { buildMonthlyInsights, type MonthlyComparison } from "../../../lib/monthlyInsights";
import { buildStrengthBenchmark, type StrengthBenchmarkResult } from "../../../lib/strengthBenchmark";
import { buildPhasePerformance, type PhasePerformanceResult } from "../../../lib/phasePerformance";

/* ─── helpers ─── */

function toDateString(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function todayString(): string {
    return toDateString(new Date());
}

const ACRONYM_EXPLAINERS: Record<string, string> = {
    TDEE: "Total Daily Energy Expenditure — how many calories your body burns in a day, including activity. Calculated as BMR x activity multiplier.",
    BMR: "Basal Metabolic Rate — calories your body needs at complete rest just to stay alive. Calculated using the Mifflin-St Jeor equation from your weight, height, age, and sex.",
    EMA: "Exponential Moving Average — a smoothed trend line that filters out daily weight fluctuations from water, food timing, etc. Shows your true weight direction.",
    BMI: "Body Mass Index — your weight relative to height. Used to adjust safe weight-loss rates (slower if already lean).",
};

function InfoTip({ term }: { term: string }) {
    const [open, setOpen] = useState(false);
    const text = ACRONYM_EXPLAINERS[term];
    if (!text) return null;
    return (
        <span className="relative inline-block ml-1">
            <button
                onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
                className="inline-flex items-center justify-center w-3 h-3 rounded-full border border-[var(--fg-15)] text-[6px] font-mono text-[var(--fg-25)] hover:text-[var(--fg-50)] hover:border-[var(--fg-30)] transition"
            >i</button>
            {open && (
                <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 w-52 p-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--fg-15)] text-[8px] font-mono text-[var(--fg-50)] leading-relaxed shadow-lg" onClick={(e) => e.stopPropagation()}>
                    <strong className="text-[var(--fg-70)]">{term}</strong> — {text}
                </span>
            )}
        </span>
    );
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-xl border border-[var(--fg-08)] bg-[var(--bg-card)]/95 px-3 py-2 text-[10px] font-mono">
            <p className="text-[var(--fg-50)] mb-1">{label}</p>
            {payload.map((p: any, i: number) => (
                <p key={i} style={{ color: p.color }}>
                    {p.name}: {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
                </p>
            ))}
        </div>
    );
};

type BodyWeightEntry = {
    weight: number;
    date: string;
    ema?: number;
};

/* ═══════════════════════════════════════════════════════ */

export default function IntakePage() {
    const { user } = useAuth();
    const router = useRouter();
    const { sex: userSex } = useSex();
    const weightUnit = useUnits();
    const isFemale = userSex === "female";

    const [loading, setLoading] = useState(true);

    /* ─── body weight (needed by loadIntake) ─── */
    const [bodyWeightData, setBodyWeightData] = useState<BodyWeightEntry[]>([]);

    /* ─── intake state ─── */
    const [intakeDate, setIntakeDate] = useState(() => todayString());
    const [intakeEntries, setIntakeEntries] = useState<FoodEntry[]>([]);
    const [intakeMealSlot, setIntakeMealSlot] = useState<MealSlot>("breakfast");
    const [intakeLabel, setIntakeLabel] = useState("");
    const [intakeKcal, setIntakeKcal] = useState("");
    const [intakeProtein, setIntakeProtein] = useState("");
    const [intakeCarbs, setIntakeCarbs] = useState("");
    const [intakeFat, setIntakeFat] = useState("");
    const [intakeAdherence, setIntakeAdherence] = useState<number | null>(null);
    const [ledger, setLedger] = useState<DailyBalance[]>([]);
    const [ledgerGoal, setLedgerGoal] = useState<{ targetWeightKg: number | null; targetDate: string | null; goalType: string } | null>(null);
    const [ledgerCalorieSummary, setLedgerCalorieSummary] = useState<CalorieSummary | null>(null);
    const [feasibility, setFeasibility] = useState<FeasibilityVerdict | null>(null);
    const [tdeeEstimate, setTdeeEstimate] = useState<TdeeEstimate | null>(null);
    const [adaptiveMode, setAdaptiveMode] = useState(false);
    const [energyReceipt, setEnergyReceipt] = useState<EnergyReceipt | null>(null);
    const [showReceipt, setShowReceipt] = useState(false);

    /* ─── insight state ─── */
    const [insightPrediction, setInsightPrediction] = useState<PredictionAccuracy | null>(null);
    const [insightAnomaly, setInsightAnomaly] = useState<AnomalyExplanation | null>(null);
    const [insightAdaptation, setInsightAdaptation] = useState<AdaptationSignal | null>(null);
    const [insightLeanMass, setInsightLeanMass] = useState<LeanMassSignal | null>(null);
    const [insightBudget, setInsightBudget] = useState<WeeklyBudget | null>(null);
    const [insightRecovery, setInsightRecovery] = useState<RecoveryAdjustment | null>(null);
    const [insightRecomp, setInsightRecomp] = useState<RecompAssessment | null>(null);
    const [insightPatterns, setInsightPatterns] = useState<PatternWarning[]>([]);
    const [insightScenario, setInsightScenario] = useState<ScenarioResult | null>(null);
    const [insightDietBreak, setInsightDietBreak] = useState<string | null>(null);
    const [insightCycle, setInsightCycle] = useState<CycleAwareComparison | null>(null);
    const [insightCyclePhaseInfo, setInsightCyclePhaseInfo] = useState<string>("");
    const [insightExercise, setInsightExercise] = useState<SessionExpenditure | null>(null);
    const [scenarioParams, setScenarioParams] = useState<{ currentKg: number; targetKg: number; tdee: number; bmr: number; sex: string; heightCm: number; goalType: string } | null>(null);

    const [myFoods, setMyFoods] = useState<{ id: string; label: string; kcal: number; protein_g: number; carbs_g: number; fat_g: number; use_count: number }[]>([]);
    const [intakeLoading, setIntakeLoading] = useState(false);
    const intakeLoadedDateRef = useRef<string | null>(null);

    /* ─── load body weight ─── */
    const loadBodyWeight = useCallback(async () => {
        if (!user) return;
        const [{ data: logs }, { data: trend }] = await Promise.all([
            supabase
                .from("body_weight_logs")
                .select("weight, logged_at, context, date")
                .eq("user_id", user.id)
                .eq("sex", userSex)
                .order("logged_at", { ascending: true })
                .limit(180),
            supabase
                .from("weight_trend")
                .select("date, raw_kg, ema_kg")
                .eq("user_id", user.id)
                .eq("sex", userSex)
                .order("date", { ascending: true }),
        ]);

        const emaByDate: Record<string, number> = {};
        (trend ?? []).forEach((t: any) => { emaByDate[t.date] = Number(t.ema_kg); });

        const byDate: Record<string, { weights: number[]; ema?: number }> = {};
        (logs ?? []).forEach((d: any) => {
            const dateKey = d.date || (d.logged_at as string).split("T")[0];
            if (!byDate[dateKey]) byDate[dateKey] = { weights: [] };
            byDate[dateKey].weights.push(Number(d.weight));
        });

        const entries: BodyWeightEntry[] = Object.entries(byDate)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([dateKey, val]) => {
                const avg = val.weights.reduce((a, b) => a + b, 0) / val.weights.length;
                return {
                    weight: Math.round(avg * 10) / 10,
                    date: new Date(dateKey + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" }),
                    ema: emaByDate[dateKey] ? Math.round(emaByDate[dateKey] * 10) / 10 : undefined,
                };
            });

        setBodyWeightData(entries);
    }, [user, userSex]);

    /* ─── loadIntake (the big one) ─── */
    const loadIntake = useCallback(async (date: string, force = false) => {
        if (!user) return;
        if (!force && intakeLoadedDateRef.current === date) return;
        setIntakeLoading(true);
        const [{ data: entries }, { data: dailyRows }, { data: allIntake }, { data: goalRows }, { data: prof }, { data: bodyStats }, { data: trendRows }, { data: savedFoods }] = await Promise.all([
            supabase
                .from("food_entries")
                .select("id, date, meal_slot, label, kcal, protein_g, carbs_g, fat_g, logged_at")
                .eq("user_id", user.id)
                .eq("sex", userSex)
                .eq("date", date)
                .order("logged_at", { ascending: true }),
            supabase
                .from("daily_intake")
                .select("date")
                .eq("user_id", user.id)
                .eq("sex", userSex)
                .gte("date", (() => { const _d = new Date(Date.now() - 30 * 86400000); return toDateString(_d); })()),
            supabase
                .from("daily_intake")
                .select("date, kcal")
                .eq("user_id", user.id)
                .eq("sex", userSex)
                .order("date", { ascending: true }),
            supabase
                .from("user_goals")
                .select("*")
                .eq("user_id", user.id)
                .eq("sex", userSex)
                .eq("is_active", true)
                .limit(1),
            supabase
                .from("profiles")
                .select("date_of_birth")
                .eq("id", user.id)
                .maybeSingle(),
            supabase
                .from("profile_body_stats")
                .select("height_cm, activity_level")
                .eq("user_id", user.id)
                .eq("sex", userSex)
                .maybeSingle(),
            supabase
                .from("weight_trend")
                .select("date, ema_kg")
                .eq("user_id", user.id)
                .eq("sex", userSex)
                .order("date", { ascending: true }),
            supabase
                .from("my_foods")
                .select("id, label, kcal, protein_g, carbs_g, fat_g, use_count")
                .eq("user_id", user.id)
                .order("use_count", { ascending: false })
                .limit(20),
        ]);
        setIntakeEntries((entries ?? []) as FoodEntry[]);
        setIntakeAdherence(calcAdherence(dailyRows ?? [], 30));
        setMyFoods((savedFoods ?? []).map((f: any) => ({ ...f, protein_g: Number(f.protein_g), carbs_g: Number(f.carbs_g), fat_g: Number(f.fat_g) })));

        const g = goalRows?.[0] as any;
        if (g) {
            setLedgerGoal({ targetWeightKg: g.target_weight_kg ? Number(g.target_weight_kg) : null, targetDate: g.target_date ?? null, goalType: g.goal_type ?? "general_fitness" });
            setAdaptiveMode(!!g.adaptive_mode);
        }

        const bwLatestRaw = bodyWeightData.length > 0 ? bodyWeightData[bodyWeightData.length - 1].weight : null;
        const bwLatest = (trendRows && trendRows.length > 0)
            ? Number(trendRows[trendRows.length - 1].ema_kg)
            : bwLatestRaw;
        if (bodyStats?.height_cm && prof?.date_of_birth && bwLatest) {
            const isAdaptive = !!g?.adaptive_mode;
            const baseSummary = getFullCalorieSummary({
                weightKg: bwLatest,
                heightCm: bodyStats.height_cm,
                ageYears: ageFromDOB(prof.date_of_birth),
                sex: userSex as Sex,
                activity: (bodyStats.activity_level as ActivityLevel) ?? "moderate",
                goalType: (g?.goal_type as GoalType) ?? "general_fitness",
                ratePerWeekKg: g?.rate_per_week_kg ?? undefined,
                diet: (g?.diet_preference as DietPreference) ?? "balanced",
                calorieOverride: g?.calorie_target_override ?? undefined,
            });

            let estimate: TdeeEstimate | null = null;
            if (allIntake && trendRows && trendRows.length >= 2) {
                estimate = estimateObservedTdee({
                    dailyIntakes: allIntake.map((r: any) => ({ date: r.date, kcal: Number(r.kcal) })),
                    trendWeights: trendRows.map((r: any) => ({ date: r.date, ema_kg: Number(r.ema_kg) })),
                    seedTdee: baseSummary.tdee,
                    previousEstimate: null,
                });
                setTdeeEstimate(estimate);
            }

            let blendedTdee: number | null = null;
            if (isAdaptive && estimate && estimate.method === "observed") {
                blendedTdee = blendTdee(baseSummary.tdee, estimate);
            }

            const summary = blendedTdee
                ? getFullCalorieSummary({
                    weightKg: bwLatest,
                    heightCm: bodyStats.height_cm,
                    ageYears: ageFromDOB(prof.date_of_birth),
                    sex: userSex as Sex,
                    activity: (bodyStats.activity_level as ActivityLevel) ?? "moderate",
                    goalType: (g?.goal_type as GoalType) ?? "general_fitness",
                    ratePerWeekKg: g?.rate_per_week_kg ?? undefined,
                    diet: (g?.diet_preference as DietPreference) ?? "balanced",
                    calorieOverride: g?.calorie_target_override ?? undefined,
                    blendedTdee,
                })
                : baseSummary;

            setLedgerCalorieSummary(summary);
            if (allIntake && allIntake.length > 0) {
                const today = todayString();
                const completedDays = allIntake.filter((r: any) => r.date < today);
                setLedger(buildLedger(completedDays.map((r: any) => ({ date: r.date, kcal: Number(r.kcal) })), summary.calorieTarget));
            }

            if (g?.target_weight_kg && bwLatest) {
                setFeasibility(checkFeasibility({
                    currentKg: bwLatest,
                    targetKg: Number(g.target_weight_kg),
                    targetDate: g.target_date ?? null,
                    tdee: summary.tdee,
                    bmr: summary.bmr,
                    sex: userSex,
                    heightCm: bodyStats.height_cm,
                    goalType: g.goal_type,
                }));
            }

            setEnergyReceipt(buildEnergyReceipt({
                bmr: baseSummary.bmr,
                tdee: baseSummary.tdee,
                calorieTarget: summary.calorieTarget,
                macros: summary.macros,
                observedTdee: estimate?.method === "observed" ? estimate.value : null,
                observedConfidence: estimate?.method === "observed" ? estimate.confidence : null,
                blendedTdee: blendedTdee,
                adaptiveMode: isAdaptive,
                hasOverride: !!g?.calorie_target_override,
                goalType: g?.goal_type ?? "general_fitness",
                weightKg: bwLatest,
                heightCm: bodyStats.height_cm,
                ageYears: ageFromDOB(prof.date_of_birth),
                sex: userSex,
                activity: bodyStats.activity_level ?? "moderate",
            }));

            const trendWeights = (trendRows ?? []).map((r: any) => ({ date: r.date, ema_kg: Number(r.ema_kg) }));
            const dailyIntakes = (allIntake ?? []).map((r: any) => ({ date: r.date, kcal: Number(r.kcal) }));

            if (trendWeights.length >= 7 && dailyIntakes.length >= 7) {
                try {
                    setInsightPrediction(buildPredictionVsReality({
                        startDate: trendWeights[0].date,
                        startWeightKg: trendWeights[0].ema_kg,
                        dailyTarget: summary.calorieTarget,
                        tdee: summary.tdee,
                        actualWeights: trendWeights,
                        intakes: dailyIntakes,
                    }));
                } catch { setInsightPrediction(null); }

                try {
                    const latestWeight = trendWeights[trendWeights.length - 1];
                    const prevWeight = trendWeights.length >= 3 ? trendWeights[trendWeights.length - 3] : null;
                    setInsightAnomaly(explainWeightAnomaly({
                        todayKg: latestWeight.ema_kg,
                        yesterdayKg: trendWeights.length >= 2 ? trendWeights[trendWeights.length - 2].ema_kg : null,
                        trendKg: latestWeight.ema_kg,
                        previousTrendKg: prevWeight?.ema_kg ?? null,
                        recentCarbsG: null,
                        hadLegDay: false,
                        loggingAdherence: intakeAdherence ?? 0,
                    }));
                } catch { setInsightAnomaly(null); }

                try {
                    setInsightAdaptation(detectAdaptation({ tdeeEstimates: [], sex: userSex as Sex }));
                } catch { setInsightAdaptation(null); }
            }

            const { data: strengthRows } = await supabase
                .from("exercise_set_logs")
                .select("created_at, weight, reps, workout_sessions!inner(sex)")
                .eq("user_id", user!.id)
                .eq("workout_sessions.sex", userSex)
                .gt("weight", 0)
                .order("created_at", { ascending: true })
                .limit(200);
            const strengthData = (strengthRows ?? []).map((r: any) => ({
                date: (r.created_at as string).split("T")[0],
                estimated1rm: Number(r.weight) * (1 + Number(r.reps) / 30),
            }));

            if (trendWeights.length >= 7 && strengthData.length >= 3) {
                try { setInsightLeanMass(assessLeanMassSignal({ weightTrend: trendWeights, strengthData, sex: userSex as Sex })); } catch { setInsightLeanMass(null); }
                if (g?.goal_type === "recomp" || g?.goal_type === "maintain") {
                    try { setInsightRecomp(assessRecomp({ weightTrend: trendWeights, strengthData, sex: userSex as Sex })); } catch { setInsightRecomp(null); }
                } else { setInsightRecomp(null); }
            }

            const today = todayString();
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
            try {
                setInsightBudget(calcWeeklyBudget({
                    dailyTarget: summary.calorieTarget,
                    intakes: dailyIntakes,
                    today,
                }));
            } catch { setInsightBudget(null); }

            try {
                setInsightRecovery(getRecoveryAdjustment({ tdee: summary.tdee, calorieTarget: summary.calorieTarget, sex: userSex as Sex }));
            } catch { setInsightRecovery(null); }

            try {
                setInsightPatterns(detectPatterns({
                    currentKg: bwLatest,
                    heightCm: bodyStats.height_cm,
                    targetKg: g?.target_weight_kg ? Number(g.target_weight_kg) : null,
                    weightTrend: trendWeights.slice(-14),
                    loggingAdherence: intakeAdherence ?? undefined,
                }));
            } catch { setInsightPatterns([]); }

            // Scenario modeling
            if (g?.target_weight_kg && bwLatest) {
                const sp = { currentKg: bwLatest, targetKg: Number(g.target_weight_kg), tdee: summary.tdee, bmr: summary.bmr, sex: userSex, heightCm: bodyStats.height_cm, goalType: g.goal_type ?? "general_fitness" };
                setScenarioParams(sp);
                try { setInsightScenario(modelScenario(sp)); } catch { setInsightScenario(null); }
            } else {
                setScenarioParams(null);
                setInsightScenario(null);
            }

            // Diet break suggestion
            const deficitWeeks = dailyIntakes.length > 0 ? Math.floor(dailyIntakes.length / 7) : 0;
            const tdeeDrop = insightAdaptation?.detected ? insightAdaptation.tdeeDrop : 0;
            if (shouldSuggestDietBreak({ deficitWeeks, tdeeDrop, adherencePct: intakeAdherence ?? 100, sex: userSex as Sex })) {
                const plan = planDietBreak({ tdee: summary.tdee, currentPhase: (g?.phase as any) ?? "active", deficitWeeks, sex: userSex as Sex });
                setInsightDietBreak(plan.reason);
            } else {
                setInsightDietBreak(null);
            }

            if (userSex === "female" && g?.cycle_tracking_enabled && trendWeights.length >= 7) {
                try {
                    const logs = await fetchCycleLogs(user!.id);
                    const periodStarts = logs.map(l => l.period_start);
                    const cycleLen = computeAdaptiveCycleLength(periodStarts);
                    const lastStart = periodStarts[0] ?? g.cycle_start_date ?? trendWeights[0].date;
                    const { phase } = estimateCyclePhase(lastStart, cycleLen, today);
                    const comparison = comparePhaseToPhase({
                        currentPhase: phase,
                        currentWeightKg: bwLatest,
                        weightHistory: trendWeights.map(w => ({ date: w.date, ema_kg: w.ema_kg })),
                        cycleLength: cycleLen,
                    });
                    setInsightCycle(comparison);
                    setInsightCyclePhaseInfo(getCyclePhaseInfo(phase));
                } catch { setInsightCycle(null); }
            } else {
                setInsightCycle(null);
            }

            // Exercise expenditure (latest session)
            const { data: latestSession } = await supabase
                .from("workout_sessions")
                .select("duration_seconds, total_sets")
                .eq("user_id", user!.id)
                .eq("status", "completed")
                .eq("sex", userSex)
                .order("date", { ascending: false })
                .limit(1);
            if (latestSession?.[0] && bwLatest) {
                try {
                    setInsightExercise(estimateSessionExpenditure({
                        bodyWeightKg: bwLatest,
                        durationSeconds: latestSession[0].duration_seconds,
                        totalSets: latestSession[0].total_sets,
                    }));
                } catch { setInsightExercise(null); }
            } else {
                setInsightExercise(null);
            }
        }
        intakeLoadedDateRef.current = date;
        setIntakeLoading(false);
    }, [user, bodyWeightData, userSex]);

    /* ─── initial load ─── */
    useEffect(() => {
        let cancelled = false;
        async function init() {
            setLoading(true);
            await loadBodyWeight();
            if (cancelled) return;
            setLoading(false);
        }
        init();
        return () => { cancelled = true; };
    }, [loadBodyWeight]);

    /* ─── load intake when date changes or body weight is ready ─── */
    useEffect(() => {
        if (loading) return;
        const force = intakeLoadedDateRef.current !== null && intakeLoadedDateRef.current !== intakeDate;
        loadIntake(intakeDate, force);
    }, [intakeDate, loadIntake, loading]);

    /* ─── scenario helpers ─── */
    function handleScenarioDateChange(days: number) {
        if (!scenarioParams) return;
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + days);
        try {
            setInsightScenario(modelScenario({ ...scenarioParams, targetDate: toDateString(targetDate) }));
        } catch { /* ignore */ }
    }

    function handleScenarioTargetChange(kcal: number) {
        if (!scenarioParams) return;
        try {
            setInsightScenario(modelScenario({ ...scenarioParams, dailyTarget: kcal }));
        } catch { /* ignore */ }
    }

    async function handleStartDietBreak() {
        if (!user || !ledgerCalorieSummary) return;
        const plan = planDietBreak({ tdee: ledgerCalorieSummary.tdee, currentPhase: "active", deficitWeeks: 8, sex: (scenarioParams?.sex as Sex) ?? undefined });
        await supabase.from("user_goals").update({ phase: "diet_break" }).eq("user_id", user.id).eq("sex", userSex).eq("is_active", true);
        setInsightDietBreak(null);
    }

    /* ═══════════════ RENDER ═══════════════ */

    return (
        <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] pb-24 md:pb-10 relative">
            <div className="relative z-10 max-w-xl mx-auto px-4 pt-6 space-y-5">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <button onClick={() => router.push("/track")} className="p-1.5 rounded-lg border border-[var(--fg-08)] text-[var(--fg-40)] hover:text-[var(--fg-70)] transition">
                        <ChevronLeft size={18} />
                    </button>
                    <h1 className="text-xl font-bold font-display text-[rgb(var(--accent-light-rgb))]">Intake</h1>
                </div>

                {loading ? (
                    <CubeLoader message="Loading intake..." />
                ) : (
                    <div className="space-y-4">
                        {/* Date selector */}
                        <div className="flex items-center justify-between">
                            <button
                                onClick={() => { const d = new Date(intakeDate); d.setDate(d.getDate() - 1); setIntakeDate(toDateString(d)); }}
                                className="text-[10px] font-mono px-3 py-2 rounded-lg border border-[var(--fg-08)] text-[var(--fg-40)] hover:text-[var(--fg-70)] transition"
                            >&#8249;</button>
                            <div className="text-center">
                                <p className="text-sm font-bold font-mono text-[var(--fg-80)]">
                                    {new Date(intakeDate + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                                </p>
                                {intakeDate !== todayString() && (
                                    <button onClick={() => setIntakeDate(todayString())} className="text-[8px] font-mono text-[rgb(var(--accent-light-rgb)/0.5)] hover:text-[rgb(var(--accent-light-rgb))] transition">TODAY</button>
                                )}
                            </div>
                            <button
                                onClick={() => { const d = new Date(intakeDate); d.setDate(d.getDate() + 1); setIntakeDate(toDateString(d)); }}
                                disabled={intakeDate >= todayString()}
                                className="text-[10px] font-mono px-3 py-2 rounded-lg border border-[var(--fg-08)] text-[var(--fg-40)] hover:text-[var(--fg-70)] disabled:opacity-20 transition"
                            >&#8250;</button>
                        </div>

                        {intakeLoading && (
                            <div className="space-y-4 animate-pulse">
                                <div className="glass-card p-4 space-y-3">
                                    <div className="h-3 w-28 rounded bg-[var(--fg-06)]" />
                                    <div className="h-8 w-24 mx-auto rounded bg-[var(--fg-06)]" />
                                    <div className="h-3 rounded-full bg-[var(--fg-04)]" />
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="h-10 rounded-md bg-[var(--fg-04)]" />
                                        <div className="h-10 rounded-md bg-[var(--fg-04)]" />
                                        <div className="h-10 rounded-md bg-[var(--fg-04)]" />
                                    </div>
                                </div>
                                <div className="glass-card p-4 space-y-3">
                                    <div className="h-3 w-20 rounded bg-[var(--fg-06)]" />
                                    <div className="h-24 rounded-md bg-[var(--fg-04)]" />
                                </div>
                            </div>
                        )}

                        {!intakeLoading && (<>
                        {/* ── #23 Daily Summary Hero Card ── */}
                        {(() => {
                            const totals = intakeEntries.reduce((acc, e) => ({
                                kcal: acc.kcal + e.kcal,
                                protein: acc.protein + Number(e.protein_g),
                                carbs: acc.carbs + Number(e.carbs_g),
                                fat: acc.fat + Number(e.fat_g),
                            }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });

                            const target = ledgerCalorieSummary?.calorieTarget ?? 0;
                            const remaining = Math.max(0, target - totals.kcal);
                            const pct = target > 0 ? Math.min((totals.kcal / target) * 100, 100) : 0;
                            const overTarget = target > 0 && totals.kcal > target;
                            const overBy = totals.kcal - target;
                            const isToday = intakeDate === todayString();
                            const macroTargets = ledgerCalorieSummary?.macros;

                            return (
                                <div
                                    className="relative overflow-hidden rounded-2xl border border-[rgb(var(--accent-rgb)/0.2)] p-5"
                                    style={{ background: "linear-gradient(135deg, rgb(var(--accent-rgb) / 0.12) 0%, rgb(var(--accent-rgb) / 0.03) 60%, transparent 100%)" }}
                                >
                                    <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[rgb(var(--accent-rgb)/0.15)] blur-[60px]" />
                                    <div className="relative z-10">
                                        {/* Top label + adherence */}
                                        <div className="flex items-center justify-between mb-3">
                                            <p className="text-[9px] font-mono tracking-[0.2em] text-[rgb(var(--accent-light-rgb)/0.5)]">{isToday ? "TODAY" : "DAILY SUMMARY"}</p>
                                            {intakeAdherence !== null && (
                                                <p className="text-[9px] font-mono text-[var(--fg-30)]">30D: <span className={intakeAdherence >= 80 ? "text-emerald-300" : intakeAdherence >= 50 ? "text-amber-300" : "text-red-300"}>{intakeAdherence}%</span></p>
                                            )}
                                        </div>

                                        {/* Big calorie number */}
                                        <div className="text-center mb-3">
                                            <p className="text-4xl font-bold font-mono text-[var(--fg-95)] leading-none">{totals.kcal.toLocaleString()}</p>
                                            <p className="text-[10px] font-mono text-[var(--fg-30)] mt-1">
                                                {target > 0 ? `of ${target.toLocaleString()} kcal` : "kcal consumed"}
                                            </p>
                                        </div>

                                        {/* Progress bar */}
                                        {target > 0 && (
                                            <div className="mb-3">
                                                <div className="h-3 rounded-full bg-[var(--fg-06)] overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-500"
                                                        style={{
                                                            width: `${Math.min(pct, 100)}%`,
                                                            background: overTarget
                                                                ? "linear-gradient(90deg, rgb(var(--accent-rgb)), rgb(251,113,133))"
                                                                : `rgb(var(--accent-rgb))`,
                                                            opacity: 0.8,
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Remaining / Over label */}
                                        {target > 0 && (
                                            <div className="text-center mb-3">
                                                {overTarget ? (
                                                    <p className="text-sm font-bold font-mono text-red-400">{overBy} kcal over <span className="text-[var(--fg-20)] font-normal">target</span></p>
                                                ) : (
                                                    <p className="text-sm font-bold font-mono text-emerald-300">{remaining} kcal <span className="text-[var(--fg-20)] font-normal">{isToday ? "remaining" : "under target"}</span></p>
                                                )}
                                            </div>
                                        )}

                                        {/* Macro row (P / C / F) */}
                                        {macroTargets ? (
                                            <div className="grid grid-cols-3 gap-3">
                                                {([
                                                    { label: "Protein", current: totals.protein, target: macroTargets.protein, color: "rgb(251,113,133)" },
                                                    { label: "Carbs", current: totals.carbs, target: macroTargets.carbs, color: "rgb(251,191,36)" },
                                                    { label: "Fat", current: totals.fat, target: macroTargets.fat, color: "rgb(96,165,250)" },
                                                ] as const).map((m) => {
                                                    const mpct = m.target > 0 ? Math.min((m.current / m.target) * 100, 100) : 0;
                                                    return (
                                                        <div key={m.label} className="text-center">
                                                            <p className="text-[8px] font-mono text-[var(--fg-30)] mb-0.5">{m.label}</p>
                                                            <div className="h-1.5 rounded-full bg-[var(--fg-06)] overflow-hidden">
                                                                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${mpct}%`, backgroundColor: m.color, opacity: 0.6 }} />
                                                            </div>
                                                            <p className="text-[9px] font-mono mt-0.5" style={{ color: m.color }}>{Math.round(m.current)}<span className="text-[var(--fg-20)]">/{m.target}g</span></p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-3 gap-3">
                                                <div className="text-center">
                                                    <p className="text-[8px] font-mono text-[var(--fg-30)]">PROTEIN</p>
                                                    <p className="text-lg font-bold font-mono text-rose-300">{Math.round(totals.protein)}g</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-[8px] font-mono text-[var(--fg-30)]">CARBS</p>
                                                    <p className="text-lg font-bold font-mono text-amber-300">{Math.round(totals.carbs)}g</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-[8px] font-mono text-[var(--fg-30)]">FAT</p>
                                                    <p className="text-lg font-bold font-mono text-blue-300">{Math.round(totals.fat)}g</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Card 2: Weekly Trend */}
                        {ledger.length > 0 && ledgerCalorieSummary && (() => {
                            const avg = avgDailyNet(ledger);
                            const cumul = ledger[ledger.length - 1].cumulative;
                            const weightDelta = projectWeightChange(cumul);
                            const bwLatest = bodyWeightData.length > 0 ? bodyWeightData[bodyWeightData.length - 1] : null;
                            const trendEntry = bodyWeightData.filter((d) => d.ema !== undefined);
                            const currentKg = trendEntry.length > 0 ? trendEntry[trendEntry.length - 1].ema! : bwLatest?.weight ?? null;
                            const hasTarget = ledgerGoal?.targetDate && ledgerGoal?.targetWeightKg;
                            const daysLeft = hasTarget ? daysUntil(ledgerGoal!.targetDate!) : 0;
                            const projectedKg = hasTarget && currentKg ? projectWeightAtDate(currentKg, avg, daysLeft) : null;

                            const goalType = ledgerGoal?.goalType ?? "general_fitness";
                            const wantsDeficit = goalType === "lose_weight" || goalType === "body_recomp";
                            const absAvg = Math.abs(avg);
                            const avgGood = wantsDeficit ? avg <= 0 : avg >= 0;
                            const absWeightDelta = Math.abs(weightDelta);
                            const weightGood = wantsDeficit ? weightDelta <= 0 : weightDelta >= 0;

                            const sparkData = ledger.slice(-14).map((d) => ({ date: d.date.slice(5), net: d.net }));

                            const weekCount = Math.max(1, Math.ceil(ledger.length / 7));
                            const avgPerWeek = Math.abs(Math.round(weightDelta / weekCount * 100) / 100);

                            // Streak: consecutive days where intake was within +/-10% of target
                            const target = ledgerCalorieSummary.calorieTarget;
                            const margin = target * 0.10;
                            const streakDots = ledger.slice(-7).map((d) => {
                                const diff = Math.abs(d.intake - target);
                                return { date: d.date, hit: diff <= margin };
                            });
                            const currentStreak = [...streakDots].reverse().reduce((s, d) => d.hit ? s + 1 : s, 0);

                            const contextParts: string[] = [];
                            contextParts.push(`Avg ${absAvg} kcal ${avg < 0 ? "under" : "over"} target across ${ledger.length} day${ledger.length !== 1 ? "s" : ""}`);
                            if (absWeightDelta >= 0.1) {
                                contextParts.push(`on pace to ${weightDelta < 0 ? "lose" : "gain"} ~${avgPerWeek} ${weightUnit}/week`);
                            }

                            return (
                                <div className="rounded-lg border border-[rgb(var(--accent-rgb)/0.15)] bg-[var(--fg-02)] p-4" style={{ boxShadow: "inset 0 1px 0 rgb(var(--accent-rgb) / 0.06)" }}>
                                    <p className="text-[10px] font-mono tracking-widest text-[var(--fg-25)] mb-3">WEEKLY TREND</p>

                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <div className="rounded-md bg-[var(--fg-03)] border border-[var(--fg-04)] p-2.5 text-center">
                                            <p className="text-[8px] font-mono text-[var(--fg-30)] mb-1">AVG VS TARGET</p>
                                            <p className={`text-sm font-bold font-mono ${avgGood ? "text-emerald-300" : "text-amber-300"}`}>
                                                {avg === 0 ? "On target" : `${absAvg} ${avg < 0 ? "under" : "over"}`}
                                            </p>
                                            <p className="text-[7px] font-mono text-[var(--fg-20)]">kcal/day</p>
                                        </div>
                                        <div className="rounded-md bg-[var(--fg-03)] border border-[var(--fg-04)] p-2.5 text-center">
                                            <p className="text-[8px] font-mono text-[var(--fg-30)] mb-1">WEEKLY PACE</p>
                                            <p className={`text-sm font-bold font-mono ${weightGood ? "text-emerald-300" : "text-amber-300"}`}>
                                                ~{avgPerWeek} {weightUnit}/{weightDelta < 0 ? "lost" : "gained"}
                                            </p>
                                            <p className="text-[7px] font-mono text-[var(--fg-20)]">per week</p>
                                        </div>
                                    </div>

                                    {/* Streak dots */}
                                    {streakDots.length > 0 && (
                                        <div className="mb-3 flex items-center justify-between">
                                            <div className="flex items-center gap-1">
                                                <p className="text-[8px] font-mono text-[var(--fg-30)] mr-1">STREAK</p>
                                                {streakDots.map((d, i) => (
                                                    <div key={i} className={`w-2 h-2 rounded-full ${d.hit ? "bg-emerald-400/70" : "bg-[var(--fg-10)]"}`} title={d.date} />
                                                ))}
                                            </div>
                                            {currentStreak > 0 && (
                                                <p className="text-[8px] font-mono text-emerald-300/50">{currentStreak} day{currentStreak !== 1 ? "s" : ""} on target</p>
                                            )}
                                        </div>
                                    )}

                                    {/* Sparkline */}
                                    {sparkData.length >= 3 && (
                                        <div className="mb-3 rounded-md bg-[var(--fg-02)] border border-[var(--fg-04)] p-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-[8px] font-mono text-[var(--fg-25)]">DAILY NET (last {sparkData.length}d)</p>
                                                <div className="flex items-center gap-2.5">
                                                    <span className="flex items-center gap-1 text-[7px] font-mono text-[var(--fg-25)]">
                                                        <span className="w-1.5 h-1.5 rounded-[2px]" style={{ background: "rgb(110, 231, 183)" }} /> Under
                                                    </span>
                                                    <span className="flex items-center gap-1 text-[7px] font-mono text-[var(--fg-25)]">
                                                        <span className="w-1.5 h-1.5 rounded-[2px]" style={{ background: "rgb(252, 211, 77)" }} /> Over
                                                    </span>
                                                </div>
                                            </div>
                                            <ResponsiveContainer width="100%" height={110}>
                                                <BarChart data={sparkData} margin={{ top: 16, right: 4, bottom: 0, left: 4 }} barCategoryGap="28%">
                                                    <ReferenceLine y={0} stroke="var(--fg-10)" />
                                                    <Bar dataKey="net" radius={[3, 3, 3, 3]} isAnimationActive={false} maxBarSize={22}>
                                                        {sparkData.map((d, i) => (
                                                            <Cell key={i} fill={d.net <= 0 ? "rgb(110, 231, 183)" : "rgb(252, 211, 77)"} fillOpacity={0.7} />
                                                        ))}
                                                        <LabelList
                                                            dataKey="net"
                                                            content={(props: any) => {
                                                                const { x, y, width, height, value } = props;
                                                                const label = Math.abs(value) >= 1000 ? `${value > 0 ? "+" : ""}${(value / 1000).toFixed(1)}k` : `${value > 0 ? "+" : ""}${value}`;
                                                                const ty = value <= 0 ? y + height + 10 : y - 4;
                                                                return (
                                                                    <text x={x + width / 2} y={ty} textAnchor="middle" fontSize={8} fontFamily="monospace" fill="var(--fg-50)">
                                                                        {label}
                                                                    </text>
                                                                );
                                                            }}
                                                        />
                                                    </Bar>
                                                    <XAxis dataKey="date" tick={{ fontSize: 8, fill: "var(--fg-25)" }} axisLine={false} tickLine={false} interval={sparkData.length > 10 ? 1 : 0} />
                                                    <Tooltip
                                                        cursor={{ fill: "var(--fg-04)" }}
                                                        contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--fg-12)", borderRadius: 8, fontSize: 10, fontFamily: "monospace", padding: "6px 10px" }}
                                                        labelStyle={{ color: "var(--fg-40)", marginBottom: 2 }}
                                                        itemStyle={{ padding: 0 }}
                                                        formatter={(v: any) => [`${v > 0 ? "+" : ""}${v} kcal`, v <= 0 ? "Under target" : "Over target"]}
                                                    />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}

                                    {hasTarget && projectedKg !== null && (
                                        <div className="rounded-md bg-[var(--fg-03)] border border-[var(--fg-06)] p-3 mt-2">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-[8px] font-mono text-[var(--fg-30)]">PROJECTED AT TARGET DATE</p>
                                                    <p className="text-[8px] font-mono text-[var(--fg-20)] mt-0.5">
                                                        {new Date(ledgerGoal!.targetDate! + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} ({daysLeft}d left)
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-lg font-bold font-mono text-[rgb(var(--accent-light-rgb))]">{Math.round(kgToUnit(projectedKg, weightUnit) * 10) / 10} <span className="text-xs text-[var(--fg-30)]">{weightUnit}</span></p>
                                                    <p className="text-[8px] font-mono text-[var(--fg-20)]">target: {Math.round(kgToUnit(Number(ledgerGoal!.targetWeightKg!), weightUnit) * 10) / 10} {weightUnit}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <p className="text-[8px] font-mono text-[var(--fg-20)] mt-3 text-center leading-relaxed">{contextParts.join(" — ")}.</p>
                                </div>
                            );
                        })()}

                        {/* Feasibility verdict */}
                        {feasibility && (
                            <div className={`rounded-lg border p-4 ${feasibility.feasible ? "border-emerald-400/20 bg-emerald-400/[0.03]" : "border-amber-400/20 bg-amber-400/[0.03]"}`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className={`w-2 h-2 rounded-full ${feasibility.feasible ? "bg-emerald-400" : "bg-amber-400"}`} />
                                    <p className="text-[10px] font-mono tracking-widest text-[var(--fg-30)]">{feasibility.feasible ? "ON TRACK" : "ADJUST NEEDED"}</p>
                                </div>
                                <p className="text-xs font-mono text-[var(--fg-60)] mb-2">{feasibility.reason}</p>
                                {!feasibility.feasible && feasibility.suggestedDate && (
                                    <div className="rounded-md bg-[var(--fg-04)] border border-[var(--fg-06)] p-2 mt-1">
                                        <p className="text-[8px] font-mono text-[var(--fg-30)]">SUGGESTED TARGET DATE</p>
                                        <p className="text-sm font-bold font-mono text-[rgb(var(--accent-light-rgb))]">
                                            {new Date(feasibility.suggestedDate + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                                        </p>
                                        <p className="text-[8px] font-mono text-[var(--fg-20)] mt-0.5">at {Math.round(kgToUnit(feasibility.safeRateKgWeek, weightUnit) * 100) / 100} {weightUnit}/week safe rate</p>
                                    </div>
                                )}
                                {feasibility.feasible && feasibility.requiredRateKgWeek > 0 && (
                                    <p className="text-[8px] font-mono text-[var(--fg-20)]">Required rate: {Math.round(kgToUnit(feasibility.requiredRateKgWeek, weightUnit) * 100) / 100} {weightUnit}/week · Safe max: {Math.round(kgToUnit(feasibility.safeRateKgWeek, weightUnit) * 100) / 100} {weightUnit}/week</p>
                                )}
                                {feasibility.violations.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                        {feasibility.violations.map((v, i) => (
                                            <div key={i} className="text-[8px] font-mono text-[var(--fg-25)] flex gap-2">
                                                <span className="text-amber-300/50 shrink-0">&#9888;</span>
                                                <span><span className="text-[var(--fg-40)]">{v.rule}:</span> {v.detail}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Adaptive TDEE */}
                        {ledgerCalorieSummary && (
                            <div className="glass-card p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-[10px] font-mono tracking-widest text-[var(--fg-25)]">ADAPTIVE MODE</p>
                                    <button
                                        onClick={async () => {
                                            if (!user) return;
                                            const next = !adaptiveMode;
                                            setAdaptiveMode(next);
                                            await supabase.from("user_goals").update({ adaptive_mode: next, updated_at: new Date().toISOString() }).eq("user_id", user.id).eq("sex", userSex).eq("is_active", true);
                                        }}
                                        className={`relative w-10 h-5 rounded-full transition-colors ${adaptiveMode ? "bg-[rgb(var(--accent-rgb))]" : "bg-[var(--fg-10)]"}`}
                                    >
                                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${adaptiveMode ? "translate-x-5" : "translate-x-0.5"}`} />
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-md bg-[var(--fg-03)] border border-[var(--fg-06)] p-3 text-center">
                                        <p className="text-[8px] font-mono text-[var(--fg-30)]">CALCULATED TDEE<InfoTip term="TDEE" /></p>
                                        <p className="text-lg font-bold font-mono text-[var(--fg-60)]">{ledgerCalorieSummary.tdee}</p>
                                        <p className="text-[7px] font-mono text-[var(--fg-15)]">from profile</p>
                                    </div>
                                    <div className={`rounded-md border p-3 text-center ${tdeeEstimate ? "bg-[rgb(var(--accent-rgb)/0.05)] border-[rgb(var(--accent-rgb)/0.2)]" : "bg-[var(--fg-03)] border-[var(--fg-06)]"}`}>
                                        <p className="text-[8px] font-mono text-[var(--fg-30)]">OBSERVED TDEE<InfoTip term="TDEE" /></p>
                                        {tdeeEstimate ? (
                                            <>
                                                <p className="text-lg font-bold font-mono text-[rgb(var(--accent-light-rgb))]">{tdeeEstimate.value}</p>
                                                <p className="text-[7px] font-mono text-[var(--fg-15)]">{tdeeEstimate.windowDays}d data · {tdeeEstimate.method}</p>
                                            </>
                                        ) : (
                                            <>
                                                <p className="text-lg font-bold font-mono text-[var(--fg-20)]">—</p>
                                                <p className="text-[7px] font-mono text-[var(--fg-15)]">need 14+ days</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                                {adaptiveMode && tdeeEstimate && (
                                    <div className="mt-3 rounded-md bg-[var(--fg-03)] border border-[var(--fg-06)] p-2 text-center">
                                        <p className="text-[8px] font-mono text-[var(--fg-30)]">BLENDED TDEE<InfoTip term="TDEE" /></p>
                                        <p className="text-sm font-bold font-mono text-[rgb(var(--accent-light-rgb))]">
                                            {blendTdee(ledgerCalorieSummary.tdee, tdeeEstimate)} <span className="text-xs text-[var(--fg-20)]">kcal</span>
                                        </p>
                                        <p className="text-[7px] font-mono text-[var(--fg-15)]">weighted blend · observed confidence ramps over 28 days</p>
                                    </div>
                                )}
                                {adaptiveMode && !tdeeEstimate && (
                                    <p className="text-[8px] font-mono text-[var(--fg-20)] mt-2 text-center">Log intake and morning weights for 14+ days to enable adaptive estimation.</p>
                                )}
                                {energyReceipt && (
                                    <button
                                        onClick={() => setShowReceipt(true)}
                                        className="w-full mt-3 text-[9px] font-mono py-2 rounded-lg border border-[var(--fg-08)] text-[var(--fg-25)] hover:text-[var(--fg-50)] hover:border-[var(--fg-15)] transition"
                                    >
                                        Show the receipt
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Add entry form */}
                        <div className="glass-card p-4 space-y-3">
                            <p className="text-[10px] font-mono tracking-widest text-[var(--fg-25)]">LOG FOOD</p>

                            {/* Meal slot */}
                            <div className="flex flex-wrap gap-1.5">
                                {MEAL_SLOTS.map((s) => (
                                    <button
                                        key={s.value}
                                        onClick={() => setIntakeMealSlot(s.value)}
                                        className={`text-[9px] font-mono px-2.5 py-1.5 rounded-md border transition ${intakeMealSlot === s.value ? "border-[rgb(var(--accent-rgb)/0.4)] bg-[rgb(var(--accent-rgb)/0.1)] text-[rgb(var(--accent-light-rgb))]" : "border-[var(--fg-08)] text-[var(--fg-30)] hover:text-[var(--fg-50)]"}`}
                                    >
                                        {s.label}
                                    </button>
                                ))}
                            </div>

                            {/* Label */}
                            <input
                                type="text"
                                value={intakeLabel}
                                onChange={(e) => setIntakeLabel(e.target.value)}
                                placeholder="What did you eat? (optional)"
                                className="w-full h-10 rounded-lg bg-[var(--fg-04)] border border-[var(--fg-08)] px-3 text-sm font-mono focus:outline-none focus:border-[rgb(var(--accent-rgb)/0.4)] transition placeholder:text-[var(--fg-20)]"
                            />

                            {/* Macros grid */}
                            <div className="grid grid-cols-4 gap-2">
                                <div>
                                    <label className="text-[8px] font-mono text-[var(--fg-30)] block mb-1">KCAL *</label>
                                    <input type="number" min="0" inputMode="numeric" onWheel={(e) => (e.target as HTMLElement).blur()} value={intakeKcal} onChange={(e) => setIntakeKcal(e.target.value)} placeholder="—" className="w-full h-10 rounded-lg bg-[var(--fg-04)] border border-[var(--fg-08)] text-center text-sm font-bold font-mono focus:outline-none focus:border-[rgb(var(--accent-rgb)/0.4)] transition placeholder:text-[var(--fg-15)]" />
                                </div>
                                <div>
                                    <label className="text-[8px] font-mono text-rose-300/50 block mb-1">PROT (g)</label>
                                    <input type="number" min="0" inputMode="decimal" onWheel={(e) => (e.target as HTMLElement).blur()} value={intakeProtein} onChange={(e) => setIntakeProtein(e.target.value)} placeholder="—" className="w-full h-10 rounded-lg bg-[var(--fg-04)] border border-[var(--fg-08)] text-center text-sm font-mono focus:outline-none focus:border-[rgb(var(--accent-rgb)/0.4)] transition placeholder:text-[var(--fg-15)]" />
                                </div>
                                <div>
                                    <label className="text-[8px] font-mono text-amber-300/50 block mb-1">CARBS (g)</label>
                                    <input type="number" min="0" inputMode="decimal" onWheel={(e) => (e.target as HTMLElement).blur()} value={intakeCarbs} onChange={(e) => setIntakeCarbs(e.target.value)} placeholder="—" className="w-full h-10 rounded-lg bg-[var(--fg-04)] border border-[var(--fg-08)] text-center text-sm font-mono focus:outline-none focus:border-[rgb(var(--accent-rgb)/0.4)] transition placeholder:text-[var(--fg-15)]" />
                                </div>
                                <div>
                                    <label className="text-[8px] font-mono text-blue-300/50 block mb-1">FAT (g)</label>
                                    <input type="number" min="0" inputMode="decimal" onWheel={(e) => (e.target as HTMLElement).blur()} value={intakeFat} onChange={(e) => setIntakeFat(e.target.value)} placeholder="—" className="w-full h-10 rounded-lg bg-[var(--fg-04)] border border-[var(--fg-08)] text-center text-sm font-mono focus:outline-none focus:border-[rgb(var(--accent-rgb)/0.4)] transition placeholder:text-[var(--fg-15)]" />
                                </div>
                            </div>

                            <button
                                onClick={async () => {
                                    if (!user || !intakeKcal) return;
                                    await supabase.from("food_entries").insert({
                                        user_id: user.id,
                                        date: intakeDate,
                                        meal_slot: intakeMealSlot,
                                        label: intakeLabel.trim() || null,
                                        kcal: Number(intakeKcal),
                                        protein_g: Number(intakeProtein) || 0,
                                        carbs_g: Number(intakeCarbs) || 0,
                                        fat_g: Number(intakeFat) || 0,
                                        sex: userSex,
                                    });
                                    await rematerializeDailyIntake(user.id, intakeDate, userSex);
                                    const trimmedLabel = intakeLabel.trim();
                                    if (trimmedLabel) {
                                        const existing = myFoods.find((f) => f.label.toLowerCase() === trimmedLabel.toLowerCase());
                                        if (existing) {
                                            await supabase.from("my_foods").update({
                                                kcal: Number(intakeKcal),
                                                protein_g: Number(intakeProtein) || 0,
                                                carbs_g: Number(intakeCarbs) || 0,
                                                fat_g: Number(intakeFat) || 0,
                                                use_count: existing.use_count + 1,
                                                last_used_at: new Date().toISOString(),
                                            }).eq("id", existing.id);
                                        } else {
                                            await supabase.from("my_foods").insert({
                                                user_id: user.id,
                                                label: trimmedLabel,
                                                kcal: Number(intakeKcal),
                                                protein_g: Number(intakeProtein) || 0,
                                                carbs_g: Number(intakeCarbs) || 0,
                                                fat_g: Number(intakeFat) || 0,
                                            });
                                        }
                                    }
                                    setIntakeLabel("");
                                    setIntakeKcal("");
                                    setIntakeProtein("");
                                    setIntakeCarbs("");
                                    setIntakeFat("");
                                    await loadIntake(intakeDate, true);
                                }}
                                disabled={!intakeKcal}
                                className="w-full text-[10px] font-mono py-3 rounded-lg border border-[rgb(var(--accent-rgb)/0.3)] text-[rgb(var(--accent-light-rgb))] hover:bg-[rgb(var(--accent-rgb)/0.1)] disabled:opacity-30 disabled:cursor-not-allowed transition"
                            >
                                LOG ENTRY
                            </button>
                        </div>

                        {/* My Foods — quick relog */}
                        {myFoods.length > 0 && (
                            <div className="glass-card p-4">
                                <p className="text-[10px] font-mono tracking-widest text-[var(--fg-25)] mb-2">MY FOODS</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {myFoods.map((food) => (
                                        <button
                                            key={food.id}
                                            onClick={async () => {
                                                if (!user) return;
                                                await supabase.from("food_entries").insert({
                                                    user_id: user.id,
                                                    date: intakeDate,
                                                    meal_slot: intakeMealSlot,
                                                    label: food.label,
                                                    kcal: food.kcal,
                                                    protein_g: food.protein_g,
                                                    carbs_g: food.carbs_g,
                                                    fat_g: food.fat_g,
                                                    sex: userSex,
                                                });
                                                await rematerializeDailyIntake(user.id, intakeDate, userSex);
                                                await supabase.from("my_foods").update({ use_count: food.use_count + 1, last_used_at: new Date().toISOString() }).eq("id", food.id);
                                                await loadIntake(intakeDate, true);
                                            }}
                                            className="text-[9px] font-mono px-2.5 py-1.5 rounded-md border border-[var(--fg-08)] text-[var(--fg-40)] hover:text-[var(--fg-70)] hover:border-[rgb(var(--accent-rgb)/0.3)] hover:bg-[rgb(var(--accent-rgb)/0.05)] transition"
                                        >
                                            {food.label} <span className="text-[var(--fg-20)] ml-1">{food.kcal}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Entries list */}
                        {intakeEntries.length > 0 && (
                            <div className="glass-card p-4 space-y-2">
                                <p className="text-[10px] font-mono tracking-widest text-[var(--fg-25)] mb-2">ENTRIES</p>
                                {intakeEntries.map((entry) => (
                                    <div key={entry.id} className="flex items-center justify-between py-2 border-b border-[var(--fg-04)] last:border-0">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-[var(--fg-06)] text-[var(--fg-30)] uppercase">{entry.meal_slot}</span>
                                                {entry.label && <span className="text-xs font-mono text-[var(--fg-60)] truncate">{entry.label}</span>}
                                            </div>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-xs font-bold font-mono text-[rgb(var(--accent-light-rgb))]">{entry.kcal} kcal</span>
                                                <span className="text-[9px] font-mono text-rose-300/60">P{Math.round(Number(entry.protein_g))}</span>
                                                <span className="text-[9px] font-mono text-amber-300/60">C{Math.round(Number(entry.carbs_g))}</span>
                                                <span className="text-[9px] font-mono text-blue-300/60">F{Math.round(Number(entry.fat_g))}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={async () => {
                                                if (!user) return;
                                                await supabase.from("food_entries").delete().eq("id", entry.id);
                                                await rematerializeDailyIntake(user.id, intakeDate, userSex);
                                                await loadIntake(intakeDate, true);
                                            }}
                                            className="shrink-0 p-2 text-[var(--fg-20)] hover:text-red-400 transition"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {intakeEntries.length === 0 && (
                            <div className="rounded-lg border border-dashed border-[var(--fg-10)] p-8 text-center">
                                <Flame size={20} className="mx-auto text-[var(--fg-15)] mb-2" />
                                <p className="text-xs font-mono text-[var(--fg-30)]">No entries for this day.</p>
                                <p className="text-[9px] font-mono text-[var(--fg-15)] mt-1">Log your meals to track daily intake and build adherence.</p>
                            </div>
                        )}

                        {/* ── INSIGHTS ── */}
                        {(insightBudget || insightPrediction || insightAnomaly || insightAdaptation || insightLeanMass || insightRecovery || insightRecomp || insightPatterns.length > 0 || insightScenario || insightDietBreak || insightCycle || insightExercise) && (
                            <div className="space-y-3 mt-4">
                                <p className="text-[10px] font-mono tracking-widest text-[var(--fg-25)]">INSIGHTS</p>
                                {insightPatterns.length > 0 && <PatternWarningsCard warnings={insightPatterns} />}
                                {insightDietBreak && <DietBreakCard onStart={handleStartDietBreak} suggestion={insightDietBreak} />}
                                {insightBudget && <WeeklyBudgetCard data={insightBudget} />}
                                {insightExercise && <ExerciseExpenditureCard data={insightExercise} adaptiveMode={adaptiveMode} />}
                                {insightRecovery && <RecoveryCard data={insightRecovery} />}
                                {insightAnomaly && <AnomalyCard data={insightAnomaly} />}
                                {insightPrediction && <PredictionVsRealityCard data={insightPrediction} />}
                                {insightAdaptation && <AdaptationCard data={insightAdaptation} />}
                                {insightLeanMass && <LeanMassCard data={insightLeanMass} />}
                                {insightRecomp && <RecompCard data={insightRecomp} />}
                                {insightCycle && <CycleCard data={insightCycle} phaseInfo={insightCyclePhaseInfo} />}
                                {insightScenario && <ScenarioCard scenario={insightScenario} onDateChange={handleScenarioDateChange} onTargetChange={handleScenarioTargetChange} />}
                            </div>
                        )}
                        </>
                        )}
                    </div>
                )}
            </div>

            {showReceipt && energyReceipt && (
                <EnergyReceiptPanel receipt={energyReceipt} onClose={() => setShowReceipt(false)} />
            )}
        </main>
    );
}
