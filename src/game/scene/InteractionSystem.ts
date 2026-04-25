/**
 * InteractionSystem — Wave 11b.
 *
 * Listens for the `interact` action's rising edge each frame, finds
 * the nearest NPC inside `interactionRangeMeters` of the player, asks
 * that NPC for its next phrase, and surfaces the result through a
 * subscriber callback so the UI layer can mount `<NpcSpeechBubble>`.
 *
 * Why a system, not a method on `PlayerActor`:
 *   - The player doesn't *own* NPCs; the InteractionSystem reaches
 *     across actors. Living next to PlayerActor in `scene/` keeps it
 *     near its dependencies but separate from movement code.
 *   - Persistence is the system's job: when it picks a phrase, it
 *     calls `onPhrase(npcId, phraseId, text)` and the caller can
 *     forward to `dialogueRepo.recordPhrase(...)` without the actors
 *     ever knowing about a database.
 *
 * Pure-ish: the system has no DOM handles. The caller wires it to a
 * frame tick (typically the same loop that ticks `PlayerActor`).
 */

import type {
  DialogueContext,
  PhrasePick,
} from "@/game/dialogue/dialogueSystem";
import type { GroveSpiritActor } from "./GroveSpiritActor";
import type { VillagerActor } from "./VillagerActor";
import npcConfig from "./npc.config.json";

/** What the system needs to read the player's "interact" rising edge. */
export interface InteractionInput {
  getActionState(action: "interact"): { pressed: boolean; justPressed: boolean };
}

/** What the system needs from the player to range-test. */
export interface InteractionPlayer {
  position: { x: number; y: number; z: number };
}

/** Anything that exposes `getId()`, `position`, and `interact()`. */
export interface InteractableNpc {
  getId(): string;
  position: { x: number; y: number; z: number };
  interact(ctx?: Omit<DialogueContext, "firstMeet">): PhrasePick;
}

export interface InteractionSystemOptions {
  player: InteractionPlayer;
  input: InteractionInput;
  /**
   * Returns the live list of NPCs the player can talk to. The system
   * calls this every interact press; cheap (the populator keeps a
   * small array per active grove).
   */
  getNpcs: () => readonly InteractableNpc[];
  /**
   * Optional context provider — the system calls this each interact to
   * pull `timeOfDay` etc. for the phrase selector. Returns at most an
   * empty object if the caller doesn't care.
   */
  getContext?: () => Omit<DialogueContext, "firstMeet">;
  /**
   * Called whenever the system picks a phrase. Caller is responsible
   * for displaying the bubble (`<NpcSpeechBubble>`) AND for persisting
   * the picked phrase id via `dialogueRepo.recordPhrase`.
   */
  onPhrase: (event: InteractionEvent) => void;
  /** Override interact range. Defaults to `npc.config.json`. */
  rangeMeters?: number;
}

export interface InteractionEvent {
  /** Source NPC's stable id (matches `actor.id`). */
  npcId: string;
  /** The phrase pick the NPC produced. */
  pick: PhrasePick;
  /**
   * NPC world-space position at interact time. The UI layer projects
   * this through the camera to get a screen position for the bubble.
   */
  position: { x: number; y: number; z: number };
}

export const DEFAULT_INTERACTION_RANGE = npcConfig.interaction.rangeMeters;

/**
 * Frame-driven NPC interaction. Wire `tick()` into the same per-frame
 * loop that ticks `PlayerActor`. Cheap when the player is not pressing
 * `interact` — early-outs on the first action read.
 */
export class InteractionSystem {
  private readonly player: InteractionPlayer;
  private readonly input: InteractionInput;
  private readonly getNpcs: () => readonly InteractableNpc[];
  private readonly getContext: () => Omit<DialogueContext, "firstMeet">;
  private readonly onPhrase: (event: InteractionEvent) => void;
  private readonly rangeMeters: number;

  constructor(options: InteractionSystemOptions) {
    this.player = options.player;
    this.input = options.input;
    this.getNpcs = options.getNpcs;
    this.getContext = options.getContext ?? (() => ({}));
    this.onPhrase = options.onPhrase;
    this.rangeMeters = options.rangeMeters ?? DEFAULT_INTERACTION_RANGE;
  }

  /**
   * Frame tick. Call once per game-loop iteration.
   *
   * Behavior:
   *   - If the `interact` action is NOT on its rising edge this frame,
   *     do nothing.
   *   - Otherwise, find the NPC whose XZ distance to the player is
   *     minimum AND ≤ `rangeMeters`. (Y is ignored — players and NPCs
   *     stand on the same ground plane in RC.)
   *   - Call `npc.interact(ctx)` to produce a phrase pick, then
   *     forward to `onPhrase`.
   */
  tick(): void {
    const button = this.input.getActionState("interact");
    if (!button.justPressed) return;

    const nearest = this.findNearestInRange();
    if (!nearest) return;

    const ctx = this.getContext();
    const pick = nearest.interact(ctx);
    this.onPhrase({
      npcId: nearest.getId(),
      pick,
      position: { ...nearest.position },
    });
  }

  /**
   * Internal: nearest NPC within `rangeMeters` (XZ plane). Public-ish
   * for tests, exposed via `findNearest` symbol below.
   */
  findNearestInRange(): InteractableNpc | null {
    const r2 = this.rangeMeters * this.rangeMeters;
    let best: InteractableNpc | null = null;
    let bestDistSq = Number.POSITIVE_INFINITY;
    const px = this.player.position.x;
    const pz = this.player.position.z;
    for (const npc of this.getNpcs()) {
      const dx = npc.position.x - px;
      const dz = npc.position.z - pz;
      const d2 = dx * dx + dz * dz;
      if (d2 > r2) continue;
      if (d2 < bestDistSq) {
        bestDistSq = d2;
        best = npc;
      }
    }
    return best;
  }
}

/**
 * Type-only helper so callers can wire actor instances directly:
 *
 *     getNpcs: () => [...spirits, ...villagers] as InteractableNpc[]
 */
export type AnyNpcActor = GroveSpiritActor | VillagerActor;
