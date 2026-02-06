import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder";
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { GrassProceduralTexture } from "@babylonjs/procedural-textures/grass/grassProceduralTexture";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { CubeTexture } from "@babylonjs/core/Materials/Textures/cubeTexture";
import type { Scene } from "@babylonjs/core/scene";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { useCallback, useEffect, useRef, useState } from "react";
import { COLORS, GRID_SIZE } from "../constants/config";
import { getSpeciesById } from "../constants/trees";
import { createGridCellEntity, createPlayerEntity, createTreeEntity, restoreTreeEntity } from "../ecs/archetypes";
import { gridCellsQuery, playerQuery, treesQuery, world } from "../ecs/world";
import { createRNG, hashString } from "../utils/seedRNG";
import type { SerializedTree } from "../stores/gameStore";
import { growthSystem, getStageScale } from "../systems/growth";
import { staminaSystem } from "../systems/stamina";
import { movementSystem } from "../systems/movement";
import { useGameStore } from "../stores/gameStore";
import { GameUI } from "../ui/GameUI";
import { 
  initializeTime, 
  updateTime, 
  getSkyColors, 
  getSeasonalColors,
  type GameTime,
  type Season 
} from "../systems/time";
import { hapticMedium, hapticLight, hapticSuccess } from "../systems/platform";

export const GameScene = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<Scene | null>(null);
  const engineRef = useRef<import("@babylonjs/core/Engines/engine").Engine | null>(null);
  const playerMeshRef = useRef<Mesh | null>(null);
  const treeMeshesRef = useRef<Map<string, Mesh>>(new Map());
  const borderTreeMeshesRef = useRef<Mesh[]>([]);
  const movementRef = useRef({ x: 0, z: 0 });
  const cameraRef = useRef<ArcRotateCamera | null>(null);
  const lightsRef = useRef<{ hemi: HemisphericLight | null; sun: DirectionalLight | null }>({ hemi: null, sun: null });
  const groundMatRef = useRef<StandardMaterial | null>(null);
  const soilMatRef = useRef<StandardMaterial | null>(null);

  const [seedSelectOpen, setSeedSelectOpen] = useState(false);
  const [toolWheelOpen, setToolWheelOpen] = useState(false);
  const [pauseMenuOpen, setPauseMenuOpen] = useState(false);
  const [gameTime, setGameTime] = useState<GameTime | null>(null);
  
  const { 
    setScreen, 
    selectedSpecies, 
    selectedTool, 
    addCoins, 
    addXp, 
    incrementTreesPlanted,
    incrementTreesHarvested,
    incrementTreesWatered,
    setGameTime: storeSetGameTime,
    setCurrentSeason,
    setCurrentDay,
    hapticsEnabled,
  } = useGameStore();

  // Serialize all tree entities for persistence
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

  // Debounced save — coalesces rapid plant/harvest actions into one write
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedSaveGrove = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(saveCurrentGrove, 1000);
  }, [saveCurrentGrove]);

  // Initialize ECS entities and time — runs once on mount
  useEffect(() => {
    if (playerQuery.first === undefined) {
      world.add(createPlayerEntity());
      for (let x = 0; x < GRID_SIZE; x++) {
        for (let z = 0; z < GRID_SIZE; z++) {
          world.add(createGridCellEntity(x, z, "soil"));
        }
      }

      // Restore saved grove data
      const groveData = useGameStore.getState().groveData;
      if (groveData) {
        for (const savedTree of groveData.trees) {
          const entity = restoreTreeEntity(savedTree);
          world.add(entity);
          // Mark grid cell as occupied
          for (const cell of gridCellsQuery) {
            if (cell.gridCell?.gridX === savedTree.gridX && cell.gridCell?.gridZ === savedTree.gridZ) {
              cell.gridCell.occupied = true;
              cell.gridCell.treeEntityId = entity.id;
              break;
            }
          }
        }
        // Restore player position
        const player = playerQuery.first;
        if (player?.position) {
          player.position.x = groveData.playerPosition.x;
          player.position.z = groveData.playerPosition.z;
        }
      }
    }
    // Initialize time system from persisted value
    initializeTime(useGameStore.getState().gameTimeMicroseconds);
  }, []);

  // Auto-save grove when tab loses focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        saveCurrentGrove();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [saveCurrentGrove]);

  // Initialize BabylonJS
  useEffect(() => {
    if (!canvasRef.current) return;

    const initBabylon = async () => {
      const { Engine } = await import("@babylonjs/core/Engines/engine");
      const { Scene } = await import("@babylonjs/core/scene");

      const engine = new Engine(canvasRef.current, true, {
        preserveDrawingBuffer: true,
        stencil: true,
        antialias: true,
      });
      engineRef.current = engine;

      const scene = new Scene(engine);
      sceneRef.current = scene;

      // Sky gradient - soft morning sky
      scene.clearColor = new Color4(0.53, 0.72, 0.82, 1);

      // Create gradient sky with hemisphere
      scene.ambientColor = new Color3(0.3, 0.3, 0.35);

      // Fixed isometric diorama camera - no user control
      const gridCenter = new Vector3(GRID_SIZE / 2 - 0.5, 0, GRID_SIZE / 2 - 0.5);
      const camera = new ArcRotateCamera(
        "camera",
        -Math.PI / 4,     // 45 degree rotation
        Math.PI / 3.5,    // ~51 degree tilt for nice diorama view
        18,               // Fixed distance
        gridCenter,
        scene
      );
      
      // Lock camera - no user interaction
      camera.inputs.clear();
      camera.lowerRadiusLimit = 18;
      camera.upperRadiusLimit = 18;
      camera.lowerBetaLimit = Math.PI / 3.5;
      camera.upperBetaLimit = Math.PI / 3.5;
      cameraRef.current = camera;

      // Soft ambient light
      const hemiLight = new HemisphericLight("hemi", new Vector3(0, 1, 0), scene);
      hemiLight.intensity = 0.6;
      hemiLight.groundColor = new Color3(0.4, 0.35, 0.3);
      hemiLight.diffuse = new Color3(1, 0.95, 0.85);
      lightsRef.current.hemi = hemiLight;

      // Directional sun light with soft shadows
      const sunLight = new DirectionalLight("sun", new Vector3(-0.5, -1, -0.3), scene);
      sunLight.intensity = 0.8;
      sunLight.diffuse = new Color3(1, 0.95, 0.8);
      lightsRef.current.sun = sunLight;

      // Forest floor ground
      const groundSize = GRID_SIZE + 4;
      const ground = CreateGround("ground", {
        width: groundSize,
        height: groundSize,
        subdivisions: 32,
      }, scene);
      ground.position = new Vector3(GRID_SIZE / 2 - 0.5, -0.05, GRID_SIZE / 2 - 0.5);

      // Procedural grass/soil texture
      const grassTexture = new GrassProceduralTexture("grassTex", 512, scene);
      grassTexture.grassColors = [
        new Color3(0.25, 0.18, 0.12),  // Dark soil
        new Color3(0.35, 0.25, 0.15),  // Medium soil
        new Color3(0.28, 0.22, 0.14),  // Brown soil
      ];
      grassTexture.groundColor = new Color3(0.22, 0.16, 0.1);

      const groundMat = new StandardMaterial("groundMat", scene);
      groundMat.diffuseTexture = grassTexture;
      groundMat.specularColor = new Color3(0.05, 0.05, 0.05);
      ground.material = groundMat;
      groundMatRef.current = groundMat;

      // Grid overlay on planting area
      const gridOverlay = CreateGround("gridOverlay", {
        width: GRID_SIZE,
        height: GRID_SIZE,
        subdivisions: GRID_SIZE,
      }, scene);
      gridOverlay.position = new Vector3(GRID_SIZE / 2 - 0.5, 0.01, GRID_SIZE / 2 - 0.5);

      const gridMat = new StandardMaterial("gridMat", scene);
      gridMat.diffuseColor = new Color3(0.35, 0.28, 0.18);
      gridMat.specularColor = new Color3(0, 0, 0);
      gridMat.alpha = 0.3;
      gridMat.wireframe = true;
      gridOverlay.material = gridMat;

      // Soil tiles for planting area
      const soilTile = CreateGround("soilBase", {
        width: GRID_SIZE,
        height: GRID_SIZE,
      }, scene);
      soilTile.position = new Vector3(GRID_SIZE / 2 - 0.5, 0.005, GRID_SIZE / 2 - 0.5);
      
      const soilMat = new StandardMaterial("soilMat", scene);
      soilMat.diffuseColor = Color3.FromHexString("#3d2817");
      soilMat.specularColor = new Color3(0.02, 0.02, 0.02);
      soilTile.material = soilMat;
      soilMatRef.current = soilMat;

      // Create player mesh (cute farmer)
      const playerBody = CreateCylinder("playerBody", {
        height: 0.6,
        diameterTop: 0.25,
        diameterBottom: 0.35,
      }, scene);
      
      const playerHead = CreateSphere("playerHead", { diameter: 0.3 }, scene);
      playerHead.position.y = 0.45;
      playerHead.parent = playerBody;

      const hat = CreateCylinder("hat", {
        height: 0.12,
        diameterTop: 0.4,
        diameterBottom: 0.35,
      }, scene);
      hat.position.y = 0.58;
      hat.parent = playerBody;

      const hatTop = CreateCylinder("hatTop", {
        height: 0.15,
        diameterTop: 0.2,
        diameterBottom: 0.25,
      }, scene);
      hatTop.position.y = 0.7;
      hatTop.parent = playerBody;

      // Player materials
      const bodyMat = new StandardMaterial("bodyMat", scene);
      bodyMat.diffuseColor = Color3.FromHexString(COLORS.forestGreen);
      playerBody.material = bodyMat;

      const headMat = new StandardMaterial("headMat", scene);
      headMat.diffuseColor = Color3.FromHexString("#FFCCBC");
      playerHead.material = headMat;

      const hatMat = new StandardMaterial("hatMat", scene);
      hatMat.diffuseColor = Color3.FromHexString(COLORS.autumnGold);
      hat.material = hatMat;
      hatTop.material = hatMat;

      playerBody.position.y = 0.3;
      playerMeshRef.current = playerBody;

      // Decorative trees around the border
      borderTreeMeshesRef.current = createBorderTrees(scene);

      // Game loop
      let lastTime = performance.now();
      let lastSeasonUpdate: Season | null = null;
      
      engine.runRenderLoop(() => {
        const now = performance.now();
        const deltaTime = (now - lastTime) / 1000;
        const deltaMs = now - lastTime;
        lastTime = now;

        // Update time system first so season is available for growth
        const currentTime = updateTime(deltaMs);
        setGameTime(currentTime);

        movementSystem(movementRef.current, deltaTime);
        growthSystem(deltaTime, currentTime.season);
        staminaSystem(deltaTime);
        
        // Update sky and lighting based on time
        updateSceneForTime(scene, currentTime, lightsRef.current, lastSeasonUpdate);
        
        // Update seasonal visuals when season changes
        if (lastSeasonUpdate !== currentTime.season) {
          lastSeasonUpdate = currentTime.season;
          updateSeasonalVisuals(
            currentTime.season,
            currentTime.seasonProgress,
            groundMatRef.current,
            soilMatRef.current,
            borderTreeMeshesRef.current
          );
          setCurrentSeason(currentTime.season);
        }
        
        // Store time periodically (every 5 seconds)
        if (Math.floor(now / 5000) !== Math.floor((now - deltaMs) / 5000)) {
          storeSetGameTime(currentTime.microseconds);
          setCurrentDay(currentTime.day);
        }

        // Sync player mesh
        const playerEntity = playerQuery.first;
        if (playerEntity?.position && playerMeshRef.current) {
          playerMeshRef.current.position.x = playerEntity.position.x;
          playerMeshRef.current.position.z = playerEntity.position.z;
        }

        // Sync tree meshes
        for (const treeEntity of treesQuery) {
          if (!treeEntity.position || !treeEntity.tree || !treeEntity.renderable) continue;

          let mesh = treeMeshesRef.current.get(treeEntity.id);
          if (!mesh) {
            mesh = createTreeMesh(scene, treeEntity.id, treeEntity.tree.speciesId, currentTime.season, treeEntity.tree.meshSeed);
            treeMeshesRef.current.set(treeEntity.id, mesh);
          }

          mesh.position.x = treeEntity.position.x;
          mesh.position.z = treeEntity.position.z;

          const scale = treeEntity.renderable.scale;
          mesh.scaling.setAll(scale);
          mesh.position.y = scale * 0.4;
        }

        scene.render();
      });

      // Handle resize
      const handleResize = () => {
        engine.resize();
      };
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
      };
    };

    initBabylon();

    return () => {
      engineRef.current?.dispose();
    };
  }, []);

  const createBorderTrees = (scene: Scene): Mesh[] => {
    const positions = [
      // Left side
      { x: -2, z: 2 }, { x: -2.5, z: 5 }, { x: -1.8, z: 8 }, { x: -2.2, z: 11 },
      // Right side
      { x: GRID_SIZE + 1, z: 1 }, { x: GRID_SIZE + 1.5, z: 4 }, { x: GRID_SIZE + 1.2, z: 7 }, { x: GRID_SIZE + 2, z: 10 },
      // Back
      { x: 2, z: GRID_SIZE + 1.5 }, { x: 5, z: GRID_SIZE + 2 }, { x: 8, z: GRID_SIZE + 1.8 }, { x: 11, z: GRID_SIZE + 1.5 },
      // Front corners
      { x: -1.5, z: -1 }, { x: GRID_SIZE + 1, z: -0.5 },
    ];

    const meshes: Mesh[] = [];
    const rng = createRNG(hashString("border-trees"));

    positions.forEach((pos, i) => {
      const scale = 0.8 + rng() * 0.5;
      const trunk = CreateCylinder(`borderTrunk${i}`, {
        height: 1.5 * scale,
        diameterTop: 0.15 * scale,
        diameterBottom: 0.25 * scale,
      }, scene);
      trunk.position = new Vector3(pos.x, 0.75 * scale, pos.z);

      const trunkMat = new StandardMaterial(`borderTrunkMat${i}`, scene);
      trunkMat.diffuseColor = Color3.FromHexString("#4a3728");
      trunk.material = trunkMat;

      const canopy = CreateSphere(`borderCanopy${i}`, { diameter: 1.2 * scale }, scene);
      canopy.position.y = 0.9 * scale;
      canopy.parent = trunk;

      const canopyMat = new StandardMaterial(`borderCanopyMat${i}`, scene);
      const greens = ["#2d5a27", "#3d6b35", "#1e4620", "#4a7c42"];
      canopyMat.diffuseColor = Color3.FromHexString(greens[i % greens.length]);
      canopy.material = canopyMat;
      
      meshes.push(trunk);
    });
    
    return meshes;
  };
  
  // Update scene lighting and sky based on time
  const updateSceneForTime = (
    scene: Scene,
    time: GameTime,
    lights: { hemi: HemisphericLight | null; sun: DirectionalLight | null },
    lastSeason: Season | null
  ) => {
    const skyColors = getSkyColors(time);
    
    // Update clear color (sky)
    const zenithRgb = hexToRgb(skyColors.zenith);
    scene.clearColor = new Color4(zenithRgb.r / 255, zenithRgb.g / 255, zenithRgb.b / 255, 1);
    
    // Update ambient color
    const ambientRgb = hexToRgb(skyColors.ambient);
    scene.ambientColor = new Color3(ambientRgb.r / 255, ambientRgb.g / 255, ambientRgb.b / 255);
    
    // Update hemisphere light
    if (lights.hemi) {
      lights.hemi.intensity = time.ambientIntensity;
      const horizonRgb = hexToRgb(skyColors.horizon);
      lights.hemi.groundColor = new Color3(horizonRgb.r / 255 * 0.5, horizonRgb.g / 255 * 0.5, horizonRgb.b / 255 * 0.5);
    }
    
    // Update sun light
    if (lights.sun) {
      lights.sun.intensity = time.sunIntensity;
      const sunRgb = hexToRgb(skyColors.sun);
      lights.sun.diffuse = new Color3(sunRgb.r / 255, sunRgb.g / 255, sunRgb.b / 255);
      
      // Rotate sun direction based on time of day
      const sunAngle = (time.hours / 24) * Math.PI * 2 - Math.PI / 2;
      lights.sun.direction = new Vector3(
        Math.cos(sunAngle) * 0.5,
        -1,
        Math.sin(sunAngle) * 0.3
      );
    }
  };
  
  // Update seasonal visuals (ground, trees)
  const updateSeasonalVisuals = (
    season: Season,
    seasonProgress: number,
    groundMat: StandardMaterial | null,
    soilMat: StandardMaterial | null,
    borderTrees: Mesh[]
  ) => {
    const seasonalColors = getSeasonalColors(season, seasonProgress);
    
    // Update ground color
    if (groundMat) {
      const groundRgb = hexToRgb(seasonalColors.groundColor);
      groundMat.diffuseColor = new Color3(groundRgb.r / 255, groundRgb.g / 255, groundRgb.b / 255);
    }
    
    // Update border tree canopy colors
    borderTrees.forEach((trunk, i) => {
      const canopy = trunk.getChildren()[0] as Mesh;
      if (canopy && canopy.material) {
        const mat = canopy.material as StandardMaterial;
        const colorIndex = i % seasonalColors.leafColors.length;
        const leafRgb = hexToRgb(seasonalColors.leafColors[colorIndex]);
        mat.diffuseColor = new Color3(leafRgb.r / 255, leafRgb.g / 255, leafRgb.b / 255);
      }
    });
  };
  
  // Helper to convert hex to RGB
  const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    } : { r: 128, g: 128, b: 128 };
  };

  const createTreeMesh = (scene: Scene, id: string, speciesId: string, season?: Season, meshSeed?: number): Mesh => {
    const species = getSpeciesById(speciesId);
    const colors = species?.meshParams.color;
    const rng = createRNG(meshSeed ?? hashString(id));

    const trunk = CreateCylinder(`trunk_${id}`, {
      height: species?.meshParams.trunkHeight ?? 0.8,
      diameterTop: (species?.meshParams.trunkRadius ?? 0.1) * 0.7,
      diameterBottom: (species?.meshParams.trunkRadius ?? 0.18) * 1.2,
    }, scene);

    const trunkMat = new StandardMaterial(`trunkMat_${id}`, scene);
    trunkMat.diffuseColor = Color3.FromHexString(colors?.trunk || COLORS.barkBrown);
    trunk.material = trunkMat;

    const canopy = CreateSphere(`canopy_${id}`, {
      diameter: (species?.meshParams.canopyRadius ?? 0.4) * 2,
      segments: species?.meshParams.canopySegments ?? 8,
    }, scene);
    canopy.position.y = (species?.meshParams.trunkHeight ?? 0.8) * 0.7;
    canopy.parent = trunk;

    const canopyMat = new StandardMaterial(`canopyMat_${id}`, scene);

    // Apply seasonal color variation
    let leafColor = colors?.canopy || COLORS.forestGreen;
    if (season === "autumn" && !species?.evergreen) {
      const autumnColors = ["#FF6347", "#FF4500", "#FFD700", "#FFA500"];
      leafColor = autumnColors[Math.floor(rng() * autumnColors.length)];
    } else if (season === "winter" && !species?.evergreen) {
      leafColor = "#4a5a4a";
    }

    canopyMat.diffuseColor = Color3.FromHexString(leafColor);
    canopy.material = canopyMat;

    return trunk;
  };

  const handleMove = useCallback((x: number, z: number) => {
    movementRef.current = { x, z };
  }, []);

  const handleMoveEnd = useCallback(() => {
    movementRef.current = { x: 0, z: 0 };
  }, []);

  // Find the tree entity occupying a grid cell
  const findTreeOnCell = (treeEntityId: string) => {
    for (const tree of treesQuery) {
      if (tree.id === treeEntityId && tree.tree) return tree;
    }
    return null;
  };

  const handleToolOnCell = async (cell: { gridCell?: import("../ecs/world").GridCellComponent; }) => {
    const gc = cell.gridCell!;

    if (selectedTool === "trowel") {
      if (gc.occupied) return;
      if (hapticsEnabled) await hapticLight();
      setSeedSelectOpen(true);
      return;
    }

    // All remaining tools require an occupied cell with a tree
    if (!gc.occupied || !gc.treeEntityId) return;
    const tree = findTreeOnCell(gc.treeEntityId);
    if (!tree?.tree) return;

    if (selectedTool === "watering-can") {
      tree.tree.watered = true;
      addXp(5);
      incrementTreesWatered();
      if (hapticsEnabled) await hapticLight();
    } else if (selectedTool === "axe") {
      if (tree.tree.stage < 3) return;
      const species = getSpeciesById(tree.tree.speciesId);
      if (species) {
        for (const y of species.yield) {
          useGameStore.getState().addResource(y.resource, y.amount);
        }
      }
      addCoins(50);
      addXp(50);
      incrementTreesHarvested();
      const mesh = treeMeshesRef.current.get(tree.id);
      if (mesh) {
        mesh.dispose();
        treeMeshesRef.current.delete(tree.id);
      }
      world.remove(tree);
      gc.occupied = false;
      gc.treeEntityId = null;
      debouncedSaveGrove();
      if (hapticsEnabled) await hapticSuccess();
    } else if (selectedTool === "compost-bin") {
      tree.tree.progress += 0.1;
      addXp(5);
      if (hapticsEnabled) await hapticLight();
    }
  };

  const handleAction = async () => {
    const player = playerQuery.first;
    if (!player?.position) return;

    const gridX = Math.round(player.position.x);
    const gridZ = Math.round(player.position.z);

    for (const cell of gridCellsQuery) {
      if (cell.gridCell?.gridX === gridX && cell.gridCell?.gridZ === gridZ) {
        await handleToolOnCell(cell);
        break;
      }
    }
  };

  const handlePlant = async () => {
    const player = playerQuery.first;
    if (!player?.position) return;

    const gridX = Math.round(player.position.x);
    const gridZ = Math.round(player.position.z);

    for (const cell of gridCellsQuery) {
      if (cell.gridCell?.gridX === gridX && cell.gridCell?.gridZ === gridZ) {
        if (cell.gridCell.occupied) return;

        const tree = createTreeEntity(gridX, gridZ, selectedSpecies);
        world.add(tree);

        cell.gridCell.occupied = true;
        cell.gridCell.treeEntityId = tree.id;

        incrementTreesPlanted();
        addXp(10);

        debouncedSaveGrove();
        if (hapticsEnabled) await hapticMedium();
        break;
      }
    }
  };

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
