import type { ShareCardData } from "./habitEngine";

export async function generateShareCardImage(card: ShareCardData, username?: string): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const raw = getComputedStyle(document.documentElement).getPropertyValue("--accent-rgb").trim();
  const accent = raw ? `rgb(${raw})` : "#22d3ee";
  const accentA = (a: number) => raw ? `rgba(${raw},${a})` : `rgba(34,211,238,${a})`;
  const cardColor = `rgb(${card.color})`;
  const cardColorA = (a: number) => `rgba(${card.color},${a})`;

  const bg = ctx.createLinearGradient(0, 0, 0, 1920);
  bg.addColorStop(0, "#0a1524");
  bg.addColorStop(1, "#050914");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1080, 1920);

  const glow = ctx.createRadialGradient(540, 500, 50, 540, 500, 700);
  glow.addColorStop(0, cardColorA(0.15));
  glow.addColorStop(1, cardColorA(0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1080, 1920);

  ctx.textAlign = "center";

  ctx.fillStyle = accent;
  ctx.font = "bold 64px ui-monospace, monospace";
  ctx.fillText("SEVEL", 540, 180);
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.font = "24px ui-monospace, monospace";
  ctx.fillText("RAISE YOUR LEVEL", 540, 220);

  ctx.font = "160px sans-serif";
  ctx.fillText(card.emoji, 540, 520);

  const typeLabel = card.type === "monthly" ? "MONTHLY REPORT" : card.type === "milestone" ? "MILESTONE REACHED" : "YEAR IN REVIEW";
  ctx.fillStyle = cardColorA(0.7);
  ctx.font = "bold 28px ui-monospace, monospace";
  ctx.fillText(typeLabel, 540, 640);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 72px ui-monospace, monospace";
  const titleLines = wrapText(ctx, card.title, 900);
  let ty = 740;
  for (const line of titleLines) {
    ctx.fillText(line, 540, ty);
    ty += 85;
  }

  const statsY = ty + 60;
  const cellW = 800;
  const cellH = 140;
  const cellGap = 20;

  card.stats.forEach((stat, i) => {
    const y = statsY + i * (cellH + cellGap);
    ctx.strokeStyle = cardColorA(0.15);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(540 - cellW / 2, y, cellW, cellH, 20);
    ctx.stroke();
    ctx.fillStyle = cardColorA(0.04);
    ctx.fill();

    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = "24px ui-monospace, monospace";
    ctx.fillText(stat.label.toUpperCase(), 540 - cellW / 2 + 40, y + 55);

    ctx.textAlign = "right";
    ctx.fillStyle = cardColor;
    ctx.font = "bold 52px ui-monospace, monospace";
    ctx.fillText(stat.value, 540 + cellW / 2 - 40, y + 100);
    ctx.textAlign = "center";
  });

  if (username) {
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "26px ui-monospace, monospace";
    ctx.fillText(`@${username}`, 540, 1780);
  }

  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.font = "24px ui-monospace, monospace";
  ctx.fillText("sevel.app", 540, 1850);

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? current + " " + word : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function generateProfileBadge(params: {
  username: string;
  level: number;
  rankName: string;
  totalWorkouts: number;
  totalXp: number;
  streak: number;
  className?: string;
}): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const raw = getComputedStyle(document.documentElement).getPropertyValue("--accent-rgb").trim();
  const accent = raw ? `rgb(${raw})` : "#22d3ee";
  const accentA = (a: number) => raw ? `rgba(${raw},${a})` : `rgba(34,211,238,${a})`;

  const bg = ctx.createLinearGradient(0, 0, 0, 1080);
  bg.addColorStop(0, "#0a1524");
  bg.addColorStop(1, "#050914");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1080, 1080);

  const glow = ctx.createRadialGradient(540, 400, 50, 540, 400, 500);
  glow.addColorStop(0, accentA(0.12));
  glow.addColorStop(1, accentA(0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1080, 1080);

  ctx.textAlign = "center";

  ctx.fillStyle = accent;
  ctx.font = "bold 48px ui-monospace, monospace";
  ctx.fillText("SEVEL", 540, 100);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 56px ui-monospace, monospace";
  ctx.fillText(`@${params.username}`, 540, 260);

  ctx.fillStyle = accent;
  ctx.font = "bold 40px ui-monospace, monospace";
  const badge = `LVL ${params.level} · ${params.rankName}`;
  const bw = Math.max(300, ctx.measureText(badge).width + 80);
  ctx.strokeStyle = accentA(0.4);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(540 - bw / 2, 310, bw, 70, 35);
  ctx.stroke();
  ctx.fillText(badge, 540, 358);

  if (params.className) {
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "28px ui-monospace, monospace";
    ctx.fillText(params.className, 540, 430);
  }

  const stats: [string, string][] = [
    ["WORKOUTS", String(params.totalWorkouts)],
    ["XP", params.totalXp.toLocaleString()],
    ["STREAK", `${params.streak}d`],
  ];
  const cellW = 280, cellH = 160, gap = 30;
  const totalW = cellW * 3 + gap * 2;
  const startX = 540 - totalW / 2;
  const startY = 500;

  stats.forEach(([label, value], i) => {
    const x = startX + i * (cellW + gap);
    ctx.strokeStyle = accentA(0.12);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, startY, cellW, cellH, 16);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "22px ui-monospace, monospace";
    ctx.fillText(label, x + cellW / 2, startY + 55);
    ctx.fillStyle = accent;
    ctx.font = "bold 48px ui-monospace, monospace";
    ctx.fillText(value, x + cellW / 2, startY + 120);
  });

  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.font = "22px ui-monospace, monospace";
  ctx.fillText("RAISE YOUR LEVEL", 540, 780);

  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.font = "22px ui-monospace, monospace";
  ctx.fillText("sevel.app", 540, 1020);

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
}

export async function shareProfileBadge(params: Parameters<typeof generateProfileBadge>[0]): Promise<void> {
  const blob = await generateProfileBadge(params);
  if (!blob) return;
  const filename = `sevel-profile-${Date.now()}.png`;
  const file = new File([blob], filename, { type: "image/png" });
  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: `SEVEL Profile` }); } catch {}
  } else {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

export async function shareCardImage(card: ShareCardData, username?: string): Promise<void> {
  const blob = await generateShareCardImage(card, username);
  if (!blob) return;

  const filename = `sevel-${card.type}-${Date.now()}.png`;
  const file = new File([blob], filename, { type: "image/png" });

  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: `SEVEL ${card.title}` });
    } catch {}
  } else {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
