/**
 * AudioManager — Web Audio API synthesized sound effects for Grovekeeper.
 *
 * All SFX are generated programmatically (no audio files required).
 * Tones are designed to match the cozy woodland aesthetic:
 *   - Soft sine/triangle waves for UI and planting
 *   - Gentle chimes for harvesting and achievements
 *   - Filtered noise for weather and tools
 *
 * Usage:
 *   audioManager.play("plant");
 *   audioManager.setEnabled(false);
 */

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

class AudioManagerImpl {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private masterGain: GainNode | null = null;

  /** Lazily create AudioContext (must happen after user gesture on mobile). */
  private ensureContext(): AudioContext | null {
    // Re-create if previously disposed (self-healing singleton)
    if (this.ctx?.state === "closed") {
      this.ctx = null;
      this.masterGain = null;
    }
    if (this.ctx) return this.ctx;
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3; // conservative master volume
      this.masterGain.connect(this.ctx.destination);
      return this.ctx;
    } catch {
      return null;
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled && this.ctx?.state === "running") {
      this.ctx.suspend();
    } else if (enabled && this.ctx?.state === "suspended") {
      this.ctx.resume();
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  play(id: SoundId): void {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    const master = this.masterGain;
    if (!ctx || !master) return;

    // Resume context if suspended (e.g. after tab switch)
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    switch (id) {
      case "click":
        this.playTone(ctx, { freq: 800, duration: 0.04, type: "sine", gain: 0.15 });
        break;
      case "plant":
        this.playRisingTone(ctx, 300, 550, 0.12, "triangle", 0.2);
        break;
      case "water":
        this.playNoiseBurst(ctx, 0.1, 600, 0.12);
        break;
      case "harvest":
        this.playChime(ctx, [440, 554, 659], 0.15, 0.2);
        break;
      case "chop":
        this.playNoiseBurst(ctx, 0.06, 200, 0.15);
        break;
      case "levelUp":
        this.playArpeggio(ctx, [523, 659, 784, 1047], 0.1, 0.2);
        break;
      case "achievement":
        this.playArpeggio(ctx, [440, 554, 659, 880], 0.12, 0.25);
        // Sustain final note
        this.playTone(ctx, {
          freq: 880,
          duration: 0.4,
          type: "sine",
          gain: 0.12,
          delay: 0.48,
        });
        break;
      case "toolSelect":
        this.playTone(ctx, { freq: 660, duration: 0.03, type: "square", gain: 0.08 });
        break;
      case "seasonChange":
        this.playChord(ctx, [330, 440, 554], 0.5, 0.1);
        break;
      case "build":
        this.playTone(ctx, { freq: 220, duration: 0.08, type: "triangle", gain: 0.2 });
        this.playTone(ctx, {
          freq: 330,
          duration: 0.08,
          type: "triangle",
          gain: 0.2,
          delay: 0.08,
        });
        break;
      case "error":
        this.playTone(ctx, { freq: 200, duration: 0.15, type: "sawtooth", gain: 0.1 });
        break;
      case "success":
        this.playTone(ctx, { freq: 520, duration: 0.06, type: "sine", gain: 0.15 });
        this.playTone(ctx, {
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
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
      this.masterGain = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Primitive synthesizers
  // ---------------------------------------------------------------------------

  private playTone(
    ctx: AudioContext,
    opts: {
      freq: number;
      duration: number;
      type: OscillatorType;
      gain: number;
      delay?: number;
    },
  ): void {
    const master = this.masterGain;
    if (!master) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = opts.type;
    osc.frequency.value = opts.freq;
    gain.gain.value = opts.gain;

    const startTime = ctx.currentTime + (opts.delay ?? 0);
    const endTime = startTime + opts.duration;

    // Quick fade-out to prevent clicks
    gain.gain.setValueAtTime(opts.gain, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, endTime);

    osc.connect(gain);
    gain.connect(master);
    osc.start(startTime);
    osc.stop(endTime + 0.01);
  }

  private playRisingTone(
    ctx: AudioContext,
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType,
    gain: number,
  ): void {
    const master = this.masterGain;
    if (!master) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freqEnd, ctx.currentTime + duration);
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(g);
    g.connect(master);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.01);
  }

  private playChime(
    ctx: AudioContext,
    freqs: number[],
    noteDuration: number,
    gain: number,
  ): void {
    for (let i = 0; i < freqs.length; i++) {
      this.playTone(ctx, {
        freq: freqs[i],
        duration: noteDuration,
        type: "sine",
        gain,
        delay: i * noteDuration * 0.6, // overlapping notes
      });
    }
  }

  private playArpeggio(
    ctx: AudioContext,
    freqs: number[],
    noteGap: number,
    gain: number,
  ): void {
    for (let i = 0; i < freqs.length; i++) {
      this.playTone(ctx, {
        freq: freqs[i],
        duration: noteGap * 1.5,
        type: "sine",
        gain,
        delay: i * noteGap,
      });
    }
  }

  private playChord(
    ctx: AudioContext,
    freqs: number[],
    duration: number,
    gain: number,
  ): void {
    for (const freq of freqs) {
      this.playTone(ctx, { freq, duration, type: "sine", gain });
    }
  }

  private playNoiseBurst(
    ctx: AudioContext,
    duration: number,
    filterFreq: number,
    gain: number,
  ): void {
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = filterFreq;

    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    const master = this.masterGain;
    if (!master) return;
    source.connect(filter);
    filter.connect(g);
    g.connect(master);
    source.start();
    source.stop(ctx.currentTime + duration + 0.01);
  }
}

/** Singleton audio manager instance. */
export const audioManager = new AudioManagerImpl();
