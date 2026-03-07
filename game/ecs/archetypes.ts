import growthConfig from "@/config/game/growth.json" with { type: "json" };
import type { SerializedTree } from "@/game/stores/gameStore";
import { hashString } from "@/game/utils/seedRNG";
import type { Entity, NpcFunction } from "./world.ts";
import { generateEntityId } from "./world.ts";

const MAX_STAGE = growthConfig.maxStage;
const STAGE_VISUALS = growthConfig.stageVisuals;

/**
 * Calculate the visual scale for a tree at a given stage + progress.
 * Smoothly interpolates toward the next stage using progress * 0.3 as partial preview.
 */
export function getStageScale(stage: number, progress: number): number {
  const clampedStage = Math.max(0, Math.min(Math.floor(stage), MAX_STAGE));
  const baseScale = STAGE_VISUALS[clampedStage].scale;
  if (clampedStage >= MAX_STAGE) return baseScale;

  const nextScale = STAGE_VISUALS[clampedStage + 1].scale;
  const partialPreview = progress * 0.3;
  return baseScale + (nextScale - baseScale) * partialPreview;
}

export const createTreeEntity = (gridX: number, gridZ: number, speciesId: string): Entity => ({
  id: generateEntityId(),
  position: { x: gridX, y: 0, z: gridZ },
  tree: {
    speciesId,
    stage: 0,
    progress: 0,
    watered: false,
    totalGrowthTime: 0,
    plantedAt: Date.now(),
    meshSeed: hashString(`${speciesId}-${gridX}-${gridZ}`),
    wild: false,
    pruned: false,
    fertilized: false,
    baseModel: "tree01",
    winterModel: "",
    useWinterModel: false,
    seasonTint: "#228B22",
  },
  renderable: { visible: true, scale: 0.0 },
});

export const restoreTreeEntity = (data: SerializedTree): Entity => ({
  id: generateEntityId(),
  position: { x: data.gridX, y: 0, z: data.gridZ },
  tree: {
    speciesId: data.speciesId,
    stage: data.stage,
    progress: data.progress,
    watered: data.watered,
    totalGrowthTime: data.totalGrowthTime,
    plantedAt: data.plantedAt,
    meshSeed: data.meshSeed,
    wild: false,
    pruned: false,
    fertilized: false,
    baseModel: "tree01",
    winterModel: "",
    useWinterModel: false,
    seasonTint: "#228B22",
  },
  renderable: {
    visible: true,
    scale: getStageScale(data.stage, data.progress),
  },
});

export const createPlayerEntity = (): Entity => ({
  id: "player",
  position: { x: 6, y: 0, z: 6 },
  player: {
    coins: 100,
    xp: 0,
    level: 1,
    currentTool: "trowel",
    unlockedTools: ["trowel", "watering-can"],
    unlockedSpecies: ["white-oak"],
    stamina: 100,
    maxStamina: 100,
    hunger: 100,
    maxHunger: 100,
  },
  renderable: { visible: true, scale: 1 },
});

export const createWildTreeEntity = (
  gridX: number,
  gridZ: number,
  speciesId: string,
  stage: 0 | 1 | 2 | 3 | 4,
): Entity => {
  const seed = hashString(`wild-${speciesId}-${gridX}-${gridZ}`);
  // Deterministic progress derived from seed (0..0.5 range)
  const progress = ((seed >>> 0) % 1000) / 2000;
  return {
    id: generateEntityId(),
    position: { x: gridX, y: 0, z: gridZ },
    tree: {
      speciesId,
      stage,
      progress,
      watered: false,
      totalGrowthTime: 0,
      plantedAt: Date.now(),
      meshSeed: seed,
      wild: true,
      pruned: false,
      fertilized: false,
      baseModel: "tree01",
      winterModel: "",
      useWinterModel: false,
      seasonTint: "#228B22",
    },
    renderable: {
      visible: true,
      scale: getStageScale(stage, progress),
    },
  };
};

export const createGridCellEntity = (
  gridX: number,
  gridZ: number,
  type: "soil" | "water" | "rock" | "path" = "soil",
): Entity => ({
  id: generateEntityId(),
  position: { x: gridX, y: 0, z: gridZ },
  gridCell: {
    gridX,
    gridZ,
    type,
    occupied: false,
    treeEntityId: null,
  },
});

export const createNpcEntity = (
  worldX: number,
  worldZ: number,
  templateId: string,
  npcFunction: NpcFunction,
  playerLevel: number,
  requiredLevel: number,
): Entity => ({
  id: generateEntityId(),
  position: { x: worldX, y: 0, z: worldZ },
  npc: {
    templateId,
    function: npcFunction,
    interactable: playerLevel >= requiredLevel,
    requiredLevel,
    baseModel: "basemesh",
    useEmission: false,
    items: {},
    colorPalette: "#8B4513",
    name: "Villager",
    personality: "cheerful",
    dialogue: "",
    schedule: [],
    currentAnim: "idle",
    animProgress: 0,
    animSpeed: 1,
  },
  renderable: { visible: true, scale: 1 },
});
