/**
 * Template factory for kitbash building system. Spec §35.4.
 *
 * Converts a buildTemplateId (e.g., "wall_wood") from the store
 * into a ModularPieceComponent for the PlacementGhost to preview.
 */

import type {
  MaterialType,
  ModularPieceComponent,
  PieceType,
} from "@/game/ecs/components/building";

const VALID_PIECE_TYPES: PieceType[] = [
  "wall",
  "floor",
  "roof",
  "stairs",
  "foundation",
  "door",
  "window",
  "pillar",
  "platform",
  "beam",
  "pipe",
];

const VALID_MATERIALS: MaterialType[] = ["thatch", "wood", "stone", "metal", "reinforced"];

/**
 * Parse a build template ID (e.g., "wall_wood") into a ModularPieceComponent.
 *
 * Returns null if the ID cannot be parsed or contains invalid piece/material types.
 * The returned component has zeroed grid position and rotation (placeholder for ghost).
 */
export function templateFromBuildId(buildId: string): ModularPieceComponent | null {
  if (!buildId) return null;

  const underscoreIdx = buildId.indexOf("_");
  if (underscoreIdx === -1) return null;

  const pieceType = buildId.slice(0, underscoreIdx) as PieceType;
  const materialType = buildId.slice(underscoreIdx + 1) as MaterialType;

  if (!VALID_PIECE_TYPES.includes(pieceType)) return null;
  if (!VALID_MATERIALS.includes(materialType)) return null;

  return {
    pieceType,
    variant: "default",
    modelPath: "",
    gridX: 0,
    gridY: 0,
    gridZ: 0,
    rotation: 0,
    snapPoints: [],
    materialType,
  };
}
