/**
 * GameScene — Orchestrator component for the BabylonJS game scene.
 *
 * Initializes ECS entities, creates scene managers, runs the game loop,
 * and handles player actions. All BabylonJS concerns are delegated to
 * managers in src/game/scene/.
 */

import type { Entity } from "koota";
import { createEffect, createSignal, onCleanup, onMount, Show } from "solid-js";
import { actions as gameActions } from "@/actions";
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
import { useTrait } from "@/ecs/solid";
import type { GroundTapInfo, ObjectTapInfo } from "@/input/InputManager";
import { InputManager } from "@/input/InputManager";
import {
  buildWalkabilityGrid,
  type WalkabilityGrid,
} from "@/input/pathfinding";
import { koota, spawnPlayer } from "@/koota";
import { isPlayerAdjacent } from "@/npcs/NpcManager";
import { getChainDef } from "@/quests/questChainEngine";
import {
  frameMark,
  frameMeasure,
  frameReport,
} from "@/shared/utils/devDebug";
import { createRNG, hashString } from "@/shared/utils/seedRNG";
import { worldToScreen } from "@/shared/utils/worldToScreen";
import { spawnTree } from "@/startup";
import { buildDbSnapshot, getGroveData } from "@/db/snapshot";
import type { SerializedTreeDb as SerializedTree } from "@/db/queries";
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
  getGameTime,
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
  Achievements,
  Build,
  CurrentDay,
  CurrentSeason,
  GridCell,
  Harvestable,
  IsPlayer,
  LifetimeResources,
  Npc,
  PlayerProgress,
  Position,
  QuestChains,
  RainCatcher,
  Renderable,
  Resources,
  Scarecrow,
  Seeds,
  Settings,
  Structure,
  Time,
  Tracking,
  Tree,
  WorldMeta,
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
  BorderTreeManager,
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
  let canvasRef: HTMLCanvasElement | undefined;
  let containerRef: HTMLDivElement | undefined;
  const movementRef = { current: { x: 0, z: 0 } };
  const groveSeedRef = { current: "" };
  const weatherRef: { current: WeatherState | null } = { current: null };
  const lastWeatherTypeRef: { current: WeatherType } = { current: "clear" };
  const milestoneXpRef = { current: new Set<string>() };

  // Managers (instantiated once; Solid component body runs once)
  const sceneManager = new SceneManager();
  const cameraManager = new CameraManager();
  const lightingManager = new LightingManager();
  const groundBuilder = new GroundBuilder();
  const skyManager = new SkyManager();
  const playerMesh = new PlayerMeshManager();
  const treeMesh = new TreeMeshManager();
  const borderTrees = new BorderTreeManager();
  const npcMesh = new NpcMeshManager();
  const worldManager = new WorldManager();
  const inputManager = new InputManager();
  const playerGovernor = new PlayerGovernor();
  const selectionRing = new SelectionRingManager();
  const npcBrains = new Map<string, NpcBrain>();
  const tutorial = new TutorialController();

  const [autopilot, setAutopilot] = createSignal(
    typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("autopilot"),
  );

  const [sceneReady, setSceneReady] = createSignal(false);
  const [seedSelectOpen, setSeedSelectOpen] = createSignal(false);
  const [toolWheelOpen, setToolWheelOpen] = createSignal(false);
  const [pauseMenuOpen, setPauseMenuOpen] = createSignal(false);
  const gameTimeRef: { current: GameTime | null } = { current: null };
  const [gameTimeState, setGameTimeState] = createSignal<GameTime | null>(null);
  const lastGameTimeMinuteRef = { current: -1 };
  const [currentWeatherType, setCurrentWeatherType] =
    createSignal<WeatherType>("clear");
  const [weatherTimeRemaining, setWeatherTimeRemaining] = createSignal(0);
  const [playerTileInfo, setPlayerTileInfo] = createSignal<TileState | null>(
    null,
  );
  const lastPlayerGridRef = { current: "" };
  const nearbyNpcRef: { current: Entity | null } = { current: null };
  // Note: Entity is Koota entity ref
  const [nearbyNpcTemplateId, setNearbyNpcTemplateId] = createSignal<
    string | null
  >(null);
  const [npcDialogueOpen, setNpcDialogueOpen] = createSignal(false);
  const [tutorialHighlightId, setTutorialHighlightId] = createSignal<
    string | null
  >(null);
  const [tutorialHighlightLabel, setTutorialHighlightLabel] = createSignal<
    string | null
  >(null);
  const [tutorialDialogueId, setTutorialDialogueId] = createSignal<
    string | null
  >(null);

  // Radial action menu state
  const [radialTarget, setRadialTarget] = createSignal<RadialTarget | null>(
    null,
  );
  const [radialScreenPos, setRadialScreenPos] = createSignal<{
    x: number;
    y: number;
  } | null>(null);
  const [radialActions, setRadialActions] = createSignal<RadialAction[]>([]);
  const pendingRadialRef: { current: RadialTarget | null } = { current: null };
  const lastRadialScreenRef: { current: { x: number; y: number } | null } = {
    current: null,
  };
  const radialTargetRef: { current: RadialTarget | null } = { current: null };

  const progress = useTrait(koota, PlayerProgress);
  const settings = useTrait(koota, Settings);
  const selectedSpecies = () => progress()?.selectedSpecies ?? "white-oak";
  const selectedTool = () => progress()?.selectedTool ?? "trowel";
  const hapticsEnabled = () => settings()?.hapticsEnabled ?? true;
  const soundEnabled = () => settings()?.soundEnabled ?? true;

  const setScreen = (
    s: "menu" | "playing" | "paused" | "seedSelect" | "rules",
  ) => gameActions().setScreen(s);
  const addXp = (amount: number) => gameActions().addXp(amount);
  const addResource = (type: ResourceType, amount: number) =>
    gameActions().addResource(type, amount);
  const incrementTreesPlanted = () => gameActions().incrementTreesPlanted();
  const incrementTreesHarvested = () => gameActions().incrementTreesHarvested();
  const incrementTreesWatered = () => gameActions().incrementTreesWatered();

  // --- Sync audio enabled with Settings trait ---
  createEffect(() => {
    audioManager.setEnabled(soundEnabled());
  });

  // --- InputManager dialog disable sync ---
  createEffect(() => {
    inputManager.setDisabled(
      seedSelectOpen() ||
        toolWheelOpen() ||
        pauseMenuOpen() ||
        npcDialogueOpen() ||
        !!radialTarget(),
    );
  });

  // --- Autopilot (PlayerGovernor) toggle with G key ---
  createEffect(() => {
    playerGovernor.enabled = autopilot();
    if (autopilot()) {
      inputManager.setDisabled(true);
    }
  });

  onMount(() => {
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
    onCleanup(() =>
      window.removeEventListener("keydown", handleAutopilotKey),
    );
  });

  // --- Save/restore ---
  const saveCurrentGrove = () => {
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
    gameActions().saveGrove(trees, playerPos);
  };

  const saveTimerRef: { current: ReturnType<typeof setTimeout> | null } = {
    current: null,
  };
  const debouncedSaveGrove = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(saveCurrentGrove, 1000);
  };

  // --- ECS initialization ---
  onMount(() => {
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
        const groveData = getGroveData();
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
    initializeTime(koota.get(Time)?.gameTimeMicroseconds ?? 0);
  });

  // Auto-save on tab hide — persist to SQLite + IndexedDB
  onMount(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        saveCurrentGrove();
        // SQLite persist
        if (isDbInitialized()) {
          try {
            const state = buildDbSnapshot();
            persistGameStore(state);
            // Save grove trees to DB
            const groveData = getGroveData();
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
    onCleanup(() =>
      document.removeEventListener("visibilitychange", handleVisibility),
    );
  });

  // --- BabylonJS initialization ---
  onMount(() => {
    const canvas = canvasRef;
    if (!canvas) return;
    let cancelled = false;

    const sm = sceneManager;
    const cam = cameraManager;
    const lights = lightingManager;
    const ground = groundBuilder;
    const sky = skyManager;
    const pMesh = playerMesh;
    const tMesh = treeMesh;
    const nMesh = npcMesh;
    const worldMgr = worldManager;

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
      // sky.init is async — lazy-loads HDRCubeTexture + sceneHelpers.
      // Fire it without await so the skybox loads in the background while
      // the rest of the scene (ground, player, trees) initialises.  The
      // render loop starts immediately and the sky appears within a frame
      // or two once the dynamic import resolves.
      void sky.init(scene);
      await pMesh.init(scene);

      // Register plantable zones, then commit as one thin-instanced grid mesh
      for (const zone of worldDef.zones) {
        if (zone.plantable) {
          ground.addPlantableGrid(scene, zone.id, zone.origin, zone.size);
        }
      }
      // Flushes all registered zones into a single draw call (thin instances)
      ground.commitPlantableGrid(scene);

      // --- Border trees (decorative, outside playable grid) ---
      // Placed after bounds + seed are known. Static for the lifetime of the
      // scene; rebuildAll is called only on season change.
      borderTrees.init(
        scene,
        bounds,
        getGameTime().season,
        groveSeedRef.current || "default",
      );

      // --- Selection ring setup ---
      const selRing = selectionRing;
      selRing.init(scene);

      // --- InputManager setup ---
      inputManager.init({
        canvas,
        movementRef,
        callbacks: {
          onAction: () => handleAction(),
          onOpenSeeds: () => setSeedSelectOpen(true),
          onPause: () => setPauseMenuOpen((prev) => !prev),
          onSelectTool: (index: number) => {
            const tool = TOOLS[index];
            const unlocked = koota.get(PlayerProgress)?.unlockedTools ?? [];
            if (tool && unlocked.includes(tool.id)) {
              gameActions().setSelectedTool(tool.id);
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
      playerGovernor.init({
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
          inputManager.startPathTo(gx, gz);
        }
      }

      // --- Helper functions (defined inside initBabylon to avoid stale closures) ---

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
            gameActions().incrementTreesMatured();
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
                const a = gameActions();
                a.trackSpeciesGrowth(tree.speciesId, stage);
                if (stage === 3) {
                  a.advanceQuestObjective("saplings_grown", 1);
                }
                const xpAmount =
                  stage === 2
                    ? baseXp
                    : baseXp + diffBonus * (stage === 3 ? 10 : 25);
                a.addXp(xpAmount);
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
        const tracking = koota.get(Tracking);
        const progress = koota.get(PlayerProgress);
        const lifetime = koota.get(LifetimeResources);
        const achievements = koota.get(Achievements)?.items ?? [];
        const meta = koota.get(WorldMeta);
        const build = koota.get(Build);
        const placed = build?.placedStructures ?? [];
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
          treesPlanted: tracking?.treesPlanted ?? 0,
          lifetimeResources: lifetime ?? {
            timber: 0,
            sap: 0,
            fruit: 0,
            acorns: 0,
          },
          speciesPlanted: tracking?.speciesPlanted ?? [],
          seasonsExperienced: tracking?.seasonsExperienced ?? [],
          currentTreeData,
          gridSize: GRID_SIZE,
          plantableTileCount,
          unlockedAchievements: achievements,
          hasPrestiged: (progress?.prestigeCount ?? 0) > 0,
          toolUseCounts: tracking?.toolUseCounts ?? {},
          zonesDiscovered: (meta?.discoveredZones ?? []).length,
          wildTreesHarvested: tracking?.wildTreesHarvested ?? 0,
          wildTreesRegrown: tracking?.wildTreesRegrown ?? 0,
          visitedZoneTypes: tracking?.visitedZoneTypes ?? [],
          treesPlantedInSpring: tracking?.treesPlantedInSpring ?? 0,
          treesHarvestedInAutumn: tracking?.treesHarvestedInAutumn ?? 0,
          unlockedToolCount: (progress?.unlockedTools ?? []).length,
          wildSpeciesHarvested: tracking?.wildSpeciesHarvested ?? [],
          structuresBuilt: placed.length,
          distinctStructureTypesBuilt: new Set(placed.map((s) => s.templateId))
            .size,
        });

        for (const id of newAchievements) {
          gameActions().unlockAchievement(id);
          showAchievement(id);
          audioManager.play("achievement");
          const def = ACHIEVEMENT_DEFS.find((a) => a.id === id);
          showToast(def ? def.name : id, "achievement");
        }
      }

      // --- Game loop ---
      let lastTime = performance.now();
      let lastSeasonUpdate: Season | null = null;
      let lastDayUpdate = koota.get(CurrentDay)?.value ?? 1;
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
        inputManager.update();

        // Selection ring pulse animation
        selRing.update(dt);

        // Walk-to-act: detect path completion when we have a pending radial target
        if (
          pendingRadialRef.current &&
          inputManager.getMode() === "idle"
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
        playerGovernor.update(dt);

        // ECS systems
        frameMark("sys:start");
        movementSystem(movementRef.current, dt);
        frameMark("sys:movement:end");
        frameMeasure("sys:movement", "sys:start", "sys:movement:end");
        growthSystem(dt, currentTime.season, weatherGrowthMult);
        frameMark("sys:growth:end");
        frameMeasure("sys:growth", "sys:movement:end", "sys:growth:end");
        staminaSystem(dt);
        harvestSystem(dt);
        frameMark("sys:end");
        frameMeasure("sys:rest", "sys:growth:end", "sys:end");

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
        pMesh.update();
        nMesh.update(scene);

        // NPC animation: idle sway + face player + quest marker bob
        const px = pMesh.mesh?.position.x ?? 0;
        const pz = pMesh.mesh?.position.z ?? 0;
        nMesh.animate(px, pz, dt);

        // NPC AI brains: evaluate behavior + pathfind movement
        const brains = npcBrains;
        const npcBounds = worldManager.getWorldBounds();
        void npcBounds; // bounds retained for future pathfinding context

        // Rebuild walkability grid at most every 0.5s (rarely changes)
        walkGridAge += dt;
        if (!cachedWalkGrid || walkGridAge > 0.5) {
          const cellSnapshot: { gridCell: GridCellComponent }[] = [];
          for (const e of koota.query(GridCell, Position)) {
            cellSnapshot.push({ gridCell: e.get(GridCell) });
          }
          cachedWalkGrid = buildWalkabilityGrid(cellSnapshot, npcBounds);
          walkGridAge = 0;
        }
        const walkGrid = cachedWalkGrid;

        for (const npcEntity of koota.query(Npc, Position, Renderable)) {
          const npc = npcEntity.get(Npc);
          const npcPos = npcEntity.get(Position);
          const eid = npcEntity.id();
          const eidKey = String(eid);

          // Create brain if not exists
          if (!brains.has(eidKey)) {
            brains.set(
              eidKey,
              new NpcBrain(
                eidKey,
                npc.templateId,
                npcPos.x,
                npcPos.z,
              ),
            );
          }

          const brain = brains.get(eidKey);
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
        if (tutorial.isActive()) {
          tutorial.update(dt);
          const hl = tutorial.getHighlight();
          setTutorialHighlightId(hl?.targetId ?? null);
          setTutorialHighlightLabel(hl?.label ?? null);
        }

        cam.trackTarget(px, pz, dt);

        const currentIsNight = isNightTime(currentTime);
        tMesh.update(scene, dt, currentTime.season, currentIsNight);

        // Season change
        if (lastSeasonUpdate !== currentTime.season) {
          lastSeasonUpdate = currentTime.season;
          ground.updateSeason(currentTime.season, currentTime.seasonProgress);
          const sa = gameActions();
          sa.setCurrentSeason(currentTime.season);
          sa.trackSeason(currentTime.season);

          tMesh.rebuildAll(scene, currentTime.season, currentIsNight);
          borderTrees.rebuildAll(
            scene,
            bounds,
            currentTime.season,
            groveSeedRef.current || "default",
          );
          audioManager.play("seasonChange");
        }

        // Periodic updates (every 5s)
        if (Math.floor(now / 5000) !== Math.floor((now - deltaMs) / 5000)) {
          const periodicA = gameActions();
          periodicA.setGameTime(currentTime.microseconds);
          periodicA.setCurrentDay(currentTime.day);

          // Tick economy + event systems on day change
          if (currentTime.day !== lastDayUpdate) {
            lastDayUpdate = currentTime.day;
            periodicA.updateEconomy(currentTime.day);
            periodicA.tickEvents({
              currentDay: currentTime.day,
              season: currentTime.season,
              playerLevel: koota.get(PlayerProgress)?.level ?? 1,
              rngSeed: currentTime.day,
            });
            periodicA.refreshAvailableChains();
          }

          checkAndAwardAchievementsInLoop();

          // Update NPC quest markers based on quest chain state
          const chainState = koota.get(QuestChains) ?? {
            activeChains: {},
            completedChainIds: [],
            availableChainIds: [],
          };
          const npcQuestStates = new Map<string, NpcQuestMarkerType>();

          // Mark NPCs that have active (in-progress) quest chains
          for (const chainProgress of Object.values(chainState.activeChains)) {
            const def = getChainDef(chainProgress.chainId);
            if (def) npcQuestStates.set(def.npcId, "in_progress");
          }

          // Mark NPCs that have available quest chains (takes priority over in_progress)
          for (const chainId of chainState.availableChainIds) {
            const def = getChainDef(chainId);
            if (def) {
              npcQuestStates.set(def.npcId, "available");
            }
          }

          nMesh.updateQuestMarkers(npcQuestStates, scene);
        }

        // Auto-save every 30s
        if (Math.floor(now / 30000) !== Math.floor((now - deltaMs) / 30000)) {
          saveGroveToStorage(GRID_SIZE, groveSeedRef.current);
          // SQLite auto-save
          if (isDbInitialized()) {
            try {
              persistGameStore(buildDbSnapshot());
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

        // Dev-only frame profiler (activated by ?perf=1)
        frameReport(dt);
      });

      setSceneReady(true);

      // Start tutorial if player hasn't seen rules
      if (!(koota.get(Settings)?.hasSeenRules ?? false)) {
        let elderRowan: Entity | null = null;
        for (const e of koota.query(Npc, Position, Renderable)) {
          if (e.get(Npc).templateId === "elder-rowan") {
            elderRowan = e;
            break;
          }
        }

        // Resolve brain lazily — brains are created on first game loop frame
        const getElderBrain = () =>
          elderRowan ? npcBrains.get(String(elderRowan.id())) : null;

        tutorial.start({
          openDialogue: (dialogueId: string) => {
            setTutorialDialogueId(dialogueId);
            if (elderRowan?.has(Npc)) {
              setNearbyNpcTemplateId(elderRowan.get(Npc).templateId);
            }
            setNpcDialogueOpen(true);
          },
          getSelectedTool: () =>
            koota.get(PlayerProgress)?.selectedTool ?? "trowel",
          setHasSeenRules: (seen: boolean) => {
            gameActions().setHasSeenRules(seen);
            setTutorialHighlightId(null);
            setTutorialHighlightLabel(null);
          },
          startNpcApproach: (
            _targetX: number,
            _targetZ: number,
            onArrival: () => void,
          ) => {
            const brain = getElderBrain();
            if (brain && playerMesh.mesh) {
              const pmesh = playerMesh.mesh;
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

    onCleanup(() => {
      cancelled = true;
      inputManager.dispose();
      selectionRing.dispose();
      tutorial.dispose();
      for (const brain of npcBrains.values()) brain.dispose();
      npcBrains.clear();
      cancelAllNpcMovements();
      audioManager.dispose();
      worldMgr.dispose();
      nMesh.dispose();
      tMesh.dispose();
      borderTrees.dispose();
      pMesh.dispose();
      disposeModelCache();
      sky.dispose();
      ground.dispose();
      lights.dispose();
      cam.dispose();
      sm.dispose();
    });
  });

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
    if (hapticsEnabled()) await hapticLight();
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
    gameActions().advanceQuestObjective("trees_watered", 1);
    tutorial.onQuestEvent("trees_watered");
    showParticle("+5 XP");
    audioManager.play("water");
    if (hapticsEnabled()) await hapticLight();
  };

  const useAxe = async (cell: Entity) => {
    const gc = cell.get(GridCell);
    if (!gc.occupied || !gc.treeEntity?.has(Tree)) return;
    const tree = gc.treeEntity;
    const t = tree.get(Tree);
    if (t.stage < 3) return;

    const harvestResources = collectHarvest(
      tree,
      koota.get(CurrentSeason)?.value ?? "spring",
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
    const ha = gameActions();
    ha.advanceQuestObjective("trees_harvested", 1);
    ha.trackSpeciesHarvest(
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

    treeMesh.removeMesh(tree.id());
    tree.destroy();
    cell.set(GridCell, { ...gc, occupied: false, treeEntity: null });
    debouncedSaveGrove();
    audioManager.play("harvest");
    cameraManager.shake(0.08, 200);
    if (hapticsEnabled()) await hapticSuccess();
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
    if (!gameActions().spendResource("acorns" as ResourceType, 5)) {
      showToast("Need 5 acorns to fertilize", "warning");
      return;
    }
    tree.set(Tree, { ...t, fertilized: true });
    addXp(5);
    showParticle("+5 XP");
    showToast("Fertilized! 2x growth for this stage.", "success");
    audioManager.play("success");
    if (hapticsEnabled()) await hapticLight();
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
    if (hapticsEnabled()) await hapticLight();
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
      cameraManager.shake(0.05, 150);
      if (hapticsEnabled()) await hapticMedium();
      return;
    }
    // Remove stage 0-1 (seed/sprout) trees — dig them up
    if (gc.occupied && gc.treeEntity?.has(Tree)) {
      const tree = gc.treeEntity;
      const t = tree.get(Tree);
      if (t.stage <= 1) {
        treeMesh.removeMesh(tree.id());
        tree.destroy();
        cell.set(GridCell, { ...gc, occupied: false, treeEntity: null });
        addXp(5);
        showParticle("+5 XP");
        showToast("Removed seedling.", "success");
        debouncedSaveGrove();
        audioManager.play("chop");
        if (hapticsEnabled()) await hapticMedium();
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
    if (hapticsEnabled()) await hapticMedium();
  };

  const useFertilizerSpreader = async (_cell: Entity) => {
    // Area fertilize: all trees in 2-tile radius, costs 3 acorns
    if (!gameActions().spendResource("acorns" as ResourceType, 3)) {
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
    if (hapticsEnabled()) await hapticMedium();
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
    if (hapticsEnabled()) await hapticMedium();
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
    if (hapticsEnabled()) await hapticSuccess();
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

    const store = gameActions();
    const buildState = koota.get(Build);
    const resourcesSnapshot = koota.get(Resources) ?? {
      timber: 0,
      sap: 0,
      fruit: 0,
      acorns: 0,
    };

    // Build mode — place a structure at player position
    if (buildState?.mode && buildState.templateId) {
      const player = koota.queryFirst(IsPlayer, Position);
      if (!player) return;
      const pp = player.get(Position);
      const worldX = Math.round(pp.x);
      const worldZ = Math.round(pp.z);
      const template = getTemplate(buildState.templateId);
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
        if ((resourcesSnapshot[resource as ResourceType] ?? 0) < amount) {
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
      if (hapticsEnabled()) await hapticSuccess();
      debouncedSaveGrove();
      return;
    }

    // Normal tool action
    const cell = findCellAtPlayer();
    if (!cell) return;
    const tool = getToolById(selectedTool());
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
      if (!gameActions().spendStamina(adjustedCost)) return;
    }
    const action = toolActions[selectedTool()];
    if (action) await action(cell);
  };

  const handlePlant = async () => {
    const player = koota.queryFirst(IsPlayer, Position);
    if (!player) return;
    const pp = player.get(Position);
    const gridX = Math.round(pp.x);
    const gridZ = Math.round(pp.z);

    const species = getSpeciesById(selectedSpecies());
    const store = gameActions();
    const seedsSnapshot = koota.get(Seeds) ?? {};
    const resourcesSnapshot = koota.get(Resources) ?? {
      timber: 0,
      sap: 0,
      fruit: 0,
      acorns: 0,
    };

    // Validate ALL costs atomically before spending anything
    const currentSeeds = seedsSnapshot[selectedSpecies()] ?? 0;
    if (currentSeeds < 1) return;

    if (species?.seedCost) {
      for (const [resource, amount] of Object.entries(species.seedCost)) {
        if ((resourcesSnapshot[resource as ResourceType] ?? 0) < amount) {
          showToast(`Not enough ${resource}!`, "warning");
          return;
        }
      }
    }

    // All validation passed — now spend resources
    store.spendSeed(selectedSpecies(), 1);
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
          store.addSeed(selectedSpecies(), 1);
          if (species?.seedCost) {
            for (const [resource, amount] of Object.entries(species.seedCost)) {
              store.addResource(resource as ResourceType, amount);
            }
          }
          return;
        }

        const tree = spawnTree(gridX, gridZ, selectedSpecies());
        cell.set(GridCell, {
          ...gc,
          occupied: true,
          treeEntity: tree,
        });

        incrementTreesPlanted();
        store.trackSpeciesPlanted(selectedSpecies());
        store.trackSpeciesPlanting(selectedSpecies());
        store.advanceQuestObjective("trees_planted", 1);
        tutorial.onQuestEvent("trees_planted");
        const plantXp = 10 + (species ? (species.difficulty - 1) * 5 : 0);
        addXp(plantXp);
        showParticle(`+${plantXp} XP`);

        debouncedSaveGrove();
        audioManager.play("plant");
        if (hapticsEnabled()) await hapticMedium();
        break;
      }
    }
  };

  const handleBatchHarvest = () => {
    let count = 0;
    const gains: Record<string, number> = {};
    for (const entity of koota.query(Tree, Harvestable)) {
      const h = entity.get(Harvestable);
      if (!h.ready) continue;
      const t = entity.get(Tree);
      const bh = gameActions();
      // Cost 5 stamina per tree (bulk discount)
      if (!bh.spendStamina(5)) break;
      const harvestResources = collectHarvest(
        entity,
        koota.get(CurrentSeason)?.value ?? "spring",
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
      bh.trackSpeciesHarvest(
        t.speciesId,
        harvestResources?.reduce((sum, r) => sum + r.amount, 0) ?? 0,
      );
      count++;
    }
    if (count > 0) {
      gameActions().advanceQuestObjective("trees_harvested", count);
      const xp = count * 50;
      addXp(xp);
      showParticle(`+${xp} XP`);
      const summary = Object.entries(gains)
        .map(([r, a]) => `+${a} ${r.charAt(0).toUpperCase() + r.slice(1)}`)
        .join(", ");
      showToast(`Harvested ${count} trees! ${summary}`, "success");
      audioManager.play("harvest");
    }
  };

  const dismissRadial = () => {
    radialTargetRef.current = null;
    setRadialTarget(null);
    setRadialActions([]);
    setRadialScreenPos(null);
    lastRadialScreenRef.current = null;
    selectionRing.hide();
    pendingRadialRef.current = null;
  };

  const handleRadialAction = async (actionId: string) => {
    const target = radialTarget();
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
  };

  return (
    <div ref={containerRef} class="relative w-full h-full">
      <canvas
        ref={canvasRef}
        class="absolute inset-0 w-full h-full"
        style={{ "touch-action": "none" }}
      />
      <div
        class="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 transition-opacity duration-500"
        style={{
          background: `linear-gradient(180deg, ${COLORS.skyMist} 0%, ${COLORS.leafLight}40 100%)`,
          opacity: sceneReady() ? 0 : 1,
          "pointer-events": sceneReady() ? "none" : "auto",
        }}
        onTransitionEnd={(e) => {
          if (e.propertyName === "opacity" && sceneReady()) {
            (e.currentTarget as HTMLElement).style.display = "none";
          }
        }}
      >
        <div
          class="w-8 h-8 border-3 border-t-transparent rounded-full motion-safe:animate-spin motion-reduce:animate-pulse"
          style={{
            "border-color": `${COLORS.forestGreen} transparent ${COLORS.forestGreen} ${COLORS.forestGreen}`,
          }}
        />
        <p class="text-sm" style={{ color: COLORS.barkBrown }}>
          Preparing grove...
        </p>
      </div>
      <Show when={autopilot()}>
        <div
          class="absolute top-12 left-1/2 -translate-x-1/2 z-50 px-3 py-1 rounded-full text-xs font-bold tracking-wider"
          style={{
            background: "rgba(34,197,94,0.85)",
            color: "#fff",
            "pointer-events": "none",
          }}
        >
          AUTOPILOT [G]
        </div>
      </Show>
      <GameUI
        onAction={handleAction}
        onPlant={handlePlant}
        onOpenMenu={() => setPauseMenuOpen(true)}
        onOpenTools={() => setToolWheelOpen(true)}
        seedSelectOpen={seedSelectOpen()}
        setSeedSelectOpen={setSeedSelectOpen}
        toolWheelOpen={toolWheelOpen()}
        setToolWheelOpen={setToolWheelOpen}
        pauseMenuOpen={pauseMenuOpen()}
        setPauseMenuOpen={setPauseMenuOpen}
        onMainMenu={() => {
          setPauseMenuOpen(false);
          setScreen("menu");
        }}
        onBatchHarvest={handleBatchHarvest}
        currentWeather={currentWeatherType()}
        weatherTimeRemaining={weatherTimeRemaining()}
        gameTime={gameTimeState()}
        playerTileInfo={playerTileInfo()}
        nearbyNpcTemplateId={nearbyNpcTemplateId()}
        npcDialogueOpen={npcDialogueOpen()}
        setNpcDialogueOpen={(open) => {
          setNpcDialogueOpen(open);
          if (!open) {
            tutorial.onDialogueClosed();
            setTutorialDialogueId(null);
          }
        }}
        tutorialDialogueId={tutorialDialogueId()}
        onTutorialDialogueAction={(actionType) => {
          tutorial.onDialogueAction(actionType);
        }}
        tutorialHighlightId={tutorialHighlightId()}
        tutorialHighlightLabel={tutorialHighlightLabel()}
        radialActions={radialActions()}
        radialScreenPos={radialScreenPos()}
        onRadialAction={handleRadialAction}
        onDismissRadial={dismissRadial}
        movementRef={movementRef}
        onJoystickActiveChange={(active) => {
          inputManager.setJoystickActive(active);
        }}
      />
    </div>
  );
};
