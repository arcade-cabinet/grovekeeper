#!/usr/bin/env node
/**
 * Reads scripts/asset-curation.json and copies each {source -> dest} entry.
 * - category "model" / "audio": single-file copy
 * - category "model_dir" / "audio_dir": directory copy (mirror contents)
 *
 * Idempotent: copies only when source is newer or dest is missing. Logs
 * MISSING for sources that don't exist (parallel waves may not have produced
 * them yet) and TODO for entries with _TODO markers (provisional choices).
 *
 * Does NOT do DAE->GLB conversion or tileset generation. Those are separate
 * waves that produce their outputs and add their own curation entries.
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CURATION = join(__dirname, "asset-curation.json");

const map = JSON.parse(readFileSync(CURATION, "utf8"));
const entries = [...(map.models ?? []), ...(map.audio ?? [])];

let copied = 0;
let skipped = 0;
let missing = 0;
let todos = 0;

for (const e of entries) {
  if (!e || typeof e !== "object") continue;
  if (e._TODO) todos++;
  if (!e.source || !e.dest || !e.category) continue;

  const src = join(ROOT, e.source);
  const dst = join(ROOT, e.dest);

  if (!existsSync(src)) {
    console.warn(`  MISSING SOURCE: ${e.source}`);
    missing++;
    continue;
  }

  const isDir = e.category.endsWith("_dir");
  if (isDir) {
    // Directory copy. dest should exist as a directory.
    mkdirSync(dst, { recursive: true });
    const r = spawnSync(
      "rsync",
      ["-a", "--no-perms", `${src}/`, `${dst}/`],
      { stdio: "ignore" },
    );
    if (r.status === 0) {
      copied++;
    } else {
      console.error(`  ✗ rsync dir failed: ${e.source} -> ${e.dest}`);
    }
  } else {
    mkdirSync(dirname(dst), { recursive: true });
    if (existsSync(dst)) {
      try {
        const a = statSync(src).mtimeMs;
        const b = statSync(dst).mtimeMs;
        if (b >= a) {
          skipped++;
          continue;
        }
      } catch {
        /* fall through to copy */
      }
    }
    const r = spawnSync("cp", ["-p", src, dst], { stdio: "ignore" });
    if (r.status === 0) {
      copied++;
    } else {
      console.error(`  ✗ cp failed: ${e.source} -> ${e.dest}`);
    }
  }
}

console.log(
  `\nCurate done. copied=${copied} skipped=${skipped} missing=${missing} todos=${todos}`,
);
if (todos) {
  console.log(`\nTODO entries (provisional choices needing human review):`);
  for (const e of entries) {
    if (e?._TODO) {
      console.log(`  - ${e.dest} :: ${e._TODO}`);
    }
  }
}
