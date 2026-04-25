/**
 * eventBus — Solid-aware signal bus for engine→UI events.
 *
 * The runtime (a non-Solid imperative subsystem) emits transient UI
 * events here; Solid components subscribe via the accessors. Keeps the
 * engine free of Solid imports while still being able to drive UI
 * surfaces (speech bubbles, crafting panel, toast popups, …).
 *
 * Scope: UI-only. Do NOT route gameplay state through the bus —
 * persistent state lives in DB / Koota traits / ECS components. The bus
 * only carries "show this overlay now" intent.
 *
 * Pattern: one global signal per overlay. Emitting `null` clears the
 * overlay. This avoids accumulation and keeps each overlay's mount
 * predicate trivial (`<Show when={signal()}>`).
 */
import { type Accessor, createSignal } from "solid-js";

/**
 * Emitted by `InteractionSystem` whenever the player triggers a phrase
 * pick. The UI projects `screenPosition` (world→screen) at emit time
 * and renders `<NpcSpeechBubble>` with the `phrase`.
 */
export interface NpcSpeechEvent {
  /** Stable NPC id (matches `actor.getId()`). */
  speakerId: string;
  /** Phrase text to render. */
  phrase: string;
  /** Top-anchor position for the bubble in CSS pixels. */
  screenPosition: { x: number; y: number };
  /** Auto-dismiss timeout in milliseconds. */
  ttlMs: number;
}

/**
 * Emitted by `CraftingStationActor`'s runtime watcher when the player
 * presses `open-craft` while in proximity (or by the panel itself when
 * the player closes it).
 */
export interface CraftingPanelEvent {
  /** Which station the player is at. */
  stationId: string;
  /** Open or close intent. The UI consumer keys on this to mount/unmount. */
  open: boolean;
}

const [npcSpeech, setNpcSpeech] = createSignal<NpcSpeechEvent | null>(null);
const [craftingPanel, setCraftingPanel] =
  createSignal<CraftingPanelEvent | null>(null);

/**
 * Retreat overlay opacity (Wave 14/15). 0..1 — driven by
 * `RetreatSystem` each frame. The overlay is mounted unconditionally
 * and reads this signal; opacity 0 ⇒ pointer-events disabled.
 */
const [retreatOpacity, setRetreatOpacity] = createSignal(0);

/**
 * Singleton bus instance. Importing from this module gives both the
 * runtime (emit) and Solid components (subscribe) the same handle.
 */
export const eventBus = {
  /** Emit (or clear with `null`) the active speech bubble. */
  emitNpcSpeech: setNpcSpeech,
  /** Emit (or clear with `null`) the active crafting panel state. */
  emitCraftingPanel: setCraftingPanel,
  /** Set the retreat overlay opacity in [0, 1]. */
  emitRetreatOpacity: (value: number) =>
    setRetreatOpacity(Math.max(0, Math.min(1, value))),
  /** Reactive accessor — current speech bubble event, or null. */
  npcSpeech: npcSpeech as Accessor<NpcSpeechEvent | null>,
  /** Reactive accessor — current crafting panel event, or null. */
  craftingPanel: craftingPanel as Accessor<CraftingPanelEvent | null>,
  /** Reactive accessor — retreat overlay opacity in [0, 1]. */
  retreatOpacity: retreatOpacity as Accessor<number>,
};
