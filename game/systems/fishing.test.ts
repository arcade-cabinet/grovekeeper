/**
 * Fishing system tests — Spec §22 (P5 Survival Systems).
 *
 * Covers:
 * - isWaterFishable: water body type check for raycast hits
 * - createFishingState: initial state
 * - startFishing: phase transition + zone/wait setup
 * - tickFishing: state machine advancement (casting → waiting → biting → escaped)
 * - pressFishingAction: player input (biting → minigame, minigame → caught/escaped)
 * - minigame cursor: bouncing timingProgress within [0, 1]
 * - selectFishSpecies: biome + season weighted selection (seeded)
 * - computeFishYield: base yield + fishing dock bonus
 * - isFishingComplete: terminal state check
 * - integration: full successful catch round trip
 */

import fishingConfig from "@/config/game/fishing.json" with { type: "json" };
import {
  computeFishYield,
  createFishingState,
  isFishingComplete,
  isWaterFishable,
  pressFishingAction,
  selectFishSpecies,
  startFishing,
  tickFishing,
} from "./fishing.ts";

const {
  castDuration,
  biteDuration,
  minWaitDuration,
  zoneWidth,
  baseYield,
  fishingDockYieldBonus,
  timingBarSpeed,
} = fishingConfig;

/** Deterministic stub RNG: returns values in sequence (cycling). */
function makeRNG(...values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

/** Advance state through casting + waiting to reach biting phase. */
function reachBiting(state: ReturnType<typeof createFishingState>): void {
  // rng[0] = 0 → waitDuration = minWaitDuration; rng[1] = 0.3 → zone position
  startFishing(state, makeRNG(0, 0.3));
  tickFishing(state, castDuration + 0.01);
  tickFishing(state, minWaitDuration + 0.1);
}

/** Advance state all the way to minigame phase. */
function reachMinigame(state: ReturnType<typeof createFishingState>): void {
  reachBiting(state);
  pressFishingAction(state);
}

// ---------------------------------------------------------------------------
// isWaterFishable
// ---------------------------------------------------------------------------

describe("isWaterFishable (Spec §22)", () => {
  it("returns true for pond", () => {
    expect(isWaterFishable("pond")).toBe(true);
  });
  it("returns true for river", () => {
    expect(isWaterFishable("river")).toBe(true);
  });
  it("returns true for stream", () => {
    expect(isWaterFishable("stream")).toBe(true);
  });
  it("returns true for ocean", () => {
    expect(isWaterFishable("ocean")).toBe(true);
  });
  it("returns false for waterfall (not fishable)", () => {
    expect(isWaterFishable("waterfall")).toBe(false);
  });
  it("returns false for unknown water type", () => {
    expect(isWaterFishable("lava")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// createFishingState
// ---------------------------------------------------------------------------

describe("createFishingState (Spec §22)", () => {
  it("starts in idle phase", () => {
    expect(createFishingState().phase).toBe("idle");
  });
  it("initializes timingProgress to 0", () => {
    expect(createFishingState().timingProgress).toBe(0);
  });
  it("initializes timingDirection to +1", () => {
    expect(createFishingState().timingDirection).toBe(1);
  });
  it("initializes elapsed to 0", () => {
    expect(createFishingState().elapsed).toBe(0);
  });
  it("initializes zoneStart and zoneEnd to 0", () => {
    const s = createFishingState();
    expect(s.zoneStart).toBe(0);
    expect(s.zoneEnd).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// startFishing
// ---------------------------------------------------------------------------

describe("startFishing (Spec §22)", () => {
  it("transitions from idle to casting", () => {
    const state = createFishingState();
    startFishing(state, makeRNG(0.5, 0.3));
    expect(state.phase).toBe("casting");
  });
  it("resets elapsed to 0", () => {
    const state = createFishingState();
    state.elapsed = 5;
    startFishing(state, makeRNG(0.5, 0.3));
    expect(state.elapsed).toBe(0);
  });
  it("sets zoneStart and zoneEnd with correct width", () => {
    const state = createFishingState();
    startFishing(state, makeRNG(0.5, 0.3));
    expect(state.zoneEnd - state.zoneStart).toBeCloseTo(zoneWidth, 5);
  });
  it("zoneEnd does not exceed 1", () => {
    const state = createFishingState();
    startFishing(state, makeRNG(0.5, 0.99));
    expect(state.zoneEnd).toBeLessThanOrEqual(1);
  });
  it("zoneStart is 0 when zone rng returns 0", () => {
    const state = createFishingState();
    startFishing(state, makeRNG(0, 0));
    expect(state.zoneStart).toBe(0);
    expect(state.zoneEnd).toBeCloseTo(zoneWidth, 5);
  });
  it("resets timingProgress to 0 and direction to +1", () => {
    const state = createFishingState();
    state.timingProgress = 0.8;
    state.timingDirection = -1;
    startFishing(state, makeRNG(0.5, 0.3));
    expect(state.timingProgress).toBe(0);
    expect(state.timingDirection).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// tickFishing: casting → waiting
// ---------------------------------------------------------------------------

describe("tickFishing: casting phase (Spec §22)", () => {
  it("stays casting before castDuration elapses", () => {
    const state = createFishingState();
    startFishing(state, makeRNG(0.5, 0.3));
    tickFishing(state, castDuration - 0.1);
    expect(state.phase).toBe("casting");
  });
  it("transitions to waiting after castDuration", () => {
    const state = createFishingState();
    startFishing(state, makeRNG(0.5, 0.3));
    tickFishing(state, castDuration + 0.01);
    expect(state.phase).toBe("waiting");
  });
  it("does nothing in idle phase", () => {
    const state = createFishingState();
    tickFishing(state, 999);
    expect(state.phase).toBe("idle");
  });
});

// ---------------------------------------------------------------------------
// tickFishing: waiting → biting
// ---------------------------------------------------------------------------

describe("tickFishing: waiting phase (Spec §22)", () => {
  it("transitions to biting after waitDuration", () => {
    const state = createFishingState();
    // rng[0]=0 → waitDuration = 0*(maxWait-minWait)+minWait = minWait = 3.0
    startFishing(state, makeRNG(0, 0.3));
    tickFishing(state, castDuration + 0.01); // reach waiting
    tickFishing(state, minWaitDuration + 0.1); // exceed wait
    expect(state.phase).toBe("biting");
  });
  it("stays waiting before waitDuration", () => {
    const state = createFishingState();
    startFishing(state, makeRNG(0, 0.3));
    tickFishing(state, castDuration + 0.01);
    tickFishing(state, minWaitDuration - 0.5);
    expect(state.phase).toBe("waiting");
  });
});

// ---------------------------------------------------------------------------
// tickFishing: biting → escaped (timeout)
// ---------------------------------------------------------------------------

describe("tickFishing: biting phase timeout (Spec §22)", () => {
  it("stays biting within biteDuration", () => {
    const state = createFishingState();
    reachBiting(state);
    tickFishing(state, biteDuration - 0.1);
    expect(state.phase).toBe("biting");
  });
  it("transitions to escaped when biting times out", () => {
    const state = createFishingState();
    reachBiting(state);
    tickFishing(state, biteDuration + 0.1);
    expect(state.phase).toBe("escaped");
  });
});

// ---------------------------------------------------------------------------
// pressFishingAction: biting → minigame
// ---------------------------------------------------------------------------

describe("pressFishingAction: biting → minigame (Spec §22)", () => {
  it("transitions biting to minigame on press", () => {
    const state = createFishingState();
    reachBiting(state);
    pressFishingAction(state);
    expect(state.phase).toBe("minigame");
  });
  it("resets elapsed on transition to minigame", () => {
    const state = createFishingState();
    reachBiting(state);
    state.elapsed = 3;
    pressFishingAction(state);
    expect(state.elapsed).toBe(0);
  });
  it("resets timingProgress to 0 on minigame start", () => {
    const state = createFishingState();
    reachBiting(state);
    state.timingProgress = 0.7;
    pressFishingAction(state);
    expect(state.timingProgress).toBe(0);
  });
  it("does nothing when not in biting phase", () => {
    const state = createFishingState(); // idle
    pressFishingAction(state);
    expect(state.phase).toBe("idle");
  });
});

// ---------------------------------------------------------------------------
// tickFishing: minigame cursor movement
// ---------------------------------------------------------------------------

describe("tickFishing: minigame cursor (Spec §22)", () => {
  it("advances timingProgress each tick", () => {
    const state = createFishingState();
    reachMinigame(state);
    const before = state.timingProgress;
    tickFishing(state, 0.5);
    expect(state.timingProgress).not.toBe(before);
  });
  it("timingProgress stays within [0, 1] across many ticks", () => {
    const state = createFishingState();
    reachMinigame(state);
    for (let i = 0; i < 30; i++) {
      tickFishing(state, 0.2);
      expect(state.timingProgress).toBeGreaterThanOrEqual(0);
      expect(state.timingProgress).toBeLessThanOrEqual(1);
    }
  });
  it("cursor reverses direction after hitting 1", () => {
    const state = createFishingState();
    reachMinigame(state);
    // advance enough to overshoot 1 and bounce back
    tickFishing(state, 1.0 / timingBarSpeed + 0.2);
    expect(state.timingProgress).toBeLessThan(1);
    expect(state.timingDirection).toBe(-1);
  });
  it("cursor reverses direction after hitting 0", () => {
    const state = createFishingState();
    reachMinigame(state);
    // Overshoot to 1 first (direction becomes -1), then overshoot back to 0
    tickFishing(state, 2.0 / timingBarSpeed + 0.4);
    expect(state.timingProgress).toBeGreaterThan(0);
    expect(state.timingDirection).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// pressFishingAction: minigame → caught / escaped
// ---------------------------------------------------------------------------

describe("pressFishingAction: minigame outcome (Spec §22)", () => {
  it("transitions to caught when cursor is inside success zone", () => {
    const state = createFishingState();
    reachMinigame(state);
    // Set cursor to zone center (guaranteed inside)
    state.timingProgress = (state.zoneStart + state.zoneEnd) / 2;
    pressFishingAction(state);
    expect(state.phase).toBe("caught");
  });
  it("transitions to escaped when cursor is outside success zone", () => {
    const state = createFishingState();
    reachMinigame(state);
    // Force zone to 0.5-0.75 and cursor to 0 (outside)
    state.zoneStart = 0.5;
    state.zoneEnd = 0.75;
    state.timingProgress = 0;
    pressFishingAction(state);
    expect(state.phase).toBe("escaped");
  });
  it("does nothing when not in minigame phase", () => {
    const state = createFishingState();
    reachBiting(state); // biting
    // don't start minigame, skip to checking minigame action from wrong state
    state.phase = "casting";
    pressFishingAction(state);
    expect(state.phase).toBe("casting");
  });
});

// ---------------------------------------------------------------------------
// isFishingComplete
// ---------------------------------------------------------------------------

describe("isFishingComplete (Spec §22)", () => {
  it("returns false when idle", () => {
    expect(isFishingComplete(createFishingState())).toBe(false);
  });
  it("returns false when casting", () => {
    const state = createFishingState();
    state.phase = "casting";
    expect(isFishingComplete(state)).toBe(false);
  });
  it("returns false when minigame active", () => {
    const state = createFishingState();
    state.phase = "minigame";
    expect(isFishingComplete(state)).toBe(false);
  });
  it("returns true when caught", () => {
    const state = createFishingState();
    state.phase = "caught";
    expect(isFishingComplete(state)).toBe(true);
  });
  it("returns true when escaped", () => {
    const state = createFishingState();
    state.phase = "escaped";
    expect(isFishingComplete(state)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectFishSpecies
// ---------------------------------------------------------------------------

describe("selectFishSpecies (Spec §22)", () => {
  it("returns a species from the biome list", () => {
    const species = selectFishSpecies("starting-grove", "summer", makeRNG(0));
    expect(["perch", "carp"]).toContain(species);
  });
  it("returns null for unknown biome (no fish)", () => {
    expect(selectFishSpecies("nonexistent-biome", "summer", makeRNG(0.5))).toBeNull();
  });
  it("is deterministic with the same rng sequence", () => {
    const a = selectFishSpecies("wetlands", "autumn", makeRNG(0.7));
    const b = selectFishSpecies("wetlands", "autumn", makeRNG(0.7));
    expect(a).toBe(b);
  });
  it("winter boosts arctic-char in frozen-peaks (rng=0.1 → arctic-char)", () => {
    // frozen-peaks: ["arctic-char", "pike"]
    // winter weights: arctic-char=2.0, pike=1.0 → total 3.0
    // rng=0.1 → roll=0.3, first bucket 2.0 captures it → arctic-char
    const species = selectFishSpecies("frozen-peaks", "winter", makeRNG(0.1));
    expect(species).toBe("arctic-char");
  });
  it("high rng selects last species in weighted list", () => {
    // wetlands autumn: catfish=1.5, pike=1.5, trout=1.0 → total 4.0
    // rng=0.99 → roll=3.96; catfish takes 1.5, pike takes 1.5, trout takes rest → trout
    const species = selectFishSpecies("wetlands", "autumn", makeRNG(0.99));
    expect(species).toBe("trout");
  });
  it("twilight-glade returns magical fish species", () => {
    const species = selectFishSpecies("twilight-glade", "spring", makeRNG(0));
    expect(["luminous-carp", "shimmer-perch"]).toContain(species);
  });
  it("species from same biome/season with scopedRNG-style usage is stable", () => {
    // Simulates scopedRNG("fish", worldSeed, castIndex) pattern
    const rng = makeRNG(0.42);
    const result = selectFishSpecies("wetlands", "spring", rng);
    expect(result).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// computeFishYield
// ---------------------------------------------------------------------------

describe("computeFishYield (Spec §22)", () => {
  it("returns baseYield without fishing dock", () => {
    expect(computeFishYield(false)).toBe(baseYield);
  });
  it("returns ceil(baseYield * 1.3) with fishing dock (+30% bonus)", () => {
    const expected = Math.ceil(baseYield * (1 + fishingDockYieldBonus));
    expect(computeFishYield(true)).toBe(expected);
  });
  it("fishing dock yield is greater than base yield", () => {
    expect(computeFishYield(true)).toBeGreaterThan(computeFishYield(false));
  });
});

// ---------------------------------------------------------------------------
// Integration: full successful catch
// ---------------------------------------------------------------------------

describe("full fishing round trip (Spec §22)", () => {
  it("completes: idle → casting → waiting → biting → minigame → caught", () => {
    const state = createFishingState();

    // Start
    startFishing(state, makeRNG(0, 0.3));
    expect(state.phase).toBe("casting");

    // Through casting
    tickFishing(state, castDuration + 0.01);
    expect(state.phase).toBe("waiting");

    // Through waiting
    tickFishing(state, minWaitDuration + 0.1);
    expect(state.phase).toBe("biting");

    // Respond to bite
    pressFishingAction(state);
    expect(state.phase).toBe("minigame");

    // Hit zone center
    state.timingProgress = (state.zoneStart + state.zoneEnd) / 2;
    pressFishingAction(state);
    expect(state.phase).toBe("caught");
    expect(isFishingComplete(state)).toBe(true);

    // Yield + species
    const yield_ = computeFishYield(false);
    expect(yield_).toBeGreaterThanOrEqual(1);
    const species = selectFishSpecies("wetlands", "spring", makeRNG(0.2));
    expect(species).not.toBeNull();
  });

  it("fails: biting timeout → escaped", () => {
    const state = createFishingState();
    reachBiting(state);
    tickFishing(state, biteDuration + 0.01);
    expect(state.phase).toBe("escaped");
    expect(isFishingComplete(state)).toBe(true);
  });

  it("fails: missed timing → escaped", () => {
    const state = createFishingState();
    reachMinigame(state);
    state.zoneStart = 0.6;
    state.zoneEnd = 0.85;
    state.timingProgress = 0.1; // clearly outside
    pressFishingAction(state);
    expect(state.phase).toBe("escaped");
    expect(isFishingComplete(state)).toBe(true);
  });
});
