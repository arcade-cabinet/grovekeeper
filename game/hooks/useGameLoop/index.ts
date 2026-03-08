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
import { NpcBrain } from "@/game/ai/NpcBrain";
import { getDifficultyById } from "@/game/config/difficulty";
import { createWildTreeEntity } from "@/game/ecs/archetypes";
import {
  ambientZonesQuery,
  combatQuery,
  enemiesQuery,
  harvestableQuery,
  npcsQuery,
  playerQuery,
  world,
} from "@/game/ecs/world";
import type { TimeOfDay } from "@/game/ecs/components/procedural/atmosphere";
import { advanceTutorial } from "@/game/stores/settings";
import { useGameStore } from "@/game/stores/gameStore";
import { harvestCooldownTick } from "@/game/systems/harvest";
import { advanceNpcAnimation } from "@/game/systems/npcAnimation";
import { updateNpcMovement } from "@/game/systems/npcMovement";
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
import {
  computeAmbientMix,
  tickAmbientAudio,
  type AmbientAudioState,
  type ZoneInput,
} from "@/game/systems/ambientAudio";
import { tickAttackCooldown, tickInvulnFrames } from "@/game/systems/combat";
import { EnemyEntityManager } from "@/game/systems/enemyAI";
import { inputManager } from "@/game/input/InputManager";
import { hashString } from "@/game/utils/seedRNG";
import { tickAchievements } from "./tickAchievements";
import { tickGrowth } from "./tickGrowth";
import { tickNpcAI, tickNpcSchedules } from "./tickNpcAI";
import { tickSurvival } from "./tickSurvival";
import type { WalkabilityGrid } from "@/game/systems/pathfinding";

/** Maximum delta to prevent death spirals (100 ms). */
const MAX_DELTA = 0.1;

/** Module-level flag: fires advanceTutorial("action:look") only once. */
let hasFirefiredLookTutorial = false;

/** Derive a coarse TimeOfDay label from an integer game hour (0–23). */
function hourToTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 7) return "dawn";
  if (hour >= 7 && hour < 11) return "morning";
  if (hour >= 11 && hour < 14) return "noon";
  if (hour >= 14 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 20) return "dusk";
  if (hour >= 20 && hour < 22) return "evening";
  if (hour >= 22 || hour < 2) return "night";
  return "midnight";
}

/** Economy / event tick interval (seconds). */
const EVENT_TICK_INTERVAL = 10;

/** Microseconds per real second (for time advancement). */
const MICROSECONDS_PER_REAL_SECOND = 1_000_000;

export function useGameLoop(): void {
  const weatherRef = useRef<WeatherState | null>(null);
  const lastAchievementCheck = useRef(0);
  const lastEventTick = useRef(0);
  const lastDayRef = useRef(-1);
  const lastSeasonRef = useRef("");
  const timeInitialized = useRef(false);

  const npcBrains = useRef(new Map<string, NpcBrain>());
  const npcAiTimer = useRef(0);
  const walkGridRef = useRef<WalkabilityGrid | null>(null);
  const gridRebuildTimer = useRef(0);

  const regrowthRef = useRef<RegrowthState>(initializeRegrowthState());
  const ambientAudioRef = useRef<AmbientAudioState | null>(null);

  useFrame((_state, delta) => {
    const dt = Math.min(delta, MAX_DELTA);
    if (dt <= 0) return;

    const store = useGameStore.getState();

    if (store.screen !== "playing") return;

    // ── 1. Time Advancement ──────────────────────────────────────────────

    if (!timeInitialized.current) {
      setGameTime(store.gameTimeMicroseconds);
      timeInitialized.current = true;
    }

    const deltaMicroseconds = dt * MICROSECONDS_PER_REAL_SECOND;
    const timeState: TimeState = advanceTime(deltaMicroseconds);

    if (timeState.dayNumber !== lastDayRef.current) {
      lastDayRef.current = timeState.dayNumber;
      store.setCurrentDay(timeState.dayNumber);
      store.setGameTime(timeState.totalMicroseconds);
      store.updateEconomy(timeState.dayNumber);
      store.refreshAvailableChains();

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

    store.setGameTime(timeState.totalMicroseconds);

    // ── 2. Weather Updates ───────────────────────────────────────────────

    const gameTimeSec = timeState.totalMicroseconds / (MICROSECONDS_PER_GAME_SECOND * 1);
    const rngSeed = store.worldSeed ? hashString(store.worldSeed) : Date.now() % 10000;

    if (!weatherRef.current) {
      weatherRef.current = initializeWeather(gameTimeSec);
    }

    weatherRef.current = updateWeather(weatherRef.current, gameTimeSec, timeState.season, rngSeed);
    const weatherGrowthMult = getWeatherGrowthMultiplier(weatherRef.current.current.type);

    // ── 2b. Ambient Audio Tick ───────────────────────────────────────────

    if (ambientAudioRef.current) {
      let playerX = 0;
      let playerZ = 0;
      for (const p of playerQuery) {
        if (p.position) {
          playerX = p.position.x;
          playerZ = p.position.z;
        }
        break;
      }

      const zones: ZoneInput[] = [];
      for (const entity of ambientZonesQuery) {
        if (entity.ambientZone && entity.position) {
          zones.push({
            pos: { x: entity.position.x, z: entity.position.z },
            soundscape: entity.ambientZone.soundscape,
            radius: entity.ambientZone.radius,
            volume: entity.ambientZone.volume,
          });
        }
      }

      const timeOfDay = hourToTimeOfDay(timeState.hour);
      const ambientMix = computeAmbientMix(zones, { x: playerX, z: playerZ }, timeOfDay);
      tickAmbientAudio(ambientAudioRef.current, ambientMix);
    }

    // ── 3. Growth System ─────────────────────────────────────────────────

    const frameDiffConfig = getDifficultyById(store.difficulty);
    const growthSpeedMult = frameDiffConfig?.growthSpeedMult ?? 1.0;

    tickGrowth(timeState, weatherGrowthMult, growthSpeedMult, dt);

    // ── 4. Stamina Regeneration ──────────────────────────────────────────

    for (const entity of playerQuery) {
      if (!entity.player) continue;
      const newStamina = regenStamina(entity.player.stamina, entity.player.maxStamina, dt);
      if (newStamina !== entity.player.stamina) {
        entity.player.stamina = newStamina;
        const rounded = Math.round(newStamina * 10) / 10;
        if (Math.abs(rounded - store.stamina) >= 0.5) {
          store.setStamina(rounded);
        }
      }
    }

    // ── 4b. Survival Tick ────────────────────────────────────────────────

    tickSurvival(frameDiffConfig, dt);

    // ── 5. Harvest Cooldowns ─────────────────────────────────────────────

    for (const entity of harvestableQuery) {
      harvestCooldownTick(entity, dt);
    }

    // ── 5b. Look Tutorial (fires once when player first looks around) ─────

    if (!hasFirefiredLookTutorial) {
      const frame = inputManager.getFrame();
      const lookMagnitude = Math.sqrt(
        frame.lookDeltaX * frame.lookDeltaX + frame.lookDeltaY * frame.lookDeltaY,
      );
      if (lookMagnitude > 0.1) {
        advanceTutorial("action:look");
        hasFirefiredLookTutorial = true;
      }
    }

    // ── 6. NPC Movement ──────────────────────────────────────────────────

    for (const entity of npcsQuery) {
      if (!entity.position || !entity.npc) continue;
      const result = updateNpcMovement(entity.id, entity.position.x, entity.position.z, dt);
      if (!result.done) {
        entity.position.x = result.x;
        entity.position.z = result.z;
      }
      advanceNpcAnimation(entity.npc, dt);
    }

    tickNpcSchedules(walkGridRef, timeState);

    // ── 6b. NPC AI Brain (throttled ~2s) ─────────────────────────────────

    tickNpcAI(npcBrains.current, walkGridRef, gridRebuildTimer, npcAiTimer, dt);

    // ── 6c. Combat Pipeline ───────────────────────────────────────────────

    // Enemy AI: update all registered EnemyBrain instances via EnemyEntityManager.
    // Brains are registered when enemies spawn (chunk load); updateAll resolves context by entityId.
    {
      const entityPositions = new Map<string, { x: number; z: number }>();
      let pX = 0;
      let pZ = 0;
      for (const p of playerQuery) {
        if (p.position) {
          pX = p.position.x;
          pZ = p.position.z;
        }
        break;
      }
      for (const entity of enemiesQuery) {
        if (entity.position && entity.enemy) {
          entityPositions.set(entity.id, { x: entity.position.x, z: entity.position.z });
        }
      }
      EnemyEntityManager.updateAll(dt, (entityId) => {
        const pos = entityPositions.get(entityId);
        if (!pos) return null;
        const entity = [...enemiesQuery].find((e) => e.id === entityId);
        if (!entity?.enemy || !entity.position) return null;
        return {
          playerX: pX,
          playerZ: pZ,
          enemyX: entity.position.x,
          enemyZ: entity.position.z,
          homeX: entity.position.x,
          homeZ: entity.position.z,
          aggroRange: entity.enemy.aggroRange,
          deaggroRange: entity.enemy.deaggroRange,
        };
      });
    }

    // Combat: tick invuln timers and attack cooldowns for all combat entities.
    for (const entity of combatQuery) {
      if (entity.health) tickInvulnFrames(entity.health, dt);
      if (entity.combat) tickAttackCooldown(entity.combat, dt);
    }

    // ── 7. Achievement Checks (throttled ~5s) ────────────────────────────

    tickAchievements(lastAchievementCheck, timeState, dt);

    // ── 8. Event Scheduler Tick (throttled ~10s) ─────────────────────────

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
