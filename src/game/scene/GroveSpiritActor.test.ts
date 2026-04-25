/**
 * GroveSpiritActor tests — Wave 11b.
 *
 * Mocks `@jolly-pixel/engine` exactly the way `PlayerActor.test.ts`
 * does so the test never touches `THREE.GLTFLoader`. Verifies:
 *   - constructor places the actor at spawn,
 *   - ModelRenderer is requested with the Mermaid-Spirit GLB path
 *     and `Idle01` as the default clip,
 *   - the bob modulates Y in a sine pattern around `spawn.y` over time,
 *   - first `interact()` returns a `first-greet` phrase, second falls
 *     into `returning-greet`,
 *   - subsequent `interact()` calls never re-pick the same phrase id.
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
  return { mock: true, animation: { play: vi.fn() } };
}

describe("GroveSpiritActor", () => {
  beforeEach(() => {
    ModelRendererMock.mockClear();
  });

  it("places the actor at the spawn position", async () => {
    const { GroveSpiritActor } = await import("./GroveSpiritActor");
    const actor = createMockActor();
    new GroveSpiritActor(
      // biome-ignore lint/suspicious/noExplicitAny: cast for stub
      actor as any,
      { spawn: { x: 5, y: 6, z: -3 }, spiritId: "grove-A:spirit" },
    );
    expect(actor.object3D.position.x).toBe(5);
    expect(actor.object3D.position.y).toBe(6);
    expect(actor.object3D.position.z).toBe(-3);
  });

  it("requests the grove-spirit GLB with Idle01 as the default clip", async () => {
    const { GroveSpiritActor, SPIRIT_IDLE_CLIP } = await import(
      "./GroveSpiritActor"
    );
    const actor = createMockActor();
    new GroveSpiritActor(
      // biome-ignore lint/suspicious/noExplicitAny: cast for stub
      actor as any,
      { spawn: { x: 0, y: 0, z: 0 }, spiritId: "grove-A:spirit" },
    );
    expect(actor.addComponentAndGet).toHaveBeenCalledTimes(1);
    const opts = actor.addComponentAndGet.mock.calls[0][1];
    expect(opts.path).toMatch(/grove-spirit\.glb$/);
    expect(opts.animations.default).toBe(SPIRIT_IDLE_CLIP);
  });

  it("bobs the Y position around spawn.y over the configured period", async () => {
    const {
      GroveSpiritActor,
      SPIRIT_BOB_AMPLITUDE,
      SPIRIT_BOB_PERIOD_SECONDS,
    } = await import("./GroveSpiritActor");
    const actor = createMockActor();
    const spirit = new GroveSpiritActor(
      // biome-ignore lint/suspicious/noExplicitAny: cast for stub
      actor as any,
      { spawn: { x: 0, y: 10, z: 0 }, spiritId: "grove-A:spirit" },
    );
    spirit.awake();

    // Frame 0: y matches spawn.y exactly (sin(0) = 0).
    spirit.update(0);
    expect(actor.object3D.position.y).toBeCloseTo(10, 5);

    // Quarter period: peak displacement (+amplitude).
    const quarterMs = (SPIRIT_BOB_PERIOD_SECONDS * 1000) / 4;
    // Drive the actor in 50ms slices since update() clamps dt to 50ms.
    let elapsedMs = 0;
    while (elapsedMs < quarterMs) {
      const step = Math.min(50, quarterMs - elapsedMs);
      spirit.update(step);
      elapsedMs += step;
    }
    expect(actor.object3D.position.y).toBeCloseTo(10 + SPIRIT_BOB_AMPLITUDE, 2);
  });

  it("interact() returns a first-greet phrase on first call, returning-greet on next", async () => {
    const { GroveSpiritActor } = await import("./GroveSpiritActor");
    const actor = createMockActor();
    const spirit = new GroveSpiritActor(
      // biome-ignore lint/suspicious/noExplicitAny: cast for stub
      actor as any,
      { spawn: { x: 0, y: 0, z: 0 }, spiritId: "grove-A:spirit" },
    );

    const first = spirit.interact({}, () => 0);
    expect(first.tag).toBe("first-greet");

    // Second call: firstMeet flag has been consumed.
    const second = spirit.interact({}, () => 0);
    expect(second.tag).toBe("returning-greet");
    expect(spirit.firstMeetConsumed).toBe(true);
  });

  it("respects an externally-provided hasMet flag (resumed save)", async () => {
    const { GroveSpiritActor } = await import("./GroveSpiritActor");
    const actor = createMockActor();
    const spirit = new GroveSpiritActor(
      // biome-ignore lint/suspicious/noExplicitAny: cast for stub
      actor as any,
      {
        spawn: { x: 0, y: 0, z: 0 },
        spiritId: "grove-A:spirit",
        hasMet: true,
      },
    );
    const pick = spirit.interact({}, () => 0);
    expect(pick.tag).toBe("returning-greet");
  });

  it("interact() advances lastPhraseId so back-to-back calls never repeat", async () => {
    const { GroveSpiritActor } = await import("./GroveSpiritActor");
    const actor = createMockActor();
    const spirit = new GroveSpiritActor(
      // biome-ignore lint/suspicious/noExplicitAny: cast for stub
      actor as any,
      {
        spawn: { x: 0, y: 0, z: 0 },
        spiritId: "grove-A:spirit",
        hasMet: true,
      },
    );

    // Drive 6 picks with varying random seeds; assert no two adjacent
    // picks share an id.
    const seeds = [0.1, 0.4, 0.9, 0.2, 0.7, 0.5];
    let prev: string | null = null;
    for (const s of seeds) {
      const pick = spirit.interact({}, () => s);
      if (prev !== null) expect(pick.id).not.toBe(prev);
      prev = pick.id;
    }
  });
});
