"use client";

const BAR_WEIGHT_KG = 20;
const BAR_WEIGHT_LB = 45;

const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];
const PLATES_LB = [45, 35, 25, 10, 5, 2.5];

const PLATE_COLORS: Record<number, string> = {
    25: "239 68 68",
    20: "59 130 246",
    15: "250 204 21",
    10: "34 197 94",
    5: "var(--fg-rgb)",
    2.5: "var(--fg-rgb)",
    1.25: "var(--fg-rgb)",
    45: "59 130 246",
    35: "250 204 21",
};

type PlateMathProps = {
    totalWeight: number;
    unit: "kg" | "lb";
    perSide?: boolean;
};

export default function PlateMath({ totalWeight, unit, perSide = false }: PlateMathProps) {
    const barWeight = unit === "kg" ? BAR_WEIGHT_KG : BAR_WEIGHT_LB;
    const plates = unit === "kg" ? PLATES_KG : PLATES_LB;

    if (perSide) {
        if (totalWeight <= 0) return null;
    } else {
        if (totalWeight <= barWeight) {
            return (
                <div className="flex items-center gap-1.5 text-[9px] font-mono text-[var(--fg-25)]">
                    <span>Bar only ({barWeight}{unit})</span>
                </div>
            );
        }
    }

    const perSideWeight = perSide ? totalWeight : (totalWeight - barWeight) / 2;
    const breakdown: { plate: number; count: number }[] = [];
    let remaining = perSideWeight;

    for (const plate of plates) {
        if (remaining >= plate) {
            const count = Math.floor(remaining / plate);
            breakdown.push({ plate, count });
            remaining = Math.round((remaining - count * plate) * 100) / 100;
        }
    }

    if (remaining > 0.01) return null;

    return (
        <div className="flex items-center gap-1 mt-1">
            <svg className="shrink-0 opacity-20" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="2" y1="12" x2="22" y2="12"/><rect x="6" y="6" width="3" height="12" rx="1"/><rect x="15" y="6" width="3" height="12" rx="1"/></svg>
            <div className="flex items-center gap-0.5">
                {breakdown.map(({ plate, count }) => (
                    <div key={plate} className="flex items-center gap-px">
                        {Array.from({ length: count }).map((_, i) => {
                            const colorRgb = PLATE_COLORS[plate] || "var(--fg-rgb)";
                            const isHeavy = plate >= 10;
                            return (
                                <div
                                    key={i}
                                    className={`rounded-sm flex items-center justify-center font-mono font-bold ${isHeavy ? "h-5 min-w-[18px] px-1 text-[8px]" : "h-4 min-w-[14px] px-0.5 text-[7px]"}`}
                                    style={{
                                        background: `rgb(${colorRgb} / 0.15)`,
                                        border: `1px solid rgb(${colorRgb} / 0.3)`,
                                        color: `rgb(${colorRgb} / 0.8)`,
                                    }}
                                >
                                    {plate}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}
