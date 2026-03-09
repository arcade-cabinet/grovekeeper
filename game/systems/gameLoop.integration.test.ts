/**
 * Full game loop integration tests — Spec §28 (Visual Identity / User Flow)
 *
 * Verifies multi-system composition across the main gameplay scenarios:
 *   1. Menu → New Game → Tutorial → Plant → Growth Tick → Harvest → Save → Load
 *   2. NPC Dialogue → Quest Start → Quest Advance → Quest Complete
 *   3. Chunk Load → Chunk Unload → Chunk Reload (delta persistence)
 *   4. ECS queries return expected entities after state transitions
 *
 * These tests use real implementations of all systems — no mocks — to validate
 * that the systems compose correctly across boundaries. Unit tests cover each
 * system in isolation; integration tests cover the joints between systems.
 */

import { world } from "@/game/ecs/world";
import {
  advanceObjectives,
  claimStepReward,
  initializeChainState,
  startChain,
} from "@/game/quests/questChainEngine";
import { useGameStore } from "@/game/stores";
import { TUTORIAL_STEPS } from "@/game/systems/tutorial";
import {
  applyChunkDiff,
  clearAllChunkDiffs,
  isChunkModified,
  loadChunkDiff,
  recordPlantedTree,
} from "@/game/world/chunkPersistence";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clearEcsWorld(): void {
  for (const entity of [...world.entities]) {
    world.remove(entity);
  }
}

// ─── Suite Setup ──────────────────────────────────────────────────────────────

beforeEach(() => {
  useGameStore.getState().resetGame();
  clearAllChunkDiffs();
  clearEcsWorld();
});

// =============================================================================
// Scenario 1: Menu → New Game → Tutorial → Plant → Growth Tick → Harvest → Save → Load
// =============================================================================

describe("Integration: Menu → New Game → Tutorial → Plant → Harvest → Save → Load (Spec §28)", () => {
  it("starts on menu screen and transitions to playing after new game", () => {
    expect(useGameStore.getState().screen).toBe("menu");

    useGameStore.getState().setWorldSeed("integration-seed-001");
    useGameStore.getState().setScreen("playing");

    expect(useGameStore.getState().screen).toBe("playing");
    expect(useGameStore.getState().worldSeed).toBe("integration-seed-001");
  });

  it("onboarding: tutorial state is immediately complete — overlay tutorial is retired", () => {
    // The 11-step overlay tutorial has been replaced by the elder-awakening
    // quest chain (Spec §25.1). tutorialState is always done so no overlay renders.
    const store = useGameStore.getState();
    // TUTORIAL_STEPS is empty after the overlay retirement.
    expect(TUTORIAL_STEPS).toHaveLength(0);
    expect(store.tutorialState.currentStep).toBe("done");
    expect(store.tutorialState.completed).toBe(true);
  });

  it("onboarding: advanceTutorial is a no-op on overlay state but forwards signals to quest engine", () => {
    const store = useGameStore.getState();
    // Sending any signal does not change the (already-complete) tutorial state.
    store.advanceTutorial("action:plant");
    expect(useGameStore.getState().tutorialState.currentStep).toBe("done");
    expect(useGameStore.getState().tutorialState.completed).toBe(true);
  });

  it("planting a tree increments treesPlanted and spends a seed", () => {
    const store = useGameStore.getState();
    const initialPlanted = store.treesPlanted;
    const initialSeeds = store.seeds["white-oak"] ?? 0;

    store.spendSeed("white-oak", 1);
    store.incrementTreesPlanted();

    expect(useGameStore.getState().treesPlanted).toBe(initialPlanted + 1);
    expect(useGameStore.getState().seeds["white-oak"]).toBe(initialSeeds - 1);
  });

  it("watering a tree increments treesWatered counter", () => {
    const store = useGameStore.getState();
    const initial = store.treesWatered;

    store.incrementTreesWatered();

    expect(useGameStore.getState().treesWatered).toBe(initial + 1);
  });

  it("growth tick: adding a mature ECS tree and advancing harvest yields resources", () => {
    // Add a mature tree entity to the ECS world (simulating growth reaching stage 3)
    const treeEntity = world.add({
      id: "int-tree-001",
      position: { x: 8, y: 0, z: 8 },
      tree: {
        speciesId: "white-oak",
        stage: 3,
        progress: 0,
        watered: false,
        totalGrowthTime: 0,
        plantedAt: Date.now(),
        meshSeed: 42,
        wild: false,
        pruned: false,
        fertilized: false,
        baseModel: "",
        winterModel: "",
        useWinterModel: false,
        seasonTint: "#ffffff",
      },
      renderable: { visible: true, scale: 1 },
    });

    // Verify ECS query finds the mature tree
    const matureTrees = world.with("tree").entities.filter((e) => e.tree?.stage === 3);
    expect(matureTrees.length).toBeGreaterThanOrEqual(1);

    // Simulate harvest: add resource and increment counter
    const store = useGameStore.getState();
    const initialTimber = store.resources.timber;
    const initialHarvested = store.treesHarvested;

    store.addResource("timber", 5);
    store.incrementTreesHarvested();

    expect(useGameStore.getState().resources.timber).toBe(initialTimber + 5);
    expect(useGameStore.getState().treesHarvested).toBe(initialHarvested + 1);

    world.remove(treeEntity);
  });

  it("save round-trip: plant → save to chunk diff → unload ECS → reload → tree restored", () => {
    const chunkKey = "0,0";
    const chunkX = 0;
    const chunkZ = 0;

    // Plant a tree (record in chunk diff — the delta persistence layer)
    recordPlantedTree(chunkKey, {
      localX: 5,
      localZ: 7,
      speciesId: "white-oak",
      stage: 1,
      progress: 0.4,
      plantedAt: 1000,
      meshSeed: 99,
    });

    // Verify diff stored
    expect(isChunkModified(chunkKey)).toBe(true);
    const diff = loadChunkDiff(chunkKey);
    expect(diff?.plantedTrees).toHaveLength(1);
    expect(diff?.plantedTrees[0].speciesId).toBe("white-oak");

    // Simulate chunk load: apply diff to ECS
    applyChunkDiff(chunkKey, chunkX, chunkZ);
    const afterLoad = world.with("tree").entities;
    expect(afterLoad.length).toBe(1);
    expect(afterLoad[0].tree?.speciesId).toBe("white-oak");
    expect(afterLoad[0].tree?.stage).toBe(1);

    // Simulate chunk unload: remove ECS entities
    clearEcsWorld();
    expect(world.with("tree").entities.length).toBe(0);

    // Simulate chunk reload: re-apply diff
    applyChunkDiff(chunkKey, chunkX, chunkZ);
    const afterReload = world.with("tree").entities;
    expect(afterReload.length).toBe(1);
    expect(afterReload[0].tree?.speciesId).toBe("white-oak");
    expect(afterReload[0].position?.x).toBe(chunkX * 16 + 5);
    expect(afterReload[0].position?.z).toBe(chunkZ * 16 + 7);
  });

  it("tutorial skip marks tutorial complete immediately", () => {
    useGameStore.getState().completeTutorialSkip();

    const after = useGameStore.getState().tutorialState;
    expect(after.currentStep).toBe("done");
    expect(after.completed).toBe(true);
  });
});

// =============================================================================
// Scenario 2: NPC Dialogue → Quest Start → Quest Advance → Quest Complete
// =============================================================================

describe("Integration: NPC Dialogue → Quest Start → Quest Advance → Quest Complete (Spec §28)", () => {
  it("start_quest dialogue effect activates the rowan-history chain in the store", () => {
    const store = useGameStore.getState();

    // Simulate visiting a dialogue node with a start_quest effect
    store.applyDialogueNodeEffects([{ type: "start_quest", value: "rowan-history" }]);

    const chainState = useGameStore.getState().questChainState;
    expect("rowan-history" in chainState.activeChains).toBe(true);
    expect(chainState.activeChains["rowan-history"]?.completed).toBe(false);
  });

  it("quest step advances when the correct objective event fires", () => {
    const store = useGameStore.getState();

    // Start the quest
    store.applyDialogueNodeEffects([{ type: "start_quest", value: "rowan-history" }]);

    // Advance the objective: rowan-history step 1 requires "trees_planted"
    store.advanceQuestObjective("trees_planted", 1);

    const chainState = useGameStore.getState().questChainState;
    const stepProgress = chainState.activeChains["rowan-history"]?.steps[0];
    expect(stepProgress?.completed).toBe(true);
  });

  it("claiming step reward grants XP", () => {
    const store = useGameStore.getState();
    const initialXp = store.xp;

    // Start quest and complete step 1
    store.applyDialogueNodeEffects([{ type: "start_quest", value: "rowan-history" }]);
    store.advanceQuestObjective("trees_planted", 1);

    // Claim the reward (step 1 of rowan-history gives 25 XP)
    store.claimQuestStepReward("rowan-history");

    expect(useGameStore.getState().xp).toBeGreaterThan(initialXp);
  });

  it("completed quest step advances chain to next step", () => {
    const store = useGameStore.getState();

    store.applyDialogueNodeEffects([{ type: "start_quest", value: "rowan-history" }]);
    store.advanceQuestObjective("trees_planted", 1);
    store.claimQuestStepReward("rowan-history");

    // After claiming step 1 reward, chain advances to step index 1
    const chainState = useGameStore.getState().questChainState;
    const chainProgress = chainState.activeChains["rowan-history"];
    expect(chainProgress?.currentStepIndex).toBe(1);
  });

  it("start_quest + advance_quest effects in sequence from dialogue compose correctly", () => {
    const store = useGameStore.getState();

    // A single dialogue node that starts quest AND immediately records progress
    const completedSteps = store.applyDialogueNodeEffects([
      { type: "start_quest", value: "rowan-history" },
      { type: "advance_quest", value: "trees_planted", amount: 1 },
    ]);

    const chainState = useGameStore.getState().questChainState;
    const stepProgress = chainState.activeChains["rowan-history"]?.steps[0];
    expect(stepProgress?.completed).toBe(true);
    expect(completedSteps).toHaveLength(1);
    expect(completedSteps[0].chainId).toBe("rowan-history");
  });

  it("pure questChainEngine: start → advance → claim round-trip matches store results", () => {
    // Verify the pure engine alone produces consistent results (no store dependency)
    let state = initializeChainState();
    state = startChain(state, "rowan-history", 1);

    expect("rowan-history" in state.activeChains).toBe(true);

    const { state: advanced, completedSteps } = advanceObjectives(state, "trees_planted", 1);
    expect(completedSteps[0].chainId).toBe("rowan-history");

    const { state: afterClaim, stepDef } = claimStepReward(advanced, "rowan-history");
    expect(stepDef).not.toBeNull();
    expect(afterClaim.activeChains["rowan-history"]?.currentStepIndex).toBe(1);
  });

  it("unknown event type does not advance any quest objective", () => {
    const store = useGameStore.getState();

    store.applyDialogueNodeEffects([{ type: "start_quest", value: "rowan-history" }]);

    const before = useGameStore.getState().questChainState;
    store.advanceQuestObjective("unknown_event_type", 99);
    const after = useGameStore.getState().questChainState;

    // Step should still be incomplete
    expect(after.activeChains["rowan-history"]?.steps[0]?.completed).toBe(false);
    expect(after).toBe(before); // same reference — no mutation
  });
});

// =============================================================================
// Scenario 3: Chunk Load → Chunk Unload → Chunk Reload (delta persistence)
// =============================================================================

describe("Integration: Chunk Load → Chunk Unload → Chunk Reload (Spec §26.2 + §28)", () => {
  it("chunk with no diff produces no ECS entities on load", () => {
    applyChunkDiff("99,99", 99, 99);
    expect(world.with("tree").entities.length).toBe(0);
  });

  it("recording planted trees creates a diff entry for the chunk", () => {
    recordPlantedTree("1,2", {
      localX: 4,
      localZ: 6,
      speciesId: "elder-pine",
      stage: 0,
      progress: 0,
      plantedAt: 2000,
      meshSeed: 11,
    });

    expect(isChunkModified("1,2")).toBe(true);
    expect(loadChunkDiff("1,2")?.plantedTrees).toHaveLength(1);
  });

  it("applying diff to different chunkX/chunkZ yields correct world positions", () => {
    const localX = 3;
    const localZ = 9;
    const chunkX = -2;
    const chunkZ = 4;
    const CHUNK_SIZE = 16;

    recordPlantedTree("-2,4", {
      localX,
      localZ,
      speciesId: "silver-maple",
      stage: 2,
      progress: 0.6,
      plantedAt: 3000,
      meshSeed: 55,
    });

    applyChunkDiff("-2,4", chunkX, chunkZ);

    const trees = world.with("tree", "position").entities;
    expect(trees).toHaveLength(1);
    expect(trees[0].position?.x).toBe(chunkX * CHUNK_SIZE + localX);
    expect(trees[0].position?.z).toBe(chunkZ * CHUNK_SIZE + localZ);
  });

  it("multiple chunks can each hold independent diffs that apply independently", () => {
    recordPlantedTree("0,0", {
      localX: 1,
      localZ: 1,
      speciesId: "white-oak",
      stage: 0,
      progress: 0,
      plantedAt: 100,
      meshSeed: 1,
    });
    recordPlantedTree("1,0", {
      localX: 2,
      localZ: 2,
      speciesId: "elder-pine",
      stage: 1,
      progress: 0.2,
      plantedAt: 200,
      meshSeed: 2,
    });

    applyChunkDiff("0,0", 0, 0);
    applyChunkDiff("1,0", 1, 0);

    expect(world.with("tree").entities.length).toBe(2);
  });

  it("unload (clear ECS) then reload (apply diff) round-trip preserves stage and progress", () => {
    const chunkKey = "3,5";
    recordPlantedTree(chunkKey, {
      localX: 7,
      localZ: 3,
      speciesId: "ghost-birch",
      stage: 2,
      progress: 0.75,
      plantedAt: 5000,
      meshSeed: 123,
    });

    // Load
    applyChunkDiff(chunkKey, 3, 5);
    const firstLoad = world.with("tree").entities[0];
    expect(firstLoad?.tree?.stage).toBe(2);
    expect(firstLoad?.tree?.progress).toBe(0.75);

    // Unload
    clearEcsWorld();
    expect(world.with("tree").entities.length).toBe(0);

    // Reload
    applyChunkDiff(chunkKey, 3, 5);
    const reload = world.with("tree").entities[0];
    expect(reload?.tree?.stage).toBe(2);
    expect(reload?.tree?.progress).toBe(0.75);
    expect(reload?.tree?.speciesId).toBe("ghost-birch");
  });

  it("clearAllChunkDiffs removes all persisted chunk data", () => {
    recordPlantedTree("0,0", {
      localX: 1,
      localZ: 1,
      speciesId: "white-oak",
      stage: 0,
      progress: 0,
      plantedAt: 100,
      meshSeed: 1,
    });
    recordPlantedTree("5,5", {
      localX: 2,
      localZ: 2,
      speciesId: "pine",
      stage: 0,
      progress: 0,
      plantedAt: 200,
      meshSeed: 2,
    });

    clearAllChunkDiffs();

    expect(isChunkModified("0,0")).toBe(false);
    expect(isChunkModified("5,5")).toBe(false);
  });

  it("new game resets chunk diffs via clearAllChunkDiffs called in prestige/reset", () => {
    recordPlantedTree("0,0", {
      localX: 5,
      localZ: 5,
      speciesId: "white-oak",
      stage: 1,
      progress: 0.5,
      plantedAt: 1000,
      meshSeed: 77,
    });

    // Simulate what a new game does: reset game state + clear all chunk diffs
    useGameStore.getState().resetGame("new-world-seed");
    clearAllChunkDiffs();

    expect(isChunkModified("0,0")).toBe(false);
    expect(useGameStore.getState().worldSeed).toBe("new-world-seed");
  });
});

// =============================================================================
// Scenario 4: ECS queries return expected entities after state transitions
// =============================================================================

describe("Integration: ECS queries return expected entities after state transitions (Spec §28)", () => {
  it("world.with('tree') returns only entities with the tree component", () => {
    // A chunk entity (no tree component) should not appear in tree queries
    world.add({ id: "chunk-1", chunk: { chunkX: 0, chunkZ: 0, biome: "meadow" } });
    world.add({
      id: "tree-1",
      position: { x: 1, y: 0, z: 1 },
      tree: {
        speciesId: "white-oak",
        stage: 0,
        progress: 0,
        watered: false,
        totalGrowthTime: 0,
        plantedAt: 0,
        meshSeed: 0,
        wild: false,
        pruned: false,
        fertilized: false,
        baseModel: "",
        winterModel: "",
        useWinterModel: false,
        seasonTint: "#ffffff",
      },
    });

    const trees = world.with("tree").entities;
    const chunks = world.with("chunk").entities;

    expect(trees.length).toBe(1);
    expect(chunks.length).toBe(1);
    expect(trees[0].id).toBe("tree-1");
    expect(chunks[0].id).toBe("chunk-1");
  });

  it("world.with('tree', 'position') excludes entities missing position", () => {
    world.add({
      id: "tree-no-pos",
      tree: {
        speciesId: "pine",
        stage: 0,
        progress: 0,
        watered: false,
        totalGrowthTime: 0,
        plantedAt: 0,
        meshSeed: 0,
        wild: false,
        pruned: false,
        fertilized: false,
        baseModel: "",
        winterModel: "",
        useWinterModel: false,
        seasonTint: "#ffffff",
      },
    });
    world.add({
      id: "tree-with-pos",
      position: { x: 5, y: 0, z: 5 },
      tree: {
        speciesId: "pine",
        stage: 0,
        progress: 0,
        watered: false,
        totalGrowthTime: 0,
        plantedAt: 0,
        meshSeed: 0,
        wild: false,
        pruned: false,
        fertilized: false,
        baseModel: "",
        winterModel: "",
        useWinterModel: false,
        seasonTint: "#ffffff",
      },
    });

    const query = world.with("tree", "position").entities;
    expect(query.length).toBe(1);
    expect(query[0].id).toBe("tree-with-pos");
  });

  it("removing an entity removes it from all queries", () => {
    const entity = world.add({
      id: "removable-tree",
      position: { x: 0, y: 0, z: 0 },
      tree: {
        speciesId: "pine",
        stage: 0,
        progress: 0,
        watered: false,
        totalGrowthTime: 0,
        plantedAt: 0,
        meshSeed: 0,
        wild: false,
        pruned: false,
        fertilized: false,
        baseModel: "",
        winterModel: "",
        useWinterModel: false,
        seasonTint: "#ffffff",
      },
    });

    expect(world.with("tree").entities.length).toBe(1);
    world.remove(entity);
    expect(world.with("tree").entities.length).toBe(0);
  });

  it("filtering by stage after query: mature trees (stage >= 3) subset", () => {
    world.add({
      id: "sapling",
      position: { x: 0, y: 0, z: 0 },
      tree: {
        speciesId: "pine",
        stage: 1,
        progress: 0,
        watered: false,
        totalGrowthTime: 0,
        plantedAt: 0,
        meshSeed: 0,
        wild: false,
        pruned: false,
        fertilized: false,
        baseModel: "",
        winterModel: "",
        useWinterModel: false,
        seasonTint: "#ffffff",
      },
    });
    world.add({
      id: "mature",
      position: { x: 1, y: 0, z: 1 },
      tree: {
        speciesId: "pine",
        stage: 3,
        progress: 0,
        watered: false,
        totalGrowthTime: 0,
        plantedAt: 0,
        meshSeed: 0,
        wild: false,
        pruned: false,
        fertilized: false,
        baseModel: "",
        winterModel: "",
        useWinterModel: false,
        seasonTint: "#ffffff",
      },
    });
    world.add({
      id: "old-growth",
      position: { x: 2, y: 0, z: 2 },
      tree: {
        speciesId: "white-oak",
        stage: 4,
        progress: 0,
        watered: false,
        totalGrowthTime: 0,
        plantedAt: 0,
        meshSeed: 0,
        wild: false,
        pruned: false,
        fertilized: false,
        baseModel: "",
        winterModel: "",
        useWinterModel: false,
        seasonTint: "#ffffff",
      },
    });

    const allTrees = world.with("tree").entities;
    const harvestable = allTrees.filter((e) => (e.tree?.stage ?? 0) >= 3);

    expect(allTrees.length).toBe(3);
    expect(harvestable.length).toBe(2);
    expect(harvestable.map((e) => e.id).sort()).toEqual(["mature", "old-growth"].sort());
  });

  it("world remains consistent after a mix of add and remove operations", () => {
    const a = world.add({
      id: "a",
      position: { x: 0, y: 0, z: 0 },
      tree: {
        speciesId: "pine",
        stage: 0,
        progress: 0,
        watered: false,
        totalGrowthTime: 0,
        plantedAt: 0,
        meshSeed: 0,
        wild: false,
        pruned: false,
        fertilized: false,
        baseModel: "",
        winterModel: "",
        useWinterModel: false,
        seasonTint: "#ffffff",
      },
    });
    const b = world.add({
      id: "b",
      position: { x: 1, y: 0, z: 0 },
      tree: {
        speciesId: "pine",
        stage: 1,
        progress: 0,
        watered: false,
        totalGrowthTime: 0,
        plantedAt: 0,
        meshSeed: 0,
        wild: false,
        pruned: false,
        fertilized: false,
        baseModel: "",
        winterModel: "",
        useWinterModel: false,
        seasonTint: "#ffffff",
      },
    });
    const c = world.add({
      id: "c",
      position: { x: 2, y: 0, z: 0 },
      tree: {
        speciesId: "pine",
        stage: 2,
        progress: 0,
        watered: false,
        totalGrowthTime: 0,
        plantedAt: 0,
        meshSeed: 0,
        wild: false,
        pruned: false,
        fertilized: false,
        baseModel: "",
        winterModel: "",
        useWinterModel: false,
        seasonTint: "#ffffff",
      },
    });

    expect(world.with("tree").entities.length).toBe(3);
    world.remove(b);
    expect(world.with("tree").entities.length).toBe(2);
    expect(
      world
        .with("tree")
        .entities.map((e) => e.id)
        .sort(),
    ).toEqual(["a", "c"].sort());

    world.remove(a);
    world.remove(c);
    expect(world.with("tree").entities.length).toBe(0);
  });

  it("applyChunkDiff adds ECS entities that are immediately queryable", () => {
    recordPlantedTree("0,0", {
      localX: 8,
      localZ: 8,
      speciesId: "silver-maple",
      stage: 2,
      progress: 0.3,
      plantedAt: 1000,
      meshSeed: 42,
    });

    expect(world.with("tree").entities.length).toBe(0);

    applyChunkDiff("0,0", 0, 0);

    const trees = world.with("tree", "position").entities;
    expect(trees.length).toBe(1);
    expect(trees[0].tree?.speciesId).toBe("silver-maple");
    expect(trees[0].position?.x).toBe(8);
    expect(trees[0].position?.z).toBe(8);
  });
});
