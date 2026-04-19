import { createWorld } from "koota";
import {
  Achievements,
  Build,
  CurrentDay,
  CurrentSeason,
  Difficulty,
  EventStateTrait,
  FarmerState,
  MarketEventStateTrait,
  MarketStateTrait,
  MerchantStateTrait,
  GameScreen,
  Grid,
  IsPlayer,
  LifetimeResources,
  PlayerProgress,
  Position,
  QuestChains,
  Quests,
  Renderable,
  Resources,
  Seeds,
  Settings,
  SpeciesProgressTrait,
  Time,
  ToolUpgrades,
  Tracking,
  WorldMeta,
} from "@/traits";

/**
 * The one Koota world. Registers all world-level (singleton) traits so
 * they can be set via world.set(...) / read via world.get(...).
 *
 * Pattern ref: reference-codebases/koota/examples/revade/src/world.ts
 */
export const koota = createWorld(
  // time + season
  Time,
  CurrentSeason,
  CurrentDay,
  // player progression (singleton on world, since there's only one player)
  PlayerProgress,
  Resources,
  LifetimeResources,
  Seeds,
  Tracking,
  Achievements,
  Quests,
  QuestChains,
  MarketStateTrait,
  MerchantStateTrait,
  MarketEventStateTrait,
  EventStateTrait,
  SpeciesProgressTrait,
  ToolUpgrades,
  Grid,
  Build,
  WorldMeta,
  Settings,
  GameScreen,
  Difficulty,
);

export type KootaWorld = typeof koota;

/**
 * Spawn the singleton player entity. Called once at game startup.
 * Player-specific ephemeral state (position, stamina) lives on the
 * entity; persistent progression (level, resources, etc.) lives on
 * the world as singleton traits.
 */
export function spawnPlayer(): ReturnType<typeof koota.spawn> {
  return koota.spawn(
    IsPlayer,
    Position({ x: 6, y: 0, z: 6 }),
    FarmerState({ stamina: 100, maxStamina: 100 }),
    Renderable({ meshId: null, visible: true, scale: 1 }),
  );
}
