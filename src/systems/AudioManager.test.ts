import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock tone.js — the test environment (happy-dom) doesn't provide a
// real AudioContext, so we stub Tone's surface area to no-ops and just
// verify the manager's public API (enabled state + dispose + no
// throws) plus spy on Tone construction calls.

const synthCtor = vi.fn();
const noiseCtor = vi.fn();
const filterCtor = vi.fn();
const gainCtor = vi.fn();
const envelopeCtor = vi.fn();

vi.mock("tone", () => {
  const makeChainable = <T extends object>(extra: T = {} as T) =>
    Object.assign(
      {
        connect: vi.fn(function (this: object) {
          return this;
        }),
        chain: vi.fn(function (this: object) {
          return this;
        }),
        toDestination: vi.fn(function (this: object) {
          return this;
        }),
        dispose: vi.fn(),
        start: vi.fn(function (this: object) {
          return this;
        }),
        stop: vi.fn(function (this: object) {
          return this;
        }),
        triggerAttack: vi.fn(),
        triggerRelease: vi.fn(),
        triggerAttackRelease: vi.fn(),
        frequency: {
          value: 0,
          exponentialRampTo: vi.fn(),
        },
        volume: { value: 0 },
      },
      extra,
    );

  return {
    Synth: vi.fn(function MockSynth(this: object) {
      synthCtor();
      Object.assign(this, makeChainable());
    }),
    Noise: vi.fn(function MockNoise(this: object) {
      noiseCtor();
      Object.assign(this, makeChainable());
    }),
    Filter: vi.fn(function MockFilter(this: object) {
      filterCtor();
      Object.assign(this, makeChainable());
    }),
    Gain: vi.fn(function MockGain(this: object) {
      gainCtor();
      Object.assign(this, makeChainable());
    }),
    AmplitudeEnvelope: vi.fn(function MockEnv(this: object) {
      envelopeCtor();
      Object.assign(this, makeChainable());
    }),
    now: () => 0,
    gainToDb: (g: number) => 20 * Math.log10(g),
    start: vi.fn(async () => undefined),
    getContext: () => ({
      rawContext: { state: "running", suspend: vi.fn(), resume: vi.fn() },
    }),
  };
});

// Import AFTER mocks so the module picks up stubs
import { audioManager, startAudio } from "./AudioManager";

describe("AudioManager", () => {
  beforeEach(() => {
    audioManager.dispose();
    audioManager.setEnabled(true);
    synthCtor.mockClear();
    noiseCtor.mockClear();
    filterCtor.mockClear();
    gainCtor.mockClear();
    envelopeCtor.mockClear();
  });

  it("starts enabled", () => {
    expect(audioManager.isEnabled()).toBe(true);
  });

  it("can be disabled and enabled", () => {
    audioManager.setEnabled(false);
    expect(audioManager.isEnabled()).toBe(false);
    audioManager.setEnabled(true);
    expect(audioManager.isEnabled()).toBe(true);
  });

  it("does not create synths when disabled", () => {
    audioManager.setEnabled(false);
    audioManager.play("click");
    expect(synthCtor).not.toHaveBeenCalled();
  });

  it("initializes lazily on first play", () => {
    audioManager.play("click");
    expect(gainCtor).toHaveBeenCalledTimes(1); // master gain
    expect(synthCtor).toHaveBeenCalled();
  });

  it("plays all sound types without errors", () => {
    const sounds = [
      "click",
      "plant",
      "water",
      "harvest",
      "chop",
      "levelUp",
      "achievement",
      "toolSelect",
      "seasonChange",
      "build",
      "error",
      "success",
    ] as const;

    for (const sound of sounds) {
      expect(() => audioManager.play(sound)).not.toThrow();
    }
  });

  it("creates one synth per tone for click", () => {
    audioManager.play("click");
    expect(synthCtor).toHaveBeenCalledTimes(1);
  });

  it("creates noise generator + filter for water", () => {
    audioManager.play("water");
    expect(noiseCtor).toHaveBeenCalled();
    expect(filterCtor).toHaveBeenCalled();
    expect(envelopeCtor).toHaveBeenCalled();
  });

  it("creates noise generator for chop", () => {
    audioManager.play("chop");
    expect(noiseCtor).toHaveBeenCalled();
  });

  it("creates 4 synths for levelUp arpeggio", () => {
    audioManager.play("levelUp");
    expect(synthCtor).toHaveBeenCalledTimes(4);
  });

  it("uses a synth for plant rising tone", () => {
    audioManager.play("plant");
    expect(synthCtor).toHaveBeenCalledTimes(1);
  });

  it("creates 3 synths for seasonChange chord", () => {
    audioManager.play("seasonChange");
    expect(synthCtor).toHaveBeenCalledTimes(3);
  });

  it("startAudio() resolves without throwing", async () => {
    await expect(startAudio()).resolves.toBeUndefined();
  });

  it("dispose can be called without prior play", () => {
    expect(() => audioManager.dispose()).not.toThrow();
  });
});
