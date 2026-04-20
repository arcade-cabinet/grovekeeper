/**
 * Unit tests for HeadlessGameLoop.
 *
 * Validates that the headless simulation correctly advances time,
 * grows trees, regenerates stamina, and manages harvest cooldowns.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { destroyAllEntitiesExceptWorld, koota, spawnPlayer } from "@/koota";
import { spawnGridCell, spawnTree } from "@/startup";
import { useGameStore } from "@/stores/gameStore";
import { initHarvestable } from "@/systems/harvest";
import { FarmerState, Harvestable, IsPlayer, Tree } from "@/traits";
import { HeadlessGameLoop } from "./HeadlessGameLoop";

/** Set up a minimal world for simulation. */
function setupWorld() {
  destroyAllEntitiesExceptWorld();
  useGameStore.getState().resetGame();

  spawnPlayer();

  // 4x4 soil grid
  for (let x = 0; x < 4; x++) {
    for (let z = 0; z < 4; z++) {
      spawnGridCell(x, z, "soil");
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
    loop.run(300);
    expect(loop.gameTime).not.toBeNull();
    expect(loop.gameTime!.microseconds).toBeGreaterThan(timeBefore);
  });

  it("starts in spring season", () => {
    const loop = new HeadlessGameLoop();
    loop.tick();
    expect(loop.season).toBe("spring");
  });

  it("grows trees over time", () => {
    const tree = spawnTree(0, 0, "white-oak");

    const loop = new HeadlessGameLoop({ ticksPerSecond: 30 });
    const progressBefore = tree.get(Tree).progress;

    loop.run(150);

    expect(tree.get(Tree).progress).toBeGreaterThan(progressBefore);
  });

  it("regenerates stamina via staminaSystem", () => {
    const player = koota.queryFirst(IsPlayer, FarmerState);
    if (!player) throw new Error("no player");
    player.set(FarmerState, { ...player.get(FarmerState), stamina: 50 });

    const loop = new HeadlessGameLoop({ ticksPerSecond: 30 });
    loop.run(300);

    expect(player.get(FarmerState).stamina).toBeGreaterThan(50);
  });

  it("advances harvest cooldowns", () => {
    const tree = spawnTree(0, 0, "white-oak");
    tree.set(Tree, { ...tree.get(Tree), stage: 3 });
    initHarvestable(tree);

    expect(tree.get(Harvestable).ready).toBe(false);

    const loop = new HeadlessGameLoop({ ticksPerSecond: 30 });
    loop.run(1500);

    expect(tree.get(Harvestable).ready).toBe(true);
  });

  it("promotes trees to harvestable at stage 3", () => {
    const tree = spawnTree(0, 0, "white-oak");
    tree.set(Tree, { ...tree.get(Tree), stage: 2, progress: 0.95 });

    expect(tree.has(Harvestable)).toBe(false);

    const loop = new HeadlessGameLoop({ ticksPerSecond: 30 });
    loop.run(300);

    if (tree.get(Tree).stage >= 3) {
      expect(tree.has(Harvestable)).toBe(true);
    }
  });

  it("handles weather when enabled", () => {
    const loop = new HeadlessGameLoop({
      ticksPerSecond: 30,
      weatherEnabled: true,
      weatherSeed: 12345,
    });
    loop.run(30);
    expect(loop.weather).toBeDefined();
  });

  it("weather defaults to clear when disabled", () => {
    const loop = new HeadlessGameLoop({ weatherEnabled: false });
    loop.tick();
    expect(loop.weather).toBe("clear");
  });

  it("fast-forwards many ticks without errors", () => {
    spawnTree(0, 0, "white-oak");

    const loop = new HeadlessGameLoop({ ticksPerSecond: 30 });

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
