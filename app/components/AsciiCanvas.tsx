"use client";

import { useRef, useEffect } from "react";

const CHARS = " .·:;+*?%S#@";
const CHAR_LEN = CHARS.length - 1;

interface AsciiCanvasProps {
  src: string;
  cellSize?: number;
  brightness?: number;
  contrast?: number;
  tintStrength?: number;
  className?: string;
}

export default function AsciiCanvas({
  src,
  cellSize = 7,
  brightness = 3.2,
  contrast = 1.15,
  tintStrength = 0.1,
  className,
}: AsciiCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;

    const ctx = canvas.getContext("2d")!;
    let running = true;
    let cachedData: ImageData | null = null;
    let cachedW = 0;
    let cachedH = 0;

    let mouseX = -9999;
    let mouseY = -9999;

    // Cursor trail heatmap — stores glow intensity per cell
    let glowMap: Float32Array | null = null;
    let glowCols = 0;
    let glowRows = 0;

    function onMouseMove(e: MouseEvent) {
      mouseX = e.clientX;
      mouseY = e.clientY;
    }
    function onTouchMove(e: TouchEvent) {
      if (e.touches[0]) {
        mouseX = e.touches[0].clientX;
        mouseY = e.touches[0].clientY;
      }
    }
    function onTouchEnd() {
      mouseX = -9999;
      mouseY = -9999;
    }

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      canvas!.width = window.innerWidth * dpr;
      canvas!.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cachedData = null;
      // Reinit glow map
      const cols = Math.ceil(window.innerWidth / cellSize);
      const rows = Math.ceil(window.innerHeight / cellSize);
      glowMap = new Float32Array(cols * rows);
      glowCols = cols;
      glowRows = rows;
    }

    function sampleImage(w: number, h: number): ImageData | null {
      if (w === 0 || h === 0) return null;
      if (cachedData && cachedW === w && cachedH === h) return cachedData;
      const off = document.createElement("canvas");
      off.width = w;
      off.height = h;
      const oc = off.getContext("2d")!;
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      const scale = Math.max(w / iw, h / ih);
      oc.drawImage(
        img,
        (w - iw * scale) / 2,
        (h - ih * scale) / 2,
        iw * scale,
        ih * scale,
      );
      cachedData = oc.getImageData(0, 0, w, h);
      cachedW = w;
      cachedH = h;
      return cachedData;
    }

    function render(t: number) {
      if (!running || !img.complete || !img.naturalWidth) return;

      const w = window.innerWidth;
      const h = window.innerHeight;
      if (w === 0 || h === 0) return;
      const sampled = sampleImage(w, h);
      if (!sampled) return;
      const data = sampled.data;

      ctx.fillStyle = "#06080c";
      ctx.fillRect(0, 0, w, h);

      const cols = Math.ceil(w / cellSize);
      const rows = Math.ceil(h / cellSize);
      const cx = w / 2;
      const cy = h / 2;
      const maxDistSq = cx * cx + cy * cy;
      const fontSize = cellSize * 1.15;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const time = t * 0.001;

      // Update cursor trail heatmap
      if (glowMap && glowCols === cols && glowRows === rows) {
        // Decay existing glow
        for (let i = 0; i < glowMap.length; i++) glowMap[i] *= 0.93;

        // Add glow at current mouse position
        if (mouseX > -1000) {
          const mc = Math.floor(mouseX / cellSize);
          const mr = Math.floor(mouseY / cellSize);
          const trailR = 4; // cell radius
          for (let dr = -trailR; dr <= trailR; dr++) {
            for (let dc = -trailR; dc <= trailR; dc++) {
              const r = mr + dr;
              const c = mc + dc;
              if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
              const d = Math.sqrt(dr * dr + dc * dc);
              if (d > trailR) continue;
              const falloff = 1 - d / trailR;
              glowMap[r * cols + c] = Math.min(
                1,
                glowMap[r * cols + c] + falloff * falloff * 0.4,
              );
            }
          }
        }
      }

      // --- LAYER 1: Background / dim layer (slower parallax) ---
      const bgOffX = Math.sin(time * 0.15) * 3;
      const bgOffY = Math.cos(time * 0.1) * 2;
      ctx.font = `${fontSize * 0.9}px "Courier New", monospace`;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const mx = col * cellSize + cellSize / 2 + bgOffX;
          const my = row * cellSize + cellSize / 2 + bgOffY;

          const sx = Math.min(Math.max(0, Math.floor(mx - bgOffX)), w - 1);
          const sy = Math.min(Math.max(0, Math.floor(my - bgOffY)), h - 1);
          const i = (sy * w + sx) * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          let lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          lum = Math.pow(lum, 0.35) * brightness * 0.35;
          lum = Math.min(1, Math.max(0, (lum - 0.5) * contrast + 0.5));

          if (lum < 0.08) continue;

          const charIdx = Math.floor(lum * CHAR_LEN);
          const ch = CHARS[charIdx];
          if (ch === " ") continue;

          const dcx = mx - cx;
          const dcy = my - cy;
          const distSq = dcx * dcx + dcy * dcy;
          const vignette = 1 - (distSq / maxDistSq) * 0.5;
          const bright = Math.min(1, lum * vignette) * 0.3;

          const tR = 34, tG = 211, tB = 238;
          const cr = Math.round(Math.min(255, (r * (1 - tintStrength) + tR * tintStrength) * bright));
          const cg = Math.round(Math.min(255, (g * (1 - tintStrength) + tG * tintStrength) * bright));
          const cb = Math.round(Math.min(255, (b * (1 - tintStrength) + tB * tintStrength) * bright));

          ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
          ctx.fillText(ch, mx, my);
        }
      }

      // --- LAYER 2: Foreground / main layer ---
      ctx.font = `${fontSize}px "Courier New", monospace`;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const mx = col * cellSize + cellSize / 2;
          const my = row * cellSize + cellSize / 2;

          const sx = Math.min(Math.floor(mx), w - 1);
          const sy = Math.min(Math.floor(my), h - 1);
          const i = (sy * w + sx) * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          let lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          lum = Math.pow(lum, 0.35) * brightness;
          lum = Math.min(1, Math.max(0, (lum - 0.5) * contrast + 0.5));

          const wave =
            Math.sin(time * 1.5 - (row * 0.18 + col * 0.12)) * 0.35 + 1;
          const wave2 =
            Math.sin(time * 0.7 + (row * 0.1 - col * 0.2)) * 0.2 + 1;

          let animLum = lum * wave * wave2;

          // Cursor trail glow boost
          if (glowMap && glowCols === cols) {
            const glow = glowMap[row * cols + col];
            if (glow > 0.01) {
              animLum = Math.min(1, animLum + glow * 0.6);
            }
          }

          animLum = Math.min(1, animLum);

          const charIdx = Math.floor(animLum * CHAR_LEN);
          const ch = CHARS[charIdx];
          if (ch === " ") continue;

          const dcx = mx - cx;
          const dcy = my - cy;
          const distSq = dcx * dcx + dcy * dcy;
          const vignette = 1 - (distSq / maxDistSq) * 0.4;
          const bright = Math.min(1, animLum * vignette);

          const tR = 34, tG = 211, tB = 238;
          const cr = Math.round(
            Math.min(255, (r * (1 - tintStrength) + tR * tintStrength) * bright),
          );
          const cg = Math.round(
            Math.min(255, (g * (1 - tintStrength) + tG * tintStrength) * bright),
          );
          const cb = Math.round(
            Math.min(255, (b * (1 - tintStrength) + tB * tintStrength) * bright),
          );

          ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
          ctx.fillText(ch, mx, my);
        }
      }
    }

    function loop(t: number) {
      if (!running) return;
      render(t);
      frameRef.current = requestAnimationFrame(loop);
    }

    img.onload = () => {
      resize();
      frameRef.current = requestAnimationFrame(loop);
    };

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      running = false;
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [src, cellSize, brightness, contrast, tintStrength]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
      }}
    />
  );
}
