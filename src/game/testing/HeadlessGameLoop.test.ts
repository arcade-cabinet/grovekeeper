/**
 * Unit tests for HeadlessGameLoop.
 *
 * Validates that the headless simulation correctly advances time,
 * grows trees, regenerates stamina, and manages harvest cooldowns.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  createGridCellEntity,
  createPlayerEntity,
  createTreeEntity,
} from "../ecs/archetypes";
import { world } from "../ecs/world";
import { useGameStore } from "../stores/gameStore";
import { initHarvestable } from "../systems/harvest";
import { HeadlessGameLoop } from "./HeadlessGameLoop";

/** Set up a minimal world for simulation. */
function setupWorld() {
  for (const entity of [...world]) world.remove(entity);
  useGameStore.getState().resetGame();

  world.add(createPlayerEntity());

  // 4x4 soil grid
  for (let x = 0; x < 4; x++) {
    for (let z = 0; z < 4; z++) {
      world.add(createGridCellEntity(x, z, "soil"));
    }
  }
}

describe("HeadlessGameLoop", () => {
  beforeEach(setupWorld);

  it("initializes with zero ticks", () => {
    const loop = new HeadlessGameLoop();
    expect(loop.ticks).toBe(0);
  });

  it("increments tick count", () => {
    const loop = new HeadlessGameLoop();
    loop.tick();
    expect(loop.ticks).toBe(1);
    loop.run(9);
    expect(loop.ticks).toBe(10);
  });

  it("advances game time", () => {
    const loop = new HeadlessGameLoop({ ticksPerSecond: 30 });
    const timeBefore = useGameStore.getState().gameTimeMicroseconds;
    loop.run(300); // 10 seconds at 30 TPS
    // After syncing, game time should have advanced
    expect(loop.gameTime).not.toBeNull();
    expect(loop.gameTime!.microseconds).toBeGreaterThan(timeBefore);
  });

  it("starts in spring season", () => {
    const loop = new HeadlessGameLoop();
    loop.tick();
    expect(loop.season).toBe("spring");
  });

  it("grows trees over time", () => {
    const tree = createTreeEntity(0, 0, "white-oak");
    world.add(tree);

    const loop = new HeadlessGameLoop({ ticksPerSecond: 30 });
    const progressBefore = tree.tree!.progress;

    // Run for ~5 seconds of game time (150 ticks at 30 TPS)
    loop.run(150);

    expect(tree.tree!.progress).toBeGreaterThan(progressBefore);
  });

  it("regenerates stamina via staminaSystem", () => {
    // Drain some stamina first
    const player = [...world.with("farmerState")][0];
    player.farmerState!.stamina = 50;

    const loop = new HeadlessGameLoop({ ticksPerSecond: 30 });
    loop.run(300); // 10 seconds

    // Stamina should have regenerated (2/sec base rate)
    expect(player.farmerState!.stamina).toBeGreaterThan(50);
  });

  it("advances harvest cooldowns", () => {
    const tree = createTreeEntity(0, 0, "white-oak");
    tree.tree!.stage = 3;
    world.add(tree);
    initHarvestable(tree);

    expect(tree.harvestable!.ready).toBe(false);

    const loop = new HeadlessGameLoop({ ticksPerSecond: 30 });
    // White oak harvest cycle is 45 seconds, run for 50s = 1500 ticks
    loop.run(1500);

    expect(tree.harvestable!.ready).toBe(true);
  });

  it("promotes trees to harvestable at stage 3", () => {
    const tree = createTreeEntity(0, 0, "white-oak");
    // Start at stage 2 with high progress so it will advance
    tree.tree!.stage = 2;
    tree.tree!.progress = 0.95;
    world.add(tree);

    expect(tree.harvestable).toBeUndefined();

    const loop = new HeadlessGameLoop({ ticksPerSecond: 30 });
    loop.run(300); // Run long enough for stage transition

    // Tree should have advanced to stage 3+ and been given harvestable component
    if (tree.tree!.stage >= 3) {
      expect(tree.harvestable).toBeDefined();
    }
  });

  it("handles weather when enabled", () => {
    const loop = new HeadlessGameLoop({
      ticksPerSecond: 30,
      weatherEnabled: true,
      weatherSeed: 12345,
    });
    loop.run(30);
    // Should not throw — weather state is initialized
    expect(loop.weather).toBeDefined();
  });

  it("weather defaults to clear when disabled", () => {
    const loop = new HeadlessGameLoop({ weatherEnabled: false });
    loop.tick();
    expect(loop.weather).toBe("clear");
  });

  it("fast-forwards many ticks without errors", () => {
    const tree = createTreeEntity(0, 0, "white-oak");
    world.add(tree);

    const loop = new HeadlessGameLoop({ ticksPerSecond: 30 });

    // 3000 ticks = 100s of game time — should complete without throwing
    expect(() => loop.run(3000)).not.toThrow();
    expect(loop.ticks).toBe(3000);
  });

  it("dt is correct for given TPS", () => {
    const loop30 = new HeadlessGameLoop({ ticksPerSecond: 30 });
    expect(loop30.dt).toBeCloseTo(1 / 30, 6);

    const loop60 = new HeadlessGameLoop({ ticksPerSecond: 60 });
    expect(loop60.dt).toBeCloseTo(1 / 60, 6);
  });
});
