/**
 * debugState — Browser-side debug globals for e2e testing and dev diagnostics.
 *
 * Installs `window.__grove` when running in DEV mode or when the URL contains
 * `?debug`. Safe to leave in production builds — the guard prevents
 * installation outside dev/debug contexts.
 *
 * Used by:
 *  - e2e/playthrough.spec.ts (Playwright)
 *  - Dev console: window.__grove.snapshot()
 *
 * All snapshot fields return plain JSON-serialisable objects so that
 * Playwright's `page.evaluate(...)` can transfer them across the
 * serialisation boundary without issue.
 */

import { actions } from "@/actions";
import {
  buildDebugActions,
  type GroveDebugActions,
} from "@/shared/utils/debugActions";
import { koota } from "@/koota";
import {
  Achievements,
  CurrentDay,
  CurrentSeason,
  Difficulty,
  FarmerState,
  GameScreen,
  Grid,
  Harvestable,
  IsPlayer,
  PlayerProgress,
  Position,
  Quests,
  Resources,
  Seeds,
  Settings,
  Time,
  ToolUpgrades,
  Tracking,
  Tree,
  WorldMeta,
} from "@/traits";

// ─── Snapshot types ───────────────────────────────────────────────────────────

export interface TreeSnapshot {
  id: number;
  speciesId: string;
  stage: number;
  progress: number;
  position: { x: number; z: number };
  watered: boolean;
  harvestReady: boolean;
}

export interface PlayerSnapshot {
  position: { x: number; z: number };
  stamina: number;
  maxStamina: number;
}

export interface WorldSnapshot {
  // Singleton traits
  playerProgress: {
    level: number;
    xp: number;
    coins: number;
    selectedTool: string;
    selectedSpecies: string;
    unlockedTools: string[];
    unlockedSpecies: string[];
    prestigeCount: number;
  };
  resources: {
    timber: number;
    sap: number;
    fruit: number;
    acorns: number;
  };
  seeds: Record<string, number>;
  tracking: {
    treesPlanted: number;
    treesMatured: number;
    treesHarvested: number;
    treesWatered: number;
    speciesPlanted: string[];
    seasonsExperienced: string[];
  };
  achievements: string[];
  quests: {
    activeCount: number;
    completedCount: number;
  };
  settings: {
    hasSeenRules: boolean;
    soundEnabled: boolean;
  };
  difficulty: {
    id: string;
    permadeath: boolean;
  };
  time: {
    gameTimeMicroseconds: number;
    season: string;
    day: number;
  };
  toolUpgrades: Record<string, number>;
  worldMeta: {
    currentZoneId: string;
    worldSeed: string;
    discoveredZones: string[];
  };
  grid: {
    gridSize: number;
  };
  screen: string;

  // Entity summary
  entityCounts: {
    trees: number;
    harvestable: number;
    gridCells: number;
    total: number;
  };

  // Tree detail list
  trees: TreeSnapshot[];

  // Player entity
  player: PlayerSnapshot | null;
}

// ─── Snapshot builder ─────────────────────────────────────────────────────────

function buildSnapshot(): WorldSnapshot {
  const pp = koota.get(PlayerProgress);
  const resources = koota.get(Resources);
  const seeds = koota.get(Seeds);
  const tracking = koota.get(Tracking);
  const achievements = koota.get(Achievements);
  const quests = koota.get(Quests);
  const settings = koota.get(Settings);
  const difficulty = koota.get(Difficulty);
  const time = koota.get(Time);
  const season = koota.get(CurrentSeason);
  const day = koota.get(CurrentDay);
  const toolUpgrades = koota.get(ToolUpgrades);
  const worldMeta = koota.get(WorldMeta);
  const grid = koota.get(Grid);
  const screen = koota.get(GameScreen);

  // Collect tree entities
  const treeEntities = koota.query(Tree);
  const trees: TreeSnapshot[] = treeEntities.map((e) => {
    const t = e.get(Tree);
    const pos = e.get(Position);
    const h = e.has(Harvestable) ? e.get(Harvestable) : null;
    return {
      id: e.id(),
      speciesId: t?.speciesId ?? "",
      stage: t?.stage ?? 0,
      progress: t?.progress ?? 0,
      position: { x: pos?.x ?? 0, z: pos?.z ?? 0 },
      watered: t?.watered ?? false,
      harvestReady: h?.ready ?? false,
    };
  });

  // Entity counts
  const harvestableCount = koota.query(Harvestable).length;
  const gridCellCount = koota.query().filter((e) => e.id() !== 0).length;

  // Player entity
  const playerEntity = koota.queryFirst(IsPlayer, FarmerState);
  const playerPos = playerEntity?.get(Position);
  const playerFarmer = playerEntity?.get(FarmerState);
  const player: PlayerSnapshot | null = playerEntity
    ? {
        position: { x: playerPos?.x ?? 0, z: playerPos?.z ?? 0 },
        stamina: playerFarmer?.stamina ?? 0,
        maxStamina: playerFarmer?.maxStamina ?? 100,
      }
    : null;

  return {
    playerProgress: {
      level: pp?.level ?? 1,
      xp: pp?.xp ?? 0,
      coins: pp?.coins ?? 100,
      selectedTool: pp?.selectedTool ?? "trowel",
      selectedSpecies: pp?.selectedSpecies ?? "white-oak",
      unlockedTools: pp?.unlockedTools ?? [],
      unlockedSpecies: pp?.unlockedSpecies ?? [],
      prestigeCount: pp?.prestigeCount ?? 0,
    },
    resources: {
      timber: resources?.timber ?? 0,
      sap: resources?.sap ?? 0,
      fruit: resources?.fruit ?? 0,
      acorns: resources?.acorns ?? 0,
    },
    seeds: seeds ?? {},
    tracking: {
      treesPlanted: tracking?.treesPlanted ?? 0,
      treesMatured: tracking?.treesMatured ?? 0,
      treesHarvested: tracking?.treesHarvested ?? 0,
      treesWatered: tracking?.treesWatered ?? 0,
      speciesPlanted: tracking?.speciesPlanted ?? [],
      seasonsExperienced: tracking?.seasonsExperienced ?? [],
    },
    achievements: achievements?.items ?? [],
    quests: {
      activeCount: quests?.activeQuests.filter((q) => !q.completed).length ?? 0,
      completedCount: quests?.completedQuestIds.length ?? 0,
    },
    settings: {
      hasSeenRules: settings?.hasSeenRules ?? false,
      soundEnabled: settings?.soundEnabled ?? true,
    },
    difficulty: {
      id: difficulty?.id ?? "normal",
      permadeath: difficulty?.permadeath ?? false,
    },
    time: {
      gameTimeMicroseconds: time?.gameTimeMicroseconds ?? 0,
      season: season?.value ?? "spring",
      day: day?.value ?? 1,
    },
    toolUpgrades: toolUpgrades ?? {},
    worldMeta: {
      currentZoneId: worldMeta?.currentZoneId ?? "starting-grove",
      worldSeed: worldMeta?.worldSeed ?? "",
      discoveredZones: worldMeta?.discoveredZones ?? [],
    },
    grid: {
      gridSize: grid?.gridSize ?? 12,
    },
    screen: screen?.value ?? "menu",
    entityCounts: {
      trees: treeEntities.length,
      harvestable: harvestableCount,
      gridCells: gridCellCount,
      total: koota.query().filter((e) => e.id() !== 0).length,
    },
    trees,
    player,
  };
}

// ─── Grove debug globals ──────────────────────────────────────────────────────

export interface GroveDebugGlobals {
  snapshot: () => WorldSnapshot;
  /**
   * Merged action surface: production gameActions + dev-only debug actions
   * (teleportPlayer, triggerSpiritGreeting, lightHearth, etc.). The debug
   * additions are gated behind `installDebugGlobals`'s DEV / `?debug`
   * check, so they never reach a production console.
   */
  actions: ReturnType<typeof actions> & GroveDebugActions;
}

declare global {
  interface Window {
    __grove?: GroveDebugGlobals;
  }
}

/**
 * Install `window.__grove` debug helpers.
 *
 * Called from src/main.tsx, gated on DEV mode or `?debug` URL param.
 * Safe to leave in production — the guard prevents installation outside
 * dev/debug contexts, so the bundle only ships the exports (tree-shaken
 * out when the function is never called in production).
 */
export function installDebugGlobals(): void {
  const isDev = import.meta.env.DEV;
  const hasDebugParam =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("debug");

  if (!isDev && !hasDebugParam) return;

  const grove: GroveDebugGlobals = {
    snapshot: buildSnapshot,
    actions: { ...actions(), ...buildDebugActions() },
  };

  window.__grove = grove;

  if (isDev) {
    console.info(
      "[grove] Debug globals installed. Use window.__grove.snapshot() to inspect state.",
    );
  }
}
