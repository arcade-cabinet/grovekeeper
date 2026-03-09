/**
 * Individual texture drawing functions for procedural canvas textures.
 * Spec §42 — Procedural Architecture (texture subsystem).
 *
 * Each function draws a tiling texture pattern onto a 2D canvas context.
 * Split from proceduralTextures.ts to respect the 300-line limit.
 */

type Ctx = CanvasRenderingContext2D;
type RNG = () => number;

export function drawBrick(ctx: Ctx, size: number, _rng: RNG): void {
  ctx.fillStyle = "#6b4034";
  ctx.fillRect(0, 0, size, size);

  const brickH = size / 16;
  const brickW = size / 8;

  ctx.fillStyle = "#4a2c24";
  for (let y = 0; y < size; y += brickH) {
    ctx.fillRect(0, y, size, 3);
    const offset = y % (brickH * 2) === 0 ? 0 : brickW / 2;
    for (let x = 0; x < size; x += brickW) {
      ctx.fillRect(x + offset, y, 3, brickH);
    }
  }
}

export function drawPlaster(ctx: Ctx, size: number, rng: RNG): void {
  ctx.fillStyle = "#e0d8cc";
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 4000; i++) {
    ctx.fillStyle = rng() > 0.5 ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.15)";
    ctx.fillRect(rng() * size, rng() * size, rng() * 4, rng() * 4);
  }
}

export function drawStone(ctx: Ctx, size: number, rng: RNG): void {
  ctx.fillStyle = "#444";
  ctx.fillRect(0, 0, size, size);

  const blockSize = size / 4;
  for (let y = 0; y < size; y += blockSize) {
    const offset = y % (blockSize * 2) === 0 ? 0 : blockSize / 2;
    for (let x = -blockSize; x < size; x += blockSize) {
      const bx = x + offset + 4;
      const by = y + 4;
      const bw = blockSize - 8;
      const grad = ctx.createRadialGradient(
        bx + bw / 2,
        by + bw / 2,
        5,
        bx + bw / 2,
        by + bw / 2,
        bw / 2,
      );
      grad.addColorStop(0, rng() > 0.5 ? "#777" : "#888");
      grad.addColorStop(1, "#333");
      ctx.fillStyle = grad;
      ctx.fillRect(bx, by, bw, bw);
    }
  }
}

export function drawWood(ctx: Ctx, size: number, rng: RNG): void {
  const grad = ctx.createLinearGradient(0, 0, size, 0);
  grad.addColorStop(0, "#5c3a21");
  grad.addColorStop(0.5, "#7a4d2c");
  grad.addColorStop(1, "#5c3a21");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = "#3d2514";
  ctx.lineWidth = 3;
  for (let i = 0; i < size; i += size / 8) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    for (let y = 0; y <= size; y += size / 16) {
      ctx.lineTo(i + Math.sin(y * 0.05) * 12, y);
    }
    ctx.stroke();
  }

  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.beginPath();
    ctx.arc(rng() * size, rng() * size, rng() * 6 + 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawRoof(ctx: Ctx, size: number, _rng: RNG): void {
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(0, 0, size, size);

  const tileH = size / 8;
  for (let y = 0; y < size; y += tileH) {
    const offset = y % (tileH * 2) === 0 ? 0 : tileH;
    for (let x = -tileH; x < size; x += tileH * 2) {
      const grad = ctx.createLinearGradient(0, y, 0, y + tileH);
      grad.addColorStop(0, "#333");
      grad.addColorStop(1, "#111");
      ctx.fillStyle = grad;
      ctx.fillRect(x + offset + 2, y, tileH * 2 - 4, tileH - 2);
    }
  }
}

export function drawRoad(ctx: Ctx, size: number, rng: RNG): void {
  ctx.fillStyle = "#5c4f42";
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 3000; i++) {
    ctx.fillStyle = rng() > 0.5 ? "rgba(60,50,40,0.5)" : "rgba(80,70,60,0.5)";
    ctx.beginPath();
    ctx.arc(rng() * size, rng() * size, rng() * 6 + 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawGrass(ctx: Ctx, size: number, rng: RNG): void {
  ctx.fillStyle = "#143314";
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = "#1e4c1e";
  ctx.lineWidth = 2;
  for (let i = 0; i < 3000; i++) {
    const x = rng() * size;
    const y = rng() * size;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + rng() * 10 - 5, y - rng() * 16 - 6);
    ctx.stroke();
  }
}

export function drawLeaves(ctx: Ctx, size: number, rng: RNG): void {
  ctx.fillStyle = "#0f3312";
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 1500; i++) {
    ctx.fillStyle = rng() > 0.5 ? "#174a1a" : "#0a220b";
    ctx.beginPath();
    ctx.arc(rng() * size, rng() * size, rng() * 12 + 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawHedge(ctx: Ctx, size: number, rng: RNG): void {
  ctx.fillStyle = "rgb(15, 60, 20)";
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 2000; i++) {
    const r = 25 + rng() * 20;
    const g = 80 + rng() * 20;
    const b = 30 + rng() * 20;
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.85)`;
    ctx.beginPath();
    ctx.arc(rng() * size, rng() * size, rng() * 10 + 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawDoor(ctx: Ctx, size: number, _rng: RNG): void {
  ctx.fillStyle = "#4a2f18";
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = "#2d1b0d";
  const panel = size / 2 - 16;
  ctx.fillRect(12, 12, panel, panel);
  ctx.fillRect(size / 2 + 4, 12, panel, panel);
  ctx.fillRect(12, size / 2 + 4, panel, panel);
  ctx.fillRect(size / 2 + 4, size / 2 + 4, panel, panel);

  const hx = size - 40;
  const hy = size / 2;
  const grad = ctx.createRadialGradient(hx, hy, 3, hx, hy, 12);
  grad.addColorStop(0, "#ffe100");
  grad.addColorStop(1, "#997a00");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(hx, hy, 12, 0, Math.PI * 2);
  ctx.fill();
}
