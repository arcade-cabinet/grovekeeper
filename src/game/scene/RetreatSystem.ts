/**
 * RetreatSystem.
 *
 * Watches the player's HP and stamina each frame. When either hits
 * zero, triggers a faded-screen retreat:
 *   1. Fade-to-black:    `FADE_OUT_MS` (default 500ms)
 *   2. Hold black:       `HOLD_MS`     (default 1000ms)
 *      — during the hold, the player Actor is teleported to the
 *        nearest claimed grove's centre, and HP + stamina are
 *        restored to 50% (recovery feel, not a free reset).
 *   3. Fade-back:        `FADE_IN_MS`  (default 500ms)
 *
 * **No death state for RC.** This is the spec-mandated alternative.
 *
 * Retreat target selection:
 *   - Pick the nearest claimed grove (`getClaimedGroveCentres`).
 *   - If no claims exist, fall back to the starter grove at chunk (3,
 *     0)'s centre — placed deterministically by world generation.
 *
 * The system exposes a small reactive "phase" signal (`subscribe`)
 * the UI overlay reads to drive its CSS opacity / pointer-events.
 *
 * Spec ref: `docs/superpowers/specs/2026-04-24-grovekeeper-rc-redesign-design.md`
 *   §"Combat and encounters" — out-of-stamina or out-of-HP forces
 *   retreat with a faded screen transition.
 */

import worldConfig from "@/game/world/world.config.json";

/** Default starter-grove chunk coords. */
export const STARTER_GROVE_CHUNK = { x: 3, z: 0 } as const;

/** Phases the fade overlay can be in. */
export type RetreatPhase = "idle" | "fading-out" | "holding" | "fading-in";

export interface RetreatState {
  phase: RetreatPhase;
  /** Per-phase progress in `[0, 1]`; 0 at start, 1 at end. */
  progress: number;
  /** Opacity the overlay should render at, in `[0, 1]`. */
  overlayOpacity: number;
}

const DEFAULT_FADE_OUT_MS = 500;
const DEFAULT_HOLD_MS = 1000;
const DEFAULT_FADE_IN_MS = 500;

/** Restore fraction after retreat. Spec: 50% recovery, not full. */
const RETREAT_RESTORE_FRACTION = 0.5;

const SIZE = worldConfig.chunkSize;

/** A claimed grove the retreat system can target. */
export interface ClaimedGroveCentre {
  groveId: string;
  worldX: number;
  worldZ: number;
}

export interface PlayerVitals {
  hp: number;
  hpMax: number;
  stamina: number;
  staminaMax: number;
}

/** Tear-off interface for tests + production wiring. */
export interface PlayerVitalsView {
  get(): PlayerVitals | null;
  /** Restore HP + stamina to `fraction * max` for each. */
  restore(fraction: number): void;
}

/** Tear-off interface to teleport the player Actor + camera. */
export interface PlayerTeleporter {
  teleport(worldX: number, worldZ: number): void;
}

/** Tear-off list of claimed groves. Caller refreshes per-call. */
export interface ClaimedGrovesView {
  list(): readonly ClaimedGroveCentre[];
}

export interface RetreatSystemOptions {
  vitals: PlayerVitalsView;
  teleporter: PlayerTeleporter;
  groves: ClaimedGrovesView;
  fadeOutMs?: number;
  holdMs?: number;
  fadeInMs?: number;
}

/**
 * Pick the nearest claimed grove to a world position. Returns the
 * starter-grove centre if no groves are claimed. Pure function.
 */
export function pickRetreatTarget(
  player: { x: number; z: number },
  claimed: readonly ClaimedGroveCentre[],
): { worldX: number; worldZ: number } {
  if (claimed.length === 0) {
    return {
      worldX: STARTER_GROVE_CHUNK.x * SIZE + SIZE / 2,
      worldZ: STARTER_GROVE_CHUNK.z * SIZE + SIZE / 2,
    };
  }
  let best = claimed[0];
  let bestDsq = Infinity;
  for (const g of claimed) {
    const dx = g.worldX - player.x;
    const dz = g.worldZ - player.z;
    const dsq = dx * dx + dz * dz;
    if (dsq < bestDsq) {
      bestDsq = dsq;
      best = g;
    }
  }
  return { worldX: best.worldX, worldZ: best.worldZ };
}

/**
 * Stateful per-session retreat watcher. `update(dt, playerXZ)` ticks
 * once per frame; `state` exposes the overlay phase + opacity.
 */
export class RetreatSystem {
  private readonly opts: Required<
    Omit<RetreatSystemOptions, "vitals" | "teleporter" | "groves">
  > &
    Pick<RetreatSystemOptions, "vitals" | "teleporter" | "groves">;

  private phase: RetreatPhase = "idle";
  private elapsed = 0;
  private listeners: ((s: RetreatState) => void)[] = [];

  constructor(opts: RetreatSystemOptions) {
    this.opts = {
      fadeOutMs: opts.fadeOutMs ?? DEFAULT_FADE_OUT_MS,
      holdMs: opts.holdMs ?? DEFAULT_HOLD_MS,
      fadeInMs: opts.fadeInMs ?? DEFAULT_FADE_IN_MS,
      vitals: opts.vitals,
      teleporter: opts.teleporter,
      groves: opts.groves,
    };
  }

  /** Advance the state machine by `deltaMs` and return the current state. */
  update(deltaMs: number, playerXZ: { x: number; z: number }): RetreatState {
    if (this.phase === "idle") {
      // Trigger condition: HP <= 0 OR stamina <= 0.
      const v = this.opts.vitals.get();
      if (v && (v.hp <= 0 || v.stamina <= 0)) {
        this.phase = "fading-out";
        this.elapsed = 0;
      }
      return this.snapshot();
    }

    this.elapsed += deltaMs;

    if (this.phase === "fading-out") {
      if (this.elapsed >= this.opts.fadeOutMs) {
        // Switch to hold; do the actual teleport + restore once.
        const target = pickRetreatTarget(playerXZ, this.opts.groves.list());
        this.opts.teleporter.teleport(target.worldX, target.worldZ);
        this.opts.vitals.restore(RETREAT_RESTORE_FRACTION);
        this.phase = "holding";
        this.elapsed = 0;
      }
    } else if (this.phase === "holding") {
      if (this.elapsed >= this.opts.holdMs) {
        this.phase = "fading-in";
        this.elapsed = 0;
      }
    } else if (this.phase === "fading-in") {
      if (this.elapsed >= this.opts.fadeInMs) {
        this.phase = "idle";
        this.elapsed = 0;
      }
    }

    const snap = this.snapshot();
    for (const cb of this.listeners) cb(snap);
    return snap;
  }

  /** Subscribe to phase changes. Returns an unsubscribe handle. */
  subscribe(cb: (s: RetreatState) => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((x) => x !== cb);
    };
  }

  /** Read-only snapshot. */
  get state(): RetreatState {
    return this.snapshot();
  }

  /** True iff the system is mid-retreat (any non-idle phase). */
  get isActive(): boolean {
    return this.phase !== "idle";
  }

  private snapshot(): RetreatState {
    return {
      phase: this.phase,
      progress: this.phaseProgress(),
      overlayOpacity: this.computeOpacity(),
    };
  }

  private phaseProgress(): number {
    if (this.phase === "fading-out") {
      return Math.min(1, this.elapsed / this.opts.fadeOutMs);
    }
    if (this.phase === "holding") {
      return Math.min(1, this.elapsed / this.opts.holdMs);
    }
    if (this.phase === "fading-in") {
      return Math.min(1, this.elapsed / this.opts.fadeInMs);
    }
    return 0;
  }

  private computeOpacity(): number {
    if (this.phase === "idle") return 0;
    if (this.phase === "fading-out") {
      return Math.min(1, this.elapsed / this.opts.fadeOutMs);
    }
    if (this.phase === "holding") return 1;
    if (this.phase === "fading-in") {
      return Math.max(0, 1 - this.elapsed / this.opts.fadeInMs);
    }
    return 0;
  }
}
