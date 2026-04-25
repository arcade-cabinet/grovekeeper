#!/usr/bin/env node
/**
 * convert-dae-to-glb.mjs — Wave 3b sub-pipeline
 *
 * Converts a curated set of DAE files into GLB while preserving animation tracks.
 * Reads scripts/conversion-config.json for the source list.
 * Writes to raw-assets/converted/{src-relative}.glb (mirrored tree).
 *
 * Converter selection (priority order, runtime-detected):
 *   1. Blender CLI — preferred *if* it ships the collada_import operator. Best
 *      animation handling (NLA-aware multi-clip export). Blender 5.x dropped
 *      this operator (verified 2026-04-24, Blender 5.1.1) and ships no
 *      replacement, so the detector will fall through.
 *   2. assimp CLI — actual primary path on this machine. Assimp 6.x preserves
 *      rig animations and writes valid binary GLB. Per-clip DAEs (the Chaos-Slice
 *      pack convention) become single-animation GLBs, which is exactly what
 *      ModelRenderer expects for one-clip-per-file workflows.
 *
 * Idempotent: skips files whose source mtime <= dest mtime.
 * Failure-tolerant: per-file errors are logged, batch continues.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const execFileP = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

const BLENDER_BIN = "/opt/homebrew/bin/blender";
const ASSIMP_BIN = "assimp";
const BLENDER_PY = path.join(__dirname, "blender", "dae-to-glb.py");

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function blenderHasCollada() {
  // bpy.ops.wm uses lazy attribute resolution, so `hasattr` always returns True.
  // Real check is whether `collada_import` appears in dir(bpy.ops.wm).
  try {
    const probe =
      "import bpy; print('HAS_COLLADA' if 'collada_import' in dir(bpy.ops.wm) else 'NO_COLLADA')";
    const { stdout } = await execFileP(
      BLENDER_BIN,
      ["--background", "--factory-startup", "--python-expr", probe],
      { timeout: 30 * 1000 },
    );
    return /HAS_COLLADA/.test(stdout);
  } catch {
    return false;
  }
}

async function detectConverter() {
  // Try Blender first, but only if it actually has the COLLADA import operator.
  // Blender 5.x removed it; the script falls through to assimp in that case.
  if (await fileExists(BLENDER_BIN)) {
    try {
      const { stdout } = await execFileP(BLENDER_BIN, ["--version"]);
      const v = stdout.split("\n")[0].trim();
      if (await blenderHasCollada()) {
        return { kind: "blender", bin: BLENDER_BIN, version: v };
      }
      console.warn(`[convert] ${v} lacks collada_import operator — falling back to assimp`);
    } catch {
      // fall through
    }
  }
  // assimp via PATH (works for COLLADA on Assimp 6.x).
  try {
    const { stdout } = await execFileP(ASSIMP_BIN, ["version"]);
    const line = stdout.split("\n").find((l) => /Asset Import Library|Assimp/i.test(l)) || stdout.split("\n")[0];
    return { kind: "assimp", bin: ASSIMP_BIN, version: (line || "assimp").trim() };
  } catch {
    return null;
  }
}

async function newerThan(srcAbs, destAbs) {
  let destStat;
  try {
    destStat = await fs.stat(destAbs);
  } catch {
    return true; // dest missing => convert
  }
  const srcStat = await fs.stat(srcAbs);
  return srcStat.mtimeMs > destStat.mtimeMs;
}

async function convertWithBlender(srcAbs, destAbs) {
  await fs.mkdir(path.dirname(destAbs), { recursive: true });
  const args = [
    "--background",
    "--factory-startup",
    "--python",
    BLENDER_PY,
    "--",
    srcAbs,
    destAbs,
  ];
  const { stdout, stderr } = await execFileP(BLENDER_BIN, args, {
    maxBuffer: 32 * 1024 * 1024,
    timeout: 5 * 60 * 1000,
  });
  return { stdout, stderr };
}

async function convertWithAssimp(srcAbs, destAbs) {
  await fs.mkdir(path.dirname(destAbs), { recursive: true });
  const { stdout, stderr } = await execFileP(ASSIMP_BIN, ["export", srcAbs, destAbs], {
    maxBuffer: 16 * 1024 * 1024,
    timeout: 2 * 60 * 1000,
  });
  return { stdout, stderr };
}

function destPathFor(cfg, srcRel) {
  // Replace .dae extension with .glb, preserve directory structure.
  const base = srcRel.replace(/\.dae$/i, ".glb");
  return path.join(REPO_ROOT, cfg.destRoot, base);
}

function srcAbsPathFor(cfg, srcRel) {
  return path.join(REPO_ROOT, cfg.sourceRoot, srcRel);
}

async function main() {
  const cfgPath = path.join(__dirname, "conversion-config.json");
  const cfgRaw = await fs.readFile(cfgPath, "utf8");
  const cfg = JSON.parse(cfgRaw);

  const converter = await detectConverter();
  if (!converter) {
    console.error(
      "[convert] no converter found. Install Blender (preferred) at /opt/homebrew/bin/blender or assimp on PATH.",
    );
    process.exit(2);
  }
  console.log(`[convert] using ${converter.kind}: ${converter.version}`);
  console.log(`[convert] entries: ${cfg.entries.length}`);

  const t0 = Date.now();
  let ok = 0;
  let skipped = 0;
  let missing = 0;
  let failed = 0;
  const failures = [];

  for (const entry of cfg.entries) {
    const srcRel = entry.src;
    const srcAbs = srcAbsPathFor(cfg, srcRel);
    const destAbs = destPathFor(cfg, srcRel);

    if (!(await fileExists(srcAbs))) {
      missing += 1;
      console.warn(`[convert] MISSING source: ${srcRel}`);
      continue;
    }

    if (!(await newerThan(srcAbs, destAbs))) {
      skipped += 1;
      console.log(`[convert] skip (up-to-date): ${srcRel}`);
      continue;
    }

    process.stdout.write(`[convert] ${srcRel} ... `);
    try {
      const fn = converter.kind === "blender" ? convertWithBlender : convertWithAssimp;
      const { stderr } = await fn(srcAbs, destAbs);
      // The Blender script writes status to stderr; surface its tail line.
      const tail = (stderr || "").trim().split("\n").pop() || "";
      ok += 1;
      console.log(`OK ${tail ? `(${tail})` : ""}`);
    } catch (err) {
      failed += 1;
      const msg = err.stderr ? String(err.stderr).trim().split("\n").slice(-3).join(" | ") : err.message;
      failures.push({ src: srcRel, error: msg });
      console.error(`FAIL: ${msg}`);
    }
  }

  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  console.log("");
  console.log(`[convert] done in ${dt}s`);
  console.log(`[convert] ok=${ok} skipped=${skipped} missing=${missing} failed=${failed}`);
  if (failures.length > 0) {
    console.log("[convert] failure details:");
    for (const f of failures) console.log(`  - ${f.src}: ${f.error}`);
  }
  // Non-zero only if literally everything failed; partial success is success.
  if (failed > 0 && ok === 0 && skipped === 0) process.exit(3);
}

main().catch((err) => {
  console.error("[convert] fatal:", err);
  process.exit(1);
});
