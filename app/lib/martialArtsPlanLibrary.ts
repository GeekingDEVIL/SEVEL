import type { DisciplineId, SessionType } from "./martialArtsEngine";

export type MARoundTemplate = {
  roundType: SessionType;
  durationSec: number;
  restSec: number;
  notes?: string;
};

export type MASessionPlan = {
  dayNum: number;
  focus: string;
  sessionType: SessionType;
  rounds: MARoundTemplate[];
  warmup: string;
  cooldown: string;
  notes?: string;
};

export type MAPlanWeek = {
  id: string;
  discipline: DisciplineId;
  name: string;
  level: "beginner" | "intermediate" | "advanced";
  daysPerWeek: number;
  description: string;
  duration: string;
  sessions: MASessionPlan[];
};

export const MA_PLAN_LIBRARY: MAPlanWeek[] = [
  // ═══════════════════════════════════════════
  // BOXING
  // ═══════════════════════════════════════════
  {
    id: "box-beginner-2d",
    discipline: "boxing",
    name: "Boxing Fundamentals",
    level: "beginner",
    daysPerWeek: 2,
    description: "Build your boxing base — stance, basic punches, defense, and movement.",
    duration: "30-45 min",
    sessions: [
      {
        dayNum: 1,
        focus: "Technique + Shadow",
        sessionType: "technique",
        warmup: "Jump rope 3min, shoulder circles, shadow jab-cross 2min",
        cooldown: "Wrist stretch, shoulder stretch, neck release",
        rounds: [
          { roundType: "shadowbox", durationSec: 120, restSec: 60, notes: "Jab only — focus on snap and return" },
          { roundType: "shadowbox", durationSec: 120, restSec: 60, notes: "Jab-Cross — full hip rotation" },
          { roundType: "technique", durationSec: 120, restSec: 60, notes: "Footwork drills — push step, pivot" },
          { roundType: "shadowbox", durationSec: 120, restSec: 60, notes: "1-2-Slip-2 combo" },
          { roundType: "conditioning", durationSec: 120, restSec: 0, notes: "Core: plank 30s, bicycle crunches 30s, rest, repeat" },
        ],
      },
      {
        dayNum: 2,
        focus: "Bag Work + Defense",
        sessionType: "bag_work",
        warmup: "Jump rope 3min, arm swings, light shadow combo",
        cooldown: "Forearm stretch, hip flexor stretch, neck release",
        rounds: [
          { roundType: "bag_work", durationSec: 120, restSec: 60, notes: "Light jabs only — volume" },
          { roundType: "bag_work", durationSec: 120, restSec: 60, notes: "1-2 combos — power" },
          { roundType: "technique", durationSec: 120, restSec: 60, notes: "Slip + Parry drills (shadowbox or partner)" },
          { roundType: "bag_work", durationSec: 120, restSec: 60, notes: "1-2-3 combo — hook timing" },
          { roundType: "conditioning", durationSec: 120, restSec: 0, notes: "Burpees 30s, rest 30s × 3" },
        ],
      },
    ],
  },
  {
    id: "box-intermediate-3d",
    discipline: "boxing",
    name: "Boxing Sharpening",
    level: "intermediate",
    daysPerWeek: 3,
    description: "Refine combinations, add uppercuts, work defense and counters.",
    duration: "45-60 min",
    sessions: [
      {
        dayNum: 1,
        focus: "Combos + Power",
        sessionType: "bag_work",
        warmup: "Jump rope 3min, dynamic stretches, shadow combo 2min",
        cooldown: "Wrist/forearm stretch, shoulder stretch",
        rounds: [
          { roundType: "bag_work", durationSec: 180, restSec: 60, notes: "1-2-3-2 combo — rhythm" },
          { roundType: "bag_work", durationSec: 180, restSec: 60, notes: "Body shots — jab body, cross body, hook body" },
          { roundType: "bag_work", durationSec: 180, restSec: 60, notes: "Uppercut-Hook combos" },
          { roundType: "bag_work", durationSec: 180, restSec: 60, notes: "Free round — mix everything" },
          { roundType: "conditioning", durationSec: 180, restSec: 0, notes: "Speed bag or double-end bag 3min" },
        ],
      },
      {
        dayNum: 2,
        focus: "Defense + Counters",
        sessionType: "technique",
        warmup: "Jump rope 3min, neck rolls, shadow defensive movement",
        cooldown: "Full body stretch 5min",
        rounds: [
          { roundType: "technique", durationSec: 180, restSec: 60, notes: "Slip-counter drill: slip jab → throw cross" },
          { roundType: "technique", durationSec: 180, restSec: 60, notes: "Bob & weave under hooks → counter hook" },
          { roundType: "technique", durationSec: 180, restSec: 60, notes: "Parry-counter drill" },
          { roundType: "shadowbox", durationSec: 180, restSec: 60, notes: "Free shadow with emphasis on defense" },
          { roundType: "conditioning", durationSec: 180, restSec: 0, notes: "Jump rope intervals: 30s fast / 30s slow × 6" },
        ],
      },
      {
        dayNum: 3,
        focus: "Sparring / Pad Work",
        sessionType: "pad_work",
        warmup: "Light shadow 3min, dynamic stretches",
        cooldown: "Shoulder stretch, hip flexor, neck release",
        rounds: [
          { roundType: "pad_work", durationSec: 180, restSec: 60, notes: "Basic combos on pads — coach calls" },
          { roundType: "pad_work", durationSec: 180, restSec: 60, notes: "Defense + counter on pads" },
          { roundType: "sparring", durationSec: 180, restSec: 60, notes: "Light technical sparring — 50% power" },
          { roundType: "sparring", durationSec: 180, restSec: 60, notes: "Light sparring — work on distance" },
          { roundType: "conditioning", durationSec: 180, restSec: 0, notes: "Core circuit: planks, russian twists, leg raises" },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════
  // MUAY THAI
  // ═══════════════════════════════════════════
  {
    id: "mt-beginner-2d",
    discipline: "muay_thai",
    name: "Muay Thai Foundations",
    level: "beginner",
    daysPerWeek: 2,
    description: "Learn the 8 limbs — punches, kicks, elbows, knees, and the clinch.",
    duration: "40-55 min",
    sessions: [
      {
        dayNum: 1,
        focus: "Kicks + Punches",
        sessionType: "technique",
        warmup: "Thai skip 2min, hip openers 1min, light teeps 1min",
        cooldown: "Hamstring stretch, hip flexor, quad stretch",
        rounds: [
          { roundType: "technique", durationSec: 180, restSec: 60, notes: "Teep drill — push kick both legs" },
          { roundType: "technique", durationSec: 180, restSec: 60, notes: "Roundhouse kick — rear leg, focus on hip turnover" },
          { roundType: "technique", durationSec: 180, restSec: 60, notes: "1-2-Kick combo on pads or bag" },
          { roundType: "technique", durationSec: 180, restSec: 120, notes: "Low kick drill — step at 45°, follow through" },
          { roundType: "technique", durationSec: 180, restSec: 0, notes: "Shin check defense drill" },
        ],
      },
      {
        dayNum: 2,
        focus: "Clinch + Knees",
        sessionType: "technique",
        warmup: "Hip openers 2min, knee raises, clinch entry drills",
        cooldown: "Neck stretch, back decompression, hip openers",
        rounds: [
          { roundType: "technique", durationSec: 180, restSec: 60, notes: "Clinch entry — double collar tie" },
          { roundType: "technique", durationSec: 180, restSec: 60, notes: "Straight knee from clinch" },
          { roundType: "technique", durationSec: 180, restSec: 60, notes: "Elbow strikes — horizontal and uppercut" },
          { roundType: "bag_work", durationSec: 180, restSec: 60, notes: "Bag work: mix kicks, knees, elbows" },
          { roundType: "conditioning", durationSec: 180, restSec: 0, notes: "Bodyweight conditioning: squats, push-ups, burpees" },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════
  // BJJ
  // ═══════════════════════════════════════════
  {
    id: "bjj-beginner-2d",
    discipline: "bjj",
    name: "BJJ Survival Kit",
    level: "beginner",
    daysPerWeek: 2,
    description: "Guard basics, escapes, and your first submissions. Survive, then thrive.",
    duration: "45-60 min",
    sessions: [
      {
        dayNum: 1,
        focus: "Guard + Escapes",
        sessionType: "technique",
        warmup: "Hip escapes 10 each, granby rolls 5 each, neck bridges 30s",
        cooldown: "Neck stretch, back decompression, hip openers",
        rounds: [
          { roundType: "technique", durationSec: 300, restSec: 60, notes: "Closed guard fundamentals — posture break, grips" },
          { roundType: "technique", durationSec: 300, restSec: 60, notes: "Hip escape (shrimp) from side control" },
          { roundType: "technique", durationSec: 300, restSec: 60, notes: "Trap & roll mount escape" },
          { roundType: "flow_roll", durationSec: 360, restSec: 60, notes: "Positional sparring: start in guard, work escapes" },
          { roundType: "flow_roll", durationSec: 360, restSec: 0, notes: "Light flow roll — focus on position, not submissions" },
        ],
      },
      {
        dayNum: 2,
        focus: "Submissions + Sweeps",
        sessionType: "technique",
        warmup: "Shrimping length of mat, guard recovery drill 1min, neck bridges",
        cooldown: "Spine twist, grip release stretch, full body stretch",
        rounds: [
          { roundType: "technique", durationSec: 300, restSec: 60, notes: "Armbar from closed guard — step by step" },
          { roundType: "technique", durationSec: 300, restSec: 60, notes: "Scissor sweep from guard" },
          { roundType: "technique", durationSec: 300, restSec: 60, notes: "Rear naked choke from back control" },
          { roundType: "flow_roll", durationSec: 360, restSec: 60, notes: "Positional: one starts in back control" },
          { roundType: "flow_roll", durationSec: 360, restSec: 0, notes: "Open roll — 50% intensity" },
        ],
      },
    ],
  },
  {
    id: "bjj-intermediate-3d",
    discipline: "bjj",
    name: "BJJ Game Builder",
    level: "intermediate",
    daysPerWeek: 3,
    description: "Develop a guard game, passing, and chain attacks together.",
    duration: "60-75 min",
    sessions: [
      {
        dayNum: 1,
        focus: "Guard Game",
        sessionType: "technique",
        warmup: "Hip escapes, inversion drills, guard recovery",
        cooldown: "Neck stretch, back decompression",
        rounds: [
          { roundType: "technique", durationSec: 300, restSec: 60, notes: "Triangle choke setup + finish" },
          { roundType: "technique", durationSec: 300, restSec: 60, notes: "Armbar → triangle chain" },
          { roundType: "technique", durationSec: 300, restSec: 60, notes: "Back take from guard" },
          { roundType: "flow_roll", durationSec: 360, restSec: 60, notes: "Specific: guard player vs passer" },
          { roundType: "flow_roll", durationSec: 360, restSec: 60, notes: "Open roll" },
          { roundType: "flow_roll", durationSec: 360, restSec: 0, notes: "Open roll" },
        ],
      },
      {
        dayNum: 2,
        focus: "Passing + Top Game",
        sessionType: "technique",
        warmup: "Sprawls, hip switches, knee slide entries",
        cooldown: "Hip openers, grip release",
        rounds: [
          { roundType: "technique", durationSec: 300, restSec: 60, notes: "Knee slice pass" },
          { roundType: "technique", durationSec: 300, restSec: 60, notes: "Double leg takedown" },
          { roundType: "technique", durationSec: 300, restSec: 60, notes: "Side control maintenance + submissions" },
          { roundType: "flow_roll", durationSec: 360, restSec: 60, notes: "Specific: passer starts standing" },
          { roundType: "flow_roll", durationSec: 360, restSec: 60, notes: "Open roll" },
          { roundType: "flow_roll", durationSec: 360, restSec: 0, notes: "Open roll" },
        ],
      },
      {
        dayNum: 3,
        focus: "Live Rolling",
        sessionType: "sparring",
        warmup: "Movement flow, guard pulls, stand-up",
        cooldown: "Full body stretch, back decompression",
        rounds: [
          { roundType: "technique", durationSec: 300, restSec: 60, notes: "Warm-up technique review" },
          { roundType: "sparring", durationSec: 360, restSec: 60, notes: "Roll 1 — work the week's techniques" },
          { roundType: "sparring", durationSec: 360, restSec: 60, notes: "Roll 2 — different partner" },
          { roundType: "sparring", durationSec: 360, restSec: 60, notes: "Roll 3 — competitive pace" },
          { roundType: "sparring", durationSec: 360, restSec: 60, notes: "Roll 4 — flow/recovery" },
          { roundType: "sparring", durationSec: 360, restSec: 0, notes: "Roll 5 — final push" },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════
  // KARATE
  // ═══════════════════════════════════════════
  {
    id: "kar-beginner-2d",
    discipline: "karate",
    name: "Karate Basics",
    level: "beginner",
    daysPerWeek: 2,
    description: "Stances, blocks, punches, kicks, and your first kata — Heian Shodan.",
    duration: "40-50 min",
    sessions: [
      {
        dayNum: 1,
        focus: "Stances + Strikes",
        sessionType: "technique",
        warmup: "Joint rotations 2min, dynamic stretches 2min",
        cooldown: "Forward fold, cobra stretch, standing side stretch",
        rounds: [
          { roundType: "technique", durationSec: 180, restSec: 60, notes: "Zenkutsu-dachi (front stance) — hold + transition" },
          { roundType: "technique", durationSec: 180, restSec: 60, notes: "Oi-zuki (lunge punch) — step and punch" },
          { roundType: "technique", durationSec: 180, restSec: 60, notes: "Gyaku-zuki (reverse punch) — hip rotation" },
          { roundType: "technique", durationSec: 180, restSec: 60, notes: "Mae geri (front kick) — chamber and snap" },
          { roundType: "technique", durationSec: 180, restSec: 0, notes: "Age uke + Gedan barai (rising + downward block)" },
        ],
      },
      {
        dayNum: 2,
        focus: "Kata + Combinations",
        sessionType: "kata",
        warmup: "Stance transitions 2min, basic blocks in sequence",
        cooldown: "Full body flow, child's pose, deep breathing",
        rounds: [
          { roundType: "kata", durationSec: 300, restSec: 60, notes: "Heian Shodan — walk through slowly" },
          { roundType: "kata", durationSec: 300, restSec: 60, notes: "Heian Shodan — full speed × 3" },
          { roundType: "technique", durationSec: 180, restSec: 60, notes: "Mawashi geri (roundhouse) — pivot and snap" },
          { roundType: "technique", durationSec: 180, restSec: 60, notes: "Block → counter combinations" },
          { roundType: "conditioning", durationSec: 180, restSec: 0, notes: "Knuckle push-ups, squat kicks, core work" },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════
  // TAEKWONDO
  // ═══════════════════════════════════════════
  {
    id: "tkd-beginner-2d",
    discipline: "taekwondo",
    name: "Taekwondo Kick Start",
    level: "beginner",
    daysPerWeek: 2,
    description: "Master the fundamental kicks — front, round, side — and Taegeuk Il Jang.",
    duration: "40-50 min",
    sessions: [
      {
        dayNum: 1,
        focus: "Fundamental Kicks",
        sessionType: "technique",
        warmup: "Leg swings 20 each, high knee marches 1min, light front kicks",
        cooldown: "Hamstring stretch, hip flexor, quad stretch, ankle circles",
        rounds: [
          { roundType: "technique", durationSec: 180, restSec: 60, notes: "Ap chagi (front kick) — chamber, snap, return" },
          { roundType: "technique", durationSec: 180, restSec: 60, notes: "Dollyo chagi (roundhouse) — hip turnover, instep" },
          { roundType: "technique", durationSec: 180, restSec: 60, notes: "Yop chagi (side kick) — thrust with blade of foot" },
          { roundType: "technique", durationSec: 180, restSec: 60, notes: "Kick combos: front-round, round-round switching" },
          { roundType: "conditioning", durationSec: 180, restSec: 0, notes: "Leg conditioning: squats, calf raises, balance holds" },
        ],
      },
      {
        dayNum: 2,
        focus: "Poomsae + Advanced Kicks",
        sessionType: "kata",
        warmup: "Dynamic leg stretches, turning kick warm-up 10 each",
        cooldown: "Full lower body stretch, hip openers",
        rounds: [
          { roundType: "kata", durationSec: 300, restSec: 60, notes: "Taegeuk Il Jang — walk through" },
          { roundType: "kata", durationSec: 300, restSec: 60, notes: "Taegeuk Il Jang — full speed × 3" },
          { roundType: "technique", durationSec: 180, restSec: 60, notes: "Dwit chagi (back kick) — look, spin, thrust" },
          { roundType: "technique", durationSec: 180, restSec: 60, notes: "Naeryeo chagi (axe kick) — height and accuracy" },
          { roundType: "conditioning", durationSec: 180, restSec: 0, notes: "Flexibility: splits progression, hip openers" },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════
  // MMA
  // ═══════════════════════════════════════════
  {
    id: "mma-beginner-3d",
    discipline: "mma",
    name: "MMA Fundamentals",
    level: "beginner",
    daysPerWeek: 3,
    description: "Build a base in striking, grappling, and transitions. The complete fighter starts here.",
    duration: "50-65 min",
    sessions: [
      {
        dayNum: 1,
        focus: "Striking",
        sessionType: "technique",
        warmup: "Jump rope 3min, shadow combo 2min, hip openers",
        cooldown: "Wrist stretch, shoulder stretch, hip flexor",
        rounds: [
          { roundType: "technique", durationSec: 180, restSec: 60, notes: "Stance + distance management" },
          { roundType: "technique", durationSec: 180, restSec: 60, notes: "Jab-Cross-Low Kick combo" },
          { roundType: "bag_work", durationSec: 180, restSec: 60, notes: "Bag work: mix punches and kicks" },
          { roundType: "technique", durationSec: 180, restSec: 60, notes: "Sprawl defense drill" },
          { roundType: "shadowbox", durationSec: 180, restSec: 0, notes: "Shadow MMA: strike → level change → strike" },
        ],
      },
      {
        dayNum: 2,
        focus: "Grappling",
        sessionType: "technique",
        warmup: "Hip escapes, sprawls 10 each, neck bridges",
        cooldown: "Neck stretch, back decompression, hip openers",
        rounds: [
          { roundType: "technique", durationSec: 300, restSec: 60, notes: "Double leg takedown — penetration step" },
          { roundType: "technique", durationSec: 300, restSec: 60, notes: "Guard passing — knee slice" },
          { roundType: "technique", durationSec: 300, restSec: 60, notes: "Ground & pound from top position" },
          { roundType: "flow_roll", durationSec: 360, restSec: 60, notes: "Positional: start standing, work takedown → top control" },
          { roundType: "flow_roll", durationSec: 360, restSec: 0, notes: "Light grappling" },
        ],
      },
      {
        dayNum: 3,
        focus: "Transitions + Sparring",
        sessionType: "mixed",
        warmup: "Movement drills, sprawl-to-shot, shadow combo",
        cooldown: "Full body stretch",
        rounds: [
          { roundType: "technique", durationSec: 180, restSec: 60, notes: "Cage clinch work — underhook battle" },
          { roundType: "technique", durationSec: 180, restSec: 60, notes: "Strike → takedown → ground control" },
          { roundType: "sparring", durationSec: 300, restSec: 60, notes: "Light MMA sparring — 40% power" },
          { roundType: "sparring", durationSec: 300, restSec: 60, notes: "Sparring — different partner" },
          { roundType: "conditioning", durationSec: 300, restSec: 0, notes: "MMA circuit: burpees, sprawls, shadow strikes, grappling dummy" },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════
  // SELF-DEFENSE (cross-discipline)
  // ═══════════════════════════════════════════
  {
    id: "selfdef-beginner-2d",
    discipline: "mma",
    name: "Practical Self-Defense",
    level: "beginner",
    daysPerWeek: 2,
    description: "Real-world applicable techniques from multiple disciplines. Awareness, de-escalation, and last-resort physical defense.",
    duration: "35-45 min",
    sessions: [
      {
        dayNum: 1,
        focus: "Standing Defense",
        sessionType: "technique",
        warmup: "Joint rotations, shadow movement, awareness drill",
        cooldown: "Wrist stretch, shoulder stretch, breathing exercise",
        rounds: [
          { roundType: "technique", durationSec: 180, restSec: 60, notes: "Distance management — creating space" },
          { roundType: "technique", durationSec: 180, restSec: 60, notes: "Palm strike + push-away (Krav-inspired)" },
          { roundType: "technique", durationSec: 180, restSec: 60, notes: "Clinch defense — swimming underhooks, push off" },
          { roundType: "technique", durationSec: 180, restSec: 60, notes: "Basic takedown defense — sprawl + disengage" },
          { roundType: "conditioning", durationSec: 120, restSec: 0, notes: "Stress drill: burpees then technique (simulate adrenaline)" },
        ],
      },
      {
        dayNum: 2,
        focus: "Ground Survival",
        sessionType: "technique",
        warmup: "Hip escapes, bridges, neck protection drills",
        cooldown: "Back decompression, breathing exercise 2min",
        rounds: [
          { roundType: "technique", durationSec: 180, restSec: 60, notes: "Getting back to feet from ground (technical standup)" },
          { roundType: "technique", durationSec: 180, restSec: 60, notes: "Mount escape — trap and roll" },
          { roundType: "technique", durationSec: 180, restSec: 60, notes: "Rear choke defense — two-on-one hand fight" },
          { roundType: "technique", durationSec: 180, restSec: 60, notes: "Bear hug defense — drop weight + elbow" },
          { roundType: "technique", durationSec: 180, restSec: 0, notes: "Scenario drill: surrounded → create exit → disengage" },
        ],
      },
    ],
  },
];
