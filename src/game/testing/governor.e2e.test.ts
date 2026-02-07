/**
 * Governor E2E Playthrough Tests
 *
 * A YukaJS-driven AI agent plays Grovekeeper autonomously for thousands
 * of ticks. We assert game invariants that must hold regardless of the
 * specific decisions the governor makes.
 *
 * These tests validate the full stack: GameActions → ECS systems → Zustand
 * store, all running headless without BabylonJS or React.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  createGridCellEntity,
  createPlayerEntity,
  createTreeEntity,
} from "../ecs/archetypes";
import { gridCellsQuery, world } from "../ecs/world";
import { useGameStore } from "../stores/gameStore";
import { initHarvestable } from "../systems/harvest";
import type { GovernorProfile } from "./GovernorAgent";
import { DEFAULT_PROFILE, GovernorAgent } from "./GovernorAgent";
import { HeadlessGameLoop } from "./HeadlessGameLoop";

/** Standard test world: 8x8 soil grid, player, seeds, full stamina. */
function setupWorld(gridSize = 8) {
  for (const entity of [...world]) world.remove(entity);
  useGameStore.getState().resetGame();

  const player = createPlayerEntity();
  player.position!.x = Math.floor(gridSize / 2);
  player.position!.z = Math.floor(gridSize / 2);
  world.add(player);

  for (let x = 0; x < gridSize; x++) {
    for (let z = 0; z < gridSize; z++) {
      world.add(createGridCellEntity(x, z, "soil"));
    }
  }

  // Give generous starting resources
  const store = useGameStore.getState();
  store.addSeed("white-oak", 50);
  store.addSeed("sugar-maple", 20);
  store.addSeed("weeping-willow", 10);
}

/** Run the governor + headless loop for N ticks. */
function runPlaythrough(
  ticks: number,
  profile: GovernorProfile = DEFAULT_PROFILE,
  gridSize = 8,
  options: { weatherEnabled?: boolean } = {},
) {
  const loop = new HeadlessGameLoop({
    ticksPerSecond: 30,
    weatherEnabled: options.weatherEnabled ?? false,
  });
  const governor = new GovernorAgent(profile, gridSize);

  for (let i = 0; i < ticks; i++) {
    governor.update();
    loop.tick();
  }

  return { loop, governor, state: useGameStore.getState() };
}

describe("Governor E2E Playthrough", () => {
  beforeEach(() => setupWorld(8));

  // ═══════════════════════════════════════════
  // Core Playthrough
  // ═══════════════════════════════════════════

  it("completes a basic playthrough: plant → grow → harvest cycle", () => {
    const { state, governor } = runPlaythrough(3000);

    // Trees should have been planted
    expect(state.treesPlanted).toBeGreaterThan(0);
    // XP earned from planting and watering
    expect(state.xp).toBeGreaterThan(0);
    // Governor made decisions
    expect(governor.stats.decisionsMade).toBeGreaterThan(10);
    // No crashes = test passes
  });

  it("governor plants and waters trees in first 1000 ticks", () => {
    const profile: GovernorProfile = {
      ...DEFAULT_PROFILE,
      plantWeight: 0.8,
      waterWeight: 0.7,
      harvestWeight: 0.5,
      decisionInterval: 5,
    };

    const { state } = runPlaythrough(1000, profile);

    expect(state.treesPlanted).toBeGreaterThan(0);
    expect(state.treesWatered).toBeGreaterThan(0);
  });

  // ═══════════════════════════════════════════
  // Species Diversity
  // ═══════════════════════════════════════════

  it("governor plants preferred species", () => {
    useGameStore.getState().addSeed("sugar-maple", 30);

    const profile: GovernorProfile = {
      ...DEFAULT_PROFILE,
      plantWeight: 1.0,
      waterWeight: 0.0,
      harvestWeight: 0.0,
      exploreWeight: 0.0,
      pruneWeight: 0.0,
      preferredSpecies: ["sugar-maple"],
      decisionInterval: 3,
    };

    const { state } = runPlaythrough(500, profile);

    expect(state.treesPlanted).toBeGreaterThan(0);
    expect(state.speciesPlanted).toContain("sugar-maple");
  });

  // ═══════════════════════════════════════════
  // Harvest Resources
  // ═══════════════════════════════════════════

  it("governor harvests mature trees and gains resources", () => {
    for (let i = 0; i < 4; i++) {
      const tree = createTreeEntity(i, 0, "white-oak");
      tree.tree.stage = 3;
      world.add(tree);
      initHarvestable(tree);
      tree.harvestable.ready = true;

      const cell = [...gridCellsQuery].find(
        (c) => c.gridCell?.gridX === i && c.gridCell?.gridZ === 0,
      );
      if (cell?.gridCell) {
        cell.gridCell.occupied = true;
        cell.gridCell.treeEntityId = tree.id;
      }
    }

    // Unlock axe
    useGameStore.setState({ unlockedTools: ["trowel", "watering-can", "axe"] });

    const profile: GovernorProfile = {
      ...DEFAULT_PROFILE,
      plantWeight: 0.0,
      waterWeight: 0.0,
      harvestWeight: 1.0,
      exploreWeight: 0.0,
      pruneWeight: 0.0,
      decisionInterval: 3,
    };

    const { state } = runPlaythrough(200, profile);

    expect(state.treesHarvested).toBeGreaterThan(0);
    expect(state.resources.timber).toBeGreaterThan(0);
  });

  // ═══════════════════════════════════════════
  // Game Invariants
  // ═══════════════════════════════════════════

  it("maintains game invariants over extended play", () => {
    const { state } = runPlaythrough(6000);

    // Resources never go negative
    expect(state.resources.timber).toBeGreaterThanOrEqual(0);
    expect(state.resources.sap).toBeGreaterThanOrEqual(0);
    expect(state.resources.fruit).toBeGreaterThanOrEqual(0);
    expect(state.resources.acorns).toBeGreaterThanOrEqual(0);

    // Stamina is within bounds
    expect(state.stamina).toBeGreaterThanOrEqual(0);
    expect(state.stamina).toBeLessThanOrEqual(state.maxStamina);

    // XP is non-negative
    expect(state.xp).toBeGreaterThanOrEqual(0);

    // Level is at least 1
    expect(state.level).toBeGreaterThanOrEqual(1);

    // Trees planted is non-negative
    expect(state.treesPlanted).toBeGreaterThanOrEqual(0);
  });

  it("stamina never goes below zero during play", () => {
    // Monitor stamina across ticks
    const loop = new HeadlessGameLoop({ ticksPerSecond: 30 });
    const governor = new GovernorAgent(
      {
        ...DEFAULT_PROFILE,
        decisionInterval: 3,
      },
      8,
    );

    let minStamina = 100;
    for (let i = 0; i < 3000; i++) {
      governor.update();
      loop.tick();
      const stamina = useGameStore.getState().stamina;
      if (stamina < minStamina) minStamina = stamina;
      expect(stamina).toBeGreaterThanOrEqual(0);
    }
  });

  it("no duplicate entity IDs in the world", () => {
    runPlaythrough(2000);

    const ids = new Set<string>();
    for (const entity of world) {
      expect(ids.has(entity.id)).toBe(false);
      ids.add(entity.id);
    }
  });

  // ═══════════════════════════════════════════
  // Edge Cases
  // ═══════════════════════════════════════════

  it("governor handles empty grid gracefully", () => {
    // No seeds, no resources → governor should idle without crashing
    useGameStore.setState({ seeds: {} });

    const { governor } = runPlaythrough(1000);

    // Should have made decisions (explore fallback)
    expect(governor.stats.decisionsMade).toBeGreaterThan(0);
    // Should not have planted
    expect(useGameStore.getState().treesPlanted).toBe(0);
  });

  it("governor handles full grid gracefully", () => {
    for (let x = 0; x < 8; x++) {
      for (let z = 0; z < 8; z++) {
        const tree = createTreeEntity(x, z, "white-oak");
        world.add(tree);
        const cell = [...gridCellsQuery].find(
          (c) => c.gridCell?.gridX === x && c.gridCell?.gridZ === z,
        );
        if (cell?.gridCell) {
          cell.gridCell.occupied = true;
          cell.gridCell.treeEntityId = tree.id;
        }
      }
    }

    // Governor should water/explore but not crash trying to plant
    expect(() => runPlaythrough(500)).not.toThrow();
  });

  // ═══════════════════════════════════════════
  // Weather Integration
  // ═══════════════════════════════════════════

  it("survives a long playthrough with weather enabled", () => {
    const { state } = runPlaythrough(3000, DEFAULT_PROFILE, 8, {
      weatherEnabled: true,
    });

    // Basic invariants still hold with weather
    expect(state.resources.timber).toBeGreaterThanOrEqual(0);
    expect(state.stamina).toBeGreaterThanOrEqual(0);
    expect(state.xp).toBeGreaterThanOrEqual(0);
  });

  // ═══════════════════════════════════════════
  // Performance
  // ═══════════════════════════════════════════

  it("completes 3000 ticks in under 5 seconds", () => {
    const start = performance.now();
    runPlaythrough(3000);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(5000);
  });
});
