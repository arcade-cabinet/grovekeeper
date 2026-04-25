/**
 * CreatureActor tests — Wave 14/15.
 *
 * Same `@jolly-pixel/engine` mock skeleton as VillagerActor.test.
 * Verifies:
 *   - constructor places at spawn + requests the def's GLB,
 *   - peaceful creatures flee on player approach,
 *   - hostile creatures chase + attack the player,
 *   - applyDamage decrements hp; reaching 0 marks dead,
 *   - state machine respects determinism (RNG-only branches).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CreatureDef } from "@/content/creatures";

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
    addComponentAndGet: vi.fn(() => ({
      mock: true,
      animation: { play: vi.fn() },
    })),
  };
}

function fixedRandom(xs: number[]): () => number {
  let i = 0;
  return () => xs[i++ % xs.length];
}

const RABBIT: CreatureDef = {
  species: "rabbit",
  glb: "assets/models/creatures/peaceful/rabbit.gltf",
  idleClip: "Idle 01",
  walkClip: "Walk 01",
  runClip: "Run 01",
  hurtClip: "Get Hit 01",
  hpMax: 1,
  walkSpeed: 0.8,
  fleeSpeed: 3.2,
  panicRadius: 4.5,
  wanderRadius: 3,
  wanderPauseSeconds: 2.5,
  hostility: "peaceful",
};

const WOLF: CreatureDef = {
  species: "wolf-pup",
  glb: "assets/models/creatures/hostile/wolf.gltf",
  idleClip: "Idle 01",
  walkClip: "Walk 01",
  runClip: "Run 01",
  attackClip: "Attack 01",
  hurtClip: "Get Hit 01",
  hpMax: 3,
  walkSpeed: 0.6,
  fleeSpeed: 2.6,
  aggroRadius: 5,
  damagePerHit: 5,
  wanderRadius: 3,
  wanderPauseSeconds: 3,
  hostility: "hostile",
};

describe("CreatureActor", () => {
  beforeEach(() => {
    ModelRendererMock.mockClear();
  });

  it("places the actor at spawn and requests the def's GLB", async () => {
    const { CreatureActor } = await import("./CreatureActor");
    const actor = createMockActor();
    new CreatureActor(
      // biome-ignore lint/suspicious/noExplicitAny: stub
      actor as any,
      {
        spawn: { x: 10, y: 6, z: 5 },
        creatureId: "c-rabbit-1",
        def: RABBIT,
        random: fixedRandom([0.5]),
      },
    );
    expect(actor.object3D.position.x).toBe(10);
    expect(actor.object3D.position.y).toBe(6);
    expect(actor.object3D.position.z).toBe(5);
    const opts = actor.addComponentAndGet.mock.calls[0][1];
    expect(opts.path).toMatch(/rabbit\.gltf$/);
    expect(opts.animations.default).toBe("Idle 01");
  });

  it("starts in idle state after awake()", async () => {
    const { CreatureActor } = await import("./CreatureActor");
    const actor = createMockActor();
    const c = new CreatureActor(
      // biome-ignore lint/suspicious/noExplicitAny: stub
      actor as any,
      {
        spawn: { x: 0, y: 0, z: 0 },
        creatureId: "c-1",
        def: RABBIT,
        random: fixedRandom([0.5, 0, 1]),
      },
    );
    c.awake();
    expect(c.state).toBe("idle");
  });

  it("peaceful creature flees when player enters panicRadius", async () => {
    const { CreatureActor } = await import("./CreatureActor");
    const actor = createMockActor();
    const c = new CreatureActor(
      // biome-ignore lint/suspicious/noExplicitAny: stub
      actor as any,
      {
        spawn: { x: 0, y: 0, z: 0 },
        creatureId: "c-rabbit",
        def: RABBIT,
        random: fixedRandom([0.5, 0, 1]),
      },
    );
    c.awake();
    // Player walks within panicRadius (4.5) — rabbit should flee.
    c.setPlayerPosition(1, 0);
    c.update(16);
    expect(c.state).toBe("flee");
  });

  it("peaceful creature does NOT flee when player is far away", async () => {
    const { CreatureActor } = await import("./CreatureActor");
    const actor = createMockActor();
    const c = new CreatureActor(
      // biome-ignore lint/suspicious/noExplicitAny: stub
      actor as any,
      {
        spawn: { x: 0, y: 0, z: 0 },
        creatureId: "c-rabbit",
        def: RABBIT,
        random: fixedRandom([0.5, 0, 1]),
      },
    );
    c.awake();
    c.setPlayerPosition(50, 50);
    c.update(16);
    expect(c.state).not.toBe("flee");
  });

  it("hostile creature chases the player when in aggroRadius", async () => {
    const { CreatureActor } = await import("./CreatureActor");
    const actor = createMockActor();
    const c = new CreatureActor(
      // biome-ignore lint/suspicious/noExplicitAny: stub
      actor as any,
      {
        spawn: { x: 0, y: 0, z: 0 },
        creatureId: "c-wolf",
        def: WOLF,
        random: fixedRandom([0.5, 0, 1]),
      },
    );
    c.awake();
    c.setPlayerPosition(3, 0);
    c.update(16);
    expect(c.state).toBe("chase");
    // Should move toward the player.
    c.update(100);
    expect(actor.object3D.position.x).toBeGreaterThan(0);
  });

  it("hostile transitions chase → attack when player is in melee range", async () => {
    const { CreatureActor } = await import("./CreatureActor");
    const actor = createMockActor();
    const c = new CreatureActor(
      // biome-ignore lint/suspicious/noExplicitAny: stub
      actor as any,
      {
        spawn: { x: 0, y: 0, z: 0 },
        creatureId: "c-wolf",
        def: WOLF,
        random: fixedRandom([0.5, 0, 1]),
      },
    );
    c.awake();
    // Drop player right on top of the wolf.
    c.setPlayerPosition(0.5, 0);
    c.update(16);
    expect(["chase", "attack"]).toContain(c.state);
  });

  it("attack invokes onPlayerHit with damagePerHit", async () => {
    const { CreatureActor } = await import("./CreatureActor");
    const actor = createMockActor();
    const onHit = vi.fn();
    const c = new CreatureActor(
      // biome-ignore lint/suspicious/noExplicitAny: stub
      actor as any,
      {
        spawn: { x: 0, y: 0, z: 0 },
        creatureId: "c-wolf",
        def: WOLF,
        random: fixedRandom([0.5, 0, 1]),
        onPlayerHit: onHit,
      },
    );
    c.awake();
    c.setPlayerPosition(0.5, 0);
    // Drive several frames to elapse the attack swing apex.
    for (let i = 0; i < 50; i++) c.update(20);
    expect(onHit).toHaveBeenCalled();
    const call = onHit.mock.calls[0];
    expect(call[0]).toBe(WOLF.damagePerHit);
    expect(call[1]).toBe("c-wolf");
  });

  it("applyDamage reduces hp; reaching 0 marks dead", async () => {
    const { CreatureActor } = await import("./CreatureActor");
    const actor = createMockActor();
    const c = new CreatureActor(
      // biome-ignore lint/suspicious/noExplicitAny: stub
      actor as any,
      {
        spawn: { x: 0, y: 0, z: 0 },
        creatureId: "c-wolf",
        def: WOLF,
        random: fixedRandom([0.5]),
      },
    );
    c.awake();
    expect(c.currentHp).toBe(WOLF.hpMax);
    expect(c.applyDamage(1)).toBe(false);
    expect(c.currentHp).toBe(2);
    expect(c.applyDamage(1)).toBe(false);
    expect(c.applyDamage(1)).toBe(true); // killing blow
    expect(c.currentHp).toBe(0);
    expect(c.state).toBe("dead");
  });

  it("dead creatures stop updating", async () => {
    const { CreatureActor } = await import("./CreatureActor");
    const actor = createMockActor();
    const c = new CreatureActor(
      // biome-ignore lint/suspicious/noExplicitAny: stub
      actor as any,
      {
        spawn: { x: 0, y: 0, z: 0 },
        creatureId: "c-1",
        def: RABBIT,
        random: fixedRandom([0.5]),
      },
    );
    c.awake();
    c.applyDamage(99);
    expect(c.state).toBe("dead");
    const before = { ...actor.object3D.position };
    c.update(1000);
    expect(actor.object3D.position.x).toBe(before.x);
    expect(actor.object3D.position.z).toBe(before.z);
  });
});
