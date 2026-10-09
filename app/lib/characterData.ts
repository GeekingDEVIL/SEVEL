import { supabase } from "./supabase";
import type { DomainInput, DomainScores, Rarity, DomainKey } from "./characterEngine";
import { computeDomainScores, assignArchetype, detectSpecialization, DOMAIN_KEYS, DOMAIN_LABELS, rollLootDrop, XP_AWARDS } from "./characterEngine";

function weeksBetween(a: Date, b: Date): number {
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / (7 * 24 * 60 * 60 * 1000)));
}

export type CharacterData = {
  totalXp: number;
  totalWorkouts: number;
  totalVolume: number;
  streak: number;
  bestStreak: number;
  achievementCount: number;
  prCount: number;
  reforgeCount: number;
  forgeShards: number;
  totalLifetimeXp: number;
  maSessionCount: number;
  exerciseVariety: number;
  completionRate: number;
  domainInput: DomainInput;
  domainScores: DomainScores;
  prevSnapshot: DomainScores | null;
};

export async function fetchCharacterData(userId: string, sex: string): Promise<CharacterData | null> {
  const now = new Date();

  const [
    { data: userStats },
    { count: prCount },
    { data: setLogs },
    { count: maCount },
    { data: formChecks },
    { data: prevSnapshot },
    { data: maRecent },
  ] = await Promise.all([
    supabase
      .from("user_stats")
      .select("total_xp, total_workouts, total_volume, current_streak, best_streak, achievement_count, reforge_count, forge_shards, total_lifetime_xp")
      .eq("user_id", userId)
      .eq("sex", sex)
      .maybeSingle(),
    supabase
      .from("exercise_set_logs")
      .select("id, workout_sessions!inner()", { count: "exact", head: true })
      .eq("workout_sessions.user_id", userId)
      .eq("workout_sessions.status", "completed")
      .eq("workout_sessions.sex", sex)
      .eq("is_pr", true),
    supabase
      .from("exercise_set_logs")
      .select("exercise_id, duration_seconds, is_warmup, completed_at, exercises(category, equipment, discipline), workout_sessions!inner(date)")
      .eq("workout_sessions.user_id", userId)
      .eq("workout_sessions.status", "completed")
      .eq("workout_sessions.sex", sex)
      .limit(5000),
    supabase
      .from("ma_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "completed"),
    supabase
      .from("form_checks")
      .select("overall_score")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("domain_snapshots")
      .select("force_score, form_score, flow_score, fight_score, function_score, fortitude_score")
      .eq("user_id", userId)
      .eq("sex", sex)
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("ma_sessions")
      .select("date")
      .eq("user_id", userId)
      .eq("status", "completed")
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const totalWorkouts = userStats?.total_workouts ?? 0;
  if (totalWorkouts === 0 && (maCount ?? 0) === 0) return null;

  type SetLog = {
    exercise_id: string;
    duration_seconds: number | null;
    is_warmup: boolean;
    completed_at: string;
    exercises: { category: string; equipment: string; discipline: string } | null;
    workout_sessions: { date: string } | null;
  };
  const logs = (setLogs ?? []) as unknown as SetLog[];
  const workingSets = logs.filter(l => !l.is_warmup);

  const exerciseIds = new Set(logs.map(l => l.exercise_id));
  const totalSetCount = workingSets.length;

  let compoundLiftCount = 0;
  let bodyweightSetCount = 0;
  let cardioSeconds = 0;
  let mobilitySetCount = 0;
  let calisthenicsSetCount = 0;

  let latestForceDate: string | null = null;
  let latestFormDate: string | null = null;
  let latestFlowDate: string | null = null;
  let latestFunctionDate: string | null = null;

  for (const log of workingSets) {
    const ex = log.exercises;
    if (!ex) continue;
    const date = (log.workout_sessions as any)?.date ?? log.completed_at;

    if (ex.category === "Compound") {
      compoundLiftCount++;
      if (!latestForceDate || date > latestForceDate) latestForceDate = date;
    }
    if (ex.equipment === "Bodyweight") bodyweightSetCount++;
    if (ex.discipline === "cardio") {
      cardioSeconds += log.duration_seconds ?? 0;
      if (!latestFlowDate || date > latestFlowDate) latestFlowDate = date;
    }
    if (ex.discipline === "mobility") {
      mobilitySetCount++;
      if (!latestFormDate || date > latestFormDate) latestFormDate = date;
    }
    if (ex.discipline === "calisthenics") {
      calisthenicsSetCount++;
      if (!latestFunctionDate || date > latestFunctionDate) latestFunctionDate = date;
    }
    if (ex.discipline === "strength") {
      if (!latestForceDate || date > latestForceDate) latestForceDate = date;
      if (!latestFunctionDate || date > latestFunctionDate) latestFunctionDate = date;
    }
  }

  const formCheckScores = (formChecks ?? []).map((f: any) => f.overall_score as number);
  const formCheckAvg = formCheckScores.length > 0
    ? formCheckScores.reduce((a: number, b: number) => a + b, 0) / formCheckScores.length
    : 0;

  const latestFightDate = maRecent?.date ?? null;

  const weeksSinceForce = latestForceDate ? weeksBetween(new Date(latestForceDate), now) : 4;
  const weeksSinceForm = latestFormDate ? weeksBetween(new Date(latestFormDate), now) : 4;
  const weeksSinceFlow = latestFlowDate ? weeksBetween(new Date(latestFlowDate), now) : 4;
  const weeksSinceFight = latestFightDate ? weeksBetween(new Date(latestFightDate), now) : 4;
  const weeksSinceFunction = latestFunctionDate ? weeksBetween(new Date(latestFunctionDate), now) : 4;

  const completionRate = totalWorkouts > 0 ? Math.min(1, totalWorkouts / (totalWorkouts + 2)) : 0;

  const domainInput: DomainInput = {
    totalVolume: userStats?.total_volume ?? 0,
    prCount: prCount ?? 0,
    compoundLiftCount,
    formCheckAvg,
    formCheckCount: formCheckScores.length,
    mobilitySessionCount: mobilitySetCount,
    cardioMinutes: Math.round(cardioSeconds / 60),
    maSessionCount: maCount ?? 0,
    maTechniqueAvg: 0,
    exerciseVariety: exerciseIds.size,
    bodyweightSetCount,
    totalSetCount,
    currentStreak: userStats?.current_streak ?? 0,
    bestStreak: userStats?.best_streak ?? 0,
    completionRate,
    scheduledAdherence: completionRate,
    totalWorkouts,
    weeksSinceForce,
    weeksSinceForm,
    weeksSinceFlow,
    weeksSinceFight,
    weeksSinceFunction,
  };

  const domainScores = computeDomainScores(domainInput);

  const prev: DomainScores | null = prevSnapshot
    ? {
        force: Number(prevSnapshot.force_score),
        form: Number(prevSnapshot.form_score),
        flow: Number(prevSnapshot.flow_score),
        fight: Number(prevSnapshot.fight_score),
        function: Number(prevSnapshot.function_score),
        fortitude: Number(prevSnapshot.fortitude_score),
      }
    : null;

  return {
    totalXp: userStats?.total_xp ?? 0,
    totalWorkouts,
    totalVolume: userStats?.total_volume ?? 0,
    streak: userStats?.current_streak ?? 0,
    bestStreak: userStats?.best_streak ?? 0,
    achievementCount: userStats?.achievement_count ?? 0,
    prCount: prCount ?? 0,
    reforgeCount: (userStats as any)?.reforge_count ?? 0,
    forgeShards: (userStats as any)?.forge_shards ?? 0,
    totalLifetimeXp: Number((userStats as any)?.total_lifetime_xp ?? 0),
    maSessionCount: maCount ?? 0,
    exerciseVariety: exerciseIds.size,
    completionRate,
    domainInput,
    domainScores,
    prevSnapshot: prev,
  };
}

export async function persistDomainScores(
  userId: string,
  sex: string,
  scores: DomainScores,
  archetypeName: string | null,
  specName: string | null,
): Promise<void> {
  const { data: existing } = await supabase
    .from("user_domains")
    .select("id")
    .eq("user_id", userId)
    .eq("sex", sex)
    .maybeSingle();

  const row = {
    user_id: userId,
    force_score: scores.force,
    form_score: scores.form,
    flow_score: scores.flow,
    fight_score: scores.fight,
    function_score: scores.function,
    fortitude_score: scores.fortitude,
    archetype: archetypeName,
    specialization: specName,
    computed_at: new Date().toISOString(),
    sex,
  };

  if (existing) {
    await supabase.from("user_domains").update(row).eq("id", existing.id);
  } else {
    await supabase.from("user_domains").insert(row);
  }
}

export async function saveDomainSnapshot(
  userId: string,
  sex: string,
  scores: DomainScores,
): Promise<void> {
  const today = new Date().toISOString().split("T")[0];

  const { data: existing } = await supabase
    .from("domain_snapshots")
    .select("id")
    .eq("user_id", userId)
    .eq("sex", sex)
    .eq("snapshot_date", today)
    .maybeSingle();

  const row = {
    user_id: userId,
    force_score: scores.force,
    form_score: scores.form,
    flow_score: scores.flow,
    fight_score: scores.fight,
    function_score: scores.function,
    fortitude_score: scores.fortitude,
    snapshot_date: today,
    sex,
  };

  if (existing) {
    await supabase.from("domain_snapshots").update(row).eq("id", existing.id);
  } else {
    await supabase.from("domain_snapshots").insert(row);
  }
}

export async function logXpEvent(
  userId: string,
  sex: string,
  amount: number,
  source: string,
  sourceId?: string,
  description?: string,
): Promise<void> {
  await supabase.from("xp_events").insert({
    user_id: userId,
    amount,
    source,
    source_id: sourceId ?? null,
    description: description ?? null,
    sex,
  });
}

export async function logHistoryEvent(
  userId: string,
  sex: string,
  eventType: string,
  title: string,
  description?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await supabase.from("user_history").insert({
    user_id: userId,
    event_type: eventType,
    title,
    description: description ?? null,
    metadata: metadata ?? null,
    sex,
  });
}

// ── Challenge System ──

type ChallengeTemplate = {
  title: string;
  description: string;
  metric: string;
  target: number;
  archetype: string;
  domain: DomainKey;
};

const WEEKLY_TEMPLATES: ChallengeTemplate[] = [
  // Force challenges
  { title: "Iron Forge", description: "Log 10,000 kg total volume this week", metric: "volume", target: 10000, archetype: "Juggernaut", domain: "force" },
  { title: "Heavy Crown", description: "Hit 3 personal records", metric: "prs", target: 3, archetype: "Juggernaut", domain: "force" },
  { title: "Compound King", description: "Complete 30 compound sets", metric: "compound_sets", target: 30, archetype: "Titan", domain: "force" },
  // Form challenges
  { title: "Precision Strike", description: "Score 80+ on 3 form checks", metric: "form_checks_80", target: 3, archetype: "Sentinel", domain: "form" },
  { title: "Fluid Motion", description: "Complete 5 mobility sessions", metric: "mobility_sets", target: 5, archetype: "Sentinel", domain: "form" },
  // Flow challenges
  { title: "Endless Road", description: "Log 120 minutes of cardio", metric: "cardio_minutes", target: 120, archetype: "Strider", domain: "flow" },
  { title: "The Grind", description: "Complete 5 workouts this week", metric: "workouts", target: 5, archetype: "Strider", domain: "flow" },
  // Fight challenges
  { title: "War Ready", description: "Complete 4 martial arts sessions", metric: "ma_sessions", target: 4, archetype: "Striker", domain: "fight" },
  { title: "Iron Fist", description: "Train 3 different martial arts disciplines", metric: "ma_disciplines", target: 3, archetype: "Striker", domain: "fight" },
  // Function challenges
  { title: "Swiss Army", description: "Use 15 different exercises", metric: "exercise_variety", target: 15, archetype: "Phantom", domain: "function" },
  { title: "Body Control", description: "Complete 20 bodyweight sets", metric: "bodyweight_sets", target: 20, archetype: "Phantom", domain: "function" },
  // Fortitude challenges
  { title: "Unbroken", description: "Train every scheduled day", metric: "perfect_week", target: 1, archetype: "Warden", domain: "fortitude" },
  { title: "Iron Discipline", description: "Complete all planned sets in 3 workouts", metric: "full_completion", target: 3, archetype: "Warden", domain: "fortitude" },
  // Universal (any class)
  { title: "Volume Hunter", description: "Log 20,000 kg total volume", metric: "volume", target: 20000, archetype: "*", domain: "force" },
  { title: "Consistency", description: "Complete 4 workouts this week", metric: "workouts", target: 4, archetype: "*", domain: "fortitude" },
  { title: "Explorer", description: "Try 10 different exercises", metric: "exercise_variety", target: 10, archetype: "*", domain: "function" },
];

const MONTHLY_TEMPLATES: ChallengeTemplate[] = [
  { title: "Forge of Champions", description: "Log 50,000 kg volume this month", metric: "volume", target: 50000, archetype: "*", domain: "force" },
  { title: "PR Marathon", description: "Set 10 personal records", metric: "prs", target: 10, archetype: "*", domain: "force" },
  { title: "The Long Road", description: "Complete 20 workouts", metric: "workouts", target: 20, archetype: "*", domain: "fortitude" },
  { title: "Master of All", description: "Use 30 different exercises", metric: "exercise_variety", target: 30, archetype: "*", domain: "function" },
  { title: "Unbreakable Month", description: "Maintain a 14-day streak", metric: "streak", target: 14, archetype: "*", domain: "fortitude" },
];

function getWeekBounds(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diffToMon);
  mon.setHours(0, 0, 0, 0);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return {
    start: mon.toISOString().split("T")[0],
    end: sun.toISOString().split("T")[0],
  };
}

function getMonthBounds(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

function pickChallenges(templates: ChallengeTemplate[], archetype: string, count: number, seed: number): ChallengeTemplate[] {
  const matching = templates.filter(t => t.archetype === archetype || t.archetype === "*");
  const universal = templates.filter(t => t.archetype === "*");
  const pool = matching.length >= count ? matching : [...matching, ...universal];

  const shuffled = [...pool];
  let s = seed;
  for (let i = shuffled.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

export type ActiveChallenge = {
  id: string;
  title: string;
  description: string;
  metric: string;
  target: number;
  current: number;
  completed: boolean;
  xpReward: number;
  challengeType: string;
  startDate: string;
  endDate: string;
  rewardClaimed: boolean;
};

const _challengeLocks = new Map<string, Promise<ActiveChallenge[]>>();

function mapUserChallenge(uc: any): ActiveChallenge {
  const ch = uc.challenges;
  return {
    id: uc.id,
    title: ch.title,
    description: ch.description,
    metric: ch.metric,
    target: Number(ch.target_value),
    current: Number(uc.current_value),
    completed: uc.completed,
    xpReward: ch.xp_reward,
    challengeType: ch.challenge_type,
    startDate: ch.start_date,
    endDate: ch.end_date,
    rewardClaimed: uc.reward_claimed,
  };
}

async function fetchExistingChallenges(
  userId: string,
  sex: string,
  challengeType: string,
  startDate: string,
): Promise<ActiveChallenge[]> {
  const { data: challengeIds } = await supabase
    .from("challenges")
    .select("id")
    .eq("challenge_type", challengeType)
    .eq("start_date", startDate);

  if (!challengeIds || challengeIds.length === 0) return [];

  const ids = challengeIds.map((c: any) => c.id);
  const { data: ucs } = await supabase
    .from("user_challenges")
    .select("id, current_value, completed, reward_claimed, challenge_id, challenges(id, title, description, target_value, metric, xp_reward, challenge_type, start_date, end_date)")
    .eq("user_id", userId)
    .eq("sex", sex)
    .in("challenge_id", ids);

  if (!ucs || ucs.length === 0) return [];
  return ucs.map(mapUserChallenge);
}

export function getOrCreateWeeklyChallenges(
  userId: string,
  sex: string,
  archetypeName: string,
): Promise<ActiveChallenge[]> {
  const key = `weekly_${userId}_${sex}`;
  const inflight = _challengeLocks.get(key);
  if (inflight) return inflight;

  const p = _doCreateWeekly(userId, sex, archetypeName).finally(() => _challengeLocks.delete(key));
  _challengeLocks.set(key, p);
  return p;
}

async function _doCreateWeekly(userId: string, sex: string, archetypeName: string): Promise<ActiveChallenge[]> {
  const { start, end } = getWeekBounds();

  const existing = await fetchExistingChallenges(userId, sex, "weekly", start);
  if (existing.length > 0) return existing;

  const seed = new Date(start).getTime();
  const picks = pickChallenges(WEEKLY_TEMPLATES, archetypeName, 3, seed);

  const challengeRows = picks.map(p => ({
    archetype: p.archetype === "*" ? archetypeName : p.archetype,
    challenge_type: "weekly",
    title: p.title,
    description: p.description,
    target_value: p.target,
    metric: p.metric,
    xp_reward: XP_AWARDS.challenge_weekly,
    start_date: start,
    end_date: end,
  }));

  const { data: inserted } = await supabase.from("challenges").insert(challengeRows).select("id, title, description, target_value, metric, xp_reward, challenge_type, start_date, end_date");
  if (!inserted) return [];

  const ucRows = inserted.map(c => ({
    user_id: userId,
    challenge_id: c.id,
    current_value: 0,
    completed: false,
    reward_claimed: false,
    sex,
  }));

  const { data: userChallenges } = await supabase.from("user_challenges").insert(ucRows).select("id, challenge_id, current_value, completed, reward_claimed");
  if (!userChallenges) return [];

  return userChallenges.map((uc: any) => {
    const ch = inserted.find((c: any) => c.id === uc.challenge_id)!;
    return {
      id: uc.id, title: ch.title, description: ch.description, metric: ch.metric,
      target: Number(ch.target_value), current: 0, completed: false, xpReward: ch.xp_reward,
      challengeType: ch.challenge_type, startDate: ch.start_date, endDate: ch.end_date, rewardClaimed: false,
    };
  });
}

export function getOrCreateMonthlyChallenges(
  userId: string,
  sex: string,
  archetypeName: string,
): Promise<ActiveChallenge[]> {
  const key = `monthly_${userId}_${sex}`;
  const inflight = _challengeLocks.get(key);
  if (inflight) return inflight;

  const p = _doCreateMonthly(userId, sex, archetypeName).finally(() => _challengeLocks.delete(key));
  _challengeLocks.set(key, p);
  return p;
}

async function _doCreateMonthly(userId: string, sex: string, archetypeName: string): Promise<ActiveChallenge[]> {
  const { start, end } = getMonthBounds();

  const existing = await fetchExistingChallenges(userId, sex, "monthly", start);
  if (existing.length > 0) return existing;

  const seed = new Date(start).getTime() + 999;
  const picks = pickChallenges(MONTHLY_TEMPLATES, archetypeName, 1, seed);

  const challengeRows = picks.map(p => ({
    archetype: archetypeName,
    challenge_type: "monthly",
    title: p.title,
    description: p.description,
    target_value: p.target,
    metric: p.metric,
    xp_reward: XP_AWARDS.challenge_monthly,
    start_date: start,
    end_date: end,
  }));

  const { data: inserted } = await supabase.from("challenges").insert(challengeRows).select("id, title, description, target_value, metric, xp_reward, challenge_type, start_date, end_date");
  if (!inserted) return [];

  const ucRows = inserted.map(c => ({
    user_id: userId,
    challenge_id: c.id,
    current_value: 0,
    completed: false,
    reward_claimed: false,
    sex,
  }));

  const { data: userChallenges } = await supabase.from("user_challenges").insert(ucRows).select("id, challenge_id, current_value, completed, reward_claimed");
  if (!userChallenges) return [];

  return userChallenges.map((uc: any) => {
    const ch = inserted.find((c: any) => c.id === uc.challenge_id)!;
    return {
      id: uc.id, title: ch.title, description: ch.description, metric: ch.metric,
      target: Number(ch.target_value), current: 0, completed: false, xpReward: ch.xp_reward,
      challengeType: ch.challenge_type, startDate: ch.start_date, endDate: ch.end_date, rewardClaimed: false,
    };
  });
}

export async function claimChallengeReward(
  userId: string,
  sex: string,
  userChallengeId: string,
  xpReward: number,
  challengeTitle: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("user_challenges")
    .update({ reward_claimed: true })
    .eq("id", userChallengeId)
    .eq("user_id", userId);

  if (error) return false;

  await logXpEvent(userId, sex, xpReward, "challenge", userChallengeId, challengeTitle);
  try { await supabase.rpc("add_xp", { p_user_id: userId, p_amount: xpReward }); } catch {}
  await logHistoryEvent(userId, sex, "challenge_complete", challengeTitle, `+${xpReward} XP`, { challenge_id: userChallengeId, xp: xpReward });

  return true;
}

export type ChallengeProgressInput = {
  volume?: number;
  prs?: number;
  compoundSets?: number;
  workouts?: number;
  cardioMinutes?: number;
  mobilitySets?: number;
  exerciseVariety?: number;
  bodyweightSets?: number;
  maSessions?: number;
  maDisciplines?: number;
  formChecks80?: number;
  fullCompletion?: number;
  perfectWeek?: number;
  streak?: number;
};

const METRIC_TO_INPUT: Record<string, keyof ChallengeProgressInput> = {
  volume: "volume",
  prs: "prs",
  compound_sets: "compoundSets",
  workouts: "workouts",
  cardio_minutes: "cardioMinutes",
  mobility_sets: "mobilitySets",
  exercise_variety: "exerciseVariety",
  bodyweight_sets: "bodyweightSets",
  ma_sessions: "maSessions",
  ma_disciplines: "maDisciplines",
  form_checks_80: "formChecks80",
  full_completion: "fullCompletion",
  perfect_week: "perfectWeek",
  streak: "streak",
};

export async function updateChallengeProgress(
  userId: string,
  sex: string,
  input: ChallengeProgressInput,
): Promise<void> {
  const { data: active } = await supabase
    .from("user_challenges")
    .select("id, current_value, completed, challenges!inner(metric, target_value)")
    .eq("user_id", userId)
    .eq("sex", sex)
    .eq("completed", false);

  if (!active || active.length === 0) return;

  for (const uc of active as any[]) {
    const metric = uc.challenges.metric as string;
    const inputKey = METRIC_TO_INPUT[metric];
    if (!inputKey) continue;
    const increment = input[inputKey];
    if (!increment || increment <= 0) continue;

    const newVal = Number(uc.current_value) + increment;
    const completed = newVal >= Number(uc.challenges.target_value);

    await supabase
      .from("user_challenges")
      .update({
        current_value: newVal,
        completed,
        ...(completed ? { completed_at: new Date().toISOString() } : {}),
      })
      .eq("id", uc.id);
  }
}
