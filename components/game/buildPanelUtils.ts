/**
 * BuildPanel pure utility functions. Spec §35.4 -- Build UI.
 *
 * Extracted to a plain .ts file (no JSX) so Jest can import them
 * without triggering the react-native-css-interop JSX runtime chain.
 * Both BuildPanel.tsx and BuildPanel.test.ts import from here.
 */

import type { MaterialType, PieceType } from "@/game/ecs/components/building";
import buildingConfig from "@/config/game/building.json";

// ---------------------------------------------------------------------------
// Config accessors
// ---------------------------------------------------------------------------

export const buildCosts = buildingConfig.buildCosts as Record<
  string,
  Record<string, Record<string, number>>
>;
export const unlockLevels = buildingConfig.unlockLevels as Record<string, number>;
export const materialUnlockLevels = buildingConfig.materialUnlockLevels as Record<string, number>;

// ---------------------------------------------------------------------------
// Category definitions (Spec §35.2)
// ---------------------------------------------------------------------------

export interface PieceCategory {
  id: string;
  label: string;
  icon: string;
  pieces: PieceType[];
}

export const CATEGORIES: PieceCategory[] = [
  { id: "foundation", label: "Foundation", icon: "🪨", pieces: ["foundation", "floor", "platform"] },
  { id: "walls", label: "Walls", icon: "🧱", pieces: ["wall", "window", "pillar"] },
  { id: "roofs", label: "Roofs", icon: "🏠", pieces: ["roof", "beam"] },
  { id: "doors", label: "Doors", icon: "🚪", pieces: ["door"] },
  { id: "stairs", label: "Stairs", icon: "🪜", pieces: ["stairs"] },
  { id: "utility", label: "Utility", icon: "🔧", pieces: ["pipe"] },
];

// ---------------------------------------------------------------------------
// Pure functions (exported for testing, Spec §35.4)
// ---------------------------------------------------------------------------

export function getPiecesForCategory(categoryId: string): PieceType[] {
  const cat = CATEGORIES.find((c) => c.id === categoryId);
  return cat ? cat.pieces : [];
}

export function getBuildCost(
  pieceType: PieceType,
  material: MaterialType,
): Record<string, number> {
  return (buildCosts[pieceType]?.[material] ?? {}) as Record<string, number>;
}

export function canAffordPiece(
  pieceType: PieceType,
  material: MaterialType,
  resources: Record<string, number>,
): boolean {
  const cost = getBuildCost(pieceType, material);
  for (const [res, amount] of Object.entries(cost)) {
    if ((resources[res] ?? 0) < amount) return false;
  }
  return true;
}

export function getPieceUnlockLevel(pieceType: PieceType, material: MaterialType): number {
  return Math.max(unlockLevels[pieceType] ?? 0, materialUnlockLevels[material] ?? 0);
}

export function isPieceLocked(
  pieceType: PieceType,
  material: MaterialType,
  playerLevel: number,
): boolean {
  return playerLevel < getPieceUnlockLevel(pieceType, material);
}

/**
 * Map a player level to a building tier.
 * Tier 1 (L1-5): wood pieces
 * Tier 2 (L6-15): stone/metal pieces
 * Tier 3 (L16+): advanced reinforced pieces
 */
export function getTier(playerLevel: number): 1 | 2 | 3 {
  if (playerLevel >= 16) return 3;
  if (playerLevel >= 6) return 2;
  return 1;
}
