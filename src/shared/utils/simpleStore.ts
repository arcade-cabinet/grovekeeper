/**
 * Minimal pub/sub store for non-Koota ephemeral UI state (toasts, particles,
 * achievement popups, weather visuals). Replaces the `zustand create()` stores
 * that used to live inside UI component files. Solid-friendly: `.use(selector)`
 * returns a reactive accessor.
 */

import { createSignal, onCleanup } from "solid-js";

export interface SimpleStore<T> {
  get: () => T;
  set: (next: T | ((prev: T) => T)) => void;
  subscribe: (cb: () => void) => () => void;
  use: <U = T>(selector?: (state: T) => U) => () => U;
}

export function createSimpleStore<T>(initial: T): SimpleStore<T> {
  let state = initial;
  const subscribers = new Set<() => void>();

  const get = () => state;

  const set = (next: T | ((prev: T) => T)) => {
    const resolved =
      typeof next === "function" ? (next as (p: T) => T)(state) : next;
    if (resolved === state) return;
    state = resolved;
    for (const cb of subscribers) cb();
  };

  const subscribe = (cb: () => void) => {
    subscribers.add(cb);
    return () => {
      subscribers.delete(cb);
    };
  };

  function use<U = T>(selector?: (state: T) => U): () => U {
    const read = selector ? () => selector(state) : () => state as unknown as U;
    const [value, setValue] = createSignal<U>(read(), { equals: false });
    const unsub = subscribe(() => setValue(() => read()));
    onCleanup(unsub);
    return value;
  }

  return { get, set, subscribe, use };
}
