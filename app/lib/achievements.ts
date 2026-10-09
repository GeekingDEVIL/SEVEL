import { supabase } from "./supabase";
import { computeCharacterLevel, getRankForLevel } from "./characterEngine";

export type AchievementRarity = "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY";

export type AchievementDef = {
  key: string;
  name: string;
  description: string;
  icon: string;
  rarity: AchievementRarity;
  category: string;
  secret?: boolean;
  chain?: string;
};

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  // ── MILESTONES ──
  { key: "first_workout",     name: "First Step",          description: "Complete your first workout",                icon: "🏁", rarity: "COMMON",    category: "Milestones", chain: "workout_chain" },
  { key: "workouts_10",       name: "Getting Started",     description: "Complete 10 workouts",                       icon: "⚡", rarity: "COMMON",    category: "Milestones", chain: "workout_chain" },
  { key: "workouts_25",       name: "Building Momentum",   description: "Complete 25 workouts",                       icon: "🔥", rarity: "UNCOMMON",  category: "Milestones", chain: "workout_chain" },
  { key: "workouts_50",       name: "Half Century",        description: "Complete 50 workouts",                       icon: "💪", rarity: "UNCOMMON",  category: "Milestones", chain: "workout_chain" },
  { key: "workouts_100",      name: "Centurion",           description: "Complete 100 workouts",                      icon: "🏆", rarity: "RARE",      category: "Milestones", chain: "workout_chain" },
  { key: "workouts_250",      name: "Ironclad",            description: "Complete 250 workouts",                      icon: "⚔️", rarity: "EPIC",      category: "Milestones", chain: "workout_chain" },
  { key: "workouts_500",      name: "Unstoppable",         description: "Complete 500 workouts",                      icon: "👑", rarity: "LEGENDARY", category: "Milestones", chain: "workout_chain" },

  // ── STREAKS ──
  { key: "streak_7",          name: "One Week Strong",     description: "Maintain a 7-day training streak",           icon: "🔥", rarity: "COMMON",    category: "Streaks", chain: "streak_chain" },
  { key: "streak_14",         name: "Two Weeks In",        description: "Maintain a 14-day training streak",          icon: "🔥", rarity: "UNCOMMON",  category: "Streaks", chain: "streak_chain" },
  { key: "streak_30",         name: "Monthly Warrior",     description: "Maintain a 30-day training streak",          icon: "🔥", rarity: "RARE",      category: "Streaks", chain: "streak_chain" },
  { key: "streak_60",         name: "Relentless",          description: "Maintain a 60-day training streak",          icon: "🔥", rarity: "EPIC",      category: "Streaks", chain: "streak_chain" },
  { key: "streak_100",        name: "Unbreakable",         description: "Maintain a 100-day training streak",         icon: "🔥", rarity: "LEGENDARY", category: "Streaks", chain: "streak_chain" },

  // ── STRENGTH ──
  { key: "first_pr",          name: "New Record",          description: "Set your first personal record",             icon: "🏅", rarity: "COMMON",    category: "Strength" },
  { key: "prs_10",            name: "Record Breaker",      description: "Set 10 personal records",                    icon: "🏅", rarity: "UNCOMMON",  category: "Strength" },
  { key: "prs_25",            name: "PR Machine",          description: "Set 25 personal records",                    icon: "🏅", rarity: "RARE",      category: "Strength" },
  { key: "prs_50",            name: "Limitless",           description: "Set 50 personal records",                    icon: "🏅", rarity: "EPIC",      category: "Strength" },
  { key: "prs_100",           name: "Beyond Measure",      description: "Set 100 personal records",                   icon: "🏅", rarity: "LEGENDARY", category: "Strength" },

  // ── VOLUME ──
  { key: "volume_10k",        name: "Ten Thousand",        description: "Lift 10,000 kg total volume",                icon: "🪨", rarity: "COMMON",    category: "Volume" },
  { key: "volume_50k",        name: "Heavy Lifter",        description: "Lift 50,000 kg total volume",                icon: "🪨", rarity: "UNCOMMON",  category: "Volume" },
  { key: "volume_100k",       name: "Hundred Tons",        description: "Lift 100,000 kg total volume",               icon: "🪨", rarity: "RARE",      category: "Volume" },
  { key: "volume_500k",       name: "Mountain Mover",      description: "Lift 500,000 kg total volume",               icon: "🪨", rarity: "EPIC",      category: "Volume" },
  { key: "volume_1m",         name: "Titan",               description: "Lift 1,000,000 kg total volume",             icon: "🪨", rarity: "LEGENDARY", category: "Volume" },

  // ── EXPLORATION ──
  { key: "exercises_10",      name: "Explorer",            description: "Log 10 different exercises",                  icon: "🧭", rarity: "COMMON",    category: "Exploration" },
  { key: "exercises_25",      name: "Versatile",           description: "Log 25 different exercises",                  icon: "🧭", rarity: "UNCOMMON",  category: "Exploration" },
  { key: "exercises_50",      name: "Jack of All Trades",  description: "Log 50 different exercises",                  icon: "🧭", rarity: "RARE",      category: "Exploration" },

  // ── DISCIPLINE ──
  { key: "perfect_session",   name: "Perfect Session",     description: "Complete 100% of planned sets in a workout",  icon: "✨", rarity: "COMMON",    category: "Discipline" },
  { key: "perfect_week",      name: "Perfect Week",        description: "Complete every planned workout for a full week",icon: "✨", rarity: "RARE",      category: "Discipline" },
  { key: "early_bird",        name: "Early Bird",          description: "Start a workout before 7 AM",                 icon: "🌅", rarity: "UNCOMMON",  category: "Discipline" },
  { key: "night_owl",         name: "Night Owl",           description: "Start a workout after 9 PM",                  icon: "🌙", rarity: "UNCOMMON",  category: "Discipline" },

  // ── RANK ──
  { key: "rank_tempered",     name: "Tempered",            description: "Reach Tempered rank (Level 11)",              icon: "🛡️", rarity: "COMMON",    category: "Rank" },
  { key: "rank_forged",       name: "Forged in Fire",      description: "Reach Forged rank (Level 21)",                icon: "🛡️", rarity: "COMMON",    category: "Rank" },
  { key: "rank_proven",       name: "Proven Warrior",      description: "Reach Proven rank (Level 31)",                icon: "🛡️", rarity: "UNCOMMON",  category: "Rank" },
  { key: "rank_adamant",      name: "Adamant Will",        description: "Reach Adamant rank (Level 41)",               icon: "🛡️", rarity: "UNCOMMON",  category: "Rank" },
  { key: "rank_champion",     name: "Champion Rising",     description: "Reach Champion rank (Level 51)",              icon: "🛡️", rarity: "RARE",      category: "Rank" },
  { key: "rank_mythic",       name: "Mythic Being",        description: "Reach Mythic rank (Level 61)",                icon: "💎", rarity: "RARE",      category: "Rank" },
  { key: "rank_titan",        name: "Titan Unleashed",     description: "Reach Titan rank (Level 71)",                 icon: "💎", rarity: "EPIC",      category: "Rank" },
  { key: "rank_immortal",     name: "Immortal",            description: "Reach Immortal rank (Level 81)",              icon: "💎", rarity: "EPIC",      category: "Rank" },
  { key: "rank_ascended",     name: "Ascended",            description: "Reach Ascended rank (Level 91)",              icon: "👑", rarity: "LEGENDARY", category: "Rank" },
  { key: "rank_max",          name: "Perfection",          description: "Reach max level (Level 100)",                 icon: "👑", rarity: "LEGENDARY", category: "Rank" },

  // ── XP ──
  { key: "xp_1000",           name: "First Thousand",      description: "Earn 1,000 total XP",                         icon: "⚡", rarity: "COMMON",    category: "XP" },
  { key: "xp_5000",           name: "Power Rising",        description: "Earn 5,000 total XP",                         icon: "⚡", rarity: "UNCOMMON",  category: "XP" },
  { key: "xp_10000",          name: "Ten Thousand Strong",  description: "Earn 10,000 total XP",                       icon: "⚡", rarity: "RARE",      category: "XP" },
  { key: "xp_50000",          name: "Ascendant",           description: "Earn 50,000 total XP",                        icon: "⚡", rarity: "EPIC",      category: "XP" },
  { key: "xp_100000",         name: "Transcendence",       description: "Earn 100,000 total XP",                       icon: "⚡", rarity: "LEGENDARY", category: "XP" },

  // ── SECRET ──
  { key: "secret_midnight",   name: "Midnight Grinder",    description: "Start a workout between midnight and 4 AM",    icon: "🦇", rarity: "RARE",      category: "Secret", secret: true },
  { key: "secret_marathon",   name: "Marathon Session",    description: "Complete a workout lasting over 2 hours",       icon: "⏰", rarity: "RARE",      category: "Secret", secret: true },
  { key: "secret_comeback",   name: "The Comeback",        description: "Return after 14+ days without training",       icon: "🔄", rarity: "UNCOMMON",  category: "Secret", secret: true },
  { key: "secret_variety",    name: "Variety Show",        description: "Use 5+ different exercises in a single workout",icon: "🎭", rarity: "UNCOMMON",  category: "Secret", secret: true },
  { key: "secret_bw_match",   name: "Body Weight Club",    description: "Lift your own body weight on any exercise",     icon: "⚖️", rarity: "EPIC",      category: "Secret", secret: true },
];

export const RARITY_COLORS: Record<AchievementRarity, { text: string; border: string; bg: string; glow: string }> = {
  COMMON:    { text: "text-stone-300",  border: "border-stone-400/30", bg: "bg-stone-400/10",  glow: "" },
  UNCOMMON:  { text: "text-emerald-300",border: "border-emerald-400/30",bg: "bg-emerald-400/10",glow: "" },
  RARE:      { text: "text-blue-300",   border: "border-blue-400/30",  bg: "bg-blue-400/10",   glow: "0 0 12px -3px rgba(96,165,250,0.4)" },
  EPIC:      { text: "text-purple-300", border: "border-purple-400/30",bg: "bg-purple-400/10", glow: "0 0 12px -3px rgba(192,132,252,0.4)" },
  LEGENDARY: { text: "text-orange-300", border: "border-orange-400/30",bg: "bg-orange-400/10", glow: "0 0 16px -3px rgba(251,146,60,0.5)" },
};

export async function checkAndAwardAchievements(userId: string, sex: string = "male"): Promise<string[]> {
  const newlyEarned: string[] = [];

  // Get already earned
  const { data: earned } = await supabase.from("achievements").select("achievement_key").eq("user_id", userId);
  const earnedSet = new Set((earned ?? []).map((a: any) => a.achievement_key));

  async function award(key: string) {
    if (earnedSet.has(key)) return;
    const { error } = await supabase.from("achievements").insert({ user_id: userId, achievement_key: key });
    if (!error) {
      earnedSet.add(key);
      newlyEarned.push(key);
      const def = ACHIEVEMENT_DEFS.find((d) => d.key === key);
      if (def) {
        await supabase.from("notifications").insert({
          user_id: userId, type: "achievement",
          title: "ACHIEVEMENT UNLOCKED",
          message: `${def.icon} ${def.name} — ${def.description}`,
          metadata: { achievement_key: key, rarity: def.rarity },
          sex,
        });
      }
    }
  }

  // ── Fetch all needed data ──
  const { count: workoutCount } = await supabase
    .from("workout_sessions").select("id", { count: "exact", head: true })
    .eq("user_id", userId).eq("status", "completed").eq("sex", sex);

  const { data: xpData } = await supabase
    .from("workout_sessions").select("xp_earned, total_volume, total_sets, started_at, date")
    .eq("user_id", userId).eq("status", "completed").eq("sex", sex);

  const totalXp = (xpData ?? []).reduce((s, r: any) => s + (r.xp_earned || 0), 0);
  const totalVolume = (xpData ?? []).reduce((s, r: any) => s + (Number(r.total_volume) || 0), 0);

  const { data: prNotifs } = await supabase
    .from("notifications").select("id", { count: "exact", head: true })
    .eq("user_id", userId).eq("type", "new_pr").eq("sex", sex);
  const prCount = prNotifs?.length ?? 0;

  const { data: exercisesUsed } = await supabase
    .from("exercise_set_logs").select("exercise_id, workout_sessions!inner(sex)")
    .eq("user_id", userId).eq("workout_sessions.sex", sex);
  const uniqueExercises = new Set((exercisesUsed ?? []).map((e: any) => e.exercise_id)).size;

  // Streak
  const { data: sessions } = await supabase
    .from("workout_sessions").select("date")
    .eq("user_id", userId).eq("status", "completed").eq("sex", sex)
    .order("date", { ascending: false }).limit(120);
  const { data: plans } = await supabase
    .from("recurring_plans").select("weekday, is_rest").eq("user_id", userId).eq("sex", sex);
  const restDays = new Set((plans ?? []).filter((p: any) => p.is_rest).map((p: any) => p.weekday));
  const completedDates = new Set((sessions ?? []).map((s: any) => s.date));
  let streak = 0;
  const check = new Date();
  for (let i = 0; i < 120; i++) {
    const d = `${check.getFullYear()}-${String(check.getMonth() + 1).padStart(2, "0")}-${String(check.getDate()).padStart(2, "0")}`;
    const wd = check.getDay();
    if (restDays.has(wd)) { check.setDate(check.getDate() - 1); continue; }
    if (completedDates.has(d)) { streak++; check.setDate(check.getDate() - 1); } else break;
  }

  const level = computeCharacterLevel(totalXp).level;

  // Latest session time for early/night check
  const latestStart = xpData && xpData.length > 0 ? xpData[xpData.length - 1]?.started_at : null;
  const startHour = latestStart ? new Date(latestStart).getHours() : null;

  // Perfect session check (latest)
  const latestSession = xpData && xpData.length > 0 ? xpData[xpData.length - 1] : null;

  // ── Check milestones ──
  const wc = workoutCount ?? 0;
  if (wc >= 1)   await award("first_workout");
  if (wc >= 10)  await award("workouts_10");
  if (wc >= 25)  await award("workouts_25");
  if (wc >= 50)  await award("workouts_50");
  if (wc >= 100) await award("workouts_100");
  if (wc >= 250) await award("workouts_250");
  if (wc >= 500) await award("workouts_500");

  // ── Streaks ──
  if (streak >= 7)   await award("streak_7");
  if (streak >= 14)  await award("streak_14");
  if (streak >= 30)  await award("streak_30");
  if (streak >= 60)  await award("streak_60");
  if (streak >= 100) await award("streak_100");

  // ── PRs ──
  if (prCount >= 1)   await award("first_pr");
  if (prCount >= 10)  await award("prs_10");
  if (prCount >= 25)  await award("prs_25");
  if (prCount >= 50)  await award("prs_50");
  if (prCount >= 100) await award("prs_100");

  // ── Volume ──
  if (totalVolume >= 10000)   await award("volume_10k");
  if (totalVolume >= 50000)   await award("volume_50k");
  if (totalVolume >= 100000)  await award("volume_100k");
  if (totalVolume >= 500000)  await award("volume_500k");
  if (totalVolume >= 1000000) await award("volume_1m");

  // ── Exploration ──
  if (uniqueExercises >= 10) await award("exercises_10");
  if (uniqueExercises >= 25) await award("exercises_25");
  if (uniqueExercises >= 50) await award("exercises_50");

  // ── Discipline ──
  if (startHour !== null && startHour < 7)  await award("early_bird");
  if (startHour !== null && startHour >= 21) await award("night_owl");

  // ── Rank ──
  if (level >= 11)  await award("rank_tempered");
  if (level >= 21)  await award("rank_forged");
  if (level >= 31)  await award("rank_proven");
  if (level >= 41)  await award("rank_adamant");
  if (level >= 51)  await award("rank_champion");
  if (level >= 61)  await award("rank_mythic");
  if (level >= 71)  await award("rank_titan");
  if (level >= 81)  await award("rank_immortal");
  if (level >= 91)  await award("rank_ascended");
  if (level >= 100) await award("rank_max");

  // ── XP ──
  if (totalXp >= 1000)   await award("xp_1000");
  if (totalXp >= 5000)   await award("xp_5000");
  if (totalXp >= 10000)  await award("xp_10000");
  if (totalXp >= 50000)  await award("xp_50000");
  if (totalXp >= 100000) await award("xp_100000");

  // ── Secret ──
  if (startHour !== null && startHour >= 0 && startHour < 4) await award("secret_midnight");
  if (latestSession) {
    const dur = (latestSession as any).duration_seconds ?? ((latestSession as any).started_at && (latestSession as any).completed_at
      ? (new Date((latestSession as any).completed_at).getTime() - new Date((latestSession as any).started_at).getTime()) / 1000
      : 0);
    if (dur >= 7200) await award("secret_marathon");
  }
  if (wc >= 1) {
    const sortedDates = (xpData ?? []).map((s: any) => s.date).filter(Boolean).sort();
    if (sortedDates.length >= 2) {
      for (let i = 1; i < sortedDates.length; i++) {
        const gap = (new Date(sortedDates[i]).getTime() - new Date(sortedDates[i - 1]).getTime()) / (1000 * 60 * 60 * 24);
        if (gap >= 14) { await award("secret_comeback"); break; }
      }
    }
  }

  return newlyEarned;
}