/**
 * CreatureActor — Wave 14/15.
 *
 * Animated outer-world fauna. Mirrors `VillagerActor`'s
 * `ActorComponent + ModelRenderer + state-machine` shape but with a
 * combat-aware AI: peaceful creatures flee on player approach;
 * hostile creatures chase + attack the player.
 *
 * State machine (drives clip selection too):
 *   - `idle`   → after deterministic 2-5s timer → `wander`
 *   - `wander` → straight-line walk to a random target inside
 *                `wanderRadius` of the spawn anchor → `idle`
 *   - `flee`   (peaceful only) → run away from player at `fleeSpeed`.
 *                Returns to `wander` after 5s outside `panicRadius`.
 *   - `chase`  (hostile only) → run toward player at `fleeSpeed`.
 *                Reaches `attackRange` → `attack`. Player escapes
 *                aggro radius OR creature `hp <= 25%` → `flee`.
 *   - `attack` (hostile only) → plays attack clip; deals
 *                `damagePerHit` to the player on the swing's apex
 *                via `onPlayerHit` callback. Cooldown then chase.
 *   - `hurt`   → brief stagger from a player hit. Clears to
 *                previous state. If `hp <= 0` → marks `dead`
 *                (caller despawns; spec: "no death animation").
 *
 * Determinism: every random roll flows through the supplied
 * `random()` callback, which the populator wires from
 * `scopedRNG('creature', worldSeed, chunkX, chunkZ, index)`.
 *
 * Player position is supplied per-frame by the caller via
 * `setPlayerPosition(x, z)` so the actor doesn't have to import
 * Koota directly (keeps it pure for tests).
 *
 * Spec ref: `docs/superpowers/specs/2026-04-24-grovekeeper-rc-redesign-design.md`
 *   §"Combat and encounters" — simple state machines, no death state
 *   (the player retreat is the death surrogate; *creatures* still
 *   despawn but with a hit reaction, not a dramatic death animation).
 */

import { type Actor, ActorComponent, ModelRenderer } from "@jolly-pixel/engine";
import type { CreatureDef } from "@/content/creatures";

/** Public state name; useful for tests and HUD. */
export type CreatureState =
  | "idle"
  | "wander"
  | "flee"
  | "chase"
  | "attack"
  | "hurt"
  | "dead";

export interface CreatureSpawn {
  x: number;
  y: number;
  z: number;
}

export interface CreatureActorOptions {
  spawn: CreatureSpawn;
  /** Stable id used for despawn lookups. */
  creatureId: string;
  def: CreatureDef;
  /** Deterministic [0,1) source. */
  random: () => number;
  /**
   * Optional callback fired when a hostile creature lands an attack
   * on the player. Damage value is the def's `damagePerHit`.
   */
  onPlayerHit?: (damage: number, creatureId: string) => void;
}

/** Distance at which a hostile creature stops chasing and swings. */
const ATTACK_RANGE = 1.5;
/** Seconds between hostile attack swings. */
const ATTACK_COOLDOWN_SECONDS = 1.6;
/** Seconds the `hurt` stagger lasts before reverting. */
const HURT_DURATION_SECONDS = 0.4;
/** Seconds outside panicRadius before peaceful returns to wander. */
const FLEE_COOLDOWN_SECONDS = 5.0;
/** Crossfade between clips. Same value VillagerActor uses. */
const ANIM_FADE = 0.2;
/** Position-equality threshold for "arrived at wander target". */
const MOVE_EPS_SQ = 0.01;
/** Yaw-lerp factor, same shape PlayerActor / VillagerActor use. */
const FACING_LERP = 0.18;
/** Idle range — random pause before next wander, in seconds. */
const IDLE_MIN_SECONDS = 2.0;
const IDLE_MAX_SECONDS = 5.0;
/** HP fraction at which hostiles break off chase to flee. */
const FLEE_HP_FRACTION = 0.25;

/**
 * Resolve the creature's GLB path through Vite's BASE_URL so dev
 * (`/`) and Pages (`/grovekeeper/`) both resolve correctly.
 */
export function creatureModelPath(def: CreatureDef): string {
  const base =
    typeof import.meta !== "undefined" && import.meta.env?.BASE_URL
      ? import.meta.env.BASE_URL
      : "/";
  const baseTrimmed = base.endsWith("/") ? base.slice(0, -1) : base;
  return `${baseTrimmed}/${def.glb}`;
}

interface InternalState {
  kind: CreatureState;
  /** Walk/wander target. */
  targetX?: number;
  targetZ?: number;
  /** Generic timer for state phases. */
  timer?: number;
  /** Last known player x/z for chase/flee directions. */
  playerX?: number;
  playerZ?: number;
}

export class CreatureActor extends ActorComponent {
  private readonly spawn: CreatureSpawn;
  private readonly creatureId: string;
  private readonly def: CreatureDef;
  private readonly random: () => number;
  private readonly onPlayerHit:
    | ((damage: number, creatureId: string) => void)
    | undefined;
  private readonly renderer: ModelRenderer;

  private internalState: InternalState = { kind: "idle", timer: 0 };
  private currentClip: string;
  private hp: number;
  private playerX: number | null = null;
  private playerZ: number | null = null;
  /** Cooldown remaining before next attack swing (hostile only). */
  private attackCooldown = 0;

  constructor(actor: Actor, options: CreatureActorOptions) {
    super({ actor, typeName: "CreatureActor" });
    this.spawn = options.spawn;
    this.creatureId = options.creatureId;
    this.def = options.def;
    this.random = options.random;
    this.onPlayerHit = options.onPlayerHit;
    this.hp = options.def.hpMax;
    this.currentClip = options.def.idleClip;

    this.actor.object3D.position.set(this.spawn.x, this.spawn.y, this.spawn.z);

    this.renderer = this.actor.addComponentAndGet(ModelRenderer, {
      path: creatureModelPath(this.def),
      animations: {
        default: this.def.idleClip,
        fadeDuration: ANIM_FADE,
      },
    });
  }

  awake(): void {
    this.internalState = {
      kind: "idle",
      timer: this.rollIdleTime(),
    };
    this.needUpdate = true;
  }

  /** Drives the state machine. Call once per render frame. */
  update(deltaMs: number): void {
    if (this.internalState.kind === "dead") return;
    const dt = Math.min(deltaMs, 50) / 1000;

    // Hurt is preemptive — overrides every other state.
    if (this.internalState.kind === "hurt") {
      this.internalState.timer = (this.internalState.timer ?? 0) - dt;
      this.requestClip(this.def.hurtClip ?? this.def.idleClip);
      if ((this.internalState.timer ?? 0) <= 0) {
        // Recover into wander so the creature visibly resumes life.
        this.internalState = { kind: "wander", ...this.pickWanderTarget() };
      }
      return;
    }

    if (this.attackCooldown > 0) this.attackCooldown -= dt;

    // Player-aware transitions.
    const playerDistSq = this.playerDistSq();
    if (playerDistSq !== null) {
      if (this.def.hostility === "peaceful") {
        const panic = this.def.panicRadius ?? 0;
        if (panic > 0 && playerDistSq < panic * panic) {
          // Drop everything and flee. timer = elapsed-outside-radius.
          this.internalState = {
            kind: "flee",
            timer: 0,
            playerX: this.playerX ?? 0,
            playerZ: this.playerZ ?? 0,
          };
        }
      } else {
        // Hostile.
        const aggro = this.def.aggroRadius ?? 0;
        const hpFraction = this.hp / Math.max(1, this.def.hpMax);
        if (
          aggro > 0 &&
          playerDistSq < aggro * aggro &&
          hpFraction > FLEE_HP_FRACTION
        ) {
          if (
            this.internalState.kind !== "chase" &&
            this.internalState.kind !== "attack"
          ) {
            this.internalState = { kind: "chase" };
          }
        } else if (hpFraction <= FLEE_HP_FRACTION) {
          if (this.internalState.kind !== "flee") {
            this.internalState = {
              kind: "flee",
              timer: 0,
              playerX: this.playerX ?? 0,
              playerZ: this.playerZ ?? 0,
            };
          }
        }
      }
    }

    switch (this.internalState.kind) {
      case "idle":
        this.tickIdle(dt);
        break;
      case "wander":
        this.tickWander(dt);
        break;
      case "flee":
        this.tickFlee(dt, playerDistSq);
        break;
      case "chase":
        this.tickChase(dt);
        break;
      case "attack":
        this.tickAttack(dt);
        break;
      default:
        break;
    }
  }

  /** Feed the actor the player's world XZ each frame. */
  setPlayerPosition(x: number, z: number): void {
    this.playerX = x;
    this.playerZ = z;
  }

  /** Apply damage from the player. Returns true if this hit killed it. */
  applyDamage(amount: number): boolean {
    if (this.internalState.kind === "dead") return false;
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0) {
      this.internalState = { kind: "dead" };
      this.requestClip(this.def.hurtClip ?? this.def.idleClip);
      return true;
    }
    this.internalState = { kind: "hurt", timer: HURT_DURATION_SECONDS };
    return false;
  }

  // ─── Getters ────────────────────────────────────────────────

  get state(): CreatureState {
    return this.internalState.kind;
  }

  get currentHp(): number {
    return this.hp;
  }

  get clip(): string {
    return this.currentClip;
  }

  /** Stable id. Not named `id` because `ActorComponent.id` is numeric. */
  getId(): string {
    return this.creatureId;
  }

  get species(): string {
    return this.def.species;
  }

  /** Hostility — exposed for combat targeting. */
  get hostility(): "peaceful" | "hostile" {
    return this.def.hostility;
  }

  get position(): { x: number; y: number; z: number } {
    const p = this.actor.object3D.position;
    return { x: p.x, y: p.y, z: p.z };
  }

  get modelRenderer(): ModelRenderer {
    return this.renderer;
  }

  // ─── Internals ──────────────────────────────────────────────

  private playerDistSq(): number | null {
    if (this.playerX === null || this.playerZ === null) return null;
    const pos = this.actor.object3D.position;
    const dx = this.playerX - pos.x;
    const dz = this.playerZ - pos.z;
    return dx * dx + dz * dz;
  }

  private rollIdleTime(): number {
    return (
      IDLE_MIN_SECONDS + this.random() * (IDLE_MAX_SECONDS - IDLE_MIN_SECONDS)
    );
  }

  private pickWanderTarget(): { targetX: number; targetZ: number } {
    const angle = this.random() * 2 * Math.PI;
    const r = this.random() * this.def.wanderRadius;
    return {
      targetX: this.spawn.x + Math.cos(angle) * r,
      targetZ: this.spawn.z + Math.sin(angle) * r,
    };
  }

  private tickIdle(dt: number): void {
    this.requestClip(this.def.idleClip);
    this.internalState.timer = (this.internalState.timer ?? 0) - dt;
    if ((this.internalState.timer ?? 0) <= 0) {
      this.internalState = { kind: "wander", ...this.pickWanderTarget() };
    }
  }

  private tickWander(dt: number): void {
    this.requestClip(this.def.walkClip);
    const tx = this.internalState.targetX ?? this.spawn.x;
    const tz = this.internalState.targetZ ?? this.spawn.z;
    if (this.stepToward(tx, tz, this.def.walkSpeed, dt)) {
      // Arrived — back to idle.
      this.internalState = { kind: "idle", timer: this.rollIdleTime() };
    }
  }

  private tickFlee(dt: number, playerDistSq: number | null): void {
    this.requestClip(this.def.runClip ?? this.def.walkClip);
    // Move directly away from current player position (live, not the
    // snapshot in state — keeps the run feeling responsive).
    if (this.playerX !== null && this.playerZ !== null) {
      const pos = this.actor.object3D.position;
      const dx = pos.x - this.playerX;
      const dz = pos.z - this.playerZ;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > 1e-4) {
        const nx = dx / dist;
        const nz = dz / dist;
        const step = this.def.fleeSpeed * dt;
        pos.x += nx * step;
        pos.z += nz * step;
        this.lerpFacing(nx, nz);
      }
    }

    // Recover after FLEE_COOLDOWN_SECONDS outside the panic radius.
    const panicSq = (this.def.panicRadius ?? this.def.aggroRadius ?? 0) ** 2;
    if (playerDistSq !== null && panicSq > 0 && playerDistSq > panicSq) {
      this.internalState.timer = (this.internalState.timer ?? 0) + dt;
      if ((this.internalState.timer ?? 0) >= FLEE_COOLDOWN_SECONDS) {
        this.internalState = { kind: "idle", timer: this.rollIdleTime() };
      }
    } else {
      // Reset cooldown — player is still close.
      this.internalState.timer = 0;
    }
  }

  private tickChase(dt: number): void {
    this.requestClip(this.def.runClip ?? this.def.walkClip);
    if (this.playerX === null || this.playerZ === null) return;
    const pos = this.actor.object3D.position;
    const dx = this.playerX - pos.x;
    const dz = this.playerZ - pos.z;
    const distSq = dx * dx + dz * dz;
    if (distSq <= ATTACK_RANGE * ATTACK_RANGE) {
      this.internalState = { kind: "attack", timer: 0 };
      return;
    }
    const dist = Math.sqrt(distSq);
    if (dist > 1e-4) {
      const nx = dx / dist;
      const nz = dz / dist;
      const step = this.def.fleeSpeed * dt;
      pos.x += nx * step;
      pos.z += nz * step;
      this.lerpFacing(nx, nz);
    }
  }

  private tickAttack(dt: number): void {
    this.requestClip(this.def.attackClip ?? this.def.idleClip);
    this.internalState.timer = (this.internalState.timer ?? 0) + dt;
    // The attack lands once per swing at the swing apex (~mid-cycle);
    // we keep this simple — fire once when timer crosses 0.5s, then
    // wait full cooldown before resetting to chase.
    if (this.attackCooldown <= 0 && (this.internalState.timer ?? 0) >= 0.5) {
      this.attackCooldown = ATTACK_COOLDOWN_SECONDS;
      const dmg = this.def.damagePerHit ?? 0;
      if (dmg > 0) this.onPlayerHit?.(dmg, this.creatureId);
    }
    if ((this.internalState.timer ?? 0) >= ATTACK_COOLDOWN_SECONDS) {
      // Either the player is still in range → re-enter chase (which
      // immediately re-attacks if they're close enough), or they
      // escaped → chase decays out via aggro check on next tick.
      this.internalState = { kind: "chase" };
    }
  }

  /**
   * Move toward (tx, tz) at `speed` u/s for `dt` seconds. Returns
   * true if we arrived this tick.
   */
  private stepToward(
    tx: number,
    tz: number,
    speed: number,
    dt: number,
  ): boolean {
    const pos = this.actor.object3D.position;
    const dx = tx - pos.x;
    const dz = tz - pos.z;
    const distSq = dx * dx + dz * dz;
    if (distSq < MOVE_EPS_SQ) return true;
    const dist = Math.sqrt(distSq);
    const stepLen = speed * dt;
    if (stepLen >= dist) {
      pos.x = tx;
      pos.z = tz;
      return true;
    }
    const nx = dx / dist;
    const nz = dz / dist;
    pos.x += nx * stepLen;
    pos.z += nz * stepLen;
    this.lerpFacing(nx, nz);
    return false;
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
      /* mixer not ready yet; default clip will engage when loaded */
    }
  }
}
