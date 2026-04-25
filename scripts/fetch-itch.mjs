#!/usr/bin/env node
/**
 * Bulk-download every itch.io pack listed in scripts/itch-packs.json into
 * raw-assets/archives/, then extract into raw-assets/extracted/. Idempotent
 * (skips downloads where the archive already exists with matching md5/size).
 *
 * Reads ITCH_API_KEY from .env. Pulls owned-pack metadata from the itch API
 * via /api/1/key/my-owned-keys and filters down to the allow-list.
 *
 * Pattern adapted from voxel-realms/scripts/fetch-itch-audio.mjs.
 *
 * Usage:
 *   node scripts/fetch-itch.mjs        # download + extract everything
 *   node scripts/fetch-itch.mjs --dry  # list what would be downloaded
 */

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const ARCHIVES = join(ROOT, "raw-assets", "archives");
const EXTRACTED = join(ROOT, "raw-assets", "extracted");
const PACKS_PATH = join(__dirname, "itch-packs.json");

const DRY = process.argv.includes("--dry");

// .env loader (no dep)
function readEnv() {
  const envPath = join(ROOT, ".env");
  if (!existsSync(envPath)) return {};
  const text = readFileSync(envPath, "utf8");
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

const env = readEnv();
const KEY = env.ITCH_API_KEY ?? process.env.ITCH_API_KEY;
if (!KEY) {
  console.error("ITCH_API_KEY missing from .env (and not in process env)");
  console.error("Copy .env.example to .env and fill in the key.");
  process.exit(1);
}

const packsConfig = JSON.parse(readFileSync(PACKS_PATH, "utf8"));
const ALLOW_LIST = new Set([
  ...(packsConfig.audio ?? []),
  ...(packsConfig.voxel_models ?? []),
]);
console.log(`Fetching ${ALLOW_LIST.size} allow-listed packs (dry=${DRY})`);

mkdirSync(ARCHIVES, { recursive: true });
mkdirSync(EXTRACTED, { recursive: true });

const owned = await apiGet("/api/1/key/my-owned-keys");
if (!owned?.owned_keys) {
  console.error("Failed to fetch owned keys from itch.io API");
  process.exit(1);
}
const packs = owned.owned_keys.filter((p) => ALLOW_LIST.has(p.game?.title));
const missing = [...ALLOW_LIST].filter(
  (title) => !packs.some((p) => p.game?.title === title),
);
if (missing.length) {
  console.warn("Allow-listed but not in owned library:");
  for (const m of missing) console.warn(`  - ${m}`);
}

let downloaded = 0;
let skipped = 0;
let failed = 0;

for (const pack of packs) {
  const dkid = pack.id;
  const gameId = pack.game.id;
  const title = pack.game.title;
  console.log(`\n[${title}]`);

  const uploadsResp = await apiGet(
    `/api/1/key/game/${gameId}/uploads?download_key_id=${dkid}`,
  );
  const uploads = (uploadsResp?.uploads ?? []).filter((u) =>
    u.filename?.toLowerCase().endsWith(".zip"),
  );
  if (!uploads.length) {
    console.warn(`  no .zip uploads`);
    continue;
  }

  for (const upload of uploads) {
    const filename = upload.filename;
    const dest = join(ARCHIVES, filename);

    if (existsSync(dest)) {
      const localBytes = statSync(dest).size;
      if (localBytes === upload.size) {
        const hash = createHash("md5");
        hash.update(readFileSync(dest));
        if (hash.digest("hex") === upload.md5_hash) {
          skipped++;
          console.log(`  ✓ already-have ${filename}`);
          continue;
        }
      }
    }

    if (DRY) {
      console.log(`  WOULD DOWNLOAD: ${filename} (${upload.size} bytes)`);
      downloaded++;
      continue;
    }

    const dlInfo = await apiGet(
      `/api/1/key/upload/${upload.id}/download?download_key_id=${dkid}`,
    );
    const signedUrl = dlInfo?.url;
    if (!signedUrl) {
      console.error(`  no signed URL`);
      failed++;
      continue;
    }
    const r = spawnSync("curl", ["-sS", "-fL", "-o", dest, signedUrl], {
      stdio: "inherit",
    });
    if (r.status !== 0) {
      console.error(`  curl failed`);
      failed++;
      continue;
    }
    if (statSync(dest).size !== upload.size) {
      console.error(`  size mismatch`);
      failed++;
      continue;
    }
    downloaded++;
    console.log(`  ✓ downloaded ${filename}`);
  }
}

if (!DRY) {
  console.log("\nExtracting…");
  const fs = await import("node:fs/promises");
  for (const f of await fs.readdir(ARCHIVES)) {
    if (!f.endsWith(".zip")) continue;
    const slug = f
      .replace(/\.zip$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-+|-+$)/g, "");
    const target = join(EXTRACTED, slug);
    if (existsSync(target)) {
      continue;
    }
    mkdirSync(target, { recursive: true });
    const r = spawnSync("unzip", ["-q", join(ARCHIVES, f), "-d", target], {
      stdio: "inherit",
    });
    if (r.status === 0) console.log(`  ✓ extracted ${f} → ${slug}`);
    else console.error(`  ✗ failed ${f}`);
  }
}

console.log(
  `\nDone. downloaded=${downloaded} skipped=${skipped} failed=${failed}`,
);

async function apiGet(path) {
  const r = spawnSync(
    "curl",
    [
      "-sS",
      "-fL",
      "-H",
      `Authorization: Bearer ${KEY}`,
      `https://itch.io${path}`,
    ],
    { encoding: "utf8" },
  );
  if (r.status !== 0) {
    console.error(`apiGet failed: ${path}`);
    return null;
  }
  try {
    return JSON.parse(r.stdout);
  } catch {
    console.error(`apiGet non-JSON: ${path}`);
    return null;
  }
}
