/**
 * AudioManager — Tone.js synthesized sound effects for Grovekeeper.
 *
 * All SFX are generated programmatically via Tone.js synths (no audio
 * files required). Tones match the cozy woodland aesthetic:
 *   - Soft sine/triangle synths for UI and planting
 *   - Gentle chimes for harvesting and achievements
 *   - Filtered noise for weather and tools
 *
 * Browser autoplay policies require audio to start after a user
 * gesture. Call `startAudio()` from a click/tap handler before any
 * `audioManager.play(...)` calls to unlock the audio context.
 *
 * Usage:
 *   await startAudio();         // once, from user gesture
 *   audioManager.play("plant"); // any time after
 *   audioManager.setEnabled(false);
 */

import * as Tone from "tone";

type BasicOscType = "sine" | "triangle" | "square" | "sawtooth";

type SoundId =
  | "click"
  | "plant"
  | "water"
  | "harvest"
  | "chop"
  | "levelUp"
  | "achievement"
  | "toolSelect"
  | "seasonChange"
  | "build"
  | "error"
  | "success";

/**
 * Unlock the Tone.js audio context. Must be called from a user gesture
 * (click/tap/keydown handler) before any play() calls will emit sound.
 * Safe to call multiple times — Tone.start() resolves immediately if
 * the context is already running.
 */
export async function startAudio(): Promise<void> {
  await Tone.start();
}

class AudioManagerImpl {
  private enabled = true;
  private masterGain: Tone.Gain | null = null;
  private initialized = false;

  /** Lazy initialization — creates master gain + reusable synths. */
  private ensureInitialized(): boolean {
    if (this.initialized) return true;
    try {
      this.masterGain = new Tone.Gain(0.3).toDestination();
      this.initialized = true;
      return true;
    } catch {
      return false;
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    // Use Tone's context wrappers — they handle suspend/resume
    // semantics across browsers without cross-casting raw contexts.
    const ctx = Tone.getContext();
    if (!enabled && ctx.state === "running") {
      ctx.rawContext.suspend?.call(ctx.rawContext);
    } else if (enabled && ctx.state === "suspended") {
      ctx.resume();
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  play(id: SoundId): void {
    if (!this.enabled) return;
    if (!this.ensureInitialized()) return;
    const master = this.masterGain;
    if (!master) return;

    switch (id) {
      case "click":
        this.playTone({ freq: 800, duration: 0.04, type: "sine", gain: 0.15 });
        break;
      case "plant":
        this.playRisingTone(300, 550, 0.12, "triangle", 0.2);
        break;
      case "water":
        this.playNoiseBurst(0.1, 600, 0.12);
        break;
      case "harvest":
        this.playChime([440, 554, 659], 0.15, 0.2);
        break;
      case "chop":
        this.playNoiseBurst(0.06, 200, 0.15);
        break;
      case "levelUp":
        this.playArpeggio([523, 659, 784, 1047], 0.1, 0.2);
        break;
      case "achievement":
        this.playArpeggio([440, 554, 659, 880], 0.12, 0.25);
        // Sustain final note
        this.playTone({
          freq: 880,
          duration: 0.4,
          type: "sine",
          gain: 0.12,
          delay: 0.48,
        });
        break;
      case "toolSelect":
        this.playTone({ freq: 660, duration: 0.03, type: "square", gain: 0.08 });
        break;
      case "seasonChange":
        this.playChord([330, 440, 554], 0.5, 0.1);
        break;
      case "build":
        this.playTone({ freq: 220, duration: 0.08, type: "triangle", gain: 0.2 });
        this.playTone({
          freq: 330,
          duration: 0.08,
          type: "triangle",
          gain: 0.2,
          delay: 0.08,
        });
        break;
      case "error":
        this.playTone({ freq: 200, duration: 0.15, type: "sawtooth", gain: 0.1 });
        break;
      case "success":
        this.playTone({ freq: 520, duration: 0.06, type: "sine", gain: 0.15 });
        this.playTone({
          freq: 780,
          duration: 0.1,
          type: "sine",
          gain: 0.15,
          delay: 0.06,
        });
        break;
    }
  }

  dispose(): void {
    this.masterGain?.dispose();
    this.masterGain = null;
    this.initialized = false;
  }

  // ---------------------------------------------------------------------------
  // Primitive synthesizers — Tone.js
  // ---------------------------------------------------------------------------

  private playTone(opts: {
    freq: number;
    duration: number;
    type: BasicOscType;
    gain: number;
    delay?: number;
  }): void {
    const master = this.masterGain;
    if (!master) return;

    const synth = new Tone.Synth({
      oscillator: { type: opts.type },
      envelope: {
        attack: 0.005,
        decay: 0,
        sustain: 1,
        release: 0.01,
      },
      volume: Tone.gainToDb(opts.gain),
    }).connect(master);

    const startAt = Tone.now() + (opts.delay ?? 0);
    synth.triggerAttackRelease(opts.freq, opts.duration, startAt);

    // Auto-dispose after note ends (+small buffer)
    setTimeout(
      () => synth.dispose(),
      (opts.duration + (opts.delay ?? 0) + 0.1) * 1000,
    );
  }

  private playRisingTone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: BasicOscType,
    gain: number,
  ): void {
    const master = this.masterGain;
    if (!master) return;

    const synth = new Tone.Synth({
      oscillator: { type },
      envelope: { attack: 0.005, decay: 0, sustain: 1, release: 0.01 },
      volume: Tone.gainToDb(gain),
    }).connect(master);

    const startAt = Tone.now();
    synth.triggerAttack(freqStart, startAt);
    synth.frequency.exponentialRampTo(freqEnd, duration, startAt);
    synth.triggerRelease(startAt + duration);

    setTimeout(() => synth.dispose(), (duration + 0.1) * 1000);
  }

  private playChime(
    freqs: number[],
    noteDuration: number,
    gain: number,
  ): void {
    for (let i = 0; i < freqs.length; i++) {
      this.playTone({
        freq: freqs[i],
        duration: noteDuration,
        type: "sine",
        gain,
        delay: i * noteDuration * 0.6,
      });
    }
  }

  private playArpeggio(
    freqs: number[],
    noteGap: number,
    gain: number,
  ): void {
    for (let i = 0; i < freqs.length; i++) {
      this.playTone({
        freq: freqs[i],
        duration: noteGap * 1.5,
        type: "sine",
        gain,
        delay: i * noteGap,
      });
    }
  }

  private playChord(freqs: number[], duration: number, gain: number): void {
    for (const freq of freqs) {
      this.playTone({ freq, duration, type: "sine", gain });
    }
  }

  private playNoiseBurst(
    duration: number,
    filterFreq: number,
    gain: number,
  ): void {
    const master = this.masterGain;
    if (!master) return;

    const noise = new Tone.Noise("white").start();
    const filter = new Tone.Filter(filterFreq, "lowpass");
    const envelope = new Tone.AmplitudeEnvelope({
      attack: 0.005,
      decay: duration,
      sustain: 0,
      release: 0.01,
    });

    noise.volume.value = Tone.gainToDb(gain);
    noise.chain(filter, envelope, master);

    const startAt = Tone.now();
    envelope.triggerAttackRelease(duration, startAt);

    setTimeout(
      () => {
        noise.stop().dispose();
        filter.dispose();
        envelope.dispose();
      },
      (duration + 0.1) * 1000,
    );
  }
}

/** Singleton audio manager instance. */
export const audioManager = new AudioManagerImpl();
