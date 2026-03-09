/**
 * Ambient Particle Emitters System (Spec §36.1)
 *
 * Manages per-chunk ambient particle emitters:
 *   - Fireflies: active at night (20:00–04:00), near water bodies
 *   - Pollen:    active in spring/summer
 *   - Leaves:    active in autumn + wind speed above threshold
 *
 * Each loaded chunk can host up to 3 ambient emitters simultaneously.
 * Emitters are spawned/despawned based on current game conditions.
 *
 * Pure functions (no Three.js / R3F imports) + ECS-coupled tick.
 * Config: config/game/procedural.json (particles section).
 */

import type { World } from "miniplex";
import proceduralConfig from "@/config/game/procedural.json" with { type: "json" };
import type { ParticleEmitterComponent } from "@/game/ecs/components/procedural/particles";

// ── Constants from config ─────────────────────────────────────────────────────

const FIREFLY_CFG = proceduralConfig.particles.fireflies;
const POLLEN_CFG = proceduralConfig.particles.pollen;
const LEAVES_CFG = proceduralConfig.particles.leaves;

/** Night window start hour (inclusive). */
export const FIREFLY_NIGHT_START: number = FIREFLY_CFG.activeHours[0];
/** Night window end hour (exclusive). */
export const FIREFLY_NIGHT_END: number = FIREFLY_CFG.activeHours[1];
/** Radius within which a chunk is considered "near water" for fireflies. */
export const FIREFLY_WATER_PROXIMITY_RADIUS: number = FIREFLY_CFG.waterProximityRadius;
/** Minimum wind speed for autumn leaves to fall. */
export const LEAVES_MIN_WIND_SPEED: number = LEAVES_CFG.minWindSpeed;

// ── Types ─────────────────────────────────────────────────────────────────────

/** Minimal water body reference for proximity checks. */
export interface WaterRef {
  position: { x: number; z: number };
}

/** A loaded chunk's center position in world space. */
export interface ActiveChunk {
  /** Unique chunk key (e.g. "0,0" or "chunkX_chunkZ"). */
  chunkKey: string;
  /** World X coordinate of the chunk center. */
  worldX: number;
  /** World Z coordinate of the chunk center. */
  worldZ: number;
}

/** Minimal ECS entity shape for ambient particle emitters. */
export interface AmbientEntity {
  id: string;
  position?: { x: number; y: number; z: number };
  particleEmitter?: ParticleEmitterComponent;
}

/** Per-chunk set of active ambient emitter entity references. */
export interface ChunkEmitterSet {
  fireflyEntity: AmbientEntity | null;
  pollenEntity: AmbientEntity | null;
  leavesEntity: AmbientEntity | null;
}

/** Mutable state held by the game loop between ticks. */
export interface AmbientParticlesState {
  /** Keyed by chunkKey. Entries added on first visit, removed on unload. */
  emitters: Map<string, ChunkEmitterSet>;
}

// ── Pure condition helpers ────────────────────────────────────────────────────

/**
 * Returns true if the game hour falls in the firefly active window.
 * Window wraps midnight: [FIREFLY_NIGHT_START, 24) ∪ [0, FIREFLY_NIGHT_END).
 * Spec §36.1: Fireflies active at night near water.
 */
export function isNightTime(gameHour: number): boolean {
  return gameHour >= FIREFLY_NIGHT_START || gameHour < FIREFLY_NIGHT_END;
}

/**
 * Returns true if the chunk center is within FIREFLY_WATER_PROXIMITY_RADIUS
 * of any water body.
 * Spec §36.1: Fireflies near water.
 */
export function isNearWater(worldX: number, worldZ: number, waterBodies: WaterRef[]): boolean {
  const r = FIREFLY_WATER_PROXIMITY_RADIUS;
  for (const wb of waterBodies) {
    const dx = worldX - wb.position.x;
    const dz = worldZ - wb.position.z;
    if (dx * dx + dz * dz <= r * r) return true;
  }
  return false;
}

/**
 * Returns true if the season supports pollen emission (spring or summer).
 * Spec §36.1: Pollen active in spring/summer meadow.
 */
export function isPollenSeason(season: string): boolean {
  const activeSeasons = POLLEN_CFG.activeSeasons as string[];
  return activeSeasons.includes(season);
}

/**
 * Returns true if leaves should fall: autumn season + sufficient wind.
 * Spec §36.1: Leaves active in autumn + wind.
 */
export function isLeafCondition(season: string, windSpeed: number): boolean {
  return season === LEAVES_CFG.activeSeason && windSpeed >= LEAVES_MIN_WIND_SPEED;
}

// ── Emitter builders ──────────────────────────────────────────────────────────

/**
 * Builds a firefly ambient emitter.
 * Spec §36.1: gravity -0.1, wind-unaffected, budget 30.
 */
export function buildFireflyEmitter(): ParticleEmitterComponent {
  return {
    particleType: "fireflies",
    emissionRate: FIREFLY_CFG.emissionRate,
    lifetime: FIREFLY_CFG.lifetime,
    emissionRadius: FIREFLY_CFG.emissionRadius,
    size: FIREFLY_CFG.size,
    color: FIREFLY_CFG.color,
    gravity: FIREFLY_CFG.gravity,
    windAffected: false,
    maxParticles: FIREFLY_CFG.maxParticles,
    active: true,
  };
}

/**
 * Builds a pollen ambient emitter.
 * Spec §36.1: gravity -0.02, wind-affected, budget 40.
 */
export function buildPollenEmitter(): ParticleEmitterComponent {
  return {
    particleType: "pollen",
    emissionRate: POLLEN_CFG.emissionRate,
    lifetime: POLLEN_CFG.lifetime,
    emissionRadius: POLLEN_CFG.emissionRadius,
    size: POLLEN_CFG.size,
    color: POLLEN_CFG.color,
    gravity: POLLEN_CFG.gravity,
    windAffected: true,
    maxParticles: POLLEN_CFG.maxParticles,
    active: true,
  };
}

/**
 * Builds a falling-leaves ambient emitter.
 * Spec §36.1: gravity 0.2, wind-affected, budget 50.
 */
export function buildLeavesEmitter(): ParticleEmitterComponent {
  return {
    particleType: "leaves",
    emissionRate: LEAVES_CFG.emissionRate,
    lifetime: LEAVES_CFG.lifetime,
    emissionRadius: LEAVES_CFG.emissionRadius,
    size: LEAVES_CFG.size,
    color: LEAVES_CFG.color,
    gravity: LEAVES_CFG.gravity,
    windAffected: true,
    maxParticles: LEAVES_CFG.maxParticles,
    active: true,
  };
}

// ── Initialization ────────────────────────────────────────────────────────────

/** Creates a fresh AmbientParticlesState (call once on game start). */
export function initAmbientParticlesState(): AmbientParticlesState {
  return { emitters: new Map() };
}

// ── ECS-coupled tick ──────────────────────────────────────────────────────────

/**
 * Updates ambient particle emitters for all active chunks each frame.
 *
 * - Spawns emitters when conditions become true for a chunk.
 * - Despawns emitters when conditions become false.
 * - Cleans up all emitters for chunks no longer in the active set.
 *
 * @param world        Miniplex world (injectable for testing).
 * @param activeChunks Currently loaded chunks to manage emitters for.
 * @param state        Mutable emitter registry from initAmbientParticlesState().
 * @param gameHour     Current game hour [0, 24) — drives firefly night check.
 * @param season       Current season ("spring" | "summer" | "autumn" | "winter").
 * @param windSpeed    Current wind speed — drives leaf fall threshold.
 * @param waterBodies  Water bodies to test chunk proximity against.
 */
export function tickAmbientParticles(
  world: World<AmbientEntity>,
  activeChunks: ActiveChunk[],
  state: AmbientParticlesState,
  gameHour: number,
  season: string,
  windSpeed: number,
  waterBodies: WaterRef[],
): void {
  const night = isNightTime(gameHour);
  const pollenActive = isPollenSeason(season);
  const leavesActive = isLeafCondition(season, windSpeed);

  // Build a set of currently active keys for O(1) membership tests
  const activeKeys = new Set(activeChunks.map((c) => c.chunkKey));

  // Despawn all emitters for unloaded chunks
  for (const [key, set] of state.emitters) {
    if (!activeKeys.has(key)) {
      if (set.fireflyEntity) world.remove(set.fireflyEntity);
      if (set.pollenEntity) world.remove(set.pollenEntity);
      if (set.leavesEntity) world.remove(set.leavesEntity);
      state.emitters.delete(key);
    }
  }

  // Update emitters for each active chunk
  for (const chunk of activeChunks) {
    const { chunkKey, worldX, worldZ } = chunk;
    const nearWater = isNearWater(worldX, worldZ, waterBodies);
    const wantFirefly = night && nearWater;

    let set = state.emitters.get(chunkKey);
    if (!set) {
      set = { fireflyEntity: null, pollenEntity: null, leavesEntity: null };
      state.emitters.set(chunkKey, set);
    }

    // ── Fireflies ────────────────────────────────────────────────────────────
    if (wantFirefly && !set.fireflyEntity) {
      set.fireflyEntity = world.add({
        id: `firefly_${chunkKey}`,
        position: { x: worldX, y: 1.5, z: worldZ },
        particleEmitter: buildFireflyEmitter(),
      });
    } else if (!wantFirefly && set.fireflyEntity) {
      world.remove(set.fireflyEntity);
      set.fireflyEntity = null;
    }

    // ── Pollen ───────────────────────────────────────────────────────────────
    if (pollenActive && !set.pollenEntity) {
      set.pollenEntity = world.add({
        id: `pollen_${chunkKey}`,
        position: { x: worldX, y: 1.0, z: worldZ },
        particleEmitter: buildPollenEmitter(),
      });
    } else if (!pollenActive && set.pollenEntity) {
      world.remove(set.pollenEntity);
      set.pollenEntity = null;
    }

    // ── Leaves ───────────────────────────────────────────────────────────────
    if (leavesActive && !set.leavesEntity) {
      set.leavesEntity = world.add({
        id: `leaves_${chunkKey}`,
        position: { x: worldX, y: 2.0, z: worldZ },
        particleEmitter: buildLeavesEmitter(),
      });
    } else if (!leavesActive && set.leavesEntity) {
      world.remove(set.leavesEntity);
      set.leavesEntity = null;
    }
  }
}
