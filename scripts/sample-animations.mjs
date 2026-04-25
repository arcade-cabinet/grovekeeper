#!/usr/bin/env node
/**
 * sample-animations.mjs — Wave 3b diagnostic.
 *
 * Given one or more DAE/GLB files (or directories), print the animation clips
 * each contains, with durations. Used to spot-check whether candidate character
 * packs ship with cycles vs static T-pose before committing to convert them.
 *
 * Usage:
 *   pnpm assets:sample <path> [<path>...]
 *
 * For DAE: uses Blender CLI via scripts/blender/sample-animations.py (if the
 *   detector picks Blender). Falls back to a simple text scan of the COLLADA
 *   <library_animations> nodes.
 * For GLB: parses the binary glTF JSON chunk and reads the `animations` array.
 */

import { execFile as nodeExecFile } from "node:child_process";
import { promisify } from "node:util";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const runProcess = promisify(nodeExecFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BLENDER_BIN = "/opt/homebrew/bin/blender";

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function expand(args) {
  const out = [];
  for (const a of args) {
    const abs = path.resolve(a);
    let st;
    try {
      st = await fs.stat(abs);
    } catch {
      console.warn(`[sample] not found: ${a}`);
      continue;
    }
    if (st.isDirectory()) {
      const stack = [abs];
      while (stack.length) {
        const dir = stack.pop();
        const ents = await fs.readdir(dir, { withFileTypes: true });
        for (const e of ents) {
          const p = path.join(dir, e.name);
          if (e.isDirectory()) stack.push(p);
          else if (/\.(dae|glb)$/i.test(e.name)) out.push(p);
        }
      }
    } else {
      out.push(abs);
    }
  }
  return out;
}

/** Quick & dirty COLLADA animation count via text scan (fallback only). */
async function sampleDaeText(p) {
  const buf = await fs.readFile(p, "utf8");
  const animMatches = buf.match(/<animation\b[^>]*\sid="([^"]+)"/g) || [];
  const ids = animMatches.map((m) => /id="([^"]+)"/.exec(m)?.[1]).filter(Boolean);
  const hasLib = buf.includes("<library_animations");
  return { animationCount: ids.length, hasLibraryAnimations: hasLib, ids: ids.slice(0, 12) };
}

/** Sample a DAE via Blender for accurate frame ranges. Returns null if Blender unavailable. */
async function sampleDaeBlender(p) {
  if (!(await fileExists(BLENDER_BIN))) return null;
  const py = path.join(__dirname, "blender", "sample-animations.py");
  if (!(await fileExists(py))) return null;
  const args = ["--background", "--factory-startup", "--python", py, "--", p];
  try {
    const { stdout } = await runProcess(BLENDER_BIN, args, {
      maxBuffer: 8 * 1024 * 1024,
      timeout: 90 * 1000,
    });
    const m = stdout.match(/^__SAMPLE__\s*(.+)$/m);
    if (!m) return null;
    return JSON.parse(m[1]);
  } catch (err) {
    return { error: err.stderr ? String(err.stderr).slice(-300) : String(err.message) };
  }
}

/** Parse GLB binary header + JSON chunk, list animations. */
async function sampleGlb(p) {
  const buf = await fs.readFile(p);
  if (buf.byteLength < 12) return { error: "GLB too small" };
  const magic = buf.readUInt32LE(0);
  if (magic !== 0x46546c67) return { error: "not a GLB (bad magic)" };
  const length = buf.readUInt32LE(8);
  const chunk0Len = buf.readUInt32LE(12);
  const chunk0Type = buf.readUInt32LE(16);
  if (chunk0Type !== 0x4e4f534a) return { error: "first chunk is not JSON" };
  const json = buf.subarray(20, 20 + chunk0Len).toString("utf8").replace(/\0+$/, "");
  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    return { error: `bad JSON: ${e.message}` };
  }
  const anims = (parsed.animations || []).map((a, i) => ({
    name: a.name || `animation_${i}`,
    channels: a.channels?.length ?? 0,
    samplers: a.samplers?.length ?? 0,
  }));
  return {
    fileBytes: length,
    nodeCount: parsed.nodes?.length ?? 0,
    meshCount: parsed.meshes?.length ?? 0,
    skinCount: parsed.skins?.length ?? 0,
    animationCount: anims.length,
    animations: anims,
  };
}

function fmtRow(label, value) {
  return `    ${label.padEnd(22)} ${value}`;
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0) {
    console.error("usage: sample-animations.mjs <file-or-dir> [...]");
    process.exit(2);
  }
  const files = await expand(argv);
  if (files.length === 0) {
    console.error("[sample] no DAE/GLB files found");
    process.exit(2);
  }
  console.log(`[sample] ${files.length} file(s)`);
  for (const f of files) {
    const ext = path.extname(f).toLowerCase();
    console.log("");
    console.log(f);
    if (ext === ".glb") {
      const r = await sampleGlb(f);
      if (r.error) {
        console.log(fmtRow("ERROR", r.error));
        continue;
      }
      console.log(fmtRow("nodes", r.nodeCount));
      console.log(fmtRow("meshes", r.meshCount));
      console.log(fmtRow("skins", r.skinCount));
      console.log(fmtRow("animations", r.animationCount));
      for (const a of r.animations) {
        console.log(fmtRow(`  - ${a.name}`, `channels=${a.channels} samplers=${a.samplers}`));
      }
    } else if (ext === ".dae") {
      const blender = await sampleDaeBlender(f);
      if (blender && !blender.error) {
        console.log(fmtRow("source", "blender"));
        console.log(fmtRow("actions", blender.actionCount ?? 0));
        console.log(fmtRow("nla strips", blender.strips ?? 0));
        for (const a of blender.actions || []) {
          console.log(fmtRow(`  - ${a.name}`, `frames=[${a.frame_start}, ${a.frame_end}]`));
        }
      } else {
        if (blender && blender.error) console.log(fmtRow("blender err", blender.error.slice(0, 80)));
        const r = await sampleDaeText(f);
        console.log(fmtRow("source", "text-scan (fallback)"));
        console.log(fmtRow("animation nodes", r.animationCount));
        console.log(fmtRow("library_animations", r.hasLibraryAnimations ? "present" : "absent"));
        for (const id of r.ids) console.log(fmtRow(`  - id`, id));
      }
    }
  }
}

main().catch((err) => {
  console.error("[sample] fatal:", err);
  process.exit(1);
});
