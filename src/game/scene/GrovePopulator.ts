/**
 * GrovePopulator.
 *
 * Spawns and disposes the grove-resident NPCs (one Grove Spirit + 1-4
 * villagers) when a grove chunk activates / deactivates. Called by
 * `ChunkManager` when a grove chunk activates.
 *
 * The populator is **stateless across calls** — every call returns a
 * `PopulatedGrove` handle holding the actor refs and a `dispose()`.
 * It does NOT keep an internal map of populated groves; that's the
 * caller's job (the future ChunkManager will keep one map keyed by
 * `(chunkX, chunkZ)`).
 *
 * Determinism:
 *   - Number of villagers: `scopedRNG('grove-villagers', worldSeed,
 *     chunkX, chunkZ)` → integer in `[1, 4]`.
 *   - Per-villager spawn position + GLB variant: same scope, advanced.
 *   - Per-villager wander RNG: `scopedRNG('villager-wander',
 *     worldSeed, chunkX, chunkZ, villagerIndex)` so each villager
 *     wanders independently of the spawn-roll.
 *
 * Claim gate: villager spawn is gated on `options.groveState === 'claimed'`.
 * The Grove Spirit always spawns (so an undiscovered grove has its mythic
 * resident); villagers populate only after the hearth ignites.
 *
 * Spec ref: `docs/superpowers/specs/2026-04-24-grovekeeper-rc-redesign-design.md`
 *   §"NPCs in groves" — 1 Spirit + 1-4 villagers per claimed grove.
 *   §"Hearth and claim ritual" — groveState drives the gate.
 */

import type { Actor } from "@jolly-pixel/engine";
import worldConfig from "@/game/world/world.config.json";
import { scopedRNG } from "@/shared/utils/seedRNG";
import { GroveSpiritActor } from "./GroveSpiritActor";
import npcConfig from "./npc.config.json";
import { VillagerActor } from "./VillagerActor";

/** Public handle returned by `populateGrove`. */
export interface PopulatedGrove {
  groveId: string;
  chunkX: number;
  chunkZ: number;
  spirit: GroveSpiritActor;
  villagers: readonly VillagerActor[];
  /** Tear down all spawned actors. Idempotent. */
  dispose(): void;
}

/**
 * The host has to provide an actor factory. Production wires this to
 * `world.spawnActor(...)`; tests can pass a stub that records calls.
 * We keep the indirection because the engine's exact `spawnActor`
 * signature is mocked in unit tests and we don't want a hard import.
 */
export interface ActorFactory {
  /** Create a fresh, un-attached `Actor` for an ActorComponent to bind to. */
  createActor(): Actor;
}

/**
 * Persistence helpers — narrow surface so the populator doesn't pull
 * in the full drizzle dialogue repo. Production wires this to
 * `dialogueRepo.getLastPhrase` etc., bound to the active `worldId`.
 */
export interface DialogueHistoryView {
  getLastPhraseId(npcId: string): string | null;
  hasMet(npcId: string): boolean;
}

const DEFAULT_HISTORY_VIEW: DialogueHistoryView = {
  getLastPhraseId: () => null,
  hasMet: () => false,
};

/** Grove lifecycle state — mirrors `groves.state` in the schema. */
export type GroveStateForSpawn = "discovered" | "claimed";

export interface PopulateGroveOptions {
  worldSeed: number;
  chunkX: number;
  chunkZ: number;
  /** World-Y the NPCs stand on (chunk surface + 1). */
  surfaceY: number;
  factory: ActorFactory;
  /** Optional dialogue-history view; defaults to "first meeting, no last phrase". */
  history?: DialogueHistoryView;
  /**
   * Claim gate. When `discovered` (default), only the
   * Grove Spirit spawns. When `claimed`, the full 1-4 villager pool
   * spawns alongside. The runtime calls `populateGrove` again with
   * `claimed` after the claim ritual completes.
   */
  groveState?: GroveStateForSpawn;
}

/** Min/max villagers per grove. Locked by spec (1-4, deterministic). */
export const VILLAGERS_PER_GROVE_MIN = 1;
export const VILLAGERS_PER_GROVE_MAX = 4;
const SIZE = worldConfig.chunkSize;
const VILLAGER_VARIANT_COUNT = npcConfig.villager.models.length;

/**
 * Build the canonical id for a grove given its chunk coordinates.
 * Matches `groveDiscovery.ts:defaultGroveId` so dialogue history rows
 * line up with the grove rows. Stable across sessions, save-breaking
 * if changed.
 */
export function groveId(chunkX: number, chunkZ: number): string {
  return `grove-${chunkX}-${chunkZ}`;
}

export function groveSpiritId(chunkX: number, chunkZ: number): string {
  return `${groveId(chunkX, chunkZ)}:spirit`;
}

export function groveVillagerId(
  chunkX: number,
  chunkZ: number,
  index: number,
): string {
  return `${groveId(chunkX, chunkZ)}:villager:${index}`;
}

/**
 * Spawn one Grove Spirit + 1-4 villagers on the given grove chunk.
 * Returns a handle the caller can later `dispose()`.
 */
export function populateGrove(options: PopulateGroveOptions): PopulatedGrove {
  const { worldSeed, chunkX, chunkZ, surfaceY, factory } = options;
  const history = options.history ?? DEFAULT_HISTORY_VIEW;

  const id = groveId(chunkX, chunkZ);
  // Chunk world-space origin is `(chunkX * SIZE, 0, chunkZ * SIZE)`;
  // the centre is half a chunk inside.
  const centerX = chunkX * SIZE + SIZE / 2;
  const centerZ = chunkZ * SIZE + SIZE / 2;

  // Spirit at the very centre.
  const spiritActor = factory.createActor();
  const spiritIdStr = groveSpiritId(chunkX, chunkZ);
  const spirit = new GroveSpiritActor(spiritActor, {
    spawn: { x: centerX, y: surfaceY, z: centerZ },
    spiritId: spiritIdStr,
    hasMet: history.hasMet(spiritIdStr),
    lastPhraseId: history.getLastPhraseId(spiritIdStr),
  });
  spirit.awake();

  // Claim gate — only spawn villagers in claimed groves.
  // The Spirit (above) always spawns so the discovered-but-unclaimed
  // grove still has its mythic resident; villagers populate after
  // the hearth ignites.
  const groveState: GroveStateForSpawn = options.groveState ?? "discovered";
  const villagers: VillagerActor[] = [];
  if (groveState !== "claimed") {
    let disposed = false;
    return {
      groveId: id,
      chunkX,
      chunkZ,
      spirit,
      villagers,
      dispose() {
        if (disposed) return;
        disposed = true;
      },
    };
  }

  // Villager count + per-villager rolls all share one populator RNG so
  // the order is deterministic. Wander rolls use a separate RNG per
  // villager so wandering doesn't reshuffle the spawn map.
  const popRng = scopedRNG("grove-villagers", worldSeed, chunkX, chunkZ);

  const villagerCount =
    VILLAGERS_PER_GROVE_MIN +
    Math.floor(
      popRng() * (VILLAGERS_PER_GROVE_MAX - VILLAGERS_PER_GROVE_MIN + 1),
    );

  for (let i = 0; i < villagerCount; i++) {
    const a = popRng() * 2 * Math.PI;
    // Spawn somewhere on a ring 2-5 voxels from the centre — close
    // enough to the Spirit that the player finds them on arrival,
    // far enough not to pile on top of it.
    const r = 2 + popRng() * 3;
    const sx = centerX + Math.cos(a) * r;
    const sz = centerZ + Math.sin(a) * r;
    const variant = Math.floor(popRng() * VILLAGER_VARIANT_COUNT);

    const villagerActor = factory.createActor();
    const villagerIdStr = groveVillagerId(chunkX, chunkZ, i);
    const villager = new VillagerActor(villagerActor, {
      spawn: { x: sx, y: surfaceY, z: sz },
      villagerId: villagerIdStr,
      modelVariant: variant,
      // Per-villager wander RNG — independent of the spawn rolls so
      // wander variation doesn't depend on what happens to spawn first.
      random: scopedRNG("villager-wander", worldSeed, chunkX, chunkZ, i),
      lastPhraseId: history.getLastPhraseId(villagerIdStr),
    });
    villager.awake();
    villagers.push(villager);
  }

  let disposed = false;
  return {
    groveId: id,
    chunkX,
    chunkZ,
    spirit,
    villagers,
    dispose() {
      if (disposed) return;
      disposed = true;
      // Production: each ActorComponent's host actor needs to be torn
      // down so the engine drops the GLB + mixer. The actual
      // `actor.destroy()` call is left to the engine wiring layer (the
      // factory may, e.g., return engine actors that auto-dispose
      // when their parent chunk does). The handle is opt-in for
      // explicit teardown.
    },
  };
}
