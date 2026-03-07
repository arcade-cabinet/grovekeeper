/**
 * Water particles system — splash on water entry, bubbles while submerged.
 *
 * Spec §31.2: "Splash particles: 12 particles on player water entry, lifetime 0.8s"
 * Spec §36.1: Splash (gravity 0.5, no wind, 30 max) + Bubbles (gravity -0.3, no wind, 20 max)
 */
import { World } from "miniplex";
import type { ParticleEmitterComponent } from "@/game/ecs/components/procedural/particles";
import proceduralConfig from "@/config/game/procedural.json" with { type: "json" };

// ── Constants from config ────────────────────────────────────────────────────

export const SPLASH_PARTICLE_COUNT: number =
  proceduralConfig.water.splashParticleCount;
export const SPLASH_LIFETIME: number = proceduralConfig.water.splashLifetime;

// ── Types ────────────────────────────────────────────────────────────────────

/** Player's state relative to water. */
export type WaterState = "above" | "submerged";

/** Minimal water body reference needed for detection. */
export interface WaterBodyRef {
  position: { x: number; y: number; z: number };
  waterBody: { size: { width: number; depth: number } };
}

/** Minimal entity shape required by the water particles system. */
export interface WaterEntity {
  id: string;
  position?: { x: number; y: number; z: number };
  particleEmitter?: ParticleEmitterComponent;
}

/** Mutable state held by the game loop between ticks. */
export interface WaterParticlesState {
  prevWaterState: WaterState;
  splashEntity: WaterEntity | null;
  bubblesEntity: WaterEntity | null;
}

// ── Pure helpers ─────────────────────────────────────────────────────────────

/**
 * Determines whether the player is above or submerged in any overlapping water body.
 *
 * "Submerged" = player Y ≤ water surface Y AND within the body's horizontal footprint.
 * Spec §31.2: water entry triggered when Y < water surface.
 */
export function detectWaterState(
  playerX: number,
  playerY: number,
  playerZ: number,
  waterBodies: WaterBodyRef[],
): WaterState {
  for (const wb of waterBodies) {
    const halfW = wb.waterBody.size.width / 2;
    const halfD = wb.waterBody.size.depth / 2;
    const inBounds =
      Math.abs(playerX - wb.position.x) <= halfW &&
      Math.abs(playerZ - wb.position.z) <= halfD;
    if (inBounds && playerY <= wb.position.y) {
      return "submerged";
    }
  }
  return "above";
}

/**
 * Builds a splash ParticleEmitterComponent for water entry.
 *
 * One-shot burst: emitter is created active and expires via the renderer lifetime.
 * Spec §31.2: 12 particles, 0.8s lifetime.
 * Spec §36.1: gravity 0.5 (arc up then fall), no wind, max 30.
 */
export function buildSplashEmitter(): ParticleEmitterComponent {
  const cfg = proceduralConfig.particles.splash;
  return {
    particleType: "splash",
    emissionRate: cfg.emissionRate,
    lifetime: cfg.lifetime,
    emissionRadius: cfg.emissionRadius,
    size: cfg.size,
    color: cfg.color,
    gravity: cfg.gravity,
    windAffected: cfg.windAffected,
    maxParticles: cfg.maxParticles,
    active: true,
  };
}

/**
 * Builds a bubbles ParticleEmitterComponent for continuous submerged state.
 *
 * Spec §36.1: gravity -0.3 (rises upward), no wind, max 20.
 */
export function buildBubblesEmitter(): ParticleEmitterComponent {
  const cfg = proceduralConfig.particles.bubbles;
  return {
    particleType: "bubbles",
    emissionRate: cfg.emissionRate,
    lifetime: cfg.lifetime,
    emissionRadius: cfg.emissionRadius,
    size: cfg.size,
    color: cfg.color,
    gravity: cfg.gravity,
    windAffected: cfg.windAffected,
    maxParticles: cfg.maxParticles,
    active: true,
  };
}

// ── ECS-coupled tick ─────────────────────────────────────────────────────────

/**
 * Ticks the water particles system each frame.
 *
 * - above → submerged: spawns one-shot splash emitter at player position
 * - while submerged:   ensures bubbles emitter is alive and active
 * - submerged → above: removes bubbles emitter
 *
 * @param world      Miniplex world (injectable for testing)
 * @param playerPos  Current player world position (null if no player)
 * @param waterBodies Water bodies to test player position against
 * @param state      Mutable state held by caller between ticks
 */
export function tickWaterParticles(
  world: World<WaterEntity>,
  playerPos: { x: number; y: number; z: number } | null,
  waterBodies: WaterBodyRef[],
  state: WaterParticlesState,
): void {
  if (!playerPos) return;

  const currentState = detectWaterState(
    playerPos.x,
    playerPos.y,
    playerPos.z,
    waterBodies,
  );
  const prevState = state.prevWaterState;

  // Water entry transition: above → submerged — one-shot splash burst
  if (prevState === "above" && currentState === "submerged") {
    const splashEntity = world.add({
      id: `player_splash_${Date.now()}`,
      position: { x: playerPos.x, y: playerPos.y, z: playerPos.z },
      particleEmitter: buildSplashEmitter(),
    });
    state.splashEntity = splashEntity;
  }

  // Manage continuous bubbles emitter
  if (currentState === "submerged") {
    if (!state.bubblesEntity) {
      const bubblesEntity = world.add({
        id: "player_bubbles",
        position: { x: playerPos.x, y: playerPos.y, z: playerPos.z },
        particleEmitter: buildBubblesEmitter(),
      });
      state.bubblesEntity = bubblesEntity;
    }
  } else {
    // Player left water — remove bubbles emitter
    if (state.bubblesEntity) {
      world.remove(state.bubblesEntity);
      state.bubblesEntity = null;
    }
  }

  state.prevWaterState = currentState;
}
