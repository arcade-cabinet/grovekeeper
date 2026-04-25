/**
 * Biome music coordinator.
 *
 * Sits above `audio.ts`. Takes a biome id (or `null` for menu) and
 * resolves it to a music + ambient track pair, then asks audio.ts to
 * switch. The actual crossfade lives in the engine's AudioBackground;
 * this file only chooses ids.
 *
 * The default biome → track table is intentionally hand-picked from the
 * Wave 3 audio library curation — `music.biome.<biome>.calm` for the
 * meadow, the `chill` cut for forest, the `warm` cut for coast, and the
 * Grove gets its own `forlorn` bed because it's a special biome (per
 * spec §"Grove chunk: special, consistent, glowing meadow biome").
 */

import { setAmbientTrack, setMusicTrack } from "./audio";
import type { SoundId } from "./audioLibrary";

/**
 * Biome ids the music coordinator knows about. `menu` is technically not
 * a biome but it travels through the same coordinator because the
 * caller wants a single switch point ("now playing X").
 */
export type BiomeId = "menu" | "grove" | "meadow" | "forest" | "coast";

interface BiomeTracks {
  /** Music id, or `null` for silence. */
  readonly music: SoundId | null;
  /** Ambient id, or `null`. */
  readonly ambient: SoundId | null;
}

const BIOME_TRACKS: Readonly<Record<BiomeId, BiomeTracks>> = {
  menu: {
    music: "music.menu",
    ambient: null,
  },
  grove: {
    music: "music.grove.forlorn",
    ambient: "ambient.grove",
  },
  meadow: {
    music: "music.biome.meadow.calm",
    ambient: "ambient.biome.meadow",
  },
  forest: {
    music: "music.biome.forest.chill",
    ambient: "ambient.biome.forest",
  },
  coast: {
    music: "music.biome.coast.warm",
    ambient: "ambient.biome.coast",
  },
};

/**
 * Look up the (music, ambient) pair for a biome. Exported for tests so
 * the table can be asserted on without going through the audio plumbing.
 */
export function getTracksForBiome(biome: BiomeId): BiomeTracks {
  return BIOME_TRACKS[biome];
}

/**
 * Switch the audio output for a biome change. Awaitable so callers can
 * gate gameplay logic ("don't enter the wild until the bed is queued"),
 * though most callers will fire-and-forget.
 *
 * @param biome The biome to switch to.
 */
export async function setBiomeMusic(biome: BiomeId): Promise<void> {
  const tracks = BIOME_TRACKS[biome];
  // Run music + ambient swaps in parallel — independent channels.
  await Promise.all([
    setMusicTrack(tracks.music),
    setAmbientTrack(tracks.ambient),
  ]);
}
