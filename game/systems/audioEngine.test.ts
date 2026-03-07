/**
 * audioEngine tests (Spec §27)
 *
 * Tone.js is mocked — it requires AudioContext (not available in Node.js).
 * Pattern: jest.mock("tone", ...) replaces at runtime; cast with
 * `as unknown as jest.Mock` to access .mock.* in TypeScript.
 */

import audioConfig from "@/config/game/audio.json" with { type: "json" };
import { Panner3D, Volume, start } from "tone";
import { audioEngine, clampVolumeDb } from "./audioEngine";

// ---------------------------------------------------------------------------
// Tone.js mock — replaces AudioContext-dependent nodes with plain objects
// ---------------------------------------------------------------------------

jest.mock("tone", () => {
  const makePanner3DMock = () => ({
    positionX: { value: 0 },
    positionY: { value: 0 },
    positionZ: { value: 0 },
    connect: jest.fn(),
    dispose: jest.fn(),
    setPosition: jest.fn(),
  });

  const makeVolumeMock = () => {
    const vol = {
      volume: { value: 0 },
      connect: jest.fn(),
      dispose: jest.fn(),
      // toDestination returns itself so audioEngine stores the same instance
      toDestination: jest.fn(),
    };
    vol.toDestination.mockReturnValue(vol);
    return vol;
  };

  return {
    start: jest.fn().mockResolvedValue(undefined),
    Volume: jest.fn().mockImplementation(makeVolumeMock),
    Panner3D: jest.fn().mockImplementation(makePanner3DMock),
  };
});

// Cast mocked imports to jest.Mock for assertion access (Three.js mock cast pattern)
const MockStart = start as unknown as jest.Mock;
const MockVolume = Volume as unknown as jest.Mock;
const MockPanner3D = Panner3D as unknown as jest.Mock;

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

afterEach(() => {
  audioEngine.dispose();
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Pure utility
// ---------------------------------------------------------------------------

describe("clampVolumeDb (Spec §27)", () => {
  it("returns value within [minDb, 0]", () => {
    expect(clampVolumeDb(-12, -60)).toBe(-12);
  });

  it("clamps below minDb floor", () => {
    expect(clampVolumeDb(-100, -60)).toBe(-60);
  });

  it("clamps above 0 dB ceiling", () => {
    expect(clampVolumeDb(6, -60)).toBe(0);
  });

  it("accepts exactly 0 dB", () => {
    expect(clampVolumeDb(0, -60)).toBe(0);
  });

  it("accepts exactly minDb", () => {
    expect(clampVolumeDb(-60, -60)).toBe(-60);
  });
});

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

describe("AudioEngine initialization (Spec §27)", () => {
  it("starts uninitialized", () => {
    expect(audioEngine.isInitialized()).toBe(false);
  });

  it("is initialized after initialize()", async () => {
    await audioEngine.initialize();
    expect(audioEngine.isInitialized()).toBe(true);
  });

  it("calls Tone.start() on initialize", async () => {
    await audioEngine.initialize();
    expect(MockStart).toHaveBeenCalledTimes(1);
  });

  it("is idempotent — second initialize() does not call start() again", async () => {
    await audioEngine.initialize();
    jest.clearAllMocks();
    await audioEngine.initialize();
    expect(MockStart).not.toHaveBeenCalled();
  });

  it("creates a Volume master node on initialize", async () => {
    await audioEngine.initialize();
    expect(MockVolume).toHaveBeenCalledTimes(1);
    expect(MockVolume).toHaveBeenCalledWith(audioConfig.masterVolumeDb);
  });

  it("chains master volume to destination via toDestination()", async () => {
    await audioEngine.initialize();
    const volInstance = MockVolume.mock.results[0].value;
    expect(volInstance.toDestination).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Master volume
// ---------------------------------------------------------------------------

describe("AudioEngine master volume (Spec §27)", () => {
  beforeEach(async () => {
    await audioEngine.initialize();
  });

  it("default volume matches config masterVolumeDb", () => {
    expect(audioEngine.getMasterVolume()).toBe(audioConfig.masterVolumeDb);
  });

  it("sets master volume", () => {
    audioEngine.setMasterVolume(-12);
    expect(audioEngine.getMasterVolume()).toBe(-12);
  });

  it("clamps volume to minVolumeDb floor", () => {
    audioEngine.setMasterVolume(-100);
    expect(audioEngine.getMasterVolume()).toBe(audioConfig.minVolumeDb);
  });

  it("clamps volume to 0 dB ceiling", () => {
    audioEngine.setMasterVolume(6);
    expect(audioEngine.getMasterVolume()).toBe(0);
  });

  it("applies volume to Tone Volume node when initialized", () => {
    const volInstance = MockVolume.mock.results[0].value;
    audioEngine.setMasterVolume(-20);
    expect(volInstance.volume.value).toBe(-20);
  });

  it("stores volume even before initialization", () => {
    audioEngine.dispose(); // resets initialized = false
    audioEngine.setMasterVolume(-18);
    expect(audioEngine.getMasterVolume()).toBe(-18);
  });
});

// ---------------------------------------------------------------------------
// Panner3D pool (HRTF)
// ---------------------------------------------------------------------------

describe("AudioEngine Panner3D pool (Spec §27)", () => {
  beforeEach(async () => {
    await audioEngine.initialize();
  });

  it("creates pannerPoolSize panners on initialize", () => {
    expect(MockPanner3D).toHaveBeenCalledTimes(audioConfig.pannerPoolSize);
  });

  it("creates all panners with HRTF panning model", () => {
    const calls = MockPanner3D.mock.calls;
    for (const call of calls) {
      expect(call[0]).toEqual(expect.objectContaining({ panningModel: "HRTF" }));
    }
  });

  it("all panners available after initialization", () => {
    expect(audioEngine.getAvailablePanners()).toBe(audioConfig.pannerPoolSize);
  });

  it("acquirePanner returns a panner", () => {
    const panner = audioEngine.acquirePanner();
    expect(panner).not.toBeNull();
  });

  it("acquirePanner decrements available count", () => {
    audioEngine.acquirePanner();
    expect(audioEngine.getAvailablePanners()).toBe(audioConfig.pannerPoolSize - 1);
  });

  it("releasePanner restores available count", () => {
    const panner = audioEngine.acquirePanner()!;
    audioEngine.releasePanner(panner);
    expect(audioEngine.getAvailablePanners()).toBe(audioConfig.pannerPoolSize);
  });

  it("releasePanner resets panner position to origin", () => {
    const panner = audioEngine.acquirePanner()!;
    audioEngine.releasePanner(panner);
    expect(panner.setPosition).toHaveBeenCalledWith(0, 0, 0);
  });

  it("returns null when pool exhausted", () => {
    for (let i = 0; i < audioConfig.pannerPoolSize; i++) {
      audioEngine.acquirePanner();
    }
    expect(audioEngine.acquirePanner()).toBeNull();
  });

  it("can re-acquire after release (pool cycling)", () => {
    for (let i = 0; i < audioConfig.pannerPoolSize; i++) {
      audioEngine.acquirePanner();
    }
    // Release one slot
    // biome-ignore lint/suspicious/noExplicitAny: mock result type union includes undefined
    const panners = MockPanner3D.mock.results.map((r: any) => r.value as unknown as Panner3D);
    audioEngine.releasePanner(panners[0]);
    const reacquired = audioEngine.acquirePanner();
    expect(reacquired).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Dispose
// ---------------------------------------------------------------------------

describe("AudioEngine dispose (Spec §27)", () => {
  it("resets initialized to false", async () => {
    await audioEngine.initialize();
    audioEngine.dispose();
    expect(audioEngine.isInitialized()).toBe(false);
  });

  it("empties panner pool — getAvailablePanners returns 0", async () => {
    await audioEngine.initialize();
    audioEngine.dispose();
    expect(audioEngine.getAvailablePanners()).toBe(0);
  });

  it("disposes all Panner3D nodes", async () => {
    await audioEngine.initialize();
    // biome-ignore lint/suspicious/noExplicitAny: mock result type union includes undefined
    const panners = MockPanner3D.mock.results.map((r: any) => r.value as { dispose: jest.Mock });
    audioEngine.dispose();
    for (const p of panners) {
      expect(p.dispose).toHaveBeenCalled();
    }
  });

  it("disposes master Volume node", async () => {
    await audioEngine.initialize();
    const volInstance = MockVolume.mock.results[0].value;
    audioEngine.dispose();
    expect(volInstance.dispose).toHaveBeenCalled();
  });

  it("allows re-initialization after dispose", async () => {
    await audioEngine.initialize();
    audioEngine.dispose();
    jest.clearAllMocks();
    await audioEngine.initialize();
    expect(audioEngine.isInitialized()).toBe(true);
    expect(MockStart).toHaveBeenCalledTimes(1);
  });

  it("safe to dispose when not initialized", () => {
    expect(() => audioEngine.dispose()).not.toThrow();
  });
});
