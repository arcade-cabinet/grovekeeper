/**
 * GroveSpiritActor — Wave 11b.
 *
 * Renders the singular Grove Spirit at the centre of a grove chunk.
 * The Spirit is **mythic** — there is exactly one per grove, it never
 * walks, and it speaks at most a handful of words in welcome before
 * subsiding into a slow, floating idle.
 *
 * GLB asset (Wave 3b conversion): `grove-spirit.glb` — a Mermaid
 * Warrior 01 base, reserved per the Wave 3b report for "otherworldly
 * look + animation cycles". Animation library is the same massive
 * 199-clip Synty pack the Gardener uses; we only consume `Idle01`.
 *
 * --- Available animation clips (grove-spirit.glb, 199 total) ---
 *   - Idle:     "Idle01" (default), "Idle02", "IdleCombat01"
 *   - Float:    "FlyIdle01" (reserved for spec'd levitating idle if
 *               we want to swap default later — has no XZ drift)
 *   - Meditate: "Meditate01" (alternate idle for variety waves)
 *   - Talk:     "Talk01", "Talk02" (interaction-time poses; not used
 *               in RC since the speech bubble does the talking)
 *
 * This actor mirrors `PlayerActor`'s pattern (Actor + ModelRenderer
 * with `animations.default`), with two Spirit-specific differences:
 *
 *   1. **Bob.** Each frame we offset the actor's Y by a sine wave
 *      (`bobAmplitude * sin(2π * t / bobPeriod)`) on top of the
 *      ground-level spawn Y, so the Spirit hovers softly. The bob is
 *      driven by accumulated `update(dt)` time, not `Date.now()`, so
 *      it pauses cleanly when the engine pauses.
 *
 *   2. **Interact contract.** `interact()` returns the *next* phrase
 *      to display and updates an internal "first-meet" flag; the
 *      caller is responsible for actually rendering the bubble and
 *      persisting the phrase id via `dialogueRepo`. Keeping the
 *      I/O outside the Actor preserves the Wave 11a pattern where
 *      Actor classes own scene-bound state only — the database is
 *      explicitly *not* reachable from here.
 *
 * Spec ref: `docs/superpowers/specs/2026-04-24-grovekeeper-rc-redesign-design.md`
 *   §"Grove Spirit" — mythic, central, one per grove, idle animation
 *   loop, scripted welcome line on first arrival.
 */

import { type Actor, ActorComponent, ModelRenderer } from "@jolly-pixel/engine";
import {
  type DialogueContext,
  type PhrasePick,
  pickPhrase,
} from "@/game/dialogue/dialogueSystem";
import npcConfig from "./npc.config.json";

/** World-space spawn point for the Spirit. Set by `GrovePopulator`. */
export interface GroveSpiritSpawn {
  x: number;
  y: number;
  z: number;
}

export interface GroveSpiritActorOptions {
  spawn: GroveSpiritSpawn;
  /**
   * Stable id of *this Spirit* — mirrors the grove id so dialogue
   * history is keyed per grove. Spirits never share history.
   */
  spiritId: string;
  /**
   * The phrase id this NPC said most recently, loaded from
   * `dialogueRepo.getLastPhrase`. Pass `null` if there is no row yet.
   */
  lastPhraseId?: string | null;
  /**
   * Whether the player has ever interacted with this Spirit before.
   * If false, the next `interact()` call returns a `first-greet`
   * phrase and flips the flag. Persisting this signal across sessions
   * is the caller's job (use `dialogueRepo` presence as proxy in RC).
   */
  hasMet?: boolean;
}

/** Default idle clip name in `grove-spirit.glb`. */
export const SPIRIT_IDLE_CLIP = npcConfig.spirit.idleClip;
/** Bob amplitude (world units) for the floating hover. */
export const SPIRIT_BOB_AMPLITUDE = npcConfig.spirit.bobAmplitude;
/** Bob period (seconds) for the floating hover. Spec calls 4s. */
export const SPIRIT_BOB_PERIOD_SECONDS = npcConfig.spirit.bobPeriodSeconds;
const ANIM_FADE = npcConfig.spirit.animationFadeDuration;

/**
 * Asset path resolver — same `BASE_URL`-aware logic as `PlayerActor`.
 * Inlined rather than shared because the resolver is two lines and
 * carrying it through a util module would just hide the path math.
 */
export function groveSpiritModelPath(): string {
  const base =
    typeof import.meta !== "undefined" && import.meta.env?.BASE_URL
      ? import.meta.env.BASE_URL
      : "/";
  const baseTrimmed = base.endsWith("/") ? base.slice(0, -1) : base;
  return `${baseTrimmed}/${npcConfig.spirit.modelPath}`;
}

export class GroveSpiritActor extends ActorComponent {
  private readonly spawn: GroveSpiritSpawn;
  private readonly renderer: ModelRenderer;
  private readonly spiritId: string;

  /** True until the player has interacted at least once. */
  private hasMet: boolean;
  /** Last phrase id this Spirit said — primes the repeat-avoidance filter. */
  private lastPhraseId: string | null;

  /** Accumulated game time (seconds) since spawn — drives the hover bob. */
  private elapsed = 0;

  constructor(actor: Actor, options: GroveSpiritActorOptions) {
    super({ actor, typeName: "GroveSpiritActor" });
    this.spawn = options.spawn;
    this.spiritId = options.spiritId;
    this.hasMet = options.hasMet ?? false;
    this.lastPhraseId = options.lastPhraseId ?? null;

    // Place the actor root at the spawn point. The hover bob will
    // modulate `position.y` around `spawn.y` each frame.
    this.actor.object3D.position.set(this.spawn.x, this.spawn.y, this.spawn.z);

    this.renderer = this.actor.addComponentAndGet(ModelRenderer, {
      path: groveSpiritModelPath(),
      animations: {
        default: SPIRIT_IDLE_CLIP,
        fadeDuration: ANIM_FADE,
      },
    });
  }

  awake(): void {
    // We need a per-frame update for the hover bob.
    this.needUpdate = true;
  }

  update(deltaMs: number): void {
    // Clamp dt so a frame stall doesn't catapult the Spirit to the moon.
    const dt = Math.min(deltaMs, 50) / 1000;
    this.elapsed += dt;
    const omega = (2 * Math.PI) / SPIRIT_BOB_PERIOD_SECONDS;
    const offset = SPIRIT_BOB_AMPLITUDE * Math.sin(this.elapsed * omega);
    this.actor.object3D.position.y = this.spawn.y + offset;
  }

  /**
   * Pull the next phrase from the dialogue system. The caller is
   * responsible for:
   *   1. Rendering it via `<NpcSpeechBubble>` for the configured hold.
   *   2. Persisting the picked phrase id via `dialogueRepo.recordPhrase`.
   *
   * Internal state updated:
   *   - `hasMet` flips to true after the first interact call (so the
   *     next call falls into the "returning-greet" pool).
   *   - `lastPhraseId` snaps to the picked id so a *repeat* interact
   *     before the caller persists is still avoided.
   *
   * @param ctx Selector context (time of day, etc.). `firstMeet` is
   *            ignored — the Spirit owns its own first-meet flag.
   */
  interact(
    ctx: Omit<DialogueContext, "firstMeet"> = {},
    random?: () => number,
  ): PhrasePick {
    const fullCtx: DialogueContext = { ...ctx, firstMeet: !this.hasMet };
    const pick = pickPhrase("spirit", fullCtx, this.lastPhraseId, random);
    this.hasMet = true;
    this.lastPhraseId = pick.id;
    return pick;
  }

  /** True iff the player has ever talked to this Spirit. */
  get firstMeetConsumed(): boolean {
    return this.hasMet;
  }

  /** Last phrase id (post-interact). Useful for tests + persistence wiring. */
  get lastPhrase(): string | null {
    return this.lastPhraseId;
  }

  /**
   * Stable id (matches the grove id). Exposed as a method rather than
   * an `id` getter because `ActorComponent` already declares a numeric
   * `id` field on its base — colliding on the field name hits TS2611.
   */
  getId(): string {
    return this.spiritId;
  }

  /** World-space position the speech bubble should attach to. */
  get position(): { x: number; y: number; z: number } {
    const p = this.actor.object3D.position;
    return { x: p.x, y: p.y, z: p.z };
  }

  /** Exposed for tests + camera follow if RC ever wants a Spirit-cam. */
  get modelRenderer(): ModelRenderer {
    return this.renderer;
  }
}
