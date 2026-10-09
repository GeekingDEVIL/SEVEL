import { supabase } from "./supabase";
import { computeCharacterLevel, getRankForLevel } from "./characterEngine";

export async function updateUserStats(userId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, avatar_url, sex")
    .eq("id", userId)
    .maybeSingle();
  const username = profile?.username ?? "Unknown";
  const avatarUrl = profile?.avatar_url ?? null;
  const sex = profile?.sex ?? "male";

  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("xp_earned, total_volume, date")
    .eq("user_id", userId)
    .eq("status", "completed")
    .eq("sex", sex);

  const totalXp = (sessions ?? []).reduce((s, r: any) => s + (r.xp_earned || 0), 0);
  const totalVolume = (sessions ?? []).reduce((s, r: any) => s + (Number(r.total_volume) || 0), 0);
  const totalWorkouts = (sessions ?? []).length;
  const levelInfo = computeCharacterLevel(totalXp);
  const rank = getRankForLevel(levelInfo.level);

  const { data: plans } = await supabase
    .from("recurring_plans")
    .select("weekday, is_rest, template_id")
    .eq("user_id", userId)
    .eq("sex", sex);
  const scheduledDays = new Set(
    (plans ?? []).filter((p: any) => !p.is_rest && p.template_id).map((p: any) => p.weekday)
  );
  const hasSchedule = scheduledDays.size > 0;
  const completedDates = new Set((sessions ?? []).map((s: any) => s.date));

  const fmt = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  let streak = 0;
  const check = new Date();
  const todayIsTrainingDay = hasSchedule ? scheduledDays.has(check.getDay()) : true;
  if (todayIsTrainingDay && !completedDates.has(fmt(check))) {
    check.setDate(check.getDate() - 1);
  }
  for (let i = 0; i < 120; i++) {
    const d = fmt(check);
    const wd = check.getDay();
    if (hasSchedule && !scheduledDays.has(wd)) { check.setDate(check.getDate() - 1); continue; }
    if (completedDates.has(d)) { streak++; check.setDate(check.getDate() - 1); } else break;
  }

  const { count: achievementCount } = await supabase
    .from("achievements")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  const { data: existing } = await supabase
    .from("user_stats")
    .select("id, best_streak")
    .eq("user_id", userId)
    .eq("sex", sex)
    .maybeSingle();
  const bestStreak = Math.max(streak, existing?.best_streak ?? 0);

  const payload = {
    user_id: userId,
    username,
    avatar_url: avatarUrl,
    sex,
    level: levelInfo.level,
    total_xp: totalXp,
    rank_name: rank.name,
    total_workouts: totalWorkouts,
    current_streak: streak,
    total_volume: Math.round(totalVolume),
    achievement_count: achievementCount ?? 0,
    best_streak: bestStreak,
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { error } = await supabase.from("user_stats").update(payload).eq("id", existing.id);
    if (error) console.error("[updateUserStats] update failed:", error.message, error.code);
  } else {
    const { error } = await supabase.from("user_stats").insert(payload);
    if (error) console.error("[updateUserStats] insert failed:", error.message, error.code);
  }
}
