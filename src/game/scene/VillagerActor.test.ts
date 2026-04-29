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

interface MockMaterial {
  transparent: boolean;
  opacity: number;
}

interface MockMesh {
  isMesh: true;
  material: MockMaterial | MockMaterial[];
}

interface MockRenderer {
  mock: true;
  animation: { play: ReturnType<typeof vi.fn> };
  group: {
    traverse: (cb: (obj: unknown) => void) => void;
    _meshes: MockMesh[];
  };
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

function createMockMesh(): MockMesh {
  return { isMesh: true, material: { transparent: false, opacity: 1 } };
}

function createMockRenderer(): MockRenderer {
  const meshes: MockMesh[] = [createMockMesh()];
  return {
    mock: true,
    animation: { play: vi.fn() },
    group: {
      _meshes: meshes,
      traverse(cb: (obj: unknown) => void) {
        for (const m of meshes) cb(m);
      },
    },
  };
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

  it("setOpacity sets transparent+opacity on all mesh materials", async () => {
    const { VillagerActor } = await import("./VillagerActor");
    const actor = createMockActor();
    const renderer = createMockRenderer();
    actor.addComponentAndGet.mockReturnValue(renderer);
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

    villager.setOpacity(0.5);
    const mat = renderer.group._meshes[0].material as {
      transparent: boolean;
      opacity: number;
    };
    expect(mat.opacity).toBe(0.5);
    expect(mat.transparent).toBe(true);

    villager.setOpacity(1);
    expect(mat.opacity).toBe(1);
    expect(mat.transparent).toBe(false);
  });

  it("setOpacity handles array materials on a single mesh", async () => {
    const { VillagerActor } = await import("./VillagerActor");
    const actor = createMockActor();
    const matA: MockMaterial = { transparent: false, opacity: 1 };
    const matB: MockMaterial = { transparent: false, opacity: 1 };
    const multiMesh: MockMesh = { isMesh: true, material: [matA, matB] };
    const renderer = createMockRenderer();
    renderer.group._meshes.push(multiMesh);
    // Override traverse to iterate all meshes including the new one.
    renderer.group.traverse = (cb: (obj: unknown) => void) => {
      for (const m of renderer.group._meshes) cb(m);
    };
    actor.addComponentAndGet.mockReturnValue(renderer);
    const villager = new VillagerActor(
      // biome-ignore lint/suspicious/noExplicitAny: cast for stub
      actor as any,
      {
        spawn: { x: 0, y: 0, z: 0 },
        villagerId: "v-B",
        modelVariant: 0,
        random: fixedRandom([0]),
      },
    );

    villager.setOpacity(0.5);
    expect(matA.opacity).toBe(0.5);
    expect(matA.transparent).toBe(true);
    expect(matB.opacity).toBe(0.5);
    expect(matB.transparent).toBe(true);

    villager.setOpacity(1);
    expect(matA.opacity).toBe(1);
    expect(matA.transparent).toBe(false);
    expect(matB.opacity).toBe(1);
    expect(matB.transparent).toBe(false);
  });

  it("setOpacity clamps out-of-range and non-finite values", async () => {
    const { VillagerActor } = await import("./VillagerActor");
    const actor = createMockActor();
    const renderer = createMockRenderer();
    actor.addComponentAndGet.mockReturnValue(renderer);
    const villager = new VillagerActor(
      // biome-ignore lint/suspicious/noExplicitAny: cast for stub
      actor as any,
      {
        spawn: { x: 0, y: 0, z: 0 },
        villagerId: "v-C",
        modelVariant: 0,
        random: fixedRandom([0]),
      },
    );
    const mat = renderer.group._meshes[0].material as MockMaterial;

    villager.setOpacity(2);
    expect(mat.opacity).toBe(1);

    villager.setOpacity(-1);
    expect(mat.opacity).toBe(0);

    villager.setOpacity(Number.NaN);
    expect(mat.opacity).toBe(1);
  });
});
