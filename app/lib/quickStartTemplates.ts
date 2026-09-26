export type QuickStartDay = {
  weekday: number;
  dayName: string;
  exerciseNames: string[];
  sessionType?: "gym" | "ma";
  maDiscipline?: string;
  maSessionType?: string;
};

export type QuickStartTemplate = {
  key: string;
  name: string;
  daysPerWeek: number;
  muscleCoverage: string;
  mixed?: boolean;
  days: QuickStartDay[];
};

// weekday: 0=Sun..6=Sat
export const QUICK_START_TEMPLATES: QuickStartTemplate[] = [
  {
    key: "ppl",
    name: "Push / Pull / Legs",
    daysPerWeek: 3,
    muscleCoverage: "Chest, Shoulders, Triceps · Back, Biceps · Legs",
    days: [
      { weekday: 1, dayName: "Push Day", exerciseNames: ["Barbell Bench Press - Medium Grip", "Incline Dumbbell Press", "Dumbbell Shoulder Press", "Cable Seated Lateral Raise", "Triceps Pushdown"] },
      { weekday: 3, dayName: "Pull Day", exerciseNames: ["Bent Over Barbell Row", "Wide-Grip Lat Pulldown", "Face Pull", "Barbell Curl", "Hammer Curls"] },
      { weekday: 5, dayName: "Leg Day", exerciseNames: ["Barbell Squat", "Leg Press", "Leg Extensions", "Lying Leg Curls", "Barbell Seated Calf Raise"] },
    ],
  },
  {
    key: "upper_lower",
    name: "Upper / Lower",
    daysPerWeek: 4,
    muscleCoverage: "Chest, Back, Shoulders, Arms · Legs, Glutes",
    days: [
      { weekday: 1, dayName: "Upper Body", exerciseNames: ["Barbell Bench Press - Medium Grip", "Bent Over Barbell Row", "Dumbbell Shoulder Press", "Wide-Grip Lat Pulldown", "Barbell Curl", "Triceps Pushdown"] },
      { weekday: 2, dayName: "Lower Body", exerciseNames: ["Barbell Squat", "Leg Press", "Lying Leg Curls", "Barbell Seated Calf Raise", "Barbell Hip Thrust"] },
      { weekday: 4, dayName: "Upper Body", exerciseNames: ["Barbell Bench Press - Medium Grip", "Bent Over Barbell Row", "Dumbbell Shoulder Press", "Wide-Grip Lat Pulldown", "Barbell Curl", "Triceps Pushdown"] },
      { weekday: 5, dayName: "Lower Body", exerciseNames: ["Barbell Squat", "Leg Press", "Lying Leg Curls", "Barbell Seated Calf Raise", "Barbell Hip Thrust"] },
    ],
  },
  {
    key: "full_body",
    name: "Full Body",
    daysPerWeek: 3,
    muscleCoverage: "Full body every session",
    days: [
      { weekday: 1, dayName: "Full Body", exerciseNames: ["Barbell Squat", "Barbell Bench Press - Medium Grip", "Bent Over Barbell Row", "Dumbbell Shoulder Press", "Leg Press", "Barbell Curl"] },
      { weekday: 3, dayName: "Full Body", exerciseNames: ["Barbell Squat", "Barbell Bench Press - Medium Grip", "Bent Over Barbell Row", "Dumbbell Shoulder Press", "Leg Press", "Barbell Curl"] },
      { weekday: 5, dayName: "Full Body", exerciseNames: ["Barbell Squat", "Barbell Bench Press - Medium Grip", "Bent Over Barbell Row", "Dumbbell Shoulder Press", "Leg Press", "Barbell Curl"] },
    ],
  },
  {
    key: "bro_split",
    name: "Bro Split",
    daysPerWeek: 5,
    muscleCoverage: "Chest · Back · Shoulders · Arms · Legs",
    days: [
      { weekday: 1, dayName: "Chest Day", exerciseNames: ["Barbell Bench Press - Medium Grip", "Incline Dumbbell Press", "Cable Crossover", "Decline Barbell Bench Press"] },
      { weekday: 2, dayName: "Back Day", exerciseNames: ["Bent Over Barbell Row", "Wide-Grip Lat Pulldown", "Pullups", "Face Pull", "Bent-Arm Dumbbell Pullover"] },
      { weekday: 3, dayName: "Shoulder Day", exerciseNames: ["Dumbbell Shoulder Press", "Cable Seated Lateral Raise", "Reverse Flyes", "Side Laterals to Front Raise"] },
      { weekday: 4, dayName: "Arm Day", exerciseNames: ["Barbell Curl", "Hammer Curls", "Triceps Pushdown", "EZ-Bar Skullcrusher"] },
      { weekday: 5, dayName: "Leg Day", exerciseNames: ["Barbell Squat", "Leg Press", "Leg Extensions", "Lying Leg Curls", "Barbell Seated Calf Raise"] },
    ],
  },

  // ── Mixed Templates (Gym + Martial Arts) ──

  {
    key: "mix_boxer_strength",
    name: "Boxer + Strength",
    daysPerWeek: 5,
    muscleCoverage: "Boxing 3× · Upper/Lower 2×",
    mixed: true,
    days: [
      { weekday: 1, dayName: "Upper Body", exerciseNames: ["Barbell Bench Press - Medium Grip", "Bent Over Barbell Row", "Dumbbell Shoulder Press", "Wide-Grip Lat Pulldown", "Triceps Pushdown"] },
      { weekday: 2, dayName: "Boxing Bag Work", exerciseNames: [], sessionType: "ma", maDiscipline: "boxing", maSessionType: "bag_work" },
      { weekday: 3, dayName: "Lower Body", exerciseNames: ["Barbell Squat", "Leg Press", "Lying Leg Curls", "Barbell Seated Calf Raise", "Barbell Hip Thrust"] },
      { weekday: 4, dayName: "Boxing Pad Work", exerciseNames: [], sessionType: "ma", maDiscipline: "boxing", maSessionType: "pad_work" },
      { weekday: 5, dayName: "Boxing Sparring", exerciseNames: [], sessionType: "ma", maDiscipline: "boxing", maSessionType: "sparring" },
    ],
  },
  {
    key: "mix_muay_thai_ppl",
    name: "Muay Thai + PPL",
    daysPerWeek: 6,
    muscleCoverage: "Muay Thai 3× · Push/Pull/Legs",
    mixed: true,
    days: [
      { weekday: 1, dayName: "Push Day", exerciseNames: ["Barbell Bench Press - Medium Grip", "Incline Dumbbell Press", "Dumbbell Shoulder Press", "Cable Seated Lateral Raise", "Triceps Pushdown"] },
      { weekday: 2, dayName: "Muay Thai Pads", exerciseNames: [], sessionType: "ma", maDiscipline: "muay_thai", maSessionType: "pad_work" },
      { weekday: 3, dayName: "Pull Day", exerciseNames: ["Bent Over Barbell Row", "Wide-Grip Lat Pulldown", "Face Pull", "Barbell Curl", "Hammer Curls"] },
      { weekday: 4, dayName: "Muay Thai Bag", exerciseNames: [], sessionType: "ma", maDiscipline: "muay_thai", maSessionType: "bag_work" },
      { weekday: 5, dayName: "Leg Day", exerciseNames: ["Barbell Squat", "Leg Press", "Leg Extensions", "Lying Leg Curls", "Barbell Seated Calf Raise"] },
      { weekday: 6, dayName: "Muay Thai Sparring", exerciseNames: [], sessionType: "ma", maDiscipline: "muay_thai", maSessionType: "sparring" },
    ],
  },
  {
    key: "mix_bjj_fullbody",
    name: "BJJ + Full Body",
    daysPerWeek: 5,
    muscleCoverage: "BJJ 3× · Full Body 2×",
    mixed: true,
    days: [
      { weekday: 1, dayName: "Full Body", exerciseNames: ["Barbell Squat", "Barbell Bench Press - Medium Grip", "Bent Over Barbell Row", "Dumbbell Shoulder Press", "Barbell Curl"] },
      { weekday: 2, dayName: "BJJ Technique", exerciseNames: [], sessionType: "ma", maDiscipline: "bjj", maSessionType: "technique" },
      { weekday: 3, dayName: "BJJ Flow Roll", exerciseNames: [], sessionType: "ma", maDiscipline: "bjj", maSessionType: "flow_roll" },
      { weekday: 4, dayName: "Full Body", exerciseNames: ["Barbell Squat", "Barbell Bench Press - Medium Grip", "Bent Over Barbell Row", "Dumbbell Shoulder Press", "Barbell Curl"] },
      { weekday: 5, dayName: "BJJ Sparring", exerciseNames: [], sessionType: "ma", maDiscipline: "bjj", maSessionType: "sparring" },
    ],
  },
  {
    key: "mix_mma_hybrid",
    name: "MMA Hybrid",
    daysPerWeek: 6,
    muscleCoverage: "MMA 3× · Strength 3×",
    mixed: true,
    days: [
      { weekday: 1, dayName: "Upper Strength", exerciseNames: ["Barbell Bench Press - Medium Grip", "Bent Over Barbell Row", "Dumbbell Shoulder Press", "Pullups", "Triceps Pushdown"] },
      { weekday: 2, dayName: "MMA Striking", exerciseNames: [], sessionType: "ma", maDiscipline: "mma", maSessionType: "pad_work" },
      { weekday: 3, dayName: "Lower Strength", exerciseNames: ["Barbell Squat", "Leg Press", "Lying Leg Curls", "Barbell Hip Thrust", "Barbell Seated Calf Raise"] },
      { weekday: 4, dayName: "MMA Grappling", exerciseNames: [], sessionType: "ma", maDiscipline: "mma", maSessionType: "flow_roll" },
      { weekday: 5, dayName: "Full Body Power", exerciseNames: ["Barbell Squat", "Barbell Bench Press - Medium Grip", "Bent Over Barbell Row", "Leg Press"] },
      { weekday: 6, dayName: "MMA Sparring", exerciseNames: [], sessionType: "ma", maDiscipline: "mma", maSessionType: "sparring" },
    ],
  },
  {
    key: "mix_karate_strength",
    name: "Karate + Strength",
    daysPerWeek: 5,
    muscleCoverage: "Karate 3× · Upper/Lower 2×",
    mixed: true,
    days: [
      { weekday: 1, dayName: "Upper Body", exerciseNames: ["Barbell Bench Press - Medium Grip", "Bent Over Barbell Row", "Dumbbell Shoulder Press", "Barbell Curl", "Triceps Pushdown"] },
      { weekday: 2, dayName: "Karate Kata", exerciseNames: [], sessionType: "ma", maDiscipline: "karate", maSessionType: "kata" },
      { weekday: 3, dayName: "Lower Body", exerciseNames: ["Barbell Squat", "Leg Press", "Leg Extensions", "Lying Leg Curls", "Barbell Seated Calf Raise"] },
      { weekday: 4, dayName: "Karate Technique", exerciseNames: [], sessionType: "ma", maDiscipline: "karate", maSessionType: "technique" },
      { weekday: 5, dayName: "Karate Sparring", exerciseNames: [], sessionType: "ma", maDiscipline: "karate", maSessionType: "sparring" },
    ],
  },
  {
    key: "mix_tkd_legs",
    name: "Taekwondo + Legs Focus",
    daysPerWeek: 5,
    muscleCoverage: "TKD 3× · Legs 1× · Upper 1×",
    mixed: true,
    days: [
      { weekday: 1, dayName: "TKD Forms", exerciseNames: [], sessionType: "ma", maDiscipline: "taekwondo", maSessionType: "kata" },
      { weekday: 2, dayName: "Leg Strength", exerciseNames: ["Barbell Squat", "Leg Press", "Leg Extensions", "Lying Leg Curls", "Barbell Seated Calf Raise", "Barbell Hip Thrust"] },
      { weekday: 3, dayName: "TKD Technique", exerciseNames: [], sessionType: "ma", maDiscipline: "taekwondo", maSessionType: "technique" },
      { weekday: 4, dayName: "Upper Body", exerciseNames: ["Barbell Bench Press - Medium Grip", "Bent Over Barbell Row", "Dumbbell Shoulder Press", "Barbell Curl", "Triceps Pushdown"] },
      { weekday: 5, dayName: "TKD Sparring", exerciseNames: [], sessionType: "ma", maDiscipline: "taekwondo", maSessionType: "sparring" },
    ],
  },
  {
    key: "mix_boxing_ppl",
    name: "Boxing + Push/Pull",
    daysPerWeek: 4,
    muscleCoverage: "Boxing 2× · Push/Pull 2×",
    mixed: true,
    days: [
      { weekday: 1, dayName: "Push Day", exerciseNames: ["Barbell Bench Press - Medium Grip", "Incline Dumbbell Press", "Dumbbell Shoulder Press", "Cable Seated Lateral Raise", "Triceps Pushdown"] },
      { weekday: 2, dayName: "Boxing Bag Work", exerciseNames: [], sessionType: "ma", maDiscipline: "boxing", maSessionType: "bag_work" },
      { weekday: 4, dayName: "Pull Day", exerciseNames: ["Bent Over Barbell Row", "Wide-Grip Lat Pulldown", "Face Pull", "Barbell Curl", "Hammer Curls"] },
      { weekday: 5, dayName: "Boxing Shadow", exerciseNames: [], sessionType: "ma", maDiscipline: "boxing", maSessionType: "shadowbox" },
    ],
  },
  {
    key: "mix_bjj_upper_lower",
    name: "BJJ + Upper/Lower",
    daysPerWeek: 6,
    muscleCoverage: "BJJ 3× · Upper/Lower 3×",
    mixed: true,
    days: [
      { weekday: 1, dayName: "Upper Body", exerciseNames: ["Barbell Bench Press - Medium Grip", "Bent Over Barbell Row", "Dumbbell Shoulder Press", "Pullups", "Barbell Curl"] },
      { weekday: 2, dayName: "BJJ Technique", exerciseNames: [], sessionType: "ma", maDiscipline: "bjj", maSessionType: "technique" },
      { weekday: 3, dayName: "Lower Body", exerciseNames: ["Barbell Squat", "Leg Press", "Lying Leg Curls", "Barbell Hip Thrust", "Barbell Seated Calf Raise"] },
      { weekday: 4, dayName: "BJJ Flow Roll", exerciseNames: [], sessionType: "ma", maDiscipline: "bjj", maSessionType: "flow_roll" },
      { weekday: 5, dayName: "Upper Body", exerciseNames: ["Barbell Bench Press - Medium Grip", "Bent Over Barbell Row", "Dumbbell Shoulder Press", "Pullups", "Barbell Curl"] },
      { weekday: 6, dayName: "BJJ Sparring", exerciseNames: [], sessionType: "ma", maDiscipline: "bjj", maSessionType: "sparring" },
    ],
  },
  {
    key: "mix_muay_thai_fullbody",
    name: "Muay Thai + Full Body",
    daysPerWeek: 4,
    muscleCoverage: "Muay Thai 2× · Full Body 2×",
    mixed: true,
    days: [
      { weekday: 1, dayName: "Full Body", exerciseNames: ["Barbell Squat", "Barbell Bench Press - Medium Grip", "Bent Over Barbell Row", "Dumbbell Shoulder Press", "Leg Press"] },
      { weekday: 2, dayName: "Muay Thai Pads", exerciseNames: [], sessionType: "ma", maDiscipline: "muay_thai", maSessionType: "pad_work" },
      { weekday: 4, dayName: "Full Body", exerciseNames: ["Barbell Squat", "Barbell Bench Press - Medium Grip", "Bent Over Barbell Row", "Dumbbell Shoulder Press", "Leg Press"] },
      { weekday: 5, dayName: "Muay Thai Conditioning", exerciseNames: [], sessionType: "ma", maDiscipline: "muay_thai", maSessionType: "conditioning" },
    ],
  },
  {
    key: "mix_mma_beginner",
    name: "MMA Beginner",
    daysPerWeek: 4,
    muscleCoverage: "MMA 2× · Full Body 2×",
    mixed: true,
    days: [
      { weekday: 1, dayName: "Full Body", exerciseNames: ["Barbell Squat", "Barbell Bench Press - Medium Grip", "Bent Over Barbell Row", "Dumbbell Shoulder Press", "Barbell Curl"] },
      { weekday: 2, dayName: "MMA Technique", exerciseNames: [], sessionType: "ma", maDiscipline: "mma", maSessionType: "technique" },
      { weekday: 4, dayName: "Full Body", exerciseNames: ["Barbell Squat", "Barbell Bench Press - Medium Grip", "Bent Over Barbell Row", "Dumbbell Shoulder Press", "Barbell Curl"] },
      { weekday: 5, dayName: "MMA Conditioning", exerciseNames: [], sessionType: "ma", maDiscipline: "mma", maSessionType: "conditioning" },
    ],
  },
  {
    key: "mix_boxing_conditioning",
    name: "Boxing + Conditioning",
    daysPerWeek: 5,
    muscleCoverage: "Boxing 3× · Conditioning 2×",
    mixed: true,
    days: [
      { weekday: 1, dayName: "Boxing Bag Work", exerciseNames: [], sessionType: "ma", maDiscipline: "boxing", maSessionType: "bag_work" },
      { weekday: 2, dayName: "Upper Strength", exerciseNames: ["Barbell Bench Press - Medium Grip", "Bent Over Barbell Row", "Dumbbell Shoulder Press", "Pullups", "Triceps Pushdown"] },
      { weekday: 3, dayName: "Boxing Pad Work", exerciseNames: [], sessionType: "ma", maDiscipline: "boxing", maSessionType: "pad_work" },
      { weekday: 4, dayName: "Lower Strength", exerciseNames: ["Barbell Squat", "Leg Press", "Lying Leg Curls", "Barbell Hip Thrust", "Barbell Seated Calf Raise"] },
      { weekday: 5, dayName: "Boxing Shadow", exerciseNames: [], sessionType: "ma", maDiscipline: "boxing", maSessionType: "shadowbox" },
    ],
  },
  {
    key: "mix_dual_art",
    name: "Boxing + BJJ",
    daysPerWeek: 5,
    muscleCoverage: "Boxing 2× · BJJ 2× · Strength 1×",
    mixed: true,
    days: [
      { weekday: 1, dayName: "Boxing Bag Work", exerciseNames: [], sessionType: "ma", maDiscipline: "boxing", maSessionType: "bag_work" },
      { weekday: 2, dayName: "BJJ Technique", exerciseNames: [], sessionType: "ma", maDiscipline: "bjj", maSessionType: "technique" },
      { weekday: 3, dayName: "Full Body", exerciseNames: ["Barbell Squat", "Barbell Bench Press - Medium Grip", "Bent Over Barbell Row", "Dumbbell Shoulder Press", "Pullups"] },
      { weekday: 4, dayName: "Boxing Pads", exerciseNames: [], sessionType: "ma", maDiscipline: "boxing", maSessionType: "pad_work" },
      { weekday: 5, dayName: "BJJ Sparring", exerciseNames: [], sessionType: "ma", maDiscipline: "bjj", maSessionType: "sparring" },
    ],
  },
];
