/**
 * PlayerActor tests — verify the Beekeeper GLTF wiring without
 * actually loading the asset.
 *
 * We mock `@jolly-pixel/engine`'s `ModelRenderer` so the test never
 * hits the real `THREE.GLTFLoader` or `Systems.Assets` pipeline.
 * `ActorComponent` is mocked to a thin stub that records the typeName
 * and exposes the actor reference for the constructor pattern.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

interface MockActor {
  object3D: {
    position: { x: number; y: number; z: number; set: (x: number, y: number, z: number) => void };
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
  // The renderer instance returned from addComponentAndGet — typed
  // loosely so the test can assert against the constructor args.
  const rendererInstance = { mock: true } as const;
  return {
    object3D: { position: pos },
    addComponentAndGet: vi.fn((Ctor: unknown, opts: unknown) => {
      // Mirror the engine's actual behavior: instantiate the
      // component with (actor, opts) so we can assert on the args.
      // ModelRendererMock is a vi.fn(), so calling `new` registers
      // the call on the mock.
      // biome-ignore lint/suspicious/noExplicitAny: test stub
      new (Ctor as any)(undefined, opts);
      return rendererInstance;
    }),
  };
}

describe("PlayerActor", () => {
  beforeEach(() => {
    ModelRendererMock.mockClear();
  });

  it("places the actor root at the spawn position", async () => {
    const { PlayerActor } = await import("./PlayerActor");
    const actor = createMockActor();
    // biome-ignore lint/suspicious/noExplicitAny: mock-actor cast
    new PlayerActor(actor as any, { spawn: { x: 4, y: 2, z: -7 } });
    expect(actor.object3D.position.x).toBe(4);
    expect(actor.object3D.position.y).toBe(2);
    expect(actor.object3D.position.z).toBe(-7);
  });

  it("requests the gardener gltf via ModelRenderer with the idle clip as default", async () => {
    const { PlayerActor, PLAYER_IDLE_CLIP } = await import("./PlayerActor");
    const actor = createMockActor();
    // biome-ignore lint/suspicious/noExplicitAny: mock-actor cast
    new PlayerActor(actor as any, { spawn: { x: 0, y: 0, z: 0 } });

    expect(actor.addComponentAndGet).toHaveBeenCalledTimes(1);
    expect(ModelRendererMock).toHaveBeenCalledTimes(1);

    // The engine ModelRenderer is invoked as `new ModelRenderer(actor, options)`.
    // Args[1] holds the options bag.
    const callArgs = ModelRendererMock.mock.calls[0];
    const opts = callArgs[1] as { path: string; animations?: { default?: string } };

    expect(opts.path).toMatch(/\/assets\/models\/characters\/gardener\/gardener\.gltf$/);
    expect(opts.animations?.default).toBe(PLAYER_IDLE_CLIP);
    expect(PLAYER_IDLE_CLIP).toBe("Idle 01");
  });

  it("exposes the actor's world-space position via the position getter", async () => {
    const { PlayerActor } = await import("./PlayerActor");
    const actor = createMockActor();
    // biome-ignore lint/suspicious/noExplicitAny: mock-actor cast
    const player = new PlayerActor(actor as any, { spawn: { x: 1, y: 5, z: -3 } });
    expect(player.position).toEqual({ x: 1, y: 5, z: -3 });

    // Mutating the underlying actor object3D position should be
    // reflected through the getter — that's the contract
    // CameraFollowBehavior depends on.
    actor.object3D.position.set(10, 0, 10);
    expect(player.position).toEqual({ x: 10, y: 0, z: 10 });
  });

  it("disables its own per-frame update (ModelRenderer owns animation tick)", async () => {
    const { PlayerActor } = await import("./PlayerActor");
    const actor = createMockActor();
    // biome-ignore lint/suspicious/noExplicitAny: mock-actor cast
    const player = new PlayerActor(actor as any, { spawn: { x: 0, y: 0, z: 0 } });
    player.awake();
    // biome-ignore lint/suspicious/noExplicitAny: needUpdate lives on the mocked ActorComponent base
    expect((player as any).needUpdate).toBe(false);
  });
});
