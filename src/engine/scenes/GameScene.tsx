/**
 * GameScene — Orchestrator component for the BabylonJS game scene.
 *
 * Initializes ECS entities, creates scene managers, runs the game loop,
 * and handles player actions. All BabylonJS concerns are delegated to
 * managers in src/game/scene/.
 */

import type { Entity } from "koota";
import { useCallback, useEffect, useRef, useState } from "react";
import type { NpcBrainContext } from "@/ai/NpcBrain";
import { NpcBrain } from "@/ai/NpcBrain";
import { PlayerGovernor } from "@/ai/PlayerGovernor";
import { COLORS, GRID_SIZE } from "@/config/config";
import { getActiveDifficulty } from "@/config/difficulty";
import type { ResourceType } from "@/config/resources";
import { getToolById, TOOLS } from "@/config/tools";
import { getSpeciesById } from "@/config/trees";
import { getDb, isDbInitialized } from "@/db/client";
import { saveDatabaseToIndexedDB } from "@/db/persist";
import { persistGameStore, saveGroveToDb } from "@/db/queries";
import type { GroundTapInfo, ObjectTapInfo } from "@/input/InputManager";
import { InputManager } from "@/input/InputManager";
import {
  buildWalkabilityGrid,
  type WalkabilityGrid,
} from "@/input/pathfinding";
import { koota, spawnPlayer } from "@/koota";
import { isPlayerAdjacent } from "@/npcs/NpcManager";
import { getChainDef } from "@/quests/questChainEngine";
import { createRNG, hashString } from "@/shared/utils/seedRNG";
import { worldToScreen } from "@/shared/utils/worldToScreen";
import { spawnTree } from "@/startup";
import type { SerializedTree } from "@/stores/gameStore";
import { useGameStore } from "@/stores/gameStore";
import {
  canPlace,
  getStaminaMultiplier as getStructureStaminaMult,
  getTemplate,
} from "@/structures/StructureManager";
import { audioManager } from "@/systems/AudioManager";
import { ACHIEVEMENT_DEFS, checkAchievements } from "@/systems/achievements";
import { getStageScale, growthSystem } from "@/systems/growth";
import {
  collectHarvest,
  harvestSystem,
  initHarvestable,
} from "@/systems/harvest";
import { movementSystem, setMovementBounds } from "@/systems/movement";
import {
  cancelAllNpcMovements,
  isNpcMoving,
  updateNpcMovement,
} from "@/systems/npcMovement";
import { calculateAllOfflineGrowth } from "@/systems/offlineGrowth";
import { hapticLight, hapticMedium, hapticSuccess } from "@/systems/platform";
import {
  deserializeGrove,
  loadGroveFromStorage,
  saveGroveToStorage,
} from "@/systems/saveLoad";
import { staminaSystem } from "@/systems/stamina";
import {
  type GameTime,
  initializeTime,
  type Season,
  updateTime,
} from "@/systems/time";
import { TutorialController } from "@/systems/tutorialController";
import {
  getWeatherGrowthMultiplier,
  getWeatherStaminaMultiplier,
  initializeWeather,
  rollWindstormDamage,
  updateWeather,
  type WeatherState,
  type WeatherType,
} from "@/systems/weather";
import { showAchievement } from "@/ui/game/AchievementPopup";
import type { TileState } from "@/ui/game/ActionButton";
import { showParticle } from "@/ui/game/FloatingParticles";
import { GameUI } from "@/ui/game/GameUI";
import type { RadialAction } from "@/ui/game/radialActions";
import { getActionsForTile } from "@/ui/game/radialActions";
import { showToast } from "@/ui/game/Toast";
import { setShowPetals, setWeatherVisual } from "@/ui/game/WeatherOverlay";
import {
  GridCell,
  Harvestable,
  IsPlayer,
  Npc,
  Position,
  RainCatcher,
  Renderable,
  Scarecrow,
  Structure,
  Tree,
} from "@/traits";
import type { WorldDefinition } from "@/world-data";

/** Shape matching Koota GridCell trait, used for tool action params. */
interface GridCellComponent {
  gridX: number;
  gridZ: number;
  type: "soil" | "water" | "rock" | "path";
  occupied: boolean;
  treeEntity: Entity | null;
}

interface StructureComponent {
  templateId: string;
  effectType?: "growth_boost" | "harvest_boost" | "stamina_regen" | "storage";
  effectRadius?: number;
  effectMagnitude?: number;
}
// World system
import { WorldManager } from "@/world-data";
import startingWorldData from "@/world-data/data/starting-world.json";
import type { NpcQuestMarkerType } from "../scene";
// Scene managers
import {
  CameraManager,
  disposeModelCache,
  GroundBuilder,
  LightingManager,
  NpcMeshManager,
  PlayerMeshManager,
  SceneManager,
  SelectionRingManager,
  SkyManager,
  TreeMeshManager,
} from "../scene";

/** Radial menu target — tile info for the tapped position. */
interface RadialTarget {
  worldX: number;
  worldZ: number;
  gridX: number;
  gridZ: number;
  cellType: string;
  occupied: boolean;
  treeEntity: Entity | null;
  treeStage: number;
  treeWatered: boolean;
  hasNpc: boolean;
  /** Entity from object pick, if any. */
  entity: { entityId: number; entityType: string } | null;
}

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
  const selectionRingRef = useRef(new SelectionRingManager());
  const npcBrainsRef = useRef(new Map<string, NpcBrain>());
  const tutorialRef = useRef(new TutorialController());
  const [autopilot, setAutopilot] = useState(
    typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("autopilot"),
  );

  const [sceneReady, setSceneReady] = useState(false);
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
  // Note: Entity is Koota entity ref
  const [nearbyNpcTemplateId, setNearbyNpcTemplateId] = useState<string | null>(
    null,
  );
  const [npcDialogueOpen, setNpcDialogueOpen] = useState(false);
  const [tutorialHighlightId, setTutorialHighlightId] = useState<string | null>(
    null,
  );
  const [tutorialHighlightLabel, setTutorialHighlightLabel] = useState<
    string | null
  >(null);
  const [tutorialDialogueId, setTutorialDialogueId] = useState<string | null>(
    null,
  );

  // Radial action menu state
  const [radialTarget, setRadialTarget] = useState<RadialTarget | null>(null);
  const [radialScreenPos, setRadialScreenPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [radialActions, setRadialActions] = useState<RadialAction[]>([]);
  const pendingRadialRef = useRef<RadialTarget | null>(null);
  const lastRadialScreenRef = useRef<{ x: number; y: number } | null>(null);
  const radialTargetRef = useRef<RadialTarget | null>(null);

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

  // --- Sync audio enabled with gameStore ---
  useEffect(() => {
    audioManager.setEnabled(useGameStore.getState().soundEnabled);
    const unsub = useGameStore.subscribe((s) => {
      audioManager.setEnabled(s.soundEnabled);
    });
    return unsub;
  }, []);

  // --- InputManager dialog disable sync ---
  useEffect(() => {
    inputManagerRef.current.setDisabled(
      seedSelectOpen ||
        toolWheelOpen ||
        pauseMenuOpen ||
        npcDialogueOpen ||
        !!radialTarget,
    );
  }, [
    seedSelectOpen,
    toolWheelOpen,
    pauseMenuOpen,
    npcDialogueOpen,
    radialTarget,
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
    for (const entity of koota.query(Tree, Position)) {
      const tree = entity.get(Tree);
      const pos = entity.get(Position);
      trees.push({
        speciesId: tree.speciesId,
        gridX: pos.x,
        gridZ: pos.z,
        stage: tree.stage,
        progress: tree.progress,
        watered: tree.watered,
        totalGrowthTime: tree.totalGrowthTime,
        plantedAt: tree.plantedAt,
        meshSeed: tree.meshSeed,
      });
    }
    const player = koota.queryFirst(IsPlayer, Position);
    const playerPos = player
      ? { x: player.get(Position).x, z: player.get(Position).z }
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
    if (koota.queryFirst(IsPlayer, Position) === undefined) {
      const savedGrove = loadGroveFromStorage();
      if (savedGrove) {
        deserializeGrove(savedGrove);
        groveSeedRef.current = savedGrove.seed;

        // Apply offline growth inline to avoid stale closure issues
        const elapsedSeconds = (Date.now() - savedGrove.timestamp) / 1000;
        if (elapsedSeconds > 60) {
          const treeEntities = Array.from(koota.query(Tree, Position, Renderable));
          const offlineTrees = treeEntities.map((e) => {
            const t = e.get(Tree);
            return {
              speciesId: t.speciesId,
              stage: t.stage,
              progress: t.progress,
              watered: t.watered,
            };
          });
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
          for (let i = 0; i < treeEntities.length; i++) {
            const entity = treeEntities[i];
            const result = results[i];
            if (result) {
              const t = entity.get(Tree);
              if (result.stage > t.stage) stagesAdvanced++;
              entity.set(Tree, {
                ...t,
                stage: result.stage as 0 | 1 | 2 | 3 | 4,
                progress: result.progress,
                watered: result.watered,
              });
              const r = entity.get(Renderable);
              entity.set(Renderable, {
                ...r,
                scale: getStageScale(result.stage, result.progress),
              });
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

        spawnPlayer();

        // Restore player position inline
        const groveData = useGameStore.getState().groveData;
        if (groveData) {
          const player = koota.queryFirst(IsPlayer, Position);
          if (player) {
            const p = player.get(Position);
            player.set(Position, {
              ...p,
              x: groveData.playerPosition.x,
              z: groveData.playerPosition.z,
            });
          }
        }

        for (const tree of koota.query(Tree, Position)) {
          if (tree.get(Tree).stage >= 3) initHarvestable(tree);
        }
      } else {
        // New game: only create player here; grid cells come from
        // WorldManager.loadAllZones() during BabylonJS init
        groveSeedRef.current = `grove-${Date.now()}`;
        spawnPlayer();
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
            persistGameStore(state as unknown as Record<string, unknown>);
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
    const canvas = canvasRef.current;
    if (!canvas) return;
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
      const { scene } = await sm.init(canvas);
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

      // --- Selection ring setup ---
      const selRing = selectionRingRef.current;
      selRing.init(scene);

      // --- InputManager setup ---
      inputManagerRef.current.init({
        canvas,
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
              audioManager.play("toolSelect");
            }
          },
          onObjectTapped: (_info: ObjectTapInfo) => {
            // Object taps are now handled via onGroundTapped (unified flow)
          },
          onGroundTapped: (info: GroundTapInfo) => {
            handleGroundTapped(info);
          },
        },
        getScene: () => scene,
        getGridCells: () => {
          const snap: { gridCell: GridCellComponent }[] = [];
          for (const e of koota.query(GridCell, Position)) {
            snap.push({ gridCell: e.get(GridCell) });
          }
          return snap;
        },
        getWorldBounds: () => worldMgr.getWorldBounds(),
        getPlayerWorldPos: () => {
          const p = koota.queryFirst(IsPlayer, Position);
          if (!p) return { x: 0, z: 0 };
          const pos = p.get(Position);
          return { x: pos.x, z: pos.z };
        },
        getPlayerTile: () => {
          const p = koota.queryFirst(IsPlayer, Position);
          if (!p) return { x: 0, z: 0 };
          const pos = p.get(Position);
          return { x: Math.round(pos.x), z: Math.round(pos.z) };
        },
      });

      // --- PlayerGovernor setup ---
      playerGovernorRef.current.init({
        movementRef,
        getWorldBounds: () => worldMgr.getWorldBounds(),
      });

      // --- Ground tap handler (radial menu flow) ---
      function handleGroundTapped(info: GroundTapInfo): void {
        // Dismiss any existing radial menu
        radialTargetRef.current = null;
        setRadialTarget(null);
        setRadialActions([]);
        setRadialScreenPos(null);
        selRing.hide();
        pendingRadialRef.current = null;

        const gx = Math.round(info.worldX);
        const gz = Math.round(info.worldZ);

        // Look up tile context
        let cellType = "soil";
        let occupied = false;
        let treeEntity: Entity | null = null;
        let treeStage = -1;
        let treeWatered = false;

        for (const cell of koota.query(GridCell, Position)) {
          const gc = cell.get(GridCell);
          if (gc.gridX === gx && gc.gridZ === gz) {
            cellType = gc.type;
            occupied = gc.occupied;
            treeEntity = gc.treeEntity ?? null;
            break;
          }
        }

        if (occupied && treeEntity?.has(Tree)) {
          const t = treeEntity.get(Tree);
          treeStage = t.stage;
          treeWatered = t.watered;
        }

        // Check for NPC at this tile
        let hasNpc = false;
        for (const npcEntity of koota.query(Npc, Position, Renderable)) {
          const p = npcEntity.get(Position);
          if (Math.round(p.x) === gx && Math.round(p.z) === gz) {
            hasNpc = true;
            break;
          }
        }

        const target: RadialTarget = {
          worldX: gx,
          worldZ: gz,
          gridX: gx,
          gridZ: gz,
          cellType,
          occupied,
          treeEntity,
          treeStage,
          treeWatered,
          hasNpc,
          entity: info.entity
            ? {
                entityId: Number(info.entity.entityId),
                entityType: info.entity.entityType,
              }
            : null,
        };

        // Build actions — skip if no actions (path tiles)
        const actions = getActionsForTile({
          cellType,
          occupied,
          treeStage,
          treeWatered,
          hasNpc,
        });
        if (actions.length === 0) return;

        // Check adjacency (Chebyshev distance)
        const player = koota.queryFirst(IsPlayer, Position);
        if (!player) return;
        const pp = player.get(Position);
        const px = Math.round(pp.x);
        const pz = Math.round(pp.z);
        const dist = Math.max(Math.abs(gx - px), Math.abs(gz - pz));

        if (dist <= 1) {
          // Already adjacent — show ring + menu immediately
          selRing.show(gx, gz);
          radialTargetRef.current = target;
          setRadialTarget(target);
          setRadialActions(actions);
          // Screen pos will be computed in game loop
        } else {
          // Walk there first, then show
          pendingRadialRef.current = target;
          inputManagerRef.current.startPathTo(gx, gz);
        }
      }

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
        for (const entity of koota.query(Tree, Position)) {
          const tree = entity.get(Tree);
          const position = entity.get(Position);
          const eid = entity.id();

          if (tree.stage >= 3 && !entity.has(Harvestable)) {
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
              const key = `${eid}:${stage}`;
              if (!milestoneXpRef.current.has(key)) {
                milestoneXpRef.current.add(key);
                useGameStore
                  .getState()
                  .trackSpeciesGrowth(tree.speciesId, stage);
                if (stage === 3) {
                  useGameStore
                    .getState()
                    .advanceQuestObjective("saplings_grown", 1);
                }
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
            for (const sc of koota.query(Scarecrow, Position)) {
              const scPos = sc.get(Position);
              const scData = sc.get(Scarecrow);
              const sdx = Math.abs(position.x - scPos.x);
              const sdz = Math.abs(position.z - scPos.z);
              if (sdx <= scData.radius && sdz <= scData.radius) {
                scarecrowProtected = true;
                break;
              }
            }
            if (scarecrowProtected) continue;
            const windRng = createRNG(
              hashString(`wind-${eid}-${Math.floor(gtSec / 30)}`),
            );
            if (rollWindstormDamage(windRng())) {
              entity.set(Tree, { ...tree, progress: 0 });
              showToast("A young tree was damaged by wind!", "warning");
            }
          }
        }
      }

      function checkAndAwardAchievementsInLoop(): void {
        const store = useGameStore.getState();
        const currentTreeData = Array.from(koota.query(Tree, Position)).map(
          (e) => {
            const t = e.get(Tree);
            const p = e.get(Position);
            return {
              speciesId: t.speciesId,
              stage: t.stage,
              gridX: Math.round(p.x),
              gridZ: Math.round(p.z),
            };
          },
        );

        // Count plantable tiles for full-grove achievement
        let plantableTileCount = 0;
        for (const cell of koota.query(GridCell, Position)) {
          if (cell.get(GridCell).type === "soil") {
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
          audioManager.play("achievement");
          const def = ACHIEVEMENT_DEFS.find((a) => a.id === id);
          showToast(def ? def.name : id, "achievement");
        }
      }

      // --- Game loop ---
      let lastTime = performance.now();
      let lastSeasonUpdate: Season | null = null;
      let lastDayUpdate = useGameStore.getState().currentDay;
      let cachedWalkGrid: WalkabilityGrid | null = null;
      let walkGridAge = Infinity; // Force rebuild on first frame

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
        let hasBlossomingCherry = false;
        for (const e of koota.query(Tree, Position)) {
          const t = e.get(Tree);
          if (t.speciesId === "cherry-blossom" && t.stage >= 3) {
            hasBlossomingCherry = true;
            break;
          }
        }
        setShowPetals(hasBlossomingCherry);

        const weatherGrowthMult = getWeatherGrowthMultiplier(weatherType);

        // Rain catcher auto-watering during rain
        if (weatherType === "rain") {
          for (const catcher of koota.query(RainCatcher, Position)) {
            const cPos = catcher.get(Position);
            const cData = catcher.get(RainCatcher);
            const cx = cPos.x;
            const cz = cPos.z;
            const radius = cData.radius;
            for (const tree of koota.query(Tree, Position)) {
              const t = tree.get(Tree);
              if (t.watered) continue;
              const tPos = tree.get(Position);
              const dx = Math.abs(tPos.x - cx);
              const dz = Math.abs(tPos.z - cz);
              if (dx <= radius && dz <= radius) {
                tree.set(Tree, { ...t, watered: true });
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

        // Selection ring pulse animation
        selRing.update(dt);

        // Walk-to-act: detect path completion when we have a pending radial target
        if (
          pendingRadialRef.current &&
          inputManagerRef.current.getMode() === "idle"
        ) {
          const pending = pendingRadialRef.current;
          pendingRadialRef.current = null;

          const actions = getActionsForTile({
            cellType: pending.cellType,
            occupied: pending.occupied,
            treeStage: pending.treeStage,
            treeWatered: pending.treeWatered,
            hasNpc: pending.hasNpc,
          });

          if (actions.length > 0) {
            selRing.show(pending.gridX, pending.gridZ);
            radialTargetRef.current = pending;
            setRadialTarget(pending);
            setRadialActions(actions);
          }
        }

        // Update radial menu screen position (throttled to >1px change)
        const curRadial = radialTargetRef.current;
        if (curRadial) {
          const pos = worldToScreen(
            curRadial.worldX,
            0.02,
            curRadial.worldZ,
            scene,
          );
          if (pos) {
            const lastPos = lastRadialScreenRef.current;
            if (
              !lastPos ||
              Math.abs(pos.x - lastPos.x) > 1 ||
              Math.abs(pos.y - lastPos.y) > 1
            ) {
              lastRadialScreenRef.current = pos;
              setRadialScreenPos(pos);
            }
          }
        }

        // PlayerGovernor update — drives movement when autopilot is active
        playerGovernorRef.current.update(dt);

        // ECS systems
        movementSystem(movementRef.current, dt);
        growthSystem(dt, currentTime.season, weatherGrowthMult);
        staminaSystem(dt);
        harvestSystem(dt);

        // Update player tile info for action button disabled state
        {
          const player = koota.queryFirst(IsPlayer, Position);
          if (player) {
            const pp = player.get(Position);
            const gx = Math.round(pp.x);
            const gz = Math.round(pp.z);
            const gridKey = `${gx},${gz}`;
            if (gridKey !== lastPlayerGridRef.current) {
              lastPlayerGridRef.current = gridKey;
              let found = false;
              for (const cell of koota.query(GridCell, Position)) {
                const gc = cell.get(GridCell);
                if (gc.gridX === gx && gc.gridZ === gz) {
                  let treeStage = -1;
                  if (gc.occupied && gc.treeEntity?.has(Tree)) {
                    treeStage = gc.treeEntity.get(Tree).stage;
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
              let foundNpc: Entity | null = null;
              for (const npcEntity of koota.query(Npc, Position, Renderable)) {
                const p = npcEntity.get(Position);
                if (isPlayerAdjacent(gx, gz, p.x, p.z)) {
                  foundNpc = npcEntity;
                  break;
                }
              }
              const foundNpcId = foundNpc?.id();
              const currentNpcId = nearbyNpcRef.current?.id();
              if (foundNpcId !== currentNpcId) {
                nearbyNpcRef.current = foundNpc;
                const templateId = foundNpc?.has(Npc)
                  ? foundNpc.get(Npc).templateId
                  : null;
                setNearbyNpcTemplateId(templateId);
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

        // NPC animation: idle sway + face player + quest marker bob
        const px = playerMesh.mesh?.position.x ?? 0;
        const pz = playerMesh.mesh?.position.z ?? 0;
        npcMesh.animate(px, pz, dt);

        // NPC AI brains: evaluate behavior + pathfind movement
        const npcBrains = npcBrainsRef.current;
        const bounds = worldManagerRef.current.getWorldBounds();

        // Rebuild walkability grid at most every 0.5s (rarely changes)
        walkGridAge += dt;
        if (!cachedWalkGrid || walkGridAge > 0.5) {
          const cellSnapshot: { gridCell: GridCellComponent }[] = [];
          for (const e of koota.query(GridCell, Position)) {
            cellSnapshot.push({ gridCell: e.get(GridCell) });
          }
          cachedWalkGrid = buildWalkabilityGrid(cellSnapshot, bounds);
          walkGridAge = 0;
        }
        const walkGrid = cachedWalkGrid;

        for (const npcEntity of koota.query(Npc, Position, Renderable)) {
          const npc = npcEntity.get(Npc);
          const npcPos = npcEntity.get(Position);
          const eid = npcEntity.id();
          const eidKey = String(eid);

          // Create brain if not exists
          if (!npcBrains.has(eidKey)) {
            npcBrains.set(
              eidKey,
              new NpcBrain(
                eidKey,
                npc.templateId,
                npcPos.x,
                npcPos.z,
              ),
            );
          }

          const brain = npcBrains.get(eidKey);
          if (!brain) continue;
          const npcX = npcPos.x;
          const npcZ = npcPos.z;
          const distToPlayer = Math.max(
            Math.abs(px - npcX),
            Math.abs(pz - npcZ),
          );

          const ctx: NpcBrainContext = {
            grid: walkGrid,
            playerX: px,
            playerZ: pz,
            npcX,
            npcZ,
            homeX: brain.homePosition.x,
            homeZ: brain.homePosition.z,
            distToPlayer,
          };

          brain.update(dt, ctx);

          // Apply NPC movement from pathfinding
          if (isNpcMoving(eidKey)) {
            const result = updateNpcMovement(eidKey, npcX, npcZ, dt);
            npcEntity.set(Position, { ...npcPos, x: result.x, z: result.z });
          }
        }

        // Tutorial controller update
        const tutorial = tutorialRef.current;
        if (tutorial.isActive()) {
          tutorial.update(dt);
          const hl = tutorial.getHighlight();
          setTutorialHighlightId(hl?.targetId ?? null);
          setTutorialHighlightLabel(hl?.label ?? null);
        }

        cam.trackTarget(px, pz, dt);

        const currentIsNight = isNightTime(currentTime);
        treeMesh.update(scene, dt, currentTime.season, currentIsNight);

        // Season change
        if (lastSeasonUpdate !== currentTime.season) {
          lastSeasonUpdate = currentTime.season;
          ground.updateSeason(currentTime.season, currentTime.seasonProgress);
          useGameStore.getState().setCurrentSeason(currentTime.season);
          useGameStore.getState().trackSeason(currentTime.season);

          treeMesh.rebuildAll(scene, currentTime.season, currentIsNight);
          audioManager.play("seasonChange");
        }

        // Periodic updates (every 5s)
        if (Math.floor(now / 5000) !== Math.floor((now - deltaMs) / 5000)) {
          useGameStore.getState().setGameTime(currentTime.microseconds);
          useGameStore.getState().setCurrentDay(currentTime.day);

          // Tick economy + event systems on day change
          if (currentTime.day !== lastDayUpdate) {
            lastDayUpdate = currentTime.day;
            const store = useGameStore.getState();
            store.updateEconomy(currentTime.day);
            store.tickEvents({
              currentDay: currentTime.day,
              season: currentTime.season,
              playerLevel: store.level,
              rngSeed: currentTime.day,
            });
            store.refreshAvailableChains();
          }

          checkAndAwardAchievementsInLoop();

          // Update NPC quest markers based on quest chain state
          const qStore = useGameStore.getState();
          const chainState = qStore.questChainState;
          const npcQuestStates = new Map<string, NpcQuestMarkerType>();

          // Mark NPCs that have active (in-progress) quest chains
          for (const progress of Object.values(chainState.activeChains)) {
            const def = getChainDef(progress.chainId);
            if (def) npcQuestStates.set(def.npcId, "in_progress");
          }

          // Mark NPCs that have available quest chains (takes priority over in_progress)
          for (const chainId of chainState.availableChainIds) {
            const def = getChainDef(chainId);
            if (def) {
              npcQuestStates.set(def.npcId, "available");
            }
          }

          npcMesh.updateQuestMarkers(npcQuestStates, scene);
        }

        // Auto-save every 30s
        if (Math.floor(now / 30000) !== Math.floor((now - deltaMs) / 30000)) {
          saveGroveToStorage(GRID_SIZE, groveSeedRef.current);
          // SQLite auto-save
          if (isDbInitialized()) {
            try {
              persistGameStore(
                useGameStore.getState() as unknown as Record<string, unknown>,
              );
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

      setSceneReady(true);

      // Start tutorial if player hasn't seen rules
      if (!useGameStore.getState().hasSeenRules) {
        let elderRowan: Entity | null = null;
        for (const e of koota.query(Npc, Position, Renderable)) {
          if (e.get(Npc).templateId === "elder-rowan") {
            elderRowan = e;
            break;
          }
        }

        // Resolve brain lazily — brains are created on first game loop frame
        const getElderBrain = () =>
          elderRowan ? npcBrainsRef.current.get(String(elderRowan.id())) : null;

        tutorialRef.current.start({
          openDialogue: (dialogueId: string) => {
            setTutorialDialogueId(dialogueId);
            if (elderRowan?.has(Npc)) {
              setNearbyNpcTemplateId(elderRowan.get(Npc).templateId);
            }
            setNpcDialogueOpen(true);
          },
          getSelectedTool: () => useGameStore.getState().selectedTool,
          setHasSeenRules: (seen: boolean) => {
            useGameStore.getState().setHasSeenRules(seen);
            setTutorialHighlightId(null);
            setTutorialHighlightLabel(null);
          },
          startNpcApproach: (
            _targetX: number,
            _targetZ: number,
            onArrival: () => void,
          ) => {
            const brain = getElderBrain();
            if (brain && playerMeshRef.current.mesh) {
              const pmesh = playerMeshRef.current.mesh;
              brain.setTutorialTarget(
                Math.round(pmesh.position.x) + 1,
                Math.round(pmesh.position.z),
                onArrival,
              );
            } else {
              onArrival();
            }
          },
          clearNpcOverride: () => {
            getElderBrain()?.clearTutorialTarget();
          },
        });
      }
    };

    initBabylon().catch((err) => {
      console.error("[Grovekeeper] Scene init failed:", err);
    });

    return () => {
      cancelled = true;
      inputManagerRef.current.dispose();
      selectionRingRef.current.dispose();
      tutorialRef.current.dispose();
      for (const brain of npcBrainsRef.current.values()) brain.dispose();
      npcBrainsRef.current.clear();
      cancelAllNpcMovements();
      audioManager.dispose();
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

  /** Find the cell entity at the player's current position. */
  const findCellAtPlayer = (): Entity | null => {
    const player = koota.queryFirst(IsPlayer, Position);
    if (!player) return null;
    const pp = player.get(Position);
    const gridX = Math.round(pp.x);
    const gridZ = Math.round(pp.z);
    for (const cell of koota.query(GridCell, Position)) {
      const gc = cell.get(GridCell);
      if (gc.gridX === gridX && gc.gridZ === gridZ) {
        return cell;
      }
    }
    return null;
  };

  const useTrowel = async (cell: Entity) => {
    const gc = cell.get(GridCell);
    if (gc.occupied) return;
    audioManager.play("click");
    if (hapticsEnabled) await hapticLight();
    setSeedSelectOpen(true);
  };

  const useWateringCan = async (cell: Entity) => {
    const gc = cell.get(GridCell);
    if (!gc.occupied || !gc.treeEntity?.has(Tree)) return;
    const tree = gc.treeEntity;
    const t = tree.get(Tree);
    tree.set(Tree, { ...t, watered: true });
    addXp(5);
    incrementTreesWatered();
    useGameStore.getState().advanceQuestObjective("trees_watered", 1);
    tutorialRef.current.onQuestEvent("trees_watered");
    showParticle("+5 XP");
    audioManager.play("water");
    if (hapticsEnabled) await hapticLight();
  };

  const useAxe = async (cell: Entity) => {
    const gc = cell.get(GridCell);
    if (!gc.occupied || !gc.treeEntity?.has(Tree)) return;
    const tree = gc.treeEntity;
    const t = tree.get(Tree);
    if (t.stage < 3) return;

    const harvestResources = collectHarvest(
      tree,
      useGameStore.getState().currentSeason,
    );
    if (harvestResources) {
      for (const r of harvestResources)
        addResource(r.type as ResourceType, r.amount);
    } else {
      const species = getSpeciesById(t.speciesId);
      if (species)
        for (const y of species.yield) addResource(y.resource, y.amount);
    }

    addXp(50);
    incrementTreesHarvested();
    useGameStore.getState().advanceQuestObjective("trees_harvested", 1);
    useGameStore
      .getState()
      .trackSpeciesHarvest(
        t.speciesId,
        harvestResources?.reduce((sum, r) => sum + r.amount, 0) ?? 0,
      );
    showParticle("+50 XP");

    const harvestSpecies = getSpeciesById(t.speciesId);
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

    treeMeshRef.current.removeMesh(tree.id());
    tree.destroy();
    cell.set(GridCell, { ...gc, occupied: false, treeEntity: null });
    debouncedSaveGrove();
    audioManager.play("harvest");
    if (hapticsEnabled) await hapticSuccess();
  };

  const useCompostBin = async (cell: Entity) => {
    const gc = cell.get(GridCell);
    if (!gc.occupied || !gc.treeEntity?.has(Tree)) return;
    const tree = gc.treeEntity;
    const t = tree.get(Tree);
    if (t.fertilized) {
      showToast("Already fertilized!", "info");
      return;
    }
    // Costs 5 acorns
    if (!useGameStore.getState().spendResource("acorns" as ResourceType, 5)) {
      showToast("Need 5 acorns to fertilize", "warning");
      return;
    }
    tree.set(Tree, { ...t, fertilized: true });
    addXp(5);
    showParticle("+5 XP");
    showToast("Fertilized! 2x growth for this stage.", "success");
    audioManager.play("success");
    if (hapticsEnabled) await hapticLight();
  };

  const usePruningShears = async (cell: Entity) => {
    const gc = cell.get(GridCell);
    if (!gc.occupied || !gc.treeEntity?.has(Tree)) return;
    const tree = gc.treeEntity;
    const t = tree.get(Tree);
    if (t.stage < 3) return;
    // Speed up harvest cooldown by 30%
    if (tree.has(Harvestable)) {
      const h = tree.get(Harvestable);
      tree.set(Harvestable, {
        ...h,
        cooldownElapsed: h.cooldownElapsed + h.cooldownTotal * 0.3,
      });
    }
    // Mark pruned for 1.5x yield bonus on next harvest
    tree.set(Tree, { ...t, pruned: true });
    // Re-init harvestable to recalculate yields with pruned bonus
    if (tree.has(Harvestable)) {
      initHarvestable(tree);
    }
    addXp(5);
    showParticle("+5 XP");
    showToast("Pruned! 1.5x yield on next harvest.", "success");
    audioManager.play("chop");
    if (hapticsEnabled) await hapticLight();
  };

  const useShovel = async (cell: Entity) => {
    const gc = cell.get(GridCell);
    // Clear rocks → soil
    if (gc.type === "rock") {
      cell.set(GridCell, { ...gc, type: "soil", occupied: false });
      addXp(12);
      showParticle("+12 XP");
      showToast("Cleared rocks!", "success");
      debouncedSaveGrove();
      audioManager.play("chop");
      if (hapticsEnabled) await hapticMedium();
      return;
    }
    // Remove stage 0-1 (seed/sprout) trees — dig them up
    if (gc.occupied && gc.treeEntity?.has(Tree)) {
      const tree = gc.treeEntity;
      const t = tree.get(Tree);
      if (t.stage <= 1) {
        treeMeshRef.current.removeMesh(tree.id());
        tree.destroy();
        cell.set(GridCell, { ...gc, occupied: false, treeEntity: null });
        addXp(5);
        showParticle("+5 XP");
        showToast("Removed seedling.", "success");
        debouncedSaveGrove();
        audioManager.play("chop");
        if (hapticsEnabled) await hapticMedium();
      }
    }
  };

  const useAlmanac = async (cell: Entity) => {
    const gc = cell.get(GridCell);
    if (!gc.occupied || !gc.treeEntity?.has(Tree)) return;
    const tree = gc.treeEntity;
    const t = tree.get(Tree);
    const species = getSpeciesById(t.speciesId);
    const stageName = ["Seed", "Sprout", "Sapling", "Mature", "Old Growth"][
      t.stage
    ];
    showToast(
      `${species?.name ?? t.speciesId} — ${stageName} (${Math.round(t.progress * 100)}%)`,
      "info",
    );
  };

  const useSeedPouch = async (_cell: Entity) => {
    setSeedSelectOpen(true);
  };

  const useRainCatcher = async (cell: Entity) => {
    const gc = cell.get(GridCell);
    if (gc.occupied) {
      showToast("Tile is occupied!", "warning");
      return;
    }
    const player = koota.queryFirst(IsPlayer, Position);
    if (!player) return;
    const pp = player.get(Position);
    const worldX = Math.round(pp.x);
    const worldZ = Math.round(pp.z);

    koota.spawn(
      Position({ x: worldX, y: 0, z: worldZ }),
      RainCatcher({ radius: 2 }),
    );
    cell.set(GridCell, { ...gc, occupied: true });
    addXp(10);
    showParticle("+10 XP");
    showToast(
      "Rain Catcher placed! Waters nearby trees during rain.",
      "success",
    );
    audioManager.play("build");
    if (hapticsEnabled) await hapticMedium();
  };

  const useFertilizerSpreader = async (_cell: Entity) => {
    // Area fertilize: all trees in 2-tile radius, costs 3 acorns
    if (!useGameStore.getState().spendResource("acorns" as ResourceType, 3)) {
      showToast("Need 3 acorns to spread fertilizer", "warning");
      return;
    }
    const player = koota.queryFirst(IsPlayer, Position);
    if (!player) return;
    const pp = player.get(Position);
    const px = pp.x;
    const pz = pp.z;
    let count = 0;
    for (const tree of koota.query(Tree, Position)) {
      const t = tree.get(Tree);
      const tPos = tree.get(Position);
      const dx = Math.abs(tPos.x - px);
      const dz = Math.abs(tPos.z - pz);
      if (dx <= 2 && dz <= 2 && !t.fertilized) {
        tree.set(Tree, { ...t, fertilized: true });
        count++;
      }
    }
    addXp(15);
    showParticle("+15 XP");
    showToast(`Fertilized ${count} trees! 2x growth.`, "success");
    audioManager.play("success");
    if (hapticsEnabled) await hapticMedium();
  };

  const useScarecrow = async (cell: Entity) => {
    const gc = cell.get(GridCell);
    if (gc.occupied) {
      showToast("Tile is occupied!", "warning");
      return;
    }
    const player = koota.queryFirst(IsPlayer, Position);
    if (!player) return;
    const pp = player.get(Position);
    const worldX = Math.round(pp.x);
    const worldZ = Math.round(pp.z);

    koota.spawn(
      Position({ x: worldX, y: 0, z: worldZ }),
      Scarecrow({ radius: 3 }),
    );
    cell.set(GridCell, { ...gc, occupied: true });
    addXp(10);
    showParticle("+10 XP");
    showToast("Scarecrow placed! Protects nearby trees from wind.", "success");
    audioManager.play("build");
    if (hapticsEnabled) await hapticMedium();
  };

  const useGraftingTool = async (cell: Entity) => {
    const gc = cell.get(GridCell);
    if (!gc.occupied || !gc.treeEntity?.has(Tree)) return;
    const tree = gc.treeEntity;
    const t = tree.get(Tree);
    if (t.stage < 3) {
      showToast("Need a Mature+ tree to graft", "info");
      return;
    }
    // Find 2 nearest different species trees
    const player = koota.queryFirst(IsPlayer, Position);
    if (!player) return;
    const nearbySpecies: string[] = [];
    for (const other of koota.query(Tree, Position)) {
      if (other === tree) continue;
      const ot = other.get(Tree);
      if (
        ot.speciesId !== t.speciesId &&
        !nearbySpecies.includes(ot.speciesId)
      ) {
        nearbySpecies.push(ot.speciesId);
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
    audioManager.play("success");
    if (hapticsEnabled) await hapticSuccess();
  };

  const toolActions: Record<string, (cell: Entity) => Promise<void>> = {
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
    if (nearbyNpcRef.current?.has(Npc)) {
      setNpcDialogueOpen(true);
      return;
    }

    const store = useGameStore.getState();

    // Build mode — place a structure at player position
    if (store.buildMode && store.buildTemplateId) {
      const player = koota.queryFirst(IsPlayer, Position);
      if (!player) return;
      const pp = player.get(Position);
      const worldX = Math.round(pp.x);
      const worldZ = Math.round(pp.z);
      const template = getTemplate(store.buildTemplateId);
      if (!template) {
        store.setBuildMode(false);
        return;
      }

      // Validate placement — build cell snapshot in miniplex-shape
      const cellSnapshot: { gridCell: GridCellComponent }[] = [];
      for (const e of koota.query(GridCell, Position)) {
        cellSnapshot.push({ gridCell: e.get(GridCell) });
      }
      if (!canPlace(template.id, worldX, worldZ, cellSnapshot)) {
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
      koota.spawn(
        Position({ x: worldX, y: 0, z: worldZ }),
        Structure({
          templateId: template.id,
          effectType: template.effect?.type,
          effectRadius: template.effect?.radius,
          effectMagnitude: template.effect?.magnitude,
        }),
      );

      // Mark grid cells as occupied
      for (let dx = 0; dx < template.footprint.width; dx++) {
        for (let dz = 0; dz < template.footprint.depth; dz++) {
          for (const cell of koota.query(GridCell, Position)) {
            const gc = cell.get(GridCell);
            if (gc.gridX === worldX + dx && gc.gridZ === worldZ + dz) {
              cell.set(GridCell, { ...gc, occupied: true });
            }
          }
        }
      }

      // Persist
      store.addPlacedStructure(template.id, worldX, worldZ);
      store.advanceQuestObjective("structures_built", 1);
      store.setBuildMode(false);
      showToast(`Built ${template.name}!`, "success");
      showParticle("+Build");
      audioManager.play("build");
      if (hapticsEnabled) await hapticSuccess();
      debouncedSaveGrove();
      return;
    }

    // Normal tool action
    const cell = findCellAtPlayer();
    if (!cell) return;
    const tool = getToolById(selectedTool);
    if (tool && tool.staminaCost > 0) {
      const weatherStaminaMult = weatherRef.current
        ? getWeatherStaminaMultiplier(weatherRef.current.current.type)
        : 1.0;
      // Structure stamina reduction
      const player = koota.queryFirst(IsPlayer, Position);
      const structAdapter: {
        structure?: StructureComponent;
        position?: { x: number; z: number };
      }[] = [];
      for (const e of koota.query(Structure, Position)) {
        structAdapter.push({
          structure: e.get(Structure),
          position: e.get(Position),
        });
      }
      const structStaminaMult = player
        ? getStructureStaminaMult(
            player.get(Position).x,
            player.get(Position).z,
            structAdapter,
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
    if (action) await action(cell);
  };

  const handlePlant = async () => {
    const player = koota.queryFirst(IsPlayer, Position);
    if (!player) return;
    const pp = player.get(Position);
    const gridX = Math.round(pp.x);
    const gridZ = Math.round(pp.z);

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

    for (const cell of koota.query(GridCell, Position)) {
      const gc = cell.get(GridCell);
      if (gc.gridX === gridX && gc.gridZ === gridZ) {
        if (gc.occupied) {
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

        const tree = spawnTree(gridX, gridZ, selectedSpecies);
        cell.set(GridCell, {
          ...gc,
          occupied: true,
          treeEntity: tree,
        });

        incrementTreesPlanted();
        useGameStore.getState().trackSpeciesPlanted(selectedSpecies);
        useGameStore.getState().trackSpeciesPlanting(selectedSpecies);
        useGameStore.getState().advanceQuestObjective("trees_planted", 1);
        tutorialRef.current.onQuestEvent("trees_planted");
        const plantXp = 10 + (species ? (species.difficulty - 1) * 5 : 0);
        addXp(plantXp);
        showParticle(`+${plantXp} XP`);

        debouncedSaveGrove();
        audioManager.play("plant");
        if (hapticsEnabled) await hapticMedium();
        break;
      }
    }
  };

  const handleBatchHarvest = useCallback(() => {
    let count = 0;
    const gains: Record<string, number> = {};
    for (const entity of koota.query(Tree, Harvestable)) {
      const h = entity.get(Harvestable);
      if (!h.ready) continue;
      const t = entity.get(Tree);
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
        const species = getSpeciesById(t.speciesId);
        if (species) {
          for (const y of species.yield) {
            addResource(y.resource, y.amount);
            gains[y.resource] = (gains[y.resource] ?? 0) + y.amount;
          }
        }
      }
      incrementTreesHarvested();
      useGameStore
        .getState()
        .trackSpeciesHarvest(
          t.speciesId,
          harvestResources?.reduce((sum, r) => sum + r.amount, 0) ?? 0,
        );
      count++;
    }
    if (count > 0) {
      useGameStore.getState().advanceQuestObjective("trees_harvested", count);
      const xp = count * 50;
      addXp(xp);
      showParticle(`+${xp} XP`);
      const summary = Object.entries(gains)
        .map(([r, a]) => `+${a} ${r.charAt(0).toUpperCase() + r.slice(1)}`)
        .join(", ");
      showToast(`Harvested ${count} trees! ${summary}`, "success");
      audioManager.play("harvest");
    }
  }, [addResource, addXp, incrementTreesHarvested]);

  const dismissRadial = useCallback(() => {
    radialTargetRef.current = null;
    setRadialTarget(null);
    setRadialActions([]);
    setRadialScreenPos(null);
    lastRadialScreenRef.current = null;
    selectionRingRef.current.hide();
    pendingRadialRef.current = null;
  }, []);

  const handleRadialAction = useCallback(
    async (actionId: string) => {
      const target = radialTarget;
      dismissRadial();
      if (!target) return;

      // NPC talk
      if (actionId === "talk") {
        for (const npcEntity of koota.query(Npc, Position, Renderable)) {
          const npc = npcEntity.get(Npc);
          const p = npcEntity.get(Position);
          if (
            Math.round(p.x) === target.gridX &&
            Math.round(p.z) === target.gridZ
          ) {
            nearbyNpcRef.current = npcEntity;
            setNearbyNpcTemplateId(npc.templateId);
            setNpcDialogueOpen(true);
            break;
          }
        }
        return;
      }

      // Find the grid cell at the target tile
      let cell: Entity | null = null;
      for (const c of koota.query(GridCell, Position)) {
        const gc = c.get(GridCell);
        if (gc.gridX === target.gridX && gc.gridZ === target.gridZ) {
          cell = c;
          break;
        }
      }
      if (!cell) return;

      // Map radial action IDs to tool actions
      switch (actionId) {
        case "water":
          await toolActions["watering-can"]?.(cell);
          break;
        case "harvest":
          await toolActions.axe?.(cell);
          break;
        case "prune":
          await toolActions["pruning-shears"]?.(cell);
          break;
        case "plant":
          await toolActions.trowel?.(cell);
          break;
        case "clear":
          await toolActions.shovel?.(cell);
          break;
        case "dig-up":
          await toolActions.shovel?.(cell);
          break;
        case "fertilize":
          await toolActions["compost-bin"]?.(cell);
          break;
        case "inspect":
          await toolActions.almanac?.(cell);
          break;
      }
    },
    [radialTarget, dismissRadial, toolActions],
  );

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ touchAction: "none" }}
      />
      <div
        className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 transition-opacity duration-500"
        style={{
          background: `linear-gradient(180deg, ${COLORS.skyMist} 0%, ${COLORS.leafLight}40 100%)`,
          opacity: sceneReady ? 0 : 1,
          pointerEvents: sceneReady ? "none" : "auto",
        }}
        onTransitionEnd={(e) => {
          if (e.propertyName === "opacity" && sceneReady) {
            (e.currentTarget as HTMLElement).style.display = "none";
          }
        }}
      >
        <div
          className="w-8 h-8 border-3 border-t-transparent rounded-full motion-safe:animate-spin motion-reduce:animate-pulse"
          style={{
            borderColor: `${COLORS.forestGreen} transparent ${COLORS.forestGreen} ${COLORS.forestGreen}`,
          }}
        />
        <p className="text-sm" style={{ color: COLORS.barkBrown }}>
          Preparing grove...
        </p>
      </div>
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
        setNpcDialogueOpen={(open) => {
          setNpcDialogueOpen(open);
          if (!open) {
            tutorialRef.current.onDialogueClosed();
            setTutorialDialogueId(null);
          }
        }}
        tutorialDialogueId={tutorialDialogueId}
        onTutorialDialogueAction={(actionType) => {
          tutorialRef.current.onDialogueAction(actionType);
        }}
        tutorialHighlightId={tutorialHighlightId}
        tutorialHighlightLabel={tutorialHighlightLabel}
        radialActions={radialActions}
        radialScreenPos={radialScreenPos}
        onRadialAction={handleRadialAction}
        onDismissRadial={dismissRadial}
        movementRef={movementRef}
        onJoystickActiveChange={(active) => {
          inputManagerRef.current.setJoystickActive(active);
        }}
      />
    </div>
  );
};
