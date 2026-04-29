/**
 * ClaimRitualSystem.
 *
 * Orchestrates the 4-second hearth-ignition cinematic that flips a
 * grove from `discovered` to `claimed`. The state machine is driven
 * by absolute millisecond timestamps so it remains deterministic in
 * tests AND in production.
 *
 * Beats (relative to `start(...)` time `t0`):
 *   t0+0.0s   Lock player input. Play `hearth.ignite` SFX. Begin
 *             emissive ramp 0 → 1.5 over 2.0s.
 *   t0+0.5s   Trigger `music.moments.spiritDiscovered` stinger.
 *   t0+2.0s   Persist via `claimGrove` + `lightHearth` (idempotent).
 *             Begin villager fade-in (0 → 1 over 1s).
 *   t0+3.0s   Spirit speaks line 2. Restore biome music.
 *   t0+4.0s   Unlock player input. Cinematic complete.
 *
 * Hooks are tear-off callbacks so tests stub them, production wires
 * them to runtime.ts. The system owns no I/O directly.
 *
 * Idempotency: `start()` while running is a no-op. `tick()` past
 * `complete` is a no-op. Per-beat side-effects fire exactly once.
 *
 * Spec ref: `docs/superpowers/specs/2026-04-24-grovekeeper-rc-redesign-design.md`
 *   §"Hearth and claim ritual".
 */

export type ClaimRitualPhase =
  | "idle"
  | "ignite"
  | "claim"
  | "settle"
  | "complete";

type Beat =
  | "lock-input"
  | "play-ignite-sfx"
  | "stinger"
  | "persist"
  | "spawn-villagers"
  | "spirit-line"
  | "restore-music"
  | "unlock-input";

export const CLAIM_RITUAL_TIMING = {
  stingerOffsetMs: 500,
  ignitePhaseMs: 2000,
  claimPhaseMs: 1000,
  settlePhaseMs: 1000,
  totalMs: 4000,
  emissivePeak: 1.5,
} as const;

export const SCRIPTED_SPIRIT_LINES = {
  line2: "It's beautiful. The grove is yours now.",
} as const;

export interface ClaimRitualHooks {
  setInputLocked(locked: boolean): void;
  playSound(id: "hearth.ignite"): void;
  playStinger(id: "music.moments.spiritDiscovered"): void;
  restoreBiomeMusic(): void;
  setHearthEmissive(intensity: number): void;
  setVillagerAlpha(alpha: number): void;
  persistClaim(): void;
  spawnVillagers(): void;
  emitSpiritLine(line: string): void;
}

export interface ClaimRitualSystemOptions {
  hooks: ClaimRitualHooks;
  timing?: Partial<typeof CLAIM_RITUAL_TIMING>;
}

export class ClaimRitualSystem {
  private readonly hooks: ClaimRitualHooks;
  private readonly timing: typeof CLAIM_RITUAL_TIMING;
  private phase: ClaimRitualPhase = "idle";
  private startedAt = 0;
  private firedBeats = new Set<Beat>();

  constructor(opts: ClaimRitualSystemOptions) {
    this.hooks = opts.hooks;
    this.timing = { ...CLAIM_RITUAL_TIMING, ...(opts.timing ?? {}) };
  }

  start(now: number): void {
    if (this.phase !== "idle" && this.phase !== "complete") return;
    this.phase = "ignite";
    this.startedAt = now;
    this.firedBeats = new Set();
    this.fireBeat("lock-input");
    this.fireBeat("play-ignite-sfx");
    this.hooks.setHearthEmissive(0);
    this.hooks.setVillagerAlpha(0);
  }

  tick(now: number): void {
    if (this.phase === "idle" || this.phase === "complete") return;
    const elapsed = now - this.startedAt;

    if (this.phase === "ignite") {
      const ramp = Math.min(1, elapsed / this.timing.ignitePhaseMs);
      this.hooks.setHearthEmissive(ramp * this.timing.emissivePeak);
      if (elapsed >= this.timing.stingerOffsetMs) this.fireBeat("stinger");
      if (elapsed >= this.timing.ignitePhaseMs) {
        this.phase = "claim";
      }
    }

    if (this.phase === "claim") {
      this.hooks.setHearthEmissive(this.timing.emissivePeak);
      this.fireBeat("persist");
      this.fireBeat("spawn-villagers");
      const claimElapsed = elapsed - this.timing.ignitePhaseMs;
      const fade = Math.min(1, claimElapsed / this.timing.claimPhaseMs);
      this.hooks.setVillagerAlpha(fade);
      if (elapsed >= this.timing.ignitePhaseMs + this.timing.claimPhaseMs) {
        this.phase = "settle";
      }
    }

    if (this.phase === "settle") {
      this.hooks.setHearthEmissive(this.timing.emissivePeak);
      this.hooks.setVillagerAlpha(1);
      this.fireBeat("spirit-line");
      this.fireBeat("restore-music");
      if (elapsed >= this.timing.totalMs) {
        this.fireBeat("unlock-input");
        this.phase = "complete";
      }
    }
  }

  get currentPhase(): ClaimRitualPhase {
    return this.phase;
  }

  get isActive(): boolean {
    return this.phase !== "idle" && this.phase !== "complete";
  }

  get firedBeatsSnapshot(): readonly string[] {
    return Array.from(this.firedBeats);
  }

  reset(): void {
    this.phase = "idle";
    this.startedAt = 0;
    this.firedBeats = new Set();
  }

  private fireBeat(beat: Beat): void {
    if (this.firedBeats.has(beat)) return;
    this.firedBeats.add(beat);
    switch (beat) {
      case "lock-input":
        this.hooks.setInputLocked(true);
        return;
      case "play-ignite-sfx":
        this.hooks.playSound("hearth.ignite");
        return;
      case "stinger":
        this.hooks.playStinger("music.moments.spiritDiscovered");
        return;
      case "persist":
        this.hooks.persistClaim();
        return;
      case "spawn-villagers":
        this.hooks.spawnVillagers();
        return;
      case "spirit-line":
        this.hooks.emitSpiritLine(SCRIPTED_SPIRIT_LINES.line2);
        return;
      case "restore-music":
        this.hooks.restoreBiomeMusic();
        return;
      case "unlock-input":
        this.hooks.setInputLocked(false);
        return;
    }
  }
}
