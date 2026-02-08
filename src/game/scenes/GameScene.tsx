/**
 * GameScene — Orchestrator component for the BabylonJS game scene.
 *
 * Initializes ECS entities, creates scene managers, runs the game loop,
 * and handles player actions. All BabylonJS concerns are delegated to
 * managers in src/game/scene/.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { getDb, isDbInitialized } from "@/db/client";
import { saveDatabaseToIndexedDB } from "@/db/persist";
import { persistGameStore, saveGroveToDb } from "@/db/queries";
import { PlayerGovernor } from "../ai/PlayerGovernor";
import { GRID_SIZE } from "../constants/config";
import { getActiveDifficulty } from "../constants/difficulty";
import type { ResourceType } from "../constants/resources";
import { getToolById, TOOLS } from "../constants/tools";
import { getSpeciesById } from "../constants/trees";
import { createPlayerEntity, createTreeEntity } from "../ecs/archetypes";
import type { Entity, GridCellComponent } from "../ecs/world";
import {
  generateEntityId,
  gridCellsQuery,
  npcsQuery,
  playerQuery,
  rainCatchersQuery,
  scarecrowsQuery,
  structuresQuery,
  treesQuery,
  world,
} from "../ecs/world";
import { isPlayerAdjacent } from "../npcs/NpcManager";
// Scene managers
import {
  CameraManager,
  disposeModelCache,
  GroundBuilder,
  LightingManager,
  NpcMeshManager,
  PlayerMeshManager,
  SceneManager,
  SkyManager,
  TreeMeshManager,
} from "../scene";
import type { SerializedTree } from "../stores/gameStore";
import { useGameStore } from "../stores/gameStore";
import {
  canPlace,
  getStaminaMultiplier as getStructureStaminaMult,
  getTemplate,
} from "../structures/StructureManager";
import { ACHIEVEMENT_DEFS, checkAchievements } from "../systems/achievements";
import { getStageScale, growthSystem } from "../systems/growth";
import {
  collectHarvest,
  harvestSystem,
  initHarvestable,
} from "../systems/harvest";
import type { ObjectTapInfo } from "../systems/InputManager";
import { InputManager } from "../systems/InputManager";
import { movementSystem, setMovementBounds } from "../systems/movement";
import { calculateAllOfflineGrowth } from "../systems/offlineGrowth";
import { hapticLight, hapticMedium, hapticSuccess } from "../systems/platform";
import {
  deserializeGrove,
  loadGroveFromStorage,
  saveGroveToStorage,
} from "../systems/saveLoad";
import { staminaSystem } from "../systems/stamina";
import {
  type GameTime,
  initializeTime,
  type Season,
  updateTime,
} from "../systems/time";
import {
  getWeatherGrowthMultiplier,
  getWeatherStaminaMultiplier,
  initializeWeather,
  rollWindstormDamage,
  updateWeather,
  type WeatherState,
  type WeatherType,
} from "../systems/weather";
import { showAchievement } from "../ui/AchievementPopup";
import type { TileState } from "../ui/ActionButton";
import { showParticle } from "../ui/FloatingParticles";
import { GameUI } from "../ui/GameUI";
import { showToast } from "../ui/Toast";
import { setShowPetals, setWeatherVisual } from "../ui/WeatherOverlay";
import { createRNG, hashString } from "../utils/seedRNG";
import type { WorldDefinition } from "../world";
// World system
import { WorldManager } from "../world";
import startingWorldData from "../world/data/starting-world.json";

export const GameScene = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const movementRef = useRef({ x: 0, z: 0 });
  const groveSeedRef = useRef<string>("");
  const weatherRef = useRef<WeatherState | null>(null);
  const lastWeatherTypeRef = useRef<WeatherType>("clear");
  const milestoneXpRef = useRef<Set<string>>(new Set());

  // Managers (instantiated once, persist across renders via refs)
  const sceneManagerRef = useRef(new SceneManager());
  const cameraManagerRef = useRef(new CameraManager());
  const lightingManagerRef = useRef(new LightingManager());
  const groundBuilderRef = useRef(new GroundBuilder());
  const skyManagerRef = useRef(new SkyManager());
  const playerMeshRef = useRef(new PlayerMeshManager());
  const treeMeshRef = useRef(new TreeMeshManager());
  const npcMeshRef = useRef(new NpcMeshManager());
  const worldManagerRef = useRef(new WorldManager());
  const inputManagerRef = useRef(new InputManager());
  const playerGovernorRef = useRef(new PlayerGovernor());
  const [autopilot, setAutopilot] = useState(
    typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("autopilot"),
  );

  const [seedSelectOpen, setSeedSelectOpen] = useState(false);
  const [toolWheelOpen, setToolWheelOpen] = useState(false);
  const [pauseMenuOpen, setPauseMenuOpen] = useState(false);
  const gameTimeRef = useRef<GameTime | null>(null);
  const [gameTimeState, setGameTimeState] = useState<GameTime | null>(null);
  const lastGameTimeMinuteRef = useRef<number>(-1);
  const [currentWeatherType, setCurrentWeatherType] =
    useState<WeatherType>("clear");
  const [weatherTimeRemaining, setWeatherTimeRemaining] = useState(0);
  const [playerTileInfo, setPlayerTileInfo] = useState<TileState | null>(null);
  const lastPlayerGridRef = useRef<string>("");
  const nearbyNpcRef = useRef<Entity | null>(null);
  const [nearbyNpcTemplateId, setNearbyNpcTemplateId] = useState<string | null>(
    null,
  );
  const [npcDialogueOpen, setNpcDialogueOpen] = useState(false);
  const [interactionTarget, setInteractionTarget] =
    useState<ObjectTapInfo | null>(null);

  const {
    setScreen,
    selectedSpecies,
    selectedTool,
    addXp,
    incrementTreesPlanted,
    incrementTreesHarvested,
    incrementTreesWatered,
    hapticsEnabled,
    addResource,
  } = useGameStore();

  // --- InputManager dialog disable sync ---
  useEffect(() => {
    inputManagerRef.current.setDisabled(
      seedSelectOpen ||
        toolWheelOpen ||
        pauseMenuOpen ||
        npcDialogueOpen ||
        !!interactionTarget,
    );
  }, [
    seedSelectOpen,
    toolWheelOpen,
    pauseMenuOpen,
    npcDialogueOpen,
    interactionTarget,
  ]);

  // --- Autopilot (PlayerGovernor) toggle with G key ---
  useEffect(() => {
    playerGovernorRef.current.enabled = autopilot;
    if (autopilot) {
      inputManagerRef.current.setDisabled(true);
    }
  }, [autopilot]);

  useEffect(() => {
    const handleAutopilotKey = (e: KeyboardEvent) => {
      if (
        e.key.toLowerCase() === "g" &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        setAutopilot((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleAutopilotKey);
    return () => window.removeEventListener("keydown", handleAutopilotKey);
  }, []);

  // --- Save/restore ---
  const saveCurrentGrove = useCallback(() => {
    const trees: SerializedTree[] = [];
    for (const entity of treesQuery) {
      if (!entity.tree || !entity.position) continue;
      trees.push({
        speciesId: entity.tree.speciesId,
        gridX: entity.position.x,
        gridZ: entity.position.z,
        stage: entity.tree.stage,
        progress: entity.tree.progress,
        watered: entity.tree.watered,
        totalGrowthTime: entity.tree.totalGrowthTime,
        plantedAt: entity.tree.plantedAt,
        meshSeed: entity.tree.meshSeed,
      });
    }
    const player = playerQuery.first;
    const playerPos = player?.position
      ? { x: player.position.x, z: player.position.z }
      : { x: 6, z: 6 };
    useGameStore.getState().saveGrove(trees, playerPos);
  }, []);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedSaveGrove = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(saveCurrentGrove, 1000);
  }, [saveCurrentGrove]);

  // --- ECS initialization ---
  useEffect(() => {
    if (playerQuery.first === undefined) {
      const savedGrove = loadGroveFromStorage();
      if (savedGrove) {
        deserializeGrove(savedGrove);
        groveSeedRef.current = savedGrove.seed;

        // Apply offline growth inline to avoid stale closure issues
        const elapsedSeconds = (Date.now() - savedGrove.timestamp) / 1000;
        if (elapsedSeconds > 60) {
          const offlineTrees = Array.from(treesQuery).map((e) => ({
            speciesId: e.tree?.speciesId,
            stage: e.tree?.stage,
            progress: e.tree?.progress,
            watered: e.tree?.watered,
          }));
          const results = calculateAllOfflineGrowth(
            offlineTrees,
            elapsedSeconds,
            (id) => {
              const species = getSpeciesById(id);
              if (!species) return undefined;
              return {
                difficulty: species.difficulty,
                baseGrowthTimes: [...species.baseGrowthTimes],
                evergreen: species.evergreen,
              };
            },
          );
          let stagesAdvanced = 0;
          const treeEntities = Array.from(treesQuery);
          for (let i = 0; i < treeEntities.length; i++) {
            const entity = treeEntities[i];
            const result = results[i];
            if (entity.tree && result) {
              if (result.stage > entity.tree.stage) stagesAdvanced++;
              entity.tree.stage = result.stage as 0 | 1 | 2 | 3 | 4;
              entity.tree.progress = result.progress;
              entity.tree.watered = result.watered;
              if (entity.renderable) {
                entity.renderable.scale = getStageScale(
                  result.stage,
                  result.progress,
                );
              }
            }
          }
          if (stagesAdvanced > 0) {
            queueMicrotask(() => {
              showToast(
                `Trees grew while you were away! (${stagesAdvanced} advanced)`,
                "success",
              );
            });
          }
        }

        world.add(createPlayerEntity());

        // Restore player position inline
        const groveData = useGameStore.getState().groveData;
        if (groveData) {
          const player = playerQuery.first;
          if (player?.position) {
            player.position.x = groveData.playerPosition.x;
            player.position.z = groveData.playerPosition.z;
          }
        }

        for (const tree of treesQuery) {
          if (tree.tree && tree.tree.stage >= 3) initHarvestable(tree);
        }
      } else {
        // New game: only create player here; grid cells come from
        // WorldManager.loadAllZones() during BabylonJS init
        groveSeedRef.current = `grove-${Date.now()}`;
        world.add(createPlayerEntity());
      }
    }
    initializeTime(useGameStore.getState().gameTimeMicroseconds);
  }, []);

  // Auto-save on tab hide — persist to SQLite + IndexedDB
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        saveCurrentGrove();
        // SQLite persist
        if (isDbInitialized()) {
          try {
            const state = useGameStore.getState();
            persistGameStore(state);
            // Save grove trees to DB
            const groveData = state.groveData;
            if (groveData) {
              saveGroveToDb(groveData.trees, groveData.playerPosition);
            }
            // Flush to IndexedDB (fire-and-forget with error logging)
            const { sqlDb } = getDb();
            const data = sqlDb.export();
            saveDatabaseToIndexedDB(data).catch((err) => {
              console.warn("IndexedDB flush failed on visibilitychange:", err);
            });
          } catch (e) {
            console.error("SQLite save failed:", e);
          }
        }
        // Fallback: also save to localStorage for backwards compat
        saveGroveToStorage(GRID_SIZE, groveSeedRef.current);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [saveCurrentGrove]);

  // --- BabylonJS initialization ---
  useEffect(() => {
    if (!canvasRef.current) return;
    let cancelled = false;

    const sm = sceneManagerRef.current;
    const cam = cameraManagerRef.current;
    const lights = lightingManagerRef.current;
    const ground = groundBuilderRef.current;
    const sky = skyManagerRef.current;
    const playerMesh = playerMeshRef.current;
    const treeMesh = treeMeshRef.current;
    const npcMesh = npcMeshRef.current;
    const worldMgr = worldManagerRef.current;

    const initBabylon = async () => {
      const { scene } = await sm.init(canvasRef.current!);
      // React StrictMode double-mounts: if cleanup ran during async init,
      // the engine/scene from this mount are stale — bail out.
      if (cancelled) return;

      // Initialize world first so we know the bounds
      const worldDef = startingWorldData as WorldDefinition;
      worldMgr.init(worldDef, scene);
      worldMgr.loadAllZones();
      const bounds = worldMgr.getWorldBounds();
      setMovementBounds(bounds);

      // Scene managers use world bounds
      const spawnPos = worldMgr.getSpawnPosition() ?? { x: 5.5, z: 5.5 };
      cam.init(scene, spawnPos);
      lights.init(scene);
      ground.init(scene, bounds, worldDef.zones);
      sky.init(scene);
      await playerMesh.init(scene);

      // Add plantable grid overlays for zones where players can plant
      for (const zone of worldDef.zones) {
        if (zone.plantable) {
          ground.addPlantableGrid(scene, zone.id, zone.origin, zone.size);
        }
      }

      // --- InputManager setup ---
      inputManagerRef.current.init({
        canvas: canvasRef.current!,
        movementRef,
        callbacks: {
          onAction: () => handleAction(),
          onOpenSeeds: () => setSeedSelectOpen(true),
          onPause: () => setPauseMenuOpen((prev) => !prev),
          onSelectTool: (index: number) => {
            const tool = TOOLS[index];
            if (
              tool &&
              useGameStore.getState().unlockedTools.includes(tool.id)
            ) {
              useGameStore.getState().setSelectedTool(tool.id);
            }
          },
          onObjectTapped: (info: ObjectTapInfo) => setInteractionTarget(info),
        },
        getScene: () => scene,
        getGridCells: () => gridCellsQuery,
        getWorldBounds: () => worldMgr.getWorldBounds(),
        getPlayerWorldPos: () => {
          const p = playerQuery.first;
          return p?.position
            ? { x: p.position.x, z: p.position.z }
            : { x: 0, z: 0 };
        },
        getPlayerTile: () => {
          const p = playerQuery.first;
          return p?.position
            ? { x: Math.round(p.position.x), z: Math.round(p.position.z) }
            : { x: 0, z: 0 };
        },
      });

      // --- PlayerGovernor setup ---
      playerGovernorRef.current.init({
        movementRef,
        getWorldBounds: () => worldMgr.getWorldBounds(),
      });

      // --- Helper functions (defined inside useEffect to avoid stale closures) ---

      function isNightTime(time: GameTime): boolean {
        return (
          time.timeOfDay === "night" ||
          time.timeOfDay === "midnight" ||
          time.timeOfDay === "evening"
        );
      }

      function processTreeUpdatesInLoop(
        wType: WeatherType,
        gtSec: number,
      ): void {
        for (const entity of treesQuery) {
          if (!entity.tree) continue;
          const tree = entity.tree;

          if (tree.stage >= 3 && !entity.harvestable) {
            initHarvestable(entity);
            useGameStore.getState().incrementTreesMatured();
          }

          // Growth milestone XP
          const species = getSpeciesById(tree.speciesId);
          const diffBonus = species ? species.difficulty - 1 : 0;
          for (const [stage, baseXp] of [
            [2, 15],
            [3, 25],
            [4, 50],
          ] as const) {
            if (tree.stage >= stage) {
              const key = `${entity.id}:${stage}`;
              if (!milestoneXpRef.current.has(key)) {
                milestoneXpRef.current.add(key);
                const xpAmount =
                  stage === 2
                    ? baseXp
                    : baseXp + diffBonus * (stage === 3 ? 10 : 25);
                useGameStore.getState().addXp(xpAmount);
                showParticle(`+${xpAmount} XP`);
              }
            }
          }

          // Windstorm damage (Ironbark is storm immune, scarecrows protect nearby trees)
          if (
            wType === "windstorm" &&
            tree.stage <= 1 &&
            tree.speciesId !== "ironbark"
          ) {
            let scarecrowProtected = false;
            if (entity.position) {
              for (const sc of scarecrowsQuery) {
                if (!sc.position || !sc.scarecrow) continue;
                const sdx = Math.abs(entity.position.x - sc.position.x);
                const sdz = Math.abs(entity.position.z - sc.position.z);
                if (sdx <= sc.scarecrow.radius && sdz <= sc.scarecrow.radius) {
                  scarecrowProtected = true;
                  break;
                }
              }
            }
            if (scarecrowProtected) continue;
            const windRng = createRNG(
              hashString(`wind-${entity.id}-${Math.floor(gtSec / 30)}`),
            );
            if (rollWindstormDamage(windRng())) {
              tree.progress = 0;
              showToast("A young tree was damaged by wind!", "warning");
            }
          }
        }
      }

      function checkAndAwardAchievementsInLoop(): void {
        const store = useGameStore.getState();
        const currentTreeData = Array.from(treesQuery)
          .filter((e) => e.tree && e.position)
          .map((e) => ({
            speciesId: e.tree?.speciesId,
            stage: e.tree?.stage,
            gridX: Math.round(e.position?.x),
            gridZ: Math.round(e.position?.z),
          }));

        // Count plantable tiles for full-grove achievement
        let plantableTileCount = 0;
        for (const cell of gridCellsQuery) {
          if (cell.gridCell && cell.gridCell.type === "soil") {
            plantableTileCount++;
          }
        }

        const newAchievements = checkAchievements({
          treesPlanted: store.treesPlanted,
          lifetimeResources: store.lifetimeResources,
          speciesPlanted: store.speciesPlanted,
          seasonsExperienced: store.seasonsExperienced,
          currentTreeData,
          gridSize: GRID_SIZE,
          plantableTileCount,
          unlockedAchievements: store.achievements,
          hasPrestiged: store.prestigeCount > 0,
          toolUseCounts: store.toolUseCounts,
          zonesDiscovered: store.discoveredZones.length,
          wildTreesHarvested: store.wildTreesHarvested,
          wildTreesRegrown: store.wildTreesRegrown,
          visitedZoneTypes: store.visitedZoneTypes,
          treesPlantedInSpring: store.treesPlantedInSpring,
          treesHarvestedInAutumn: store.treesHarvestedInAutumn,
          unlockedToolCount: store.unlockedTools.length,
          wildSpeciesHarvested: store.wildSpeciesHarvested,
          structuresBuilt: store.placedStructures.length,
          distinctStructureTypesBuilt: new Set(
            store.placedStructures.map((s) => s.templateId),
          ).size,
        });

        for (const id of newAchievements) {
          store.unlockAchievement(id);
          showAchievement(id);
          const def = ACHIEVEMENT_DEFS.find((a) => a.id === id);
          showToast(def ? def.name : id, "achievement");
        }
      }

      // --- Game loop ---
      let lastTime = performance.now();
      let lastSeasonUpdate: Season | null = null;

      sm.startRenderLoop(() => {
        const now = performance.now();
        const deltaMs = now - lastTime;
        // Cap deltaTime to prevent death spirals (e.g. after tab switch or debugger pause)
        const dt = Math.min(deltaMs / 1000, 0.1);
        lastTime = now;

        // Time system
        const currentTime = updateTime(deltaMs);
        gameTimeRef.current = currentTime;

        // Throttle gameTime state updates: only update when the in-game minute changes
        const currentMinute = Math.floor(currentTime.microseconds / 60_000_000);
        if (currentMinute !== lastGameTimeMinuteRef.current) {
          lastGameTimeMinuteRef.current = currentMinute;
          setGameTimeState(currentTime);
        }

        // Weather system
        if (!weatherRef.current) {
          weatherRef.current = initializeWeather(
            currentTime.microseconds / 1_000_000,
          );
        }
        const gameTimeSec = currentTime.microseconds / 1_000_000;
        weatherRef.current = updateWeather(
          weatherRef.current,
          gameTimeSec,
          currentTime.season,
          hashString(groveSeedRef.current || "default"),
        );
        const weatherType = weatherRef.current.current.type;
        if (weatherType !== lastWeatherTypeRef.current) {
          lastWeatherTypeRef.current = weatherType;
          setWeatherVisual(weatherType);
          setCurrentWeatherType(weatherType);
          if (weatherType !== "clear") {
            const labels: Record<string, string> = {
              rain: "It's raining!",
              drought: "Drought!",
              windstorm: "Windstorm!",
            };
            showToast(
              labels[weatherType] ?? weatherType,
              weatherType === "rain" ? "success" : "warning",
            );
          }
        }
        // Update weather time remaining for forecast widget (throttled to avoid excess renders)
        if (Math.floor(now / 2000) !== Math.floor((now - deltaMs) / 2000)) {
          const evt = weatherRef.current.current;
          const remaining = Math.max(
            0,
            evt.startTime + evt.duration - gameTimeSec,
          );
          setWeatherTimeRemaining(remaining);
        }

        // Cherry blossom petals
        setShowPetals(
          treesQuery.entities.some(
            (t) => t.tree?.speciesId === "cherry-blossom" && t.tree.stage >= 3,
          ),
        );

        const weatherGrowthMult = getWeatherGrowthMultiplier(weatherType);

        // Rain catcher auto-watering during rain
        if (weatherType === "rain") {
          for (const catcher of rainCatchersQuery) {
            if (!catcher.position || !catcher.rainCatcher) continue;
            const cx = catcher.position.x;
            const cz = catcher.position.z;
            const radius = catcher.rainCatcher.radius;
            for (const tree of treesQuery) {
              if (!tree.tree || !tree.position || tree.tree.watered) continue;
              const dx = Math.abs(tree.position.x - cx);
              const dz = Math.abs(tree.position.z - cz);
              if (dx <= radius && dz <= radius) {
                tree.tree.watered = true;
              }
            }
          }
        }

        // Scarecrow windstorm protection
        if (weatherType === "windstorm") {
          // Mark trees near scarecrows as protected (handled in processTreeUpdatesInLoop)
        }

        // InputManager update (path following) — must run before movementSystem
        inputManagerRef.current.update();

        // PlayerGovernor update — drives movement when autopilot is active
        playerGovernorRef.current.update(dt);

        // ECS systems
        movementSystem(movementRef.current, dt);
        growthSystem(dt, currentTime.season, weatherGrowthMult);
        staminaSystem(dt);
        harvestSystem(dt);

        // Update player tile info for action button disabled state
        {
          const player = playerQuery.first;
          if (player?.position) {
            const gx = Math.round(player.position.x);
            const gz = Math.round(player.position.z);
            const gridKey = `${gx},${gz}`;
            if (gridKey !== lastPlayerGridRef.current) {
              lastPlayerGridRef.current = gridKey;
              let found = false;
              for (const cell of gridCellsQuery) {
                if (
                  cell.gridCell?.gridX === gx &&
                  cell.gridCell?.gridZ === gz
                ) {
                  const gc = cell.gridCell;
                  let treeStage = -1;
                  if (gc.occupied && gc.treeEntityId) {
                    for (const t of treesQuery) {
                      if (t.id === gc.treeEntityId && t.tree) {
                        treeStage = t.tree.stage;
                        break;
                      }
                    }
                  }
                  setPlayerTileInfo({
                    occupied: gc.occupied,
                    treeStage,
                    cellType: gc.type,
                  });
                  found = true;
                  break;
                }
              }
              if (!found) setPlayerTileInfo(null);

              // NPC proximity check (runs when player grid cell changes)
              let foundNpc: typeof nearbyNpcRef.current = null;
              for (const npcEntity of npcsQuery) {
                if (!npcEntity.npc || !npcEntity.position) continue;
                if (
                  isPlayerAdjacent(
                    gx,
                    gz,
                    npcEntity.position.x,
                    npcEntity.position.z,
                  )
                ) {
                  foundNpc = npcEntity;
                  break;
                }
              }
              if (foundNpc?.id !== nearbyNpcRef.current?.id) {
                nearbyNpcRef.current = foundNpc;
                setNearbyNpcTemplateId(foundNpc?.npc?.templateId ?? null);
              }
            }
          }
        }

        // Scene managers update
        cam.updateViewport();
        lights.update(scene, currentTime);
        sky.update(scene, currentTime.sunIntensity);
        playerMesh.update();
        npcMesh.update(scene);
        cam.trackTarget(
          playerMesh.mesh?.position.x ?? 0,
          playerMesh.mesh?.position.z ?? 0,
          dt,
        );

        const currentIsNight = isNightTime(currentTime);
        treeMesh.update(scene, dt, currentTime.season, currentIsNight);

        // Season change
        if (lastSeasonUpdate !== currentTime.season) {
          lastSeasonUpdate = currentTime.season;
          ground.updateSeason(currentTime.season, currentTime.seasonProgress);
          useGameStore.getState().setCurrentSeason(currentTime.season);
          useGameStore.getState().trackSeason(currentTime.season);

          treeMesh.rebuildAll(scene, currentTime.season, currentIsNight);
        }

        // Periodic updates (every 5s)
        if (Math.floor(now / 5000) !== Math.floor((now - deltaMs) / 5000)) {
          useGameStore.getState().setGameTime(currentTime.microseconds);
          useGameStore.getState().setCurrentDay(currentTime.day);
          checkAndAwardAchievementsInLoop();
        }

        // Auto-save every 30s
        if (Math.floor(now / 30000) !== Math.floor((now - deltaMs) / 30000)) {
          saveGroveToStorage(GRID_SIZE, groveSeedRef.current);
          // SQLite auto-save
          if (isDbInitialized()) {
            try {
              persistGameStore(useGameStore.getState());
              const { sqlDb } = getDb();
              saveDatabaseToIndexedDB(sqlDb.export()).catch((err) => {
                console.warn("Auto-save IndexedDB flush failed:", err);
              });
            } catch (e) {
              console.warn("Auto-save SQLite persist failed:", e);
            }
          }
        }

        // Tree milestone XP and weather damage
        processTreeUpdatesInLoop(weatherType, gameTimeSec);
      });
    };

    initBabylon().catch((err) => {
      console.error("[Grovekeeper] Scene init failed:", err);
    });

    return () => {
      cancelled = true;
      inputManagerRef.current.dispose();
      worldMgr.dispose();
      npcMesh.dispose();
      treeMesh.dispose();
      playerMesh.dispose();
      disposeModelCache();
      sky.dispose();
      ground.dispose();
      lights.dispose();
      cam.dispose();
      sm.dispose();
    };
  }, []);

  // --- Tool actions ---

  const findTreeOnCell = (treeEntityId: string) => {
    for (const tree of treesQuery) {
      if (tree.id === treeEntityId && tree.tree) return tree;
    }
    return null;
  };

  const findCellAtPlayer = () => {
    const player = playerQuery.first;
    if (!player?.position) return null;
    const gridX = Math.round(player.position.x);
    const gridZ = Math.round(player.position.z);
    for (const cell of gridCellsQuery) {
      if (cell.gridCell?.gridX === gridX && cell.gridCell?.gridZ === gridZ) {
        return cell.gridCell;
      }
    }
    return null;
  };

  const useTrowel = async (gc: GridCellComponent) => {
    if (gc.occupied) return;
    if (hapticsEnabled) await hapticLight();
    setSeedSelectOpen(true);
  };

  const useWateringCan = async (gc: GridCellComponent) => {
    if (!gc.occupied || !gc.treeEntityId) return;
    const tree = findTreeOnCell(gc.treeEntityId);
    if (!tree?.tree) return;
    tree.tree.watered = true;
    addXp(5);
    incrementTreesWatered();
    showParticle("+5 XP");
    if (hapticsEnabled) await hapticLight();
  };

  const useAxe = async (gc: GridCellComponent) => {
    if (!gc.occupied || !gc.treeEntityId) return;
    const tree = findTreeOnCell(gc.treeEntityId);
    if (!tree?.tree || tree.tree.stage < 3) return;

    const harvestResources = collectHarvest(
      tree,
      useGameStore.getState().currentSeason,
    );
    if (harvestResources) {
      for (const r of harvestResources)
        addResource(r.type as ResourceType, r.amount);
    } else {
      const species = getSpeciesById(tree.tree.speciesId);
      if (species)
        for (const y of species.yield) addResource(y.resource, y.amount);
    }

    addXp(50);
    incrementTreesHarvested();
    showParticle("+50 XP");

    const harvestSpecies = getSpeciesById(tree.tree.speciesId);
    const gains = harvestResources ?? harvestSpecies?.yield ?? [];
    for (const g of gains) {
      const name =
        (g as { type?: string; resource?: string }).type ??
        (g as { resource?: string }).resource ??
        "";
      showParticle(
        `+${g.amount} ${name.charAt(0).toUpperCase() + name.slice(1)}`,
      );
    }
    if (gains.length > 0) {
      const summary = gains
        .map(
          (g: { type?: string; resource?: string; amount: number }) =>
            `+${g.amount} ${(g.type ?? g.resource ?? "").charAt(0).toUpperCase() + (g.type ?? g.resource ?? "").slice(1)}`,
        )
        .join(", ");
      showToast(`${summary}, +50 XP`, "success");
    }

    treeMeshRef.current.removeMesh(tree.id);
    world.remove(tree);
    gc.occupied = false;
    gc.treeEntityId = null;
    debouncedSaveGrove();
    if (hapticsEnabled) await hapticSuccess();
  };

  const useCompostBin = async (gc: GridCellComponent) => {
    if (!gc.occupied || !gc.treeEntityId) return;
    const tree = findTreeOnCell(gc.treeEntityId);
    if (!tree?.tree) return;
    if (tree.tree.fertilized) {
      showToast("Already fertilized!", "info");
      return;
    }
    // Costs 5 acorns
    if (!useGameStore.getState().spendResource("acorns" as ResourceType, 5)) {
      showToast("Need 5 acorns to fertilize", "warning");
      return;
    }
    tree.tree.fertilized = true;
    addXp(5);
    showParticle("+5 XP");
    showToast("Fertilized! 2x growth for this stage.", "success");
    if (hapticsEnabled) await hapticLight();
  };

  const usePruningShears = async (gc: GridCellComponent) => {
    if (!gc.occupied || !gc.treeEntityId) return;
    const tree = findTreeOnCell(gc.treeEntityId);
    if (!tree?.tree || tree.tree.stage < 3) return;
    // Speed up harvest cooldown by 30%
    if (tree.harvestable) {
      tree.harvestable.cooldownElapsed += tree.harvestable.cooldownTotal * 0.3;
    }
    // Mark pruned for 1.5x yield bonus on next harvest
    tree.tree.pruned = true;
    // Re-init harvestable to recalculate yields with pruned bonus
    if (tree.harvestable) {
      initHarvestable(tree);
    }
    addXp(5);
    showParticle("+5 XP");
    showToast("Pruned! 1.5x yield on next harvest.", "success");
    if (hapticsEnabled) await hapticLight();
  };

  const useShovel = async (gc: GridCellComponent) => {
    // Clear rocks → soil
    if (gc.type === "rock") {
      gc.type = "soil";
      gc.occupied = false;
      addXp(12);
      showParticle("+12 XP");
      showToast("Cleared rocks!", "success");
      debouncedSaveGrove();
      if (hapticsEnabled) await hapticMedium();
      return;
    }
    // Remove stage 0-1 (seed/sprout) trees — dig them up
    if (gc.occupied && gc.treeEntityId) {
      const tree = findTreeOnCell(gc.treeEntityId);
      if (tree?.tree && tree.tree.stage <= 1) {
        treeMeshRef.current.removeMesh(tree.id);
        world.remove(tree);
        gc.occupied = false;
        gc.treeEntityId = null;
        addXp(5);
        showParticle("+5 XP");
        showToast("Removed seedling.", "success");
        debouncedSaveGrove();
        if (hapticsEnabled) await hapticMedium();
      }
    }
  };

  const useAlmanac = async (gc: GridCellComponent) => {
    if (!gc.occupied || !gc.treeEntityId) return;
    const tree = findTreeOnCell(gc.treeEntityId);
    if (!tree?.tree) return;
    const species = getSpeciesById(tree.tree.speciesId);
    const stageName = ["Seed", "Sprout", "Sapling", "Mature", "Old Growth"][
      tree.tree.stage
    ];
    showToast(
      `${species?.name ?? tree.tree.speciesId} — ${stageName} (${Math.round(tree.tree.progress * 100)}%)`,
      "info",
    );
  };

  const useSeedPouch = async (_gc: GridCellComponent) => {
    setSeedSelectOpen(true);
  };

  const useRainCatcher = async (gc: GridCellComponent) => {
    if (gc.occupied) {
      showToast("Tile is occupied!", "warning");
      return;
    }
    const player = playerQuery.first;
    if (!player?.position) return;
    const worldX = Math.round(player.position.x);
    const worldZ = Math.round(player.position.z);

    const entity = {
      id: generateEntityId(),
      position: { x: worldX, y: 0, z: worldZ },
      rainCatcher: { radius: 2 },
    };
    world.add(entity);
    gc.occupied = true;
    addXp(10);
    showParticle("+10 XP");
    showToast(
      "Rain Catcher placed! Waters nearby trees during rain.",
      "success",
    );
    if (hapticsEnabled) await hapticMedium();
  };

  const useFertilizerSpreader = async (_gc: GridCellComponent) => {
    // Area fertilize: all trees in 2-tile radius, costs 3 acorns
    if (!useGameStore.getState().spendResource("acorns" as ResourceType, 3)) {
      showToast("Need 3 acorns to spread fertilizer", "warning");
      return;
    }
    const player = playerQuery.first;
    if (!player?.position) return;
    const px = player.position.x;
    const pz = player.position.z;
    let count = 0;
    for (const tree of treesQuery) {
      if (!tree.tree || !tree.position) continue;
      const dx = Math.abs(tree.position.x - px);
      const dz = Math.abs(tree.position.z - pz);
      if (dx <= 2 && dz <= 2 && !tree.tree.fertilized) {
        tree.tree.fertilized = true;
        count++;
      }
    }
    addXp(15);
    showParticle("+15 XP");
    showToast(`Fertilized ${count} trees! 2x growth.`, "success");
    if (hapticsEnabled) await hapticMedium();
  };

  const useScarecrow = async (gc: GridCellComponent) => {
    if (gc.occupied) {
      showToast("Tile is occupied!", "warning");
      return;
    }
    const player = playerQuery.first;
    if (!player?.position) return;
    const worldX = Math.round(player.position.x);
    const worldZ = Math.round(player.position.z);

    const entity = {
      id: generateEntityId(),
      position: { x: worldX, y: 0, z: worldZ },
      scarecrow: { radius: 3 },
    };
    world.add(entity);
    gc.occupied = true;
    addXp(10);
    showParticle("+10 XP");
    showToast("Scarecrow placed! Protects nearby trees from wind.", "success");
    if (hapticsEnabled) await hapticMedium();
  };

  const useGraftingTool = async (gc: GridCellComponent) => {
    if (!gc.occupied || !gc.treeEntityId) return;
    const tree = findTreeOnCell(gc.treeEntityId);
    if (!tree?.tree || tree.tree.stage < 3) {
      showToast("Need a Mature+ tree to graft", "info");
      return;
    }
    // Find 2 nearest different species trees
    const player = playerQuery.first;
    if (!player?.position) return;
    const nearbySpecies: string[] = [];
    for (const other of treesQuery) {
      if (!other.tree || !other.position || other === tree) continue;
      if (
        other.tree.speciesId !== tree.tree.speciesId &&
        !nearbySpecies.includes(other.tree.speciesId)
      ) {
        nearbySpecies.push(other.tree.speciesId);
        if (nearbySpecies.length >= 2) break;
      }
    }
    if (nearbySpecies.length === 0) {
      showToast("Need nearby trees of different species to graft!", "warning");
      return;
    }
    // Combined yields: original species + first nearby species yields
    const otherSpecies = getSpeciesById(nearbySpecies[0]);
    if (otherSpecies) {
      for (const y of otherSpecies.yield) {
        addResource(y.resource, Math.ceil(y.amount * 0.5));
      }
    }
    addXp(25);
    showParticle("+25 XP");
    showToast(`Grafted! Combined yields with ${nearbySpecies[0]}.`, "success");
    if (hapticsEnabled) await hapticSuccess();
  };

  const toolActions: Record<string, (gc: GridCellComponent) => Promise<void>> =
    {
      trowel: useTrowel,
      "watering-can": useWateringCan,
      axe: useAxe,
      "compost-bin": useCompostBin,
      "pruning-shears": usePruningShears,
      shovel: useShovel,
      almanac: useAlmanac,
      "seed-pouch": useSeedPouch,
      "rain-catcher": useRainCatcher,
      "fertilizer-spreader": useFertilizerSpreader,
      scarecrow: useScarecrow,
      "grafting-tool": useGraftingTool,
    };

  const handleAction = async () => {
    // NPC interaction — open dialogue when near an NPC
    if (nearbyNpcRef.current?.npc) {
      setNpcDialogueOpen(true);
      return;
    }

    const store = useGameStore.getState();

    // Build mode — place a structure at player position
    if (store.buildMode && store.buildTemplateId) {
      const player = playerQuery.first;
      if (!player?.position) return;
      const worldX = Math.round(player.position.x);
      const worldZ = Math.round(player.position.z);
      const template = getTemplate(store.buildTemplateId);
      if (!template) {
        store.setBuildMode(false);
        return;
      }

      // Validate placement
      if (!canPlace(template.id, worldX, worldZ, gridCellsQuery)) {
        showToast("Can't build here!", "warning");
        return;
      }

      // Validate ALL resource costs before spending any (atomicity)
      for (const [resource, amount] of Object.entries(template.cost)) {
        if ((store.resources[resource as ResourceType] ?? 0) < amount) {
          showToast(`Not enough ${resource}!`, "warning");
          return;
        }
      }
      // All costs validated — now spend them
      for (const [resource, amount] of Object.entries(template.cost)) {
        store.spendResource(resource as ResourceType, amount);
      }

      // Create structure ECS entity
      const structureEntity = {
        id: generateEntityId(),
        position: { x: worldX, y: 0, z: worldZ },
        structure: {
          templateId: template.id,
          effectType: template.effect?.type,
          effectRadius: template.effect?.radius,
          effectMagnitude: template.effect?.magnitude,
        },
      };
      world.add(structureEntity);

      // Mark grid cells as occupied
      for (let dx = 0; dx < template.footprint.width; dx++) {
        for (let dz = 0; dz < template.footprint.depth; dz++) {
          for (const cell of gridCellsQuery) {
            if (
              cell.gridCell?.gridX === worldX + dx &&
              cell.gridCell?.gridZ === worldZ + dz
            ) {
              cell.gridCell.occupied = true;
            }
          }
        }
      }

      // Persist
      store.addPlacedStructure(template.id, worldX, worldZ);
      store.setBuildMode(false);
      showToast(`Built ${template.name}!`, "success");
      showParticle("+Build");
      if (hapticsEnabled) await hapticSuccess();
      debouncedSaveGrove();
      return;
    }

    // Normal tool action
    const gc = findCellAtPlayer();
    if (!gc) return;
    const tool = getToolById(selectedTool);
    if (tool && tool.staminaCost > 0) {
      const weatherStaminaMult = weatherRef.current
        ? getWeatherStaminaMultiplier(weatherRef.current.current.type)
        : 1.0;
      // Structure stamina reduction
      const player = playerQuery.first;
      const structStaminaMult = player?.position
        ? getStructureStaminaMult(
            player.position.x,
            player.position.z,
            structuresQuery,
          )
        : 1.0;
      const difficultyStaminaMult = getActiveDifficulty().staminaDrainMult;
      const adjustedCost = Math.ceil(
        tool.staminaCost *
          weatherStaminaMult *
          structStaminaMult *
          difficultyStaminaMult,
      );
      if (!useGameStore.getState().spendStamina(adjustedCost)) return;
    }
    const action = toolActions[selectedTool];
    if (action) await action(gc);
  };

  const handlePlant = async () => {
    const player = playerQuery.first;
    if (!player?.position) return;
    const gridX = Math.round(player.position.x);
    const gridZ = Math.round(player.position.z);

    const species = getSpeciesById(selectedSpecies);
    const store = useGameStore.getState();

    // Validate ALL costs atomically before spending anything
    const currentSeeds = store.seeds[selectedSpecies] ?? 0;
    if (currentSeeds < 1) return;

    if (species?.seedCost) {
      for (const [resource, amount] of Object.entries(species.seedCost)) {
        if ((store.resources[resource as ResourceType] ?? 0) < amount) {
          showToast(`Not enough ${resource}!`, "warning");
          return;
        }
      }
    }

    // All validation passed — now spend resources
    store.spendSeed(selectedSpecies, 1);
    if (species?.seedCost) {
      for (const [resource, amount] of Object.entries(species.seedCost)) {
        store.spendResource(resource as ResourceType, amount);
      }
    }

    for (const cell of gridCellsQuery) {
      if (cell.gridCell?.gridX === gridX && cell.gridCell?.gridZ === gridZ) {
        if (cell.gridCell.occupied) {
          // Refund all costs if tile is occupied
          useGameStore.getState().addSeed(selectedSpecies, 1);
          if (species?.seedCost) {
            for (const [resource, amount] of Object.entries(species.seedCost)) {
              useGameStore
                .getState()
                .addResource(resource as ResourceType, amount);
            }
          }
          return;
        }

        const tree = createTreeEntity(gridX, gridZ, selectedSpecies);
        world.add(tree);
        cell.gridCell.occupied = true;
        cell.gridCell.treeEntityId = tree.id;

        incrementTreesPlanted();
        useGameStore.getState().trackSpeciesPlanted(selectedSpecies);
        const plantXp = 10 + (species ? (species.difficulty - 1) * 5 : 0);
        addXp(plantXp);
        showParticle(`+${plantXp} XP`);

        debouncedSaveGrove();
        if (hapticsEnabled) await hapticMedium();
        break;
      }
    }
  };

  const handleBatchHarvest = useCallback(() => {
    let count = 0;
    const gains: Record<string, number> = {};
    for (const entity of treesQuery) {
      if (!entity.harvestable?.ready || !entity.tree) continue;
      // Cost 5 stamina per tree (bulk discount)
      if (!useGameStore.getState().spendStamina(5)) break;
      const harvestResources = collectHarvest(
        entity,
        useGameStore.getState().currentSeason,
      );
      if (harvestResources) {
        for (const r of harvestResources) {
          addResource(r.type as ResourceType, r.amount);
          gains[r.type] = (gains[r.type] ?? 0) + r.amount;
        }
      } else {
        const species = getSpeciesById(entity.tree.speciesId);
        if (species) {
          for (const y of species.yield) {
            addResource(y.resource, y.amount);
            gains[y.resource] = (gains[y.resource] ?? 0) + y.amount;
          }
        }
      }
      incrementTreesHarvested();
      count++;
    }
    if (count > 0) {
      const xp = count * 50;
      addXp(xp);
      showParticle(`+${xp} XP`);
      const summary = Object.entries(gains)
        .map(([r, a]) => `+${a} ${r.charAt(0).toUpperCase() + r.slice(1)}`)
        .join(", ");
      showToast(`Harvested ${count} trees! ${summary}`, "success");
    }
  }, [addResource, addXp, incrementTreesHarvested]);

  const handleInteractionAction = useCallback(
    async (actionId: string) => {
      if (!interactionTarget) return;

      const { entityId, entityType } = interactionTarget;
      setInteractionTarget(null);

      if (entityType === "npc") {
        // Find the NPC entity and open dialogue
        for (const npcEntity of npcsQuery) {
          if (npcEntity.id === entityId && npcEntity.npc) {
            nearbyNpcRef.current = npcEntity;
            setNearbyNpcTemplateId(npcEntity.npc.templateId);
            setNpcDialogueOpen(true);
            break;
          }
        }
        return;
      }

      if (entityType === "tree") {
        // Find the tree entity
        let treeEntity = null;
        for (const t of treesQuery) {
          if (t.id === entityId) {
            treeEntity = t;
            break;
          }
        }
        if (!treeEntity?.tree) return;

        // Find the grid cell for this tree
        let gc: GridCellComponent | null = null;
        if (treeEntity.position) {
          const gx = Math.round(treeEntity.position.x);
          const gz = Math.round(treeEntity.position.z);
          for (const cell of gridCellsQuery) {
            if (cell.gridCell?.gridX === gx && cell.gridCell?.gridZ === gz) {
              gc = cell.gridCell;
              break;
            }
          }
        }
        if (!gc) return;

        switch (actionId) {
          case "water":
            if (gc.treeEntityId) await toolActions["watering-can"]?.(gc);
            break;
          case "prune":
            if (gc.treeEntityId) await toolActions["pruning-shears"]?.(gc);
            break;
          case "harvest":
            if (gc.treeEntityId) await toolActions.axe?.(gc);
            break;
          case "inspect":
            if (gc.treeEntityId) await toolActions.almanac?.(gc);
            break;
        }
      }
    },
    [interactionTarget, toolActions],
  );

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ touchAction: "none" }}
      />
      {autopilot && (
        <div
          className="absolute top-12 left-1/2 -translate-x-1/2 z-50 px-3 py-1 rounded-full text-xs font-bold tracking-wider"
          style={{
            background: "rgba(34,197,94,0.85)",
            color: "#fff",
            pointerEvents: "none",
          }}
        >
          AUTOPILOT [G]
        </div>
      )}
      <GameUI
        onAction={handleAction}
        onPlant={handlePlant}
        onOpenMenu={() => setPauseMenuOpen(true)}
        onOpenTools={() => setToolWheelOpen(true)}
        seedSelectOpen={seedSelectOpen}
        setSeedSelectOpen={setSeedSelectOpen}
        toolWheelOpen={toolWheelOpen}
        setToolWheelOpen={setToolWheelOpen}
        pauseMenuOpen={pauseMenuOpen}
        setPauseMenuOpen={setPauseMenuOpen}
        onMainMenu={() => {
          setPauseMenuOpen(false);
          setScreen("menu");
        }}
        onBatchHarvest={handleBatchHarvest}
        currentWeather={currentWeatherType}
        weatherTimeRemaining={weatherTimeRemaining}
        gameTime={gameTimeState}
        playerTileInfo={playerTileInfo}
        nearbyNpcTemplateId={nearbyNpcTemplateId}
        npcDialogueOpen={npcDialogueOpen}
        setNpcDialogueOpen={setNpcDialogueOpen}
        interactionTarget={interactionTarget}
        onInteractionAction={handleInteractionAction}
        onDismissInteraction={() => setInteractionTarget(null)}
      />
    </div>
  );
};
