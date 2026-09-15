import { SupabaseClient } from "@supabase/supabase-js";

// ── Types ──

export type FatigueAlert = {
  type: "weight_drop" | "rating_decline" | "volume_overreach";
  severity: "warning" | "critical";
  message: string;
  detail: string;
  exercises?: string[];
};

export type IntelligenceReport = {
  fatigue: FatigueAlert[];
  deloadSuggested: boolean;
  rpeAvg: number | null;
};

// ── Fatigue Detection ──

export async function detectFatigue(
  supabase: SupabaseClient,
  userId: string,
  userSex: string,
): Promise<FatigueAlert[]> {
  const alerts: FatigueAlert[] = [];

  // Get enough sessions to cover 3-4 occurrences of each exercise in a split
  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("id, date, rating, total_volume, total_sets, title")
    .eq("user_id", userId)
    .eq("sex", userSex)
    .eq("status", "completed")
    .order("date", { ascending: false })
    .limit(20);

  if (!sessions || sessions.length < 3) return alerts;

  // 1. Session rating decline: 3+ consecutive sessions trending down
  const rated = sessions.filter((s: any) => s.rating != null);
  if (rated.length >= 3) {
    const recent3 = rated.slice(0, 3);
    const allDecline = recent3.every((s: any, i: number) =>
      i === 0 || s.rating <= rated[i - 1].rating
    );
    const avgRating = recent3.reduce((sum: number, s: any) => sum + s.rating, 0) / 3;
    if (allDecline && avgRating <= 2.5) {
      alerts.push({
        type: "rating_decline",
        severity: avgRating <= 2 ? "critical" : "warning",
        message: "Session quality declining",
        detail: `Your last 3 sessions averaged ${avgRating.toFixed(1)}/5. Consider a deload week.`,
      });
    }
  }

  // 2. Weight drops: compare per-exercise across their own session history
  const allIds = sessions.map((s: any) => s.id);
  const sessionOrder = new Map(sessions.map((s: any, i: number) => [s.id, i]));

  const { data: allLogs } = await supabase
    .from("exercise_set_logs")
    .select("exercise_id, weight, workout_session_id, exercises(name)")
    .in("workout_session_id", allIds)
    .eq("is_warmup", false);

  if (allLogs && allLogs.length > 0) {
    const byExercise: Record<string, { name: string; sessions: Map<string, number[]> }> = {};
    for (const l of allLogs) {
      const w = Number(l.weight) || 0;
      if (w === 0) continue;
      if (!byExercise[l.exercise_id]) {
        byExercise[l.exercise_id] = { name: (l.exercises as any)?.name || l.exercise_id, sessions: new Map() };
      }
      const group = byExercise[l.exercise_id];
      if (!group.sessions.has(l.workout_session_id)) group.sessions.set(l.workout_session_id, []);
      group.sessions.get(l.workout_session_id)!.push(w);
    }

    const droppedExercises: string[] = [];
    for (const [, ex] of Object.entries(byExercise)) {
      const sorted = [...ex.sessions.entries()].sort((a, b) =>
        (sessionOrder.get(a[0]) ?? 99) - (sessionOrder.get(b[0]) ?? 99)
      );
      if (sorted.length < 2) continue;
      const recentAvg = sorted[0][1].reduce((s, w) => s + w, 0) / sorted[0][1].length;
      const baselineWeights = sorted.slice(1, 4).flatMap(([, ws]) => ws);
      const baselineAvg = baselineWeights.reduce((s, w) => s + w, 0) / baselineWeights.length;
      if (baselineAvg > 0) {
        const dropPct = ((baselineAvg - recentAvg) / baselineAvg) * 100;
        if (dropPct >= 10) droppedExercises.push(ex.name);
      }
    }

    if (droppedExercises.length >= 2) {
      alerts.push({
        type: "weight_drop",
        severity: droppedExercises.length >= 3 ? "critical" : "warning",
        message: "Weight dropping on multiple lifts",
        detail: `${droppedExercises.join(", ")} down 10%+ from your recent baseline.`,
        exercises: droppedExercises,
      });
    }
  }

  // 3. RPE overreach: average RPE > 8.5 across last 3 sessions
  const recentIds = sessions.slice(0, 3).map((s: any) => s.id);
  if (recentIds.length > 0) {
    const { data: rpeLogs } = await supabase
      .from("exercise_set_logs")
      .select("rpe")
      .in("workout_session_id", recentIds)
      .not("rpe", "is", null);

    if (rpeLogs && rpeLogs.length >= 5) {
      const avgRpe = rpeLogs.reduce((s: number, l: any) => s + l.rpe, 0) / rpeLogs.length;
      if (avgRpe >= 8.5) {
        alerts.push({
          type: "volume_overreach",
          severity: avgRpe >= 9.2 ? "critical" : "warning",
          message: "Training intensity very high",
          detail: `Average RPE ${avgRpe.toFixed(1)} across last ${rpeLogs.length} sets. Risk of overtraining.`,
        });
      }
    }
  }

  return alerts;
}

// ── Full Report ──

export async function generateIntelligenceReport(
  supabase: SupabaseClient,
  userId: string,
  userSex: string,
): Promise<IntelligenceReport> {
  const fatigue = await detectFatigue(supabase, userId, userSex);

  let rpeAvg: number | null = null;
  const { data: recentSessions } = await supabase
    .from("workout_sessions")
    .select("id")
    .eq("user_id", userId)
    .eq("sex", userSex)
    .eq("status", "completed")
    .order("date", { ascending: false })
    .limit(3);

  if (recentSessions && recentSessions.length > 0) {
    const { data: rpeLogs } = await supabase
      .from("exercise_set_logs")
      .select("rpe")
      .in("workout_session_id", recentSessions.map((s: any) => s.id))
      .not("rpe", "is", null);

    if (rpeLogs && rpeLogs.length >= 3) {
      rpeAvg = rpeLogs.reduce((s: number, l: any) => s + l.rpe, 0) / rpeLogs.length;
    }
  }

  const deloadSuggested = fatigue.some(a => a.severity === "critical") || fatigue.length >= 2;

  return { fatigue, deloadSuggested, rpeAvg };
}
