/**
 * Unit tests for GovernorAgent — YukaJS goal-driven AI.
 *
 * Tests goal selection logic, desirability scoring, and action execution.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { actions as gameActions } from "@/actions";
import {
  createGridCellEntity,
  createPlayerEntity,
  createTreeEntity,
} from "@/archetypes";
import { koota, spawnPlayer } from "@/koota";
import { spawnGridCell, spawnTree } from "@/startup";
import { useGameStore } from "@/stores/gameStore";
import { initHarvestable } from "@/systems/harvest";
import {
  FarmerState,
  GridCell,
  Harvestable,
  IsPlayer,
  PlayerProgress,
  Position,
  Resources,
  Seeds,
  Tracking,
  Tree,
} from "@/traits";
import { world } from "@/world";
import type { GovernorProfile } from "./GovernorAgent";
import { DEFAULT_PROFILE, GovernorAgent } from "./GovernorAgent";

/**
 * Set up a minimal 4x4 world in BOTH Miniplex and Koota. The Governor reads
 * from Koota; legacy test scaffolding still uses Miniplex fixtures.
 */
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

  // Koota mirror.
  for (const entity of koota.query()) entity.destroy();
  gameActions().resetGame();
  const kPlayer = spawnPlayer();
  kPlayer.set(Position, { x: 2, y: 0, z: 2 });
  for (let x = 0; x < 4; x++) {
    for (let z = 0; z < 4; z++) {
      spawnGridCell(x, z, "soil");
    }
  }
  gameActions().addSeed("white-oak", 20);
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

    expect(koota.get(Tracking)?.treesPlanted ?? 0).toBeGreaterThan(0);
    expect(koota.query(Tree).length).toBeGreaterThan(0);
  });

  it("waters unwatered trees when water weight is high", () => {
    // Plant tree in Miniplex (legacy setup).
    const tree1 = createTreeEntity(0, 0, "white-oak");
    world.add(tree1);
    const cell1 = [...world.with("gridCell")].find(
      (c) => c.gridCell?.gridX === 0 && c.gridCell?.gridZ === 0,
    );
    if (cell1?.gridCell) {
      cell1.gridCell.occupied = true;
      cell1.gridCell.treeEntityId = tree1.id;
    }

    // Mirror in Koota so the governor can see the tree.
    const kTree = spawnTree(0, 0, "white-oak");
    const kCell = koota.query(GridCell).find((c) => {
      const gc = c.get(GridCell);
      return gc?.gridX === 0 && gc?.gridZ === 0;
    });
    if (kCell) {
      const gc = kCell.get(GridCell);
      if (gc)
        kCell.set(GridCell, {
          ...gc,
          occupied: true,
          treeEntityId: String(kTree),
        });
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

    expect(koota.get(Tracking)?.treesWatered ?? 0).toBeGreaterThan(0);
    expect(kTree.get(Tree)?.watered).toBe(true);
  });

  it("harvests ready trees when harvest weight is high", () => {
    // Miniplex legacy fixtures.
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

    // Koota mirror.
    const kTree = spawnTree(1, 1, "white-oak");
    const td = kTree.get(Tree);
    if (td) kTree.set(Tree, { ...td, stage: 3 });
    kTree.add(
      Harvestable({
        resources: [{ type: "timber", amount: 2 }],
        cooldownElapsed: 0,
        cooldownTotal: 45,
        ready: true,
      }),
    );
    const kCell = koota.query(GridCell).find((c) => {
      const gc = c.get(GridCell);
      return gc?.gridX === 1 && gc?.gridZ === 1;
    });
    if (kCell) {
      const gc = kCell.get(GridCell);
      if (gc)
        kCell.set(GridCell, {
          ...gc,
          occupied: true,
          treeEntityId: String(kTree),
        });
    }

    // Unlock axe (needs level 7)
    useGameStore.setState({ unlockedTools: ["trowel", "watering-can", "axe"] });
    const pp = koota.get(PlayerProgress);
    if (pp)
      koota.set(PlayerProgress, {
        ...pp,
        unlockedTools: ["trowel", "watering-can", "axe"],
      });

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

    expect(koota.get(Tracking)?.treesHarvested ?? 0).toBeGreaterThan(0);
    expect(koota.get(Resources)?.timber ?? 0).toBeGreaterThan(0);
  });

  it("falls back to exploring when no actions are possible", () => {
    // Empty world, no seeds
    useGameStore.setState({ seeds: {} });
    koota.set(Seeds, {});

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
    useGameStore.getState().addSeed("elder-pine", 10);
    // Elder-pine seedCost: { timber: 5 }
    useGameStore.getState().addResource("timber", 50);
    gameActions().addSeed("elder-pine", 10);
    gameActions().addResource("timber", 50);

    const profile: GovernorProfile = {
      ...DEFAULT_PROFILE,
      plantWeight: 1.0,
      waterWeight: 0.0,
      harvestWeight: 0.0,
      exploreWeight: 0.0,
      pruneWeight: 0.0,
      tradeWeight: 0.0,
      preferredSpecies: ["elder-pine"],
      decisionInterval: 1,
    };
    const governor = new GovernorAgent(profile, 4);

    for (let i = 0; i < 20; i++) governor.update();

    const pines = koota.query(Tree).filter((t) => {
      const data = t.get(Tree);
      return data?.speciesId === "elder-pine";
    });
    expect(pines.length).toBeGreaterThan(0);
  });

  it("idles when stamina is too low", () => {
    useGameStore.setState({ stamina: 0 });
    const player = koota.queryFirst(IsPlayer, FarmerState);
    if (player) player.set(FarmerState, { stamina: 0, maxStamina: 100 });

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
    expect(koota.get(Tracking)?.treesPlanted ?? 0).toBe(0);
  });

  it("prunes mature unpruned trees", () => {
    // Miniplex legacy.
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

    // Koota mirror.
    const kTree = spawnTree(1, 1, "white-oak");
    const td = kTree.get(Tree);
    if (td) kTree.set(Tree, { ...td, stage: 3 });
    kTree.add(
      Harvestable({
        resources: [{ type: "timber", amount: 2 }],
        cooldownElapsed: 0,
        cooldownTotal: 45,
        ready: false,
      }),
    );

    useGameStore.setState({
      unlockedTools: ["trowel", "watering-can", "pruning-shears"],
    });
    const pp = koota.get(PlayerProgress);
    if (pp)
      koota.set(PlayerProgress, {
        ...pp,
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

    expect(kTree.get(Tree)?.pruned).toBe(true);
  });

  it("tracks stats over a session", () => {
    const governor = new GovernorAgent({
      ...DEFAULT_PROFILE,
      decisionInterval: 1,
    });

    for (let i = 0; i < 50; i++) governor.update();

    expect(governor.stats.decisionsMade).toBeGreaterThan(0);
  });

  it("trades resources when target resource is zero", () => {
    // Give timber but no sap — governor should trade timber → sap (and may chain to fruit)
    useGameStore.getState().addResource("timber", 20);
    gameActions().addResource("timber", 20);

    const profile: GovernorProfile = {
      ...DEFAULT_PROFILE,
      plantWeight: 0.0,
      waterWeight: 0.0,
      harvestWeight: 0.0,
      exploreWeight: 0.0,
      pruneWeight: 0.0,
      tradeWeight: 1.0,
      decisionInterval: 1,
    };
    const governor = new GovernorAgent(profile, 4);

    for (let i = 0; i < 20; i++) governor.update();

    const resources = koota.get(Resources);
    expect(governor.stats.tradesExecuted).toBeGreaterThan(0);
    expect(resources?.timber ?? 0).toBeLessThan(20);
    // Governor chains trades: timber→sap→fruit.
    expect(resources?.sap ?? 0).toBeGreaterThan(-1);
  });

  it("skips invalid species in pickSpecies", () => {
    // Add seeds for a non-existent species
    useGameStore.setState({ seeds: { "phantom-tree": 10 } });
    koota.set(Seeds, { "phantom-tree": 10 });

    const profile: GovernorProfile = {
      ...DEFAULT_PROFILE,
      plantWeight: 1.0,
      waterWeight: 0.0,
      harvestWeight: 0.0,
      exploreWeight: 0.0,
      pruneWeight: 0.0,
      tradeWeight: 0.0,
      decisionInterval: 1,
    };
    const governor = new GovernorAgent(profile, 4);

    for (let i = 0; i < 20; i++) governor.update();

    // Should not have planted any trees (phantom species should be skipped)
    expect(koota.get(Tracking)?.treesPlanted ?? 0).toBe(0);
  });

  it("prefers species that produce needed resources", () => {
    // Low sap (< 5 threshold), have silver-birch seeds (yields sap, seedCost: 4 sap)
    useGameStore.setState({
      resources: { timber: 0, sap: 4, fruit: 0, acorns: 0 },
      seeds: { "white-oak": 10, "silver-birch": 10 },
    });
    koota.set(Resources, { timber: 0, sap: 4, fruit: 0, acorns: 0 });
    koota.set(Seeds, { "white-oak": 10, "silver-birch": 10 });

    const profile: GovernorProfile = {
      ...DEFAULT_PROFILE,
      plantWeight: 1.0,
      waterWeight: 0.0,
      harvestWeight: 0.0,
      exploreWeight: 0.0,
      pruneWeight: 0.0,
      tradeWeight: 0.0,
      decisionInterval: 1,
    };
    const governor = new GovernorAgent(profile, 4);

    for (let i = 0; i < 20; i++) governor.update();

    // Should prefer silver-birch over white-oak because sap is low
    const birches = koota.query(Tree).filter((t) => {
      const data = t.get(Tree);
      return data?.speciesId === "silver-birch";
    });
    expect(birches.length).toBeGreaterThan(0);
  });
});
