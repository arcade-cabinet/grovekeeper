/**
 * CraftingStationProximityBehavior tests — UI Glue wave.
 *
 * Verifies the behavior translates "player nearby + open-craft pressed"
 * into a `CraftingPanelEvent` on the eventBus, and stays silent when
 * either condition is missing.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type MockActor = Record<string, unknown>;

vi.mock("@jolly-pixel/engine", () => ({
  ActorComponent: class {
    public actor: MockActor;
    public typeName: string;
    public needUpdate = false;
    constructor(opts: { actor: MockActor; typeName: string }) {
      this.actor = opts.actor;
      this.typeName = opts.typeName;
    }
  },
}));

const mockEmitCraftingPanel = vi.fn();
vi.mock("@/runtime/eventBus", () => ({
  eventBus: {
    emitCraftingPanel: (...args: unknown[]) => mockEmitCraftingPanel(...args),
    emitNpcSpeech: vi.fn(),
    npcSpeech: () => null,
    craftingPanel: () => null,
  },
}));

interface FakeStation {
  stationId: string;
  isPlayerNear(p: { x: number; z: number }): boolean;
}

function makeStation(id: string, near: boolean): FakeStation {
  return {
    stationId: id,
    isPlayerNear: () => near,
  };
}

describe("CraftingStationProximityBehavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("emits an open event when player is near and open-craft just-pressed", async () => {
    const { CraftingStationProximityBehavior } = await import(
      "./CraftingStationProximityBehavior"
    );
    const station = makeStation("primitive-workbench", true);
    const behavior = new CraftingStationProximityBehavior(
      // biome-ignore lint/suspicious/noExplicitAny: stub
      {} as any,
      {
        // biome-ignore lint/suspicious/noExplicitAny: fake station
        getStations: () => [station as any],
        getPlayerPosition: () => ({ x: 10, z: 8 }),
        input: {
          getActionState: () => ({ pressed: true, justPressed: true }),
        },
      },
    );
    behavior.update(16);
    expect(mockEmitCraftingPanel).toHaveBeenCalledTimes(1);
    expect(mockEmitCraftingPanel).toHaveBeenCalledWith({
      stationId: "primitive-workbench",
      open: true,
    });
  });

  it("does nothing when open-craft is not on its rising edge", async () => {
    const { CraftingStationProximityBehavior } = await import(
      "./CraftingStationProximityBehavior"
    );
    const station = makeStation("primitive-workbench", true);
    const behavior = new CraftingStationProximityBehavior(
      // biome-ignore lint/suspicious/noExplicitAny: stub
      {} as any,
      {
        // biome-ignore lint/suspicious/noExplicitAny: fake station
        getStations: () => [station as any],
        getPlayerPosition: () => ({ x: 10, z: 8 }),
        input: {
          getActionState: () => ({ pressed: true, justPressed: false }),
        },
      },
    );
    behavior.update(16);
    expect(mockEmitCraftingPanel).not.toHaveBeenCalled();
  });

  it("does nothing when no station is in range", async () => {
    const { CraftingStationProximityBehavior } = await import(
      "./CraftingStationProximityBehavior"
    );
    const farStation = makeStation("primitive-workbench", false);
    const behavior = new CraftingStationProximityBehavior(
      // biome-ignore lint/suspicious/noExplicitAny: stub
      {} as any,
      {
        // biome-ignore lint/suspicious/noExplicitAny: fake station
        getStations: () => [farStation as any],
        getPlayerPosition: () => ({ x: 100, z: 100 }),
        input: {
          getActionState: () => ({ pressed: true, justPressed: true }),
        },
      },
    );
    behavior.update(16);
    expect(mockEmitCraftingPanel).not.toHaveBeenCalled();
  });

  it("emits the first matching station and stops scanning", async () => {
    const { CraftingStationProximityBehavior } = await import(
      "./CraftingStationProximityBehavior"
    );
    const a = makeStation("a", true);
    const b = makeStation("b", true);
    const behavior = new CraftingStationProximityBehavior(
      // biome-ignore lint/suspicious/noExplicitAny: stub
      {} as any,
      {
        // biome-ignore lint/suspicious/noExplicitAny: fake stations
        getStations: () => [a as any, b as any],
        getPlayerPosition: () => ({ x: 0, z: 0 }),
        input: {
          getActionState: () => ({ pressed: true, justPressed: true }),
        },
      },
    );
    behavior.update(16);
    expect(mockEmitCraftingPanel).toHaveBeenCalledTimes(1);
    expect(mockEmitCraftingPanel).toHaveBeenCalledWith({
      stationId: "a",
      open: true,
    });
  });
});
