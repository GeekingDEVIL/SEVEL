// Character System Engine
// Domains, archetypes, ranks, XP curve, reforging — all computed from real training data

// ── Rank Ladder (10 ranks, levels 1-100) ──

export type RankDef = {
  name: string;
  minLevel: number;
  maxLevel: number;
  color: string;
  badge: string;
};

export const RANKS: RankDef[] = [
  { name: "Raw",       minLevel: 1,   maxLevel: 10,  color: "#8B6F47", badge: "rough-stone"     },
  { name: "Tempered",  minLevel: 11,  maxLevel: 20,  color: "#A0866C", badge: "heat-cracks"     },
  { name: "Forged",    minLevel: 21,  maxLevel: 30,  color: "#E8722A", badge: "molten-shield"   },
  { name: "Proven",    minLevel: 31,  maxLevel: 40,  color: "#4A7FA5", badge: "scarred-shield"  },
  { name: "Adamant",   minLevel: 41,  maxLevel: 50,  color: "#3D4852", badge: "fist-shield"     },
  { name: "Champion",  minLevel: 51,  maxLevel: 60,  color: "#D4AF37", badge: "winged-shield"   },
  { name: "Mythic",    minLevel: 61,  maxLevel: 70,  color: "#7B2D8E", badge: "glowing-emblem"  },
  { name: "Titan",     minLevel: 71,  maxLevel: 80,  color: "#E85D04", badge: "ember-pulse"     },
  { name: "Immortal",  minLevel: 81,  maxLevel: 90,  color: "#FFD700", badge: "star-halo"       },
  { name: "Ascended",  minLevel: 91,  maxLevel: 100, color: "#C084FC", badge: "prismatic"       },
];

export function getRankForLevel(level: number): RankDef {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (level >= RANKS[i].minLevel) return RANKS[i];
  }
  return RANKS[0];
}

export function getNextRankDef(level: number): RankDef | null {
  const current = getRankForLevel(level);
  const idx = RANKS.indexOf(current);
  return idx < RANKS.length - 1 ? RANKS[idx + 1] : null;
}

// ── XP Curve ──
// xp_for_level(n) = 100 * n * (1 + 0.05 * n)
// Total to 100: ~500K XP

const MAX_LEVEL = 100;

export function xpForLevel(n: number): number {
  if (n >= MAX_LEVEL) return Infinity;
  return Math.floor(100 * n * (1 + 0.05 * n));
}

export function totalXpToReachLevel(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += xpForLevel(i);
  }
  return total;
}

export type CharacterLevelInfo = {
  level: number;
  totalXp: number;
  xpIntoCurrentLevel: number;
  xpNeededForNext: number;
  progress: number;
  isMaxLevel: boolean;
};

export function computeCharacterLevel(totalXp: number, reforgeCount: number = 0): CharacterLevelInfo {
  const reforgeMultiplier = 1 + reforgeCount * 0.2;
  const effectiveXp = Math.floor(totalXp * reforgeMultiplier);

  let level = 1;
  let accumulated = 0;

  while (level < MAX_LEVEL) {
    const needed = xpForLevel(level);
    if (accumulated + needed > effectiveXp) {
      return {
        level,
        totalXp,
        xpIntoCurrentLevel: effectiveXp - accumulated,
        xpNeededForNext: needed,
        progress: (effectiveXp - accumulated) / needed,
        isMaxLevel: false,
      };
    }
    accumulated += needed;
    level++;
  }

  return {
    level: MAX_LEVEL,
    totalXp,
    xpIntoCurrentLevel: effectiveXp - accumulated,
    xpNeededForNext: 0,
    progress: 1,
    isMaxLevel: true,
  };
}

// ── Reforge / Prestige ──

export const MAX_REFORGE = 5;

export type ReforgeInfo = {
  count: number;
  stars: string;
  xpMultiplier: number;
  xpBonusPercent: number;
  isEternal: boolean;
};

export function getReforgeInfo(reforgeCount: number): ReforgeInfo {
  const clamped = Math.min(reforgeCount, MAX_REFORGE);
  return {
    count: clamped,
    stars: "★".repeat(clamped),
    xpMultiplier: 1 + clamped * 0.2,
    xpBonusPercent: clamped * 5,
    isEternal: clamped >= MAX_REFORGE,
  };
}

// ── Training Domains ──

export type DomainKey = "force" | "form" | "flow" | "fight" | "function" | "fortitude";

export const DOMAIN_LABELS: Record<DomainKey, string> = {
  force: "Force",
  form: "Form",
  flow: "Flow",
  fight: "Fight",
  function: "Function",
  fortitude: "Fortitude",
};

export const DOMAIN_DESCRIPTIONS: Record<DomainKey, string> = {
  force: "Raw strength output",
  form: "Movement quality & control",
  flow: "Cardiovascular & endurance",
  fight: "Combat & martial arts skill",
  function: "Athletic versatility",
  fortitude: "Consistency & mental toughness",
};

export const DOMAIN_COLORS: Record<DomainKey, string> = {
  force: "239 68 68",
  form: "59 130 246",
  flow: "16 185 129",
  fight: "249 115 22",
  function: "139 92 246",
  fortitude: "234 179 8",
};

export type DomainScores = Record<DomainKey, number>;

export function recencyMultiplier(weeksSinceLastTraining: number): number {
  if (weeksSinceLastTraining <= 0) return 1.0;
  if (weeksSinceLastTraining <= 1) return 0.95;
  if (weeksSinceLastTraining <= 2) return 0.85;
  if (weeksSinceLastTraining <= 3) return 0.70;
  return 0.50;
}

export type DomainInput = {
  totalVolume: number;
  prCount: number;
  compoundLiftCount: number;
  formCheckAvg: number;
  formCheckCount: number;
  mobilitySessionCount: number;
  cardioMinutes: number;
  maSessionCount: number;
  maTechniqueAvg: number;
  exerciseVariety: number;
  bodyweightSetCount: number;
  totalSetCount: number;
  currentStreak: number;
  bestStreak: number;
  completionRate: number;
  scheduledAdherence: number;
  totalWorkouts: number;
  weeksSinceForce: number;
  weeksSinceForm: number;
  weeksSinceFlow: number;
  weeksSinceFight: number;
  weeksSinceFunction: number;
};

export function computeDomainScores(input: DomainInput): DomainScores {
  const forceRaw = Math.min(100, (
    clamp(input.totalVolume / 100000, 0, 1) * 40 +
    clamp(input.prCount / 30, 0, 1) * 35 +
    clamp(input.compoundLiftCount / 50, 0, 1) * 25
  ));

  const formRaw = Math.min(100, (
    clamp(input.formCheckAvg / 100, 0, 1) * 40 +
    clamp(input.formCheckCount / 20, 0, 1) * 30 +
    clamp(input.mobilitySessionCount / 15, 0, 1) * 30
  ));

  const flowRaw = Math.min(100, (
    clamp(input.cardioMinutes / 600, 0, 1) * 70 +
    clamp(input.totalWorkouts / 40, 0, 1) * 30
  ));

  const fightRaw = Math.min(100, (
    clamp(input.maSessionCount / 30, 0, 1) * 60 +
    clamp(input.maTechniqueAvg / 100, 0, 1) * 40
  ));

  const varietyRatio = input.totalSetCount > 0
    ? input.bodyweightSetCount / input.totalSetCount
    : 0;
  const functionRaw = Math.min(100, (
    clamp(input.exerciseVariety / 30, 0, 1) * 50 +
    clamp(varietyRatio, 0, 1) * 25 +
    clamp(input.totalWorkouts / 50, 0, 1) * 25
  ));

  const fortitudeRaw = Math.min(100, (
    clamp(input.currentStreak / 30, 0, 1) * 30 +
    clamp(input.bestStreak / 60, 0, 1) * 20 +
    clamp(input.completionRate, 0, 1) * 25 +
    clamp(input.scheduledAdherence, 0, 1) * 25
  ));

  return {
    force: round2(forceRaw * recencyMultiplier(input.weeksSinceForce)),
    form: round2(formRaw * recencyMultiplier(input.weeksSinceForm)),
    flow: round2(flowRaw * recencyMultiplier(input.weeksSinceFlow)),
    fight: round2(fightRaw * recencyMultiplier(input.weeksSinceFight)),
    function: round2(functionRaw * recencyMultiplier(input.weeksSinceFunction)),
    fortitude: round2(fortitudeRaw),
  };
}

// ── Archetypes ──

export type ArchetypeKey =
  | "juggernaut" | "sentinel" | "strider" | "striker" | "phantom" | "warden"
  | "titan" | "colossus" | "berserker" | "golem" | "monolith"
  | "monk" | "bladedancer" | "artisan" | "stoic"
  | "tempest" | "nomad" | "pilgrim"
  | "ronin" | "spartan"
  | "centurion"
  | "ascendant";

type ArchetypeDef = {
  key: ArchetypeKey;
  name: string;
  identity: string;
  domains: [DomainKey] | [DomainKey, DomainKey];
};

const SINGLE_ARCHETYPES: ArchetypeDef[] = [
  { key: "juggernaut", name: "Juggernaut", identity: "Raw power incarnate",          domains: ["force"]     },
  { key: "sentinel",   name: "Sentinel",   identity: "Precision and control",        domains: ["form"]      },
  { key: "strider",    name: "Strider",    identity: "Endurance machine",             domains: ["flow"]      },
  { key: "striker",    name: "Striker",    identity: "Combat specialist",             domains: ["fight"]     },
  { key: "phantom",    name: "Phantom",    identity: "Versatile athlete",             domains: ["function"]  },
  { key: "warden",     name: "Warden",     identity: "Unbreakable consistency",       domains: ["fortitude"] },
];

const DUAL_ARCHETYPES: ArchetypeDef[] = [
  { key: "titan",       name: "Titan",       identity: "Power with perfect technique",  domains: ["force", "form"]      },
  { key: "colossus",    name: "Colossus",    identity: "Strength that never fades",     domains: ["force", "flow"]      },
  { key: "berserker",   name: "Berserker",   identity: "Devastating striking power",    domains: ["force", "fight"]     },
  { key: "golem",       name: "Golem",       identity: "Functional raw strength",       domains: ["force", "function"]  },
  { key: "monolith",    name: "Monolith",    identity: "Relentless powerhouse",         domains: ["force", "fortitude"] },
  { key: "monk",        name: "Monk",        identity: "Graceful endurance",            domains: ["form", "flow"]       },
  { key: "bladedancer", name: "Bladedancer", identity: "Technical combat artist",       domains: ["form", "fight"]      },
  { key: "artisan",     name: "Artisan",     identity: "Movement perfectionist",        domains: ["form", "function"]   },
  { key: "stoic",       name: "Stoic",       identity: "Disciplined precision",         domains: ["form", "fortitude"]  },
  { key: "tempest",     name: "Tempest",     identity: "Tireless fighter",              domains: ["flow", "fight"]      },
  { key: "nomad",       name: "Nomad",       identity: "Enduring versatility",          domains: ["flow", "function"]   },
  { key: "pilgrim",     name: "Pilgrim",     identity: "The long-distance grinder",     domains: ["flow", "fortitude"]  },
  { key: "ronin",       name: "Ronin",       identity: "Adaptable warrior",             domains: ["fight", "function"]  },
  { key: "spartan",     name: "Spartan",     identity: "Relentless combatant",          domains: ["fight", "fortitude"] },
  { key: "centurion",   name: "Centurion",   identity: "Versatile and unyielding",      domains: ["function", "fortitude"] },
];

const ASCENDANT: ArchetypeDef = {
  key: "ascendant", name: "Ascendant", identity: "Balanced across all domains", domains: ["force", "form"],
};

export const ALL_ARCHETYPES = [...SINGLE_ARCHETYPES, ...DUAL_ARCHETYPES, ASCENDANT];

export function assignArchetype(scores: DomainScores): ArchetypeDef {
  const entries = Object.entries(scores) as [DomainKey, number][];
  entries.sort((a, b) => b[1] - a[1]);

  const top = entries[0];
  const second = entries[1];
  const lowest = entries[entries.length - 1];

  const spread = top[1] - lowest[1];
  if (spread < 15) return ASCENDANT;

  const topGap = top[1] - second[1];
  if (topGap >= 15) {
    return SINGLE_ARCHETYPES.find(a => a.domains[0] === top[0]) ?? SINGLE_ARCHETYPES[0];
  }

  const dualGap = second[1] - entries[2][1];
  if (dualGap >= 5) {
    const pair = [top[0], second[0]].sort() as [DomainKey, DomainKey];
    const dual = DUAL_ARCHETYPES.find(a => {
      const sorted = [...a.domains].sort();
      return sorted[0] === pair[0] && sorted[1] === pair[1];
    });
    if (dual) return dual;
  }

  return SINGLE_ARCHETYPES.find(a => a.domains[0] === top[0]) ?? SINGLE_ARCHETYPES[0];
}

// ── Specializations ──

export type SpecializationDef = {
  name: string;
  domain: DomainKey;
  moduleKey: string;
  replaces: string;
};

export const SPECIALIZATIONS: SpecializationDef[] = [
  { name: "Ironborn",      domain: "force",     moduleKey: "powerlifting",  replaces: "Juggernaut" },
  { name: "Olympian",      domain: "force",     moduleKey: "olympic",      replaces: "Juggernaut" },
  { name: "Sculptor",      domain: "force",     moduleKey: "bodybuilding", replaces: "Juggernaut" },
  { name: "Atlas",         domain: "force",     moduleKey: "strongman",    replaces: "Juggernaut" },
  { name: "Sage",          domain: "form",      moduleKey: "yoga",         replaces: "Sentinel"   },
  { name: "Willow",        domain: "form",      moduleKey: "pilates",      replaces: "Sentinel"   },
  { name: "Acrobat",       domain: "form",      moduleKey: "gymnastics",   replaces: "Sentinel"   },
  { name: "Marathoner",    domain: "flow",      moduleKey: "running",      replaces: "Strider"    },
  { name: "Leviathan",     domain: "flow",      moduleKey: "swimming",     replaces: "Strider"    },
  { name: "Roadrunner",    domain: "flow",      moduleKey: "cycling",      replaces: "Strider"    },
  { name: "Oarsman",       domain: "flow",      moduleKey: "rowing",       replaces: "Strider"    },
  { name: "Pugilist",      domain: "fight",     moduleKey: "boxing",       replaces: "Striker"    },
  { name: "Vanguard",      domain: "fight",     moduleKey: "kickboxing",   replaces: "Striker"    },
  { name: "Constrictor",   domain: "fight",     moduleKey: "grappling",    replaces: "Striker"    },
  { name: "Bladestorm",    domain: "fight",     moduleKey: "traditional",  replaces: "Striker"    },
  { name: "Freerunner",    domain: "function",  moduleKey: "calisthenics", replaces: "Phantom"    },
  { name: "Forgeborn",     domain: "function",  moduleKey: "crossfit",     replaces: "Phantom"    },
  { name: "Decathlete",    domain: "function",  moduleKey: "sport",        replaces: "Phantom"    },
  { name: "Eternal Warden",domain: "fortitude", moduleKey: "ultra_streak", replaces: "Warden"     },
  { name: "Siegebreaker",  domain: "fortitude", moduleKey: "plateau",      replaces: "Warden"     },
];

export function detectSpecialization(
  archetype: ArchetypeDef,
  dominantModuleKey: string | null,
): SpecializationDef | null {
  if (!dominantModuleKey) return null;
  const primaryDomain = archetype.domains[0];
  return SPECIALIZATIONS.find(
    s => s.domain === primaryDomain && s.moduleKey === dominantModuleKey
  ) ?? null;
}

// ── XP Awards ──

export const XP_AWARDS = {
  workout_complete_base: 50,
  workout_complete_max: 150,
  set_complete_base: 5,
  set_compound_bonus: 10,
  pr_hit: 100,
  form_check_80: 50,
  form_check_90: 100,
  challenge_weekly: 200,
  challenge_monthly: 500,
  rivalry_win: 150,
  rivalry_loss: 50,
  rivalry_draw: 100,
  streak_7: 75,
  first_workout_of_day: 25,
} as const;

export function computeWorkoutXp(params: {
  durationMinutes: number;
  setCount: number;
  compoundSetCount: number;
  prCount: number;
  isFirstOfDay: boolean;
}): number {
  const durationFactor = clamp(params.durationMinutes / 60, 0.5, 1.5);
  const base = Math.round(XP_AWARDS.workout_complete_base * durationFactor);
  const workoutXp = Math.min(base, XP_AWARDS.workout_complete_max);

  const setXp = params.setCount * XP_AWARDS.set_complete_base
    + params.compoundSetCount * XP_AWARDS.set_compound_bonus;

  const prXp = params.prCount * XP_AWARDS.pr_hit;
  const dailyBonus = params.isFirstOfDay ? XP_AWARDS.first_workout_of_day : 0;

  return workoutXp + setXp + prXp + dailyBonus;
}

// ── Display Helpers ──

export function formatRankDisplay(rankName: string, reforgeCount: number): string {
  const reforge = getReforgeInfo(reforgeCount);
  if (reforge.isEternal) return `${rankName} ${reforge.stars} — Eternal`;
  if (reforge.count > 0) return `${rankName} ${reforge.stars}`;
  return rankName;
}

export function formatArchetypeDisplay(archetype: ArchetypeDef, spec: SpecializationDef | null): string {
  if (spec) return `${archetype.name} — ${spec.name}`;
  return archetype.name;
}

// ── Progressive Unlocking ──

export type UnlockTier = "basic" | "domains" | "challenges" | "full";

export function getUnlockTier(level: number): UnlockTier {
  if (level >= 31) return "full";
  if (level >= 16) return "challenges";
  if (level >= 6) return "domains";
  return "basic";
}

export function isFeatureUnlocked(level: number, feature: string): boolean {
  const tier = getUnlockTier(level);
  switch (feature) {
    case "rank_badge":
    case "xp_bar":
    case "basic_stats":
      return true;
    case "domain_radar":
    case "archetype":
      return tier !== "basic";
    case "challenges":
    case "rivalry":
      return tier === "challenges" || tier === "full";
    case "specialization":
    case "full_character":
    case "history_tabs":
      return tier === "full";
    default:
      return false;
  }
}

// ── Loot Drop Chances ──

export type Rarity = "common" | "rare" | "epic" | "legendary";

export const RARITY_COLORS: Record<Rarity, string> = {
  common: "161 161 170",
  rare: "59 130 246",
  epic: "139 92 246",
  legendary: "249 115 22",
};

export function rollLootDrop(source: "workout" | "rivalry_win" | "challenge_weekly" | "challenge_monthly" | "rank_up" | "reforge"): {
  dropped: boolean;
  rarity: Rarity | null;
} {
  const rand = Math.random();

  const config: Record<string, { chance: number; common: number; rare: number; epic: number }> = {
    workout:           { chance: 0.15, common: 0.80, rare: 0.18, epic: 0.02 },
    rivalry_win:       { chance: 0.30, common: 0.60, rare: 0.30, epic: 0.10 },
    challenge_weekly:  { chance: 1.00, common: 0.50, rare: 0.40, epic: 0.10 },
    challenge_monthly: { chance: 1.00, common: 0.00, rare: 0.50, epic: 0.40 },
    rank_up:           { chance: 1.00, common: 0.00, rare: 0.60, epic: 0.35 },
    reforge:           { chance: 1.00, common: 0.00, rare: 0.00, epic: 0.00 },
  };

  const c = config[source];
  if (rand > c.chance) return { dropped: false, rarity: null };

  const rarityRoll = Math.random();
  if (source === "reforge") return { dropped: true, rarity: "legendary" };
  if (rarityRoll < c.common) return { dropped: true, rarity: "common" };
  if (rarityRoll < c.common + c.rare) return { dropped: true, rarity: "rare" };
  if (rarityRoll < c.common + c.rare + c.epic) return { dropped: true, rarity: "epic" };
  return { dropped: true, rarity: "legendary" };
}

// ── Utilities ──

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const DOMAIN_KEYS: DomainKey[] = ["force", "form", "flow", "fight", "function", "fortitude"];
