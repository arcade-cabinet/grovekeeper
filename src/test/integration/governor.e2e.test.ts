/**
 * Governor E2E Playthrough Tests
 *
 * A YukaJS-driven AI agent plays Grovekeeper autonomously for thousands
 * of ticks. We assert game invariants that must hold regardless of the
 * specific decisions the governor makes.
 *
 * These tests validate the full stack: GameActions → ECS systems → Koota
 * traits, all running headless without BabylonJS or React.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { actions as gameActions } from "@/actions";
import { destroyAllEntitiesExceptWorld, koota, spawnPlayer } from "@/koota";
import { spawnGridCell, spawnTree } from "@/startup";
import { useGameStore } from "@/stores/gameStore";
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
import { HeadlessGameLoop } from "./HeadlessGameLoop";

/** Standard test world: 8x8 soil grid, player, seeds, full stamina. */
function setupWorld(gridSize = 8) {
  destroyAllEntitiesExceptWorld();
  useGameStore.getState().resetGame();
  gameActions().resetGame();

  const kPlayer = spawnPlayer();
  kPlayer.set(Position, {
    x: Math.floor(gridSize / 2),
    y: 0,
    z: Math.floor(gridSize / 2),
  });
  for (let x = 0; x < gridSize; x++) {
    for (let z = 0; z < gridSize; z++) {
      spawnGridCell(x, z, "soil");
    }
  }

  const a = gameActions();
  a.addSeed("white-oak", 50);
  a.addSeed("elder-pine", 20);
  a.addSeed("silver-birch", 15);
  a.addSeed("golden-apple", 10);
  a.addSeed("weeping-willow", 10);
  a.addResource("timber", 30);
  a.addResource("sap", 15);
  a.addResource("fruit", 15);

  // Zustand mirror for systems that still read from the store.
  const store = useGameStore.getState();
  store.addSeed("white-oak", 50);
  store.addSeed("elder-pine", 20);
  store.addSeed("silver-birch", 15);
  store.addSeed("golden-apple", 10);
  store.addSeed("weeping-willow", 10);
  store.addResource("timber", 30);
  store.addResource("sap", 15);
  store.addResource("fruit", 15);
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

/** Read Koota-tracked stats for assertions. */
function kootaStats() {
  const tracking = koota.get(Tracking);
  const progress = koota.get(PlayerProgress);
  const resources = koota.get(Resources);
  const player = koota.queryFirst(IsPlayer, FarmerState);
  const farmer = player?.get(FarmerState);
  return {
    treesPlanted: tracking?.treesPlanted ?? 0,
    treesWatered: tracking?.treesWatered ?? 0,
    treesHarvested: tracking?.treesHarvested ?? 0,
    speciesPlanted: tracking?.speciesPlanted ?? [],
    xp: progress?.xp ?? 0,
    level: progress?.level ?? 1,
    stamina: farmer?.stamina ?? 0,
    maxStamina: farmer?.maxStamina ?? 100,
    resources: resources ?? { timber: 0, sap: 0, fruit: 0, acorns: 0 },
  };
}

describe("Governor E2E Playthrough", () => {
  beforeEach(() => setupWorld(8));

  it("completes a basic playthrough: plant → grow → harvest cycle", () => {
    const { governor } = runPlaythrough(3000);
    const stats = kootaStats();

    expect(stats.treesPlanted).toBeGreaterThan(0);
    expect(stats.xp).toBeGreaterThan(0);
    expect(governor.stats.decisionsMade).toBeGreaterThan(10);
  });

  it("governor plants and waters trees in first 1000 ticks", () => {
    const profile: GovernorProfile = {
      ...DEFAULT_PROFILE,
      plantWeight: 0.8,
      waterWeight: 0.7,
      harvestWeight: 0.5,
      decisionInterval: 5,
    };

    runPlaythrough(1000, profile);
    const stats = kootaStats();

    expect(stats.treesPlanted).toBeGreaterThan(0);
    expect(stats.treesWatered).toBeGreaterThan(0);
  });

  it("governor plants preferred species", () => {
    useGameStore.getState().addSeed("elder-pine", 30);
    gameActions().addSeed("elder-pine", 30);

    const profile: GovernorProfile = {
      ...DEFAULT_PROFILE,
      plantWeight: 1.0,
      waterWeight: 0.0,
      harvestWeight: 0.0,
      exploreWeight: 0.0,
      pruneWeight: 0.0,
      tradeWeight: 0.0,
      preferredSpecies: ["elder-pine"],
      decisionInterval: 3,
    };

    runPlaythrough(500, profile);
    const stats = kootaStats();

    expect(stats.treesPlanted).toBeGreaterThan(0);
    expect(stats.speciesPlanted).toContain("elder-pine");
  });

  it("governor harvests mature trees and gains resources", () => {
    for (let i = 0; i < 4; i++) {
      const kTree = spawnTree(i, 0, "white-oak");
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
        return gc?.gridX === i && gc?.gridZ === 0;
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
    }

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
      decisionInterval: 3,
    };

    runPlaythrough(200, profile);
    const stats = kootaStats();

    expect(stats.treesHarvested).toBeGreaterThan(0);
    expect(stats.resources.timber).toBeGreaterThan(0);
  });

  it("maintains game invariants over extended play", () => {
    runPlaythrough(6000);
    const stats = kootaStats();

    expect(stats.resources.timber).toBeGreaterThanOrEqual(0);
    expect(stats.resources.sap).toBeGreaterThanOrEqual(0);
    expect(stats.resources.fruit).toBeGreaterThanOrEqual(0);
    expect(stats.resources.acorns).toBeGreaterThanOrEqual(0);

    expect(stats.stamina).toBeGreaterThanOrEqual(0);
    expect(stats.stamina).toBeLessThanOrEqual(stats.maxStamina);

    expect(stats.xp).toBeGreaterThanOrEqual(0);

    expect(stats.level).toBeGreaterThanOrEqual(1);

    expect(stats.treesPlanted).toBeGreaterThanOrEqual(0);
  });

  it("stamina never goes below zero during play", () => {
    const loop = new HeadlessGameLoop({ ticksPerSecond: 30 });
    const governor = new GovernorAgent(
      {
        ...DEFAULT_PROFILE,
        decisionInterval: 3,
      },
      8,
    );

    for (let i = 0; i < 3000; i++) {
      governor.update();
      loop.tick();
      const stamina = useGameStore.getState().stamina;
      expect(stamina).toBeGreaterThanOrEqual(0);
    }
  });

  it("no duplicate entity IDs in the world", () => {
    runPlaythrough(2000);

    const ids = new Set<number>();
    for (const entity of koota.query()) {
      const id = entity.id();
      expect(ids.has(id)).toBe(false);
      ids.add(id);
    }
  });

  it("governor handles empty grid gracefully", () => {
    useGameStore.setState({ seeds: {} });
    koota.set(Seeds, {});

    const { governor } = runPlaythrough(1000);

    expect(governor.stats.decisionsMade).toBeGreaterThan(0);
    expect(kootaStats().treesPlanted).toBe(0);
  });

  it("governor handles full grid gracefully", () => {
    for (let x = 0; x < 8; x++) {
      for (let z = 0; z < 8; z++) {
        const kTree = spawnTree(x, z, "white-oak");
        const kCell = koota.query(GridCell).find((c) => {
          const gc = c.get(GridCell);
          return gc?.gridX === x && gc?.gridZ === z;
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
      }
    }

    expect(() => runPlaythrough(500)).not.toThrow();
  });

  it("survives a long playthrough with weather enabled", () => {
    runPlaythrough(3000, DEFAULT_PROFILE, 8, {
      weatherEnabled: true,
    });
    const stats = kootaStats();

    expect(stats.resources.timber).toBeGreaterThanOrEqual(0);
    expect(stats.stamina).toBeGreaterThanOrEqual(0);
    expect(stats.xp).toBeGreaterThanOrEqual(0);
  });

  it("completes 3000 ticks in under 5 seconds", () => {
    const start = performance.now();
    runPlaythrough(3000);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(5000);
  });

  it("governor trades resources to unlock new resource types", () => {
    useGameStore.setState({
      resources: { timber: 50, sap: 0, fruit: 0, acorns: 0 },
    });
    koota.set(Resources, { timber: 50, sap: 0, fruit: 0, acorns: 0 });

    const profile: GovernorProfile = {
      ...DEFAULT_PROFILE,
      plantWeight: 0.0,
      waterWeight: 0.0,
      harvestWeight: 0.0,
      exploreWeight: 0.0,
      pruneWeight: 0.0,
      tradeWeight: 1.0,
      decisionInterval: 3,
    };

    const { governor } = runPlaythrough(300, profile);
    const stats = kootaStats();

    expect(governor.stats.tradesExecuted).toBeGreaterThan(0);
    expect(stats.resources.sap).toBeGreaterThan(0);
  });

  it("governor produces diverse resources with valid species", () => {
    useGameStore.getState().addSeed("silver-birch", 20);
    useGameStore.getState().addSeed("golden-apple", 20);
    gameActions().addSeed("silver-birch", 20);
    gameActions().addSeed("golden-apple", 20);

    for (let i = 0; i < 3; i++) {
      const kTree = spawnTree(i, 7, "silver-birch");
      const td = kTree.get(Tree);
      if (td) kTree.set(Tree, { ...td, stage: 3 });
      kTree.add(
        Harvestable({
          resources: [
            { type: "sap", amount: 2 },
            { type: "timber", amount: 1 },
          ],
          cooldownElapsed: 0,
          cooldownTotal: 50,
          ready: true,
        }),
      );
      const kCell = koota.query(GridCell).find((c) => {
        const gc = c.get(GridCell);
        return gc?.gridX === i && gc?.gridZ === 7;
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
    }
    for (let i = 3; i < 6; i++) {
      const kTree = spawnTree(i, 7, "golden-apple");
      const td = kTree.get(Tree);
      if (td) kTree.set(Tree, { ...td, stage: 3 });
      kTree.add(
        Harvestable({
          resources: [{ type: "fruit", amount: 2 }],
          cooldownElapsed: 0,
          cooldownTotal: 75,
          ready: true,
        }),
      );
      const kCell = koota.query(GridCell).find((c) => {
        const gc = c.get(GridCell);
        return gc?.gridX === i && gc?.gridZ === 7;
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
    }

    useGameStore.setState({
      unlockedTools: ["trowel", "watering-can", "axe", "pruning-shears"],
    });
    const pp = koota.get(PlayerProgress);
    if (pp)
      koota.set(PlayerProgress, {
        ...pp,
        unlockedTools: ["trowel", "watering-can", "axe", "pruning-shears"],
      });

    const profile: GovernorProfile = {
      ...DEFAULT_PROFILE,
      plantWeight: 0.0,
      waterWeight: 0.0,
      harvestWeight: 1.0,
      exploreWeight: 0.0,
      pruneWeight: 0.0,
      tradeWeight: 0.0,
      decisionInterval: 3,
    };

    runPlaythrough(300, profile);
    const stats = kootaStats();

    expect(stats.resources.sap).toBeGreaterThan(0);
    expect(stats.resources.fruit).toBeGreaterThan(0);
  });

  it("time scale advances seasons faster", () => {
    const loop = new HeadlessGameLoop({
      ticksPerSecond: 30,
      timeScale: 1000,
    });
    const governor = new GovernorAgent(DEFAULT_PROFILE, 8);

    for (let i = 0; i < 3000; i++) {
      governor.update();
      loop.tick();
    }

    const gameTime = loop.gameTime;
    expect(gameTime).not.toBeNull();
    expect(gameTime!.microseconds).toBeGreaterThan(0);
  });
});
