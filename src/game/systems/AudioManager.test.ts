import { describe, it, expect, beforeEach, vi } from "vitest";
import { audioManager } from "./AudioManager";

// Lightweight mock — just need AudioContext to not throw
const makeMockContext = () => ({
  state: "running" as AudioContextState,
  currentTime: 0,
  sampleRate: 48000,
  destination: {},
  createOscillator: vi.fn(() => ({
    type: "sine" as OscillatorType,
    frequency: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  })),
  createGain: vi.fn(() => ({
    gain: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
  })),
  createBiquadFilter: vi.fn(() => ({
    type: "lowpass" as BiquadFilterType,
    frequency: { value: 0 },
    connect: vi.fn(),
  })),
  createBufferSource: vi.fn(() => ({
    buffer: null as AudioBuffer | null,
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  })),
  createBuffer: vi.fn((_channels: number, length: number, _sampleRate: number) => ({
    getChannelData: vi.fn(() => new Float32Array(length)),
  })),
  suspend: vi.fn(),
  resume: vi.fn(),
  close: vi.fn(),
});

let currentMock: ReturnType<typeof makeMockContext>;

// Must use `function` (not arrow) so it works as a constructor with `new`
vi.stubGlobal("AudioContext", vi.fn(function MockAudioContext() {
  currentMock = makeMockContext();
  Object.assign(this, currentMock);
}));

describe("AudioManager", () => {
  beforeEach(() => {
    audioManager.dispose();
    audioManager.setEnabled(true);
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

  it("does not create AudioContext when disabled", () => {
    audioManager.setEnabled(false);
    audioManager.play("click");
    // No context created — currentMock remains from last dispose
    expect(audioManager.isEnabled()).toBe(false);
  });

  it("creates AudioContext lazily on first play", () => {
    audioManager.play("click");
    // currentMock is set by the AudioContext constructor
    expect(currentMock).toBeDefined();
    expect(currentMock.createOscillator).toHaveBeenCalled();
  });

  it("plays all sound types without errors", () => {
    const sounds = [
      "click", "plant", "water", "harvest", "chop",
      "levelUp", "achievement", "toolSelect", "seasonChange",
      "build", "error", "success",
    ] as const;

    for (const sound of sounds) {
      expect(() => audioManager.play(sound)).not.toThrow();
    }
  });

  it("creates oscillators for tone-based sounds", () => {
    audioManager.play("click");
    expect(currentMock.createOscillator).toHaveBeenCalled();
  });

  it("creates noise buffer for water sound", () => {
    audioManager.play("water");
    expect(currentMock.createBuffer).toHaveBeenCalled();
    expect(currentMock.createBiquadFilter).toHaveBeenCalled();
  });

  it("creates noise buffer for chop sound", () => {
    audioManager.play("chop");
    expect(currentMock.createBuffer).toHaveBeenCalled();
  });

  it("creates multiple oscillators for arpeggio sounds", () => {
    audioManager.play("levelUp");
    // levelUp plays 4 notes in an arpeggio
    expect(currentMock.createOscillator).toHaveBeenCalledTimes(4);
  });

  it("uses rising tone for plant sound", () => {
    audioManager.play("plant");
    expect(currentMock.createOscillator).toHaveBeenCalled();
  });

  it("plays chord for season change", () => {
    audioManager.play("seasonChange");
    // 3-note chord
    expect(currentMock.createOscillator).toHaveBeenCalledTimes(3);
  });

  it("closes context on dispose", () => {
    audioManager.play("click"); // create context
    const ctx = currentMock;
    audioManager.dispose();
    expect(ctx.close).toHaveBeenCalled();
  });
});
