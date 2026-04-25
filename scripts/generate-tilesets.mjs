#!/usr/bin/env node
// Procedural tileset atlas generator for Grovekeeper RC.
//
// Reads scripts/tileset-config.json and produces:
//   public/assets/tilesets/biomes/{biome}.png      — atlas PNG
//   public/assets/tilesets/biomes/{biome}.json     — tile-id map
//   public/assets/tilesets/structures/{group}.png  — atlas PNG
//   public/assets/tilesets/structures/{group}.json — tile-id map
//
// JSON shape: { tileSize, atlas: { cols, rows, width, height }, tiles: { <id>: { col, row } } }
// This aligns with @jolly-pixel/voxel.renderer's TileRef ({ col, row, tilesetId? }).
//
// Idempotent: deterministic seeded RNG -> identical bytes on re-run.

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const CONFIG_PATH = path.join(__dirname, "tileset-config.json");
const OUT_BIOMES = path.join(ROOT, "public/assets/tilesets/biomes");
const OUT_STRUCTURES = path.join(ROOT, "public/assets/tilesets/structures");

// ----- Seeded RNG (mulberry32 from a string seed) -----

function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function makeRng(seedStr) {
  let s = hashSeed(seedStr);
  return function rng() {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ----- Color helpers -----

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function clamp8(v) {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
}

function mix(a, b, t) {
  return {
    r: clamp8(a.r + (b.r - a.r) * t),
    g: clamp8(a.g + (b.g - a.g) * t),
    b: clamp8(a.b + (b.b - a.b) * t),
  };
}

function jitter(c, rng, amount) {
  const j = (rng() - 0.5) * 2 * amount;
  return {
    r: clamp8(c.r + j),
    g: clamp8(c.g + j),
    b: clamp8(c.b + j),
  };
}

// ----- Tile drawing context -----
// Each tile is a flat RGBA Uint8Array of size tileSize*tileSize*4.

function newTileBuffer(tileSize, baseColor, alpha = 255) {
  const buf = new Uint8Array(tileSize * tileSize * 4);
  for (let i = 0; i < tileSize * tileSize; i++) {
    const o = i * 4;
    buf[o] = baseColor.r;
    buf[o + 1] = baseColor.g;
    buf[o + 2] = baseColor.b;
    buf[o + 3] = alpha;
  }
  return buf;
}

function setPixel(buf, ts, x, y, c, a = 255) {
  if (x < 0 || y < 0 || x >= ts || y >= ts) return;
  const o = (y * ts + x) * 4;
  buf[o] = c.r;
  buf[o + 1] = c.g;
  buf[o + 2] = c.b;
  buf[o + 3] = a;
}

function getPixel(buf, ts, x, y) {
  const o = (y * ts + x) * 4;
  return { r: buf[o], g: buf[o + 1], b: buf[o + 2], a: buf[o + 3] };
}

// ----- Tile algorithms -----
// Each takes (palette, tileSize, rng) and returns Uint8Array RGBA.
// `palette` keys: primary, secondary, accent, deep, highlight, shadow, wet, dry.

function drawSoft(p, ts, rng) {
  const base = hexToRgb(p.primary);
  const buf = newTileBuffer(ts, base);
  for (let y = 0; y < ts; y++) {
    for (let x = 0; x < ts; x++) {
      const c = jitter(base, rng, 6);
      setPixel(buf, ts, x, y, c);
    }
  }
  return buf;
}

function drawTallBlades(p, ts, rng) {
  const base = hexToRgb(p.primary);
  const blade = hexToRgb(p.secondary);
  const dark = hexToRgb(p.deep);
  const buf = newTileBuffer(ts, base);
  // soft noise base
  for (let y = 0; y < ts; y++) {
    for (let x = 0; x < ts; x++) {
      setPixel(buf, ts, x, y, jitter(base, rng, 8));
    }
  }
  // vertical blade streaks
  const bladeCount = Math.floor(ts * 0.6);
  for (let i = 0; i < bladeCount; i++) {
    const x = Math.floor(rng() * ts);
    const len = 2 + Math.floor(rng() * Math.max(2, ts / 3));
    const startY = ts - 1 - Math.floor(rng() * 4);
    const tone = rng() < 0.5 ? blade : dark;
    for (let k = 0; k < len; k++) {
      setPixel(buf, ts, x, startY - k, jitter(tone, rng, 6));
    }
  }
  return buf;
}

function drawSpeckle(p, ts, rng) {
  const base = hexToRgb(p.primary);
  const dark = hexToRgb(p.shadow);
  const buf = newTileBuffer(ts, base);
  for (let y = 0; y < ts; y++) {
    for (let x = 0; x < ts; x++) {
      setPixel(buf, ts, x, y, jitter(base, rng, 4));
    }
  }
  const speckCount = Math.floor(ts * ts * 0.08);
  for (let i = 0; i < speckCount; i++) {
    const x = Math.floor(rng() * ts);
    const y = Math.floor(rng() * ts);
    setPixel(buf, ts, x, y, jitter(dark, rng, 8));
  }
  return buf;
}

function drawRough(p, ts, rng) {
  const base = hexToRgb(p.primary);
  const dark = hexToRgb(p.shadow);
  const light = hexToRgb(p.highlight);
  const buf = newTileBuffer(ts, base);
  for (let y = 0; y < ts; y++) {
    for (let x = 0; x < ts; x++) {
      const r = rng();
      let c;
      if (r < 0.15) c = jitter(dark, rng, 10);
      else if (r > 0.85) c = jitter(light, rng, 10);
      else c = jitter(base, rng, 12);
      setPixel(buf, ts, x, y, c);
    }
  }
  return buf;
}

function drawScatterYellow(p, ts, rng) {
  const base = hexToRgb(p.primary);
  const accent = hexToRgb(p.highlight);
  const buf = newTileBuffer(ts, base);
  for (let y = 0; y < ts; y++) {
    for (let x = 0; x < ts; x++) {
      setPixel(buf, ts, x, y, jitter(base, rng, 6));
    }
  }
  const dotCount = Math.floor(ts * ts * 0.04);
  for (let i = 0; i < dotCount; i++) {
    const x = Math.floor(rng() * ts);
    const y = Math.floor(rng() * ts);
    const c = jitter(accent, rng, 12);
    setPixel(buf, ts, x, y, c);
    // 2x2 dot at higher tile sizes
    if (ts >= 24 && rng() < 0.5) {
      setPixel(buf, ts, x + 1, y, c);
      setPixel(buf, ts, x, y + 1, c);
    }
  }
  return buf;
}

function drawLeavesWarm(p, ts, rng) {
  const base = hexToRgb(p.primary);
  const accent = hexToRgb(p.secondary);
  const dark = hexToRgb(p.deep);
  const buf = newTileBuffer(ts, base);
  // background noise
  for (let y = 0; y < ts; y++) {
    for (let x = 0; x < ts; x++) {
      setPixel(buf, ts, x, y, jitter(base, rng, 8));
    }
  }
  // round blob clusters
  const blobs = 6 + Math.floor(rng() * 4);
  for (let b = 0; b < blobs; b++) {
    const cx = Math.floor(rng() * ts);
    const cy = Math.floor(rng() * ts);
    const radius = 1 + Math.floor(rng() * Math.max(2, ts / 6));
    const tone = rng() < 0.4 ? dark : accent;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy <= radius * radius) {
          setPixel(buf, ts, cx + dx, cy + dy, jitter(tone, rng, 6));
        }
      }
    }
  }
  return buf;
}

function drawBarkLight(p, ts, rng) {
  const base = hexToRgb(p.dry || p.accent);
  const dark = hexToRgb(p.shadow);
  const light = hexToRgb(p.highlight);
  const buf = newTileBuffer(ts, base);
  // vertical streaks
  for (let x = 0; x < ts; x++) {
    const variant = rng();
    let col;
    if (variant < 0.3) col = jitter(dark, rng, 6);
    else if (variant > 0.85) col = jitter(light, rng, 6);
    else col = jitter(base, rng, 8);
    for (let y = 0; y < ts; y++) {
      setPixel(buf, ts, x, y, jitter(col, rng, 4));
    }
  }
  // horizontal cracks
  const cracks = Math.floor(ts / 8);
  for (let i = 0; i < cracks; i++) {
    const y = Math.floor(rng() * ts);
    for (let x = 0; x < ts; x++) {
      if (rng() < 0.6) setPixel(buf, ts, x, y, jitter(dark, rng, 6));
    }
  }
  return buf;
}

function drawBarkDark(p, ts, rng) {
  // similar to bark-light but using shadow as base
  const base = hexToRgb(p.deep || p.shadow);
  const mid = hexToRgb(p.accent);
  const buf = newTileBuffer(ts, base);
  for (let x = 0; x < ts; x++) {
    const variant = rng();
    const col = variant < 0.5 ? jitter(base, rng, 8) : jitter(mid, rng, 6);
    for (let y = 0; y < ts; y++) {
      setPixel(buf, ts, x, y, jitter(col, rng, 4));
    }
  }
  const cracks = Math.floor(ts / 6);
  for (let i = 0; i < cracks; i++) {
    const y = Math.floor(rng() * ts);
    for (let x = 0; x < ts; x++) {
      if (rng() < 0.5)
        setPixel(buf, ts, x, y, jitter(hexToRgb(p.shadow), rng, 4));
    }
  }
  return buf;
}

function drawPlankVertical(p, ts, rng) {
  const base = hexToRgb(p.dry || p.accent);
  const dark = hexToRgb(p.shadow);
  const light = hexToRgb(p.highlight);
  const buf = newTileBuffer(ts, base);
  const plankWidth = Math.max(4, Math.floor(ts / 4));
  for (let x = 0; x < ts; x++) {
    const inGap = x % plankWidth === 0;
    for (let y = 0; y < ts; y++) {
      if (inGap) {
        setPixel(buf, ts, x, y, jitter(dark, rng, 4));
      } else {
        const tone = (x % plankWidth === plankWidth - 1) ? light : base;
        setPixel(buf, ts, x, y, jitter(tone, rng, 6));
      }
    }
  }
  // grain lines
  for (let i = 0; i < ts; i++) {
    if (rng() < 0.15) {
      const y = Math.floor(rng() * ts);
      for (let x = 0; x < ts; x++) {
        if (x % plankWidth !== 0)
          setPixel(buf, ts, x, y, jitter(dark, rng, 3));
      }
    }
  }
  return buf;
}

function drawPlankGrain(p, ts, rng) {
  // horizontal planks with vertical grain — variant of plank-vertical rotated conceptually
  const base = hexToRgb(p.primary);
  const dark = hexToRgb(p.shadow);
  const light = hexToRgb(p.highlight);
  const buf = newTileBuffer(ts, base);
  const plankH = Math.max(4, Math.floor(ts / 4));
  for (let y = 0; y < ts; y++) {
    const inGap = y % plankH === 0;
    for (let x = 0; x < ts; x++) {
      if (inGap) setPixel(buf, ts, x, y, jitter(dark, rng, 4));
      else {
        const tone = (y % plankH === plankH - 1) ? light : base;
        setPixel(buf, ts, x, y, jitter(tone, rng, 6));
      }
    }
  }
  // grain
  for (let i = 0; i < ts; i++) {
    if (rng() < 0.15) {
      const x = Math.floor(rng() * ts);
      for (let y = 0; y < ts; y++) {
        if (y % plankH !== 0)
          setPixel(buf, ts, x, y, jitter(dark, rng, 3));
      }
    }
  }
  return buf;
}

function drawStoneCut(p, ts, rng) {
  const base = hexToRgb(p.primary);
  const mortar = hexToRgb(p.shadow);
  const light = hexToRgb(p.highlight);
  const buf = newTileBuffer(ts, base);
  for (let y = 0; y < ts; y++) {
    for (let x = 0; x < ts; x++) {
      setPixel(buf, ts, x, y, jitter(base, rng, 6));
    }
  }
  // brick layout: 2 rows of bricks; offset rows
  const brickH = Math.max(4, Math.floor(ts / 4));
  const brickW = Math.max(8, Math.floor(ts / 2));
  for (let y = 0; y < ts; y++) {
    if (y % brickH === 0) {
      for (let x = 0; x < ts; x++) setPixel(buf, ts, x, y, jitter(mortar, rng, 4));
    }
  }
  for (let row = 0; row < Math.ceil(ts / brickH); row++) {
    const offset = (row % 2) * Math.floor(brickW / 2);
    for (let bx = -brickW; bx <= ts; bx += brickW) {
      const x = bx + offset;
      if (x >= 0 && x < ts) {
        for (let y = row * brickH; y < (row + 1) * brickH && y < ts; y++) {
          setPixel(buf, ts, x, y, jitter(mortar, rng, 4));
        }
      }
    }
  }
  // highlight a few stones
  const highlights = Math.floor(ts / 8);
  for (let i = 0; i < highlights; i++) {
    const x = 1 + Math.floor(rng() * (ts - 2));
    const y = 1 + Math.floor(rng() * (ts - 2));
    setPixel(buf, ts, x, y, jitter(light, rng, 6));
  }
  return buf;
}

function drawTranslucentGrid(p, ts, rng) {
  const base = hexToRgb(p.highlight);
  const grid = hexToRgb(p.accent);
  // semi-transparent base
  const buf = newTileBuffer(ts, base, 96);
  for (let y = 0; y < ts; y++) {
    for (let x = 0; x < ts; x++) {
      const isEdge = x === 0 || y === 0 || x === ts - 1 || y === ts - 1;
      const alpha = isEdge ? 200 : 96 + Math.floor(rng() * 12);
      const c = isEdge ? grid : base;
      setPixel(buf, ts, x, y, jitter(c, rng, 4), alpha);
    }
  }
  // diagonal sparkle
  const sparkles = 4;
  for (let i = 0; i < sparkles; i++) {
    const x = Math.floor(rng() * ts);
    const y = Math.floor(rng() * ts);
    setPixel(buf, ts, x, y, { r: 255, g: 255, b: 255 }, 220);
  }
  return buf;
}

function drawStoneFireStained(p, ts, rng) {
  const stone = drawStoneCut(p, ts, rng);
  // overlay warm stains
  const stain = hexToRgb(p.accent);
  const stainSpots = 3 + Math.floor(rng() * 3);
  for (let i = 0; i < stainSpots; i++) {
    const cx = Math.floor(rng() * ts);
    const cy = Math.floor(rng() * ts);
    const radius = 2 + Math.floor(rng() * Math.max(2, ts / 5));
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const d2 = dx * dx + dy * dy;
        if (d2 <= radius * radius) {
          const x = cx + dx;
          const y = cy + dy;
          if (x < 0 || y < 0 || x >= ts || y >= ts) continue;
          // blend with existing pixel
          const cur = getPixel(stone, ts, x, y);
          const t = 1 - d2 / (radius * radius);
          const blended = mix(cur, stain, t * 0.4);
          setPixel(stone, ts, x, y, blended);
        }
      }
    }
  }
  return stone;
}

function drawEmberGlow(p, ts, rng) {
  const base = hexToRgb(p.deep);
  const ember = hexToRgb(p.accent);
  const hot = hexToRgb(p.highlight);
  const buf = newTileBuffer(ts, base);
  for (let y = 0; y < ts; y++) {
    for (let x = 0; x < ts; x++) {
      setPixel(buf, ts, x, y, jitter(base, rng, 6));
    }
  }
  // bright speckle
  const emberCount = Math.floor(ts * ts * 0.18);
  for (let i = 0; i < emberCount; i++) {
    const x = Math.floor(rng() * ts);
    const y = Math.floor(rng() * ts);
    const c = rng() < 0.3 ? hot : ember;
    setPixel(buf, ts, x, y, jitter(c, rng, 8));
  }
  // a couple of bright "live" spots
  const live = 2 + Math.floor(rng() * 3);
  for (let i = 0; i < live; i++) {
    const cx = Math.floor(rng() * ts);
    const cy = Math.floor(rng() * ts);
    const r = 1 + Math.floor(rng() * 2);
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy <= r * r)
          setPixel(buf, ts, cx + dx, cy + dy, hot);
      }
    }
  }
  return buf;
}

function drawThatchWeave(p, ts, rng) {
  const base = hexToRgb(p.dry || p.primary);
  const dark = hexToRgb(p.shadow);
  const light = hexToRgb(p.highlight);
  const buf = newTileBuffer(ts, base);
  // diagonal cross-hatch
  for (let y = 0; y < ts; y++) {
    for (let x = 0; x < ts; x++) {
      const d1 = (x + y) % 4 === 0;
      const d2 = (x - y + ts) % 4 === 0;
      let c = base;
      if (d1) c = dark;
      else if (d2) c = light;
      setPixel(buf, ts, x, y, jitter(c, rng, 8));
    }
  }
  return buf;
}

function drawMetalBrushed(p, ts, rng) {
  const base = hexToRgb(p.accent || p.primary);
  const dark = hexToRgb(p.shadow);
  const light = hexToRgb(p.highlight);
  const buf = newTileBuffer(ts, base);
  // horizontal streaks
  for (let y = 0; y < ts; y++) {
    const tone = rng() < 0.4 ? light : rng() < 0.5 ? dark : base;
    for (let x = 0; x < ts; x++) {
      setPixel(buf, ts, x, y, jitter(tone, rng, 4));
    }
  }
  // few brighter highlights
  const hl = Math.floor(ts / 4);
  for (let i = 0; i < hl; i++) {
    const y = Math.floor(rng() * ts);
    for (let x = 0; x < ts; x++) {
      if (rng() < 0.7) setPixel(buf, ts, x, y, jitter(light, rng, 4));
    }
  }
  return buf;
}

const TILE_DRAWERS = {
  soft: drawSoft,
  "tall-blades": drawTallBlades,
  speckle: drawSpeckle,
  rough: drawRough,
  "scatter-yellow": drawScatterYellow,
  "leaves-warm": drawLeavesWarm,
  "bark-light": drawBarkLight,
  "bark-dark": drawBarkDark,
  "plank-vertical": drawPlankVertical,
  "plank-grain": drawPlankGrain,
  "stone-cut": drawStoneCut,
  "translucent-grid": drawTranslucentGrid,
  "stone-fire-stained": drawStoneFireStained,
  "ember-glow": drawEmberGlow,
  "thatch-weave": drawThatchWeave,
  "metal-brushed": drawMetalBrushed,
};

// ----- Atlas composition -----

function compositeAtlas(tilesData, tileSize, atlasCols, atlasRows) {
  const w = tileSize * atlasCols;
  const h = tileSize * atlasRows;
  const buf = new Uint8Array(w * h * 4);
  // checker fallback for empty cells (helps debug visually)
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    buf[o] = 0;
    buf[o + 1] = 0;
    buf[o + 2] = 0;
    buf[o + 3] = 0;
  }
  for (const { col, row, data } of tilesData) {
    const baseX = col * tileSize;
    const baseY = row * tileSize;
    for (let y = 0; y < tileSize; y++) {
      for (let x = 0; x < tileSize; x++) {
        const srcO = (y * tileSize + x) * 4;
        const dstO = ((baseY + y) * w + (baseX + x)) * 4;
        buf[dstO] = data[srcO];
        buf[dstO + 1] = data[srcO + 1];
        buf[dstO + 2] = data[srcO + 2];
        buf[dstO + 3] = data[srcO + 3];
      }
    }
  }
  return { buf, w, h };
}

async function writeAtlas(name, tiles, palette, cfg, outDir, seedSuffix) {
  const { tileSize, atlasGrid, rngSeed } = cfg;
  const seed = `${rngSeed}::${seedSuffix}`;
  const masterRng = makeRng(seed);
  const tilesData = [];
  const idMap = {};
  for (let i = 0; i < tiles.length; i++) {
    const tile = tiles[i];
    const col = i % atlasGrid.cols;
    const row = Math.floor(i / atlasGrid.cols);
    if (row >= atlasGrid.rows) {
      throw new Error(
        `Tile count ${tiles.length} exceeds atlas grid ${atlasGrid.cols}x${atlasGrid.rows}`
      );
    }
    const drawer = TILE_DRAWERS[tile.noise];
    if (!drawer) throw new Error(`Unknown noise kind: ${tile.noise}`);
    // Per-tile sub-RNG so tile order doesn't shift outputs nondeterministically
    const tileRng = makeRng(`${seed}::${tile.id}`);
    // burn one master step to keep determinism explicit
    masterRng();
    const data = drawer(palette, tileSize, tileRng);
    tilesData.push({ col, row, data });
    idMap[tile.id] = { col, row };
  }
  const { buf, w, h } = compositeAtlas(
    tilesData,
    tileSize,
    atlasGrid.cols,
    atlasGrid.rows
  );
  await fs.mkdir(outDir, { recursive: true });
  const pngPath = path.join(outDir, `${name}.png`);
  const jsonPath = path.join(outDir, `${name}.json`);

  // sharp wants a Buffer for raw input. Convert and encode PNG with deterministic settings.
  const png = await sharp(Buffer.from(buf), {
    raw: { width: w, height: h, channels: 4 },
  })
    .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
    .toBuffer();
  await fs.writeFile(pngPath, png);

  const jsonOut = {
    tileSize,
    atlas: {
      cols: atlasGrid.cols,
      rows: atlasGrid.rows,
      width: w,
      height: h,
    },
    tiles: idMap,
  };
  await fs.writeFile(jsonPath, JSON.stringify(jsonOut, null, 2) + "\n");

  return { pngPath, jsonPath, bytes: png.length, tileCount: tiles.length };
}

async function main() {
  const cfg = JSON.parse(await fs.readFile(CONFIG_PATH, "utf8"));
  const results = [];

  for (const [biome, def] of Object.entries(cfg.biomes)) {
    const r = await writeAtlas(
      biome,
      def.tiles,
      def.palette,
      cfg,
      OUT_BIOMES,
      `biome::${biome}`
    );
    results.push({ kind: "biome", name: biome, ...r });
  }

  for (const [group, def] of Object.entries(cfg.structures)) {
    const r = await writeAtlas(
      group,
      def.tiles,
      def.palette,
      cfg,
      OUT_STRUCTURES,
      `structures::${group}`
    );
    results.push({ kind: "structures", name: group, ...r });
  }

  let totalBytes = 0;
  console.log("Generated tilesets:");
  for (const r of results) {
    totalBytes += r.bytes;
    const rel = path.relative(ROOT, r.pngPath);
    console.log(
      `  [${r.kind}/${r.name}] ${rel}  (${r.tileCount} tiles, ${r.bytes} bytes)`
    );
  }
  console.log(`Total atlas bytes: ${totalBytes}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
