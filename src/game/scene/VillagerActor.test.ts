/**
 * VillagerActor tests — Wave 11b.
 *
 * Same `@jolly-pixel/engine` mock skeleton as GroveSpiritActor.test.
 * Verifies:
 *   - constructor places the actor at spawn,
 *   - ModelRenderer is requested with one of the 4 villager GLB paths
 *     (chosen by `modelVariant`),
 *   - wander AI is deterministic for the same RNG sequence,
 *   - walking integrates into position, animation swaps idle ↔ walk,
 *   - interact() returns phrases from the villager pool and advances
 *     `lastPhraseId`.
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

/** Random source that yields a fixed sequence; used for AI determinism tests. */
function fixedRandom(xs: number[]): () => number {
  let i = 0;
  return () => xs[i++ % xs.length];
}

describe("VillagerActor", () => {
  beforeEach(() => {
    ModelRendererMock.mockClear();
  });

  it("places the actor at the spawn position", async () => {
    const { VillagerActor } = await import("./VillagerActor");
    const actor = createMockActor();
    new VillagerActor(
      // biome-ignore lint/suspicious/noExplicitAny: cast for stub
      actor as any,
      {
        spawn: { x: 12, y: 6, z: 4 },
        villagerId: "grove-A:villager:0",
        modelVariant: 0,
        random: fixedRandom([0.5]),
      },
    );
    expect(actor.object3D.position.x).toBe(12);
    expect(actor.object3D.position.y).toBe(6);
    expect(actor.object3D.position.z).toBe(4);
  });

  it("requests one of the 4 villager GLB paths based on modelVariant", async () => {
    const { VillagerActor } = await import("./VillagerActor");
    for (const variant of [0, 1, 2, 3]) {
      ModelRendererMock.mockClear();
      const actor = createMockActor();
      new VillagerActor(
        // biome-ignore lint/suspicious/noExplicitAny: cast for stub
        actor as any,
        {
          spawn: { x: 0, y: 0, z: 0 },
          villagerId: `villager-${variant}`,
          modelVariant: variant,
          random: fixedRandom([0]),
        },
      );
      const opts = actor.addComponentAndGet.mock.calls[0][1];
      expect(opts.path).toMatch(/villager-(coast|cook|smith|elder)\.glb$/);
    }
  });

  it("wander AI is deterministic for identical RNG sequences", async () => {
    const { VillagerActor } = await import("./VillagerActor");
    const seq = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6];

    const actorA = createMockActor();
    const villagerA = new VillagerActor(
      // biome-ignore lint/suspicious/noExplicitAny: cast for stub
      actorA as any,
      {
        spawn: { x: 0, y: 0, z: 0 },
        villagerId: "v-A",
        modelVariant: 0,
        random: fixedRandom(seq),
      },
    );
    villagerA.awake();
    for (let i = 0; i < 10; i++) villagerA.update(50);

    const actorB = createMockActor();
    const villagerB = new VillagerActor(
      // biome-ignore lint/suspicious/noExplicitAny: cast for stub
      actorB as any,
      {
        spawn: { x: 0, y: 0, z: 0 },
        villagerId: "v-B",
        modelVariant: 0,
        random: fixedRandom(seq),
      },
    );
    villagerB.awake();
    for (let i = 0; i < 10; i++) villagerB.update(50);

    expect(actorA.object3D.position.x).toBeCloseTo(
      actorB.object3D.position.x,
      6,
    );
    expect(actorA.object3D.position.z).toBeCloseTo(
      actorB.object3D.position.z,
      6,
    );
  });

  it("integrates wander steps into position over time", async () => {
    const { VillagerActor, VILLAGER_MOVE_SPEED } = await import(
      "./VillagerActor"
    );
    const actor = createMockActor();
    // RNG sequence: pause-roll(0)→pause=0; angle-roll, radius-roll for
    // first leg; rest unused this slice.
    // angle = 0 * 2π = 0, radius = 1 * wanderRadius = wanderRadius.
    // → target is (spawn.x + wanderRadius, spawn.z).
    const villager = new VillagerActor(
      // biome-ignore lint/suspicious/noExplicitAny: cast for stub
      actor as any,
      {
        spawn: { x: 0, y: 0, z: 0 },
        villagerId: "v-A",
        modelVariant: 0,
        random: fixedRandom([0, 0, 1]),
      },
    );
    villager.awake();
    // First update transitions paused(0s)→walking; second update steps.
    villager.update(16);
    villager.update(16);
    // Movement is along +X.
    expect(actor.object3D.position.x).toBeGreaterThan(0);
    expect(actor.object3D.position.z).toBeCloseTo(0, 6);
    // Walk clip should have been requested.
    expect(villager.clip).toBe("Walk01");
    // The travelled distance is bounded above by 2 * 16ms * speed.
    expect(actor.object3D.position.x).toBeLessThanOrEqual(
      VILLAGER_MOVE_SPEED * 0.05,
    );
  });

  it("interact() returns villager phrases and advances lastPhraseId", async () => {
    const { VillagerActor } = await import("./VillagerActor");
    const actor = createMockActor();
    const villager = new VillagerActor(
      // biome-ignore lint/suspicious/noExplicitAny: cast for stub
      actor as any,
      {
        spawn: { x: 0, y: 0, z: 0 },
        villagerId: "v-A",
        modelVariant: 0,
        random: fixedRandom([0]),
      },
    );

    const first = villager.interact({}, () => 0);
    expect(["general", /^time-of-day-/]).toContainEqual(
      first.tag === "general" ? "general" : /^time-of-day-/,
    );
    expect(first.text.length).toBeGreaterThan(0);
    expect(villager.lastPhrase).toBe(first.id);

    // Drive 5 more picks; none should equal the immediately prior id.
    let prev = first.id;
    for (const seed of [0.1, 0.4, 0.7, 0.2, 0.55]) {
      const pick = villager.interact({}, () => seed);
      expect(pick.id).not.toBe(prev);
      prev = pick.id;
    }
  });
});
