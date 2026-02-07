/**
 * Unit tests for GovernorAgent — YukaJS goal-driven AI.
 *
 * Tests goal selection logic, desirability scoring, and action execution.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  createGridCellEntity,
  createPlayerEntity,
  createTreeEntity,
} from "../ecs/archetypes";
import { treesQuery, world } from "../ecs/world";
import { useGameStore } from "../stores/gameStore";
import { initHarvestable } from "../systems/harvest";
import type { GovernorProfile } from "./GovernorAgent";
import { DEFAULT_PROFILE, GovernorAgent } from "./GovernorAgent";

/** Set up a minimal 4x4 world. */
function setupWorld() {
  for (const entity of [...world]) world.remove(entity);
  useGameStore.getState().resetGame();

  const player = createPlayerEntity();
  player.position!.x = 2;
  player.position!.z = 2;
  world.add(player);

  for (let x = 0; x < 4; x++) {
    for (let z = 0; z < 4; z++) {
      world.add(createGridCellEntity(x, z, "soil"));
    }
  }

  useGameStore.getState().addSeed("white-oak", 20);
}

describe("GovernorAgent", () => {
  beforeEach(setupWorld);

  it("creates without errors", () => {
    const governor = new GovernorAgent();
    expect(governor).toBeDefined();
    expect(governor.brain).toBeDefined();
  });

  it("makes decisions on the configured interval", () => {
    const profile: GovernorProfile = {
      ...DEFAULT_PROFILE,
      decisionInterval: 5,
    };
    const governor = new GovernorAgent(profile);

    // Run fewer ticks than the interval — no decision yet
    for (let i = 0; i < 4; i++) governor.update();
    expect(governor.stats.decisionsMade).toBe(0);

    // One more tick reaches the interval — first decision fires
    governor.update();
    expect(governor.stats.decisionsMade).toBe(1);

    // Run another full interval — second decision
    for (let i = 0; i < 5; i++) governor.update();
    expect(governor.stats.decisionsMade).toBe(2);
  });

  it("plants trees when seeds and tiles are available", () => {
    const profile: GovernorProfile = {
      ...DEFAULT_PROFILE,
      plantWeight: 1.0,
      waterWeight: 0.0,
      harvestWeight: 0.0,
      exploreWeight: 0.0,
      pruneWeight: 0.0,
      decisionInterval: 1,
    };
    const governor = new GovernorAgent(profile, 4);

    // Run enough ticks for several planting cycles
    for (let i = 0; i < 30; i++) governor.update();

    expect(useGameStore.getState().treesPlanted).toBeGreaterThan(0);
    expect([...treesQuery].length).toBeGreaterThan(0);
  });

  it("waters unwatered trees when water weight is high", () => {
    // Plant some trees first
    const tree1 = createTreeEntity(0, 0, "white-oak");
    world.add(tree1);
    const cell1 = [...world.with("gridCell")].find(
      (c) => c.gridCell?.gridX === 0 && c.gridCell?.gridZ === 0,
    );
    if (cell1?.gridCell) {
      cell1.gridCell.occupied = true;
      cell1.gridCell.treeEntityId = tree1.id;
    }

    const profile: GovernorProfile = {
      ...DEFAULT_PROFILE,
      plantWeight: 0.0,
      waterWeight: 1.0,
      harvestWeight: 0.0,
      exploreWeight: 0.0,
      pruneWeight: 0.0,
      decisionInterval: 1,
    };
    const governor = new GovernorAgent(profile, 4);

    for (let i = 0; i < 20; i++) governor.update();

    expect(useGameStore.getState().treesWatered).toBeGreaterThan(0);
    expect(tree1.tree?.watered).toBe(true);
  });

  it("harvests ready trees when harvest weight is high", () => {
    const tree = createTreeEntity(1, 1, "white-oak");
    tree.tree!.stage = 3;
    world.add(tree);
    initHarvestable(tree);
    tree.harvestable!.ready = true;

    const cell = [...world.with("gridCell")].find(
      (c) => c.gridCell?.gridX === 1 && c.gridCell?.gridZ === 1,
    );
    if (cell?.gridCell) {
      cell.gridCell.occupied = true;
      cell.gridCell.treeEntityId = tree.id;
    }

    // Unlock axe (needs level 7)
    useGameStore.setState({ unlockedTools: ["trowel", "watering-can", "axe"] });

    const profile: GovernorProfile = {
      ...DEFAULT_PROFILE,
      plantWeight: 0.0,
      waterWeight: 0.0,
      harvestWeight: 1.0,
      exploreWeight: 0.0,
      pruneWeight: 0.0,
      decisionInterval: 1,
    };
    const governor = new GovernorAgent(profile, 4);

    for (let i = 0; i < 20; i++) governor.update();

    expect(useGameStore.getState().treesHarvested).toBeGreaterThan(0);
    expect(useGameStore.getState().resources.timber).toBeGreaterThan(0);
  });

  it("falls back to exploring when no actions are possible", () => {
    // Empty world, no seeds
    useGameStore.setState({ seeds: {} });

    const profile: GovernorProfile = {
      ...DEFAULT_PROFILE,
      plantWeight: 0.5,
      waterWeight: 0.5,
      harvestWeight: 0.5,
      exploreWeight: 0.5,
      pruneWeight: 0.0,
      decisionInterval: 1,
    };
    const governor = new GovernorAgent(profile, 4);

    // Should not throw
    expect(() => {
      for (let i = 0; i < 30; i++) governor.update();
    }).not.toThrow();

    expect(governor.stats.decisionsMade).toBeGreaterThan(0);
  });

  it("respects preferred species", () => {
    useGameStore.getState().addSeed("sugar-maple", 10);

    const profile: GovernorProfile = {
      ...DEFAULT_PROFILE,
      plantWeight: 1.0,
      waterWeight: 0.0,
      harvestWeight: 0.0,
      exploreWeight: 0.0,
      pruneWeight: 0.0,
      preferredSpecies: ["sugar-maple"],
      decisionInterval: 1,
    };
    const governor = new GovernorAgent(profile, 4);

    for (let i = 0; i < 20; i++) governor.update();

    const trees = [...treesQuery];
    const maples = trees.filter((t) => t.tree?.speciesId === "sugar-maple");
    expect(maples.length).toBeGreaterThan(0);
  });

  it("idles when stamina is too low", () => {
    useGameStore.setState({ stamina: 0 });

    const profile: GovernorProfile = {
      ...DEFAULT_PROFILE,
      plantWeight: 1.0,
      waterWeight: 0.0,
      harvestWeight: 0.0,
      exploreWeight: 0.0,
      pruneWeight: 0.0,
      decisionInterval: 1,
    };
    const governor = new GovernorAgent(profile, 4);

    // With 0 stamina, plant evaluator should return 0 desirability
    for (let i = 0; i < 10; i++) governor.update();

    // Should not have planted (stamina was 0)
    expect(useGameStore.getState().treesPlanted).toBe(0);
  });

  it("prunes mature unpruned trees", () => {
    const tree = createTreeEntity(1, 1, "white-oak");
    tree.tree!.stage = 3;
    world.add(tree);
    initHarvestable(tree);

    const cell = [...world.with("gridCell")].find(
      (c) => c.gridCell?.gridX === 1 && c.gridCell?.gridZ === 1,
    );
    if (cell?.gridCell) {
      cell.gridCell.occupied = true;
      cell.gridCell.treeEntityId = tree.id;
    }

    useGameStore.setState({
      unlockedTools: ["trowel", "watering-can", "pruning-shears"],
    });

    const profile: GovernorProfile = {
      ...DEFAULT_PROFILE,
      plantWeight: 0.0,
      waterWeight: 0.0,
      harvestWeight: 0.0,
      exploreWeight: 0.0,
      pruneWeight: 1.0,
      decisionInterval: 1,
    };
    const governor = new GovernorAgent(profile, 4);

    for (let i = 0; i < 20; i++) governor.update();

    expect(tree.tree?.pruned).toBe(true);
  });

  it("tracks stats over a session", () => {
    const governor = new GovernorAgent({
      ...DEFAULT_PROFILE,
      decisionInterval: 1,
    });

    for (let i = 0; i < 50; i++) governor.update();

    expect(governor.stats.decisionsMade).toBeGreaterThan(0);
  });
});
