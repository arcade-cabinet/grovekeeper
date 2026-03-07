/**
 * audioEngine -- Tone.js audio foundation for Grovekeeper (Spec §27).
 *
 * Provides:
 *   - Master volume control via Tone.js Volume node (dB scale)
 *   - Spatial Panner3D pool (HRTF) for positioned sound sources
 *   - Lazy initialization: call initialize() after first user gesture
 *
 * Usage:
 *   await audioEngine.initialize();
 *   audioEngine.setMasterVolume(-12);
 *   const panner = audioEngine.acquirePanner();
 *   // ... position and connect audio source through panner ...
 *   audioEngine.releasePanner(panner);
 */

import audioConfig from "@/config/game/audio.json" with { type: "json" };
import { Panner3D, Volume, start } from "tone";

interface PannerSlot {
  panner: Panner3D;
  inUse: boolean;
}

/** Clamp a dB value to [minVolumeDb, 0]. Pure function — exported for tests. */
export function clampVolumeDb(db: number, minDb: number): number {
  return Math.max(minDb, Math.min(0, db));
}

class AudioEngineImpl {
  private masterVolume: Volume | null = null;
  private pannerPool: PannerSlot[] = [];
  private initialized = false;
  private currentVolumeDb: number = audioConfig.masterVolumeDb;

  /**
   * Initialize the Tone.js audio context and build the Panner3D pool.
   * Must be called after a user gesture on mobile (Web Audio policy).
   * Safe to call multiple times — idempotent.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    await start();

    this.masterVolume = new Volume(this.currentVolumeDb).toDestination();

    for (let i = 0; i < audioConfig.pannerPoolSize; i++) {
      const panner = new Panner3D({
        panningModel: audioConfig.pannerModel as PanningModelType,
      });
      panner.connect(this.masterVolume);
      this.pannerPool.push({ panner, inUse: false });
    }

    this.initialized = true;
  }

  /**
   * Set master volume in decibels.
   * Clamped to [minVolumeDb, 0]. Takes effect immediately if initialized.
   */
  setMasterVolume(db: number): void {
    const clamped = clampVolumeDb(db, audioConfig.minVolumeDb);
    this.currentVolumeDb = clamped;
    if (this.masterVolume) {
      this.masterVolume.volume.value = clamped;
    }
  }

  /** Returns the current master volume in dB. */
  getMasterVolume(): number {
    return this.currentVolumeDb;
  }

  /**
   * Acquire a Panner3D node from the pool.
   * Returns null if pool is exhausted — callers must handle this case.
   * Always call releasePanner() when done to return it to the pool.
   */
  acquirePanner(): Panner3D | null {
    const slot = this.pannerPool.find((s) => !s.inUse);
    if (!slot) return null;
    slot.inUse = true;
    return slot.panner;
  }

  /**
   * Release a Panner3D back to the pool.
   * The panner is reset to origin (0,0,0) before becoming available again.
   */
  releasePanner(panner: Panner3D): void {
    const slot = this.pannerPool.find((s) => s.panner === panner);
    if (slot) {
      panner.setPosition(0, 0, 0);
      slot.inUse = false;
    }
  }

  /** Number of Panner3D nodes currently available in the pool. */
  getAvailablePanners(): number {
    return this.pannerPool.filter((s) => !s.inUse).length;
  }

  /** True after initialize() has completed successfully. */
  isInitialized(): boolean {
    return this.initialized;
  }

  /** Dispose all Tone.js nodes and reset state. */
  dispose(): void {
    for (const slot of this.pannerPool) {
      slot.panner.dispose();
    }
    this.pannerPool = [];
    this.masterVolume?.dispose();
    this.masterVolume = null;
    this.initialized = false;
  }
}

/** Singleton audio engine instance. */
export const audioEngine = new AudioEngineImpl();
