import { beforeEach, describe, expect, it } from "vitest";
import { world } from "../ecs/world";
import { useGameStore } from "../stores/gameStore";
import { PlayerGovernor } from "./PlayerGovernor";

// Helper to reset world + store
function resetWorld() {
  for (const entity of [...world.entities]) {
    world.remove(entity);
  }
  useGameStore.setState(useGameStore.getInitialState());
}

function createPlayer(x = 5, z = 5) {
  world.add({
    id: "player-1",
    player: {
      coins: 100,
      xp: 0,
      level: 1,
      currentTool: "trowel",
      unlockedTools: ["trowel", "watering-can", "axe", "pruning-shears"],
      unlockedSpecies: ["white-oak"],
    },
    position: { x, y: 0, z },
    farmerState: {
      stamina: 100,
      maxStamina: 100,
    },
  });
}

describe("PlayerGovernor", () => {
  beforeEach(resetWorld);

  it("can be created with default profile", () => {
    const gov = new PlayerGovernor();
    expect(gov).toBeDefined();
    expect(gov.enabled).toBe(false);
  });

  it("does nothing when disabled", () => {
    const movementRef = { current: { x: 0, z: 0 } };
    const gov = new PlayerGovernor();
    gov.init({
      movementRef,
      getWorldBounds: () => ({ minX: 0, minZ: 0, maxX: 12, maxZ: 12 }),
    });

    gov.update(0.016);
    expect(movementRef.current).toEqual({ x: 0, z: 0 });
    expect(gov.stats.decisionsMade).toBe(0);
  });

  it("starts deciding when enabled", () => {
    createPlayer();
    const movementRef = { current: { x: 0, z: 0 } };
    const gov = new PlayerGovernor();
    gov.init({
      movementRef,
      getWorldBounds: () => ({ minX: 0, minZ: 0, maxX: 12, maxZ: 12 }),
    });

    gov.enabled = true;
    gov.update(0.016);
    // Should have made at least one decision
    expect(gov.stats.decisionsMade).toBeGreaterThanOrEqual(1);
  });

  it("resets state when disabled", () => {
    createPlayer();
    const movementRef = { current: { x: 0.5, z: 0.5 } };
    const gov = new PlayerGovernor();
    gov.init({
      movementRef,
      getWorldBounds: () => ({ minX: 0, minZ: 0, maxX: 12, maxZ: 12 }),
    });

    gov.enabled = true;
    gov.update(0.016);

    gov.enabled = false;
    expect(movementRef.current).toEqual({ x: 0, z: 0 });
  });

  it("tracks stats across multiple updates", () => {
    createPlayer();
    // Give seeds so the governor can try to plant
    useGameStore.setState({
      seeds: { "white-oak": 5 },
      stamina: 100,
    });

    // Add some grid cells so the governor finds plantable tiles
    for (let x = 0; x < 8; x++) {
      for (let z = 0; z < 8; z++) {
        world.add({
          id: `cell-${x}-${z}`,
          gridCell: {
            gridX: x,
            gridZ: z,
            type: "soil",
            occupied: false,
            treeEntityId: null,
          },
        });
      }
    }

    const movementRef = { current: { x: 0, z: 0 } };
    const gov = new PlayerGovernor();
    gov.init({
      movementRef,
      getWorldBounds: () => ({ minX: 0, minZ: 0, maxX: 8, maxZ: 8 }),
    });

    gov.enabled = true;

    // Run several update cycles
    for (let i = 0; i < 100; i++) {
      gov.update(0.016);
    }

    expect(gov.stats.decisionsMade).toBeGreaterThan(0);
  });
});
