/** Module-level selection state shared across all useInteraction hook instances. */
import type { InteractionSelection } from "./types";

let currentSelection: InteractionSelection | null = null;
const listeners = new Set<() => void>();

export function getSelection(): InteractionSelection | null {
  return currentSelection;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setSelection(sel: InteractionSelection | null): void {
  currentSelection = sel;
  for (const listener of listeners) {
    listener();
  }
}
