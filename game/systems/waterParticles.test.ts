/**
 * Tests for water particles system (Spec §36.1 + §31.2).
 *
 * Validates splash emission on water entry and bubble emission while submerged.
 * Both use ParticleEmitterComponent via the ECS world.
 */
import { World } from "miniplex";
import {
  detectWaterState,
  buildSplashEmitter,
  buildBubblesEmitter,
  tickWaterParticles,
  SPLASH_PARTICLE_COUNT,
  SPLASH_LIFETIME,
  type WaterBodyRef,
  type WaterEntity,
  type WaterParticlesState,
} from "./waterParticles";

// Helper: build a minimal water body ref for tests
const makeWaterBody = (
  x = 0,
  y = 0,
  z = 0,
  width = 10,
  depth = 10,
): WaterBodyRef => ({
  position: { x, y, z },
  waterBody: { size: { width, depth } },
});

describe("Water Particles System (Spec §36.1 + §31.2)", () => {
  // ── detectWaterState ────────────────────────────────────────────────────────

  describe("detectWaterState", () => {
    const pond = makeWaterBody(0, 0, 0, 10, 10);

    it('returns "above" when player Y is above water surface', () => {
      expect(detectWaterState(0, 1.0, 0, [pond])).toBe("above");
    });

    it('returns "submerged" when player Y equals water surface Y', () => {
      expect(detectWaterState(0, 0, 0, [pond])).toBe("submerged");
    });

    it('returns "submerged" when player Y is below water surface', () => {
      expect(detectWaterState(0, -0.5, 0, [pond])).toBe("submerged");
    });

    it('returns "above" when player is outside X bounds even if Y is low', () => {
      // halfW = 5, so x=6 is outside
      expect(detectWaterState(6, -1.0, 0, [pond])).toBe("above");
    });

    it('returns "above" when player is outside Z bounds even if Y is low', () => {
      // halfD = 5, so z=6 is outside
      expect(detectWaterState(0, -1.0, 6, [pond])).toBe("above");
    });

    it('returns "above" when no water bodies exist', () => {
      expect(detectWaterState(0, -1.0, 0, [])).toBe("above");
    });

    it("detects submerged in second water body when not in first", () => {
      const far = makeWaterBody(20, 0, 20, 10, 10);
      // player at (20, -0.5, 20) — inside far pond, not origin pond
      expect(detectWaterState(20, -0.5, 20, [pond, far])).toBe("submerged");
    });

    it("treats water body edge (exact halfW) as inside", () => {
      // halfW = 5, so x=5 is on the edge — still inside
      expect(detectWaterState(5, -0.1, 0, [pond])).toBe("submerged");
    });
  });

  // ── buildSplashEmitter ───────────────────────────────────────────────────────

  describe("buildSplashEmitter (Spec §31.2 + §36.1)", () => {
    const emitter = buildSplashEmitter();

    it('has particleType "splash"', () => {
      expect(emitter.particleType).toBe("splash");
    });

    it("has positive gravity (particles arc up then fall)", () => {
      expect(emitter.gravity).toBeGreaterThan(0);
    });

    it("is wind-unaffected per spec §36.1", () => {
      expect(emitter.windAffected).toBe(false);
    });

    it("maxParticles is 30 per spec §36.1", () => {
      expect(emitter.maxParticles).toBe(30);
    });

    it("lifetime matches SPLASH_LIFETIME from config", () => {
      expect(emitter.lifetime).toBe(SPLASH_LIFETIME);
    });

    it("is active on creation (auto-expires via renderer lifetime)", () => {
      expect(emitter.active).toBe(true);
    });

    it("emissionRate delivers at least SPLASH_PARTICLE_COUNT over lifetime", () => {
      const totalDelivered = emitter.emissionRate * emitter.lifetime;
      expect(totalDelivered).toBeGreaterThanOrEqual(SPLASH_PARTICLE_COUNT);
    });
  });

  // ── buildBubblesEmitter ──────────────────────────────────────────────────────

  describe("buildBubblesEmitter (Spec §36.1)", () => {
    const emitter = buildBubblesEmitter();

    it('has particleType "bubbles"', () => {
      expect(emitter.particleType).toBe("bubbles");
    });

    it("has gravity -0.3 (rises upward) per spec §36.1", () => {
      expect(emitter.gravity).toBe(-0.3);
    });

    it("is wind-unaffected per spec §36.1", () => {
      expect(emitter.windAffected).toBe(false);
    });

    it("maxParticles is 20 per spec §36.1", () => {
      expect(emitter.maxParticles).toBe(20);
    });

    it("is active on creation", () => {
      expect(emitter.active).toBe(true);
    });
  });

  // ── tickWaterParticles ───────────────────────────────────────────────────────

  describe("tickWaterParticles", () => {
    let world: World<WaterEntity>;
    let state: WaterParticlesState;
    const pond = makeWaterBody(0, 0, 0, 10, 10);

    beforeEach(() => {
      world = new World<WaterEntity>();
      state = {
        prevWaterState: "above",
        splashEntity: null,
        bubblesEntity: null,
      };
    });

    it("creates a splash emitter entity on water entry (above→submerged)", () => {
      const inWater = { x: 0, y: 0, z: 0 };
      tickWaterParticles(world, inWater, [pond], state);

      expect(state.splashEntity).not.toBeNull();
      expect(state.splashEntity?.particleEmitter?.particleType).toBe("splash");
    });

    it("creates a bubbles emitter entity when submerged", () => {
      const inWater = { x: 0, y: -0.5, z: 0 };
      tickWaterParticles(world, inWater, [pond], state);

      expect(state.bubblesEntity).not.toBeNull();
      expect(state.bubblesEntity?.particleEmitter?.particleType).toBe("bubbles");
    });

    it("adds particle emitter entity to world on water entry", () => {
      const inWater = { x: 0, y: 0, z: 0 };
      tickWaterParticles(world, inWater, [pond], state);

      const emitters = world.with("particleEmitter").entities;
      // splash + bubbles
      expect(emitters.length).toBeGreaterThanOrEqual(1);
    });

    it("does NOT create a second splash on continued submersion", () => {
      // Start already submerged — no entry transition
      state.prevWaterState = "submerged";
      const inWater = { x: 0, y: -0.5, z: 0 };
      tickWaterParticles(world, inWater, [pond], state);

      expect(state.splashEntity).toBeNull();
    });

    it("removes bubbles entity when player exits water", () => {
      // Pre-populate: player was submerged with a bubbles entity
      const existingBubbles: WaterEntity = {
        id: "player_bubbles",
        position: { x: 0, y: -0.5, z: 0 },
        particleEmitter: buildBubblesEmitter(),
      };
      world.add(existingBubbles);
      state.prevWaterState = "submerged";
      state.bubblesEntity = existingBubbles;

      // Player moves above water
      const aboveWater = { x: 0, y: 1.0, z: 0 };
      tickWaterParticles(world, aboveWater, [pond], state);

      expect(state.bubblesEntity).toBeNull();
      expect(world.with("particleEmitter").entities.length).toBe(0);
    });

    it("does nothing when playerPos is null", () => {
      tickWaterParticles(world, null, [pond], state);

      expect(state.splashEntity).toBeNull();
      expect(state.bubblesEntity).toBeNull();
      expect(state.prevWaterState).toBe("above");
    });

    it("updates prevWaterState to submerged after entering water", () => {
      const inWater = { x: 0, y: 0, z: 0 };
      tickWaterParticles(world, inWater, [pond], state);

      expect(state.prevWaterState).toBe("submerged");
    });

    it("updates prevWaterState to above after exiting water", () => {
      // Start submerged
      state.prevWaterState = "submerged";
      const bubblesEntity: WaterEntity = {
        id: "player_bubbles",
        position: { x: 0, y: -0.5, z: 0 },
        particleEmitter: buildBubblesEmitter(),
      };
      world.add(bubblesEntity);
      state.bubblesEntity = bubblesEntity;

      const aboveWater = { x: 0, y: 1.0, z: 0 };
      tickWaterParticles(world, aboveWater, [pond], state);

      expect(state.prevWaterState).toBe("above");
    });

    it("does not re-create bubbles entity if already tracking one", () => {
      // First tick entering water
      const inWater = { x: 0, y: -0.5, z: 0 };
      tickWaterParticles(world, inWater, [pond], state);
      const firstBubbles = state.bubblesEntity;

      // Second tick still in water
      tickWaterParticles(world, inWater, [pond], state);

      // Same entity reference — not a new one
      expect(state.bubblesEntity).toBe(firstBubbles);
      // Only one bubbles entity in world
      const bubbleEntities = world
        .with("particleEmitter")
        .entities.filter((e) => e.particleEmitter?.particleType === "bubbles");
      expect(bubbleEntities.length).toBe(1);
    });

    it("positions splash emitter at player contact point", () => {
      // Player at (3, -0.2, 4) — inside pond (halfW=5, halfD=5), below surface Y
      const inWater = { x: 3, y: -0.2, z: 4 };
      tickWaterParticles(world, inWater, [pond], state);

      expect(state.splashEntity?.position?.x).toBe(3);
      expect(state.splashEntity?.position?.z).toBe(4);
    });
  });
});
