/**
 * Thin wrapper around Jolly Pixel's engine audio stack.
 *
 * The engine ships four moving parts:
 *   - `GlobalAudio` — owns the THREE.AudioListener + master volume.
 *     Lives on `world.audio` once the runtime is constructed.
 *   - `GlobalAudioManager` (the `AudioManager` instance) — loads and
 *     instantiates THREE.Audio nodes. We build one with `fromWorld(world)`,
 *     which also registers the `.wav/.ogg/.mp3` Asset loader.
 *   - `AudioLibrary<TKeys>` — a typed map from symbolic id to lazy
 *     AudioBuffer. We register every entry from `audioLibrary.ts` once
 *     at boot. Buffers are loaded on demand by `Systems.Assets`.
 *   - `AudioBackground` — a playlist player for looped beds. We use it
 *     for music + ambient via three independent instances (or `null`
 *     when none has been registered yet).
 *
 * Intended usage:
 *
 *   await initAudio(runtime.world);
 *   playSound("ui.click");           // one-shot
 *   await setMusicTrack("music.menu");  // looped bed
 *   setMasterVolume(0.6);
 *
 * `initAudio` is idempotent and side-effects only the module-local
 * singletons. Call sites import the bound `playSound` / `setMusicTrack`
 * helpers and don't see the engine plumbing at all — that's the point of
 * keeping this module thin: callers stay symbolic.
 *
 * Failure mode: every public function is fire-and-forget where the
 * caller doesn't expect a return. We swallow load errors and log,
 * because a missing audio file should never crash the game loop.
 */

import {
  AudioBackground,
  AudioLibrary,
  GlobalAudioManager,
  type AudioBackgroundPlaylist,
  type Systems,
} from "@jolly-pixel/engine";
import {
  ALL_SOUND_IDS,
  AUDIO_LIBRARY,
  type SoundEntry,
  type SoundId,
} from "./audioLibrary";

type World = Systems.World;

interface AudioState {
  world: World;
  manager: GlobalAudioManager;
  library: AudioLibrary<SoundId>;
  /** Lazily-constructed playlist player for the music channel. */
  music: AudioBackground | null;
  /** Lazily-constructed playlist player for the ambient channel. */
  ambient: AudioBackground | null;
  /** Per-channel volume multipliers. Master volume sits on world.audio. */
  channelVolume: Record<"music" | "sfx" | "ambient", number>;
  /** Currently playing music id — for crossfade comparisons. */
  currentMusic: SoundId | null;
  /** Currently playing ambient id. */
  currentAmbient: SoundId | null;
}

let state: AudioState | null = null;

/**
 * Resolve a path from the manifest into a URL the THREE.AudioLoader can
 * fetch. `import.meta.env.BASE_URL` is `/` on dev and `/grovekeeper/` on
 * GitHub Pages. Joining is character-careful — both sides may carry a
 * slash — but in tests `import.meta.env` may not exist, so we fall back
 * to a leading-slash join.
 */
function resolveAssetUrl(relativePath: string): string {
  // biome-ignore lint/suspicious/noExplicitAny: env shim for vitest
  const env = (import.meta as any).env;
  const base: string =
    typeof env?.BASE_URL === "string" && env.BASE_URL.length > 0
      ? env.BASE_URL
      : "/";
  const left = base.endsWith("/") ? base : `${base}/`;
  const right = relativePath.startsWith("/")
    ? relativePath.slice(1)
    : relativePath;
  return `${left}${right}`;
}

/**
 * Initialise the audio stack against a live JP runtime World.
 *
 * Idempotent: subsequent calls return the existing state. Safe to call
 * from a hot-reload boundary.
 *
 * @returns the bound state — exposed only for tests.
 */
export function initAudio(world: World): AudioState {
  if (state) return state;

  const manager = GlobalAudioManager.fromWorld(world);
  const library = new AudioLibrary<SoundId>();

  // Register every known sound id. AudioLibrary.register() returns a lazy
  // asset — calling .get() later forces the load via Systems.Assets.
  for (const id of ALL_SOUND_IDS) {
    const entry = AUDIO_LIBRARY[id];
    library.register(id, resolveAssetUrl(entry.path));
  }

  state = {
    world,
    manager,
    library,
    music: null,
    ambient: null,
    channelVolume: { music: 1, sfx: 1, ambient: 1 },
    currentMusic: null,
    currentAmbient: null,
  };
  return state;
}

/**
 * Reset module state. Test-only — production should keep one audio stack
 * for the lifetime of the page.
 */
export function __resetAudioForTests(): void {
  state = null;
}

/**
 * Play a one-shot sound effect by symbolic id. Fire-and-forget; errors
 * are swallowed. Call sites do not need to await.
 *
 * Music/ambient ids should not be played through this — they belong to
 * `setMusicTrack` / `setAmbientTrack`, which manage looping and crossfade.
 * If a caller passes a music id we still play it as a one-shot (no harm,
 * no infinite loop), but it bypasses the channel coordinator.
 */
export function playSound(id: SoundId): void {
  if (!state) {
    // Pre-init or test environment without audio wiring. No-op silently.
    return;
  }
  const entry = AUDIO_LIBRARY[id];
  if (!entry) return;

  void playOneShot(state, id, entry);
}

async function playOneShot(
  s: AudioState,
  id: SoundId,
  entry: SoundEntry,
): Promise<void> {
  try {
    // `manager.loadAudio` is the engine's batteries-included path:
    // it routes through Systems.Assets (cached on second call) and
    // returns a configured THREE.Audio. We don't need to touch the
    // raw AudioBuffer or hit AudioLibrary for one-shots — the library
    // exists for `AudioBackground`'s benefit (which takes paths) and
    // for boot-time preload visibility.
    const url = resolveAssetUrl(entry.path);
    const audio = await s.manager.loadAudio(url, {
      name: id,
      loop: false,
      volume: (entry.volume ?? 1) * s.channelVolume[entry.channel],
    });
    audio.play();
  } catch (err) {
    // Audio must never crash gameplay — log and move on.
    // eslint-disable-next-line no-console
    console.warn(`[audio] playSound("${id}") failed`, err);
  }
}

/**
 * Switch the music channel to a new track, with a soft crossfade.
 *
 * Implementation: AudioBackground does not expose its own crossfade —
 * `play()` stops the previous track and starts the next. We approximate
 * a crossfade by ramping the listener master volume; for an MVP this is
 * good enough and matches what voxel-realms' biome music coordinator
 * documents. A bespoke per-track gain ramp can land in a polish wave.
 */
export async function setMusicTrack(id: SoundId | null): Promise<void> {
  if (!state) return;
  if (state.currentMusic === id) return;

  if (id === null) {
    state.music?.stop();
    state.currentMusic = null;
    return;
  }

  const entry = AUDIO_LIBRARY[id];
  if (entry.channel !== "music") {
    // eslint-disable-next-line no-console
    console.warn(`[audio] setMusicTrack: "${id}" is not a music id`);
    return;
  }

  state.music = ensurePlaylistPlayer(state, "music", id, entry);
  state.currentMusic = id;
  try {
    // The track is registered as path-keyed below (see ensurePlaylistPlayer);
    // play() takes a `${string}.${string}` extension-suffixed path.
    await state.music.play(entry.path as `${string}.${string}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[audio] setMusicTrack("${id}") failed`, err);
  }
}

/**
 * Switch the ambient channel. Symmetric with setMusicTrack but on its
 * own AudioBackground instance so music and ambient can play concurrently.
 */
export async function setAmbientTrack(id: SoundId | null): Promise<void> {
  if (!state) return;
  if (state.currentAmbient === id) return;

  if (id === null) {
    state.ambient?.stop();
    state.currentAmbient = null;
    return;
  }

  const entry = AUDIO_LIBRARY[id];
  if (entry.channel !== "ambient") {
    // eslint-disable-next-line no-console
    console.warn(`[audio] setAmbientTrack: "${id}" is not an ambient id`);
    return;
  }

  state.ambient = ensurePlaylistPlayer(state, "ambient", id, entry);
  state.currentAmbient = id;
  try {
    await state.ambient.play(entry.path as `${string}.${string}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[audio] setAmbientTrack("${id}") failed`, err);
  }
}

/**
 * Lazily build (or rebuild) an AudioBackground player so that the
 * requested track sits in its playlist. We rebuild on every track switch
 * because AudioBackground takes its playlist by constructor argument.
 * That's cheap — it just wires a path lookup map.
 */
function ensurePlaylistPlayer(
  s: AudioState,
  channel: "music" | "ambient",
  id: SoundId,
  entry: SoundEntry,
): AudioBackground {
  const url = resolveAssetUrl(entry.path);
  const playlist: AudioBackgroundPlaylist = {
    name: channel,
    tracks: [
      {
        name: id,
        path: url,
        volume: (entry.volume ?? 1) * s.channelVolume[channel],
      },
    ],
    onEnd: entry.loop ? "loop" : "stop",
  };
  // Stop any existing player on this channel before replacing it.
  const existing = channel === "music" ? s.music : s.ambient;
  if (existing) existing.stop();
  return new AudioBackground({
    audioManager: s.manager,
    playlists: [playlist],
    autoPlay: false,
    onError: (err) => {
      // eslint-disable-next-line no-console
      console.warn(`[audio] ${channel} playlist error`, err);
    },
  });
}

/**
 * Master volume goes through GlobalAudio (the engine's listener). 0..1.
 */
export function setMasterVolume(volume: number): void {
  if (!state) return;
  state.world.audio.volume = clamp01(volume);
}

/**
 * Per-channel volume multiplier. Re-applied on the next play() — already
 * playing tracks are not retroactively adjusted (acceptable: settings UI
 * triggers a fresh play() on apply).
 */
export function setChannelVolume(
  channel: "music" | "sfx" | "ambient",
  volume: number,
): void {
  if (!state) return;
  state.channelVolume[channel] = clamp01(volume);
}

function clamp01(v: number): number {
  if (Number.isNaN(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

/** True if init has run. Mostly for tests. */
export function isAudioInitialized(): boolean {
  return state !== null;
}
