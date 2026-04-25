/**
 * Tests for the audio.ts engine wrapper.
 *
 * The engine's audio stack ultimately needs a Three.AudioContext under
 * happy-dom, which is unavailable. We mock the engine module so the
 * wrapper's intent ("call the right engine method with the right url
 * and volume") can be verified in isolation, without standing up a JP
 * runtime.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Track the most recently created AudioBackground so tests can assert
// on its constructor args.
const audioBackgroundLog: Array<{
  ctorOpts: unknown;
  played: Array<string | number[]>;
  stopped: number;
}> = [];

vi.mock("@jolly-pixel/engine", () => {
  class MockAudio {
    isPlaying = false;
    play = vi.fn(() => {
      this.isPlaying = true;
    });
    setVolume = vi.fn();
    setLoop = vi.fn();
    name = "";
  }

  class MockGlobalAudioManager {
    static fromWorld = vi.fn(() => new MockGlobalAudioManager());
    loadAudio = vi.fn(async (_url: string, _opts?: unknown) => new MockAudio());
    loadPositionalAudio = vi.fn(
      async (_url: string, _opts?: unknown) => new MockAudio(),
    );
    createAudio = vi.fn((_buffer: unknown, _opts?: unknown) => new MockAudio());
    createPositionalAudio = vi.fn(
      (_buffer: unknown, _opts?: unknown) => new MockAudio(),
    );
    destroyAudio = vi.fn();
  }

  class MockAudioBackground {
    played: Array<string | number[]> = [];
    stopped = 0;
    constructor(opts: unknown) {
      const entry = {
        ctorOpts: opts,
        played: this.played,
        stopped: 0,
      };
      audioBackgroundLog.push(entry);
      // Arrow function captures `this`; we update both the instance
      // and the log entry so tests can read either side.
      this.stop = vi.fn(() => {
        this.stopped += 1;
        entry.stopped = this.stopped;
      });
    }
    play = vi.fn(async (pathOrIndex: string | number[]) => {
      this.played.push(pathOrIndex);
    });
    stop = vi.fn();
    pause = vi.fn();
    resume = vi.fn();
    onMasterVolumeChange = vi.fn();
  }

  class MockAudioLibrary {
    register = vi.fn();
    get = vi.fn();
  }

  return {
    AudioBackground: MockAudioBackground,
    AudioLibrary: MockAudioLibrary,
    GlobalAudioManager: MockGlobalAudioManager,
  };
});

// biome-ignore lint/suspicious/noExplicitAny: minimal World surface used
function makeFakeWorld(): any {
  return {
    audio: {
      _volume: 1,
      get volume() {
        return this._volume;
      },
      set volume(v: number) {
        this._volume = v;
      },
    },
  };
}

describe("audio.ts", () => {
  beforeEach(async () => {
    audioBackgroundLog.length = 0;
    const { __resetAudioForTests } = await import("./audio");
    __resetAudioForTests();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("initAudio is idempotent", async () => {
    const { initAudio } = await import("./audio");
    const world = makeFakeWorld();
    const a = initAudio(world);
    const b = initAudio(world);
    expect(a).toBe(b);
  });

  it("playSound forwards the levelUp asset to the engine", async () => {
    const { initAudio, playSound } = await import("./audio");
    const { AUDIO_LIBRARY } = await import("./audioLibrary");
    const world = makeFakeWorld();
    const state = initAudio(world);

    playSound("levelUp");
    // playSound is fire-and-forget; flush microtasks so the inner
    // promise chain runs.
    await new Promise((r) => setTimeout(r, 0));

    expect(state.manager.loadAudio).toHaveBeenCalledTimes(1);
    const [url, opts] = (state.manager.loadAudio as ReturnType<typeof vi.fn>)
      .mock.calls[0];
    expect(url).toContain(AUDIO_LIBRARY.levelUp.path);
    expect(opts).toMatchObject({
      name: "levelUp",
      loop: false,
    });
  });

  it("playSound forwards the success asset to the engine", async () => {
    const { initAudio, playSound } = await import("./audio");
    const { AUDIO_LIBRARY } = await import("./audioLibrary");
    const world = makeFakeWorld();
    const state = initAudio(world);

    playSound("success");
    await new Promise((r) => setTimeout(r, 0));

    const [url] = (state.manager.loadAudio as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(url).toContain(AUDIO_LIBRARY.success.path);
  });

  it("playSound is a no-op before init", async () => {
    const { playSound } = await import("./audio");
    expect(() => playSound("ui.click")).not.toThrow();
  });

  it("setMusicTrack creates an AudioBackground and plays the music url", async () => {
    const { initAudio, setMusicTrack } = await import("./audio");
    const { AUDIO_LIBRARY } = await import("./audioLibrary");
    const world = makeFakeWorld();
    initAudio(world);

    await setMusicTrack("music.menu");

    expect(audioBackgroundLog).toHaveLength(1);
    const created = audioBackgroundLog[0];
    expect(created.played).toHaveLength(1);
    expect(created.played[0]).toContain(AUDIO_LIBRARY["music.menu"].path);
  });

  it("setMusicTrack is a no-op when called with the current id", async () => {
    const { initAudio, setMusicTrack } = await import("./audio");
    initAudio(makeFakeWorld());

    await setMusicTrack("music.menu");
    await setMusicTrack("music.menu");
    // Second call should not have built a fresh AudioBackground.
    expect(audioBackgroundLog).toHaveLength(1);
  });

  it("setMusicTrack(null) stops the current bed", async () => {
    const { initAudio, setMusicTrack } = await import("./audio");
    initAudio(makeFakeWorld());

    await setMusicTrack("music.menu");
    await setMusicTrack(null);

    const created = audioBackgroundLog[0];
    expect(created.stopped).toBeGreaterThanOrEqual(1);
  });

  it("setMasterVolume clamps to 0..1", async () => {
    const { initAudio, setMasterVolume } = await import("./audio");
    const world = makeFakeWorld();
    initAudio(world);

    setMasterVolume(0.5);
    expect(world.audio.volume).toBe(0.5);

    setMasterVolume(-0.1);
    expect(world.audio.volume).toBe(0);

    setMasterVolume(1.5);
    expect(world.audio.volume).toBe(1);
  });

  it("setChannelVolume scales the next playSound's volume", async () => {
    const { initAudio, playSound, setChannelVolume } = await import("./audio");
    const { AUDIO_LIBRARY } = await import("./audioLibrary");
    const world = makeFakeWorld();
    const state = initAudio(world);

    setChannelVolume("sfx", 0.5);
    playSound("ui.click");
    await new Promise((r) => setTimeout(r, 0));

    const [, opts] = (state.manager.loadAudio as ReturnType<typeof vi.fn>).mock
      .calls[0];
    const expected = (AUDIO_LIBRARY["ui.click"].volume ?? 1) * 0.5;
    expect((opts as { volume: number }).volume).toBeCloseTo(expected);
  });

  it("setMusicTrack ignores non-music ids", async () => {
    const { initAudio, setMusicTrack } = await import("./audio");
    initAudio(makeFakeWorld());

    // Pass an sfx id — should bail without creating a player.
    // biome-ignore lint/suspicious/noExplicitAny: deliberate type-bypass test
    await setMusicTrack("ui.click" as any);
    expect(audioBackgroundLog).toHaveLength(0);
  });
});
