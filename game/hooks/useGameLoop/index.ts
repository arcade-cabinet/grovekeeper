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
import type { MutableRefObject } from "react";
import { useRef } from "react";
import { dispatchAction, tickPlayerAttackCooldown } from "@/game/actions/actionDispatcher";
import type { NpcBrain } from "@/game/ai/NpcBrain";
import { getDifficultyById } from "@/game/config/difficulty";
import { createWildTreeEntity } from "@/game/ecs/archetypes";
import type { TimeOfDay } from "@/game/ecs/components/procedural/atmosphere";
import {
  ambientZonesQuery,
  combatQuery,
  dayNightQuery,
  enemiesQuery,
  generateEntityId,
  harvestableQuery,
  npcsQuery,
  playerQuery,
  skyQuery,
  terrainChunksQuery,
  waterBodiesQuery,
  weatherQuery,
  world,
} from "@/game/ecs/world";
import { _getHit } from "@/game/hooks/useRaycast";
import { inputManager } from "@/game/input/InputManager";
import { useGameStore } from "@/game/stores";
import { advanceTutorial } from "@/game/stores/settings";
import {
  type AmbientAudioState,
  computeAmbientMix,
  tickAmbientAudio,
  type ZoneInput,
} from "@/game/systems/ambientAudio";
import {
  type AmbientParticlesState,
  initAmbientParticlesState,
  tickAmbientParticles,
  type WaterRef,
} from "@/game/systems/ambientParticles";
import { tickAttackCooldown, tickInvulnFrames } from "@/game/systems/combat";
import { initDayNight, syncDayNight } from "@/game/systems/dayNight";
import { EnemyEntityManager } from "@/game/systems/enemyAI";
import { harvestCooldownTick } from "@/game/systems/harvest";
import { advanceNpcAnimation } from "@/game/systems/npcAnimation";
import { updateNpcMovement } from "@/game/systems/npcMovement";
import type { WalkabilityGrid } from "@/game/systems/pathfinding";
import { regenStamina } from "@/game/systems/stamina";
import { computeStaminaRegenMult } from "@/game/systems/survival";
import {
  advanceTime,
  MICROSECONDS_PER_GAME_SECOND,
  setGameTime,
  type TimeState,
} from "@/game/systems/time";
import { tickWaterParticles, type WaterParticlesState } from "@/game/systems/waterParticles";
import {
  getWeatherGrowthMultiplier,
  initializeWeather,
  updateWeather,
  type WeatherState,
} from "@/game/systems/weather";
import {
  tickWeatherParticles,
  type WeatherParticlesState as WxParticlesState,
} from "@/game/systems/weatherParticles";
import {
  checkRegrowth,
  initializeRegrowthState,
  type RegrowthState,
} from "@/game/systems/wildTreeRegrowth";
import { getZoneBonusMagnitude, type ZoneType } from "@/game/systems/zoneBonuses";
import { hashString } from "@/game/utils/seedRNG";
import { tickAchievements } from "./tickAchievements.ts";
import { tickBaseRaids, tickRaidCountdown } from "./tickBaseRaids.ts";
import { tickCombatDeaths } from "./tickCombatDeaths.ts";
import { tickGrowth } from "./tickGrowth.ts";
import { tickNpcAI, tickNpcSchedules } from "./tickNpcAI.ts";
import { tickSeasonalEffects } from "./tickSeasonalEffects.ts";
import { tickSurvival } from "./tickSurvival.ts";

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

export interface UseGameLoopOptions {
  /**
   * External ambient audio ref — when provided, the game loop reads from this
   * ref each frame instead of an internal null ref. Pass the ref that is
   * populated by `initAmbientLayers` after the first user gesture.
   */
  ambientAudioRef?: MutableRefObject<AmbientAudioState | null>;
}

export function useGameLoop(options: UseGameLoopOptions = {}): void {
  const weatherRef = useRef<WeatherState | null>(null);
  const lastAchievementCheck = useRef(0);
  const lastEventTick = useRef(0);
  const lastDayRef = useRef(-1);
  const lastSeasonRef = useRef("");
  const timeInitialized = useRef(false);
  const dayNightEntityInitialized = useRef(false);

  const npcBrains = useRef(new Map<string, NpcBrain>());
  const npcAiTimer = useRef(0);
  const walkGridRef = useRef<WalkabilityGrid | null>(null);
  const gridRebuildTimer = useRef(0);

  const regrowthRef = useRef<RegrowthState>(initializeRegrowthState());
  const internalAmbientAudioRef = useRef<AmbientAudioState | null>(null);
  // Use external ref when provided (allows GameScreen to populate it after user gesture),
  // otherwise fall back to the internal null ref.
  const ambientAudioRef = options.ambientAudioRef ?? internalAmbientAudioRef;
  const waterParticlesStateRef = useRef<WaterParticlesState>({
    prevWaterState: "above",
    splashEntity: null,
    bubblesEntity: null,
  });
  const wxParticlesRef = useRef<WxParticlesState>({
    activeCategory: null,
    particleEntity: null,
  });
  const ambientParticlesRef = useRef<AmbientParticlesState>(initAmbientParticlesState());
  const weatherEntityCreated = useRef(false);

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

      // Base raid check on day change (Spec §18.5, §34). Survival mode only.
      const dayDiffConfig = getDifficultyById(store.difficulty);
      tickBaseRaids(timeState.dayNumber, dayDiffConfig?.affectsGameplay ?? false);
    }

    if (timeState.season !== lastSeasonRef.current) {
      lastSeasonRef.current = timeState.season;
      store.setCurrentSeason(timeState.season);
      store.trackSeason(timeState.season);
      // Apply seasonal tint / model swaps to vegetation ECS entities (Spec §6.3).
      tickSeasonalEffects(timeState.season);
    }

    store.setGameTime(timeState.totalMicroseconds);

    // ── 1b. Day/Night ECS Tick ───────────────────────────────────────────

    // Bootstrap the singleton DayNight + Sky ECS entities on first frame.
    // Pass the authoritative gameTimeMicroseconds so a resumed game starts at
    // the correct hour/day/season rather than always at dawn (hour 6).
    if (!dayNightEntityInitialized.current) {
      if (dayNightQuery.entities.length === 0) {
        const dnComponent = initDayNight(timeState.totalMicroseconds);
        world.add({
          id: generateEntityId(),
          dayNight: dnComponent,
          sky: {
            sunAngle: 0,
            sunAzimuth: 0,
            gradientStops: [],
            starIntensity: dnComponent.starIntensity,
            moonPhase: 0,
            cloudCoverage: 0,
            cloudSpeed: 0,
          },
        });
      }
      dayNightEntityInitialized.current = true;
    }

    // Sync the DayNight ECS entity to the authoritative time from time.ts
    // each frame. This replaces the old independent tickDayNight(dt) call
    // which could drift from the canonical clock over many frames.
    for (const entity of dayNightQuery) {
      const skyEntities = skyQuery.entities;
      const skyEntity = skyEntities.length > 0 ? skyEntities[0] : null;
      if (entity.dayNight && skyEntity?.sky) {
        syncDayNight(entity.dayNight, skyEntity.sky, timeState.totalMicroseconds);
      }
      break; // singleton — only one DayNight entity
    }

    // ── 2. Weather Updates ───────────────────────────────────────────────

    const gameTimeSec = timeState.totalMicroseconds / (MICROSECONDS_PER_GAME_SECOND * 1);
    const rngSeed = store.worldSeed ? hashString(store.worldSeed) : Date.now() % 10000;

    if (!weatherRef.current) {
      weatherRef.current = initializeWeather(gameTimeSec);
    }

    weatherRef.current = updateWeather(weatherRef.current, gameTimeSec, timeState.season, rngSeed);
    const weatherGrowthMult = getWeatherGrowthMultiplier(weatherRef.current.current.type);

    // ── 2a. Sync Weather → ECS entity (drives WeatherOverlay + WeatherParticlesLayer) ─
    {
      const wType = weatherRef.current.current.type;
      // Map weather.ts types → ECS WeatherType. Winter rain becomes snow.
      const ecsType =
        wType === "drought"
          ? "clear"
          : wType === "rain" && timeState.season === "winter"
            ? "snow"
            : wType;
      const isActive = ecsType !== "clear";
      const intensity = isActive ? 0.6 : 0;
      const windSpeed = ecsType === "windstorm" ? 3.0 : 1.0;
      const windDir: [number, number] = ecsType === "windstorm" ? [1, -0.5] : [0, -1];
      const elapsed = gameTimeSec - weatherRef.current.current.startTime;
      const remaining = Math.max(0, weatherRef.current.current.duration - elapsed);

      if (weatherQuery.entities.length === 0 && !weatherEntityCreated.current) {
        world.add({
          id: generateEntityId(),
          weather: {
            weatherType: ecsType as
              | "clear"
              | "rain"
              | "snow"
              | "fog"
              | "windstorm"
              | "thunderstorm",
            intensity,
            windDirection: windDir,
            windSpeed,
            timeRemaining: remaining,
            affectsGameplay: false,
          },
        });
        weatherEntityCreated.current = true;
      } else {
        for (const entity of weatherQuery) {
          if (entity.weather) {
            entity.weather.weatherType = ecsType as
              | "clear"
              | "rain"
              | "snow"
              | "fog"
              | "windstorm"
              | "thunderstorm";
            entity.weather.intensity = intensity;
            entity.weather.windDirection = windDir;
            entity.weather.windSpeed = windSpeed;
            entity.weather.timeRemaining = remaining;
          }
          break; // singleton
        }
      }

      // Tick weather particles (rain/snow/wind/dust ECS emitters) — Spec §36.1.
      let wPlayerPos: { x: number; y: number; z: number } | null = null;
      for (const p of playerQuery) {
        if (p.position) {
          wPlayerPos = { x: p.position.x, y: p.position.y, z: p.position.z };
        }
        break;
      }
      const wEnt = weatherQuery.entities[0]?.weather ?? null;
      tickWeatherParticles(
        world as Parameters<typeof tickWeatherParticles>[0],
        wEnt,
        wPlayerPos,
        wxParticlesRef.current,
      );
    }

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
    const baseGrowthSpeedMult = frameDiffConfig?.growthSpeedMult ?? 1.0;
    // Apply zone-based growth_boost bonus (Spec §18). Returns 0 for unknown zones.
    const zoneGrowthBonus = getZoneBonusMagnitude(
      (store.currentZoneId ?? "grove") as ZoneType,
      "growth_boost",
    );
    const growthSpeedMult = baseGrowthSpeedMult * (1 + zoneGrowthBonus);

    tickGrowth(timeState, weatherGrowthMult, growthSpeedMult, dt);

    // ── 4. Stamina Regeneration ──────────────────────────────────────────
    // Regen rate is gated by hunger state and scaled by difficulty staminaRegenMult.
    // Spec §12.1: zero hunger = no regen. Well Fed (>80) = +10% bonus.

    {
      const baseRegenMult = frameDiffConfig?.staminaRegenMult ?? 1.0;
      const affectsGameplay = frameDiffConfig?.affectsGameplay ?? true;
      // Apply zone-based stamina_regen bonus (Spec §18). Stacks multiplicatively.
      const zoneStaminaBonus = getZoneBonusMagnitude(
        (store.currentZoneId ?? "grove") as ZoneType,
        "stamina_regen",
      );
      const effectiveRegenMult =
        computeStaminaRegenMult(store.hunger, baseRegenMult, affectsGameplay) *
        (1 + zoneStaminaBonus);

      for (const entity of playerQuery) {
        if (!entity.player) continue;
        const newStamina = regenStamina(
          entity.player.stamina,
          entity.player.maxStamina,
          dt,
          effectiveRegenMult,
        );
        if (newStamina !== entity.player.stamina) {
          entity.player.stamina = newStamina;
          const rounded = Math.round(newStamina * 10) / 10;
          if (Math.abs(rounded - store.stamina) >= 0.5) {
            store.setStamina(rounded);
          }
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

    {
      const frame = inputManager.getFrame();
      if (!hasFirefiredLookTutorial) {
        const lookMagnitude = Math.sqrt(
          frame.lookDeltaX * frame.lookDeltaX + frame.lookDeltaY * frame.lookDeltaY,
        );
        if (lookMagnitude > 0.1) {
          advanceTutorial("action:look");
          hasFirefiredLookTutorial = true;
        }
      }

      // ── 5c. Number key tool selection (1-9) ───────────────────────────
      if (frame.toolSelect > 0) {
        const slotIndex = frame.toolSelect - 1;
        const unlocked = store.unlockedTools;
        if (slotIndex < unlocked.length) {
          const toolId = unlocked[slotIndex];
          if (toolId !== store.selectedTool) {
            store.setSelectedTool(toolId);
          }
        }
      }

      // ── 5d. FPS interact (E key / gamepad A / action button) ─────────
      // Reads the current raycast hit and dispatches a game action if the
      // player pressed interact this frame. Handles ATTACK for enemy targets.
      // Spec §11, §34.4.6.
      if (frame.interact) {
        const hit = _getHit();
        if (hit) {
          dispatchAction({
            toolId: store.selectedTool,
            targetType: hit.entityType,
            entity: hit.entity,
            gridX: Math.round(hit.point.x),
            gridZ: Math.round(hit.point.z),
            speciesId: store.selectedSpecies,
            biome: store.currentZoneId,
          });
        }
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

    // Tick the player's module-level attack cooldown (Spec §34.4.4).
    tickPlayerAttackCooldown(dt);

    // Combat deaths: detect defeated enemies, roll loot, credit resources (Spec §34).
    tickCombatDeaths(dt);

    // Raid countdown: tick the warning timer for pending raids (Spec §18.5).
    tickRaidCountdown(dt);

    // ── 6d. Water Particles ───────────────────────────────────────────────

    {
      let playerPos: { x: number; y: number; z: number } | null = null;
      for (const p of playerQuery) {
        if (p.position) {
          playerPos = { x: p.position.x, y: p.position.y, z: p.position.z };
        }
        break;
      }
      if (playerPos) {
        tickWaterParticles(
          world as Parameters<typeof tickWaterParticles>[0],
          playerPos,
          waterBodiesQuery.entities,
          waterParticlesStateRef.current,
        );
      }
    }

    // ── 6e. Ambient Particles (fireflies, pollen, leaves) — Spec §36.1 ──
    {
      const activeChunks = terrainChunksQuery.entities.map((e) => ({
        chunkKey: e.chunk ? `${e.chunk.chunkX},${e.chunk.chunkZ}` : e.id,
        worldX: e.position.x,
        worldZ: e.position.z,
      }));
      const waterRefs: WaterRef[] = waterBodiesQuery.entities
        .filter((e) => e.position)
        .map((e) => ({ position: { x: e.position.x, z: e.position.z } }));
      const wEcsEntity = weatherQuery.entities[0]?.weather;
      const currentWindSpeed = wEcsEntity?.windSpeed ?? 1.0;
      tickAmbientParticles(
        world as Parameters<typeof tickAmbientParticles>[0],
        activeChunks,
        ambientParticlesRef.current,
        timeState.hour,
        timeState.season,
        currentWindSpeed,
        waterRefs,
      );
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
