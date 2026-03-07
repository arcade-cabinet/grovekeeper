/**
 * Tests for weather particles system (Spec §36.1).
 *
 * Validates rain (500 max), snow (300 max), and wind/dust (100 max) emitters
 * driven by WeatherComponent state.
 */
import { World } from "miniplex";
import {
  buildRainEmitter,
  buildSnowEmitter,
  buildWindEmitter,
  resolveParticleCategory,
  tickWeatherParticles,
  RAIN_MAX_PARTICLES,
  SNOW_MAX_PARTICLES,
  WIND_MAX_PARTICLES,
  type WeatherParticleEntity,
  type WeatherParticlesState,
} from "./weatherParticles";
import type { WeatherComponent } from "@/game/ecs/components/procedural/atmosphere";

// ── Helpers ──────────────────────────────────────────────────────────────────

const makeWeather = (
  weatherType: WeatherComponent["weatherType"],
  intensity = 1.0,
): WeatherComponent => ({
  weatherType,
  intensity,
  windDirection: [1, 0],
  windSpeed: 1.0,
  timeRemaining: 60,
  affectsGameplay: true,
});

const playerAt = (x = 0, y = 0, z = 0) => ({ x, y, z });

const makeState = (): WeatherParticlesState => ({
  activeCategory: null,
  particleEntity: null,
});

// ── resolveParticleCategory ──────────────────────────────────────────────────

describe("resolveParticleCategory (Spec §36.1)", () => {
  it('maps "rain" to "rain"', () => {
    expect(resolveParticleCategory("rain")).toBe("rain");
  });

  it('maps "thunderstorm" to "rain" (same visual)', () => {
    expect(resolveParticleCategory("thunderstorm")).toBe("rain");
  });

  it('maps "snow" to "snow"', () => {
    expect(resolveParticleCategory("snow")).toBe("snow");
  });

  it('maps "windstorm" to "wind"', () => {
    expect(resolveParticleCategory("windstorm")).toBe("wind");
  });

  it('maps "clear" to null (no particles)', () => {
    expect(resolveParticleCategory("clear")).toBeNull();
  });

  it('maps "fog" to null (no particles)', () => {
    expect(resolveParticleCategory("fog")).toBeNull();
  });
});

// ── buildRainEmitter ─────────────────────────────────────────────────────────

describe("buildRainEmitter (Spec §36.1)", () => {
  const emitter = buildRainEmitter(1.0);

  it('has particleType "rain"', () => {
    expect(emitter.particleType).toBe("rain");
  });

  it("maxParticles is 500 per spec §36.1", () => {
    expect(emitter.maxParticles).toBe(500);
  });

  it("maxParticles matches RAIN_MAX_PARTICLES constant", () => {
    expect(emitter.maxParticles).toBe(RAIN_MAX_PARTICLES);
  });

  it("gravity is 1.0 (falls straight down) per spec §36.1", () => {
    expect(emitter.gravity).toBe(1.0);
  });

  it("is wind-affected per spec §36.1", () => {
    expect(emitter.windAffected).toBe(true);
  });

  it("is active on creation", () => {
    expect(emitter.active).toBe(true);
  });

  it("emissionRate scales with intensity", () => {
    const low = buildRainEmitter(0.2);
    const high = buildRainEmitter(1.0);
    expect(high.emissionRate).toBeGreaterThan(low.emissionRate);
  });

  it("emissionRate has a minimum floor (not zero at intensity 0)", () => {
    const zero = buildRainEmitter(0);
    expect(zero.emissionRate).toBeGreaterThan(0);
  });
});

// ── buildSnowEmitter ─────────────────────────────────────────────────────────

describe("buildSnowEmitter (Spec §36.1)", () => {
  const emitter = buildSnowEmitter(1.0);

  it('has particleType "snow"', () => {
    expect(emitter.particleType).toBe("snow");
  });

  it("maxParticles is 300 per spec §36.1", () => {
    expect(emitter.maxParticles).toBe(300);
  });

  it("maxParticles matches SNOW_MAX_PARTICLES constant", () => {
    expect(emitter.maxParticles).toBe(SNOW_MAX_PARTICLES);
  });

  it("gravity is 0.3 (drifting down slowly) per spec §36.1", () => {
    expect(emitter.gravity).toBe(0.3);
  });

  it("is wind-affected per spec §36.1", () => {
    expect(emitter.windAffected).toBe(true);
  });

  it("is active on creation", () => {
    expect(emitter.active).toBe(true);
  });

  it("emissionRate scales with intensity", () => {
    const low = buildSnowEmitter(0.2);
    const high = buildSnowEmitter(1.0);
    expect(high.emissionRate).toBeGreaterThan(low.emissionRate);
  });
});

// ── buildWindEmitter ─────────────────────────────────────────────────────────

describe("buildWindEmitter (Spec §36.1)", () => {
  const emitter = buildWindEmitter(1.0);

  it('has particleType "dust" (wind-driven dust streaks)', () => {
    expect(emitter.particleType).toBe("dust");
  });

  it("maxParticles is 100 per spec §36.1", () => {
    expect(emitter.maxParticles).toBe(100);
  });

  it("maxParticles matches WIND_MAX_PARTICLES constant", () => {
    expect(emitter.maxParticles).toBe(WIND_MAX_PARTICLES);
  });

  it("gravity is 0.1 (nearly horizontal drift) per spec §36.1", () => {
    expect(emitter.gravity).toBe(0.1);
  });

  it("is wind-affected per spec §36.1", () => {
    expect(emitter.windAffected).toBe(true);
  });

  it("is active on creation", () => {
    expect(emitter.active).toBe(true);
  });

  it("emissionRate scales with intensity", () => {
    const low = buildWindEmitter(0.2);
    const high = buildWindEmitter(1.0);
    expect(high.emissionRate).toBeGreaterThan(low.emissionRate);
  });
});

// ── tickWeatherParticles ─────────────────────────────────────────────────────

describe("tickWeatherParticles", () => {
  let world: World<WeatherParticleEntity>;
  let state: WeatherParticlesState;
  const pos = playerAt(0, 1, 0);

  beforeEach(() => {
    world = new World<WeatherParticleEntity>();
    state = makeState();
  });

  it("creates a rain emitter entity when weather is rain", () => {
    tickWeatherParticles(world, makeWeather("rain"), pos, state);

    expect(state.particleEntity).not.toBeNull();
    expect(state.particleEntity?.particleEmitter?.particleType).toBe("rain");
    expect(state.activeCategory).toBe("rain");
  });

  it("creates a snow emitter entity when weather is snow", () => {
    tickWeatherParticles(world, makeWeather("snow"), pos, state);

    expect(state.particleEntity).not.toBeNull();
    expect(state.particleEntity?.particleEmitter?.particleType).toBe("snow");
    expect(state.activeCategory).toBe("snow");
  });

  it("creates a wind/dust emitter entity when weather is windstorm", () => {
    tickWeatherParticles(world, makeWeather("windstorm"), pos, state);

    expect(state.particleEntity).not.toBeNull();
    expect(state.particleEntity?.particleEmitter?.particleType).toBe("dust");
    expect(state.activeCategory).toBe("wind");
  });

  it("creates a rain emitter for thunderstorm weather", () => {
    tickWeatherParticles(world, makeWeather("thunderstorm"), pos, state);

    expect(state.particleEntity?.particleEmitter?.particleType).toBe("rain");
    expect(state.activeCategory).toBe("rain");
  });

  it("adds the emitter entity to the world", () => {
    tickWeatherParticles(world, makeWeather("rain"), pos, state);

    const emitters = world.with("particleEmitter").entities;
    expect(emitters.length).toBe(1);
  });

  it("does not create emitter when weather is clear", () => {
    tickWeatherParticles(world, makeWeather("clear"), pos, state);

    expect(state.particleEntity).toBeNull();
    expect(state.activeCategory).toBeNull();
    expect(world.with("particleEmitter").entities.length).toBe(0);
  });

  it("does not create emitter when weather is fog", () => {
    tickWeatherParticles(world, makeWeather("fog"), pos, state);

    expect(state.particleEntity).toBeNull();
    expect(state.activeCategory).toBeNull();
  });

  it("does not re-create emitter on repeated ticks with same weather", () => {
    tickWeatherParticles(world, makeWeather("rain"), pos, state);
    const first = state.particleEntity;

    tickWeatherParticles(world, makeWeather("rain"), pos, state);

    expect(state.particleEntity).toBe(first);
    expect(world.with("particleEmitter").entities.length).toBe(1);
  });

  it("removes emitter when weather transitions to clear", () => {
    // Start with rain
    tickWeatherParticles(world, makeWeather("rain"), pos, state);
    expect(state.particleEntity).not.toBeNull();

    // Transition to clear
    tickWeatherParticles(world, makeWeather("clear"), pos, state);

    expect(state.particleEntity).toBeNull();
    expect(state.activeCategory).toBeNull();
    expect(world.with("particleEmitter").entities.length).toBe(0);
  });

  it("swaps emitter when weather type changes (rain → snow)", () => {
    tickWeatherParticles(world, makeWeather("rain"), pos, state);
    expect(state.particleEntity?.particleEmitter?.particleType).toBe("rain");

    tickWeatherParticles(world, makeWeather("snow"), pos, state);

    expect(state.particleEntity?.particleEmitter?.particleType).toBe("snow");
    expect(state.activeCategory).toBe("snow");
    // Only one emitter active at a time
    expect(world.with("particleEmitter").entities.length).toBe(1);
  });

  it("swaps emitter when weather changes from snow to windstorm", () => {
    tickWeatherParticles(world, makeWeather("snow"), pos, state);
    tickWeatherParticles(world, makeWeather("windstorm"), pos, state);

    expect(state.particleEntity?.particleEmitter?.particleType).toBe("dust");
    expect(world.with("particleEmitter").entities.length).toBe(1);
  });

  it("removes emitter when weather is null", () => {
    tickWeatherParticles(world, makeWeather("rain"), pos, state);
    tickWeatherParticles(world, null, pos, state);

    expect(state.particleEntity).toBeNull();
    expect(world.with("particleEmitter").entities.length).toBe(0);
  });

  it("does nothing when playerPos is null", () => {
    tickWeatherParticles(world, makeWeather("rain"), null, state);

    expect(state.particleEntity).toBeNull();
    expect(state.activeCategory).toBeNull();
  });

  it("removes existing emitter when playerPos becomes null", () => {
    tickWeatherParticles(world, makeWeather("rain"), pos, state);
    expect(state.particleEntity).not.toBeNull();

    tickWeatherParticles(world, makeWeather("rain"), null, state);

    expect(state.particleEntity).toBeNull();
    expect(world.with("particleEmitter").entities.length).toBe(0);
  });

  it("positions emitter above the player", () => {
    const p = playerAt(5, 2, 8);
    tickWeatherParticles(world, makeWeather("rain"), p, state);

    expect(state.particleEntity?.position?.x).toBe(5);
    expect(state.particleEntity?.position?.z).toBe(8);
    // Emitter is above player (y > playerY)
    expect(state.particleEntity?.position?.y).toBeGreaterThan(2);
  });

  it("rain emitter respects 500-particle budget", () => {
    tickWeatherParticles(world, makeWeather("rain"), pos, state);
    expect(state.particleEntity?.particleEmitter?.maxParticles).toBe(500);
  });

  it("snow emitter respects 300-particle budget", () => {
    tickWeatherParticles(world, makeWeather("snow"), pos, state);
    expect(state.particleEntity?.particleEmitter?.maxParticles).toBe(300);
  });

  it("wind emitter respects 100-particle budget", () => {
    tickWeatherParticles(world, makeWeather("windstorm"), pos, state);
    expect(state.particleEntity?.particleEmitter?.maxParticles).toBe(100);
  });
});
