#!/usr/bin/env node
/**
 * Bootstraps Grovekeeper's raw-assets/extracted/ from a sibling voxel-realms
 * checkout. Reads scripts/import-config.json for the allow-list.
 *
 * Idempotent: skips destinations that already exist unless --force.
 *
 * Source root: ../voxel-realms/raw-assets/extracted/
 * Override via VOXEL_REALMS_PATH=/some/path/voxel-realms
 *
 * Usage:
 *   node scripts/import-from-voxel-realms.mjs
 *   node scripts/import-from-voxel-realms.mjs --force
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DEST_ROOT = join(ROOT, "raw-assets", "extracted");
const CONFIG = join(__dirname, "import-config.json");

const FORCE = process.argv.includes("--force");
const SOURCE_ROOT = process.env.VOXEL_REALMS_PATH
  ? join(resolve(process.env.VOXEL_REALMS_PATH), "raw-assets", "extracted")
  : resolve(ROOT, "..", "voxel-realms", "raw-assets", "extracted");

if (!existsSync(SOURCE_ROOT)) {
  console.error(`Source root not found: ${SOURCE_ROOT}`);
  console.error(
    "Set VOXEL_REALMS_PATH or check out voxel-realms next to grovekeeper.",
  );
  process.exit(1);
}

const config = JSON.parse(readFileSync(CONFIG, "utf8"));
const packs = config.packs ?? [];
console.log(
  `Importing ${packs.length} packs from ${SOURCE_ROOT} (force=${FORCE})`,
);

mkdirSync(DEST_ROOT, { recursive: true });

let copied = 0;
let skipped = 0;
let missing = 0;

for (const pack of packs) {
  const src = join(SOURCE_ROOT, pack);
  const dst = join(DEST_ROOT, pack);

  if (!existsSync(src)) {
    console.warn(`  ✗ missing source: ${pack}`);
    missing++;
    continue;
  }

  if (existsSync(dst) && !FORCE) {
    skipped++;
    console.log(`  ✓ already-have ${pack}`);
    continue;
  }

  mkdirSync(dst, { recursive: true });
  // -a: archive (preserves attrs, recursive); --no-perms is handy across mounts.
  // Trailing slash on src copies CONTENTS into dst.
  const r = spawnSync(
    "rsync",
    ["-a", "--no-perms", `${src}/`, `${dst}/`],
    { stdio: "inherit" },
  );
  if (r.status === 0) {
    copied++;
    const size = (() => {
      try {
        return statSync(dst).size;
      } catch {
        return 0;
      }
    })();
    console.log(`  ✓ imported ${pack}`);
    void size;
  } else {
    console.error(`  ✗ rsync failed for ${pack}`);
  }
}

console.log(`\nDone. copied=${copied} skipped=${skipped} missing=${missing}`);
