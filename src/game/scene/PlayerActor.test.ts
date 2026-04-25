/**
 * PlayerActor tests — verify the Beekeeper GLTF wiring + Wave 11b
 * input/movement/animation behaviour without loading the asset or
 * touching THREE/Rapier.
 *
 * We mock `@jolly-pixel/engine`'s `ModelRenderer` so the test never
 * hits the real `THREE.GLTFLoader` or `Systems.Assets` pipeline. The
 * mocked renderer exposes a stub `animation.play(...)` so the
 * idle/walk swap is observable.
 *
 * `ActorComponent` is mocked to a thin stub that records the typeName
 * and exposes the actor reference for the constructor pattern.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InputManager } from "@/input";

interface MockActor {
  object3D: {
    position: {
      x: number;
      y: number;
      z: number;
      set: (x: number, y: number, z: number) => void;
    };
    rotation: { x: number; y: number; z: number };
  };
  addComponentAndGet: ReturnType<typeof vi.fn>;
}

const ModelRendererMock = vi.fn();

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
  ModelRenderer: ModelRendererMock,
}));

interface MockRenderer {
  mock: true;
  animation: { play: ReturnType<typeof vi.fn> };
}

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
    object3D: { position: pos, rotation: { x: 0, y: 0, z: 0 } },
    addComponentAndGet: vi.fn(() => createMockRenderer()),
  };
}

function createMockRenderer(): MockRenderer {
  return {
    mock: true,
    animation: { play: vi.fn() },
  };
}

/** Stub InputManager that returns a fixed move vector each frame. */
function fakeInputManager(move: { x: number; z: number }): InputManager {
  return {
    getActionState: vi.fn(() => move),
    setJoystickVector: vi.fn(),
    endFrame: vi.fn(),
    // biome-ignore lint/suspicious/noExplicitAny: stub
  } as any;
}

describe("PlayerActor", () => {
  beforeEach(() => {
    ModelRendererMock.mockClear();
  });

  it("places the actor root at the spawn position", async () => {
    const { PlayerActor } = await import("./PlayerActor");
    const actor = createMockActor();
    // biome-ignore lint/suspicious/noExplicitAny: cast
    new PlayerActor(actor as any, { spawn: { x: 4, y: 2, z: -7 } });
    expect(actor.object3D.position.x).toBe(4);
    expect(actor.object3D.position.y).toBe(2);
    expect(actor.object3D.position.z).toBe(-7);
  });

  it("requests the gardener gltf via ModelRenderer with the idle clip as default", async () => {
    const { PlayerActor, PLAYER_IDLE_CLIP } = await import("./PlayerActor");
    const actor = createMockActor();
    // biome-ignore lint/suspicious/noExplicitAny: cast
    new PlayerActor(actor as any, { spawn: { x: 0, y: 0, z: 0 } });

    expect(actor.addComponentAndGet).toHaveBeenCalledTimes(1);
    const factoryCall = actor.addComponentAndGet.mock.calls[0];
    const opts = factoryCall[1] as {
      path: string;
      animations?: { default?: string };
    };
    expect(opts.path).toMatch(
      /\/assets\/models\/characters\/gardener\/gardener\.gltf$/,
    );
    expect(opts.animations?.default).toBe(PLAYER_IDLE_CLIP);
    expect(PLAYER_IDLE_CLIP).toBe("Idle 01");
  });

  it("exposes the actor's world-space position via the position getter", async () => {
    const { PlayerActor } = await import("./PlayerActor");
    const actor = createMockActor();
    // biome-ignore lint/suspicious/noExplicitAny: cast
    const player = new PlayerActor(actor as any, {
      spawn: { x: 1, y: 5, z: -3 },
    });
    expect(player.position).toEqual({ x: 1, y: 5, z: -3 });
    actor.object3D.position.set(10, 0, 10);
    expect(player.position).toEqual({ x: 10, y: 0, z: 10 });
  });

  it("disables its own per-frame update when no input manager is wired", async () => {
    const { PlayerActor } = await import("./PlayerActor");
    const actor = createMockActor();
    // biome-ignore lint/suspicious/noExplicitAny: cast
    const player = new PlayerActor(actor as any, {
      spawn: { x: 0, y: 0, z: 0 },
    });
    player.awake();
    // biome-ignore lint/suspicious/noExplicitAny: needUpdate lives on mocked base
    expect((player as any).needUpdate).toBe(false);
  });

  it("enables per-frame update when an input manager is wired", async () => {
    const { PlayerActor } = await import("./PlayerActor");
    const actor = createMockActor();
    const player = new PlayerActor(
      // biome-ignore lint/suspicious/noExplicitAny: cast
      actor as any,
      {
        spawn: { x: 0, y: 0, z: 0 },
        inputManager: fakeInputManager({ x: 0, z: 0 }),
      },
    );
    player.awake();
    // biome-ignore lint/suspicious/noExplicitAny: needUpdate lives on mocked base
    expect((player as any).needUpdate).toBe(true);
  });

  describe("movement + animation swap", () => {
    it("integrates non-zero move into position over delta time", async () => {
      const { PlayerActor, PLAYER_MOVE_SPEED } = await import("./PlayerActor");
      const actor = createMockActor();
      const input = fakeInputManager({ x: 1, z: 0 });
      const player = new PlayerActor(
        // biome-ignore lint/suspicious/noExplicitAny: cast
        actor as any,
        { spawn: { x: 0, y: 0, z: 0 }, inputManager: input },
      );
      player.awake();
      player.update(1000); // dt clamps at 50ms
      expect(actor.object3D.position.x).toBeCloseTo(
        PLAYER_MOVE_SPEED * 0.05,
        5,
      );
      expect(actor.object3D.position.z).toBe(0);
    });

    it("plays Walk 01 on the renderer when move vector is non-zero", async () => {
      const { PlayerActor, PLAYER_WALK_CLIP } = await import("./PlayerActor");
      const actor = createMockActor();
      let captured: MockRenderer | null = null;
      actor.addComponentAndGet.mockImplementation(() => {
        captured = createMockRenderer();
        return captured;
      });
      const player = new PlayerActor(
        // biome-ignore lint/suspicious/noExplicitAny: cast
        actor as any,
        {
          spawn: { x: 0, y: 0, z: 0 },
          inputManager: fakeInputManager({ x: 0, z: -1 }),
        },
      );
      player.awake();
      player.update(16);
      expect(player.clip).toBe(PLAYER_WALK_CLIP);
      const playMock = (captured as unknown as MockRenderer).animation.play;
      expect(playMock).toHaveBeenCalledWith(
        PLAYER_WALK_CLIP,
        expect.objectContaining({ loop: true }),
      );
    });

    it("returns to Idle 01 when the move vector drops to zero", async () => {
      const { PlayerActor, PLAYER_IDLE_CLIP, PLAYER_WALK_CLIP } = await import(
        "./PlayerActor"
      );
      const actor = createMockActor();
      const move = { x: 1, z: 0 };
      const input = {
        getActionState: vi.fn(() => move),
        setJoystickVector: vi.fn(),
        endFrame: vi.fn(),
        // biome-ignore lint/suspicious/noExplicitAny: stub
      } as any;
      const player = new PlayerActor(
        // biome-ignore lint/suspicious/noExplicitAny: cast
        actor as any,
        { spawn: { x: 0, y: 0, z: 0 }, inputManager: input },
      );
      player.awake();
      player.update(16);
      expect(player.clip).toBe(PLAYER_WALK_CLIP);
      move.x = 0;
      move.z = 0;
      player.update(16);
      expect(player.clip).toBe(PLAYER_IDLE_CLIP);
    });

    it("clamps position inside the supplied bounds", async () => {
      const { PlayerActor, PLAYER_MOVE_SPEED } = await import("./PlayerActor");
      const actor = createMockActor();
      const input = fakeInputManager({ x: 1, z: 0 });
      const player = new PlayerActor(
        // biome-ignore lint/suspicious/noExplicitAny: cast
        actor as any,
        {
          spawn: { x: 0, y: 6, z: 0 },
          inputManager: input,
          bounds: { minX: -1, maxX: 1, minZ: -1, maxZ: 1, groundY: 6 },
        },
      );
      player.awake();
      for (let i = 0; i < 100; i++) player.update(50);
      expect(actor.object3D.position.x).toBeLessThanOrEqual(1);
      expect(actor.object3D.position.y).toBe(6);
      expect(PLAYER_MOVE_SPEED).toBeGreaterThan(0);
    });

    it("rotates the model toward the move direction", async () => {
      const { PlayerActor } = await import("./PlayerActor");
      const actor = createMockActor();
      const player = new PlayerActor(
        // biome-ignore lint/suspicious/noExplicitAny: cast
        actor as any,
        {
          spawn: { x: 0, y: 0, z: 0 },
          inputManager: fakeInputManager({ x: 1, z: 0 }),
        },
      );
      player.awake();
      player.update(16);
      expect(actor.object3D.rotation.y).toBeGreaterThan(0);
      for (let i = 0; i < 50; i++) player.update(16);
      expect(actor.object3D.rotation.y).toBeCloseTo(Math.PI / 2, 2);
    });

    it("calls input.endFrame() once per update for rising-edge bookkeeping", async () => {
      const { PlayerActor } = await import("./PlayerActor");
      const actor = createMockActor();
      const endFrame = vi.fn();
      const input = {
        getActionState: vi.fn(() => ({ x: 0, z: 0 })),
        setJoystickVector: vi.fn(),
        endFrame,
        // biome-ignore lint/suspicious/noExplicitAny: stub
      } as any;
      const player = new PlayerActor(
        // biome-ignore lint/suspicious/noExplicitAny: cast
        actor as any,
        { spawn: { x: 0, y: 0, z: 0 }, inputManager: input },
      );
      player.awake();
      player.update(16);
      player.update(16);
      expect(endFrame).toHaveBeenCalledTimes(2);
    });
  });
});
