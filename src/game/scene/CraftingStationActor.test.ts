/**
 * CraftingStationActor tests — verify the actor instantiates with the
 * given station id, positions itself at the spawn point, and gates
 * proximity correctly.
 *
 * Mocks `@jolly-pixel/engine`'s `ActorComponent` the same way
 * `PlayerActor.test.ts` does so we never load THREE / GLB / Rapier in
 * the test environment.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

interface MockActor {
  object3D: {
    position: {
      x: number;
      y: number;
      z: number;
      set: (x: number, y: number, z: number) => void;
    };
    add: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };
  addComponent: ReturnType<typeof vi.fn>;
}

vi.mock("@jolly-pixel/engine", () => ({
  ActorComponent: class {
    public actor: MockActor;
    public typeName: string;
    public needUpdate = true;
    constructor(opts: { actor: MockActor; typeName: string }) {
      this.actor = opts.actor;
      this.typeName = opts.typeName;
    }
  },
  ModelRenderer: class {},
}));

function createMockActor(): MockActor {
  const pos = {
    x: 0,
    y: 0,
    z: 0,
    set(x: number, y: number, z: number) {
      this.x = x;
      this.y = y;
      this.z = z;
    },
  };
  return {
    object3D: {
      position: pos,
      add: vi.fn(),
      remove: vi.fn(),
    },
    addComponent: vi.fn(),
  };
}

describe("CraftingStationActor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("places the actor root at the spawn position", async () => {
    const { CraftingStationActor } = await import("./CraftingStationActor");
    const actor = createMockActor();
    // biome-ignore lint/suspicious/noExplicitAny: stub
    new CraftingStationActor(actor as any, {
      stationId: "primitive-workbench",
      position: { x: 4, y: 6, z: 7 },
    });
    expect(actor.object3D.position.x).toBe(4);
    expect(actor.object3D.position.y).toBe(6);
    expect(actor.object3D.position.z).toBe(7);
  });

  it("exposes the stationId verbatim", async () => {
    const { CraftingStationActor } = await import("./CraftingStationActor");
    const actor = createMockActor();
    const station = new CraftingStationActor(
      // biome-ignore lint/suspicious/noExplicitAny: stub
      actor as any,
      {
        stationId: "primitive-workbench",
        position: { x: 0, y: 0, z: 0 },
      },
    );
    expect(station.stationId).toBe("primitive-workbench");
  });

  it("isPlayerNear is true within the proximity radius", async () => {
    const { CraftingStationActor } = await import("./CraftingStationActor");
    const actor = createMockActor();
    const station = new CraftingStationActor(
      // biome-ignore lint/suspicious/noExplicitAny: stub
      actor as any,
      {
        stationId: "primitive-workbench",
        position: { x: 8, y: 0, z: 8 },
        proximityRadius: 2,
      },
    );
    expect(station.isPlayerNear({ x: 8, z: 8 })).toBe(true);
    expect(station.isPlayerNear({ x: 9, z: 9 })).toBe(true); // ~1.41 < 2
  });

  it("isPlayerNear is false outside the proximity radius", async () => {
    const { CraftingStationActor } = await import("./CraftingStationActor");
    const actor = createMockActor();
    const station = new CraftingStationActor(
      // biome-ignore lint/suspicious/noExplicitAny: stub
      actor as any,
      {
        stationId: "primitive-workbench",
        position: { x: 8, y: 0, z: 8 },
        proximityRadius: 2,
      },
    );
    expect(station.isPlayerNear({ x: 12, z: 12 })).toBe(false);
  });

  it("uses the default proximity radius when none is provided", async () => {
    const { CraftingStationActor } = await import("./CraftingStationActor");
    const actor = createMockActor();
    const station = new CraftingStationActor(
      // biome-ignore lint/suspicious/noExplicitAny: stub
      actor as any,
      {
        stationId: "primitive-workbench",
        position: { x: 0, y: 0, z: 0 },
      },
    );
    // default = 2 voxels.
    expect(station.isPlayerNear({ x: 1, z: 1 })).toBe(true);
    expect(station.isPlayerNear({ x: 5, z: 0 })).toBe(false);
  });

  it("ignores Y when checking proximity (player can stand on the bench)", async () => {
    const { CraftingStationActor } = await import("./CraftingStationActor");
    const actor = createMockActor();
    const station = new CraftingStationActor(
      // biome-ignore lint/suspicious/noExplicitAny: stub
      actor as any,
      {
        stationId: "primitive-workbench",
        position: { x: 0, y: 100, z: 0 },
        proximityRadius: 2,
      },
    );
    expect(station.isPlayerNear({ x: 1, z: 1 })).toBe(true);
  });
});
