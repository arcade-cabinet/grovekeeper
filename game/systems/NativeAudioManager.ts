import { Platform } from "react-native";
import type { SoundId } from "./AudioManager";
import { audioManager } from "./AudioManager";

/**
 * NativeAudioManager -- Cross-platform audio that delegates to
 * Web Audio (via AudioManager) on web, and expo-av on native.
 *
 * On web, all SFX are procedurally synthesized via AudioManager.
 * On native, we use expo-audio for preloaded asset playback.
 * Falls back to AudioManager if expo-audio is unavailable.
 */

type NativeSoundMap = Map<
  SoundId,
  {
    unloadAsync: () => Promise<void>;
    replayAsync: () => Promise<void>;
    setVolumeAsync: (v: number) => Promise<void>;
  }
>;

class NativeAudioManagerImpl {
  private sounds: NativeSoundMap = new Map();
  private loaded = false;
  private loading = false;
  private muted = false;
  private volume = 0.3;

  /** Preload native audio assets. Call once at app start on native. */
  async preload(): Promise<void> {
    if (Platform.OS === "web" || this.loaded || this.loading) return;
    this.loading = true;

    try {
      // expo-audio is the maintained replacement for expo-av
      await import("expo-audio");
      this.loaded = true;
    } catch {
      // expo-audio not available, fall back to web audio
    } finally {
      this.loading = false;
    }
  }

  /** Play a sound effect. Delegates to Web Audio on web, expo-av on native. */
  playSound(soundId: SoundId): void {
    if (this.muted) return;

    // Always use Web Audio synthesizer (works on all platforms with AudioContext)
    // expo-av would require bundled audio files which we don't have yet
    audioManager.playSound(soundId);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    audioManager.setMuted(muted);
  }

  isMuted(): boolean {
    return this.muted;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    audioManager.setVolume(this.volume);
  }

  getVolume(): number {
    return this.volume;
  }

  async dispose(): Promise<void> {
    for (const sound of this.sounds.values()) {
      await sound.unloadAsync().catch(() => {});
    }
    this.sounds.clear();
    this.loaded = false;
    audioManager.dispose();
  }
}

export const nativeAudioManager = new NativeAudioManagerImpl();
