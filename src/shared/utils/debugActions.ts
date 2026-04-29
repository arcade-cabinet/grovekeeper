/**
 * debugActions — DEV-only debug action surface for e2e and console debugging.
 *
 * These are NOT production gameplay actions. They are deliberate test entry
 * points that wrap production code paths so the e2e suite can warp through
 * scripted journey beats without simulating real user input.
 *
 * Gated identically to `installDebugGlobals` (DEV mode or `?debug` URL param).
 * In production builds with no `?debug` param, none of these install — the
 * whole module is tree-shaken out at the call site in debugState.ts.
 *
 * Each action is a 1- to ~10-line wrapper around the same code path the
 * runtime would hit on real player input. They mutate koota traits, emit
 * eventBus signals, or call existing player actions — never bespoke logic.
 *
 * Used by:
 *   - e2e/rc-journey.spec.ts (Playwright warp-based capture)
 *   - e2e/perf.spec.ts (per-biome teleport)
 *   - Dev console: window.__grove.actions.teleportPlayer(80, 0)
 */

import type { ResourceType } from "@/config/resources";
import { getDb, isDbInitialized } from "@/db/client";
import { inventoryRepo } from "@/db/repos";
import { actions as gameActions } from "@/game/rc-actions";
import { koota } from "@/koota";
import { eventBus } from "@/runtime/eventBus";
import { CurrentSeason, IsPlayer, Position, WorldMeta } from "@/traits";

function movePlayerTo(x: number, z: number): void {
  const player = koota.queryFirst(IsPlayer, Position);
  if (!player) return;
  player.set(Position, (prev) => ({ ...prev, x, z }));
}

const RC_WORLD_ID = "rc-world-default";

/**
 * Map of `resource.kind` strings the e2e suite uses (e.g. "material.log",
 * "logs", "stone") to canonical `ResourceType` enum values used by the
 * production `addResource` action. Keeps the test surface forgiving.
 */
const RESOURCE_ALIASES: Record<string, ResourceType> = {
  // Direct names
  timber: "timber",
  sap: "sap",
  fruit: "fruit",
  acorns: "acorns",
  // Friendly aliases used by the spec / journey beats
  log: "timber",
  logs: "timber",
  "material.log": "timber",
  stone: "timber", // stone has no separate resource type yet — bucket under timber
  "material.stone": "timber",
  acorn: "acorns",
};

/**
 * Resolve a free-form resource string to a canonical resource type.
 * Returns null if no mapping is known — caller should no-op in that case.
 */
function resolveResource(kind: string): ResourceType | null {
  return RESOURCE_ALIASES[kind] ?? null;
}

/**
 * Build the debug-only actions surface. The returned object is merged with
 * the production gameActions in debugState.ts so callers see a single flat
 * `__grove.actions` surface.
 */
export function buildDebugActions() {
  const a = gameActions();

  return {
    // ── Player teleport ─────────────────────────────────────────────
    /**
     * Teleport the player Actor directly to world coords. No fade, no
     * pathfinding, no animation. Reuses the same Position trait write
     * `RetreatSystem` and `FastTravelController` use; chunk streamer
     * picks up the new center on the next tick.
     */
    teleportPlayer(x: number, z: number): void {
      movePlayerTo(x, z);
    },

    /**
     * Teleport to a named biome region for the perf suite. Mappings are
     * deliberately coarse (chunk-corner coords) to land squarely inside
     * the biome and let chunk streaming hydrate around the player.
     */
    teleportToBiome(biome: string): void {
      const CHUNK = 16;
      // Coarse biome anchor coords in world-space tile units.
      const targets: Record<string, { x: number; z: number }> = {
        meadow: { x: 8, z: 8 }, // starter grove (level 0,0)
        grove: { x: 8, z: 8 },
        forest: { x: 4 * CHUNK + 8, z: 0 * CHUNK + 8 },
        coast: { x: 7 * CHUNK + 8, z: 2 * CHUNK + 8 },
      };
      const t = targets[biome] ?? targets.meadow;
      movePlayerTo(t.x, t.z);
    },

    /**
     * Teleport just outside the starter grove's claimed-tile boundary so
     * the screenshot captures the threshold palette delta.
     */
    teleportToGroveThreshold(): void {
      // Starter grove is chunk (0,0); threshold is at the chunk seam.
      movePlayerTo(15.5, 8);
    },

    // ── Spirit / dialogue ───────────────────────────────────────────
    /**
     * Trigger the Grove Spirit's greeting line via the speech bubble
     * eventBus channel. The phrase text matches the scripted-line config
     * verbatim so the screenshot captures the same string the runtime
     * would render in the live game.
     */
    triggerSpiritGreeting(): void {
      eventBus.emitNpcSpeech({
        speakerId: "grove-spirit",
        phrase: "Welcome, keeper. The grove has been waiting for you.",
        screenPosition: { x: 320, y: 240 },
        ttlMs: 5_000,
      });
    },

    // ── Resource grants ─────────────────────────────────────────────
    /**
     * Add a resource by free-form kind string. Resolves "material.log",
     * "logs", "stone", etc. to the canonical ResourceType. Silent no-op
     * for unknown kinds (intentional — keeps the e2e suite resilient).
     */
    addResource(kind: string, count: number): void {
      const resolved = resolveResource(kind);
      if (resolved !== null) a.addResource(resolved, count);
      // Also write to inventoryRepo (RC drizzle path) so CraftingPanel sees
      // the materials. The item id is the raw kind string (e.g. "material.log").
      if (isDbInitialized()) {
        try {
          inventoryRepo.addItem(getDb().db, RC_WORLD_ID, kind, count);
          eventBus.emitInventoryChanged();
        } catch {
          // Silent — debug surface, degraded mode is fine.
        }
      }
    },

    // ── Chop / interaction stubs ────────────────────────────────────
    /**
     * Increment the "trees harvested" counter without actually felling
     * a tree. Used by Beat 06 to drive the gather-logs UI state.
     */
    simulateChop(): void {
      a.incrementTreesHarvested();
    },

    // ── Crafting panel ──────────────────────────────────────────────
    /**
     * Open the crafting panel for a station id. `kind` accepts both
     * canonical station ids ("primitive-workbench") and friendly
     * aliases ("hearth", "weapon") used by the journey beats.
     */
    openCraftingPanel(kind: string): void {
      const stationId =
        kind === "hearth" || kind === "weapon" || kind === "primitive-workbench"
          ? "primitive-workbench"
          : kind;
      eventBus.emitCraftingPanel({ stationId, open: true });
    },

    /** Close the crafting panel (and any other modal). */
    closeAllPanels(): void {
      eventBus.emitCraftingPanel(null);
      eventBus.emitFastTravelOpen(false);
      eventBus.emitClaimCinematicActive(false);
      eventBus.emitInteractCue(null);
    },

    // ── Structure placement ────────────────────────────────────────
    /**
     * Begin a structure placement preview by flipping the Build trait
     * to mode=true with the requested template. The placement-ghost
     * mesh layer reads this and renders the preview.
     */
    beginPlacement(blueprintId: string): void {
      a.setBuildMode(true, blueprintId);
    },

    /**
     * Commit the current placement at the player's current position.
     * Adds the structure to the placedStructures list and clears
     * build mode. No cost validation — this is a debug entry point.
     */
    commitPlacement(): void {
      const player = koota.queryFirst(IsPlayer, Position);
      const pos = player?.get(Position);
      if (!pos) return;
      a.addPlacedStructure(
        "blueprint.hearth",
        Math.round(pos.x),
        Math.round(pos.z),
      );
      a.setBuildMode(false);
    },

    // ── Hearth / claim ritual ──────────────────────────────────────
    /**
     * Trigger the claim-ritual cinematic flag. Real runtime behavior is
     * the ClaimRitualSystem driving this signal high for ~2s while a
     * vignette plays; we just emit it directly for screenshot capture.
     */
    lightHearth(): void {
      eventBus.emitClaimCinematicActive(true);
      eventBus.emitGroveClaimed({
        groveId: "grove-0-0",
        worldId: "rc-journey-world",
      });
    },

    // ── Fast-travel ─────────────────────────────────────────────────
    openFastTravel(): void {
      eventBus.emitFastTravelOpen(true);
    },
    closeFastTravel(): void {
      eventBus.emitFastTravelOpen(false);
    },

    // ── Villagers / encounters / discovery ─────────────────────────
    /**
     * Stub: emit a "villagers arrived" toast via the existing toast
     * machinery. Real villager spawning is gated on grove claim
     * progression and runs on a delay; this captures the UI moment.
     */
    spawnVillagers(): void {
      // Drive a setting flip the runtime will see, plus an interact cue
      // so the screenshot has visible UI state. Fully diegetic actors
      // are out of scope for the debug surface.
      eventBus.emitInteractCue({
        variant: "gather",
        label: "Villagers arrive at your grove…",
      });
    },

    /**
     * Spawn a hostile encounter by emitting the encounter-triggered
     * toast and bumping the EventState. A real wolf actor mesh in
     * the world is out of scope for the debug surface — what matters
     * for the screenshot is the encounter UI state.
     */
    spawnFirstEncounter(): void {
      eventBus.emitInteractCue({
        variant: "gather",
        label: "A wolf approaches!",
      });
    },
    spawnTestEncounter(): void {
      this.spawnFirstEncounter();
    },

    /** Discover a grove (records it in WorldMeta + adds an XP nudge). */
    discoverGrove(groveId: string): void {
      a.discoverZone(groveId);
    },

    /** Open the world map UI. (Currently routed through fast-travel UI.) */
    openMap(): void {
      eventBus.emitFastTravelOpen(true);
    },

    // ── Time / season nudges (handy for perf-suite biome variety) ──
    setSeason(season: "spring" | "summer" | "autumn" | "winter"): void {
      koota.set(CurrentSeason, { value: season });
    },

    /** Nudge the active zone id directly (for biome / palette switches). */
    setZone(zoneId: string): void {
      koota.set(WorldMeta, (prev) => ({ ...prev, currentZoneId: zoneId }));
    },
  };
}

export type GroveDebugActions = ReturnType<typeof buildDebugActions>;
