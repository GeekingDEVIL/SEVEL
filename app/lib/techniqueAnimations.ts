// Stick-figure animation data for MA technique visualizations (spec items 36-37)

export type Vec2 = [number, number];

export type Skeleton = {
  hd: Vec2; sL: Vec2; sR: Vec2;
  eL: Vec2; eR: Vec2; wL: Vec2; wR: Vec2;
  hp: Vec2; kL: Vec2; kR: Vec2; aL: Vec2; aR: Vec2;
};

export type AngleMarker = {
  joints: [keyof Skeleton, keyof Skeleton, keyof Skeleton];
  label?: string;
};

export type MistakePose = {
  pose: Skeleton;
  label: string;
};

export type AnimFrame = {
  pose: Skeleton;
  caption: string;
  active?: (keyof Skeleton)[];
  trail?: keyof Skeleton;
  powerChain?: (keyof Skeleton)[];
  weight?: "L" | "R" | "even";
  angles?: AngleMarker[];
  mistake?: MistakePose;
  opponent?: Skeleton;
  breath?: "inhale" | "exhale";
};

export type AnimCategory =
  | "strike" | "defense" | "kick" | "elbow" | "knee" | "stance"
  | "grappling" | "footwork" | "conditioning" | "forms";

export type TechniqueAnim = {
  frames: AnimFrame[];
  category: AnimCategory;
  range?: "close" | "mid" | "long";
};

// ViewBox: 0 0 200 290

function mk(base: Skeleton, o: Partial<Skeleton>): Skeleton {
  return { ...base, ...o };
}

// ── Boxing guard (orthodox, facing right) ──
const G: Skeleton = {
  hd: [100, 48], sL: [85, 82], sR: [115, 78],
  eL: [74, 108], eR: [130, 92], wL: [88, 78], wR: [136, 66],
  hp: [100, 158], kL: [78, 200], kR: [120, 198],
  aL: [66, 252], aR: [134, 248],
};

// ── Muay Thai guard (more upright, hands higher) ──
const MT: Skeleton = {
  hd: [100, 46], sL: [86, 78], sR: [114, 76],
  eL: [74, 104], eR: [126, 88], wL: [86, 68], wR: [130, 60],
  hp: [100, 154], kL: [84, 198], kR: [116, 194],
  aL: [76, 248], aR: [128, 244],
};

// ── Opponent guard (facing left, mirrored) ──
const OPP: Skeleton = {
  hd: [178, 50], sL: [190, 80], sR: [166, 82],
  eL: [198, 106], eR: [150, 96], wL: [186, 80], wR: [144, 70],
  hp: [178, 158], kL: [196, 200], kR: [160, 198],
  aL: [208, 250], aR: [146, 248],
};

// ── Boxing Techniques ──

const JAB: TechniqueAnim = {
  category: "strike", range: "long",
  frames: [
    { pose: G, caption: "Start in guard — chin tucked, hands up", breath: "inhale" },
    {
      pose: mk(G, { wR: [172, 64], eR: [150, 72], sR: [119, 76] }),
      caption: "Extend lead hand straight from chin",
      active: ["wR", "eR"], trail: "wR", breath: "exhale",
    },
    {
      pose: mk(G, { wR: [194, 62], eR: [168, 66], sR: [124, 74], hd: [103, 48], hp: [103, 156] }),
      caption: "Full extension — rotate fist, snap!",
      active: ["wR", "eR", "sR"], trail: "wR", breath: "exhale",
      powerChain: ["aR", "kR", "hp", "sR", "eR", "wR"],
      opponent: mk(OPP, { hd: [180, 52] }),
      mistake: {
        pose: mk(G, { wR: [194, 62], eR: [168, 66], sR: [124, 74], hd: [103, 48], hp: [103, 156], wL: [74, 120], eL: [72, 108] }),
        label: "Rear hand dropped",
      },
    },
    { pose: G, caption: "Snap back to guard immediately", breath: "inhale" },
  ],
};

const CROSS: TechniqueAnim = {
  category: "strike", range: "long",
  frames: [
    { pose: G, caption: "Guard position — weight balanced", breath: "inhale" },
    {
      pose: mk(G, {
        sL: [98, 76], eL: [120, 84], wL: [150, 66],
        sR: [110, 84], wR: [118, 74],
        hp: [104, 156], kL: [84, 198], aL: [78, 248],
      }),
      caption: "Rotate hips & rear shoulder forward",
      active: ["wL", "eL", "sL"], trail: "wL",
    },
    {
      pose: mk(G, {
        sL: [112, 72], eL: [152, 64], wL: [194, 60],
        sR: [104, 86], eR: [116, 96], wR: [110, 78],
        hd: [106, 46], hp: [108, 154], kL: [92, 196], aL: [86, 246],
      }),
      caption: "Drive through target — full hip rotation",
      active: ["wL", "eL", "sL"], trail: "wL", breath: "exhale",
      powerChain: ["aL", "kL", "hp", "sL", "eL", "wL"],
      opponent: mk(OPP, { hd: [180, 50] }),
      mistake: {
        pose: mk(G, { sL: [92, 76], eL: [130, 72], wL: [180, 62], hd: [100, 50], hp: [100, 158] }),
        label: "No hip rotation",
      },
    },
    { pose: G, caption: "Return hand to guard, reset hips" },
  ],
};

const HOOK: TechniqueAnim = {
  category: "strike", range: "mid",
  frames: [
    { pose: G, caption: "Guard position — elbows tight" },
    {
      pose: mk(G, { eR: [138, 72], wR: [126, 58], sR: [120, 76] }),
      caption: "Lift elbow to shoulder height, arm at 90°",
      active: ["eR", "wR"],
      angles: [{ joints: ["sR", "eR", "wR"], label: "90°" }],
    },
    {
      pose: mk(G, {
        sR: [126, 72], eR: [148, 64], wR: [146, 50],
        sL: [80, 86], hd: [96, 50], hp: [96, 160],
      }),
      caption: "Swing through — pivot on lead foot, rotate torso",
      active: ["wR", "eR", "sR"], trail: "wR", breath: "exhale",
      powerChain: ["aR", "kR", "hp", "sR", "eR", "wR"],
      angles: [{ joints: ["sR", "eR", "wR"], label: "90°" }],
      mistake: {
        pose: mk(G, { sR: [126, 72], eR: [162, 62], wR: [190, 50], sL: [80, 86], hd: [96, 50], hp: [96, 160] }),
        label: "Arm too straight",
      },
    },
    { pose: G, caption: "Back to guard — don't drop the hand" },
  ],
};

const UPPERCUT: TechniqueAnim = {
  category: "strike", range: "close",
  frames: [
    { pose: G, caption: "Guard position — stay balanced" },
    {
      pose: mk(G, {
        wL: [80, 112], eL: [72, 120],
        hd: [100, 52], kL: [80, 210], kR: [122, 206],
      }),
      caption: "Dip — bend knees, drop rear hand",
      active: ["wL", "eL", "kL", "kR"],
    },
    {
      pose: mk(G, {
        wL: [96, 48], eL: [84, 76], sL: [88, 76],
        hd: [104, 44], hp: [104, 154], kL: [82, 198], kR: [122, 194],
      }),
      caption: "Drive upward — legs push, fist rises to chin",
      active: ["wL", "eL", "sL"], trail: "wL", breath: "exhale",
      powerChain: ["aL", "kL", "hp", "sL", "eL", "wL"],
      angles: [{ joints: ["sL", "eL", "wL"] }],
    },
    { pose: G, caption: "Return to guard" },
  ],
};

const SLIP: TechniqueAnim = {
  category: "defense",
  frames: [
    { pose: G, caption: "Guard — eyes on opponent", opponent: OPP },
    {
      pose: mk(G, {
        hd: [116, 58], sL: [92, 86], sR: [124, 82],
        eL: [80, 112], eR: [138, 96],
        wL: [94, 82], wR: [140, 70],
        hp: [104, 158], kR: [124, 196],
      }),
      caption: "Bend at waist — head moves off centerline",
      active: ["hd"],
      opponent: mk(OPP, { wR: [108, 68], eR: [130, 76], sR: [158, 80] }),
    },
    {
      pose: mk(G, {
        hd: [126, 66], sL: [96, 90], sR: [130, 84],
        eL: [84, 114], eR: [142, 98],
        wL: [98, 86], wR: [144, 72],
        hp: [106, 160], kR: [128, 194],
      }),
      caption: "Deep slip — punch sails over your shoulder",
      active: ["hd"],
      opponent: mk(OPP, { wR: [94, 64], eR: [120, 70], sR: [156, 78] }),
    },
    { pose: G, caption: "Rise back to guard — ready to counter", opponent: OPP },
  ],
};

const BOB_WEAVE: TechniqueAnim = {
  category: "defense",
  frames: [
    { pose: G, caption: "Guard — stay compact", opponent: OPP },
    {
      pose: mk(G, {
        hd: [100, 72], sL: [86, 98], sR: [114, 96],
        eL: [76, 120], eR: [128, 110],
        wL: [88, 96], wR: [132, 88],
        kL: [76, 216], kR: [118, 212],
      }),
      caption: "Duck straight down — bend at the knees",
      active: ["hd", "kL", "kR"],
      opponent: mk(OPP, { sR: [158, 78], eR: [138, 68], wR: [120, 58] }),
    },
    {
      pose: mk(G, {
        hd: [120, 70], sL: [98, 96], sR: [128, 92],
        eL: [88, 118], eR: [140, 104],
        wL: [100, 92], wR: [142, 82],
        hp: [106, 160], kL: [82, 214], kR: [126, 208],
      }),
      caption: "Weave to the side — move under the punch",
      active: ["hd"],
      opponent: mk(OPP, { sR: [160, 76], eR: [134, 64], wR: [112, 52] }),
    },
    {
      pose: mk(G, {
        hd: [112, 52], sL: [92, 84], sR: [122, 80],
        eL: [80, 110], eR: [134, 92],
        wL: [92, 78], wR: [138, 68],
        hp: [104, 158], kL: [80, 204], kR: [124, 198],
      }),
      caption: "Rise on the other side — ready to counter",
      opponent: OPP,
    },
  ],
};

const STANCE: TechniqueAnim = {
  category: "stance",
  frames: [
    { pose: G, caption: "Orthodox stance — lead hand & foot forward, chin tucked, hands up" },
  ],
};

// ── Muay Thai Techniques ──

const TEEP: TechniqueAnim = {
  category: "kick", range: "long",
  frames: [
    { pose: MT, caption: "Muay Thai guard — hands high, elbows tight" },
    {
      pose: mk(MT, {
        kR: [118, 154], aR: [126, 186],
        hp: [98, 156], kL: [82, 202],
      }),
      caption: "Chamber — lift front knee to hip height",
      active: ["kR", "aR"],
    },
    {
      pose: mk(MT, {
        kR: [140, 148], aR: [176, 146],
        hp: [96, 158], hd: [98, 48], kL: [80, 204],
      }),
      caption: "Push — extend leg straight, drive with hips",
      active: ["kR", "aR"], trail: "aR", breath: "exhale",
      powerChain: ["aL", "kL", "hp", "kR", "aR"],
      angles: [{ joints: ["hp", "kR", "aR"] }],
    },
    { pose: MT, caption: "Retract leg, return to guard" },
  ],
};

const ROUNDHOUSE: TechniqueAnim = {
  category: "kick", range: "mid",
  frames: [
    { pose: MT, caption: "Guard — weight even, ready to fire" },
    {
      pose: mk(MT, {
        kL: [88, 170], aL: [78, 200],
        hp: [104, 156], aR: [130, 246],
      }),
      caption: "Step & pivot — turn on front foot, knee lifts",
      active: ["kL", "aL"],
    },
    {
      pose: mk(MT, {
        kL: [114, 116], aL: [148, 96],
        sL: [78, 84], sR: [108, 80], hd: [94, 50], hp: [106, 158],
      }),
      caption: "Kick through — shin connects, hips fully turned",
      active: ["kL", "aL"], trail: "aL", breath: "exhale",
      powerChain: ["aR", "kR", "hp", "kL", "aL"],
      angles: [{ joints: ["hp", "kL", "aL"] }],
      mistake: {
        pose: mk(MT, { kL: [100, 140], aL: [120, 120], hp: [100, 158], hd: [98, 48] }),
        label: "Knee not turned over",
      },
    },
    { pose: MT, caption: "Follow through and recover to guard" },
  ],
};

const LOW_KICK: TechniqueAnim = {
  category: "kick", range: "mid",
  frames: [
    { pose: MT, caption: "Guard — weight balanced" },
    {
      pose: mk(MT, {
        kL: [90, 180], aL: [80, 214],
        hp: [104, 156], aR: [132, 246],
      }),
      caption: "Small step — pivot on front foot",
      active: ["kL", "aL"],
    },
    {
      pose: mk(MT, {
        kL: [120, 178], aL: [156, 174],
        sL: [80, 82], hd: [96, 48], hp: [106, 156],
      }),
      caption: "Chop the thigh — shin cuts through low",
      active: ["kL", "aL"], trail: "aL",
      powerChain: ["aR", "kR", "hp", "kL", "aL"],
    },
    { pose: MT, caption: "Recover foot, return to guard" },
  ],
};

const ELBOW: TechniqueAnim = {
  category: "elbow", range: "close",
  frames: [
    { pose: MT, caption: "Guard — close range" },
    {
      pose: mk(MT, { eR: [134, 68], wR: [118, 60], sR: [118, 74] }),
      caption: "Chamber — lift elbow, forearm folds in",
      active: ["eR"],
    },
    {
      pose: mk(MT, {
        eR: [150, 58], wR: [134, 56], sR: [124, 68],
        sL: [80, 82], hd: [96, 48], hp: [98, 156],
      }),
      caption: "Slash through — elbow cuts horizontally",
      active: ["eR"], trail: "eR", breath: "exhale",
      powerChain: ["aR", "kR", "hp", "sR", "eR"],
      angles: [{ joints: ["sR", "eR", "wR"] }],
    },
    { pose: MT, caption: "Return to guard" },
  ],
};

const KNEE: TechniqueAnim = {
  category: "knee", range: "close",
  frames: [
    { pose: MT, caption: "Guard — close range, ready to clinch" },
    {
      pose: mk(MT, {
        wL: [112, 62], wR: [118, 58],
        eL: [96, 80], eR: [120, 72],
      }),
      caption: "Grab — pull opponent's head/neck in",
      active: ["wL", "wR"],
    },
    {
      pose: mk(MT, {
        kR: [124, 134], aR: [130, 168],
        hp: [102, 152], hd: [104, 44],
        wL: [110, 58], wR: [116, 54],
      }),
      caption: "Drive knee up — pull head down, knee rises",
      active: ["kR"], trail: "kR", breath: "exhale",
      powerChain: ["aL", "kL", "hp", "kR"],
      angles: [{ joints: ["hp", "kR", "aR"] }],
    },
    { pose: MT, caption: "Plant foot, return to guard" },
  ],
};

const MT_STANCE: TechniqueAnim = {
  category: "stance",
  frames: [
    { pose: MT, caption: "Muay Thai stance — tall, balanced, hands high, elbows protecting ribs" },
  ],
};

// ── Boxing Expanded Techniques ──

const PARRY: TechniqueAnim = {
  category: "defense",
  frames: [
    { pose: G, caption: "Guard — hands up, watching for the punch", opponent: OPP },
    {
      pose: mk(G, {
        wR: [150, 68], eR: [136, 78],
        hd: [98, 50], sR: [116, 78],
      }),
      caption: "Tap — deflect the incoming punch with your lead palm",
      active: ["wR"],
      opponent: mk(OPP, { wR: [116, 66], eR: [138, 74], sR: [162, 80] }),
    },
    {
      pose: mk(G, {
        wR: [162, 72], eR: [144, 76],
        hd: [96, 50], sR: [118, 78],
      }),
      caption: "Redirect — guide the punch past your centerline",
      active: ["wR"], trail: "wR",
      opponent: mk(OPP, { wR: [106, 62], eR: [128, 70], sR: [158, 78] }),
    },
    { pose: G, caption: "Reset — hand snaps back to guard", opponent: OPP },
  ],
};

const CATCH: TechniqueAnim = {
  category: "defense",
  frames: [
    { pose: G, caption: "Guard — glove near chin, elbow tight" },
    {
      pose: mk(G, {
        wL: [82, 68], eL: [70, 92],
        wR: [130, 60], eR: [124, 80],
      }),
      caption: "Open palm — receive the hook in your glove",
      active: ["wL"],
    },
    {
      pose: mk(G, {
        wL: [88, 72], eL: [72, 94],
        sL: [84, 84], hd: [100, 52],
      }),
      caption: "Absorb — clamp the shot, brace with legs",
      active: ["wL"],
    },
    { pose: G, caption: "Return to guard — stay tight" },
  ],
};

const BODY_JAB: TechniqueAnim = {
  category: "strike",
  frames: [
    { pose: G, caption: "Guard position — ready to go low" },
    {
      pose: mk(G, {
        hd: [102, 58], sR: [118, 84], eR: [134, 92],
        wR: [156, 100], hp: [102, 162],
        kR: [122, 204],
      }),
      caption: "Dip — bend knees, lower your level",
      active: ["wR", "eR", "kR"],
    },
    {
      pose: mk(G, {
        hd: [104, 60], sR: [120, 84], eR: [152, 94],
        wR: [190, 100], hp: [104, 162],
        kR: [124, 206],
      }),
      caption: "Extend — drive jab to the body, stay low",
      active: ["wR", "eR"], trail: "wR",
      powerChain: ["aR", "kR", "hp", "sR", "eR", "wR"],
    },
    { pose: G, caption: "Rise back to guard" },
  ],
};

const BODY_CROSS: TechniqueAnim = {
  category: "strike",
  frames: [
    { pose: G, caption: "Guard — weight on rear foot" },
    {
      pose: mk(G, {
        hd: [104, 58], sL: [92, 82], eL: [110, 94],
        wL: [140, 104], sR: [112, 86],
        hp: [106, 162], kL: [86, 206],
      }),
      caption: "Drop & rotate — bend knees, turn hips",
      active: ["wL", "eL"],
    },
    {
      pose: mk(G, {
        hd: [108, 56], sL: [102, 78], eL: [148, 92],
        wL: [190, 98], sR: [106, 88], eR: [116, 96], wR: [110, 82],
        hp: [110, 160], kL: [92, 204],
      }),
      caption: "Drive through — full hip rotation, punch to body",
      active: ["wL", "eL"], trail: "wL",
      powerChain: ["aL", "kL", "hp", "sL", "eL", "wL"],
    },
    { pose: G, caption: "Return to guard, reset hips" },
  ],
};

const BODY_HOOK: TechniqueAnim = {
  category: "strike",
  frames: [
    { pose: G, caption: "Guard — elbows protecting ribs" },
    {
      pose: mk(G, {
        hd: [100, 56], sR: [118, 82], eR: [136, 86],
        wR: [130, 78], hp: [102, 160],
        kR: [122, 206],
      }),
      caption: "Dip — drop level, load the hook",
      active: ["eR", "kR"],
    },
    {
      pose: mk(G, {
        hd: [96, 56], sR: [124, 78], eR: [146, 82],
        wR: [148, 72], sL: [82, 86],
        hp: [98, 162], kR: [126, 204],
      }),
      caption: "Rip — swing through the body, pivot on lead foot",
      active: ["wR", "eR"], trail: "wR",
      powerChain: ["aR", "kR", "hp", "sR", "eR", "wR"],
    },
    { pose: G, caption: "Back to guard — don't stay low" },
  ],
};

const LEAD_UPPERCUT: TechniqueAnim = {
  category: "strike",
  frames: [
    { pose: G, caption: "Guard — balanced, chin tucked" },
    {
      pose: mk(G, {
        wR: [132, 100], eR: [128, 94],
        kR: [122, 208], hd: [100, 54],
      }),
      caption: "Dip — drop lead hand, bend lead knee",
      active: ["wR", "eR", "kR"],
    },
    {
      pose: mk(G, {
        wR: [136, 52], eR: [134, 72], sR: [122, 76],
        hd: [104, 46], hp: [104, 156],
      }),
      caption: "Drive up — legs push, fist rises through target",
      active: ["wR", "eR"], trail: "wR",
      powerChain: ["aR", "kR", "hp", "sR", "eR", "wR"],
    },
    { pose: G, caption: "Return to guard" },
  ],
};

const CHECK_HOOK: TechniqueAnim = {
  category: "strike",
  frames: [
    { pose: G, caption: "Guard — opponent closing in" },
    {
      pose: mk(G, {
        aR: [128, 250], kR: [116, 200],
        hd: [96, 48], sR: [112, 78],
      }),
      caption: "Pivot — turn on lead foot as they come forward",
      active: ["aR", "kR"],
    },
    {
      pose: mk(G, {
        sR: [124, 74], eR: [146, 66], wR: [144, 52],
        sL: [82, 84], hd: [94, 50], hp: [96, 160],
        aR: [124, 252], kR: [114, 202],
      }),
      caption: "Hook — catch them coming in, you're already turning",
      active: ["wR", "eR"], trail: "wR",
      powerChain: ["aR", "kR", "hp", "sR", "eR", "wR"],
    },
    { pose: G, caption: "Exit at an angle — you're already off line" },
  ],
};

const OVERHAND: TechniqueAnim = {
  category: "strike",
  frames: [
    { pose: G, caption: "Guard — weight loaded on rear foot" },
    {
      pose: mk(G, {
        sL: [96, 78], eL: [112, 72], wL: [120, 56],
        hd: [104, 48], hp: [106, 156],
      }),
      caption: "Wind up — rear hand rises above shoulder height",
      active: ["wL", "eL"],
    },
    {
      pose: mk(G, {
        sL: [108, 74], eL: [146, 68], wL: [178, 78],
        sR: [104, 84], eR: [116, 94], wR: [110, 78],
        hd: [108, 46], hp: [112, 154], kL: [92, 198],
      }),
      caption: "Arc over — loop over their guard, crash down",
      active: ["wL", "eL"], trail: "wL",
      powerChain: ["aL", "kL", "hp", "sL", "eL", "wL"],
    },
    { pose: G, caption: "Recover — don't fall forward" },
  ],
};

const DOUBLE_JAB: TechniqueAnim = {
  category: "strike",
  frames: [
    { pose: G, caption: "Guard — feeder position" },
    {
      pose: mk(G, { wR: [170, 64], eR: [148, 72], sR: [120, 76] }),
      caption: "Jab 1 — quick snap, not full power",
      active: ["wR", "eR"], trail: "wR",
    },
    {
      pose: mk(G, { wR: [140, 66], eR: [134, 74] }),
      caption: "Retract — pull back just enough",
      active: ["wR"],
    },
    {
      pose: mk(G, {
        wR: [192, 62], eR: [166, 66], sR: [124, 74],
        hd: [103, 48], hp: [103, 156],
      }),
      caption: "Jab 2 — now commit, full extension",
      active: ["wR", "eR", "sR"], trail: "wR",
      powerChain: ["aR", "kR", "hp", "sR", "eR", "wR"],
    },
  ],
};

const SHOULDER_ROLL: TechniqueAnim = {
  category: "defense",
  frames: [
    { pose: mk(G, {
        sL: [80, 84], wL: [72, 104], eL: [68, 102],
        wR: [130, 62],
      }),
      caption: "Philly shell — lead hand low, rear hand high, lead shoulder forward" },
    {
      pose: mk(G, {
        sL: [82, 80], sR: [118, 82], eL: [68, 96],
        wL: [74, 96], wR: [124, 64],
        hd: [104, 54], hp: [106, 158],
      }),
      caption: "Roll — raise lead shoulder to chin, let the punch slide off",
      active: ["sL"],
    },
    {
      pose: mk(G, {
        sL: [86, 76], sR: [120, 80],
        eL: [72, 92], wL: [78, 90],
        wR: [128, 62], hd: [108, 52], hp: [108, 156],
      }),
      caption: "Deflect — shoulder catches the shot, chin stays protected",
      active: ["sL"],
    },
    { pose: mk(G, {
        sL: [80, 84], wL: [72, 104], eL: [68, 102],
        wR: [130, 62],
      }),
      caption: "Reset shell — ready to counter" },
  ],
};

const PULL_COUNTER: TechniqueAnim = {
  category: "strike",
  frames: [
    { pose: G, caption: "Guard — bait with head position" },
    {
      pose: mk(G, {
        hd: [92, 54], hp: [94, 162],
        sL: [80, 86], sR: [110, 82],
        kL: [72, 204], aL: [60, 254],
      }),
      caption: "Pull — lean back, let their punch fall short",
      active: ["hd"],
    },
    {
      pose: mk(G, {
        sL: [100, 78], eL: [140, 70], wL: [180, 64],
        sR: [108, 84], wR: [114, 76],
        hd: [106, 48], hp: [108, 156],
      }),
      caption: "Fire — straight right as they're extended and off-balance",
      active: ["wL", "eL"], trail: "wL",
      powerChain: ["aL", "kL", "hp", "sL", "eL", "wL"],
    },
    { pose: G, caption: "Return to guard" },
  ],
};

const FEINT: TechniqueAnim = {
  category: "strike",
  frames: [
    { pose: G, caption: "Guard — relaxed, don't telegraph" },
    {
      pose: mk(G, {
        wR: [148, 64], eR: [136, 74], sR: [118, 76],
        hd: [102, 48], hp: [102, 156],
      }),
      caption: "Show — start the jab motion, sell it with your body",
      active: ["wR", "eR"],
    },
    {
      pose: mk(G, {
        wR: [138, 66], eR: [132, 76],
        hd: [100, 50],
      }),
      caption: "Freeze — pull back, read their reaction",
      active: ["wR"],
    },
    { pose: G, caption: "Reset — now attack their opening" },
  ],
};

const STEP_BACK: TechniqueAnim = {
  category: "footwork",
  frames: [
    { pose: G, caption: "Guard — on the balls of your feet" },
    {
      pose: mk(G, {
        aL: [54, 254], kL: [68, 202],
        aR: [120, 250], kR: [108, 200],
        hp: [90, 160], hd: [90, 50],
      }),
      caption: "Push — drive off lead foot, rear foot steps back first",
      active: ["aL", "aR"],
    },
    {
      pose: mk(G, {
        aL: [48, 254], kL: [62, 204],
        aR: [114, 250], kR: [102, 200],
        hp: [86, 160], hd: [86, 50],
        sL: [72, 84], sR: [102, 80],
        eL: [62, 110], eR: [118, 94],
        wL: [74, 80], wR: [124, 68],
      }),
      caption: "Land — maintain distance, keep hands up",
      active: ["aL", "aR"],
    },
    { pose: G, caption: "Reset stance — ready to counter" },
  ],
};

// ── Muay Thai Expanded Techniques ──

const SWITCH_KICK: TechniqueAnim = {
  category: "kick",
  frames: [
    { pose: MT, caption: "Stance — orthodox guard" },
    {
      pose: mk(MT, {
        aL: [86, 246], kL: [90, 196],
        aR: [118, 248], kR: [108, 198],
        hp: [98, 156],
      }),
      caption: "Switch — swap your feet quickly in place",
      active: ["aL", "aR"],
    },
    {
      pose: mk(MT, {
        kR: [90, 172], aR: [82, 204],
        hp: [104, 156],
      }),
      caption: "Chamber — now the power leg is forward, knee up",
      active: ["kR", "aR"],
    },
    {
      pose: mk(MT, {
        kR: [116, 120], aR: [152, 100],
        sL: [80, 82], sR: [110, 78], hd: [96, 48], hp: [106, 158],
      }),
      caption: "Kick — full rotation, shin strikes through",
      active: ["kR", "aR"], trail: "aR",
    },
  ],
};

const BODY_KICK: TechniqueAnim = {
  category: "kick",
  frames: [
    { pose: MT, caption: "Guard — weight balanced" },
    {
      pose: mk(MT, {
        kL: [88, 174], aL: [80, 208],
        hp: [104, 156], aR: [130, 246],
      }),
      caption: "Step & pivot — turn hard on front foot",
      active: ["kL", "aL"],
    },
    {
      pose: mk(MT, {
        kL: [118, 134], aL: [150, 118],
        sL: [80, 82], sR: [108, 80], hd: [94, 50], hp: [106, 158],
      }),
      caption: "Connect at ribs — shin cuts across the body",
      active: ["kL", "aL"], trail: "aL",
    },
    { pose: MT, caption: "Follow through and recover" },
  ],
};

const REAR_TEEP: TechniqueAnim = {
  category: "kick",
  frames: [
    { pose: MT, caption: "Guard — weight on lead foot" },
    {
      pose: mk(MT, {
        kL: [88, 158], aL: [82, 192],
        hp: [100, 156], kR: [118, 198],
      }),
      caption: "Chamber — lift rear knee high, lean back slightly",
      active: ["kL", "aL"],
    },
    {
      pose: mk(MT, {
        kL: [128, 150], aL: [172, 148],
        hp: [94, 160], hd: [94, 50],
        sL: [78, 82], sR: [108, 80],
      }),
      caption: "Push — extend rear leg straight, drive with hips",
      active: ["kL", "aL"], trail: "aL",
    },
    { pose: MT, caption: "Retract and reset stance" },
  ],
};

const UPWARD_ELBOW: TechniqueAnim = {
  category: "elbow",
  frames: [
    { pose: MT, caption: "Close range — hands up" },
    {
      pose: mk(MT, {
        eR: [126, 86], wR: [120, 76],
        kR: [118, 200], hp: [102, 156],
      }),
      caption: "Dip — slight bend to load the upward drive",
      active: ["eR"],
    },
    {
      pose: mk(MT, {
        eR: [132, 52], wR: [124, 48], sR: [120, 72],
        hd: [104, 44], hp: [104, 152],
      }),
      caption: "Rise — elbow cuts upward through chin line",
      active: ["eR"], trail: "eR",
    },
    { pose: MT, caption: "Return to guard" },
  ],
};

const LONG_GUARD: TechniqueAnim = {
  category: "defense",
  frames: [
    { pose: MT, caption: "Guard — standard position" },
    {
      pose: mk(MT, {
        wR: [170, 60], eR: [148, 66], sR: [118, 76],
        wL: [88, 66], eL: [76, 98],
      }),
      caption: "Extend — lead arm straight out, palm on their face/shoulder",
      active: ["wR", "eR"],
    },
    {
      pose: mk(MT, {
        wR: [178, 62], eR: [154, 68], sR: [120, 76],
        wL: [86, 64], eL: [74, 96],
        hd: [98, 48],
      }),
      caption: "Frame — keep distance, rear hand stays protecting chin",
      active: ["wR"],
    },
    { pose: MT, caption: "Release and return to guard" },
  ],
};

const ELBOW_SHIELD: TechniqueAnim = {
  category: "defense",
  frames: [
    { pose: MT, caption: "Guard — elbows tight" },
    {
      pose: mk(MT, {
        eR: [138, 76], wR: [128, 58], sR: [120, 76],
        eL: [70, 92], wL: [78, 70],
      }),
      caption: "Shield — raise elbow to block the incoming kick",
      active: ["eR", "eL"],
    },
    {
      pose: mk(MT, {
        eR: [142, 72], wR: [132, 54], sR: [122, 74],
        eL: [66, 88], wL: [74, 66],
        kR: [120, 196], hp: [102, 156],
      }),
      caption: "Absorb — brace with legs, let your elbow take the impact",
      active: ["eR"],
    },
    { pose: MT, caption: "Reset — ready to counter" },
  ],
};

const CUT_KICK: TechniqueAnim = {
  category: "kick",
  frames: [
    { pose: MT, caption: "Guard — watch for their kick" },
    {
      pose: mk(MT, {
        kR: [120, 170], aR: [128, 200],
        hp: [100, 156],
      }),
      caption: "Lift — raise lead leg, aim at their supporting thigh",
      active: ["kR", "aR"],
    },
    {
      pose: mk(MT, {
        kR: [148, 172], aR: [174, 170],
        sR: [116, 78], hd: [98, 48], hp: [104, 156],
      }),
      caption: "Chop — low angled kick to their thigh before they kick",
      active: ["kR", "aR"], trail: "aR",
    },
    { pose: MT, caption: "Plant and reset" },
  ],
};

// ── BJJ Ground Techniques ──

const BJJ_BASE: Skeleton = {
  hd: [100, 120], sL: [86, 148], sR: [114, 146],
  eL: [72, 166], eR: [128, 162], wL: [64, 180], wR: [136, 176],
  hp: [100, 200], kL: [76, 236], kR: [124, 234],
  aL: [60, 268], aR: [140, 266],
};

const HIP_ESCAPE: TechniqueAnim = {
  category: "grappling",
  frames: [
    { pose: BJJ_BASE, caption: "On your back — knees up, hands framing" },
    {
      pose: mk(BJJ_BASE, {
        hp: [86, 200], kL: [62, 234], kR: [110, 230],
        aL: [46, 266], aR: [126, 264],
        hd: [92, 122], sL: [78, 150], sR: [106, 148],
      }),
      caption: "Bridge — lift hips, turn to one side",
      active: ["hp", "kL"],
    },
    {
      pose: mk(BJJ_BASE, {
        hp: [74, 204], kL: [50, 238], kR: [98, 232],
        aL: [36, 270], aR: [114, 268],
        hd: [84, 124], sL: [70, 152], sR: [98, 150],
        eL: [58, 168], wL: [52, 182],
      }),
      caption: "Shrimp — shoot hips away, create space",
      active: ["hp", "kL", "aL"],
    },
    { pose: BJJ_BASE, caption: "Reset position — re-guard or escape" },
  ],
};

const BRIDGE: TechniqueAnim = {
  category: "grappling",
  frames: [
    { pose: BJJ_BASE, caption: "On your back — feet flat, arms controlling" },
    {
      pose: mk(BJJ_BASE, {
        hp: [100, 180], hd: [100, 106],
        sL: [86, 132], sR: [114, 130],
        eL: [72, 150], eR: [128, 146],
        wL: [64, 164], wR: [136, 160],
        kL: [76, 226], kR: [124, 224],
      }),
      caption: "Drive — push off feet, hips as high as possible",
      active: ["hp", "kL", "kR"],
    },
    {
      pose: mk(BJJ_BASE, {
        hp: [90, 176], hd: [86, 104],
        sL: [76, 130], sR: [104, 128],
        eL: [64, 148], eR: [118, 144],
        wL: [56, 162], wR: [126, 158],
        kL: [68, 224], kR: [114, 222],
      }),
      caption: "Turn — bridge to one side to off-balance them",
      active: ["hp"],
    },
    { pose: BJJ_BASE, caption: "Complete — roll them over or re-guard" },
  ],
};

const TECHNICAL_STANDUP: TechniqueAnim = {
  category: "grappling",
  frames: [
    { pose: BJJ_BASE, caption: "Seated — one hand posted behind you" },
    {
      pose: mk(BJJ_BASE, {
        hd: [100, 102], sL: [86, 128], sR: [114, 126],
        eL: [72, 146], eR: [128, 142],
        wL: [64, 164], wR: [136, 160],
        hp: [100, 178], kL: [76, 218], kR: [124, 216],
        aL: [60, 254], aR: [140, 252],
      }),
      caption: "Post — hand behind, kick lead leg forward to create space",
      active: ["wL", "kR"],
    },
    {
      pose: mk(G, {
        hd: [100, 66], sL: [86, 92], sR: [114, 90],
        eL: [74, 112], eR: [128, 106],
        wL: [86, 90], wR: [132, 82],
        hp: [100, 166], kL: [80, 212], kR: [120, 208],
      }),
      caption: "Rise — drive up off your post hand, stay in base",
      active: ["hp"],
    },
    { pose: G, caption: "Stand — back to fighting stance" },
  ],
};

const SPRAWL: TechniqueAnim = {
  category: "defense",
  frames: [
    { pose: G, caption: "Guard — they're shooting for your legs" },
    {
      pose: mk(G, {
        hd: [100, 80], sL: [86, 104], sR: [114, 102],
        eL: [76, 120], eR: [126, 116],
        wL: [90, 120], wR: [120, 116],
        hp: [100, 148], kL: [66, 206], kR: [134, 204],
        aL: [50, 258], aR: [150, 256],
      }),
      caption: "React — kick legs back, drop hips to the mat",
      active: ["kL", "kR", "aL", "aR"],
    },
    {
      pose: mk(G, {
        hd: [100, 86], sL: [86, 108], sR: [114, 106],
        eL: [118, 112], eR: [128, 108],
        wL: [130, 108], wR: [138, 104],
        hp: [100, 152], kL: [60, 218], kR: [140, 216],
        aL: [42, 270], aR: [158, 268],
      }),
      caption: "Heavy hips — drive weight down on them, control the head",
      active: ["hp", "wL", "wR"],
    },
    { pose: G, caption: "Recover to standing position" },
  ],
};

const BREAKFALL: TechniqueAnim = {
  category: "grappling",
  frames: [
    { pose: G, caption: "Standing — you're going down" },
    {
      pose: mk(G, {
        hd: [100, 80], sL: [86, 106], sR: [114, 104],
        eL: [72, 124], eR: [128, 120],
        wL: [62, 136], wR: [138, 132],
        hp: [100, 166], kL: [80, 214], kR: [120, 210],
        aL: [68, 260], aR: [134, 256],
      }),
      caption: "Tuck — chin to chest, round your back",
      active: ["hd"],
    },
    {
      pose: mk(BJJ_BASE, {
        eL: [48, 170], wL: [34, 180], eR: [152, 166], wR: [168, 176],
      }),
      caption: "Slap — arms hit the mat at 45°, absorb the impact",
      active: ["wL", "wR"],
    },
    { pose: BJJ_BASE, caption: "Settle — exhale on impact, don't reach back" },
  ],
};

// ── Category fallback animations (spec item 82) ──

const FALLBACK_STRIKE: TechniqueAnim = {
  category: "strike",
  frames: [
    { pose: G, caption: "Guard position — hands up, chin protected" },
    {
      pose: mk(G, { wR: [160, 64], eR: [142, 74], sR: [120, 76] }),
      caption: "Load — rotate core, drive hand forward",
      active: ["wR", "eR"],
    },
    {
      pose: mk(G, { wR: [190, 62], eR: [164, 68], sR: [124, 74], hd: [103, 48], hp: [103, 156] }),
      caption: "Full extension — snap through target",
      active: ["wR", "eR", "sR"], trail: "wR",
    },
    { pose: G, caption: "Return to guard" },
  ],
};

const FALLBACK_KICK: TechniqueAnim = {
  category: "kick",
  frames: [
    { pose: MT, caption: "Stance — balanced, weight centered" },
    {
      pose: mk(MT, { kR: [118, 158], aR: [126, 190], hp: [98, 156] }),
      caption: "Chamber — lift knee to prepare",
      active: ["kR", "aR"],
    },
    {
      pose: mk(MT, { kR: [136, 150], aR: [170, 148], hp: [96, 158], hd: [98, 48] }),
      caption: "Extend — drive through with hip rotation",
      active: ["kR", "aR"], trail: "aR",
    },
    { pose: MT, caption: "Retract and reset" },
  ],
};

const FALLBACK_DEFENSE: TechniqueAnim = {
  category: "defense",
  frames: [
    { pose: G, caption: "Guard — ready to react" },
    {
      pose: mk(G, {
        hd: [112, 56], sL: [90, 84], sR: [122, 80],
        eL: [78, 110], eR: [136, 94],
        wL: [92, 80], wR: [138, 68],
        hp: [104, 158],
      }),
      caption: "Move — shift weight, cover centerline",
      active: ["hd"],
    },
    {
      pose: mk(G, {
        hd: [118, 62], sL: [94, 88], sR: [126, 82],
        eL: [82, 112], eR: [138, 96],
        wL: [96, 84], wR: [140, 70],
        hp: [106, 158],
      }),
      caption: "Protect — keep guard tight, eyes on opponent",
      active: ["hd"],
    },
    { pose: G, caption: "Reset to guard — ready to counter" },
  ],
};

const FALLBACK_ELBOW: TechniqueAnim = {
  category: "elbow",
  frames: [
    { pose: MT, caption: "Close range — elbows ready" },
    {
      pose: mk(MT, { eR: [134, 70], wR: [120, 62], sR: [118, 74] }),
      caption: "Chamber — fold forearm in, lift elbow",
      active: ["eR"],
    },
    {
      pose: mk(MT, {
        eR: [148, 60], wR: [132, 58], sR: [124, 68],
        sL: [80, 82], hd: [96, 48], hp: [98, 156],
      }),
      caption: "Cut through — drive elbow to target",
      active: ["eR"], trail: "eR",
    },
    { pose: MT, caption: "Return to guard" },
  ],
};

const FALLBACK_KNEE: TechniqueAnim = {
  category: "knee",
  frames: [
    { pose: MT, caption: "Close range — ready to engage" },
    {
      pose: mk(MT, {
        wL: [112, 62], wR: [118, 58],
        eL: [96, 80], eR: [120, 72],
      }),
      caption: "Grip — control opponent's posture",
      active: ["wL", "wR"],
    },
    {
      pose: mk(MT, {
        kR: [124, 136], aR: [130, 170],
        hp: [102, 152], hd: [104, 44],
        wL: [110, 58], wR: [116, 54],
      }),
      caption: "Drive knee — pull down, drive up",
      active: ["kR"], trail: "kR",
    },
    { pose: MT, caption: "Plant foot, return to guard" },
  ],
};

const FALLBACK_GRAPPLING: TechniqueAnim = {
  category: "grappling",
  frames: [
    { pose: mk(G, { wL: [76, 100], wR: [124, 96], eL: [72, 96], eR: [126, 88] }),
      caption: "Ready — hands forward, weight low" },
    {
      pose: mk(G, {
        hd: [100, 68], sL: [86, 96], sR: [114, 94],
        eL: [76, 112], eR: [124, 108],
        wL: [90, 110], wR: [120, 106],
        hp: [100, 168], kL: [76, 216], kR: [122, 212],
      }),
      caption: "Level change — drop hips, drive forward",
      active: ["kL", "kR", "hp"],
    },
    {
      pose: mk(G, {
        hd: [100, 80], sL: [86, 106], sR: [114, 104],
        eL: [120, 112], eR: [130, 106],
        wL: [136, 108], wR: [142, 100],
        hp: [100, 174], kL: [76, 222], kR: [122, 218],
      }),
      caption: "Engage — secure grip, control position",
      active: ["wL", "wR"],
    },
    { pose: mk(G, { wL: [76, 100], wR: [124, 96], eL: [72, 96], eR: [126, 88] }),
      caption: "Reset position" },
  ],
};

const FALLBACK_FOOTWORK: TechniqueAnim = {
  category: "footwork",
  frames: [
    { pose: G, caption: "Stance — weight on balls of feet" },
    {
      pose: mk(G, {
        aR: [142, 248], kR: [126, 198], hp: [104, 158],
        aL: [72, 252], kL: [82, 200],
      }),
      caption: "Step — push off rear foot, slide forward",
      active: ["aR", "aL"],
    },
    {
      pose: mk(G, {
        aR: [128, 248], kR: [118, 198],
        aL: [62, 252], kL: [74, 200],
        hp: [96, 158], hd: [96, 48],
      }),
      caption: "Land — maintain balance, stay in stance",
      active: ["aR", "aL"],
    },
    { pose: G, caption: "Reset — ready to move again" },
  ],
};

const FALLBACK_STANCE: TechniqueAnim = {
  category: "stance",
  frames: [
    { pose: G, caption: "Fighting stance — feet shoulder width, hands up, chin tucked, weight balanced" },
  ],
};

const FALLBACK_FORMS: TechniqueAnim = {
  category: "forms",
  frames: [
    { pose: mk(MT, { wL: [68, 82], wR: [132, 80], eL: [70, 92], eR: [130, 86] }),
      caption: "Ready position — centered, controlled breathing" },
    {
      pose: mk(MT, {
        wL: [56, 78], eL: [60, 84], sL: [82, 78],
        wR: [152, 74], eR: [140, 80], sR: [118, 76],
        hp: [100, 156],
      }),
      caption: "Open — extend arms with intention",
      active: ["wL", "wR"],
    },
    {
      pose: mk(MT, {
        wL: [80, 68], wR: [120, 68],
        eL: [74, 88], eR: [126, 86],
        hp: [100, 154], kL: [84, 200], kR: [116, 196],
      }),
      caption: "Close — return to center with control",
      active: ["wL", "wR"],
    },
  ],
};

const FALLBACK_CONDITIONING: TechniqueAnim = {
  category: "conditioning",
  frames: [
    { pose: mk(G, { wL: [72, 108], wR: [128, 104], eL: [72, 98], eR: [128, 94] }),
      caption: "Start position — feet set, core engaged" },
    {
      pose: mk(G, {
        hd: [100, 62], sL: [86, 92], sR: [114, 90],
        eL: [76, 112], eR: [124, 108],
        wL: [84, 114], wR: [118, 110],
        hp: [100, 168], kL: [76, 218], kR: [122, 214],
      }),
      caption: "Descend — lower with control, keep chest up",
      active: ["kL", "kR"],
    },
    { pose: mk(G, { wL: [72, 108], wR: [128, 104], eL: [72, 98], eR: [128, 94] }),
      caption: "Drive up — explode back to start" },
  ],
};

const CATEGORY_FALLBACKS: Record<string, TechniqueAnim> = {
  strike: FALLBACK_STRIKE,
  strikes: FALLBACK_STRIKE,
  kick: FALLBACK_KICK,
  kicks: FALLBACK_KICK,
  defense: FALLBACK_DEFENSE,
  elbow: FALLBACK_ELBOW,
  elbows: FALLBACK_ELBOW,
  knee: FALLBACK_KNEE,
  knees: FALLBACK_KNEE,
  grappling: FALLBACK_GRAPPLING,
  footwork: FALLBACK_FOOTWORK,
  stance: FALLBACK_STANCE,
  stances: FALLBACK_STANCE,
  forms: FALLBACK_FORMS,
  conditioning: FALLBACK_CONDITIONING,
};

// ── Lookup ──

const ANIMS: Record<string, TechniqueAnim> = {
  "jab": JAB,
  "cross": CROSS,
  "lead hook": HOOK,
  "hook": HOOK,
  "rear uppercut": UPPERCUT,
  "uppercut": UPPERCUT,
  "slip": SLIP,
  "bob & weave": BOB_WEAVE,
  "bob and weave": BOB_WEAVE,
  "orthodox stance": STANCE,
  "guard position": STANCE,
  "teep": TEEP,
  "front kick": TEEP,
  "roundhouse kick": ROUNDHOUSE,
  "roundhouse": ROUNDHOUSE,
  "low kick": LOW_KICK,
  "horizontal elbow": ELBOW,
  "diagonal elbow": ELBOW,
  "straight knee": KNEE,
  "knee strike": KNEE,
  "muay thai stance": MT_STANCE,
  // Boxing expanded
  "parry": PARRY,
  "catch": CATCH,
  "body jab": BODY_JAB,
  "body cross": BODY_CROSS,
  "body hook": BODY_HOOK,
  "lead uppercut": LEAD_UPPERCUT,
  "check hook": CHECK_HOOK,
  "overhand right": OVERHAND,
  "overhand": OVERHAND,
  "double jab": DOUBLE_JAB,
  "shoulder roll": SHOULDER_ROLL,
  "pull counter": PULL_COUNTER,
  "counter jab": PULL_COUNTER,
  "feint": FEINT,
  "step back": STEP_BACK,
  // Muay Thai expanded
  "switch kick": SWITCH_KICK,
  "body kick": BODY_KICK,
  "rear teep": REAR_TEEP,
  "upward elbow": UPWARD_ELBOW,
  "long guard": LONG_GUARD,
  "elbow shield": ELBOW_SHIELD,
  "cut kick": CUT_KICK,
  "clinch knee": KNEE,
  "neck wrestling": KNEE,
  // BJJ
  "hip escape (shrimp)": HIP_ESCAPE,
  "hip escape": HIP_ESCAPE,
  "shrimp": HIP_ESCAPE,
  "bridge (upa)": BRIDGE,
  "bridge": BRIDGE,
  "technical stand-up": TECHNICAL_STANDUP,
  "technical standup": TECHNICAL_STANDUP,
  "sprawl": SPRAWL,
  "breakfall": BREAKFALL,
};

export function getAnimation(name: string, category?: string): TechniqueAnim | null {
  return ANIMS[name.toLowerCase().trim()]
    ?? (category ? CATEGORY_FALLBACKS[category.toLowerCase().trim()] ?? null : null);
}

// Joint connections for rendering
export const BONES: [keyof Skeleton, keyof Skeleton][] = [
  ["sL", "sR"],   // shoulder bar
  ["sL", "eL"],   // upper arm L
  ["eL", "wL"],   // forearm L
  ["sR", "eR"],   // upper arm R
  ["eR", "wR"],   // forearm R
  ["kL", "kR"],   // hip bar (derived from hp)
  ["kL", "aL"],   // lower leg L
  ["kR", "aR"],   // lower leg R
];

export const TORSO_JOINTS: { shoulder: [keyof Skeleton, keyof Skeleton]; hip: keyof Skeleton } = {
  shoulder: ["sL", "sR"],
  hip: "hp",
};

export function midpoint(a: Vec2, b: Vec2): Vec2 {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

// ─── Combo Animation Chaining (spec item 95) ─────────────────

function lerpPose(a: Skeleton, b: Skeleton, t: number): Skeleton {
  const result: any = {};
  for (const key of Object.keys(a) as (keyof Skeleton)[]) {
    result[key] = [
      a[key][0] + (b[key][0] - a[key][0]) * t,
      a[key][1] + (b[key][1] - a[key][1]) * t,
    ];
  }
  return result as Skeleton;
}

export type ComboFrame = AnimFrame & {
  techniqueIndex: number;
  techniqueName: string;
};

export function buildComboAnimation(
  techniqueNames: string[],
  categories?: string[],
): { frames: ComboFrame[]; category: AnimCategory } | null {
  const anims: { name: string; anim: TechniqueAnim }[] = [];
  for (let i = 0; i < techniqueNames.length; i++) {
    const anim = getAnimation(techniqueNames[i], categories?.[i]);
    if (!anim) return null;
    anims.push({ name: techniqueNames[i], anim });
  }
  if (anims.length === 0) return null;

  const comboFrames: ComboFrame[] = [];

  for (let i = 0; i < anims.length; i++) {
    const { name, anim } = anims[i];
    const frames = anim.frames;

    if (i > 0 && frames.length > 0) {
      const prevLastPose = comboFrames[comboFrames.length - 1]?.pose;
      if (prevLastPose) {
        const transition = lerpPose(prevLastPose, frames[0].pose, 0.5);
        comboFrames.push({
          ...frames[0],
          pose: transition,
          caption: `→ ${name}`,
          techniqueIndex: i,
          techniqueName: name,
        });
      }
    }

    for (let f = 0; f < frames.length; f++) {
      if (i > 0 && f === 0) continue;
      comboFrames.push({
        ...frames[f],
        techniqueIndex: i,
        techniqueName: name,
      });
    }

    if (i < anims.length - 1 && frames.length > 0) {
      const lastFrame = frames[frames.length - 1];
      if (!lastFrame.active || lastFrame.active.length === 0) {
        comboFrames.pop();
      }
    }
  }

  return {
    frames: comboFrames,
    category: anims[0].anim.category,
  };
}

// ─── Metronome / Shadow-Along (spec item 98) ─────────────────

export type MetronomeConfig = {
  bpm: number;
  techniqueNames: string[];
  categories?: string[];
};

export function getMetronomeFrameTiming(config: MetronomeConfig): {
  frameDurationMs: number;
  totalFrames: number;
  combo: ReturnType<typeof buildComboAnimation>;
} | null {
  const combo = buildComboAnimation(config.techniqueNames, config.categories);
  if (!combo) return null;

  const beatMs = 60_000 / config.bpm;
  const framesPerBeat = Math.max(2, Math.ceil(combo.frames.length / config.techniqueNames.length));
  const frameDurationMs = beatMs / framesPerBeat;

  return {
    frameDurationMs: Math.round(frameDurationMs),
    totalFrames: combo.frames.length,
    combo,
  };
}

// ─── Combo Presets ─────────────────────────────────────────────

export const COMBO_PRESETS: { name: string; techniques: string[]; discipline: string }[] = [
  { name: "1-2", techniques: ["jab", "cross"], discipline: "boxing" },
  { name: "1-2-3", techniques: ["jab", "cross", "hook"], discipline: "boxing" },
  { name: "1-2-3-2", techniques: ["jab", "cross", "hook", "cross"], discipline: "boxing" },
  { name: "1-1-2", techniques: ["jab", "jab", "cross"], discipline: "boxing" },
  { name: "Jab-Cross-Uppercut", techniques: ["jab", "cross", "uppercut"], discipline: "boxing" },
  { name: "Hook-Cross-Hook", techniques: ["hook", "cross", "hook"], discipline: "boxing" },
  { name: "Jab-Roundhouse", techniques: ["jab", "roundhouse kick"], discipline: "muay_thai" },
  { name: "Cross-Hook-Low Kick", techniques: ["cross", "hook", "low kick"], discipline: "muay_thai" },
  { name: "Teep-Cross-Elbow", techniques: ["teep", "cross", "elbow"], discipline: "muay_thai" },
  { name: "1-2-Knee", techniques: ["jab", "cross", "knee"], discipline: "muay_thai" },
];
