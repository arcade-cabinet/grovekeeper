/**
 * Declarative manifest of every symbolic sound id Grovekeeper plays.
 *
 * Each entry maps a stable string id (used at call sites — `playSound("levelUp")`)
 * to a relative path under `/assets/audio/` that exists in
 * `src/assets/manifest.generated.ts`. Keep this file boring: no logic, no
 * derivation. Adding a sound = add a line here.
 *
 * IDs are namespaced with dots to keep concerns sorted:
 *   - `music.*`    looped music beds (drive AudioBackground playlists)
 *   - `ambient.*`  ambient biome loops (drive AudioBackground playlists)
 *   - `ui.*`       UI clicks/cancels/confirms — short one-shots
 *   - `tool.*`     tool impact one-shots
 *   - `creature.*` creature vocal one-shots
 *   - `footstep.*` per-surface footstep one-shots
 *   - `levelUp` / `success` are legacy short ids called from src/actions.ts.
 *
 * @todo Wave 3 audio TODOs that need real packs in a future polish wave —
 *   each is a string-only alias; symbolic API is final, asset is provisional.
 *
 *   - `footstep.wood.*` — currently the `sfx/footsteps/wood/` pack is just
 *     the stone footstep pack copied. Source the actual wood plank
 *     footstep variant when an itch.io pack is curated.
 *   - `footstep.sand.*` — currently aliased to a single high-grass clip.
 *     Coast biome will need a real sand pack.
 *   - `tool.*` — sourced from a generic impact pack
 *     (pl_impact_*). Per-tool packs (axe-on-wood, hoe-in-dirt) are
 *     a polish-wave goal.
 *   - `creature.*.*` — sourced from a magic-spell SFX pack
 *     (pl_magic_*). Real creature vocalizations are a polish-wave goal.
 *   - `ambient.biome.coast` — currently aliased to the meadow ambient
 *     loop because the coast pack hasn't been curated yet.
 *   - `music.moments.spiritDiscovered` — provisional music-box loop;
 *     the Grovekeeper-spirit-find moment will eventually want a bespoke
 *     stinger.
 */

const PREFIX = "assets/audio/";

/**
 * Type union of every legal sound id. Keeping this exhaustive means
 * `playSound("typo")` is a type error, not a silent miss.
 */
export type SoundId =
  // Legacy short ids (referenced from src/actions.ts).
  | "levelUp"
  | "success"
  // UI.
  | "ui.click"
  | "ui.cancel"
  | "ui.confirm"
  | "ui.coin"
  | "ui.achievement"
  | "ui.inventory.add"
  | "ui.inventory.full"
  | "ui.threshold.chime"
  // Hearth — claim ritual ignite (Sub-wave A).
  | "hearth.ignite"
  // Tools (provisional; @todo per-tool packs).
  | "tool.axe.swing"
  | "tool.axe.break"
  | "tool.hoe.dig"
  | "tool.shovel.dig"
  | "tool.watering.pour"
  // Creatures (provisional; @todo real vocalizations).
  | "creature.peaceful.chirp"
  | "creature.peaceful.coo"
  | "creature.hostile.growl"
  | "creature.hostile.roar"
  // Footsteps (per-surface variants resolve at runtime; this id is the
  // first-of-pack representative).
  | "footstep.grass"
  | "footstep.stone"
  | "footstep.wood"
  | "footstep.sand"
  // Music — looped beds.
  | "music.menu"
  | "music.grove.forlorn"
  | "music.grove.grandfather"
  | "music.biome.meadow.calm"
  | "music.biome.meadow.soft"
  | "music.biome.forest.chill"
  | "music.biome.forest.late"
  | "music.biome.coast.neon"
  | "music.biome.coast.warm"
  | "music.moments.spiritDiscovered"
  // Ambient — looped beds (per biome + grove special).
  | "ambient.grove"
  | "ambient.biome.meadow"
  | "ambient.biome.forest"
  | "ambient.biome.coast";

/**
 * Path resolved relative to the public assets root — i.e. relative to the
 * Vite `publicDir`. The runtime layer prefixes it with the Vite base so
 * Capacitor / GitHub Pages deployments resolve correctly.
 */
export interface SoundEntry {
  /** Relative path under `public/`. */
  readonly path: string;
  /** Default per-track volume (0..1). Channel volume is applied on top. */
  readonly volume?: number;
  /** Default loop hint — primarily used by music/ambient. */
  readonly loop?: boolean;
  /** Channel — drives which volume slider applies. */
  readonly channel: "music" | "sfx" | "ambient";
}

/**
 * The library. Order is irrelevant; alphabetize-by-id within each section
 * for grepability.
 */
export const AUDIO_LIBRARY: Readonly<Record<SoundId, SoundEntry>> = {
  // ── Legacy ids called from src/actions.ts ────────────────────────────
  // Re-use the achievement bell for level-up — it's the closest fanfare in
  // the curated pack. A bespoke level-up jingle is a polish-wave goal.
  levelUp: {
    path: `${PREFIX}sfx/ui/achievement.wav`,
    volume: 0.9,
    channel: "sfx",
  },
  // Quest-complete chord — distinct from `levelUp` only in symbolic intent.
  // Re-uses the confirm cue for now. @todo dedicated quest-success cue.
  success: {
    path: `${PREFIX}sfx/ui/confirm.wav`,
    volume: 0.85,
    channel: "sfx",
  },

  // ── UI ───────────────────────────────────────────────────────────────
  "ui.click": {
    path: `${PREFIX}sfx/ui/click.wav`,
    volume: 0.7,
    channel: "sfx",
  },
  "ui.cancel": {
    path: `${PREFIX}sfx/ui/cancel.wav`,
    volume: 0.7,
    channel: "sfx",
  },
  "ui.confirm": {
    path: `${PREFIX}sfx/ui/confirm.wav`,
    volume: 0.85,
    channel: "sfx",
  },
  "ui.coin": {
    path: `${PREFIX}sfx/ui/coin.wav`,
    volume: 0.85,
    channel: "sfx",
  },
  "ui.achievement": {
    path: `${PREFIX}sfx/ui/achievement.wav`,
    volume: 0.9,
    channel: "sfx",
  },
  // Inventory pickup chime — Wave 16. Re-uses the coin cue for now;
  // a bespoke "satchel slot fills" jingle is a polish-wave goal.
  "ui.inventory.add": {
    path: `${PREFIX}sfx/ui/coin.wav`,
    volume: 0.7,
    channel: "sfx",
  },
  // Inventory-full reject — Wave 16. Same cancel cue we use elsewhere
  // so the player learns "rising chime = good, cancel buzz = bad".
  "ui.inventory.full": {
    path: `${PREFIX}sfx/ui/cancel.wav`,
    volume: 0.65,
    channel: "sfx",
  },
  // Threshold chime — Sub-wave D. Played when the player crosses a
  // grove ↔ wilderness chunk boundary. Aliased to the confirm cue for
  // now; a bespoke woodwind chime is a polish-wave goal.
  // @todo polish-wave: dedicated soft chime SFX.
  "ui.threshold.chime": {
    path: `${PREFIX}sfx/ui/confirm.wav`,
    volume: 0.6,
    channel: "sfx",
  },

  // ── Hearth ───────────────────────────────────────────────────────────
  // Hearth ignite — Sub-wave A claim ritual cinematic. Aliased to the
  // heaviest impact cue we have (axe break) for a meaty whoomph until
  // a bespoke ignite SFX is curated.
  // @todo polish-wave: real fire-ignition SFX (whoosh + crackle).
  "hearth.ignite": {
    path: `${PREFIX}sfx/tools/pl_impact_heavy_03.wav`,
    volume: 1.0,
    channel: "sfx",
  },

  // ── Tools ────────────────────────────────────────────────────────────
  // @todo polish-wave: per-tool packs. For now, generic impact pack.
  "tool.axe.swing": {
    path: `${PREFIX}sfx/tools/pl_impact_wood_01.wav`,
    volume: 0.9,
    channel: "sfx",
  },
  // Block-break crack — Wave 16. Heavier impact than the swing so the
  // player can hear the difference between "another swing landed" and
  // "the voxel just disappeared".
  "tool.axe.break": {
    path: `${PREFIX}sfx/tools/pl_impact_heavy_03.wav`,
    volume: 0.95,
    channel: "sfx",
  },
  "tool.hoe.dig": {
    path: `${PREFIX}sfx/tools/pl_impact_heavy_02.wav`,
    volume: 0.85,
    channel: "sfx",
  },
  "tool.shovel.dig": {
    path: `${PREFIX}sfx/tools/pl_impact_heavy_01.wav`,
    volume: 0.85,
    channel: "sfx",
  },
  "tool.watering.pour": {
    path: `${PREFIX}sfx/tools/pl_impact_click_03.wav`,
    volume: 0.7,
    channel: "sfx",
  },

  // ── Creatures ────────────────────────────────────────────────────────
  // @todo polish-wave: replace magic-spell proxies with real creature
  // vocalizations once a fauna pack is curated.
  "creature.peaceful.chirp": {
    path: `${PREFIX}sfx/creatures/pl_magic_buff_01.wav`,
    volume: 0.6,
    channel: "sfx",
  },
  "creature.peaceful.coo": {
    path: `${PREFIX}sfx/creatures/pl_magic_buff_02.wav`,
    volume: 0.6,
    channel: "sfx",
  },
  "creature.hostile.growl": {
    path: `${PREFIX}sfx/creatures/pl_magic_cast_01.wav`,
    volume: 0.85,
    channel: "sfx",
  },
  "creature.hostile.roar": {
    path: `${PREFIX}sfx/creatures/pl_magic_cast_03.wav`,
    volume: 0.95,
    channel: "sfx",
  },

  // ── Footsteps ────────────────────────────────────────────────────────
  // Single representative clip per surface. Variants in the same dir can
  // be picked at runtime by a future polish layer (the manifest carries
  // the full list).
  "footstep.grass": {
    path: `${PREFIX}sfx/footsteps/grass/bootwalkgrass.wav`,
    volume: 0.5,
    channel: "sfx",
  },
  "footstep.stone": {
    path: `${PREFIX}sfx/footsteps/stone/Bootswalksolid.wav`,
    volume: 0.55,
    channel: "sfx",
  },
  // @todo polish-wave: real wood plank footsteps. Currently aliased to
  // the same stone-pack clip the curate step copied.
  "footstep.wood": {
    path: `${PREFIX}sfx/footsteps/wood/Bootswalksolid.wav`,
    volume: 0.55,
    channel: "sfx",
  },
  // @todo polish-wave: real sand footsteps for coast biome. Currently
  // a single high-grass clip stands in.
  "footstep.sand": {
    path: `${PREFIX}sfx/footsteps/sand/bootwalkhighgrass.wav`,
    volume: 0.5,
    channel: "sfx",
  },

  // ── Music — looped beds ─────────────────────────────────────────────
  "music.menu": {
    path: `${PREFIX}music/menu/idle-screen.wav`,
    volume: 0.7,
    loop: true,
    channel: "music",
  },
  "music.grove.forlorn": {
    path: `${PREFIX}music/grove/forlorn-fairytale.ogg`,
    volume: 0.7,
    loop: true,
    channel: "music",
  },
  "music.grove.grandfather": {
    path: `${PREFIX}music/grove/grandfather-clock.ogg`,
    volume: 0.7,
    loop: true,
    channel: "music",
  },
  "music.biome.meadow.calm": {
    path: `${PREFIX}music/biomes/meadow/calm-respawn.wav`,
    volume: 0.7,
    loop: true,
    channel: "music",
  },
  "music.biome.meadow.soft": {
    path: `${PREFIX}music/biomes/meadow/soft-pixels.wav`,
    volume: 0.7,
    loop: true,
    channel: "music",
  },
  "music.biome.forest.chill": {
    path: `${PREFIX}music/biomes/forest/chill-checkpoint.wav`,
    volume: 0.7,
    loop: true,
    channel: "music",
  },
  "music.biome.forest.late": {
    path: `${PREFIX}music/biomes/forest/late-compile.wav`,
    volume: 0.7,
    loop: true,
    channel: "music",
  },
  "music.biome.coast.neon": {
    path: `${PREFIX}music/biomes/coast/neon-coffee.wav`,
    volume: 0.7,
    loop: true,
    channel: "music",
  },
  "music.biome.coast.warm": {
    path: `${PREFIX}music/biomes/coast/warm-console.wav`,
    volume: 0.7,
    loop: true,
    channel: "music",
  },
  // @todo polish-wave: provisional music-box loop. Bespoke spirit-find
  // stinger needed.
  "music.moments.spiritDiscovered": {
    path: `${PREFIX}music/moments/spirit-discovered.ogg`,
    volume: 0.85,
    loop: false,
    channel: "music",
  },

  // ── Ambient — looped biome beds ─────────────────────────────────────
  "ambient.grove": {
    path: `${PREFIX}ambient/grove/GLV4_MysticHall.mp3`,
    volume: 0.55,
    loop: true,
    channel: "ambient",
  },
  "ambient.biome.meadow": {
    path: `${PREFIX}ambient/biomes/meadow/Calm_Respawn30.wav`,
    volume: 0.55,
    loop: true,
    channel: "ambient",
  },
  "ambient.biome.forest": {
    path: `${PREFIX}ambient/biomes/forest/GLV4_HiddenRoom_LOOP30s.wav`,
    volume: 0.55,
    loop: true,
    channel: "ambient",
  },
  // @todo polish-wave: real coast ambient loop. Currently aliased to the
  // meadow Calm_Respawn loop because the coast ambient pack identical-
  // copied meadow during the curate step.
  "ambient.biome.coast": {
    path: `${PREFIX}ambient/biomes/coast/Calm_Respawn30.wav`,
    volume: 0.55,
    loop: true,
    channel: "ambient",
  },
} as const;

/**
 * All known sound ids. Useful for boot-time bulk registration.
 */
export const ALL_SOUND_IDS: readonly SoundId[] = Object.keys(
  AUDIO_LIBRARY,
) as SoundId[];

/**
 * Lookup helper. Throws if the id is missing — but the type union should
 * make that unreachable from typed call sites.
 */
export function getSoundEntry(id: SoundId): SoundEntry {
  const entry = AUDIO_LIBRARY[id];
  if (!entry) {
    throw new Error(`Unknown sound id: ${id}`);
  }
  return entry;
}
