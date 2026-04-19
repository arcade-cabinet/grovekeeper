import type { Entity, QueryResult, Trait, World } from "koota";
import { createSignal, onCleanup } from "solid-js";
import { world } from "./world";

type TraitInstance<T> = T extends Trait<infer S> ? S : never;

// biome-ignore lint/suspicious/noExplicitAny: Koota trait variance requires any here
type AnyTrait = Trait<any>;

export function useQuery(
  ...traits: AnyTrait[]
): () => QueryResult<AnyTrait[]> {
  const [entities, setEntities] = createSignal<QueryResult<AnyTrait[]>>(
    world.query(...traits),
  );

  const refresh = () => {
    setEntities(world.query(...traits));
  };

  const unsubAdd = world.onQueryAdd(traits, refresh);
  const unsubRemove = world.onQueryRemove(traits, refresh);

  onCleanup(() => {
    unsubAdd();
    unsubRemove();
  });

  return entities;
}

export function useQueryFirst(
  ...traits: AnyTrait[]
): () => Entity | undefined {
  const [entity, setEntity] = createSignal<Entity | undefined>(
    world.queryFirst(...traits),
  );

  const refresh = () => {
    setEntity(world.queryFirst(...traits));
  };

  const unsubAdd = world.onQueryAdd(traits, refresh);
  const unsubRemove = world.onQueryRemove(traits, refresh);

  onCleanup(() => {
    unsubAdd();
    unsubRemove();
  });

  return entity;
}

function readTraitValue<T extends AnyTrait>(
  target: Entity | World | undefined,
  trait: T,
): TraitInstance<T> | undefined {
  if (target === undefined) return undefined;
  if (target === world) {
    return world.has(trait) ? (world.get(trait) as TraitInstance<T>) : undefined;
  }
  const entity = target as Entity;
  return entity.has(trait)
    ? (entity.get(trait) as TraitInstance<T>)
    : undefined;
}

export function useTrait<T extends AnyTrait>(
  target: Entity | World | undefined,
  trait: T,
): () => TraitInstance<T> | undefined {
  const [value, setValue] = createSignal<TraitInstance<T> | undefined>(
    readTraitValue(target, trait),
  );

  const refresh = () => setValue(() => readTraitValue(target, trait));

  const unsubChange = world.onChange(trait, (e) => {
    if (target === world || e === target) refresh();
  });
  const unsubAdd = world.onAdd(trait, (e) => {
    if (target === world || e === target) refresh();
  });
  const unsubRemove = world.onRemove(trait, (e) => {
    if (target === world || e === target) refresh();
  });

  onCleanup(() => {
    unsubChange();
    unsubAdd();
    unsubRemove();
  });

  return value;
}

export function useTraitEffect<T extends AnyTrait>(
  target: Entity | World | undefined,
  trait: T,
  callback: (value: TraitInstance<T> | undefined) => void,
): void {
  callback(readTraitValue(target, trait));

  const unsubChange = world.onChange(trait, (e) => {
    if (target === world || e === target) callback(readTraitValue(target, trait));
  });
  const unsubAdd = world.onAdd(trait, (e) => {
    if (target === world || e === target) callback(readTraitValue(target, trait));
  });
  const unsubRemove = world.onRemove(trait, (e) => {
    if (target === world || e === target) callback(readTraitValue(target, trait));
  });

  onCleanup(() => {
    unsubChange();
    unsubAdd();
    unsubRemove();
  });
}

export function useWorld(): World {
  return world;
}
