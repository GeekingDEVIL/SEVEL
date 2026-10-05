export type CameraAngle = "side" | "front" | "angle45";

type GuideInfo = {
    angle: CameraAngle;
    label: string;
    tip: string;
};

const EXERCISE_PATTERNS: { keywords: string[]; guide: GuideInfo }[] = [
    {
        keywords: ["squat", "goblet", "front squat", "back squat", "zercher"],
        guide: { angle: "side", label: "Side View", tip: "Place phone at hip height, 6-8 feet away" },
    },
    {
        keywords: ["deadlift", "rdl", "romanian", "sumo", "hip hinge", "good morning"],
        guide: { angle: "side", label: "Side View", tip: "Place phone at hip height to see back angle" },
    },
    {
        keywords: ["overhead press", "ohp", "push press", "military press", "shoulder press"],
        guide: { angle: "angle45", label: "45° Angle", tip: "Place phone at a slight angle to see bar path + symmetry" },
    },
    {
        keywords: ["bench", "incline press", "decline press", "chest press", "floor press"],
        guide: { angle: "side", label: "Side View", tip: "Place phone at bench height to see bar path" },
    },
    {
        keywords: ["lunge", "split squat", "bulgarian", "step up", "walking lunge"],
        guide: { angle: "front", label: "Front View", tip: "Place phone in front to check knee tracking" },
    },
    {
        keywords: ["pull up", "pullup", "chin up", "chinup", "lat pulldown", "pulldown"],
        guide: { angle: "front", label: "Front View", tip: "Place phone in front to check symmetry" },
    },
    {
        keywords: ["row", "cable row", "barbell row", "dumbbell row", "bent over"],
        guide: { angle: "side", label: "Side View", tip: "Place phone at the side to check body sway" },
    },
    {
        keywords: ["curl", "bicep", "hammer curl", "preacher"],
        guide: { angle: "front", label: "Front View", tip: "Place phone in front to check elbow position" },
    },
    // MA technique patterns
    {
        keywords: ["jab", "cross", "straight", "punch", "hook", "uppercut", "overhand"],
        guide: { angle: "angle45", label: "45° Angle", tip: "Stand 6-8 feet away at a slight angle to see rotation + extension" },
    },
    {
        keywords: ["roundhouse", "front kick", "side kick", "teep", "push kick", "spinning", "back kick", "axe kick"],
        guide: { angle: "side", label: "Side View", tip: "Place phone at hip height to the side — shows chamber + extension" },
    },
    {
        keywords: ["elbow", "sok", "spinning elbow"],
        guide: { angle: "angle45", label: "45° Angle", tip: "Angle view shows elbow arc and hip rotation" },
    },
    {
        keywords: ["knee", "flying knee", "clinch knee", "spear knee"],
        guide: { angle: "side", label: "Side View", tip: "Side view shows knee drive height and hip thrust" },
    },
    {
        keywords: ["stance", "guard", "fighting stance", "orthodox", "southpaw"],
        guide: { angle: "front", label: "Front View", tip: "Face the camera to check stance width and hand position" },
    },
    {
        keywords: ["kata", "poomsae", "form", "hyung", "pattern"],
        guide: { angle: "front", label: "Front View", tip: "Full body in frame — check balance and symmetry through the whole form" },
    },
    {
        keywords: ["slip", "bob", "weave", "parry", "block", "check", "defense"],
        guide: { angle: "front", label: "Front View", tip: "Face the camera to check head movement and guard position" },
    },
];

export function getExerciseGuide(exerciseName: string): GuideInfo {
    const lower = exerciseName.toLowerCase();
    for (const { keywords, guide } of EXERCISE_PATTERNS) {
        if (keywords.some((k) => lower.includes(k))) return guide;
    }
    return { angle: "front", label: "Any Angle", tip: "Position your full body in frame" };
}

export type MaExerciseTypeGuide = "stance" | "punch" | "kick" | "elbow" | "knee" | "form";

export function getMaExerciseType(category: string, techniqueName: string): MaExerciseTypeGuide {
    const cat = category.toLowerCase();
    const name = techniqueName.toLowerCase();
    if (cat === "stances" || cat === "stance" || name.includes("stance") || name.includes("guard")) return "stance";
    if (cat === "kicks" || cat === "kick" || name.includes("kick") || name.includes("teep")) return "kick";
    if (cat === "elbows" || cat === "elbow" || name.includes("elbow") || name.includes("sok")) return "elbow";
    if (cat === "knees" || cat === "knee" || name.includes("knee")) return "knee";
    if (cat === "forms" || name.includes("kata") || name.includes("poomsae") || name.includes("form")) return "form";
    return "punch";
}

// SVG silhouette paths for each camera angle (simplified body outlines)
// Viewbox: 0 0 100 200, drawn at ~70% frame height
export const SILHOUETTE_PATHS: Record<CameraAngle, string> = {
    side: [
        // Head
        "M50,18 a8,9 0 1,0 0.1,0",
        // Neck
        "M50,27 L50,34",
        // Torso (slight lean forward for athletic stance)
        "M50,34 L48,36 L45,50 L44,65",
        // Chest/shoulder
        "M50,34 L56,36",
        // Front arm
        "M56,36 L58,48 L55,58",
        // Back arm
        "M50,34 L44,36",
        // Hip
        "M44,65 L48,67",
        // Front leg
        "M48,67 L50,90 L52,110 L50,115",
        // Back leg
        "M44,65 L40,88 L42,110 L40,115",
        // Foot hints
        "M50,115 L56,116", "M40,115 L34,116",
    ].join(" "),

    front: [
        // Head
        "M50,18 a8,9 0 1,0 0.1,0",
        // Neck
        "M50,27 L50,34",
        // Shoulders
        "M50,34 L35,38 M50,34 L65,38",
        // Torso
        "M35,38 L37,65 M65,38 L63,65",
        // Waist
        "M37,65 L42,67 M63,65 L58,67",
        // Left arm
        "M35,38 L30,55 L32,68",
        // Right arm
        "M65,38 L70,55 L68,68",
        // Left leg
        "M42,67 L38,90 L36,115",
        // Right leg
        "M58,67 L62,90 L64,115",
        // Feet
        "M36,115 L32,116", "M64,115 L68,116",
        // Center line
        "M50,34 L50,67",
    ].join(" "),

    angle45: [
        // Head
        "M48,18 a8,9 0 1,0 0.1,0",
        // Neck
        "M48,27 L48,34",
        // Shoulders (offset for 3/4 view)
        "M48,34 L34,37 M48,34 L60,38",
        // Torso
        "M34,37 L36,65 M60,38 L58,65",
        // Waist
        "M36,65 L40,67 M58,65 L54,67",
        // Near arm
        "M60,38 L64,54 L62,66",
        // Far arm
        "M34,37 L30,52 L32,64",
        // Near leg
        "M54,67 L58,90 L60,115",
        // Far leg
        "M40,67 L36,90 L34,115",
        // Feet
        "M60,115 L64,116", "M34,115 L30,116",
        // Center
        "M48,34 L47,67",
    ].join(" "),
};
