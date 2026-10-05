import { supabase } from "./supabase";

// ─── Types ───────────────────────────────────────────────────

export type Discipline = "boxing" | "muay_thai" | "bjj" | "kalaripayattu" | "shaolin" | "karate" | "taekwondo" | "mma";

export type TechniqueCategory =
  | "strikes" | "kicks" | "elbows" | "knees"
  | "defense" | "footwork" | "grappling"
  | "forms" | "conditioning" | "stances";

export type Difficulty = "beginner" | "intermediate" | "advanced" | "expert";
export type MasteryTier = "unlearned" | "learned" | "drilled" | "proficient" | "mastered";

export type CurriculumLevel = {
  id: string;
  discipline: Discipline;
  level_key: string;
  level_order: number;
  title: string;
  subtitle: string | null;
  belt_name: string | null;
  lesson_count: number;
};

export type Lesson = {
  id: string;
  level_id: string;
  discipline: Discipline;
  lesson_order: number;
  week: number;
  title: string;
  subtitle: string | null;
  duration_min: number;
  coaching_cues: string[];
  common_mistakes: string[];
  drill_name: string | null;
  drill_description: string | null;
  drill_duration_min: number | null;
  drill_equipment: string;
  self_check: string | null;
  prerequisites: string[];
};

export type Technique = {
  id: string;
  discipline: string;
  category: string;
  subcategory: string | null;
  name: string;
  description: string | null;
  difficulty: Difficulty;
  belt_level: string | null;
  key_points: string[];
  common_mistakes: string[];
  steps: string[];
  coaching_cues: string[];
  muscles_used: string[];
  equipment: string;
  stance: string;
  related_technique_ids: string[];
};

export type LessonTechnique = {
  lesson_id: string;
  technique_id: string;
  focus: "primary" | "review";
  teaching_notes: string | null;
  technique?: Technique;
};

export type UserLessonProgress = {
  lesson_id: string;
  completed_at: string | null;
  self_rating: number | null;
};

export type PracticeLog = {
  id: string;
  discipline: string;
  practice_type: string;
  duration_min: number;
  intensity: string;
  technique_ids: string[];
  self_rating: number | null;
  notes: string | null;
  xp_earned: number;
  date: string;
};

// ─── Discipline metadata ─────────────────────────────────────

export const DISCIPLINES: Record<Discipline, {
  name: string;
  origin: string;
  colorRgb: string;
  description: string;
  soloFriendly: boolean;
}> = {
  boxing: {
    name: "Boxing",
    origin: "Global",
    colorRgb: "239 68 68",
    description: "The sweet science — hands, footwork, head movement, defense. Perfect for beginners.",
    soloFriendly: true,
  },
  muay_thai: {
    name: "Muay Thai",
    origin: "Thailand",
    colorRgb: "234 179 8",
    description: "The art of 8 limbs — fists, elbows, knees, kicks. Devastating and beautiful.",
    soloFriendly: true,
  },
  bjj: {
    name: "BJJ",
    origin: "Brazil / Japan",
    colorRgb: "59 130 246",
    description: "The gentle art — ground fighting, submissions, positions. Brain chess on the mat.",
    soloFriendly: false,
  },
  kalaripayattu: {
    name: "Kalaripayattu",
    origin: "Kerala, India",
    colorRgb: "168 85 247",
    description: "The mother of all martial arts — animal stances, flexibility, strikes, marma points.",
    soloFriendly: true,
  },
  shaolin: {
    name: "Shaolin Kung Fu",
    origin: "China",
    colorRgb: "249 115 22",
    description: "Warrior monks — forms, stances, iron body conditioning, moving meditation.",
    soloFriendly: true,
  },
  karate: {
    name: "Karate",
    origin: "Okinawa, Japan",
    colorRgb: "220 38 38",
    description: "The way of the empty hand — powerful strikes, precise kata, and disciplined spirit.",
    soloFriendly: true,
  },
  taekwondo: {
    name: "Taekwondo",
    origin: "Korea",
    colorRgb: "37 99 235",
    description: "The way of the foot and fist — spectacular kicks, speed, and Olympic competition.",
    soloFriendly: true,
  },
  mma: {
    name: "MMA",
    origin: "Global",
    colorRgb: "156 163 175",
    description: "Mixed Martial Arts — combine striking, wrestling, and grappling into one complete fighter.",
    soloFriendly: true,
  },
};

// ─── Queries ─────────────────────────────────────────────────

export async function fetchCurriculumLevels(discipline: Discipline): Promise<CurriculumLevel[]> {
  const { data } = await supabase
    .from("ma_curriculum_levels")
    .select("*")
    .eq("discipline", discipline)
    .order("level_order");
  return (data ?? []) as CurriculumLevel[];
}

export async function fetchLessons(levelId: string): Promise<Lesson[]> {
  const { data } = await supabase
    .from("ma_lessons")
    .select("*")
    .eq("level_id", levelId)
    .order("lesson_order");
  return (data ?? []) as Lesson[];
}

export async function fetchLessonsByDiscipline(discipline: Discipline): Promise<Lesson[]> {
  const { data } = await supabase
    .from("ma_lessons")
    .select("*")
    .eq("discipline", discipline)
    .order("lesson_order");
  return (data ?? []) as Lesson[];
}

export async function fetchLesson(lessonId: string): Promise<Lesson | null> {
  const { data } = await supabase
    .from("ma_lessons")
    .select("*")
    .eq("id", lessonId)
    .single();
  return data as Lesson | null;
}

export async function fetchLessonTechniques(lessonId: string): Promise<LessonTechnique[]> {
  const { data } = await supabase
    .from("ma_lesson_techniques")
    .select("*, technique:ma_techniques(*)")
    .eq("lesson_id", lessonId);
  return (data ?? []).map((r: any) => ({
    lesson_id: r.lesson_id,
    technique_id: r.technique_id,
    focus: r.focus,
    teaching_notes: r.teaching_notes,
    technique: r.technique as Technique,
  }));
}

export async function fetchUserLessonProgress(
  userId: string,
  discipline: Discipline
): Promise<Map<string, UserLessonProgress>> {
  const { data } = await supabase
    .from("ma_user_lessons")
    .select("lesson_id, completed_at, self_rating, ma_lessons!inner(discipline)")
    .eq("user_id", userId)
    .eq("ma_lessons.discipline", discipline);

  const map = new Map<string, UserLessonProgress>();
  for (const row of data ?? []) {
    map.set(row.lesson_id, {
      lesson_id: row.lesson_id,
      completed_at: row.completed_at,
      self_rating: row.self_rating,
    });
  }
  return map;
}

export async function completeLesson(
  userId: string,
  lessonId: string,
  selfRating: number
): Promise<void> {
  await supabase.from("ma_user_lessons").insert({
    user_id: userId,
    lesson_id: lessonId,
    completed_at: new Date().toISOString(),
    self_rating: selfRating,
  });
}

export async function fetchAllTechniques(filters?: {
  discipline?: string;
  category?: string;
  difficulty?: string;
  search?: string;
}): Promise<Technique[]> {
  let query = supabase.from("ma_techniques").select("*").order("name");

  if (filters?.discipline) query = query.eq("discipline", filters.discipline);
  if (filters?.category) query = query.eq("category", filters.category);
  if (filters?.difficulty) query = query.eq("difficulty", filters.difficulty);
  if (filters?.search) query = query.ilike("name", `%${filters.search}%`);

  const { data } = await query;
  return (data ?? []) as Technique[];
}

export async function fetchTechnique(id: string): Promise<Technique | null> {
  const { data } = await supabase.from("ma_techniques").select("*").eq("id", id).single();
  return data as Technique | null;
}

export async function fetchLearnedTechniqueIds(userId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from("ma_user_lessons")
    .select("ma_lesson_techniques(technique_id)")
    .eq("user_id", userId)
    .not("completed_at", "is", null);

  const ids = new Set<string>();
  for (const row of data ?? []) {
    for (const lt of (row as any).ma_lesson_techniques ?? []) {
      ids.add(lt.technique_id);
    }
  }
  return ids;
}

export async function logPractice(
  userId: string,
  log: Omit<PracticeLog, "id" | "date" | "xp_earned">
): Promise<void> {
  const xp = Math.round(log.duration_min * 5);
  await supabase.from("ma_practice_logs").insert({
    user_id: userId,
    discipline: log.discipline,
    practice_type: log.practice_type,
    duration_min: log.duration_min,
    intensity: log.intensity,
    technique_ids: log.technique_ids,
    self_rating: log.self_rating,
    notes: log.notes,
    xp_earned: xp,
  });
}

export async function fetchPracticeStats(userId: string, discipline?: string) {
  let query = supabase
    .from("ma_practice_logs")
    .select("discipline, duration_min, date")
    .eq("user_id", userId);
  if (discipline) query = query.eq("discipline", discipline);
  const { data } = await query;

  const logs = data ?? [];
  const totalMin = logs.reduce((s, l) => s + (l.duration_min || 0), 0);
  const totalSessions = logs.length;
  const uniqueDates = new Set(logs.map((l) => l.date));

  return { totalMin, totalHours: Math.round(totalMin / 60 * 10) / 10, totalSessions, uniqueDays: uniqueDates.size };
}

// ─── Helpers ─────────────────────────────────────────────────

export function getMasteryTier(practiceCount: number, avgRating: number): MasteryTier {
  if (practiceCount >= 50 && avgRating >= 4) return "mastered";
  if (practiceCount >= 25 && avgRating >= 3.5) return "proficient";
  if (practiceCount >= 10) return "drilled";
  if (practiceCount > 0) return "learned";
  return "unlearned";
}

export const MASTERY_TIERS: Record<MasteryTier, { label: string; colorRgb: string; progress: number }> = {
  unlearned: { label: "Unlearned", colorRgb: "120 120 120", progress: 0 },
  learned:   { label: "Learned",   colorRgb: "96 165 250",  progress: 0.2 },
  drilled:   { label: "Drilled",   colorRgb: "205 127 50",  progress: 0.5 },
  proficient:{ label: "Proficient",colorRgb: "192 192 192", progress: 0.75 },
  mastered:  { label: "Mastered",  colorRgb: "250 204 21",  progress: 1 },
};

export type TechniqueMastery = {
  practiceCount: number;
  avgRating: number;
  tier: MasteryTier;
  lastPracticed: string | null;
};

export async function fetchTechniqueMasteryData(
  userId: string
): Promise<Map<string, TechniqueMastery>> {
  const [learnedRes, practiceRes] = await Promise.all([
    supabase
      .from("ma_user_lessons")
      .select("ma_lesson_techniques(technique_id)")
      .eq("user_id", userId)
      .not("completed_at", "is", null),
    supabase
      .from("ma_practice_logs")
      .select("technique_ids, self_rating, date")
      .eq("user_id", userId)
      .order("date", { ascending: false }),
  ]);

  const learned = new Set<string>();
  for (const row of learnedRes.data ?? []) {
    for (const lt of (row as any).ma_lesson_techniques ?? []) {
      learned.add(lt.technique_id);
    }
  }

  const counts = new Map<string, { count: number; ratings: number[]; lastDate: string | null }>();
  for (const log of practiceRes.data ?? []) {
    for (const tid of (log.technique_ids ?? []) as string[]) {
      const existing = counts.get(tid) ?? { count: 0, ratings: [], lastDate: null };
      existing.count++;
      if (log.self_rating != null) existing.ratings.push(log.self_rating);
      if (!existing.lastDate) existing.lastDate = log.date;
      counts.set(tid, existing);
    }
  }

  const result = new Map<string, TechniqueMastery>();

  for (const tid of learned) {
    const c = counts.get(tid);
    const practiceCount = c ? c.count + 1 : 1;
    const avgRating = c && c.ratings.length > 0
      ? c.ratings.reduce((s, r) => s + r, 0) / c.ratings.length
      : 0;
    result.set(tid, {
      practiceCount,
      avgRating,
      tier: getMasteryTier(practiceCount, avgRating),
      lastPracticed: c?.lastDate ?? null,
    });
  }

  for (const [tid, c] of counts) {
    if (!result.has(tid)) {
      const avgRating = c.ratings.length > 0
        ? c.ratings.reduce((s, r) => s + r, 0) / c.ratings.length
        : 0;
      result.set(tid, {
        practiceCount: c.count,
        avgRating,
        tier: getMasteryTier(c.count, avgRating),
        lastPracticed: c.lastDate,
      });
    }
  }

  return result;
}

export function getLessonStatus(
  lesson: Lesson,
  progress: Map<string, UserLessonProgress>,
  allLessons: Lesson[]
): "completed" | "current" | "locked" {
  if (progress.has(lesson.id) && progress.get(lesson.id)!.completed_at) return "completed";

  const prereqs = lesson.prerequisites ?? [];
  if (prereqs.length === 0) {
    const prevLesson = allLessons.find((l) => l.lesson_order === lesson.lesson_order - 1 && l.level_id === lesson.level_id);
    if (!prevLesson) return "current";
    if (progress.has(prevLesson.id) && progress.get(prevLesson.id)!.completed_at) return "current";
    return "locked";
  }

  const allPrereqsDone = prereqs.every((pid) => {
    const p = progress.get(pid);
    return p && p.completed_at;
  });
  return allPrereqsDone ? "current" : "locked";
}

export function getXpForLesson(lesson: Lesson): number {
  return 50 + (lesson.duration_min * 3);
}
