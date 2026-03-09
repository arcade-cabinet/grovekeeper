export { getDb } from "./client.ts";
export { migrateFromLocalStorage } from "./migrate-localStorage.ts";
export type { HydratedGameState, SerializedTreeDb } from "./queries.ts";
export {
  hydrateGameStore,
  loadGroveFromDb,
  persistGameStore,
  saveGroveToDb,
  setupNewGame,
} from "./queries.ts";
export {
  achievements,
  gridCells,
  player,
  questGoals,
  quests,
  resources,
  saveConfig,
  seeds,
  settings,
  structures,
  timeState,
  toolUpgrades,
  tracking,
  trees,
  unlocks,
  worldState,
} from "./schema.ts";
