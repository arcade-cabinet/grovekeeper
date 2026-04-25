/**
 * RC Journey performance suite — e2e/perf.spec.ts
 *
 * Measures runtime FPS during the journey using Playwright's CDP API.
 * Per the spec (§"Testing & verification" / §"Performance"):
 *   - 30-second walk in each of the four biomes (Meadow / Forest / Coast / Grove)
 *   - Targets: ≥ 55 mobile, ≥ 60 desktop
 *   - Numbers committed to docs/rc-journey/perf.md
 *
 * Approach
 * --------
 * For each biome:
 *   1. Teleport player into the biome via `__grove.actions.teleportToBiome(...)`.
 *   2. Start a 30-second movement walk (forward + slight rotation).
 *   3. Sample `Performance.getMetrics` via CDP every second.
 *   4. Compute FPS = frames / elapsed-seconds.
 *   5. Append a row to docs/rc-journey/perf.json (machine-readable).
 *
 * The companion docs/rc-journey/perf.md is generated/maintained manually by
 * the polish wave from perf.json.
 *
 * NOTE — Wave 19 status:
 * Like rc-journey.spec.ts, this is scaffolding. The teleport actions land in
 * Wave 18; until then, the suite gracefully no-ops biomes that aren't yet
 * teleportable so it doesn't break CI.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { type Page, test } from "@playwright/test";

const PERF_JSON = path.join(
  process.cwd(),
  "docs",
  "rc-journey",
  "perf.json",
);

const BIOMES = ["meadow", "forest", "coast", "grove"] as const;
type Biome = (typeof BIOMES)[number];

const WALK_DURATION_MS = 30_000;

interface BiomePerfRecord {
  biome: Biome;
  device: string;
  fps: number;
  frames: number;
  elapsedMs: number;
  timestamp: string;
  /** True if the walk could be exercised. False if Wave 18 isn't wired yet. */
  exercised: boolean;
}

async function ensurePerfJson(): Promise<BiomePerfRecord[]> {
  const dir = path.dirname(PERF_JSON);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(PERF_JSON)) return [];
  try {
    return JSON.parse(fs.readFileSync(PERF_JSON, "utf-8"));
  } catch {
    return [];
  }
}

async function appendPerfRecord(record: BiomePerfRecord): Promise<void> {
  const records = await ensurePerfJson();
  records.push(record);
  fs.writeFileSync(PERF_JSON, JSON.stringify(records, null, 2));
}

async function bootGame(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem("grove-seed-override", "rc-perf-0");
  });
  await page.goto("/?debug");
  const startBtn = page.getByRole("button", {
    name: /start growing|continue grove|new game/i,
  });
  await startBtn.waitFor({ timeout: 15_000 });
  await startBtn.click();
  const beginBtn = page.getByRole("button", {
    name: /begin your grove|begin|start/i,
  });
  await beginBtn.waitFor({ timeout: 5_000 });
  await beginBtn.click();
  await page.waitForFunction(
    () =>
      typeof window.__grove !== "undefined" &&
      window.__grove.snapshot().screen === "playing" &&
      window.__grove.snapshot().player !== null,
    { timeout: 30_000 },
  );
}

async function teleportTo(page: Page, biome: Biome): Promise<boolean> {
  return await page.evaluate((b) => {
    // biome-ignore lint/suspicious/noExplicitAny: debug surface
    const actions = (window.__grove?.actions as any) ?? {};
    if (typeof actions.teleportToBiome === "function") {
      actions.teleportToBiome(b);
      return true;
    }
    return false;
  }, biome);
}

/**
 * Counts requestAnimationFrame ticks over the duration. This is more
 * robust than CDP Performance.getMetrics across browser versions and
 * mirrors what the engine itself sees per frame.
 */
async function measureFps(
  page: Page,
  durationMs: number,
): Promise<{ fps: number; frames: number; elapsedMs: number }> {
  return await page.evaluate(async (dur) => {
    return new Promise<{ fps: number; frames: number; elapsedMs: number }>(
      (resolve) => {
        let frames = 0;
        const start = performance.now();
        const tick = () => {
          frames++;
          if (performance.now() - start >= dur) {
            const elapsed = performance.now() - start;
            resolve({
              fps: frames / (elapsed / 1000),
              frames,
              elapsedMs: elapsed,
            });
            return;
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
    );
  }, durationMs);
}

test.describe("RC journey perf — FPS per biome", () => {
  for (const biome of BIOMES) {
    test(`${biome} — 30s walk`, async ({ page, browserName }, testInfo) => {
      test.setTimeout(WALK_DURATION_MS + 60_000);
      await bootGame(page);

      const teleported = await teleportTo(page, biome);
      if (!teleported) {
        // Wave 18 isn't wired yet for this biome. Record an unexercised entry.
        await appendPerfRecord({
          biome,
          device: testInfo.project.name || browserName,
          fps: 0,
          frames: 0,
          elapsedMs: 0,
          timestamp: new Date().toISOString(),
          exercised: false,
        });
        test.skip(
          true,
          `Wave 18 teleportToBiome(${biome}) not wired yet — recorded skip.`,
        );
        return;
      }

      // Start a continuous walk. Forward + a slow yaw to exercise streaming.
      await page.keyboard.down("w");
      const measurePromise = measureFps(page, WALK_DURATION_MS);
      // Tiny periodic mouse movement to simulate camera drift (every 250ms).
      const drift = (async () => {
        const start = Date.now();
        while (Date.now() - start < WALK_DURATION_MS) {
          await page.mouse.move(
            500 + Math.sin((Date.now() - start) / 800) * 50,
            300,
          );
          await page.waitForTimeout(250);
        }
      })();
      const measurement = await measurePromise;
      await drift;
      await page.keyboard.up("w");

      await appendPerfRecord({
        biome,
        device: testInfo.project.name || browserName,
        fps: Math.round(measurement.fps * 10) / 10,
        frames: measurement.frames,
        elapsedMs: Math.round(measurement.elapsedMs),
        timestamp: new Date().toISOString(),
        exercised: true,
      });
    });
  }
});
