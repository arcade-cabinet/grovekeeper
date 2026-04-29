import type { Entity, QueryResult, Trait, World } from "koota";
import { type Accessor, createSignal, onCleanup } from "solid-js";
import { koota } from "@/koota";

// biome-ignore lint/suspicious/noExplicitAny: Koota trait variance
type AnyTrait = Trait<any>;

// Koota's Trait schemas permit `() => T` factory values for mutable-
// reference defaults (arrays, records). At runtime, world.get(Trait)
// returns the RESOLVED value — never the factory. We unwrap those
// unions here so consumers can call `.includes` / `.find` / etc. on
// the returned value without narrowing every site.
// biome-ignore lint/suspicious/noExplicitAny: structural unwrap
type UnwrapFactory<T> = T extends (...args: any[]) => infer R ? R : T;
type ResolveSchema<S> = S extends object
  ? { [K in keyof S]: UnwrapFactory<S[K]> }
  : UnwrapFactory<S>;
type TraitInstance<T> = T extends Trait<infer S> ? ResolveSchema<S> : never;

/**
 * Solid hook — returns an accessor to the current query result.
 * Call site: `const entities = useQuery(Foo, Bar); ... entities()`.
 */
export function useQuery(...traits: AnyTrait[]): () => QueryResult<AnyTrait[]> {
  const [entities, setEntities] = createSignal<QueryResult<AnyTrait[]>>(
    koota.query(...traits),
  );
  // Defer to microtask so we query AFTER Koota finishes mutating masks.
  const refresh = () =>
    queueMicrotask(() => setEntities(koota.query(...traits)));
  const unsubAdd = koota.onQueryAdd(traits, refresh);
  const unsubRemove = koota.onQueryRemove(traits, refresh);
  onCleanup(() => {
    unsubAdd();
    unsubRemove();
  });
  return entities;
}

/**
 * Solid hook — accessor to the first entity matching the query, or undefined.
 */
export function useQueryFirst(...traits: AnyTrait[]): () => Entity | undefined {
  const [entity, setEntity] = createSignal<Entity | undefined>(
    koota.queryFirst(...traits),
  );
  const refresh = () =>
    queueMicrotask(() => setEntity(koota.queryFirst(...traits)));
  const unsubAdd = koota.onQueryAdd(traits, refresh);
  const unsubRemove = koota.onQueryRemove(traits, refresh);
  onCleanup(() => {
    unsubAdd();
    unsubRemove();
  });
  return entity;
}

function readTrait<T extends AnyTrait>(
  target: Entity | World | undefined | null,
  trait: T,
): TraitInstance<T> | undefined {
  if (target === undefined || target === null) return undefined;
  if (target === koota) {
    return koota.has(trait)
      ? (koota.get(trait) as TraitInstance<T>)
      : undefined;
  }
  const e = target as Entity;
  return e.has(trait) ? (e.get(trait) as TraitInstance<T>) : undefined;
}

/**
 * Solid hook — accessor for a trait on a specific entity (or the world itself).
 *
 * Solid signals: `useTrait(...)` returns a getter FUNCTION. Consumers call
 * it: `useTrait(koota, Resources)()?.timber ?? 0`.
 */
export function useTrait<T extends AnyTrait>(
  target: Entity | World | undefined | null,
  trait: T,
): () => TraitInstance<T> | undefined {
  const [value, setValue] = createSignal<TraitInstance<T> | undefined>(
    readTrait(target, trait),
    // Force updates even if the returned object is reference-equal after a
    // mutation inside koota's trait store.
    { equals: false },
  );
  // Remove events fire before Koota clears the mask, so defer the
  // refresh to observe the post-mutation state. Add/change events work
  // either way; we deferall three uniformly for consistency.
  const refreshAsync = () =>
    queueMicrotask(() => setValue(() => readTrait(target, trait)));
  const unsubChange = koota.onChange(trait, (e) => {
    if (target === koota || e === target) refreshAsync();
  });
  const unsubAdd = koota.onAdd(trait, (e) => {
    if (target === koota || e === target) refreshAsync();
  });
  const unsubRemove = koota.onRemove(trait, (e) => {
    if (target === koota || e === target) refreshAsync();
  });
  onCleanup(() => {
    unsubChange();
    unsubAdd();
    unsubRemove();
  });
  return value;
}

/**
 * Solid hook — accessor returning whether target has the given trait.
 *
 * Remove listeners fire BEFORE Koota flips the entity mask (the mask
 * clear happens after the subscription loop), so reading `entity.has`
 * synchronously from inside the callback returns the stale `true`.
 * Defer the refresh to a microtask so we observe the post-removal state.
 */
export function useHas(
  target: Entity | World | undefined | null,
  trait: AnyTrait,
): () => boolean {
  const read = () => {
    if (target === undefined || target === null) return false;
    if (target === koota) return koota.has(trait);
    return (target as Entity).has(trait);
  };
  const [value, setValue] = createSignal<boolean>(read(), { equals: false });
  const refreshAsync = () => queueMicrotask(() => setValue(read()));
  const unsubAdd = koota.onAdd(trait, (e) => {
    if (target === koota || e === target) refreshAsync();
  });
  const unsubRemove = koota.onRemove(trait, (e) => {
    if (target === koota || e === target) refreshAsync();
  });
  onCleanup(() => {
    unsubAdd();
    unsubRemove();
  });
  return value;
}

/**
 * Solid hook — returns a reactive accessor for a trait on a dynamically-
 * changing entity (e.g. the result of `useQueryFirst`).
 *
 * Unlike `useTrait(entity, trait)` which captures the entity at call time,
 * this hook re-subscribes whenever `entityAccessor` returns a new entity
 * AND re-fires whenever the trait value changes on the current entity.
 *
 * Usage:
 *   const player = useQueryFirst(IsPlayer, FarmerState);
 *   const fs = useEntityTrait(player, FarmerState);
 *   const stamina = () => fs()?.stamina ?? 100;
 */
export function useEntityTrait<T extends AnyTrait>(
  entityAccessor: Accessor<Entity | undefined>,
  trait: T,
): () => TraitInstance<T> | undefined {
  const read = (entity: Entity | undefined) => {
    if (!entity) return undefined;
    return entity.has(trait)
      ? (entity.get(trait) as TraitInstance<T>)
      : undefined;
  };

  const [value, setValue] = createSignal<TraitInstance<T> | undefined>(
    read(entityAccessor()),
    { equals: false },
  );

  // Re-read when trait changes on any entity; filter to current entity.
  const refreshOnChange = (changedEntity: Entity) => {
    const current = entityAccessor();
    if (current && changedEntity === current) {
      queueMicrotask(() => setValue(() => read(entityAccessor())));
    }
  };

  const unsubChange = koota.onChange(trait, refreshOnChange);
  const unsubAdd = koota.onAdd(trait, (e) => {
    const current = entityAccessor();
    if (current && e === current) {
      queueMicrotask(() => setValue(() => read(entityAccessor())));
    }
  });
  const unsubRemove = koota.onRemove(trait, (e) => {
    const current = entityAccessor();
    if (current && e === current) {
      queueMicrotask(() => setValue(() => read(entityAccessor())));
    }
  });
  // Also re-read when the entity itself changes (new query result).
  const unsubQueryAdd = koota.onQueryAdd([trait], () =>
    queueMicrotask(() => setValue(() => read(entityAccessor()))),
  );
  const unsubQueryRemove = koota.onQueryRemove([trait], () =>
    queueMicrotask(() => setValue(() => read(entityAccessor()))),
  );

  onCleanup(() => {
    unsubChange();
    unsubAdd();
    unsubRemove();
    unsubQueryAdd();
    unsubQueryRemove();
  });

  return value;
}

export function useWorld(): World {
  return koota;
}
