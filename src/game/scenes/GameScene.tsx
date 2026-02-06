/**
 * GameScene — Orchestrator component for the BabylonJS game scene.
 *
 * Initializes ECS entities, creates scene managers, runs the game loop,
 * and handles player actions. All BabylonJS concerns are delegated to
 * managers in src/game/scene/.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { GRID_SIZE } from "../constants/config";
import { getSpeciesById } from "../constants/trees";
import { TOOLS, getToolById } from "../constants/tools";
import type { ResourceType } from "../constants/resources";
import { createPlayerEntity, createTreeEntity } from "../ecs/archetypes";
import { gridCellsQuery, playerQuery, treesQuery, structuresQuery, world } from "../ecs/world";
import type { GridCellComponent } from "../ecs/world";
import { createRNG, hashString } from "../utils/seedRNG";
import type { SerializedTree } from "../stores/gameStore";
import { useGameStore } from "../stores/gameStore";
import { growthSystem, getStageScale } from "../systems/growth";
import { staminaSystem } from "../systems/stamina";
import { harvestSystem, initHarvestable, collectHarvest } from "../systems/harvest";
import { movementSystem, setMovementBounds } from "../systems/movement";
import { saveGroveToStorage, loadGroveFromStorage, deserializeGrove } from "../systems/saveLoad";
import { useKeyboardInput } from "../hooks/useKeyboardInput";
import {
  initializeTime, updateTime,
  type GameTime, type Season,
} from "../systems/time";
import { hapticMedium, hapticLight, hapticSuccess } from "../systems/platform";
import { checkAchievements, ACHIEVEMENT_DEFS } from "../systems/achievements";
import { calculateAllOfflineGrowth } from "../systems/offlineGrowth";
import { showToast } from "../ui/Toast";
import { showParticle } from "../ui/FloatingParticles";
import { showAchievement } from "../ui/AchievementPopup";
import {
  initializeWeather, updateWeather, getWeatherGrowthMultiplier,
  getWeatherStaminaMultiplier, rollWindstormDamage,
  type WeatherState, type WeatherType,
} from "../systems/weather";
import { setWeatherVisual, setShowPetals } from "../ui/WeatherOverlay";
import { GameUI } from "../ui/GameUI";
import { getStaminaMultiplier as getStructureStaminaMult } from "../structures/StructureManager";

// Scene managers
import {
  SceneManager, CameraManager, LightingManager,
  GroundBuilder, SkyManager, PlayerMeshManager,
  TreeMeshManager,
} from "../scene";

// World system
import { WorldManager } from "../world";
import type { WorldDefinition } from "../world";
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
  const worldManagerRef = useRef(new WorldManager());

  const [seedSelectOpen, setSeedSelectOpen] = useState(false);
  const [toolWheelOpen, setToolWheelOpen] = useState(false);
  const [pauseMenuOpen, setPauseMenuOpen] = useState(false);
  const [gameTime, setGameTime] = useState<GameTime | null>(null);

  const {
    setScreen, selectedSpecies, selectedTool,
    addXp, incrementTreesPlanted, incrementTreesHarvested,
    incrementTreesWatered, setGameTime: storeSetGameTime,
    setCurrentSeason, setCurrentDay, hapticsEnabled, addResource,
  } = useGameStore();

  // --- Keyboard controls ---
  useKeyboardInput({
    onMove: (x: number, z: number) => { movementRef.current = { x, z }; },
    onMoveEnd: () => { movementRef.current = { x: 0, z: 0 }; },
    onAction: () => { handleAction(); },
    onOpenSeeds: () => { setSeedSelectOpen(true); },
    onPause: () => { setPauseMenuOpen((prev) => !prev); },
    onSelectTool: (index: number) => {
      const tool = TOOLS[index];
      if (tool && useGameStore.getState().unlockedTools.includes(tool.id)) {
        useGameStore.getState().setSelectedTool(tool.id);
      }
    },
    disabled: seedSelectOpen || toolWheelOpen || pauseMenuOpen,
  });

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
        applyOfflineGrowth(savedGrove.timestamp);
        world.add(createPlayerEntity());
        restorePlayerPosition();
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

  // Auto-save on tab hide
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        saveCurrentGrove();
        saveGroveToStorage(GRID_SIZE, groveSeedRef.current);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [saveCurrentGrove]);

  // --- BabylonJS initialization ---
  useEffect(() => {
    if (!canvasRef.current) return;

    const sm = sceneManagerRef.current;
    const cam = cameraManagerRef.current;
    const lights = lightingManagerRef.current;
    const ground = groundBuilderRef.current;
    const sky = skyManagerRef.current;
    const playerMesh = playerMeshRef.current;
    const treeMesh = treeMeshRef.current;
    const worldMgr = worldManagerRef.current;

    const initBabylon = async () => {
      const { scene } = await sm.init(canvasRef.current!);

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
      ground.init(scene, bounds);
      sky.init(scene);
      playerMesh.init(scene);

      // Create per-zone ground overlays
      for (const zone of worldDef.zones) {
        ground.addZoneGround(
          scene,
          zone.id,
          zone.origin,
          zone.size,
          zone.groundMaterial,
          zone.plantable,
        );
      }

      // --- Game loop ---
      let lastTime = performance.now();
      let lastSeasonUpdate: Season | null = null;

      sm.startRenderLoop(() => {
        const now = performance.now();
        const deltaMs = now - lastTime;
        const dt = deltaMs / 1000;
        lastTime = now;

        // Time system
        const currentTime = updateTime(deltaMs);
        setGameTime(currentTime);

        // Weather system
        if (!weatherRef.current) {
          weatherRef.current = initializeWeather(currentTime.microseconds / 1_000_000);
        }
        const gameTimeSec = currentTime.microseconds / 1_000_000;
        weatherRef.current = updateWeather(
          weatherRef.current, gameTimeSec,
          currentTime.season, hashString(groveSeedRef.current || "default"),
        );
        const weatherType = weatherRef.current.current.type;
        if (weatherType !== lastWeatherTypeRef.current) {
          lastWeatherTypeRef.current = weatherType;
          setWeatherVisual(weatherType);
          if (weatherType !== "clear") {
            const labels: Record<string, string> = { rain: "It's raining!", drought: "Drought!", windstorm: "Windstorm!" };
            showToast(labels[weatherType] ?? weatherType, weatherType === "rain" ? "success" : "warning");
          }
        }

        // Cherry blossom petals
        setShowPetals(treesQuery.entities.some(
          (t) => t.tree?.speciesId === "cherry-blossom" && t.tree.stage >= 3,
        ));

        const weatherGrowthMult = getWeatherGrowthMultiplier(weatherType);

        // ECS systems
        movementSystem(movementRef.current, dt);
        growthSystem(dt, currentTime.season, weatherGrowthMult);
        staminaSystem(dt);
        harvestSystem(dt);

        // Scene managers update
        lights.update(scene, currentTime);
        sky.update(scene, currentTime.sunIntensity);
        playerMesh.update();
        cam.trackTarget(
          playerMesh.mesh?.position.x ?? 0,
          playerMesh.mesh?.position.z ?? 0,
          dt,
        );

        const currentIsNight = isNight(currentTime);
        treeMesh.update(scene, dt, currentTime.season, currentIsNight);

        // Season change
        if (lastSeasonUpdate !== currentTime.season) {
          lastSeasonUpdate = currentTime.season;
          ground.updateSeason(currentTime.season, currentTime.seasonProgress);
          setCurrentSeason(currentTime.season);
          useGameStore.getState().trackSeason(currentTime.season);

          treeMesh.rebuildAll(scene, currentTime.season, currentIsNight);
        }

        // Periodic updates (every 5s)
        if (Math.floor(now / 5000) !== Math.floor((now - deltaMs) / 5000)) {
          storeSetGameTime(currentTime.microseconds);
          setCurrentDay(currentTime.day);
          checkAndAwardAchievements();
        }

        // Auto-save every 30s
        if (Math.floor(now / 30000) !== Math.floor((now - deltaMs) / 30000)) {
          saveGroveToStorage(GRID_SIZE, groveSeedRef.current);
        }

        // Tree milestone XP and weather damage
        processTreeUpdates(weatherType, gameTimeSec);
      });
    };

    initBabylon();

    return () => {
      worldMgr.dispose();
      treeMesh.dispose();
      playerMesh.dispose();
      sky.dispose();
      ground.dispose();
      lights.dispose();
      cam.dispose();
      sm.dispose();
    };
  }, []);

  // --- Helper functions ---

  function isNight(time: GameTime): boolean {
    return time.timeOfDay === "night" || time.timeOfDay === "midnight" || time.timeOfDay === "evening";
  }

  function applyOfflineGrowth(savedTimestamp: number): void {
    const elapsedSeconds = (Date.now() - savedTimestamp) / 1000;
    if (elapsedSeconds <= 60) return;

    const offlineTrees = Array.from(treesQuery).map((e) => ({
      speciesId: e.tree!.speciesId,
      stage: e.tree!.stage,
      progress: e.tree!.progress,
      watered: e.tree!.watered,
    }));
    const results = calculateAllOfflineGrowth(offlineTrees, elapsedSeconds, (id) => {
      const species = getSpeciesById(id);
      if (!species) return undefined;
      return { difficulty: species.difficulty, baseGrowthTimes: [...species.baseGrowthTimes], evergreen: species.evergreen };
    });
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
        entity.renderable!.scale = getStageScale(result.stage, result.progress);
      }
    }
    if (stagesAdvanced > 0) {
      queueMicrotask(() => {
        showToast(`Trees grew while you were away! (${stagesAdvanced} advanced)`, "success");
      });
    }
  }

  function restorePlayerPosition(): void {
    const groveData = useGameStore.getState().groveData;
    if (groveData) {
      const player = playerQuery.first;
      if (player?.position) {
        player.position.x = groveData.playerPosition.x;
        player.position.z = groveData.playerPosition.z;
      }
    }
  }

  function processTreeUpdates(weatherType: WeatherType, gameTimeSec: number): void {
    for (const entity of treesQuery) {
      if (!entity.tree) continue;
      const tree = entity.tree;

      if (tree.stage >= 3 && !entity.harvestable) {
        initHarvestable(entity);
        useGameStore.getState().incrementTreesMatured();
      }

      // Growth milestone XP
      const species = getSpeciesById(tree.speciesId);
      const diffBonus = species ? (species.difficulty - 1) : 0;
      for (const [stage, baseXp] of [[2, 15], [3, 25], [4, 50]] as const) {
        if (tree.stage >= stage) {
          const key = `${entity.id}:${stage}`;
          if (!milestoneXpRef.current.has(key)) {
            milestoneXpRef.current.add(key);
            const xpAmount = stage === 2 ? baseXp : baseXp + diffBonus * (stage === 3 ? 10 : 25);
            useGameStore.getState().addXp(xpAmount);
            showParticle(`+${xpAmount} XP`);
          }
        }
      }

      // Windstorm damage
      if (weatherType === "windstorm" && tree.stage <= 1) {
        const windRng = createRNG(hashString(`wind-${entity.id}-${Math.floor(gameTimeSec / 30)}`));
        if (rollWindstormDamage(windRng())) {
          tree.progress = 0;
          showToast("A young tree was damaged by wind!", "warning");
        }
      }
    }
  }

  function checkAndAwardAchievements(): void {
    const store = useGameStore.getState();
    const currentTreeData = Array.from(treesQuery)
      .filter((e) => e.tree && e.position)
      .map((e) => ({
        speciesId: e.tree!.speciesId,
        stage: e.tree!.stage,
        gridX: Math.round(e.position!.x),
        gridZ: Math.round(e.position!.z),
      }));

    const newAchievements = checkAchievements({
      treesPlanted: store.treesPlanted,
      treesMatured: store.treesMatured,
      treesHarvested: store.treesHarvested,
      lifetimeResources: store.lifetimeResources,
      speciesPlanted: store.speciesPlanted,
      seasonsExperienced: store.seasonsExperienced,
      currentTreeData,
      gridSize: GRID_SIZE,
      unlockedAchievements: store.achievements,
    });

    for (const id of newAchievements) {
      store.unlockAchievement(id);
      showAchievement(id);
      const def = ACHIEVEMENT_DEFS.find((a) => a.id === id);
      showToast(def ? def.name : id, "achievement");
    }
  }

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

    const harvestResources = collectHarvest(tree);
    if (harvestResources) {
      for (const r of harvestResources) addResource(r.type as ResourceType, r.amount);
    } else {
      const species = getSpeciesById(tree.tree.speciesId);
      if (species) for (const y of species.yield) addResource(y.resource, y.amount);
    }

    addXp(50);
    incrementTreesHarvested();
    showParticle("+50 XP");

    const harvestSpecies = getSpeciesById(tree.tree.speciesId);
    const gains = harvestResources ?? harvestSpecies?.yield ?? [];
    for (const g of gains) {
      const name = (g as { type?: string; resource?: string }).type
        ?? (g as { resource?: string }).resource ?? "";
      showParticle(`+${g.amount} ${name.charAt(0).toUpperCase() + name.slice(1)}`);
    }
    if (gains.length > 0) {
      const summary = gains.map((g: { type?: string; resource?: string; amount: number }) =>
        `+${g.amount} ${(g.type ?? g.resource ?? "").charAt(0).toUpperCase() + (g.type ?? g.resource ?? "").slice(1)}`,
      ).join(", ");
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
    tree.tree.progress += 0.1;
    addXp(5);
    showParticle("+5 XP");
    if (hapticsEnabled) await hapticLight();
  };

  const usePruningShears = async (gc: GridCellComponent) => {
    if (!gc.occupied || !gc.treeEntityId) return;
    const tree = findTreeOnCell(gc.treeEntityId);
    if (!tree?.tree || tree.tree.stage < 3) return;
    if (tree.harvestable) {
      tree.harvestable.cooldownElapsed += tree.harvestable.cooldownTotal * 0.3;
    }
    addXp(5);
    showParticle("+5 XP");
    showToast("Pruned! Harvest sooner.", "success");
    if (hapticsEnabled) await hapticLight();
  };

  const useShovel = async (gc: GridCellComponent) => {
    if (gc.type !== "rock") return;
    gc.type = "soil";
    gc.occupied = false;
    addXp(12);
    showParticle("+12 XP");
    showToast("Cleared rocks!", "success");
    debouncedSaveGrove();
    if (hapticsEnabled) await hapticMedium();
  };

  const useAlmanac = async (gc: GridCellComponent) => {
    if (!gc.occupied || !gc.treeEntityId) return;
    const tree = findTreeOnCell(gc.treeEntityId);
    if (!tree?.tree) return;
    const species = getSpeciesById(tree.tree.speciesId);
    const stageName = ["Seed", "Sprout", "Sapling", "Mature", "Old Growth"][tree.tree.stage];
    showToast(
      `${species?.name ?? tree.tree.speciesId} — ${stageName} (${Math.round(tree.tree.progress * 100)}%)`,
      "info",
    );
  };

  const useSeedPouch = async (_gc: GridCellComponent) => {
    setSeedSelectOpen(true);
  };

  const toolActions: Record<string, (gc: GridCellComponent) => Promise<void>> = {
    "trowel": useTrowel,
    "watering-can": useWateringCan,
    "axe": useAxe,
    "compost-bin": useCompostBin,
    "pruning-shears": usePruningShears,
    "shovel": useShovel,
    "almanac": useAlmanac,
    "seed-pouch": useSeedPouch,
  };

  const handleAction = async () => {
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
        ? getStructureStaminaMult(player.position.x, player.position.z, structuresQuery)
        : 1.0;
      const adjustedCost = Math.ceil(tool.staminaCost * weatherStaminaMult * structStaminaMult);
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
    if (!useGameStore.getState().spendSeed(selectedSpecies, 1)) return;

    if (species?.seedCost) {
      for (const [resource, amount] of Object.entries(species.seedCost)) {
        if (!useGameStore.getState().spendResource(resource as ResourceType, amount)) {
          useGameStore.getState().addSeed(selectedSpecies, 1);
          return;
        }
      }
    }

    for (const cell of gridCellsQuery) {
      if (cell.gridCell?.gridX === gridX && cell.gridCell?.gridZ === gridZ) {
        if (cell.gridCell.occupied) {
          useGameStore.getState().addSeed(selectedSpecies, 1);
          if (species?.seedCost) {
            for (const [resource, amount] of Object.entries(species.seedCost)) {
              useGameStore.getState().addResource(resource as ResourceType, amount);
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

  const handleMove = useCallback((x: number, z: number) => {
    movementRef.current = { x, z };
  }, []);

  const handleMoveEnd = useCallback(() => {
    movementRef.current = { x: 0, z: 0 };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ touchAction: "none" }}
      />
      <GameUI
        onMove={handleMove}
        onMoveEnd={handleMoveEnd}
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
        onMainMenu={() => { setPauseMenuOpen(false); setScreen("menu"); }}
        gameTime={gameTime}
      />
    </div>
  );
};
