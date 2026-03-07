/**
 * useGameLoop -- runs all game systems per frame inside the R3F Canvas.
 *
 * This is the central integration hook: time, weather, growth, stamina,
 * harvest cooldowns, NPC movement, achievement checks, and event ticks
 * all happen here.
 *
 * Must be called from a component rendered inside <Canvas>.
 */

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { NpcBrain, type NpcBrainContext } from "@/game/ai/NpcBrain";
import { getSpeciesById } from "@/game/config/species";
import { createWildTreeEntity } from "@/game/ecs/archetypes";
import {
  harvestableQuery,
  npcsQuery,
  playerQuery,
  treesQuery,
  world,
} from "@/game/ecs/world";

const gridCellsQuery = world.with("gridCell", "position");
import { useGameStore } from "@/game/stores/gameStore";
import { checkAchievements, type PlayerStats } from "@/game/systems/achievements";
import { calcGrowthRate, MAX_STAGE } from "@/game/systems/growth";
import { harvestCooldownTick, initHarvestable } from "@/game/systems/harvest";
import { updateNpcMovement } from "@/game/systems/npcMovement";
import { buildWalkabilityGrid, type WalkabilityGrid } from "@/game/systems/pathfinding";
import { regenStamina } from "@/game/systems/stamina";
import {
  advanceTime,
  MICROSECONDS_PER_GAME_SECOND,
  setGameTime,
  type TimeState,
} from "@/game/systems/time";
import {
  getWeatherGrowthMultiplier,
  initializeWeather,
  updateWeather,
  type WeatherState,
} from "@/game/systems/weather";
import {
  checkRegrowth,
  initializeRegrowthState,
  type RegrowthState,
} from "@/game/systems/wildTreeRegrowth";

// ── Constants ──────────────────────────────────────────────────────────────

/** Maximum delta to prevent death spirals (100 ms). */
const MAX_DELTA = 0.1;

/** Achievement checks run every ~5 seconds. */
const ACHIEVEMENT_CHECK_INTERVAL = 5;

/** Economy updates run once per game-day change. */
const EVENT_TICK_INTERVAL = 10;

/** Microseconds per real second (for time advancement). */
const MICROSECONDS_PER_REAL_SECOND = 1_000_000;

/** NPC AI evaluation runs every ~2 seconds (not every frame). */
const NPC_AI_TICK_INTERVAL = 2;

/** Walkability grid rebuild interval (seconds). */
const GRID_REBUILD_INTERVAL = 5;

// ── Hook ───────────────────────────────────────────────────────────────────

export function useGameLoop(): void {
  // Refs for mutable state that should NOT trigger React re-renders
  const weatherRef = useRef<WeatherState | null>(null);
  const lastAchievementCheck = useRef(0);
  const lastEventTick = useRef(0);
  const lastDayRef = useRef(-1);
  const lastSeasonRef = useRef("");
  const timeInitialized = useRef(false);

  // NPC AI refs
  const npcBrains = useRef(new Map<string, NpcBrain>());
  const npcAiTimer = useRef(0);
  const walkGridRef = useRef<WalkabilityGrid | null>(null);
  const gridRebuildTimer = useRef(0);

  // Wild tree regrowth
  const regrowthRef = useRef<RegrowthState>(initializeRegrowthState());

  useFrame((_state, delta) => {
    const dt = Math.min(delta, MAX_DELTA);
    if (dt <= 0) return;

    const store = useGameStore.getState();

    // Skip systems when not actively playing
    if (store.screen !== "playing") return;

    // ── 1. Time Advancement ──────────────────────────────────────────────

    // Sync module-level time accumulator on first frame
    if (!timeInitialized.current) {
      setGameTime(store.gameTimeMicroseconds);
      timeInitialized.current = true;
    }

    const deltaMicroseconds = dt * MICROSECONDS_PER_REAL_SECOND;
    const timeState: TimeState = advanceTime(deltaMicroseconds);

    // Throttle store updates: only write when day or season changes
    if (timeState.dayNumber !== lastDayRef.current) {
      lastDayRef.current = timeState.dayNumber;
      store.setCurrentDay(timeState.dayNumber);
      store.setGameTime(timeState.totalMicroseconds);

      // Economy update on day change
      store.updateEconomy(timeState.dayNumber);

      // Quest chain refresh on day change
      store.refreshAvailableChains();

      // Wild tree regrowth check
      const regrowthResult = checkRegrowth(regrowthRef.current, timeState.dayNumber);
      if (regrowthResult.expired.length > 0) {
        regrowthRef.current = regrowthResult.state;
        for (const timer of regrowthResult.expired) {
          const wildTree = createWildTreeEntity(timer.gridX, timer.gridZ, timer.speciesId, 0);
          world.add(wildTree);
          store.incrementWildTreesRegrown();
        }
      }
    }

    if (timeState.season !== lastSeasonRef.current) {
      lastSeasonRef.current = timeState.season;
      store.setCurrentSeason(timeState.season);
      store.trackSeason(timeState.season);
    }

    // Persist game time periodically (every frame is fine for the
    // microsecond accumulator -- Zustand batches synchronous set() calls)
    store.setGameTime(timeState.totalMicroseconds);

    // ── 2. Weather Updates ───────────────────────────────────────────────

    const gameTimeSec = timeState.totalMicroseconds / (MICROSECONDS_PER_GAME_SECOND * 1);
    // gameTimeSec is in "game seconds" (86400 per game day)

    if (!weatherRef.current) {
      weatherRef.current = initializeWeather(gameTimeSec);
    }

    const rngSeed = store.worldSeed ? store.worldSeed.length : Date.now() % 10000;

    weatherRef.current = updateWeather(weatherRef.current, gameTimeSec, timeState.season, rngSeed);

    const weatherGrowthMult = getWeatherGrowthMultiplier(weatherRef.current.current.type);

    // ── 3. Growth System ─────────────────────────────────────────────────

    for (const entity of treesQuery) {
      const tree = entity.tree;
      if (tree.stage >= MAX_STAGE) continue;

      const species = getSpeciesById(tree.speciesId);
      if (!species) continue;

      const baseTime = species.baseGrowthTimes[tree.stage] ?? 30;

      const growthRate = calcGrowthRate({
        baseTime,
        difficulty: species.difficulty,
        season: timeState.season,
        watered: tree.watered,
        evergreen: species.evergreen,
        speciesId: tree.speciesId,
      });

      if (growthRate <= 0) continue;

      // Apply weather multiplier and fertilized bonus
      const fertilizedMult = tree.fertilized ? 2.0 : 1.0;
      const progressDelta = growthRate * weatherGrowthMult * fertilizedMult * dt;
      tree.progress += progressDelta;
      tree.totalGrowthTime += dt;

      // Stage advancement
      if (tree.progress >= 1 && tree.stage < MAX_STAGE) {
        tree.progress = 0;
        (tree as { stage: number }).stage = tree.stage + 1;

        // Clear fertilized flag on stage advance (bonus consumed)
        if (tree.fertilized) {
          tree.fertilized = false;
        }

        // Track species growth in codex
        store.trackSpeciesGrowth(tree.speciesId, tree.stage);

        // Track matured trees (stage 3 = Mature)
        if (tree.stage === 3) {
          store.incrementTreesMatured();
          // Initialize harvestable component for newly mature trees
          initHarvestable(entity);
        }

        // Initialize harvestable for Old Growth too
        if (tree.stage === 4) {
          initHarvestable(entity);
        }
      }
    }

    // ── 4. Stamina Regeneration ──────────────────────────────────────────

    for (const entity of playerQuery) {
      if (!entity.player) continue;

      const newStamina = regenStamina(
        entity.player.stamina,
        entity.player.maxStamina,
        dt,
      );

      if (newStamina !== entity.player.stamina) {
        entity.player.stamina = newStamina;
        // Sync to Zustand (rounded to avoid excessive updates)
        const rounded = Math.round(newStamina * 10) / 10;
        if (Math.abs(rounded - store.stamina) >= 0.5) {
          store.setStamina(rounded);
        }
      }
    }

    // ── 5. Harvest Cooldowns ─────────────────────────────────────────────

    for (const entity of harvestableQuery) {
      harvestCooldownTick(entity, dt);
    }

    // ── 6. NPC Movement ──────────────────────────────────────────────────

    for (const entity of npcsQuery) {
      if (!entity.position || !entity.npc) continue;

      const result = updateNpcMovement(entity.id, entity.position.x, entity.position.z, dt);

      if (!result.done) {
        entity.position.x = result.x;
        entity.position.z = result.z;
      }
    }

    // ── 6b. NPC AI Brain Ticking (throttled to ~2s) ─────────────────────

    npcAiTimer.current += dt;
    gridRebuildTimer.current += dt;

    if (npcAiTimer.current >= NPC_AI_TICK_INTERVAL) {
      npcAiTimer.current = 0;

      // Rebuild walkability grid periodically
      if (!walkGridRef.current || gridRebuildTimer.current >= GRID_REBUILD_INTERVAL) {
        gridRebuildTimer.current = 0;
        let minX = 0,
          minZ = 0,
          maxX = 12,
          maxZ = 12;
        const walkCells = [];
        for (const cell of gridCellsQuery) {
          if (cell.gridCell) {
            const { gridX, gridZ, type } = cell.gridCell;
            if (gridX < minX) minX = gridX;
            if (gridZ < minZ) minZ = gridZ;
            if (gridX + 1 > maxX) maxX = gridX + 1;
            if (gridZ + 1 > maxZ) maxZ = gridZ + 1;
            walkCells.push({ x: gridX, z: gridZ, walkable: type === "soil" || type === "path" });
          }
        }
        walkGridRef.current = buildWalkabilityGrid(walkCells, { minX, minZ, maxX, maxZ });
      }

      // Get player position
      let playerX = 6,
        playerZ = 6;
      for (const p of playerQuery) {
        if (p.position) {
          playerX = p.position.x;
          playerZ = p.position.z;
        }
        break;
      }

      // Ensure NpcBrain instances exist for all NPC entities
      const currentIds = new Set<string>();
      for (const entity of npcsQuery) {
        if (!entity.position || !entity.npc) continue;
        currentIds.add(entity.id);

        let brain = npcBrains.current.get(entity.id);
        if (!brain) {
          brain = new NpcBrain(
            entity.id,
            entity.npc.templateId,
            entity.position.x,
            entity.position.z,
          );
          npcBrains.current.set(entity.id, brain);
        }

        const distToPlayer = Math.max(
          Math.abs(entity.position.x - playerX),
          Math.abs(entity.position.z - playerZ),
        );

        const ctx: NpcBrainContext = {
          grid: walkGridRef.current,
          playerX,
          playerZ,
          npcX: entity.position.x,
          npcZ: entity.position.z,
          homeX: brain.homePosition.x,
          homeZ: brain.homePosition.z,
          distToPlayer,
        };

        brain.update(dt * NPC_AI_TICK_INTERVAL, ctx);
      }

      // Clean up brains for removed NPC entities
      for (const [id, brain] of npcBrains.current) {
        if (!currentIds.has(id)) {
          brain.dispose();
          npcBrains.current.delete(id);
        }
      }
    }

    // ── 7. Achievement Checks (throttled to ~5s) ─────────────────────────

    lastAchievementCheck.current += dt;

    if (lastAchievementCheck.current >= ACHIEVEMENT_CHECK_INTERVAL) {
      lastAchievementCheck.current = 0;

      // Count old growth trees currently in the world
      let oldGrowthCount = 0;
      for (const entity of treesQuery) {
        if (entity.tree.stage >= 4) oldGrowthCount++;
      }

      // Count discovery progress
      let discoveryCount = 0;
      for (const progress of Object.values(store.speciesProgress)) {
        if (progress.discoveryTier >= 1) discoveryCount++;
      }

      const stats: PlayerStats = {
        treesPlanted: store.treesPlanted,
        treesHarvested: store.treesHarvested,
        treesWatered: store.treesWatered,
        totalTimber: store.lifetimeResources.timber ?? 0,
        totalSap: store.lifetimeResources.sap ?? 0,
        totalFruit: store.lifetimeResources.fruit ?? 0,
        totalAcorns: store.lifetimeResources.acorns ?? 0,
        level: store.level,
        speciesPlanted: store.speciesPlanted,
        maxStageReached: Math.max(0, ...Array.from(treesQuery).map((e) => e.tree.stage)),
        currentGridSize: store.gridSize,
        prestigeCount: store.prestigeCount,
        questsCompleted: store.questChainState.completedChainIds.length,
        recipesUnlocked: 0, // TODO: wire when recipe store is available
        structuresPlaced: store.placedStructures.length,
        oldGrowthCount,
        npcsFriended: 0, // TODO: wire when NPC friendship store is available
        totalDaysPlayed: timeState.dayNumber,
        tradeCount: store.marketState.tradeHistory.length,
        festivalCount: store.eventState.completedFestivalIds.length,
        discoveryCount,
        chunksVisited: store.discoveredZones.length,
        biomesDiscovered: store.visitedZoneTypes.length,
        spiritsDiscovered: store.discoveredSpiritIds.length,
      };

      const newAchievements = checkAchievements(stats, store.achievements);
      for (const id of newAchievements) {
        store.unlockAchievement(id);
      }
    }

    // ── 8. Event Scheduler Tick (throttled to ~10s) ──────────────────────

    lastEventTick.current += dt;

    if (lastEventTick.current >= EVENT_TICK_INTERVAL) {
      lastEventTick.current = 0;

      store.tickEvents({
        currentDay: timeState.dayNumber,
        season: timeState.season,
        playerLevel: store.level,
        rngSeed,
      });
    }
  });
}
