import { createWorld } from "koota";
import {
  Achievements,
  Build,
  CurrentDay,
  CurrentSeason,
  Difficulty,
  EventStateTrait,
  FarmerState,
  GameScreen,
  Grid,
  IsPlayer,
  LifetimeResources,
  MarketEventStateTrait,
  MarketStateTrait,
  MerchantStateTrait,
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

/**
 * Destroy every entity spawned into the world, EXCEPT the implicit
 * world entity itself (id 0). Koota stores world-level singleton
 * traits on entity 0, so iterating `koota.entities` and calling
 * `.destroy()` unconditionally would wipe those singletons too.
 *
 * Use from test beforeEach hooks. Safe to call from anywhere — does
 * not touch world traits, just user-spawned entities.
 */
export function destroyAllEntitiesExceptWorld(): void {
  for (const e of koota.entities) {
    if (e.id() === 0) continue;
    e.destroy();
  }
}
