/**
 * fastTravel.
 *
 * Lists claimed groves and teleports the player to a chosen grove's
 * centre. The teleport is wrapped in a black-fade transition borrowed
 * from the RetreatOverlay pattern: drive a fade opacity signal on
 * `eventBus`, hold at full black for the actual position swap, fade
 * back in.
 *
 * Pure-ish: no DOM handles. Persistence reads come from `grovesRepo`.
 * Teleporter + overlay are tear-off interfaces so tests can stub them.
 *
 * Spec ref: `docs/superpowers/specs/2026-04-24-grovekeeper-rc-redesign-design.md`
 *   §"Fast travel".
 */

import type { AppDatabase } from "@/db/client";
import { listGrovesByWorld } from "@/db/repos/grovesRepo";
import type { Grove } from "@/db/schema/rc";
import worldConfig from "@/game/world/world.config.json";

const SIZE = worldConfig.chunkSize;

/** Default fade-out / hold / fade-in for fast-travel transition (ms). */
export const FAST_TRAVEL_TIMING = {
  fadeOutMs: 350,
  holdMs: 250,
  fadeInMs: 350,
  totalMs: 950,
} as const;

/** A teleport target — claimed grove with a world-space centre. */
export interface ClaimedGroveNode {
  groveId: string;
  worldId: string;
  chunkX: number;
  chunkZ: number;
  /** Surrounding biome label (drives the menu icon). */
  biome: string;
  /** Display name. */
  name: string;
  /** World-space centre voxel of the grove. */
  worldX: number;
  worldZ: number;
}

/**
 * List every claimed grove in `worldId` as a teleport node. Filters
 * on `state === 'claimed'` server-side via the repo.
 */
export function listClaimedGroves(
  db: AppDatabase,
  worldId: string,
): ClaimedGroveNode[] {
  const rows = listGrovesByWorld(db, worldId, "claimed");
  return rows.map(toNode);
}

function toNode(row: Grove): ClaimedGroveNode {
  return {
    groveId: row.id,
    worldId: row.worldId,
    chunkX: row.chunkX,
    chunkZ: row.chunkZ,
    biome: row.biome,
    name: groveDisplayName(row),
    worldX: row.chunkX * SIZE + SIZE / 2,
    worldZ: row.chunkZ * SIZE + SIZE / 2,
  };
}

function groveDisplayName(row: Grove): string {
  return `Grove (${row.chunkX}, ${row.chunkZ})`;
}

export interface FastTravelTeleporter {
  teleport(worldX: number, worldZ: number): void;
}

export interface FastTravelOverlay {
  setFadeOpacity(opacity: number): void;
}

export interface FastTravelControllerOptions {
  teleporter: FastTravelTeleporter;
  overlay: FastTravelOverlay;
  timing?: Partial<typeof FAST_TRAVEL_TIMING>;
}

/**
 * Stateful fast-travel controller. `start(target, now)` begins a
 * transition; `tick(now)` drives the fade.
 */
export class FastTravelController {
  private readonly teleporter: FastTravelTeleporter;
  private readonly overlay: FastTravelOverlay;
  private readonly timing: typeof FAST_TRAVEL_TIMING;
  private phase: "idle" | "fade-out" | "hold" | "fade-in" = "idle";
  private startedAt = 0;
  private target: ClaimedGroveNode | null = null;
  private teleported = false;

  constructor(opts: FastTravelControllerOptions) {
    this.teleporter = opts.teleporter;
    this.overlay = opts.overlay;
    this.timing = { ...FAST_TRAVEL_TIMING, ...(opts.timing ?? {}) };
  }

  get isActive(): boolean {
    return this.phase !== "idle";
  }

  get currentPhase(): "idle" | "fade-out" | "hold" | "fade-in" {
    return this.phase;
  }

  start(target: ClaimedGroveNode, now: number): void {
    if (this.phase !== "idle") return;
    this.phase = "fade-out";
    this.startedAt = now;
    this.target = target;
    this.teleported = false;
    this.overlay.setFadeOpacity(0);
  }

  tick(now: number): void {
    if (this.phase === "idle" || !this.target) return;
    const elapsed = now - this.startedAt;

    if (this.phase === "fade-out") {
      const ramp = Math.min(1, elapsed / this.timing.fadeOutMs);
      this.overlay.setFadeOpacity(ramp);
      if (elapsed >= this.timing.fadeOutMs) {
        this.phase = "hold";
        this.overlay.setFadeOpacity(1);
      }
    }

    if (this.phase === "hold") {
      this.overlay.setFadeOpacity(1);
      if (!this.teleported) {
        this.teleporter.teleport(this.target.worldX, this.target.worldZ);
        this.teleported = true;
      }
      const holdElapsed = elapsed - this.timing.fadeOutMs;
      if (holdElapsed >= this.timing.holdMs) {
        this.phase = "fade-in";
      }
    }

    if (this.phase === "fade-in") {
      const fadeInElapsed =
        elapsed - this.timing.fadeOutMs - this.timing.holdMs;
      const ramp = Math.min(1, fadeInElapsed / this.timing.fadeInMs);
      this.overlay.setFadeOpacity(1 - ramp);
      if (fadeInElapsed >= this.timing.fadeInMs) {
        this.phase = "idle";
        this.target = null;
        this.overlay.setFadeOpacity(0);
      }
    }
  }
}
