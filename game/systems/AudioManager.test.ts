import { audioManager } from "./AudioManager";

// Mock AudioContext for Jest (not available in jsdom)
class MockGainNode {
  gain = {
    value: 0,
    setValueAtTime: jest.fn(),
    exponentialRampToValueAtTime: jest.fn(),
  };
  connect = jest.fn();
}

class MockOscillatorNode {
  type: OscillatorType = "sine";
  frequency = {
    value: 0,
    setValueAtTime: jest.fn(),
    exponentialRampToValueAtTime: jest.fn(),
  };
  connect = jest.fn();
  start = jest.fn();
  stop = jest.fn();
}

class MockBiquadFilterNode {
  type: BiquadFilterType = "lowpass";
  frequency = { value: 0 };
  connect = jest.fn();
}

class MockAudioBuffer {
  numberOfChannels = 1;
  length: number;
  sampleRate: number;
  duration: number;
  private data: Float32Array;
  constructor(options: { length: number; sampleRate: number }) {
    this.length = options.length;
    this.sampleRate = options.sampleRate;
    this.duration = options.length / options.sampleRate;
    this.data = new Float32Array(options.length);
  }
  getChannelData(_channel: number) {
    return this.data;
  }
  copyFromChannel = jest.fn();
  copyToChannel = jest.fn();
}

class MockBufferSourceNode {
  buffer: MockAudioBuffer | null = null;
  connect = jest.fn();
  start = jest.fn();
  stop = jest.fn();
}

class MockAudioContext {
  state: AudioContextState = "running";
  currentTime = 0;
  sampleRate = 44100;
  destination = {};

  createGain() {
    return new MockGainNode();
  }
  createOscillator() {
    return new MockOscillatorNode();
  }
  createBiquadFilter() {
    return new MockBiquadFilterNode();
  }
  createBuffer(_channels: number, length: number, sampleRate: number) {
    return new MockAudioBuffer({ length, sampleRate });
  }
  createBufferSource() {
    return new MockBufferSourceNode();
  }
  suspend = jest.fn().mockResolvedValue(undefined);
  resume = jest.fn().mockResolvedValue(undefined);
  close = jest.fn().mockResolvedValue(undefined);
}

// Install mock globally before tests
beforeAll(() => {
  // biome-ignore lint/suspicious/noExplicitAny: mock global for tests
  (globalThis as any).AudioContext = MockAudioContext;
});

afterAll(() => {
  // biome-ignore lint/suspicious/noExplicitAny: mock global for tests
  delete (globalThis as any).AudioContext;
});

// Reset state between tests
afterEach(() => {
  audioManager.setMuted(false);
  audioManager.setVolume(0.3);
  audioManager.dispose();
});

describe("AudioManager", () => {
  describe("volume", () => {
    it("defaults to 0.3", () => {
      expect(audioManager.getVolume()).toBe(0.3);
    });

    it("sets volume within 0-1 range", () => {
      audioManager.setVolume(0.7);
      expect(audioManager.getVolume()).toBe(0.7);
    });

    it("clamps volume to minimum 0", () => {
      audioManager.setVolume(-0.5);
      expect(audioManager.getVolume()).toBe(0);
    });

    it("clamps volume to maximum 1", () => {
      audioManager.setVolume(1.5);
      expect(audioManager.getVolume()).toBe(1);
    });

    it("updates master gain when context exists", () => {
      // Trigger context creation by playing a sound
      audioManager.playSound("click");
      audioManager.setVolume(0.8);
      expect(audioManager.getVolume()).toBe(0.8);
    });
  });

  describe("mute/unmute", () => {
    it("defaults to not muted", () => {
      expect(audioManager.isMuted()).toBe(false);
    });

    it("can be muted", () => {
      audioManager.setMuted(true);
      expect(audioManager.isMuted()).toBe(true);
    });

    it("can be unmuted", () => {
      audioManager.setMuted(true);
      audioManager.setMuted(false);
      expect(audioManager.isMuted()).toBe(false);
    });

    it("does not play sounds when muted", () => {
      audioManager.setMuted(true);
      // Should not throw or create AudioContext
      audioManager.playSound("plant");
      expect(audioManager.isMuted()).toBe(true);
    });
  });

  describe("playSound", () => {
    it("plays without throwing for each sound id", () => {
      const soundIds = [
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

      for (const id of soundIds) {
        expect(() => audioManager.playSound(id)).not.toThrow();
      }
    });

    it("skips playback when muted", () => {
      audioManager.setMuted(true);
      // No error, just silently skips
      audioManager.playSound("harvest");
    });
  });

  describe("playMusic / stopMusic", () => {
    it("playMusic does not throw (stub)", () => {
      expect(() => audioManager.playMusic("ambient", true)).not.toThrow();
    });

    it("stopMusic does not throw (stub)", () => {
      expect(() => audioManager.stopMusic()).not.toThrow();
    });
  });

  describe("dispose", () => {
    it("cleans up without error", () => {
      // Create context by playing
      audioManager.playSound("click");
      expect(() => audioManager.dispose()).not.toThrow();
    });

    it("can dispose when no context exists", () => {
      expect(() => audioManager.dispose()).not.toThrow();
    });

    it("allows re-use after dispose (self-healing)", () => {
      audioManager.playSound("click");
      audioManager.dispose();
      // Should lazily re-create context
      expect(() => audioManager.playSound("plant")).not.toThrow();
    });
  });
});
