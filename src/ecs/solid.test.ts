/**
 * Solid↔Koota reactive adapter tests.
 *
 * Hooks live outside a component tree in these tests, so we wrap each
 * assertion in `createRoot(dispose => { ... })` — that gives Solid a
 * reactive owner (so onCleanup + subscriptions fire) and we dispose
 * at the end to verify unsubscribe behavior.
 *
 * Koota signals fire synchronously, but Solid's `createSignal` defers
 * subscriber notifications to a microtask. The tests use a tiny
 * `flush()` helper that awaits a microtask before asserting.
 */

import { createRoot } from "solid-js";
import { afterEach, describe, expect, it } from "vitest";
import { destroyAllEntitiesExceptWorld, koota } from "@/koota";
import { Position, Resources, Tree } from "@/traits";
import { useHas, useQuery, useQueryFirst, useTrait } from "./solid";

const flush = () => new Promise<void>((r) => setTimeout(r, 0));

afterEach(() => {
  destroyAllEntitiesExceptWorld();
});

describe("useQuery", () => {
  it("returns current query result on initial read", () => {
    createRoot((dispose) => {
      const a = koota.spawn(Tree({ speciesId: "white-oak" }), Position());
      const b = koota.spawn(Tree({ speciesId: "elder-pine" }), Position());
      const entities = useQuery(Tree, Position);
      expect(entities()).toHaveLength(2);
      expect(entities().map((e) => e.id())).toEqual(
        expect.arrayContaining([a.id(), b.id()]),
      );
      dispose();
    });
  });

  it("updates when a matching entity is spawned", async () => {
    await createRoot(async (dispose) => {
      const entities = useQuery(Tree, Position);
      expect(entities()).toHaveLength(0);
      koota.spawn(Tree({ speciesId: "white-oak" }), Position());
      await flush();
      expect(entities()).toHaveLength(1);
      dispose();
    });
  });

  it("updates when a matching entity is destroyed", async () => {
    await createRoot(async (dispose) => {
      const e = koota.spawn(Tree({ speciesId: "white-oak" }), Position());
      const entities = useQuery(Tree, Position);
      expect(entities()).toHaveLength(1);
      e.destroy();
      await flush();
      expect(entities()).toHaveLength(0);
      dispose();
    });
  });

  it("stops updating after dispose (onCleanup unsubscribes)", async () => {
    let getEntities:
      | (() => ReturnType<typeof useQuery> extends () => infer R ? R : never)
      | undefined;
    createRoot((dispose) => {
      getEntities = useQuery(Tree, Position) as typeof getEntities;
      dispose();
    });
    const before = getEntities?.()?.length ?? 0;
    koota.spawn(Tree({ speciesId: "white-oak" }), Position());
    await flush();
    // Post-dispose: accessor still returns the last-seen value, but no new
    // refresh happened because subscriptions were removed.
    expect(getEntities?.()?.length).toBe(before);
  });
});

describe("useQueryFirst", () => {
  it("returns undefined when no match, then updates on add", async () => {
    await createRoot(async (dispose) => {
      const first = useQueryFirst(Tree, Position);
      expect(first()).toBeUndefined();
      const e = koota.spawn(Tree({ speciesId: "white-oak" }), Position());
      await flush();
      expect(first()?.id()).toBe(e.id());
      dispose();
    });
  });

  it("updates to undefined when the last match is destroyed", async () => {
    await createRoot(async (dispose) => {
      const e = koota.spawn(Tree({ speciesId: "white-oak" }), Position());
      const first = useQueryFirst(Tree, Position);
      expect(first()).toBeDefined();
      e.destroy();
      await flush();
      expect(first()).toBeUndefined();
      dispose();
    });
  });
});

describe("useTrait on world", () => {
  it("reads the current world-level trait value", () => {
    createRoot((dispose) => {
      koota.set(Resources, { timber: 5, sap: 3, fruit: 1, acorns: 0 });
      const res = useTrait(koota, Resources);
      expect(res()?.timber).toBe(5);
      dispose();
    });
  });

  it("fires onChange when the trait is updated", async () => {
    await createRoot(async (dispose) => {
      koota.set(Resources, { timber: 0, sap: 0, fruit: 0, acorns: 0 });
      const res = useTrait(koota, Resources);
      expect(res()?.timber).toBe(0);
      koota.set(Resources, { timber: 10, sap: 0, fruit: 0, acorns: 0 });
      await flush();
      expect(res()?.timber).toBe(10);
      dispose();
    });
  });
});

describe("useTrait on entity", () => {
  it("tracks a trait value on a specific entity and ignores other entities", async () => {
    await createRoot(async (dispose) => {
      const a = koota.spawn(Position({ x: 1, y: 0, z: 1 }));
      const b = koota.spawn(Position({ x: 2, y: 0, z: 2 }));
      const posA = useTrait(a, Position);
      expect(posA()?.x).toBe(1);
      // Mutating b should not refresh a's accessor value.
      b.set(Position, { x: 99, y: 0, z: 99 });
      await flush();
      expect(posA()?.x).toBe(1);
      // Mutating a should.
      a.set(Position, { x: 7, y: 0, z: 7 });
      await flush();
      expect(posA()?.x).toBe(7);
      dispose();
    });
  });
});

describe("useHas", () => {
  it("reflects trait presence and flips on add/remove", async () => {
    await createRoot(async (dispose) => {
      const e = koota.spawn(Position());
      const has = useHas(e, Tree);
      expect(has()).toBe(false);
      e.add(Tree({ speciesId: "white-oak" }));
      await flush();
      expect(has()).toBe(true);
      e.remove(Tree);
      await flush();
      expect(has()).toBe(false);
      dispose();
    });
  });
});
