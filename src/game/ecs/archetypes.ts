import type { Entity } from "./world";
import { generateEntityId } from "./world";
import { hashString } from "../utils/seedRNG";

export const createTreeEntity = (
  gridX: number,
  gridZ: number,
  speciesId: string,
): Entity => ({
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
  },
  renderable: { meshId: null, visible: true, scale: 0.0 },
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
  },
  farmerState: {
    stamina: 100,
    maxStamina: 100,
  },
  renderable: { meshId: null, visible: true, scale: 1 },
});

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
