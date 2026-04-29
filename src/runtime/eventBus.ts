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

/**
 * Emitted by `HearthInteractionBehavior` when the player walks within
 * range of a placed hearth. UI projects the hearth's world position to
 * a screen position and renders a contextual prompt ("Press E to light"
 * or "Press E for fast travel").
 */
export interface HearthPromptEvent {
  /** Stable structure id (matches `placedStructures.id`). */
  structureId: string;
  /** Grove this hearth lives in. */
  groveId: string;
  /** Top-anchor screen position for the prompt in CSS pixels. */
  screenPosition: { x: number; y: number };
  /** "light" for unlit hearths, "fast-travel" for lit ones. */
  variant: "light" | "fast-travel";
}

const [npcSpeech, setNpcSpeech] = createSignal<NpcSpeechEvent | null>(null);
const [craftingPanel, setCraftingPanel] =
  createSignal<CraftingPanelEvent | null>(null);

/**
 * Retreat overlay opacity, 0..1 — driven by `RetreatSystem` each frame.
 * The overlay is mounted unconditionally; opacity 0 ⇒ pointer-events disabled.
 */
const [retreatOpacity, setRetreatOpacity] = createSignal(0);

/**
 * Claim ritual cinematic active flag. While true:
 *   - the runtime locks player input,
 *   - the UI dims non-grove layers,
 *   - other interaction prompts hide.
 */
const [claimCinematicActive, setClaimCinematicActive] = createSignal(false);

/** Hearth proximity prompt (light or fast-travel). */
const [hearthPrompt, setHearthPrompt] = createSignal<HearthPromptEvent | null>(
  null,
);

/** Fast-travel menu open flag. */
const [fastTravelOpen, setFastTravelOpen] = createSignal(false);

/** Fast-travel fade overlay opacity, 0..1. */
const [fastTravelFadeOpacity, setFastTravelFadeOpacity] = createSignal(0);

/**
 * Fast-travel teleport request. Solid → runtime channel: `<FastTravelMenu>`
 * emits the chosen target; the runtime's `FastTravelController` subscribes
 * via `onFastTravelStart` and kicks off the fade transition. Cleared back
 * to `null` once the runtime picks it up.
 */
export interface FastTravelStartEvent {
  worldX: number;
  worldZ: number;
  groveId: string;
}
const fastTravelStartListeners = new Set<(ev: FastTravelStartEvent) => void>();

/**
 * Diegetic teaching cue: contextual interact prompt.
 *
 * Emitted by `InteractCueSystem` when the player is within reach of an
 * interactable thing in the world. The variant string drives the prompt
 * copy ("Press E to gather", "Press E to light", etc.). UI consumers
 * render a small label, no modal.
 */
export interface InteractCueEvent {
  variant: "gather" | "light-hearth" | "craft" | "place";
  /** Short verb-y label e.g. "Press E to gather". */
  label: string;
}

/**
 * First-input vignette pulse signal. True until the player has supplied
 * their first movement input, then false forever. Solid renders a subtle
 * CSS vignette pulse on the canvas while true.
 */
const [firstMoveDone, setFirstMoveDone] = createSignal(false);

/** Contextual interact cue (or null when no thing in reach). */
const [interactCue, setInteractCue] = createSignal<InteractCueEvent | null>(
  null,
);

/**
 * Inventory-changed bump counter. Incremented by the runtime every time
 * `addInventory` writes to the DB. SolidJS components track this signal
 * as a reactive dependency and re-query `inventoryRepo` when it ticks.
 * Never read the value — only use it as a dependency trigger.
 */
const [inventoryVersion, setInventoryVersion] = createSignal(0);

/**
 * Emitted when grove claim succeeds. `ClaimRitualSystem` fires this so
 * listeners (e.g. the recipe-gating hook for the starter axe) can react
 * without a hard dependency on the claim system internals.
 */
export interface GroveClaimedEvent {
  /** Stable grove id (`grove-<cx>-<cz>`). */
  groveId: string;
  /** World id (in case there's ever more than one save). */
  worldId: string;
}

const claimedListeners = new Set<(ev: GroveClaimedEvent) => void>();

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
  /** Flip the claim-ritual cinematic lock on/off. */
  emitClaimCinematicActive: setClaimCinematicActive,
  /** Show/clear hearth proximity prompt. */
  emitHearthPrompt: setHearthPrompt,
  /** Show/hide the fast-travel menu. */
  emitFastTravelOpen: setFastTravelOpen,
  /** Fast-travel fade overlay opacity, clamped to [0, 1]. */
  emitFastTravelFadeOpacity: (value: number) =>
    setFastTravelFadeOpacity(Math.max(0, Math.min(1, value))),
  /** Reactive accessor — current speech bubble event, or null. */
  npcSpeech: npcSpeech as Accessor<NpcSpeechEvent | null>,
  /** Reactive accessor — current crafting panel event, or null. */
  craftingPanel: craftingPanel as Accessor<CraftingPanelEvent | null>,
  /** Reactive accessor — retreat overlay opacity in [0, 1]. */
  retreatOpacity: retreatOpacity as Accessor<number>,
  /** Reactive accessor — claim cinematic active flag. */
  claimCinematicActive: claimCinematicActive as Accessor<boolean>,
  /** Reactive accessor — hearth prompt event, or null. */
  hearthPrompt: hearthPrompt as Accessor<HearthPromptEvent | null>,
  /** Reactive accessor — fast-travel menu open flag. */
  fastTravelOpen: fastTravelOpen as Accessor<boolean>,
  /** Reactive accessor — fast-travel fade overlay opacity in [0, 1]. */
  fastTravelFadeOpacity: fastTravelFadeOpacity as Accessor<number>,

  // ── Diegetic teaching cues ────────────────────────────────────────
  /** Mark the player's first movement input as done (one-way latch). */
  emitFirstMoveDone: () => setFirstMoveDone(true),
  /** Emit (or clear with null) the contextual interact prompt. */
  emitInteractCue: setInteractCue,
  /** Reactive accessor — has the player ever moved this session? */
  firstMoveDone: firstMoveDone as Accessor<boolean>,
  /** Reactive accessor — current interact cue (or null). */
  interactCue: interactCue as Accessor<InteractCueEvent | null>,

  /** Notify the UI that the player's inventory changed (DB already written). */
  emitInventoryChanged: () => setInventoryVersion((v) => v + 1),
  /** Reactive bump counter — subscribe to know when inventory changed. */
  inventoryVersion: inventoryVersion as Accessor<number>,

  // ── Grove claim event hook ────────────────────────────────────────
  /** Subscribe to grove-claimed events. Returns an unsubscribe fn. */
  onGroveClaimed(listener: (ev: GroveClaimedEvent) => void): () => void {
    claimedListeners.add(listener);
    return () => claimedListeners.delete(listener);
  },
  /** Fires after `claimGrove` succeeds. */
  emitGroveClaimed(ev: GroveClaimedEvent): void {
    for (const fn of claimedListeners) {
      try {
        fn(ev);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("[grovekeeper] grove-claimed listener threw", error);
      }
    }
  },

  // ── Fast-travel teleport request channel ─────────────────────────
  /** UI subscribes a listener; returns an unsubscribe fn. */
  onFastTravelStart(listener: (ev: FastTravelStartEvent) => void): () => void {
    fastTravelStartListeners.add(listener);
    return () => fastTravelStartListeners.delete(listener);
  },
  /** UI fires this when the player picks a destination. */
  emitFastTravelStart(ev: FastTravelStartEvent): void {
    for (const fn of fastTravelStartListeners) {
      try {
        fn(ev);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("[grovekeeper] fast-travel listener threw", error);
      }
    }
  },
};
