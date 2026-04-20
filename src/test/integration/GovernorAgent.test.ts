/**
 * Unit tests for GovernorAgent — YukaJS goal-driven AI.
 *
 * Tests goal selection logic, desirability scoring, and action execution.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { actions as gameActions } from "@/actions";
import { destroyAllEntitiesExceptWorld, koota, spawnPlayer } from "@/koota";
import { spawnGridCell, spawnTree } from "@/startup";
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
import type { GovernorProfile } from "./GovernorAgent";
import { DEFAULT_PROFILE, GovernorAgent } from "./GovernorAgent";

/**
 * Set up a minimal 4x4 world in Koota. The Governor reads from Koota.
 */
function setupWorld() {
  destroyAllEntitiesExceptWorld();
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

    for (let i = 0; i < 4; i++) governor.update();
    expect(governor.stats.decisionsMade).toBe(0);

    governor.update();
    expect(governor.stats.decisionsMade).toBe(1);

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

    for (let i = 0; i < 30; i++) governor.update();

    expect(koota.get(Tracking)?.treesPlanted ?? 0).toBeGreaterThan(0);
    expect(koota.query(Tree).length).toBeGreaterThan(0);
  });

  it("waters unwatered trees when water weight is high", () => {
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
          treeEntity: kTree,
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
          treeEntity: kTree,
        });
    }

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

    expect(() => {
      for (let i = 0; i < 30; i++) governor.update();
    }).not.toThrow();

    expect(governor.stats.decisionsMade).toBeGreaterThan(0);
  });

  it("respects preferred species", () => {
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

    for (let i = 0; i < 10; i++) governor.update();

    expect(koota.get(Tracking)?.treesPlanted ?? 0).toBe(0);
  });

  it("prunes mature unpruned trees", () => {
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
    expect(resources?.sap ?? 0).toBeGreaterThan(-1);
  });

  it("skips invalid species in pickSpecies", () => {
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

    expect(koota.get(Tracking)?.treesPlanted ?? 0).toBe(0);
  });

  it("prefers species that produce needed resources", () => {
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

    const birches = koota.query(Tree).filter((t) => {
      const data = t.get(Tree);
      return data?.speciesId === "silver-birch";
    });
    expect(birches.length).toBeGreaterThan(0);
  });
});
