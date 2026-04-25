/**
 * Public audio surface for Grovekeeper.
 *
 * Call sites should import from `@/audio` and never reach into
 * `./audio` / `./biomeMusic` directly. Engine plumbing
 * (`@jolly-pixel/engine`) is a private dependency of this module.
 */

export {
  initAudio,
  isAudioInitialized,
  playSound,
  setAmbientTrack,
  setChannelVolume,
  setMasterVolume,
  setMusicTrack,
  __resetAudioForTests,
} from "./audio";

export {
  ALL_SOUND_IDS,
  AUDIO_LIBRARY,
  getSoundEntry,
  type SoundEntry,
  type SoundId,
} from "./audioLibrary";

export {
  getTracksForBiome,
  setBiomeMusic,
  type BiomeId,
} from "./biomeMusic";
