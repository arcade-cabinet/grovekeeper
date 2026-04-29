/**
 * VillagerActor — Wave 11b.
 *
 * Renders one Neanderthal-styled villager that wanders inside its
 * grove. Per Wave 3b's report, the Neanderthal pack was reserved as
 * the villager candidates and curated to four variants:
 *   - villager-elder.glb
 *   - villager-cook.glb
 *   - villager-smith.glb
 *   - villager-coast.glb
 *
 * All four share the same 199-clip Synty animation library as the
 * Gardener and the Grove Spirit, so the clip names below are the
 * same canonical strings the player uses (`Idle01`, `Walk01`).
 *
 * Wander AI:
 *   - Anchored at `spawn` (the chunk-centre + offset chosen by the
 *     populator). Each "leg" picks a target inside a small radius
 *     around `spawn`, walks toward it, idles for a pause, picks
 *     another. Determinism via the `scopedRNG('villager-wander', ...)`
 *     the populator hands in.
 *   - **No pathfinding.** Groves are flat by spec ("luminous grass
 *     over gilded dirt over alabaster stone"); the wander leg is a
 *     straight-line lerp at a stately pace.
 *   - Animation swaps on the same `currentClip`-tracking pattern
 *     `PlayerActor` uses so the mixer never gets spammed.
 *
 * Interact contract is identical to `GroveSpiritActor.interact` —
 * pulls the next phrase from `dialogueSystem`, advances internal
 * `lastPhraseId`, and returns the pick. Villagers never have a
 * "first-meet" line; the system selector handles that distinction.
 *
 * Spec ref: `docs/superpowers/specs/2026-04-24-grovekeeper-rc-redesign-design.md`
 *   §"NPCs in groves" — peaceful villagers, phrase-pool dialogue,
 *   no quest chains, no fetch tasks.
 */

import { type Actor, ActorComponent, ModelRenderer } from "@jolly-pixel/engine";
import {
  type DialogueContext,
  type PhrasePick,
  pickPhrase,
} from "@/game/dialogue/dialogueSystem";
import npcConfig from "./npc.config.json";

export interface VillagerSpawn {
  x: number;
  y: number;
  z: number;
}

export interface VillagerActorOptions {
  spawn: VillagerSpawn;
  /** Stable id for this villager — `<groveId>:villager:<n>`. */
  villagerId: string;
  /**
   * Which villager GLB to render. 0..3 indexes the
   * `npc.config.json:villager.models` list. The populator chooses
   * the variant deterministically from the chunk RNG.
   */
  modelVariant: number;
  /**
   * Deterministic RNG for wander rolls. Pass a `scopedRNG('villager-wander',
   * worldSeed, chunkX, chunkZ, villagerIndex)` so reloading a save
   * doesn't reroll the wander targets mid-walk.
   */
  random: () => number;
  /** Last phrase id from `dialogueRepo.getLastPhrase`. */
  lastPhraseId?: string | null;
}

export const VILLAGER_IDLE_CLIP = npcConfig.villager.idleClip;
export const VILLAGER_WALK_CLIP = npcConfig.villager.walkClip;
export const VILLAGER_MOVE_SPEED = npcConfig.villager.moveSpeed;
export const VILLAGER_WANDER_RADIUS = npcConfig.villager.wanderRadius;
export const VILLAGER_WANDER_PAUSE_SECONDS =
  npcConfig.villager.wanderPauseSeconds;
const MOVE_EPS = npcConfig.villager.moveEpsilon;
const FACING_LERP = npcConfig.villager.facingLerp;
const ANIM_FADE = npcConfig.villager.animationFadeDuration;
const VILLAGER_MODELS = npcConfig.villager.models;

/** Resolve the i-th variant's GLB path through Vite's BASE_URL. */
export function villagerModelPath(variant: number): string {
  const base =
    typeof import.meta !== "undefined" && import.meta.env?.BASE_URL
      ? import.meta.env.BASE_URL
      : "/";
  const baseTrimmed = base.endsWith("/") ? base.slice(0, -1) : base;
  const v =
    ((variant % VILLAGER_MODELS.length) + VILLAGER_MODELS.length) %
    VILLAGER_MODELS.length;
  return `${baseTrimmed}/${VILLAGER_MODELS[v]}`;
}

/**
 * Internal wander state — either walking toward a target or paused
 * idle for a configured number of seconds before picking the next.
 */
type WanderState =
  | { kind: "walking"; targetX: number; targetZ: number }
  | { kind: "paused"; remainingSeconds: number };

export class VillagerActor extends ActorComponent {
  private readonly spawn: VillagerSpawn;
  private readonly villagerId: string;
  private readonly random: () => number;
  private readonly renderer: ModelRenderer;
  private readonly modelVariant: number;

  private state: WanderState = { kind: "paused", remainingSeconds: 0 };
  private currentClip: string = VILLAGER_IDLE_CLIP;
  private lastPhraseId: string | null;

  constructor(actor: Actor, options: VillagerActorOptions) {
    super({ actor, typeName: "VillagerActor" });
    this.spawn = options.spawn;
    this.villagerId = options.villagerId;
    this.random = options.random;
    this.modelVariant = options.modelVariant;
    this.lastPhraseId = options.lastPhraseId ?? null;

    this.actor.object3D.position.set(this.spawn.x, this.spawn.y, this.spawn.z);

    this.renderer = this.actor.addComponentAndGet(ModelRenderer, {
      path: villagerModelPath(this.modelVariant),
      animations: {
        default: VILLAGER_IDLE_CLIP,
        fadeDuration: ANIM_FADE,
      },
    });
  }

  awake(): void {
    // First leg: pause briefly so spawning villagers don't all
    // simultaneously start walking on frame 0 (looks scripted).
    this.state = {
      kind: "paused",
      remainingSeconds: this.random() * VILLAGER_WANDER_PAUSE_SECONDS,
    };
    this.needUpdate = true;
  }

  update(deltaMs: number): void {
    const dt = Math.min(deltaMs, 50) / 1000;

    if (this.state.kind === "paused") {
      this.state.remainingSeconds -= dt;
      this.requestClip(VILLAGER_IDLE_CLIP);
      if (this.state.remainingSeconds <= 0) {
        this.state = this.pickNewWanderTarget();
      }
      return;
    }

    // Walking toward (targetX, targetZ).
    const pos = this.actor.object3D.position;
    const dx = this.state.targetX - pos.x;
    const dz = this.state.targetZ - pos.z;
    const distSq = dx * dx + dz * dz;

    if (distSq < MOVE_EPS) {
      // Arrived. Pause for the configured idle window before next leg.
      this.state = {
        kind: "paused",
        remainingSeconds: VILLAGER_WANDER_PAUSE_SECONDS,
      };
      this.requestClip(VILLAGER_IDLE_CLIP);
      return;
    }

    const dist = Math.sqrt(distSq);
    const stepLen = VILLAGER_MOVE_SPEED * dt;
    if (stepLen >= dist) {
      // Snap to target this frame; next update will switch to paused.
      pos.x = this.state.targetX;
      pos.z = this.state.targetZ;
    } else {
      const nx = dx / dist;
      const nz = dz / dist;
      pos.x += nx * stepLen;
      pos.z += nz * stepLen;
      this.lerpFacing(nx, nz);
    }
    this.requestClip(VILLAGER_WALK_CLIP);
  }

  /**
   * Choose the next wander target. Public-ish for tests — they patch
   * the RNG to drive coverage of the wander leg. Pure-ish: only reads
   * `this.random` and `this.spawn`.
   */
  private pickNewWanderTarget(): WanderState {
    const angle = this.random() * 2 * Math.PI;
    const radius = this.random() * VILLAGER_WANDER_RADIUS;
    return {
      kind: "walking",
      targetX: this.spawn.x + Math.cos(angle) * radius,
      targetZ: this.spawn.z + Math.sin(angle) * radius,
    };
  }

  private lerpFacing(mx: number, mz: number): void {
    const target = Math.atan2(mx, mz);
    const obj = this.actor.object3D;
    const current = obj.rotation.y;
    let delta = target - current;
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta < -Math.PI) delta += 2 * Math.PI;
    obj.rotation.y = current + delta * FACING_LERP;
  }

  private requestClip(clip: string): void {
    if (clip === this.currentClip) return;
    this.currentClip = clip;
    try {
      this.renderer.animation.play(clip, {
        loop: true,
        fadeInDuration: ANIM_FADE,
        fadeOutDuration: ANIM_FADE,
      });
    } catch {
      /* mixer not ready; default clip will engage once loaded */
    }
  }

  /** Pull the next phrase. See `GroveSpiritActor.interact` for contract. */
  interact(
    ctx: Omit<DialogueContext, "firstMeet"> = {},
    random?: () => number,
  ): PhrasePick {
    // Villagers don't have a first-meet pool — ignore the flag here.
    const fullCtx: DialogueContext = { ...ctx, firstMeet: false };
    const pick = pickPhrase("villager", fullCtx, this.lastPhraseId, random);
    this.lastPhraseId = pick.id;
    return pick;
  }

  /**
   * Stable id. Exposed as a method to avoid colliding with
   * `ActorComponent.id` (numeric, declared on the base class).
   */
  getId(): string {
    return this.villagerId;
  }

  get clip(): string {
    return this.currentClip;
  }

  get lastPhrase(): string | null {
    return this.lastPhraseId;
  }

  get position(): { x: number; y: number; z: number } {
    const p = this.actor.object3D.position;
    return { x: p.x, y: p.y, z: p.z };
  }

  get modelRenderer(): ModelRenderer {
    return this.renderer;
  }

  setOpacity(alpha: number): void {
    this.renderer.group.traverse((obj) => {
      const mesh = obj as { isMesh?: boolean; material?: unknown };
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      for (const mat of mats) {
        const m = mat as { transparent?: boolean; opacity?: number } | null;
        if (!m) continue;
        m.transparent = alpha < 1;
        m.opacity = alpha;
      }
    });
  }
}
