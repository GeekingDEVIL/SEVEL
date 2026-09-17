// ═══════════════════════════════════════════════════════════════
// Martial Arts Engine — techniques, combos, XP, Style DNA
// Spec: specs/MARTIAL_ARTS_SPEC.md
// ═══════════════════════════════════════════════════════════════

export type DisciplineId =
  | "boxing" | "muay_thai" | "kickboxing"
  | "bjj" | "wrestling" | "judo"
  | "mma"
  | "karate" | "taekwondo" | "kung_fu"
  | "krav_maga" | "shaolin" | "kalaripayattu"
  | "wing_chun" | "capoeira" | "aikido";

export type SessionType =
  | "technique" | "sparring" | "pad_work" | "bag_work"
  | "shadowbox" | "conditioning" | "kata" | "flow_roll" | "mixed";

export type TechCategory =
  | "punch" | "kick" | "elbow" | "knee" | "clinch"
  | "takedown" | "sweep" | "submission" | "escape"
  | "guard" | "pass" | "block" | "stance" | "combo"
  | "throw" | "form";

export type Difficulty = "beginner" | "intermediate" | "advanced";

export type Technique = {
  id: string;
  discipline: DisciplineId;
  category: TechCategory;
  name: string;
  description: string;
  difficulty: Difficulty;
  bodyRegion: string[];
  keyPoints: string[];
  commonMistakes: string[];
};

export type Combo = {
  id: string;
  discipline: DisciplineId;
  name: string;
  techniqueIds: string[];
  difficulty: Difficulty;
  description: string;
};

export type DisciplineInfo = {
  id: DisciplineId;
  name: string;
  category: "striking" | "grappling" | "traditional" | "mixed" | "self-defense";
  emoji: string;
  colorRgb: string;
  hasBelts: boolean;
  beltSystem?: string[];
  hasForms: boolean;
  imageUrl: string;
};

export type DisciplineOrigin = {
  tagline: string;
  founded: string;
  origin: string;
  philosophy: string;
  story: string;
  keyFigures: { name: string; role: string; bio?: string; imageUrl?: string }[];
  eras: { period: string; title: string; description: string; imageUrl?: string }[];
  funFact: string;
};

// ── Discipline Registry ─────────────────────────────────────

export const DISCIPLINES: Record<DisciplineId, DisciplineInfo> = {
  boxing: {
    id: "boxing", name: "Boxing", category: "striking",
    emoji: "🥊", colorRgb: "239 68 68", hasBelts: false, hasForms: false,
    imageUrl: "/ma/boxing.jpg",
  },
  muay_thai: {
    id: "muay_thai", name: "Muay Thai", category: "striking",
    emoji: "🦵", colorRgb: "249 115 22", hasBelts: false, hasForms: false,
    imageUrl: "/ma/muay-thai.jpg",
  },
  kickboxing: {
    id: "kickboxing", name: "Kickboxing", category: "striking",
    emoji: "🦶", colorRgb: "245 158 11", hasBelts: true, hasForms: false,
    beltSystem: ["White", "Yellow", "Orange", "Green", "Blue", "Brown", "Black"],
    imageUrl: "/ma/kickboxing.jpg",
  },
  bjj: {
    id: "bjj", name: "Brazilian Jiu-Jitsu", category: "grappling",
    emoji: "🥋", colorRgb: "59 130 246", hasBelts: true, hasForms: false,
    beltSystem: ["White", "Blue", "Purple", "Brown", "Black"],
    imageUrl: "/ma/bjj.jpg",
  },
  wrestling: {
    id: "wrestling", name: "Wrestling", category: "grappling",
    emoji: "🤼", colorRgb: "16 185 129", hasBelts: false, hasForms: false,
    imageUrl: "/ma/wrestling.jpg",
  },
  judo: {
    id: "judo", name: "Judo", category: "grappling",
    emoji: "🥋", colorRgb: "99 102 241", hasBelts: true, hasForms: true,
    beltSystem: ["White", "Yellow", "Orange", "Green", "Blue", "Brown", "Black"],
    imageUrl: "/ma/judo.jpg",
  },
  mma: {
    id: "mma", name: "MMA", category: "mixed",
    emoji: "⚔️", colorRgb: "239 68 68", hasBelts: false, hasForms: false,
    imageUrl: "/ma/mma.jpg",
  },
  karate: {
    id: "karate", name: "Karate", category: "traditional",
    emoji: "🥋", colorRgb: "244 63 94", hasBelts: true, hasForms: true,
    beltSystem: ["White", "Yellow", "Orange", "Green", "Blue", "Purple", "Brown", "Black"],
    imageUrl: "/ma/karate.jpg",
  },
  taekwondo: {
    id: "taekwondo", name: "Taekwondo", category: "traditional",
    emoji: "🦶", colorRgb: "168 85 247", hasBelts: true, hasForms: true,
    beltSystem: ["White", "Yellow", "Green", "Blue", "Red", "Black"],
    imageUrl: "/ma/taekwondo.jpg",
  },
  kung_fu: {
    id: "kung_fu", name: "Kung Fu", category: "traditional",
    emoji: "🐉", colorRgb: "234 179 8", hasBelts: true, hasForms: true,
    beltSystem: ["White Sash", "Yellow Sash", "Orange Sash", "Green Sash", "Blue Sash", "Brown Sash", "Black Sash"],
    imageUrl: "/ma/kung-fu.jpg",
  },
  krav_maga: {
    id: "krav_maga", name: "Krav Maga", category: "self-defense",
    emoji: "🛡️", colorRgb: "107 114 128", hasBelts: true, hasForms: false,
    beltSystem: ["P1", "P2", "P3", "P4", "P5", "G1", "G2", "G3", "G4", "G5"],
    imageUrl: "/ma/krav-maga.jpg",
  },
  shaolin: {
    id: "shaolin", name: "Shaolin Kung Fu", category: "traditional",
    emoji: "🧘", colorRgb: "234 179 8", hasBelts: true, hasForms: true,
    beltSystem: ["White Sash", "Yellow Sash", "Orange Sash", "Green Sash", "Blue Sash", "Brown Sash", "Black Sash"],
    imageUrl: "/ma/shaolin.jpg",
  },
  kalaripayattu: {
    id: "kalaripayattu", name: "Kalaripayattu", category: "traditional",
    emoji: "⚡", colorRgb: "245 158 11", hasBelts: false, hasForms: true,
    imageUrl: "/ma/kalaripayattu.jpg",
  },
  wing_chun: {
    id: "wing_chun", name: "Wing Chun", category: "traditional",
    emoji: "🖐️", colorRgb: "168 85 247", hasBelts: false, hasForms: true,
    imageUrl: "/ma/wing-chun.jpg",
  },
  capoeira: {
    id: "capoeira", name: "Capoeira", category: "traditional",
    emoji: "🤸", colorRgb: "16 185 129", hasBelts: true, hasForms: false,
    beltSystem: ["Crua", "Amarela", "Laranja", "Azul", "Verde", "Roxa", "Marrom", "Vermelha"],
    imageUrl: "/ma/capoeira.jpg",
  },
  aikido: {
    id: "aikido", name: "Aikido", category: "grappling",
    emoji: "☯️", colorRgb: "99 102 241", hasBelts: true, hasForms: true,
    beltSystem: ["White", "Yellow", "Orange", "Green", "Blue", "Brown", "Black"],
    imageUrl: "/ma/aikido.jpg",
  },
};

export const PHASE1_DISCIPLINES: DisciplineId[] = [
  "boxing", "muay_thai", "bjj", "karate", "taekwondo", "mma",
];

// ── Session Type Labels ─────────────────────────────────────

export const SESSION_TYPE_LABELS: Record<SessionType, { name: string; emoji: string; description: string; howItWorks: string; equipment: string; difficulty: "beginner" | "intermediate" | "advanced"; suggestedMin: number }> = {
  technique:    { name: "Technique Drill", emoji: "🎯", description: "Focused repetition of specific techniques", howItWorks: "Pick techniques to practice, then drill them round by round. The timer keeps you on pace with work and rest intervals.", equipment: "None — just space to move", difficulty: "beginner", suggestedMin: 20 },
  sparring:     { name: "Sparring",        emoji: "🤝", description: "Live rounds with a training partner", howItWorks: "Timed rounds of live practice with a partner. Start light and increase intensity as you get comfortable.", equipment: "Gloves, mouthguard, partner", difficulty: "intermediate", suggestedMin: 30 },
  pad_work:     { name: "Pad Work",        emoji: "🥊", description: "Rounds on focus mitts or Thai pads", howItWorks: "A partner holds pads while you throw combinations. Great for building power, accuracy, and timing.", equipment: "Focus mitts or Thai pads, gloves, partner", difficulty: "beginner", suggestedMin: 25 },
  bag_work:     { name: "Bag Work",        emoji: "🏋️", description: "Heavy bag, speed bag, or double-end bag", howItWorks: "Solo rounds on the bag. Practice combos, work on power, or go for cardio-style non-stop rounds.", equipment: "Heavy bag or speed bag, gloves, wraps", difficulty: "beginner", suggestedMin: 25 },
  shadowbox:    { name: "Shadow Work",     emoji: "👤", description: "Shadowboxing or shadow grappling", howItWorks: "Move and throw techniques solo — no equipment needed. Visualize an opponent, work footwork and combinations.", equipment: "None — mirror optional", difficulty: "beginner", suggestedMin: 15 },
  conditioning: { name: "Conditioning",    emoji: "🔥", description: "Sport-specific cardio and strength", howItWorks: "Timed intervals of exercises like burpees, jump rope, sprawls, and bodyweight circuits to build fight-ready fitness.", equipment: "None — jump rope optional", difficulty: "beginner", suggestedMin: 20 },
  kata:         { name: "Forms / Kata",    emoji: "📜", description: "Traditional forms, kata, or poomsae", howItWorks: "Practice set movement patterns. Each round, perform your chosen form focusing on precision, power, and breathing.", equipment: "None — open space", difficulty: "beginner", suggestedMin: 20 },
  flow_roll:    { name: "Flow Roll",       emoji: "🌊", description: "Light positional grappling", howItWorks: "Relaxed grappling with a partner at 30-50% intensity. Focus on transitions, positions, and technique over strength.", equipment: "Gi or no-gi gear, partner, mat", difficulty: "intermediate", suggestedMin: 25 },
  mixed:        { name: "Mixed Session",   emoji: "⚡", description: "Combination of multiple training types", howItWorks: "A varied session — mix technique drills, conditioning, and free work. Each round can be different.", equipment: "Varies — depends on what you mix", difficulty: "beginner", suggestedMin: 30 },
};

export function getSessionTypesForDiscipline(d: DisciplineId): SessionType[] {
  const base: SessionType[] = ["technique", "conditioning", "mixed"];
  const info = DISCIPLINES[d];
  if (!info) return base;

  if (info.category === "striking" || d === "mma") {
    base.push("pad_work", "bag_work", "shadowbox", "sparring");
  }
  if (info.category === "grappling" || d === "mma") {
    base.push("sparring", "flow_roll");
  }
  if (info.category === "traditional") {
    base.push("sparring", "shadowbox");
  }
  if (info.category === "self-defense") {
    base.push("sparring");
  }
  if (info.hasForms) {
    base.push("kata");
  }

  return [...new Set(base)];
}

// ── Technique Library (Phase 1 — ~25 per discipline) ────────

export const TECHNIQUE_LIBRARY: Technique[] = [
  // ─── Boxing ───
  { id: "box-jab", discipline: "boxing", category: "punch", name: "Jab", difficulty: "beginner",
    description: "Lead hand straight punch, the foundation of boxing",
    bodyRegion: ["hands", "shoulders"], keyPoints: ["Snap it back fast", "Chin tucked", "Rotate fist on extension"], commonMistakes: ["Dropping guard hand", "Leaning forward", "Telegraphing"] },
  { id: "box-cross", discipline: "boxing", category: "punch", name: "Cross", difficulty: "beginner",
    description: "Rear hand straight power punch with hip rotation",
    bodyRegion: ["hands", "shoulders", "hips"], keyPoints: ["Drive from rear foot", "Full hip rotation", "Return to guard"], commonMistakes: ["No hip rotation", "Reaching", "Dropping rear hand after"] },
  { id: "box-hook", discipline: "boxing", category: "punch", name: "Lead Hook", difficulty: "beginner",
    description: "Circular punch with lead hand targeting the side of the head or body",
    bodyRegion: ["hands", "shoulders"], keyPoints: ["Elbow at 90°", "Turn on lead foot", "Power from core rotation"], commonMistakes: ["Arm too straight", "Winding up", "Dropping hand before throwing"] },
  { id: "box-rear-hook", discipline: "boxing", category: "punch", name: "Rear Hook", difficulty: "intermediate",
    description: "Circular punch with rear hand, often used after a cross",
    bodyRegion: ["hands", "shoulders"], keyPoints: ["Short arc", "Keep elbow tight", "Rotate hips through"], commonMistakes: ["Over-rotating", "Looping too wide"] },
  { id: "box-uppercut-lead", discipline: "boxing", category: "punch", name: "Lead Uppercut", difficulty: "intermediate",
    description: "Rising punch with lead hand targeting the chin or body",
    bodyRegion: ["hands", "shoulders"], keyPoints: ["Dip slightly", "Drive upward from legs", "Palm faces you"], commonMistakes: ["Dropping hand too low before", "Standing too upright"] },
  { id: "box-uppercut-rear", discipline: "boxing", category: "punch", name: "Rear Uppercut", difficulty: "intermediate",
    description: "Rising power punch from rear hand",
    bodyRegion: ["hands", "shoulders", "hips"], keyPoints: ["Short compact motion", "Hip drive", "Don't lean back"], commonMistakes: ["Winding up", "Exposing chin"] },
  { id: "box-body-jab", discipline: "boxing", category: "punch", name: "Body Jab", difficulty: "beginner",
    description: "Jab targeting the opponent's midsection",
    bodyRegion: ["hands"], keyPoints: ["Level change with knees", "Don't just bend at waist", "Quick return"], commonMistakes: ["Bending only at waist", "Dropping guard"] },
  { id: "box-slip", discipline: "boxing", category: "block", name: "Slip", difficulty: "beginner",
    description: "Head movement to evade straight punches by moving offline",
    bodyRegion: [], keyPoints: ["Bend at knees and waist", "Eyes on opponent", "Small movement"], commonMistakes: ["Moving too far", "Closing eyes", "Bending only at waist"] },
  { id: "box-roll", discipline: "boxing", category: "block", name: "Bob & Weave", difficulty: "intermediate",
    description: "Ducking under hooks by bending knees and moving in a U-shape",
    bodyRegion: ["knees"], keyPoints: ["U-shape motion", "Stay balanced", "Come up with a counter"], commonMistakes: ["Bending at waist", "Going too low", "Staying down too long"] },
  { id: "box-parry", discipline: "boxing", category: "block", name: "Parry", difficulty: "beginner",
    description: "Deflecting incoming punches with an open hand",
    bodyRegion: ["hands"], keyPoints: ["Small redirecting motion", "Don't reach", "Counter immediately"], commonMistakes: ["Swatting", "Over-committing the parry hand"] },
  { id: "box-footwork-basic", discipline: "boxing", category: "stance", name: "Basic Footwork", difficulty: "beginner",
    description: "Fundamental movement — push step, pivot, angle changes",
    bodyRegion: [], keyPoints: ["Never cross feet", "Push from rear foot", "Stay on balls of feet"], commonMistakes: ["Flat-footed", "Crossing feet", "Bouncing too much"] },
  { id: "box-combo-12", discipline: "boxing", category: "combo", name: "1-2 (Jab-Cross)", difficulty: "beginner",
    description: "The most fundamental boxing combination",
    bodyRegion: ["hands", "shoulders", "hips"], keyPoints: ["Jab sets up the cross", "Return jab before throwing cross", "Full hip rotation on cross"], commonMistakes: ["Throwing both at once", "No power on cross"] },
  { id: "box-combo-123", discipline: "boxing", category: "combo", name: "1-2-3 (Jab-Cross-Hook)", difficulty: "beginner",
    description: "Classic three-punch combination ending with a hook",
    bodyRegion: ["hands", "shoulders", "hips"], keyPoints: ["Flow from cross into hook", "Turn on lead foot for hook", "Reset guard after"], commonMistakes: ["Pausing between punches", "Hook too wide"] },
  { id: "box-combo-1232", discipline: "boxing", category: "combo", name: "1-2-3-2 (Jab-Cross-Hook-Cross)", difficulty: "intermediate",
    description: "Four-punch power combination",
    bodyRegion: ["hands", "shoulders", "hips"], keyPoints: ["Maintain balance throughout", "Each punch sets up the next", "Final cross has full power"], commonMistakes: ["Losing balance", "Punches getting sloppy by #4"] },

  // ─── Muay Thai ───
  { id: "mt-teep", discipline: "muay_thai", category: "kick", name: "Teep (Push Kick)", difficulty: "beginner",
    description: "Front push kick used to create distance and control range",
    bodyRegion: ["hips", "knees"], keyPoints: ["Chamber knee high", "Push through with hip", "Snap back"], commonMistakes: ["Kicking instead of pushing", "Leaning too far back"] },
  { id: "mt-roundhouse", discipline: "muay_thai", category: "kick", name: "Roundhouse Kick", difficulty: "beginner",
    description: "The signature Muay Thai weapon — full hip rotation through the target",
    bodyRegion: ["hips", "shins", "knees"], keyPoints: ["Turn supporting foot", "Swing arm for momentum", "Kick through the target"], commonMistakes: ["Not turning hip over", "Using knee instead of shin", "No arm swing"] },
  { id: "mt-low-kick", discipline: "muay_thai", category: "kick", name: "Low Kick", difficulty: "beginner",
    description: "Roundhouse targeting the opponent's thigh to degrade mobility",
    bodyRegion: ["shins", "hips"], keyPoints: ["Aim for outer thigh", "Step at 45° angle", "Follow through"], commonMistakes: ["Kicking too high", "Not stepping offline"] },
  { id: "mt-elbow-horizontal", discipline: "muay_thai", category: "elbow", name: "Horizontal Elbow", difficulty: "intermediate",
    description: "Close-range slashing elbow strike",
    bodyRegion: ["shoulders"], keyPoints: ["Step into range", "Lead with shoulder rotation", "Follow through across"], commonMistakes: ["Throwing from too far", "No hip rotation"] },
  { id: "mt-elbow-uppercut", discipline: "muay_thai", category: "elbow", name: "Uppercut Elbow", difficulty: "intermediate",
    description: "Rising elbow strike targeting the chin",
    bodyRegion: ["shoulders"], keyPoints: ["Drive upward from legs", "Short range weapon", "Set up with other strikes"], commonMistakes: ["Telegraphing", "Leaning back"] },
  { id: "mt-knee-straight", discipline: "muay_thai", category: "knee", name: "Straight Knee", difficulty: "beginner",
    description: "Driving knee strike straight into the opponent's body",
    bodyRegion: ["knees", "hips"], keyPoints: ["Pull opponent into knee", "Drive hip forward", "Rise on supporting foot"], commonMistakes: ["Just lifting knee without driving", "Not pulling opponent in"] },
  { id: "mt-clinch-basic", discipline: "muay_thai", category: "clinch", name: "Basic Clinch", difficulty: "intermediate",
    description: "Double collar tie position for controlling opponent in close range",
    bodyRegion: ["grip", "neck", "shoulders"], keyPoints: ["Hands behind head, not neck", "Elbows tight", "Posture break opponent down"], commonMistakes: ["Grabbing the neck", "Wide elbows", "Standing too upright"] },
  { id: "mt-check", discipline: "muay_thai", category: "block", name: "Shin Check", difficulty: "beginner",
    description: "Lifting the shin to block incoming kicks",
    bodyRegion: ["shins"], keyPoints: ["Lift knee high", "Turn shin outward", "Stay balanced on support leg"], commonMistakes: ["Lifting too late", "Not turning shin", "Hopping back instead"] },
  { id: "mt-catch-kick", discipline: "muay_thai", category: "block", name: "Catch & Sweep", difficulty: "advanced",
    description: "Catching an incoming kick and sweeping the standing leg",
    bodyRegion: ["grip", "hips"], keyPoints: ["Absorb with arm", "Step in immediately", "Sweep supporting leg"], commonMistakes: ["Reaching for the kick", "Not stepping in fast enough"] },
  { id: "mt-combo-teep-round", discipline: "muay_thai", category: "combo", name: "Teep → Roundhouse", difficulty: "intermediate",
    description: "Push kick to create reaction, followed by roundhouse to the opening",
    bodyRegion: ["hips", "shins", "knees"], keyPoints: ["Teep to the body", "Read their reaction", "Roundhouse as they reset"], commonMistakes: ["Telegraphing the roundhouse", "No pause to read"] },

  // ─── BJJ ───
  { id: "bjj-closed-guard", discipline: "bjj", category: "guard", name: "Closed Guard", difficulty: "beginner",
    description: "Fundamental bottom position with legs wrapped around opponent's waist",
    bodyRegion: ["hips", "grip"], keyPoints: ["Break posture immediately", "Control sleeves or collar", "Hips active, never flat"], commonMistakes: ["Lying flat", "Feet crossed too high", "No grip fighting"] },
  { id: "bjj-armbar", discipline: "bjj", category: "submission", name: "Armbar from Guard", difficulty: "beginner",
    description: "Hyperextension of the elbow joint from closed guard",
    bodyRegion: ["hips", "grip"], keyPoints: ["Control the wrist", "Hips high on shoulder", "Squeeze knees together", "Extend hips for finish"], commonMistakes: ["Not controlling posture first", "Hips too low", "Knees open"] },
  { id: "bjj-triangle", discipline: "bjj", category: "submission", name: "Triangle Choke", difficulty: "intermediate",
    description: "Blood choke using the legs from guard, trapping one arm",
    bodyRegion: ["hips", "knees"], keyPoints: ["Angle off to the side", "Cut the angle", "Pull head down", "Squeeze knees"], commonMistakes: ["Staying square", "Not cutting the angle", "Arm not across"] },
  { id: "bjj-hip-escape", discipline: "bjj", category: "escape", name: "Hip Escape (Shrimp)", difficulty: "beginner",
    description: "Fundamental escape movement — creating space by moving hips away",
    bodyRegion: ["hips"], keyPoints: ["Bridge first", "Turn to side", "Push with foot and frame", "Create space"], commonMistakes: ["Not bridging first", "Moving shoulders instead of hips"] },
  { id: "bjj-scissor-sweep", discipline: "bjj", category: "sweep", name: "Scissor Sweep", difficulty: "beginner",
    description: "Sweeping opponent from closed guard using a scissoring leg motion",
    bodyRegion: ["hips"], keyPoints: ["Break posture", "Shin across stomach", "Pull sleeve, push knee", "Scissor legs"], commonMistakes: ["Not breaking posture", "No sleeve grip", "Timing off"] },
  { id: "bjj-rear-naked", discipline: "bjj", category: "submission", name: "Rear Naked Choke", difficulty: "beginner",
    description: "Blood choke from back control — the highest percentage submission",
    bodyRegion: ["grip", "shoulders"], keyPoints: ["Seatbelt grip first", "Choking arm under chin", "Lock the figure-four", "Squeeze elbows together"], commonMistakes: ["Going for neck before seatbelt", "Chin strap instead of under chin"] },
  { id: "bjj-mount-escape", discipline: "bjj", category: "escape", name: "Trap & Roll (Mount Escape)", difficulty: "beginner",
    description: "Escaping full mount by trapping an arm and foot, then bridging",
    bodyRegion: ["hips"], keyPoints: ["Trap arm and same-side foot", "Bridge explosively", "Turn into them", "End in guard"], commonMistakes: ["Not trapping foot", "Weak bridge", "Rolling wrong direction"] },
  { id: "bjj-guard-pass-knee", discipline: "bjj", category: "pass", name: "Knee Slice Pass", difficulty: "intermediate",
    description: "Passing guard by sliding the knee through while controlling upper body",
    bodyRegion: ["knees", "grip"], keyPoints: ["Underhook on far side", "Knee slides through centerline", "Heavy cross-face pressure", "Clear the legs"], commonMistakes: ["No underhook", "Staying too upright", "Not clearing the knee"] },
  { id: "bjj-takedown-double", discipline: "bjj", category: "takedown", name: "Double Leg Takedown", difficulty: "intermediate",
    description: "Shooting in to grab both legs and drive opponent to the ground",
    bodyRegion: ["knees", "shoulders"], keyPoints: ["Level change", "Penetration step deep", "Head on chest side", "Drive through"], commonMistakes: ["Head down", "Reaching instead of stepping", "Not driving through"] },
  { id: "bjj-back-take", discipline: "bjj", category: "guard", name: "Back Take from Guard", difficulty: "intermediate",
    description: "Transitioning from guard to back control when opponent postures",
    bodyRegion: ["hips", "grip"], keyPoints: ["Overhook + collar grip", "Hip out", "Insert first hook", "Climb to back"], commonMistakes: ["No initial grips", "Not hip escaping first"] },

  // ─── Karate ───
  { id: "kar-oi-zuki", discipline: "karate", category: "punch", name: "Oi-Zuki (Lunge Punch)", difficulty: "beginner",
    description: "Stepping forward punch — same hand as forward leg",
    bodyRegion: ["hands", "shoulders"], keyPoints: ["Step and punch simultaneously", "Twist fist at extension", "Pull other hand to hip"], commonMistakes: ["Punching before stepping", "No hip connection"] },
  { id: "kar-gyaku-zuki", discipline: "karate", category: "punch", name: "Gyaku-Zuki (Reverse Punch)", difficulty: "beginner",
    description: "Rear hand punch from a stationary stance — primary power technique",
    bodyRegion: ["hands", "hips"], keyPoints: ["Strong hip rotation", "Anchor front foot", "Snap punch back"], commonMistakes: ["No hip rotation", "Rising up from stance"] },
  { id: "kar-mae-geri", discipline: "karate", category: "kick", name: "Mae Geri (Front Kick)", difficulty: "beginner",
    description: "Snapping front kick using the ball of the foot",
    bodyRegion: ["hips", "knees"], keyPoints: ["Chamber knee high", "Snap foot out", "Pull back fast", "Use ball of foot"], commonMistakes: ["Kicking with toes", "No chamber", "Leaning back too far"] },
  { id: "kar-mawashi-geri", discipline: "karate", category: "kick", name: "Mawashi Geri (Roundhouse Kick)", difficulty: "intermediate",
    description: "Circular kick targeting the side of the body or head",
    bodyRegion: ["hips", "shins", "knees"], keyPoints: ["Chamber to the side", "Pivot support foot", "Snap through target"], commonMistakes: ["No pivot", "Kicking up instead of around"] },
  { id: "kar-age-uke", discipline: "karate", category: "block", name: "Age Uke (Rising Block)", difficulty: "beginner",
    description: "Upward sweeping block against overhead attacks",
    bodyRegion: ["shoulders"], keyPoints: ["Cross in front", "Sweep upward", "Forearm above forehead", "Turn wrist at top"], commonMistakes: ["Arm too far forward", "Not turning wrist"] },
  { id: "kar-gedan-barai", discipline: "karate", category: "block", name: "Gedan Barai (Downward Block)", difficulty: "beginner",
    description: "Sweeping downward block against low attacks",
    bodyRegion: ["shoulders"], keyPoints: ["Cross body first", "Sweep diagonally down", "End at knee level"], commonMistakes: ["Reaching too far", "Not crossing first"] },
  { id: "kar-zenkutsu-dachi", discipline: "karate", category: "stance", name: "Zenkutsu-Dachi (Front Stance)", difficulty: "beginner",
    description: "Deep forward stance — 60/40 weight distribution",
    bodyRegion: ["knees", "hips"], keyPoints: ["Front knee over ankle", "Rear leg straight", "Hips square forward"], commonMistakes: ["Narrow stance", "Rear knee bent", "Hips open"] },
  { id: "kar-kata-heian1", discipline: "karate", category: "form", name: "Heian Shodan", difficulty: "beginner",
    description: "First Heian kata — teaches basic blocks, punches, and stances",
    bodyRegion: [], keyPoints: ["21 movements", "Strong stances", "Kiai on movements 9 and 17"], commonMistakes: ["Rushing", "Weak stances", "Forgetting kiai"] },

  // ─── Taekwondo ───
  { id: "tkd-front-kick", discipline: "taekwondo", category: "kick", name: "Ap Chagi (Front Kick)", difficulty: "beginner",
    description: "Snapping front kick — foundation of TKD kicking",
    bodyRegion: ["hips", "knees"], keyPoints: ["Chamber high", "Snap with ball of foot", "Re-chamber before setting down"], commonMistakes: ["No re-chamber", "Pushing instead of snapping"] },
  { id: "tkd-roundhouse", discipline: "taekwondo", category: "kick", name: "Dollyo Chagi (Roundhouse)", difficulty: "beginner",
    description: "Turning kick using instep — the most common TKD scoring technique",
    bodyRegion: ["hips", "knees"], keyPoints: ["Chamber to the side", "Full hip turnover", "Strike with instep", "Quick return"], commonMistakes: ["Lazy chamber", "Not turning hip", "Using shin instead of instep"] },
  { id: "tkd-side-kick", discipline: "taekwondo", category: "kick", name: "Yop Chagi (Side Kick)", difficulty: "intermediate",
    description: "Thrusting kick to the side using the blade of the foot",
    bodyRegion: ["hips", "knees"], keyPoints: ["Chamber across body", "Thrust hip through", "Strike with heel/blade", "Lock out leg"], commonMistakes: ["Leaning too far", "No hip thrust", "Using ball of foot"] },
  { id: "tkd-back-kick", discipline: "taekwondo", category: "kick", name: "Dwit Chagi (Back Kick)", difficulty: "intermediate",
    description: "Spinning back kick — powerful linear technique",
    bodyRegion: ["hips", "knees"], keyPoints: ["Look over shoulder first", "Straight line", "Thrust with heel", "Spin tight"], commonMistakes: ["Hooking instead of straight", "Not looking first", "Losing balance"] },
  { id: "tkd-axe-kick", discipline: "taekwondo", category: "kick", name: "Naeryeo Chagi (Axe Kick)", difficulty: "intermediate",
    description: "Raising the leg high and dropping the heel down onto the target",
    bodyRegion: ["hips", "knees"], keyPoints: ["Swing leg straight up", "Drop heel on target", "Keep standing leg firm"], commonMistakes: ["Not getting high enough", "Landing with sole instead of heel"] },
  { id: "tkd-spinning-hook", discipline: "taekwondo", category: "kick", name: "Dwi Huryeo Chagi (Spinning Hook Kick)", difficulty: "advanced",
    description: "360° spinning kick using the heel in a hooking motion",
    bodyRegion: ["hips", "knees"], keyPoints: ["Spot your target", "Tight spin", "Hook heel at end", "Follow through"], commonMistakes: ["Losing balance", "Not spotting", "Too wide a spin"] },
  { id: "tkd-poomsae-1", discipline: "taekwondo", category: "form", name: "Taegeuk Il Jang (Poomsae 1)", difficulty: "beginner",
    description: "First Taegeuk form — represents heaven and light",
    bodyRegion: [], keyPoints: ["18 movements", "Walk forward and turn", "Low block + middle punch pattern"], commonMistakes: ["Wrong direction", "Weak stances", "Inconsistent pace"] },

  // ─── MMA ───
  { id: "mma-sprawl", discipline: "mma", category: "takedown", name: "Sprawl", difficulty: "beginner",
    description: "Defensive technique to stop a takedown attempt by sprawling hips back",
    bodyRegion: ["hips"], keyPoints: ["React immediately", "Hips to ground", "Chest on their back", "Crossface or wizzer"], commonMistakes: ["Late reaction", "Not dropping hips", "Staying too upright"] },
  { id: "mma-ground-pound", discipline: "mma", category: "punch", name: "Ground & Pound", difficulty: "intermediate",
    description: "Striking from top position on the ground",
    bodyRegion: ["hands", "hips"], keyPoints: ["Maintain top control", "Posture up to punch", "Mix punches and elbows", "Keep base"], commonMistakes: ["Losing position to strike", "No variety", "Getting swept"] },
  { id: "mma-cage-work", discipline: "mma", category: "clinch", name: "Cage Clinch Work", difficulty: "intermediate",
    description: "Using the cage for control, takedowns, and dirty boxing",
    bodyRegion: ["grip", "shoulders"], keyPoints: ["Underhook battle", "Foot position for trips", "Short strikes in clinch"], commonMistakes: ["Resting on cage", "No offensive output", "Getting turned"] },
  { id: "mma-level-change", discipline: "mma", category: "takedown", name: "Level Change", difficulty: "beginner",
    description: "Dropping level to set up takedowns while maintaining striking threat",
    bodyRegion: ["knees", "hips"], keyPoints: ["Bend knees not waist", "Hands up during change", "Explosive direction change"], commonMistakes: ["Bending at waist only", "Telegraphing the level change"] },
  { id: "mma-distance-mgmt", discipline: "mma", category: "stance", name: "Distance Management", difficulty: "beginner",
    description: "Controlling range — knowing when to strike, clinch, or grapple",
    bodyRegion: [], keyPoints: ["Jab range vs clinch range vs takedown range", "Use feints to measure", "Circle don't back up straight"], commonMistakes: ["Staying in one range", "Backing up in a straight line"] },
];

// ── Combo Library ───────────────────────────────────────────

export const COMBO_LIBRARY: Combo[] = [
  // Boxing
  { id: "combo-box-12", discipline: "boxing", name: "1-2", difficulty: "beginner",
    techniqueIds: ["box-jab", "box-cross"], description: "Jab → Cross" },
  { id: "combo-box-123", discipline: "boxing", name: "1-2-3", difficulty: "beginner",
    techniqueIds: ["box-jab", "box-cross", "box-hook"], description: "Jab → Cross → Lead Hook" },
  { id: "combo-box-1232", discipline: "boxing", name: "1-2-3-2", difficulty: "intermediate",
    techniqueIds: ["box-jab", "box-cross", "box-hook", "box-cross"], description: "Jab → Cross → Hook → Cross" },
  { id: "combo-box-12-body", discipline: "boxing", name: "1-2 Body", difficulty: "beginner",
    techniqueIds: ["box-jab", "box-body-jab"], description: "Jab head → Jab body" },
  { id: "combo-box-uppercut-hook", discipline: "boxing", name: "Uppercut-Hook", difficulty: "intermediate",
    techniqueIds: ["box-uppercut-lead", "box-rear-hook"], description: "Lead Uppercut → Rear Hook" },

  // Muay Thai
  { id: "combo-mt-12-kick", discipline: "muay_thai", name: "1-2-Kick", difficulty: "beginner",
    techniqueIds: ["box-jab", "box-cross", "mt-roundhouse"], description: "Jab → Cross → Rear Roundhouse" },
  { id: "combo-mt-teep-round", discipline: "muay_thai", name: "Teep-Roundhouse", difficulty: "intermediate",
    techniqueIds: ["mt-teep", "mt-roundhouse"], description: "Teep → Rear Roundhouse" },
  { id: "combo-mt-low-cross", discipline: "muay_thai", name: "Low Kick-Cross", difficulty: "beginner",
    techniqueIds: ["mt-low-kick", "box-cross"], description: "Lead Low Kick → Cross" },
  { id: "combo-mt-clinch-knee", discipline: "muay_thai", name: "Clinch-Knee", difficulty: "intermediate",
    techniqueIds: ["mt-clinch-basic", "mt-knee-straight"], description: "Clinch entry → Straight Knee" },

  // BJJ
  { id: "combo-bjj-armbar-triangle", discipline: "bjj", name: "Armbar-Triangle Chain", difficulty: "intermediate",
    techniqueIds: ["bjj-armbar", "bjj-triangle"], description: "Armbar attempt → Triangle when they stack" },
  { id: "combo-bjj-sweep-mount", discipline: "bjj", name: "Sweep to Mount", difficulty: "beginner",
    techniqueIds: ["bjj-scissor-sweep", "bjj-guard-pass-knee"], description: "Scissor Sweep → Establish top control" },
];

// ── Conditioning Drills ────────────────────────────────────

export type ConditioningDrill = {
  id: string;
  discipline: DisciplineId | "universal";
  name: string;
  description: string;
  duration: string;
  intensity: "light" | "medium" | "hard";
};

export const CONDITIONING_DRILLS: ConditioningDrill[] = [
  // Universal
  { id: "cond-burpees", discipline: "universal", name: "Burpees", description: "Full-body explosive movement — drop, push-up, jump", duration: "30s on / 15s off", intensity: "hard" },
  { id: "cond-mountain-climbers", discipline: "universal", name: "Mountain Climbers", description: "Drive knees to chest in plank position", duration: "40s on / 20s off", intensity: "medium" },
  { id: "cond-high-knees", discipline: "universal", name: "High Knees", description: "Run in place driving knees above hip level", duration: "30s on / 15s off", intensity: "medium" },
  { id: "cond-jump-squats", discipline: "universal", name: "Jump Squats", description: "Deep squat then explode upward", duration: "20s on / 10s off", intensity: "hard" },
  { id: "cond-plank", discipline: "universal", name: "Plank Hold", description: "Hold a straight-arm or forearm plank", duration: "45s hold", intensity: "light" },
  { id: "cond-jumping-jacks", discipline: "universal", name: "Jumping Jacks", description: "Classic cardio warm-up — arms and legs spread on jump", duration: "40s on / 20s off", intensity: "light" },
  { id: "cond-star-jumps", discipline: "universal", name: "Star Jumps", description: "Explosive jump spreading arms and legs wide", duration: "20s on / 10s off", intensity: "hard" },
  // Boxing
  { id: "cond-box-shadow-sprint", discipline: "boxing", name: "Shadow Boxing Sprint", description: "Max speed 1-2 combos while bouncing on toes", duration: "30s on / 15s off", intensity: "hard" },
  { id: "cond-box-slip-rope", discipline: "boxing", name: "Slip Rope Drill", description: "Slip side to side under an imaginary rope while moving forward", duration: "40s on / 20s off", intensity: "medium" },
  { id: "cond-box-bob-weave", discipline: "boxing", name: "Bob & Weave Squats", description: "Deep squat + weave side to side, throw hook at each end", duration: "30s on / 15s off", intensity: "hard" },
  // Muay Thai
  { id: "cond-mt-knee-bombs", discipline: "muay_thai", name: "Knee Bomb Intervals", description: "Alternating knee strikes as fast as possible", duration: "30s on / 15s off", intensity: "hard" },
  { id: "cond-mt-teep-squats", discipline: "muay_thai", name: "Teep Squat Combos", description: "Squat + teep alternating legs each rep", duration: "40s on / 20s off", intensity: "medium" },
  { id: "cond-mt-clinch-pulls", discipline: "muay_thai", name: "Clinch Pull-Downs", description: "Simulate clinch pulling motion with explosive hip drive", duration: "30s on / 15s off", intensity: "medium" },
  // BJJ
  { id: "cond-bjj-shrimps", discipline: "bjj", name: "Speed Shrimps", description: "Hip escapes across the mat as fast as possible", duration: "30s on / 15s off", intensity: "medium" },
  { id: "cond-bjj-sprawl-shot", discipline: "bjj", name: "Sprawl → Shot Drill", description: "Sprawl flat, pop up, shoot a double leg — repeat", duration: "20s on / 10s off", intensity: "hard" },
  { id: "cond-bjj-guard-sit-ups", discipline: "bjj", name: "Guard Sit-Ups", description: "Sit up from guard position, simulate sweeping motion", duration: "30s on / 15s off", intensity: "medium" },
  // Karate / TKD
  { id: "cond-kar-kick-sprints", discipline: "karate", name: "Kick Sprint Intervals", description: "Alternate front kicks as fast as possible", duration: "30s on / 15s off", intensity: "hard" },
  { id: "cond-tkd-turning-drill", discipline: "taekwondo", name: "Turning Kick Ladder", description: "10 low, 10 mid, 10 high turning kicks each leg", duration: "45s per set", intensity: "hard" },
  // MMA
  { id: "cond-mma-sprawl-strike", discipline: "mma", name: "Sprawl → Strike", description: "Sprawl, pop up, throw a 1-2, repeat", duration: "30s on / 15s off", intensity: "hard" },
  { id: "cond-mma-cage-getups", discipline: "mma", name: "Wall Get-Ups", description: "Start on back against wall, technical stand-up, repeat", duration: "30s on / 15s off", intensity: "medium" },
];

export function getConditioningDrills(discipline: DisciplineId): ConditioningDrill[] {
  return CONDITIONING_DRILLS.filter(d => d.discipline === discipline || d.discipline === "universal");
}

// ── Sparring Concepts ──────────────────────────────────────

export type SparringConcept = {
  id: string;
  discipline: DisciplineId | "universal";
  name: string;
  concept: string;
  focus: string;
  tips: string[];
};

export const SPARRING_CONCEPTS: SparringConcept[] = [
  // Universal
  { id: "spar-breathe", discipline: "universal", name: "Controlled Breathing", concept: "Breathe out on every strike, never hold your breath", focus: "Cardio management", tips: ["Exhale sharply on every strike", "Nose-breathe during movement", "Reset breathing during clinch breaks"] },
  { id: "spar-range", discipline: "universal", name: "Range Control", concept: "Make your opponent fight at YOUR range — too close or too far for their best weapon", focus: "Distance management", tips: ["Step offline instead of straight back", "Use lead hand to measure distance", "Punish opponents who enter your range"] },
  { id: "spar-calm", discipline: "universal", name: "Stay Calm Under Fire", concept: "When you get hit, don't panic. Reset, breathe, answer with technique", focus: "Mental composure", tips: ["Take a deep breath after getting tagged", "Fire back with a clean combo immediately", "Don't chase — let them come to you"] },
  // Boxing
  { id: "spar-box-jab", discipline: "boxing", name: "Jab Dominance", concept: "Double and triple your jab — control the fight with volume", focus: "Jab control", tips: ["Jab to the body to bring guard down", "Double jab before throwing power", "Use jab to set up angles"] },
  { id: "spar-box-counter", discipline: "boxing", name: "Counter Fighting", concept: "Let them throw first, slip, then punish the opening", focus: "Counter punching", tips: ["Slip outside the jab, throw the cross", "Pull-counter: lean back from jab, fire cross", "Catch-and-shoot: catch jab, immediate hook"] },
  { id: "spar-box-angles", discipline: "boxing", name: "Fighting on Angles", concept: "Pivot after every combination — never stay on the centerline", focus: "Footwork", tips: ["Throw combo, pivot left", "Step to their lead foot side", "Use lateral movement, not just forward/back"] },
  // Muay Thai
  { id: "spar-mt-clinch-game", discipline: "muay_thai", name: "Clinch Entry", concept: "Close the distance with a combo, then enter the clinch", focus: "Clinch transitions", tips: ["1-2 into collar tie", "Swim for double underhooks", "Use knees immediately on entry"] },
  { id: "spar-mt-kick-check", discipline: "muay_thai", name: "Check & Return", concept: "Check every low kick and immediately return with your own", focus: "Kick defense", tips: ["Lift shin to check", "Fire roundhouse immediately after check", "Mix low kick returns with body kicks"] },
  { id: "spar-mt-long-guard", discipline: "muay_thai", name: "Long Guard Control", concept: "Use extended lead hand to frame and create angles for kicks", focus: "Range management", tips: ["Post lead hand on their shoulder", "Push off to create kicking range", "Teep when they try to close"] },
  // BJJ
  { id: "spar-bjj-guard-retention", discipline: "bjj", name: "Guard Retention", concept: "Never let them pass — hip movement is life", focus: "Guard defense", tips: ["Always face your opponent with your hips", "Frames before grips", "Shrimp early, not after they've passed"] },
  { id: "spar-bjj-position", discipline: "bjj", name: "Position Before Submission", concept: "Don't hunt submissions from bad positions — establish control first", focus: "Positional hierarchy", tips: ["Mount > Side control > Guard", "Stabilize position for 5 seconds before attacking", "If you lose position, re-establish guard first"] },
  { id: "spar-bjj-grip-fight", discipline: "bjj", name: "Grip Fighting", concept: "Whoever controls the grips controls the roll", focus: "Grip strategy", tips: ["Break their grips immediately", "Establish your grips first", "Collar + sleeve = offensive guard"] },
  // Karate
  { id: "spar-kar-distance", discipline: "karate", name: "One-Shot Distance", concept: "Stay just outside striking range, then explode in with one decisive technique", focus: "Distance and timing", tips: ["Bounce at the edge of range", "Use the stepping punch (oi-zuki) to close", "Retreat immediately after scoring"] },
  { id: "spar-kar-counter-punch", discipline: "karate", name: "Sen no Sen (Initiative)", concept: "Attack simultaneously as they attack — intercept their technique", focus: "Timing", tips: ["Read their hip motion for the attack", "Step offline and counter simultaneously", "Gyaku-zuki as they step forward"] },
  // TKD
  { id: "spar-tkd-cut-kick", discipline: "taekwondo", name: "Cut Kick Defense", concept: "Use a quick front kick to stop their roundhouse before it develops", focus: "Counter kicking", tips: ["Snap a fast front kick as they chamber", "Target the hip or thigh", "Immediately follow with your own kick"] },
  { id: "spar-tkd-scoring", discipline: "taekwondo", name: "Scoring Strategy", concept: "Speed scores — fast turning kicks to the body rack up points", focus: "Point fighting", tips: ["Double roundhouse to same target", "Feint low, kick high", "Back kick when they rush in"] },
  // MMA
  { id: "spar-mma-transitions", discipline: "mma", name: "Striking to Grappling", concept: "Use strikes to set up takedowns, use takedowns to land strikes", focus: "Transitions", tips: ["Jab-cross into a level change", "Sprawl into a front headlock", "Stand up from guard when striking is better"] },
  { id: "spar-mma-cage-aware", discipline: "mma", name: "Cage Awareness", concept: "Know where the cage is — use it as a weapon, don't get trapped", focus: "Cage fighting", tips: ["Circle off the cage before they close", "Use the cage for takedowns", "Keep your back off the fence"] },
];

export function getSparringConcepts(discipline: DisciplineId): SparringConcept[] {
  return SPARRING_CONCEPTS.filter(c => c.discipline === discipline || c.discipline === "universal");
}

// ── Shadowbox Prompts ──────────────────────────────────────

export type ShadowboxPrompt = {
  id: string;
  discipline: DisciplineId;
  name: string;
  scenario: string;
  comboSequence: string[];
  footworkCue: string;
  visualizationTip: string;
};

export const SHADOWBOX_PROMPTS: ShadowboxPrompt[] = [
  // Boxing
  { id: "shad-box-1", discipline: "boxing", name: "Jab & Move", scenario: "Opponent is walking you down", comboSequence: ["Jab", "Jab", "Pivot left"], footworkCue: "Circle right after doubling the jab", visualizationTip: "Imagine a pressure fighter coming forward — keep them at jab range" },
  { id: "shad-box-2", discipline: "boxing", name: "Counter Puncher", scenario: "Opponent throws first — you counter", comboSequence: ["Slip right", "Cross", "Hook", "Pivot out"], footworkCue: "Slip offline then plant for the counter", visualizationTip: "Visualize their jab coming — slip outside it and fire" },
  { id: "shad-box-3", discipline: "boxing", name: "Body Attack", scenario: "Break down their guard with body shots", comboSequence: ["Jab head", "Cross body", "Hook head", "Cross body"], footworkCue: "Level change with each body shot — bend the knees", visualizationTip: "See their elbows come down after the body shot — then go upstairs" },
  { id: "shad-box-4", discipline: "boxing", name: "Pressure & Exit", scenario: "Close distance, unload, then get out safely", comboSequence: ["Step in", "1-2-3-2", "Push off", "Circle away"], footworkCue: "Step in with the jab, exit at a 45° angle", visualizationTip: "Imagine landing the combo, then getting out before they fire back" },
  // Muay Thai
  { id: "shad-mt-1", discipline: "muay_thai", name: "Kick & Follow", scenario: "Open with a kick, then follow up", comboSequence: ["Lead low kick", "Cross", "Hook", "Rear roundhouse"], footworkCue: "Step at 45° with the low kick, plant for punches", visualizationTip: "See their lead leg buckle from the low kick — then attack the opening" },
  { id: "shad-mt-2", discipline: "muay_thai", name: "Clinch Destroyer", scenario: "Close range — enter clinch and work knees", comboSequence: ["1-2 to close", "Collar tie", "Knee", "Knee", "Elbow on exit"], footworkCue: "Step in tight off the cross, fight for inside position", visualizationTip: "Feel the collar tie grip — pull their head down and drive knees" },
  { id: "shad-mt-3", discipline: "muay_thai", name: "Teep Control", scenario: "Use teep to manage distance", comboSequence: ["Teep body", "Step back", "Roundhouse as they advance", "Teep again"], footworkCue: "Push off the teep to create space for the round kick", visualizationTip: "Push them back with the teep, then punish them for coming forward" },
  // BJJ
  { id: "shad-bjj-1", discipline: "bjj", name: "Guard Flow", scenario: "Shadow drill: hip escapes → guard recovery → sweep", comboSequence: ["Shrimp right", "Re-guard", "Collar grip", "Scissor sweep motion"], footworkCue: "Stay on your side — never go flat on your back", visualizationTip: "Imagine someone passing to side control — shrimp and recover guard" },
  { id: "shad-bjj-2", discipline: "bjj", name: "Stand-Up Grappling", scenario: "Takedown entries and level changes", comboSequence: ["Collar tie", "Snap down", "Level change", "Shot motion"], footworkCue: "Head position: always on the inside", visualizationTip: "See the opening for the double leg as their weight shifts forward" },
  // Karate
  { id: "shad-kar-1", discipline: "karate", name: "Kata Application", scenario: "Move through stances with strikes against an imaginary attacker", comboSequence: ["Step into zenkutsu-dachi", "Gedan barai", "Step forward", "Gyaku-zuki"], footworkCue: "Deep stances, strong center of gravity", visualizationTip: "See the attacker — block their low attack, then counter with reverse punch" },
  { id: "shad-kar-2", discipline: "karate", name: "Blitz Attack", scenario: "Explosive forward movement with attack", comboSequence: ["Slide step", "Oi-zuki", "Gyaku-zuki", "Mae geri"], footworkCue: "Explode from stillness — maximum acceleration", visualizationTip: "Imagine closing the gap in one explosive movement" },
  // TKD
  { id: "shad-tkd-1", discipline: "taekwondo", name: "Kick Combo Flow", scenario: "Continuous kicking without putting foot down", comboSequence: ["Front kick", "Roundhouse same leg", "Step through", "Turning kick other leg"], footworkCue: "Keep the kicking leg up between techniques", visualizationTip: "Imagine hitting pads at different heights without setting your foot down" },
  { id: "shad-tkd-2", discipline: "taekwondo", name: "Back Kick Counter", scenario: "They rush in — you spin and counter", comboSequence: ["Step back", "Spin", "Back kick", "Follow with roundhouse"], footworkCue: "Tight spin — look first, then kick", visualizationTip: "See them charging in — time the spin to catch them coming forward" },
  // MMA
  { id: "shad-mma-1", discipline: "mma", name: "MMA Range Flow", scenario: "Transition between striking and grappling ranges", comboSequence: ["Jab-cross", "Level change", "Double leg motion", "Stand up", "Knee", "Circle out"], footworkCue: "Seamless transition — don't telegraph the level change", visualizationTip: "Imagine flowing between striking and wrestling as openings appear" },
];

export function getShadowboxPrompts(discipline: DisciplineId): ShadowboxPrompt[] {
  return SHADOWBOX_PROMPTS.filter(p => p.discipline === discipline);
}

// ── Bag Work Power Combos ──────────────────────────────────

export type BagWorkCombo = {
  id: string;
  discipline: DisciplineId;
  name: string;
  sequence: string[];
  intensityCue: string;
  powerTip: string;
  targetArea: string;
};

export const BAG_WORK_COMBOS: BagWorkCombo[] = [
  // Boxing
  { id: "bag-box-1", discipline: "boxing", name: "Power 1-2", sequence: ["Jab (snap)", "Cross (POWER)"], intensityCue: "80% power — snap the jab, drive through on the cross", powerTip: "Rotate your whole body into the cross — feel it from your back foot", targetArea: "Head level" },
  { id: "bag-box-2", discipline: "boxing", name: "Hook Destroyer", sequence: ["Jab", "Cross", "Lead Hook (POWER)", "Rear Hook"], intensityCue: "Hook is the money shot — sit down on it", powerTip: "Turn your lead foot, drive from the hip — short and compact", targetArea: "Head level" },
  { id: "bag-box-3", discipline: "boxing", name: "Body Breakdown", sequence: ["Jab head", "Cross body (POWER)", "Hook body (POWER)", "Uppercut"], intensityCue: "DIG those body shots — make the bag fold", powerTip: "Bend your knees for body shots, don't just lean down", targetArea: "Body level" },
  { id: "bag-box-4", discipline: "boxing", name: "Uppercut Express", sequence: ["Jab", "Lead Uppercut (POWER)", "Cross", "Rear Uppercut (POWER)"], intensityCue: "Drive UP through the bag — feel your legs", powerTip: "Short compact uppercuts — power from the ground up", targetArea: "Chin level" },
  // Muay Thai
  { id: "bag-mt-1", discipline: "muay_thai", name: "Kick Heavy", sequence: ["Jab", "Cross", "Rear Roundhouse (POWER)"], intensityCue: "SMASH through the bag — kick through it, not at it", powerTip: "Swing your arm down on the same side as the kick for extra torque", targetArea: "Body/leg level" },
  { id: "bag-mt-2", discipline: "muay_thai", name: "Low Kick Chop", sequence: ["Jab", "Low kick (POWER)", "Cross", "Low kick (POWER)"], intensityCue: "Chop the base — imagine cutting down a tree", powerTip: "Step at 45° and drive through the target with your shin", targetArea: "Low leg" },
  { id: "bag-mt-3", discipline: "muay_thai", name: "Elbow Assault", sequence: ["1-2 to close", "Horizontal elbow (POWER)", "Uppercut elbow", "Knee (POWER)"], intensityCue: "CLOSE RANGE WARFARE — get right on the bag", powerTip: "Elbows are your sharpest weapons — snap them through", targetArea: "Head level close range" },
  { id: "bag-mt-4", discipline: "muay_thai", name: "Knee & Clinch", sequence: ["Clinch the bag", "Straight knee (POWER)", "Knee other side (POWER)", "Push away", "Roundhouse (POWER)"], intensityCue: "PULL the bag into your knees — aggressive clinch", powerTip: "Pull with your arms, drive with your hips at the same time", targetArea: "Body clinch range" },
  // Karate
  { id: "bag-kar-1", discipline: "karate", name: "Reverse Punch Power", sequence: ["Step in", "Gyaku-zuki (POWER)", "Step back", "Mae geri (POWER)"], intensityCue: "ONE shot, FULL power — reset and repeat", powerTip: "Lock out the rear hip completely on the reverse punch", targetArea: "Center body" },
  // TKD
  { id: "bag-tkd-1", discipline: "taekwondo", name: "Kick Combo Power", sequence: ["Roundhouse body (POWER)", "Step", "Roundhouse head (POWER)"], intensityCue: "Full turnover on BOTH kicks — chamber high", powerTip: "Use your hip as the engine — the leg is just the whip", targetArea: "Body then head" },
  { id: "bag-tkd-2", discipline: "taekwondo", name: "Side Kick Thrust", sequence: ["Chamber high", "Side kick (POWER)", "Step through", "Back kick (POWER)"], intensityCue: "DRIVE through the bag — push it back", powerTip: "Lock out the hip on side kick, look first on back kick", targetArea: "Center body" },
  // MMA
  { id: "bag-mma-1", discipline: "mma", name: "Ground & Pound Sim", sequence: ["1-2 into bag", "Clinch", "Knee (POWER)", "Dirty boxing hooks"], intensityCue: "Cage-style dirty boxing — stay tight to the bag", powerTip: "Short, compact shots — power from core rotation", targetArea: "Mixed range" },
];

export function getBagWorkCombos(discipline: DisciplineId): BagWorkCombo[] {
  return BAG_WORK_COMBOS.filter(c => c.discipline === discipline);
}

// ── Kata / Form Sequences ──────────────────────────────────

export type KataSequence = {
  id: string;
  discipline: DisciplineId;
  name: string;
  meaning: string;
  movements: number;
  steps: string[];
  breathingCue: string;
  difficulty: Difficulty;
};

export const KATA_SEQUENCES: KataSequence[] = [
  // Karate
  { id: "kata-heian1", discipline: "karate", name: "Heian Shodan", meaning: "Peaceful Mind 1", movements: 21, difficulty: "beginner",
    steps: ["Bow. Turn left → gedan barai in zenkutsu-dachi", "Step forward → oi-zuki (middle)", "Turn 180° right → gedan barai", "Step forward → oi-zuki", "Step forward → oi-zuki", "Step forward → oi-zuki — KIAI", "Turn 90° left → gedan barai", "Step forward → age uke", "Turn 180° right → gedan barai", "Step forward → age uke", "Step forward → age uke — KIAI", "Return to yoi. Bow."],
    breathingCue: "Sharp exhale on each block and strike. KIAI loud on movements 9 and 17." },
  { id: "kata-heian2", discipline: "karate", name: "Heian Nidan", meaning: "Peaceful Mind 2", movements: 26, difficulty: "beginner",
    steps: ["Bow. Turn left → uchi uke in kokutsu-dachi", "Front kick → gyaku-zuki", "Turn 180° right → uchi uke", "Front kick → gyaku-zuki", "Step forward → morote uke — KIAI", "Turn 90° left → gedan barai", "Mae geri → oi-zuki → gyaku-zuki", "Turn 180° → gedan barai", "Mae geri → oi-zuki → gyaku-zuki — KIAI", "Return to yoi. Bow."],
    breathingCue: "Flowing exhales through combination sequences. KIAI on the final technique of each half." },
  { id: "kata-heian3", discipline: "karate", name: "Heian Sandan", meaning: "Peaceful Mind 3", movements: 20, difficulty: "intermediate",
    steps: ["Bow. Turn left → uchi uke in kokutsu-dachi", "Step forward → uchi uke", "Step forward → uchi uke", "Turn 180° → uchi uke", "Step forward → uchi uke", "Step forward → uchi uke — KIAI", "Turn 90° left → middle block in back stance", "Empi (elbow) → uraken (backfist)", "Turn 180° → repeat sequence — KIAI", "Return to yoi. Bow."],
    breathingCue: "Quick exhales on each block. Build intensity toward the elbow-backfist combinations." },
  // Taekwondo
  { id: "kata-taegeuk1", discipline: "taekwondo", name: "Taegeuk Il Jang", meaning: "Heaven and Light (Keon)", movements: 18, difficulty: "beginner",
    steps: ["Charyeot, kyeong-rye (bow)", "Turn left → arae makki (low block) in ap-seogi", "Step forward → momtong jireugi (middle punch)", "Turn 180° right → arae makki", "Step forward → momtong jireugi", "Turn 90° left → arae makki", "Step forward → ap chagi (front kick) → momtong jireugi", "Turn 180° → arae makki", "Step forward → ap chagi → momtong jireugi", "Turn 90° → arae makki, step, middle punch, step, middle punch — KIHAP", "Baro (return). Bow."],
    breathingCue: "Exhale on each block and punch. KIHAP (shout) on the final punch." },
  { id: "kata-taegeuk2", discipline: "taekwondo", name: "Taegeuk Ee Jang", meaning: "Joyfulness (Tae)", movements: 18, difficulty: "beginner",
    steps: ["Bow", "Turn left → arae makki", "Step forward → ap chagi → momtong jireugi", "Turn 180° → arae makki", "Step forward → ap chagi → momtong jireugi", "Turn 90° → momtong makki (middle block)", "Step forward → ap chagi → arae makki", "Turn 180° → momtong makki", "Step forward → ap chagi → arae makki — KIHAP", "Baro. Bow."],
    breathingCue: "Smooth transitions between blocks and kicks. KIHAP on the final technique." },
  // MMA / Karate additional
  { id: "kata-bassai-dai", discipline: "karate", name: "Bassai Dai", meaning: "Storming a Fortress", movements: 42, difficulty: "advanced",
    steps: ["Bow. Hands together in center", "Explosive turn left → uchi uke / gedan barai combo", "Three advancing soto uke blocks with power", "Pull into kosa-dachi (cross stance)", "Open-hand blocks in kokutsu-dachi", "Manji uke (double block) patterns", "Sweeping crescent kick into shuto uke", "Final advancing shuto sequences — KIAI", "Return to center. Bow."],
    breathingCue: "The opening move is explosive — kime (focus) at every technique. This kata teaches power through decisive movement." },
];

export function getKataSequences(discipline: DisciplineId): KataSequence[] {
  return KATA_SEQUENCES.filter(k => k.discipline === discipline);
}

// ── Flow Roll Drills ───────────────────────────────────────

export type FlowDrill = {
  id: string;
  discipline: DisciplineId;
  name: string;
  concept: string;
  focus: string;
  rules: string[];
};

export const FLOW_DRILLS: FlowDrill[] = [
  { id: "flow-positional", discipline: "bjj", name: "Positional Sparring: Guard", concept: "Start in closed guard — top person passes, bottom person sweeps or submits", focus: "Guard game", rules: ["Start in closed guard", "Bottom: sweep or submit to win", "Top: pass guard to win", "Reset on score, switch roles every 2 rounds"] },
  { id: "flow-mount-escape", discipline: "bjj", name: "Positional: Mount Escape", concept: "Start in mount — top person submits, bottom person escapes", focus: "Mount control/escape", rules: ["Start in full mount", "Bottom: escape to guard or standing", "Top: submit or maintain position", "30% intensity — focus on technique"] },
  { id: "flow-back-attack", discipline: "bjj", name: "Positional: Back Control", concept: "Start with back taken — attacker hunts submissions, defender escapes", focus: "Back attacks/defense", rules: ["Start with seatbelt + hooks", "Attacker: submit with RNC or armbar", "Defender: escape back to guard", "Alternate roles every 90 seconds"] },
  { id: "flow-chain", discipline: "bjj", name: "Submission Chain Flow", concept: "Flow between submissions without finishing — practice the transitions", focus: "Submission chains", rules: ["Set up armbar from guard", "When they defend, transition to triangle", "When they defend triangle, go to omoplata", "Never force a finish — flow to the next attack"] },
  { id: "flow-takedown", discipline: "bjj", name: "Takedown Flow", concept: "Light standup work — entries and reactions without slamming", focus: "Takedown entries", rules: ["Start standing, collar ties only", "Go for entries at 30% speed", "Partner reads and reacts", "On successful entry, reset standing"] },
  { id: "flow-scramble", discipline: "bjj", name: "Scramble Rounds", concept: "Start from knees — whoever gets top position first works to submit", focus: "Scrambling ability", rules: ["Both start from knees", "Race to establish top position", "Once position is established, work for submission", "Reset on submission or stalemate after 60 seconds"] },
  // Wrestling / MMA flow drills
  { id: "flow-wrestling", discipline: "mma", name: "Wrestling Flow", concept: "Takedown entries and defensive chains at 50% speed", focus: "MMA wrestling", rules: ["Start in collar tie", "Work single/double leg entries", "Defender sprawls and re-wrestles", "Stay on feet — no ground work"] },
];

export function getFlowDrills(discipline: DisciplineId): FlowDrill[] {
  if (discipline === "wrestling" || discipline === "judo") {
    return FLOW_DRILLS.filter(d => d.discipline === "bjj" || d.discipline === discipline || d.discipline === "mma");
  }
  return FLOW_DRILLS.filter(d => d.discipline === discipline || (discipline === "mma" && d.discipline === "bjj"));
}

// ── XP Calculation ──────────────────────────────────────────

const BASE_XP: Record<string, number> = {
  technique: 15,
  pad_work: 20,
  bag_work: 20,
  shadowbox: 15,
  sparring: 30,
  flow_roll: 20,
  conditioning: 15,
  kata: 25,
  mixed: 18,
};

export function calculateSessionXp(params: {
  sessionType: SessionType;
  totalRounds: number;
  intensity: "light" | "medium" | "hard";
  durationMinutes: number;
  newTechniquesCount: number;
  currentStreak: number;
}): number {
  const { sessionType, totalRounds, intensity, durationMinutes, newTechniquesCount, currentStreak } = params;
  let xp = (BASE_XP[sessionType] ?? 15) * Math.max(1, totalRounds);

  if (intensity === "hard") xp *= 1.3;
  if (durationMinutes > 60) xp *= 1.2;
  if (currentStreak >= 3) xp *= 1.1;

  xp += newTechniquesCount * 10;

  return Math.min(300, Math.round(xp));
}

// ── Mastery Level ───────────────────────────────────────────

export type MasteryLevel = 0 | 1 | 2 | 3 | 4 | 5;
export const MASTERY_LABELS: Record<MasteryLevel, string> = {
  0: "Unknown",
  1: "Exposed",
  2: "Practiced",
  3: "Proficient",
  4: "Mastered",
  5: "Expert",
};

export function getMasteryLevel(timesPracticed: number, avgQuality: number, formCheckPassed: boolean, usedInSparring: boolean): MasteryLevel {
  if (timesPracticed >= 100 && avgQuality >= 4.5 && usedInSparring) return 5;
  if (timesPracticed >= 50 && avgQuality >= 4.5 && formCheckPassed) return 4;
  if (timesPracticed >= 21 && avgQuality >= 4) return 3;
  if (timesPracticed >= 6 && avgQuality >= 3) return 2;
  if (timesPracticed >= 1) return 1;
  return 0;
}

// ── Style DNA ───────────────────────────────────────────────

export type StyleDna =
  | "Pressure Fighter" | "Counter Striker" | "Guard Player"
  | "Scrambler" | "Technician" | "Well-Rounded" | "Traditionalist";

export function computeStyleDna(sessions: { sessionType: SessionType; discipline: DisciplineId }[]): StyleDna | null {
  if (sessions.length < 10) return null;

  let striking = 0, grappling = 0, forms = 0, conditioning = 0;
  let padBag = 0, defensive = 0, takedownTransition = 0;

  for (const s of sessions) {
    const disc = DISCIPLINES[s.discipline];
    if (!disc) continue;

    if (disc.category === "striking" || s.sessionType === "pad_work" || s.sessionType === "bag_work" || s.sessionType === "shadowbox") striking++;
    if (disc.category === "grappling" || s.sessionType === "flow_roll") grappling++;
    if (s.sessionType === "kata") forms++;
    if (s.sessionType === "conditioning") conditioning++;
    if (s.sessionType === "pad_work" || s.sessionType === "bag_work") padBag++;
    if (s.sessionType === "sparring" && disc.category === "grappling") takedownTransition++;
  }

  const total = sessions.length;
  if (forms / total > 0.35) return "Traditionalist";
  if (grappling / total > 0.5 && takedownTransition / grappling > 0.4) return "Scrambler";
  if (grappling / total > 0.5) return "Guard Player";
  if (padBag / total > 0.4) return "Pressure Fighter";
  if (defensive / total > 0.3) return "Counter Striker";

  const spread = Math.abs(striking - grappling) / total;
  if (spread < 0.15) return "Well-Rounded";

  const uniqueTypes = new Set(sessions.map(s => s.sessionType)).size;
  if (uniqueTypes >= 5) return "Technician";

  if (striking > grappling) return "Pressure Fighter";
  return "Guard Player";
}

// ── 10K Hour Milestones ─────────────────────────────────────

export const HOUR_MILESTONES = [
  { hours: 10,    label: "First Steps",         xpReward: 50 },
  { hours: 50,    label: "Dedicated Student",    xpReward: 100 },
  { hours: 100,   label: "Committed Practitioner", xpReward: 200 },
  { hours: 250,   label: "Seasoned Fighter",     xpReward: 300 },
  { hours: 500,   label: "Half-Way Warrior",     xpReward: 500 },
  { hours: 1000,  label: "Thousand-Hour Club",   xpReward: 750 },
  { hours: 2500,  label: "Living Encyclopedia",  xpReward: 1000 },
  { hours: 5000,  label: "Master's Path",        xpReward: 1500 },
  { hours: 10000, label: "Grand Master",         xpReward: 3000 },
];

export function getNextMilestone(totalHours: number) {
  return HOUR_MILESTONES.find(m => m.hours > totalHours) ?? null;
}

export function getMilestoneProgress(totalHours: number) {
  const next = getNextMilestone(totalHours);
  if (!next) return { progress: 1, current: totalHours, target: 10000, label: "Grand Master" };
  const prev = HOUR_MILESTONES.filter(m => m.hours <= totalHours).pop();
  const prevHours = prev?.hours ?? 0;
  return {
    progress: (totalHours - prevHours) / (next.hours - prevHours),
    current: totalHours,
    target: next.hours,
    label: next.label,
  };
}

// ── Warm-up / Cool-down Routines ────────────────────────────

export const WARMUPS: Partial<Record<DisciplineId, string[]>> = {
  boxing: ["Shoulder circles (30s each)", "Neck rolls (20s each)", "Jump rope (3 min)", "Arm swings (30s)", "Shadow jab-cross (2 min)"],
  muay_thai: ["Hip openers (1 min)", "Knee raises (30s each)", "Thai skip (2 min)", "Clinch entry drills (1 min)", "Light teeps (1 min)"],
  bjj: ["Hip escapes (10 each side)", "Guard recovery drills (1 min)", "Neck bridges (30s)", "Granby rolls (5 each)", "Shrimping (length of mat)"],
  wrestling: ["Sprawls (10 reps)", "Level changes (10 reps)", "Duck walks (1 min)", "Penetration steps (10 each)", "Neck circles (30s)"],
  karate: ["Joint rotations (2 min)", "Dynamic stretches (2 min)", "Basic blocks in sequence (1 min)", "Stance transitions (1 min)"],
  taekwondo: ["Leg swings (20 each)", "High knee marches (1 min)", "Light front kicks (10 each)", "Turning kick warm-up (10 each)"],
  mma: ["Jump rope (3 min)", "Hip openers (1 min)", "Sprawl-to-shot (10 reps)", "Shadow combo (2 min)", "Light movement drills (2 min)"],
};

export const COOLDOWNS: Record<string, string[]> = {
  striking: ["Wrist/forearm stretch (30s each)", "Shoulder stretch (30s each)", "Hip flexor stretch (30s each)", "Neck release (20s each)"],
  grappling: ["Neck stretch (30s each)", "Back decompression (1 min)", "Hip openers (1 min each)", "Grip release stretch (30s)", "Spine twist (30s each)"],
  kicks: ["Hamstring stretch (30s each)", "Hip flexor stretch (30s each)", "Quad stretch (30s each)", "Calf release (20s each)", "Ankle circles (20s)"],
  forms: ["Forward fold (30s)", "Cobra stretch (30s)", "Child's pose (30s)", "Standing side stretch (30s each)"],
};

export function getCooldownType(sessionType: SessionType, discipline: DisciplineId): string {
  if (sessionType === "kata") return "forms";
  const info = DISCIPLINES[discipline];
  if (!info) return "striking";
  if (info.category === "grappling") return "grappling";
  if (sessionType === "pad_work" || sessionType === "bag_work") {
    if (discipline === "muay_thai" || discipline === "kickboxing" || discipline === "taekwondo") return "kicks";
    return "striking";
  }
  return "striking";
}

// ── Round Timer Presets ─────────────────────────────────────

export const ROUND_PRESETS: Record<string, { roundSec: number; restSec: number; label: string }> = {
  boxing_standard:  { roundSec: 180, restSec: 60,  label: "Boxing (3min/1min)" },
  boxing_amateur:   { roundSec: 120, restSec: 60,  label: "Amateur Boxing (2min/1min)" },
  muay_thai:        { roundSec: 180, restSec: 120, label: "Muay Thai (3min/2min)" },
  mma_pro:          { roundSec: 300, restSec: 60,  label: "MMA Pro (5min/1min)" },
  bjj_match:        { roundSec: 300, restSec: 0,   label: "BJJ Match (5min continuous)" },
  bjj_roll:         { roundSec: 360, restSec: 60,  label: "BJJ Roll (6min/1min)" },
  tabata:           { roundSec: 20,  restSec: 10,  label: "Tabata (20s/10s)" },
  custom:           { roundSec: 180, restSec: 60,  label: "Custom" },
};

// ── Discipline Origin Stories ──────────────────────────────

export const DISCIPLINE_ORIGINS: Partial<Record<DisciplineId, DisciplineOrigin>> = {
  boxing: {
    tagline: "The Sweet Science",
    founded: "~688 BC (ancient Greece), modern rules 1867",
    origin: "Ancient Greece, formalized in England",
    philosophy: "Economy of motion, timing over power. Every punch has a purpose — waste nothing.",
    story: "Boxing is one of humanity's oldest combat sports, depicted in Sumerian relief carvings from the 3rd millennium BC and included in the ancient Olympic Games from 688 BC. The modern sport took shape in 18th-century England when Jack Broughton introduced the first rules in 1743 to reduce fatalities. The Marquess of Queensberry rules (1867) established the three-minute round, ten-count knockdowns, and mandatory gloves — the foundation of boxing as we know it. From Muhammad Ali's footwork to Mike Tyson's peek-a-boo style, boxing has continuously evolved while keeping its core elegance: two fighters, two fists, infinite possibilities.",
    keyFigures: [
      { name: "Jack Broughton", role: "Father of modern boxing rules", bio: "Champion bare-knuckle fighter in 1730s London who held the English title for 18 years (1734–1750). After accidentally killing opponent George Stevenson in 1741, he wrote the first set of rules in 1743: the 30-second count, no hitting below the belt, no striking a downed man. He also invented the first boxing gloves ('mufflers') for training. Called the 'Father of English Boxing,' his rules governed the sport for nearly a century until the Queensberry rules replaced them.", imageUrl: "/ma/figures/fig-boxing-broughton.jpg" },
      { name: "Muhammad Ali", role: "Greatest heavyweight, 3x world champion", bio: "Born Cassius Marcellus Clay Jr. in Louisville, Kentucky, 1942. Won Olympic light-heavyweight gold at age 18. Defeated Sonny Liston at 22 to become the youngest heavyweight champion. Stripped of his title for refusing the Vietnam draft, he returned to beat Joe Frazier and George Foreman in two of the greatest fights ever — the 'Thrilla in Manila' and 'Rumble in the Jungle.' Three-time world heavyweight champion with a 56-5 record (37 KOs). Named 'Sportsman of the Century' by Sports Illustrated and BBC. His 'float like a butterfly, sting like a bee' footwork revolutionized how heavyweights move.", imageUrl: "/ma/figures/fig-boxing-ali.jpg" },
      { name: "Sugar Ray Robinson", role: "Pound-for-pound greatest of all time", bio: "Born Walker Smith Jr. in Detroit, 1921. Turned pro at 19 and went 91-0 before his first loss. Won the welterweight title in 1946, then the middleweight title — which he won and lost five times over his career. Final record: 175-19-6 with 109 KOs across 200 professional fights. His speed, combinations, and footwork were so far ahead of his era that he remains the benchmark — when experts say 'pound-for-pound best,' they measure against Robinson. Ali himself said: 'Robinson was the king, the master, my idol.'", imageUrl: "/ma/figures/fig-boxing-robinson.jpg" },
    ],
    eras: [
      { period: "688 BC", title: "Ancient Origins", description: "Boxing appears in the ancient Olympic Games. Fighters wrapped leather thongs (himantes) around bare fists — no rounds, no weight classes, fights continued until one man couldn't.", imageUrl: "/ma/history/boxing-ancient.jpg" },
      { period: "1681", title: "Bare-Knuckle Era", description: "The first recorded boxing match in England. Prize-fighting spread through London, with champions like James Figg drawing crowds of thousands to outdoor bouts.", imageUrl: "/ma/history/boxing-bareknuckle.jpg" },
      { period: "1743", title: "Broughton's Rules", description: "After killing an opponent, champion Jack Broughton wrote the first rules: a 30-second count, no hitting below the belt, no striking a downed man. Boxing became sport, not brawl." },
      { period: "1867", title: "The Queensberry Era", description: "The Marquess of Queensberry rules introduced padded gloves, three-minute rounds, the 10-count, and weight classes — the foundation of modern boxing." },
      { period: "1960s", title: "The Ali Revolution", description: "Muhammad Ali brought speed, showmanship, and political courage to the heavyweight division. His trilogy with Joe Frazier and 'Rumble in the Jungle' against Foreman became the most iconic fights in history." },
      { period: "Today", title: "The Modern Ring", description: "From Floyd Mayweather's defensive mastery to Canelo Álvarez's power, boxing remains a global phenomenon with over 500 million fans worldwide." },
    ],
    funFact: "A professional boxer's punch can generate over 700 pounds of force — roughly the same as being hit by a bowling ball at 20 mph.",
  },
  muay_thai: {
    tagline: "The Art of Eight Limbs",
    founded: "~16th century",
    origin: "Thailand (Siam)",
    philosophy: "Use every weapon the body offers. Respect the Wai Kru — honor your teacher, your art, your opponent.",
    story: "Born on the battlefields of ancient Siam, Muay Thai evolved from Muay Boran, the combat system of Thai warriors. When swords were lost, soldiers fought with fists, elbows, knees, and shins — the eight limbs. The legendary Nai Khanomtom, captured by the Burmese in 1774, defeated ten consecutive Burmese champions to win his freedom, earning the title 'Father of Muay Thai.' For centuries, fights were held at temple fairs with hemp rope wrapping the hands. Modern Muay Thai, with gloves and timed rounds, emerged in the 1920s. The Wai Kru Ram Muay dance performed before each fight connects every modern fighter to centuries of warrior tradition.",
    keyFigures: [
      { name: "Nai Khanomtom", role: "Legendary warrior, Father of Muay Thai", bio: "A Siamese soldier and boxer captured when the Burmese army sacked Ayutthaya in 1767, destroying the Thai capital. In 1774, during a Burmese festival, King Hsinbyushin ordered him to fight Burmese champions. He defeated 10 in succession without rest, using the devastating elbow, knee, and clinch techniques of Muay Boran. The Burmese king reportedly said: 'Every part of the Thai is blessed with venom — even with his bare hands, he can fell nine or ten opponents.' He was granted his freedom and returned to Siam a hero. March 17 is celebrated as National Muay Thai Day in his honor.", imageUrl: "/ma/figures/fig-muaythai-khanomtom.jpg" },
      { name: "Samart Payakaroon", role: "Greatest Nak Muay of all time", bio: "Born in Chachoengsao Province, 1962. Four-time Lumpinee Stadium champion across four different weight classes — a record no one has matched. Held the WBC boxing super-bantamweight world title in 1981. Known for his virtually unhittable style: a feinting genius who made opponents miss by centimeters, then countered with devastating precision. His teep (push kick) is considered the greatest in Muay Thai history. Named #1 greatest Muay Thai fighter of all time by virtually every ranking. Also a successful musician and actor in Thailand.", imageUrl: "/ma/figures/fig-muaythai-samart.jpg" },
      { name: "Buakaw Banchamek", role: "International Muay Thai icon", bio: "Born Sombat Banchamek in Surin Province, 1982. Started training at age 8 at a rural gym. Won the K-1 World MAX (70kg) championship twice (2004, 2006), becoming the first Thai fighter to dominate international kickboxing. Over 300 professional fights with 240+ wins. His walk-forward pressure, blistering leg kicks, and highlight-reel KOs made him the most recognized Muay Thai fighter outside Thailand. Founded his own gym, Banchamek Gym, and continues to compete into his 40s.", imageUrl: "/ma/figures/fig-muaythai-buakaw.jpg" },
    ],
    eras: [
      { period: "13th C", title: "Muay Boran Origins", description: "Siamese warriors developed 'ancient boxing' — a battlefield art using fists, elbows, knees, and shins as weapons when swords were lost. Techniques were passed from soldier to soldier." },
      { period: "1774", title: "Nai Khanomtom's Legend", description: "Captured by Burma, a Thai soldier defeated 10 champions in a row using Muay Boran. His victory became the founding myth of Muay Thai and is celebrated every March 17." },
      { period: "1920s", title: "Modern Rules Born", description: "Thailand adopted timed rounds, weight classes, and boxing gloves. Rajadamnern (1945) and Lumpinee (1956) stadiums became the twin cathedrals of the sport." },
      { period: "1990s", title: "K-1 & Global Expansion", description: "Thai fighters entered international kickboxing circuits. Muay Thai's devastating clinch, elbow, and knee techniques proved dominant against other striking styles." },
      { period: "Today", title: "Global Combat Sport", description: "From Bangkok stadiums to MMA gyms worldwide, Muay Thai is the striking foundation every serious fighter learns. ONE Championship Muay Thai draws millions of viewers.", imageUrl: "/ma/history/muay-thai-stadium.jpg" },
    ],
    funFact: "A Muay Thai shin kick can deliver the same force as a baseball bat swing — around 480 lbs of force.",
  },
  bjj: {
    tagline: "The Gentle Art",
    founded: "1925 (formalized)",
    origin: "Brazil, from Japanese Judo roots",
    philosophy: "Leverage conquers strength. Position before submission — patience and technique defeat size.",
    story: "In 1914, Japanese judoka Mitsuyo Maeda emigrated to Brazil and began teaching the Gracie family. Carlos Gracie opened the first academy in 1925, but it was his smaller brother Hélio who transformed the art — unable to execute judo's explosive throws due to his slight build, he adapted ground techniques that let a smaller person control and submit larger opponents through leverage and patience. The Gracie family proved their system in no-holds-barred 'Vale Tudo' challenges for decades. When Royce Gracie won UFC 1 in 1993 — defeating wrestlers, boxers, and karate masters despite being the lightest fighter — BJJ's effectiveness was proven to the world. Today it's the foundation of every MMA fighter's ground game.",
    keyFigures: [
      { name: "Hélio Gracie", role: "Co-founder of Brazilian Jiu-Jitsu", bio: "Born in Belém, Brazil, 1913 — the youngest and smallest of five brothers. At 135 lbs, he was deemed too frail for judo's explosive throws. Instead, he modified every technique to rely on leverage, timing, and patience from the guard position. Created the closed guard, refined the triangle choke, and developed the philosophy that a smaller person could defeat a larger one through technique alone. Fought professionally until age 43, including a legendary match against judoka Masahiko Kimura (who outweighed him by 80 lbs). Earned the BJJ 10th-degree red belt — the art's highest rank. Died in 2009 at 95, still active on the mats. His philosophy: 'Always assume your opponent is bigger and stronger.'", imageUrl: "/ma/figures/fig-bjj-helio.jpg" },
      { name: "Royce Gracie", role: "UFC 1-2-4 champion, proved BJJ works", bio: "Born in Rio de Janeiro, 1966 — Hélio's sixth son. Chosen for UFC 1 specifically because he was the lightest Gracie at 176 lbs, to prove that technique beats size. Won UFC 1 (Nov 1993), UFC 2 (Mar 1994), and UFC 4 (Dec 1994), submitting boxers, wrestlers, shoot fighters, and karate masters — some outweighing him by 80+ pounds. His signature rear-naked choke and triangle choke became iconic. Inducted into the UFC Hall of Fame in 2003. His victories didn't just prove BJJ — they launched the entire modern MMA revolution and caused BJJ enrollment to explode worldwide.", imageUrl: "/ma/figures/fig-bjj-royce.jpg" },
      { name: "Mitsuyo Maeda", role: "Judoka who brought the art to Brazil", bio: "Born in Aomori, Japan, 1878. A top Kodokan judo student who left Japan in 1904 to spread judo worldwide. Fought over 1,000 challenge matches across the Americas and Europe against boxers, wrestlers, and savate fighters — reportedly never losing. Earned the nickname 'Count Koma' (Count of Combat). Settled in Belém, Brazil in 1914 and began teaching Carlos Gracie, the oldest Gracie brother, planting the seed that would grow into BJJ. Without Maeda's journey, the Gracie family would never have learned judo — and BJJ would not exist.", imageUrl: "/ma/figures/fig-bjj-maeda.jpg" },
    ],
    eras: [
      { period: "1882", title: "Judo's Birth in Japan", description: "Jigoro Kano founded Kodokan Judo, distilling the deadliest techniques of classical jujutsu into a modern system. His students would carry the art worldwide.", imageUrl: "/ma/history/bjj-kano.jpg" },
      { period: "1914", title: "Maeda Arrives in Brazil", description: "Judoka Mitsuyo Maeda emigrated to Belém, Brazil after fighting over 1,000 challenge matches worldwide. He began teaching Gastão Gracie's sons, including Carlos." },
      { period: "1925", title: "The Gracie Academy", description: "Carlos Gracie opened the first academy in Rio de Janeiro. His brother Hélio, too frail for judo throws, adapted everything for the ground — leverage over strength became the core principle.", imageUrl: "/ma/history/bjj-gracie.jpg" },
      { period: "1970s", title: "Vale Tudo Challenges", description: "The Gracies issued open challenges to fighters of all styles in no-holds-barred 'Vale Tudo' (anything goes) matches across Brazil, proving their system against strikers, wrestlers, and judoka." },
      { period: "1993", title: "UFC 1 Changes Everything", description: "Royce Gracie won the first UFC tournament, submitting fighters twice his size. The world saw a 176-lb man in a gi dominate — BJJ enrollment exploded globally." },
      { period: "Today", title: "The Gentle Art Worldwide", description: "BJJ is now practiced on every continent. The IBJJF World Championships, ADCC, and gi/no-gi competitions draw thousands. Every MMA fighter's ground game starts with BJJ." },
    ],
    funFact: "BJJ has over 600 documented techniques. A black belt typically takes 8–12 years to earn — one of the longest paths in any martial art.",
  },
  karate: {
    tagline: "The Way of the Empty Hand",
    founded: "~17th century, formalized 1920s",
    origin: "Okinawa, Japan (from Chinese martial arts roots)",
    philosophy: "Karate ni sente nashi — there is no first attack in karate. The art is for defense of self and others.",
    story: "Karate was born in Okinawa when Japan's Satsuma clan banned weapons in the 17th century. The Okinawan people secretly developed empty-hand combat techniques blending indigenous 'te' with Chinese kung fu brought by traders. The art was passed down in secrecy for generations. Gichin Funakoshi introduced karate to mainland Japan in 1922, demonstrating at the Kodokan judo hall. He stripped away the Chinese names and systematized the art into what became Shotokan. The 'kata' — choreographed sequences of techniques — are living textbooks, encoding centuries of fighting wisdom. Each movement in a kata represents a proven combat solution discovered by masters who tested them in real encounters.",
    keyFigures: [
      { name: "Gichin Funakoshi", role: "Father of modern karate, Shotokan founder", bio: "Born in Okinawa, 1868 — a sickly child who took up karate to strengthen his body. Became a schoolteacher and spent decades training under the two greatest Okinawan masters: Anko Itosu and Anko Azato. In 1922, he demonstrated karate at the Kodokan judo hall in Tokyo, mesmerizing the Japanese martial arts world. He renamed the art from 'Chinese hand' (唐手) to 'empty hand' (空手) to make it more Japanese. Founded Shotokan — now the world's most widely practiced karate style with tens of millions of students. Wrote five books on karate and established the 'Niju Kun' (20 Precepts) that remain the moral code for karateka worldwide. Never promoted himself above 5th dan, believing rank was less important than character.", imageUrl: "/ma/figures/fig-karate-funakoshi.jpg" },
      { name: "Mas Oyama", role: "Founded Kyokushin, 'The Godhand'", bio: "Born Choi Yeong-eui in Korea, 1923. Moved to Japan at 15 and trained in Shotokan and Goju-ryu karate. In 1946, retreated to Mount Minobu for 18 months of solitary training — meditating under waterfalls, breaking river stones, and fighting trees. Killed three bulls with his bare hands in public demonstrations, chopping off horns with a single knife-hand strike — earning the nickname 'The Godhand.' Founded Kyokushin karate in 1964 — 'the ultimate truth' — the first major full-contact karate style. Completed the legendary '100-man kumite' (fighting 100 opponents in a row) and challenged fighters of all styles worldwide. Kyokushin now has 12+ million practitioners in 120 countries.", imageUrl: "/ma/figures/fig-karate-oyama.jpg" },
      { name: "Anko Itosu", role: "Grandfather of Modern Karate", bio: "Born in Shuri, Okinawa, 1831. Trained under the legendary Sokon Matsumura, bodyguard to the Okinawan king. Known for his incredible physical toughness — reportedly his abdomen could withstand any punch. In 1901, he convinced the Okinawan government to add karate to public school physical education — the first time the secret art was taught openly. Created the Pinan (Heian) kata series, simplifying combat techniques so children could learn them safely. His students — Funakoshi, Mabuni, Chibana, Kenwa — went on to found Shotokan, Shito-ryu, Shorin-ryu, and most other modern karate styles. Without Itosu, karate might have died as a secret Okinawan art.", imageUrl: "/ma/figures/fig-karate-itosu.jpg" },
    ],
    eras: [
      { period: "14th C", title: "Chinese Roots Arrive", description: "Chinese martial artists and traders brought kung fu techniques to Okinawa. The island's fighters blended these with their native 'te' (hand) fighting methods." },
      { period: "1609", title: "The Weapons Ban", description: "Japan's Satsuma clan conquered Okinawa and banned all weapons. Okinawans secretly refined empty-hand combat — training at night, passing techniques through families and trusted students." },
      { period: "1901", title: "Itosu Opens the Door", description: "Anko Itosu persuaded the government to teach karate in Okinawan schools. He created simplified kata for students, making the secret art public for the first time." },
      { period: "1922", title: "Funakoshi Goes to Tokyo", description: "Gichin Funakoshi demonstrated karate at the Kodokan judo hall in Tokyo. The Japanese were stunned. Within years, karate spread across Japan and multiple styles emerged — Shotokan, Shito-ryu, Goju-ryu, Wado-ryu.", imageUrl: "/ma/history/karate-funakoshi.jpg" },
      { period: "1964", title: "Kyokushin & Full Contact", description: "Mas Oyama's Kyokushin brought full-contact karate to the world. Fighters proved techniques against real resistance — no more 'no touch' sparring." },
      { period: "Today", title: "Olympic Sport", description: "Over 100 million practitioners across 190+ countries. Karate debuted at the 2020 Tokyo Olympics, crowning the first Olympic champions in kata and kumite." },
    ],
    funFact: "Mas Oyama, founder of Kyokushin karate, famously killed three bulls with his bare hands in public demonstrations and completed 300 fights (kumite) over 3 days straight.",
  },
  taekwondo: {
    tagline: "The Way of the Foot and Fist",
    founded: "1955",
    origin: "South Korea",
    philosophy: "Courtesy, integrity, perseverance, self-control, indomitable spirit — the five tenets that govern every practitioner.",
    story: "After Korea's liberation from Japanese occupation in 1945, Korean martial arts masters sought to create a unified national fighting system. General Choi Hong Hi combined elements of Taekkyon (an ancient Korean kicking art), Karate (which many Koreans had studied under Japanese rule), and traditional Korean martial philosophy. In 1955, the name 'Taekwondo' was agreed upon, meaning 'the way of the foot and fist.' What sets TKD apart is its spectacular kicking techniques — spinning, jumping, and combination kicks that turn the longest limb into the primary weapon. It became an Olympic sport in 2000, and with over 80 million practitioners worldwide, it's the most practiced martial art on Earth.",
    keyFigures: [
      { name: "General Choi Hong Hi", role: "Founder of Taekwondo (ITF)", bio: "Born in Myongchon, Korea, 1918. Studied calligraphy and Taekkyon as a boy, then learned Shotokan karate while studying in Japan during WWII, earning a 2nd dan. After Korean independence, he rose to Major General in the ROK Army and developed a new martial art that combined karate's structure with Korea's traditional kicking heritage. In 1955, he proposed the name 'Taekwondo' to unify Korea's martial arts schools. Founded the International Taekwondo Federation (ITF) in 1966 and spent his life traveling to 120+ countries to spread the art. Authored the 15-volume 'Encyclopedia of Taekwondo' — the definitive technical reference. His sine-wave theory of power generation remains central to ITF technique.", imageUrl: "/ma/figures/fig-tkd-choi.jpg" },
      { name: "Kim Un-yong", role: "Brought Taekwondo to the Olympics", bio: "Born in Seoul, 1931. President of the World Taekwondo Federation (now World Taekwondo) for 32 years (1973–2004). A former intelligence official and diplomat, he used his political connections to get TKD demonstrated at the 1988 Seoul Olympics, then secured full Olympic medal status for the 2000 Sydney Games. Served as an IOC member and vice president, wielding enormous influence in the Olympic movement. Under his leadership, WTF/WT grew to 210+ member nations, making TKD the world's most widely practiced martial art.", imageUrl: "/ma/figures/fig-tkd-kim.jpg" },
      { name: "Hwang Kee", role: "Founder of Tang Soo Do / Moo Duk Kwan", bio: "Born in Jang Dan, Korea, 1914. At age 22, traveled to Manchuria where he trained in Chinese martial arts. Later studied Okinawan karate textbooks and Korean Taekkyon techniques. Founded the Moo Duk Kwan school on November 9, 1945 — just months after Korean independence — making it one of the original five 'kwans' (schools). His Tang Soo Do system emphasized traditional forms, discipline, and philosophy. When the Korean government pushed to merge all kwans into Taekwondo, Hwang Kee stubbornly resisted, preserving his art's independent identity. The Moo Duk Kwan today has millions of practitioners worldwide. Died in 2002, leaving a legacy of principled independence.", },
    ],
    eras: [
      { period: "57 BC", title: "Ancient Taekkyon", description: "Korean warriors practiced Taekkyon, an ancient kicking art depicted in tomb murals from the Goguryeo kingdom. Fighters used sweeps, trips, and high kicks in both warfare and competition." },
      { period: "1945", title: "Korean Independence", description: "After liberation from Japanese occupation, Korean martial arts masters opened 'kwans' (schools) across Seoul, each teaching their own blend of karate and traditional Korean techniques." },
      { period: "1955", title: "Taekwondo Is Named", description: "General Choi Hong Hi proposed the name 'Taekwondo' to unify the kwans under one national art. The emphasis shifted from Japanese-influenced hand techniques to Korea's distinctive kicking tradition." },
      { period: "1973", title: "World Taekwondo Founded", description: "The WTF was established in Seoul with the first World Championships. The Kukkiwon became the global headquarters. TKD spread to military training programs worldwide." },
      { period: "2000", title: "Olympic Debut", description: "Taekwondo became a full Olympic medal sport at the Sydney Games. Scoring systems evolved from subjective judging to electronic scoring (Protector and Scoring System).", imageUrl: "/ma/history/tkd-kick.jpg" },
      { period: "Today", title: "World's Most Practiced Art", description: "Over 80 million practitioners in 210+ countries. The WT and ITF systems coexist. Para-Taekwondo joined the Paralympics in 2020. The art's spectacular kicks make it one of the most visually exciting martial arts." },
    ],
    funFact: "A TKD master's spinning hook kick has been clocked at over 136 mph — the fastest kick ever measured in any martial art.",
  },
  mma: {
    tagline: "Prove Everything, Assume Nothing",
    founded: "1993 (UFC 1), roots in ancient pankration",
    origin: "United States (modern), Ancient Greece (historical)",
    philosophy: "Be complete. A chain is only as strong as its weakest link — train every range, every weapon.",
    story: "Mixed martial arts answers the oldest question in combat: which style truly works? The ancient Greeks had pankration — a brutal Olympic event combining striking and grappling. But modern MMA began on November 12, 1993, when UFC 1 pitted fighters of different disciplines against each other with almost no rules. Royce Gracie's BJJ dominated, but the sport quickly evolved: wrestlers learned to strike, strikers learned takedown defense, and a new breed of complete fighter emerged. The 'Unified Rules' (2000) and weight classes transformed MMA from spectacle to legitimate sport. Today's MMA fighters are arguably the most well-rounded combat athletes in history, trained in multiple disciplines from Day 1.",
    keyFigures: [
      { name: "Royce Gracie", role: "UFC 1-2-4 champion, started the MMA revolution", bio: "Born in Rio de Janeiro, 1966. Hélio Gracie's son, deliberately chosen as the smallest and lightest Gracie (176 lbs / 6'1\") to represent the family at UFC 1. Won three of the first four UFC tournaments (1, 2, and 4), submitting opponents including a 260-lb sumo wrestler, a professional boxer, and a karate black belt — all in the same night. His rear-naked choke and triangle choke became the most feared submissions in combat sports. UFC Hall of Fame inductee (2003). Without Royce, MMA might never have become a global sport, and BJJ would remain unknown outside Brazil.", imageUrl: "/ma/figures/fig-mma-royce.jpg" },
      { name: "Anderson Silva", role: "Greatest middleweight, 'The Spider'", bio: "Born in São Paulo, Brazil, 1975. Began training in Muay Thai, capoeira, and BJJ as a teenager in the favelas. Held the UFC middleweight title for a record 2,457 days (2006–2013) with 16 consecutive victories — the longest win streak in UFC title history. Known for supernatural reflexes — his hands-down, chin-up dodging style was unlike anything seen before. The Forrest Griffin fight (UFC 101), where he dodged punches with his hands behind his back before landing a jab knockout, remains the most replayed highlight in MMA history. Record: 34-11 (23 KOs, 3 submissions). UFC Hall of Fame (2024). Dana White called him 'the greatest fighter who has ever lived.'", imageUrl: "/ma/figures/fig-mma-silva.jpg" },
      { name: "Georges St-Pierre", role: "Most complete MMA fighter, 'GSP'", bio: "Born in Saint-Isidore, Quebec, 1981. Started training karate at age 7 after being bullied. Became a two-division UFC champion — welterweight (nine consecutive title defenses, a division record) and middleweight. Professional record: 26-2 (8 KOs, 6 submissions). Known as the most cerebral fighter in MMA history — he studied opponents obsessively, hired sport scientists, and developed custom game plans for each fight. His takedown accuracy, jab, and ability to impose his will made him nearly unbeatable. Three-time UFC welterweight champion. Retired undefeated in his last 13 fights. UFC Hall of Fame inductee. Widely considered the greatest welterweight and one of the top 3 MMA fighters of all time.", imageUrl: "/ma/figures/fig-mma-gsp.jpg" },
    ],
    eras: [
      { period: "648 BC", title: "Ancient Pankration", description: "The Greeks invented the first 'mixed' martial art for the Olympics — combining boxing and wrestling with almost no rules. Only biting and eye-gouging were banned. Champions were celebrated as demigods.", imageUrl: "/ma/history/mma-pankration.jpg" },
      { period: "1920s", title: "Vale Tudo in Brazil", description: "The Gracie family began hosting 'anything goes' challenge matches in Brazil, pitting their jiu-jitsu against boxing, capoeira, wrestling, and luta livre. These fights ran for decades, mostly underground." },
      { period: "1993", title: "UFC 1 — The Beginning", description: "November 12, Denver, Colorado. Eight fighters, eight styles, almost no rules. Royce Gracie submitted three opponents in one night. The world learned that style matters — and no single art was complete.", imageUrl: "/ma/history/mma-ufc.jpg" },
      { period: "2001", title: "The Unified Rules", description: "After state athletic commissions banned early UFCs, the 'Unified Rules of MMA' brought weight classes, time limits, banned moves, and referee stoppages. MMA transformed from spectacle to regulated sport." },
      { period: "2005–15", title: "The Golden Era", description: "Anderson Silva, Georges St-Pierre, Jon Jones, and others became household names. The UFC went mainstream with network TV deals. A new breed of complete fighter emerged — trained in multiple arts from day one." },
      { period: "Today", title: "Global Combat Sport", description: "UFC, ONE Championship, PFL, and Bellator draw hundreds of millions of viewers. MMA fighters are arguably the most well-rounded athletes in combat sports history." },
    ],
    funFact: "The fastest knockout in UFC history is 5 seconds — by Jorge Masvidal against Ben Askren with a flying knee at UFC 239.",
  },
};
