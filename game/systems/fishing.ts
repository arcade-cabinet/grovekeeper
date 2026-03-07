/**
 * Fishing mini-game system — pure state machine + species selection.
 *
 * No ECS world, no R3F, no Rapier dependencies.
 * Callers integrate the returned state with their UI + inventory layers.
 *
 * Spec §22 (P5 Survival Systems):
 *   - Fishing Rod (tool) casts at any fishable water body
 *   - Timing indicator mini-game: bouncing cursor must land in success zone
 *   - Fish species selected from biome + season via scopedRNG("fish", ...)
 *   - Fishing Dock structure grants +30% yield bonus
 */

import fishingConfig from "@/config/game/fishing.json" with { type: "json" };

const {
  castDuration,
  minWaitDuration,
  maxWaitDuration,
  biteDuration,
  timingBarSpeed,
  zoneWidth,
  baseYield,
  fishingDockYieldBonus,
} = fishingConfig;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FishingPhase =
  | "idle"
  | "casting"
  | "waiting"
  | "biting"
  | "minigame"
  | "caught"
  | "escaped";

export interface FishingState {
  phase: FishingPhase;
  /** Seconds elapsed in the current phase. */
  elapsed: number;
  /** Seeded wait time before a fish bites (seconds). */
  waitDuration: number;
  /** Cursor position on the timing bar, 0..1. */
  timingProgress: number;
  /** +1 (moving right) or -1 (moving left). */
  timingDirection: number;
  /** Left edge of the success zone, 0..1. */
  zoneStart: number;
  /** Right edge of the success zone, 0..1. */
  zoneEnd: number;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a fresh fishing state in the idle phase.
 */
export function createFishingState(): FishingState {
  return {
    phase: "idle",
    elapsed: 0,
    waitDuration: 0,
    timingProgress: 0,
    timingDirection: 1,
    zoneStart: 0,
    zoneEnd: 0,
  };
}

// ---------------------------------------------------------------------------
// Water body check — called on raycast hit
// ---------------------------------------------------------------------------

/** Water body types where fishing is allowed (Spec §22, §31.2). */
const FISHABLE_TYPES = new Set(["ocean", "river", "pond", "stream"]);

/**
 * Returns true when the raycast-hit water body type supports fishing.
 * Waterfalls are not fishable. Unknown types return false.
 */
export function isWaterFishable(waterBodyType: string): boolean {
  return FISHABLE_TYPES.has(waterBodyType);
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

/**
 * Begin a fishing session. Transitions idle → casting.
 *
 * Consumes two rng calls:
 *   1. waitDuration in [minWaitDuration, maxWaitDuration]
 *   2. success zone start position on the timing bar
 *
 * Spec §22: fishing rod stamina cost is handled by the caller.
 */
export function startFishing(state: FishingState, rng: () => number): void {
  state.phase = "casting";
  state.elapsed = 0;
  state.timingProgress = 0;
  state.timingDirection = 1;

  // Seeded wait time before bite
  state.waitDuration = rng() * (maxWaitDuration - minWaitDuration) + minWaitDuration;

  // Success zone: random position with fixed width, clamped so zoneEnd ≤ 1
  const zonePos = rng() * (1 - zoneWidth);
  state.zoneStart = zonePos;
  state.zoneEnd = zonePos + zoneWidth;
}

// ---------------------------------------------------------------------------
// Tick — advances state machine per frame
// ---------------------------------------------------------------------------

/**
 * Advance the fishing state machine by `dt` seconds.
 *
 * Phase transitions:
 *   casting  → waiting  (after castDuration)
 *   waiting  → biting   (after waitDuration)
 *   biting   → escaped  (after biteDuration, no player input)
 *   minigame            (cursor advances; player input via pressFishingAction)
 */
export function tickFishing(state: FishingState, dt: number): void {
  state.elapsed += dt;

  switch (state.phase) {
    case "casting":
      if (state.elapsed >= castDuration) {
        state.phase = "waiting";
        state.elapsed = 0;
      }
      break;

    case "waiting":
      if (state.elapsed >= state.waitDuration) {
        state.phase = "biting";
        state.elapsed = 0;
      }
      break;

    case "biting":
      if (state.elapsed >= biteDuration) {
        state.phase = "escaped";
        state.elapsed = 0;
      }
      break;

    case "minigame":
      _advanceCursor(state, dt);
      break;

    default:
      // idle, caught, escaped: no-op
      break;
  }
}

/**
 * Advance the timing bar cursor, bouncing off 0 and 1.
 * Uses a while loop to handle multiple reflections from large dt values.
 */
function _advanceCursor(state: FishingState, dt: number): void {
  let p = state.timingProgress + state.timingDirection * timingBarSpeed * dt;
  let dir = state.timingDirection;

  // Reflect off boundaries until p is within [0, 1]
  while (p < 0 || p > 1) {
    if (p > 1) {
      p = 2 - p;
      dir = -1;
    } else if (p < 0) {
      p = -p;
      dir = 1;
    }
  }

  state.timingProgress = Math.max(0, Math.min(1, p));
  state.timingDirection = dir;
}

// ---------------------------------------------------------------------------
// Player input
// ---------------------------------------------------------------------------

/**
 * Handle player pressing the fishing action button.
 *
 * biting   → minigame  (player responds to bite in time)
 * minigame → caught    (cursor inside success zone)
 * minigame → escaped   (cursor outside success zone)
 *
 * Any other phase: no-op.
 */
export function pressFishingAction(state: FishingState): void {
  switch (state.phase) {
    case "biting":
      state.phase = "minigame";
      state.elapsed = 0;
      state.timingProgress = 0;
      state.timingDirection = 1;
      break;

    case "minigame":
      if (state.timingProgress >= state.zoneStart && state.timingProgress <= state.zoneEnd) {
        state.phase = "caught";
      } else {
        state.phase = "escaped";
      }
      state.elapsed = 0;
      break;

    default:
      // idle, casting, waiting, caught, escaped: no-op
      break;
  }
}

// ---------------------------------------------------------------------------
// Terminal state check
// ---------------------------------------------------------------------------

/**
 * Returns true when fishing has concluded (caught or escaped).
 * Callers should reset or discard the state after this returns true.
 */
export function isFishingComplete(state: FishingState): boolean {
  return state.phase === "caught" || state.phase === "escaped";
}

// ---------------------------------------------------------------------------
// Species selection — biome + season seeded
// ---------------------------------------------------------------------------

/**
 * Select a fish species from the given biome and season using a seeded RNG.
 *
 * Uses weighted random selection where seasonal modifiers boost certain species.
 * Returns null if the biome has no fish (unknown biome).
 *
 * Spec §22: species seeded via scopedRNG("fish", worldSeed, castIndex).
 * Callers supply the pre-built rng function.
 *
 * Example usage:
 *   const rng = scopedRNG("fish", worldSeed, String(castCount));
 *   const species = selectFishSpecies(biome, season, rng);
 */
export function selectFishSpecies(biome: string, season: string, rng: () => number): string | null {
  const candidates = fishingConfig.biomeSpecies[biome as keyof typeof fishingConfig.biomeSpecies];

  if (!candidates || candidates.length === 0) return null;

  const seasonMods =
    fishingConfig.seasonWeights[season as keyof typeof fishingConfig.seasonWeights] ?? {};

  // Build per-species weights (seasonal modifier or 1.0)
  const weights = candidates.map(
    (species) => seasonMods[species as keyof typeof seasonMods] ?? 1.0,
  );
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  // Weighted random pick
  let roll = rng() * totalWeight;
  for (let i = 0; i < candidates.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return candidates[i];
  }

  // Fallback: last candidate (handles floating-point rounding at roll ≈ 1.0)
  return candidates[candidates.length - 1];
}

// ---------------------------------------------------------------------------
// Yield computation
// ---------------------------------------------------------------------------

/**
 * Compute how many fish are awarded for a successful catch.
 *
 * Spec §18.1: Fishing Dock structure grants +30% yield.
 * Result is rounded up (you always catch at least baseYield fish).
 */
export function computeFishYield(hasDock: boolean): number {
  const bonus = hasDock ? fishingDockYieldBonus : 0;
  return Math.ceil(baseYield * (1 + bonus));
}
