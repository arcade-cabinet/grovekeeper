/**
 * Kitbashing unlock and value calculations. Spec §35.2, §35.3.
 */

import type { Entity } from "../../ecs/world";
import type { PieceType } from "../../ecs/components/building";
import buildingConfig from "../../../config/game/building.json";

/**
 * Calculate the total base value of all pieces in a structure.
 * Higher base value attracts stronger raids in survival mode.
 */
export function calculateBaseValue(pieces: Entity[]): number {
  const pieceValues = buildingConfig.pieceValues as Record<string, number>;
  let total = 0;

  for (const entity of pieces) {
    if (!entity.modularPiece) continue;
    const value = pieceValues[entity.modularPiece.pieceType] ?? 0;
    total += value;
  }

  return total;
}

/**
 * Get the list of piece types unlocked at the given player level.
 * Progressive unlock: wood L5, stone L10, metal L15, decorative L20.
 */
export function getUnlockedPieces(playerLevel: number): PieceType[] {
  const unlocks = buildingConfig.unlockLevels as Record<string, number>;
  const unlocked: PieceType[] = [];

  for (const [pieceType, requiredLevel] of Object.entries(unlocks)) {
    if (playerLevel >= requiredLevel) {
      unlocked.push(pieceType as PieceType);
    }
  }

  return unlocked;
}

/**
 * Get the list of material types unlocked at the given player level.
 */
export function getUnlockedMaterials(playerLevel: number): string[] {
  const materialUnlocks = buildingConfig.materialUnlockLevels as Record<string, number>;
  const unlocked: string[] = [];

  for (const [material, requiredLevel] of Object.entries(materialUnlocks)) {
    if (playerLevel >= requiredLevel) {
      unlocked.push(material);
    }
  }

  return unlocked;
}
