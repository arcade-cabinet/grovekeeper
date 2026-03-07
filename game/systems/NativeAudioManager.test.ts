import { audioManager } from "./AudioManager";
import { nativeAudioManager } from "./NativeAudioManager";

// Mock AudioManager
jest.mock("./AudioManager", () => ({
  audioManager: {
    playSound: jest.fn(),
    setMuted: jest.fn(),
    setVolume: jest.fn(),
    dispose: jest.fn(),
  },
}));

describe("NativeAudioManager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("delegates playSound to audioManager", () => {
    nativeAudioManager.playSound("plant");
    expect(audioManager.playSound).toHaveBeenCalledWith("plant");
  });

  it("does not play when muted", () => {
    nativeAudioManager.setMuted(true);
    nativeAudioManager.playSound("harvest");
    expect(audioManager.playSound).not.toHaveBeenCalled();
    nativeAudioManager.setMuted(false);
  });

  it("delegates setMuted to audioManager", () => {
    nativeAudioManager.setMuted(true);
    expect(audioManager.setMuted).toHaveBeenCalledWith(true);
  });

  it("tracks muted state", () => {
    nativeAudioManager.setMuted(true);
    expect(nativeAudioManager.isMuted()).toBe(true);
    nativeAudioManager.setMuted(false);
    expect(nativeAudioManager.isMuted()).toBe(false);
  });

  it("delegates setVolume to audioManager", () => {
    nativeAudioManager.setVolume(0.7);
    expect(audioManager.setVolume).toHaveBeenCalledWith(0.7);
    expect(nativeAudioManager.getVolume()).toBe(0.7);
  });

  it("clamps volume to 0-1", () => {
    nativeAudioManager.setVolume(-0.5);
    expect(nativeAudioManager.getVolume()).toBe(0);

    nativeAudioManager.setVolume(1.5);
    expect(nativeAudioManager.getVolume()).toBe(1);
  });

  it("delegates dispose to audioManager", async () => {
    await nativeAudioManager.dispose();
    expect(audioManager.dispose).toHaveBeenCalled();
  });
});
