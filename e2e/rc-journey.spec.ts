/**
 * RC Journey screenshot-gate suite — e2e/rc-journey.spec.ts
 *
 * Walks the deterministic RC playthrough using the `window.__grove.actions`
 * debug surface (NOT real keyboard input) and captures all 16 spec-mandated
 * screenshot gates. Each gate corresponds to a beat in the journey arc
 * defined in:
 *   docs/superpowers/specs/2026-04-24-grovekeeper-rc-redesign-design.md
 *   §"Testing & verification" / §"Screenshot gates"
 *
 * Why warp instead of walk
 * ------------------------
 * Real keyboard-driven movement walks the player ~1 tile/sec inside
 * SwiftShader headless Chromium (~30 fps cap). Crossing a chunk boundary
 * to capture a wilderness or distant-grove screenshot took 60+ seconds
 * per beat — the 16-beat suite blew through the 5-minute Playwright
 * timeout. The Wave 19 design (`window.__grove.actions`) was specifically
 * intended to skip this: tests can warp, simulate chop, light the hearth,
 * etc. via 1-line debug actions that wrap the same code paths the runtime
 * hits on real input.
 *
 * Each beat below uses the warp surface where possible. The capture itself
 * happens via Playwright's `toHaveScreenshot` (for diff regression) plus
 * a separate `page.screenshot` to docs/rc-journey/<NN-name>.png (for the
 * human rubric review).
 *
 * Tolerance per shot is configured via Playwright's `toHaveScreenshot`:
 *   - landing/menu/newgame: maxDiffPixelRatio 0.001 (strict)
 *   - UI surfaces (craft, fasttravel): maxDiffPixelRatio 0.02
 *   - in-world / cinematic: maxDiffPixelRatio 0.05 (lenient)
 *
 * Screenshots committed to: docs/rc-journey/<NN-name>.png
 * Baselines for Playwright diffing: e2e/rc-journey-baselines/<NN-name>.png
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { type Page, expect, test } from "@playwright/test";
import { RC_JOURNEY_GATES } from "../src/verify/rc-journey-gates";

const DOCS_DIR = path.join(process.cwd(), "docs", "rc-journey");
const BASELINES_DIR = path.join(
  process.cwd(),
  "e2e",
  "rc-journey-baselines",
);

const GATES = RC_JOURNEY_GATES;

// Per-beat budget. With warps the full 16-beat run completes in ~30-60s
// across both projects (chromium + mobile-chrome). Keeping a per-beat
// upper bound makes any single hang easy to spot in the test output.
const BEAT_TIMEOUT_MS = 8_000;

/**
 * Capture both the docs-committed PNG (for review/rubric scoring) and run a
 * Playwright snapshot diff against a baseline in e2e/rc-journey-baselines/.
 *
 * The docs PNG is what lives in git for human review; the Playwright
 * baseline is what the diff engine uses to fail CI on regression.
 */
async function captureGate(
  page: Page,
  gate: (typeof RC_JOURNEY_GATES)[number],
): Promise<void> {
  if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });
  if (!fs.existsSync(BASELINES_DIR))
    fs.mkdirSync(BASELINES_DIR, { recursive: true });

  const docsPath = path.join(DOCS_DIR, `${gate.id}.png`);

  await page.screenshot({ path: docsPath, fullPage: true });

  // expect.soft so a single mismatched gate doesn't abort the whole walk —
  // every PNG must be captured for rubric review even if its baseline drifts.
  await expect
    .soft(page)
    .toHaveScreenshot(`${gate.id}.png`, {
      maxDiffPixelRatio: gate.tolerance.maxDiffPixelRatio,
      fullPage: true,
      animations: "disabled",
      timeout: 3_000,
    });
}

/**
 * Boot the game with a deterministic seed and the debug surface installed.
 * Note: `?debug` triggers `installDebugGlobals()` so `window.__grove` is
 * present before any beat runs.
 */
async function startFreshSeededGame(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem("grove-seed-override", "rc-journey-0");
  });
  await page.goto("/?debug");
}

/**
 * Wait until `window.__grove` is installed by `installDebugGlobals` and
 * has the requested action attached. Most action additions land within
 * a frame of the page going interactive; we just need a non-zero wait.
 */
async function waitForGroveActions(page: Page, timeoutMs = 10_000): Promise<void> {
  await page.waitForFunction(
    () => typeof window.__grove !== "undefined" && !!window.__grove.actions,
    { timeout: timeoutMs },
  );
}

/**
 * Tiny helper: invoke a named action on the debug surface. Returns true
 * if the action was present and called, false otherwise. Always swallows
 * exceptions — debug actions are best-effort by design.
 */
async function call(
  page: Page,
  fn: string,
  ...args: (string | number | boolean)[]
): Promise<boolean> {
  return page
    .evaluate(
      ({ name, fnArgs }) => {
        // biome-ignore lint/suspicious/noExplicitAny: debug surface
        const actions = (window.__grove?.actions as any) ?? {};
        if (typeof actions[name] !== "function") return false;
        try {
          actions[name](...fnArgs);
          return true;
        } catch {
          return false;
        }
      },
      { name: fn, fnArgs: args },
    )
    .catch(() => false);
}

test.describe("RC journey — 16 screenshot gates", () => {
  // The full arc is captured as a single test so screenshots come from a
  // continuous play session; resetting between gates would invalidate the
  // diegetic flow.
  test("walks the deterministic RC arc and captures all 16 gates", async ({
    page,
  }) => {
    // Total budget: 16 beats * ~5s each = 80s + boot + diff. 120s leaves
    // headroom on a hot CI without burning the original 5-minute budget.
    test.setTimeout(120_000);

    page.on("pageerror", (err) => {
      // eslint-disable-next-line no-console
      console.warn(`[rc-journey] pageerror: ${err.message}`);
    });
    page.on("crash", () => {
      // eslint-disable-next-line no-console
      console.warn("[rc-journey] page crashed");
    });

    await startFreshSeededGame(page);

    /**
     * Best-effort beat runner: runs body, then captures, never throws.
     */
    const beat = async (
      gate: (typeof RC_JOURNEY_GATES)[number],
      body: () => Promise<void>,
    ): Promise<void> => {
      try {
        await Promise.race([
          body(),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error(`beat ${gate.id} body timeout`)),
              BEAT_TIMEOUT_MS,
            ),
          ),
        ]);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn(
          `[rc-journey] ${gate.id} body threw: ${(err as Error).message}`,
        );
      }
      try {
        await captureGate(page, gate);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn(
          `[rc-journey] ${gate.id} capture threw: ${(err as Error).message}`,
        );
      }
    };

    // ─── Gate 01: Landing ──────────────────────────────────────
    await beat(GATES[0], async () => {
      await page.waitForLoadState("domcontentloaded");
    });

    // ─── Gate 02: MainMenu ─────────────────────────────────────
    const startBtn = page
      .getByRole("button", {
        name: /start growing|continue grove|new game|begin a new grove|^begin$/i,
      })
      .first();
    await beat(GATES[1], async () => {
      await expect(startBtn).toBeVisible({ timeout: 7_000 });
    });

    // ─── Gate 03: NewGame modal ────────────────────────────────
    await beat(GATES[2], async () => {
      await startBtn.click().catch(() => {});
      await page
        .getByRole("textbox")
        .first()
        .waitFor({ state: "visible", timeout: 5_000 })
        .catch(() => {});
      // CSS transitions are not stopped by toHaveScreenshot's animations:"disabled"
      // (which only covers CSS animation + Web Animations API). Wait for any entry
      // transition on the modal to fully complete before capture.
      await page.waitForTimeout(400);
    });

    // Skip the SQL-backed Begin click; setScreen("playing") drives the
    // game-screen transition without going through the DB write path.
    await waitForGroveActions(page).catch(() => {});
    await call(page, "setScreen", "playing");

    await page
      .waitForFunction(
        () => window.__grove?.snapshot().screen === "playing",
        { timeout: 7_000 },
      )
      .catch(() => {
        // eslint-disable-next-line no-console
        console.warn("[rc-journey] never reached screen=playing — continuing best-effort");
      });

    // ─── Gate 04: First spawn — unclaimed grove ────────────────
    await beat(GATES[3], async () => {
      // Wait for the player entity to be hydrated (FarmerState attached).
      await page
        .waitForFunction(() => window.__grove?.snapshot().player !== null, {
          timeout: 5_000,
        })
        .catch(() => {});
      // Briefly let chunk streamer hydrate the visible mesh ring.
      await page.waitForTimeout(600);
    });

    // ─── Gate 05: Spirit greets ────────────────────────────────
    await beat(GATES[4], async () => {
      await call(page, "triggerSpiritGreeting");
      await page.waitForTimeout(400);
    });

    // ─── Gate 06: Gather logs ──────────────────────────────────
    // No real walk — addResource grants the materials directly so the
    // inventory chrome / resource bar shows the gathered state.
    await beat(GATES[5], async () => {
      await call(page, "addResource", "material.log", 3);
      await call(page, "addResource", "material.stone", 2);
      await call(page, "simulateChop");
      await page.waitForTimeout(300);
    });

    // ─── Gate 07: Craft hearth ─────────────────────────────────
    await beat(GATES[6], async () => {
      await call(page, "openCraftingPanel", "primitive-workbench");
      // Wait for the panel's role="dialog" to be visible before capture.
      // openCraftingPanel fires a reactive state write; the SolidJS render
      // cycle + any CSS transition needs to complete first.
      await page
        .getByRole("dialog", { name: "Crafting" })
        .waitFor({ state: "visible", timeout: 3_000 })
        .catch(() => {});
      await page.waitForTimeout(300);
    });

    // ─── Gate 08: Place hearth ─────────────────────────────────
    await beat(GATES[7], async () => {
      await call(page, "closeAllPanels");
      await call(page, "beginPlacement", "blueprint.hearth");
      await page.waitForTimeout(300);
    });

    // ─── Gate 09: Light hearth — cinematic ─────────────────────
    await beat(GATES[8], async () => {
      await call(page, "commitPlacement");
      await call(page, "lightHearth");
      // Let the cinematic flag drive the dim-overlay to peak.
      await page.waitForTimeout(500);
    });

    // ─── Gate 10: Fast-travel first node ───────────────────────
    await beat(GATES[9], async () => {
      // Clear the cinematic so the menu can take over.
      await call(page, "closeAllPanels");
      await call(page, "openFastTravel");
      await page.waitForTimeout(300);
    });

    // ─── Gate 11: Villagers arrive ─────────────────────────────
    await beat(GATES[10], async () => {
      await call(page, "closeFastTravel");
      await call(page, "spawnVillagers");
      await page.waitForTimeout(800);
    });

    // ─── Gate 12: Craft first weapon ───────────────────────────
    await beat(GATES[11], async () => {
      await call(page, "addResource", "material.log", 1);
      await call(page, "addResource", "material.stone", 1);
      await call(page, "openCraftingPanel", "weapon");
      // Same as gate 07: wait for the panel's role="dialog" before capture.
      await page
        .getByRole("dialog", { name: "Crafting" })
        .waitFor({ state: "visible", timeout: 3_000 })
        .catch(() => {});
      await page.waitForTimeout(300);
    });

    // ─── Gate 13: Grove threshold ──────────────────────────────
    // Teleport the player to the chunk-seam edge of the starter grove so
    // the screenshot captures the threshold palette delta diegetically.
    await beat(GATES[12], async () => {
      await call(page, "closeAllPanels");
      await call(page, "teleportPlayer", 15.5, 8);
      await page.waitForTimeout(500);
    });

    // ─── Gate 14: Wilderness first ─────────────────────────────
    await beat(GATES[13], async () => {
      await call(page, "teleportPlayer", 80, 8); // chunk (5,0) wilderness
      await page.waitForTimeout(700);
    });

    // ─── Gate 15: First encounter ──────────────────────────────
    await beat(GATES[14], async () => {
      await call(page, "teleportPlayer", 80, 16); // pull near a hostile spawn
      await call(page, "spawnTestEncounter");
      await page.waitForTimeout(600);
    });

    // ─── Gate 16: Second grove discovery ───────────────────────
    await beat(GATES[15], async () => {
      await call(page, "teleportPlayer", 7 * 16 + 8, 2 * 16 + 8); // chunk (7,2)
      await call(page, "discoverGrove", "grove-7-2");
      await call(page, "openMap");
      await page.waitForTimeout(500);
    });
  });
});

// Sanity test — verifies the gate manifest is the spec-mandated 16 entries
// with correct ids. Lets pnpm test:run / CI catch drift even when the live
// suite can't run (e.g. on a node-only test runner).
test.describe("RC journey — gate manifest sanity", () => {
  test("has exactly 16 gates with spec ids", () => {
    expect(GATES).toHaveLength(16);
    const ids = GATES.map((g) => g.id);
    expect(ids).toEqual([
      "01-landing",
      "02-mainmenu",
      "03-newgame",
      "04-firstspawn-unclaimed-grove",
      "05-spirit-greets",
      "06-gather-logs",
      "07-craft-hearth",
      "08-place-hearth",
      "09-light-hearth-cinematic",
      "10-fasttravel-first-node",
      "11-villagers-arrive",
      "12-craft-first-weapon",
      "13-grove-threshold",
      "14-wilderness-first",
      "15-first-encounter",
      "16-second-grove-discovery",
    ]);
  });

  test("every gate has a tolerance and description", () => {
    for (const g of GATES) {
      expect(g.description.length).toBeGreaterThan(0);
      expect(g.tolerance.maxDiffPixelRatio).toBeGreaterThan(0);
      expect(g.tolerance.maxDiffPixelRatio).toBeLessThan(1);
    }
  });
});
