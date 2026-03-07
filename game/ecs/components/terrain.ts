/**
 * Terrain ECS components for fences, rocks, and hedge maze pieces.
 *
 * Fences: 79 GLBs across 7 types (brick, drystone, wooden, metal, plackard, plaster, picket).
 * Rocks: 1 composite GLB (rock formation).
 * Hedges: 171 GLBs -- modular maze pieces + misc decorations (flowers, stone, fences).
 */

/** Fence material type matching asset directory structure. */
export type FenceType =
  | "brick"
  | "drystone"
  | "wooden"
  | "metal"
  | "plackard"
  | "plaster"
  | "picket";

/** Fence segment placed in the world. */
export interface FenceComponent {
  /** Fence material type. */
  fenceType: FenceType;
  /** Specific variant name (e.g., "brick_wall_gate", "wooden_fence_broken"). */
  variant: string;
  /** Resolved asset path (e.g., "fences/brick/brick_wall_gate.glb"). */
  modelPath: string;
}

/** Rock formation placed in the world. */
export interface RockComponent {
  /** Rock type identifier. */
  rockType: string;
  /** Variant index for seeded selection. */
  variant: number;
  /** Resolved asset path. */
  modelPath: string;
}

/** Modular hedge piece type matching directory structure. */
export type HedgePieceType = "basic" | "diagonal" | "round" | "slope" | "triangle";

/** Modular hedge maze piece. */
export interface HedgeComponent {
  /** Piece shape type. */
  pieceType: HedgePieceType;
  /** Size class from filename (e.g., "1x1", "2x3", "5x2"). */
  sizeClass: string;
  /** Junction type for basic pieces: "L", "T", "X", or empty for straight. */
  junction: string;
  /** Y-axis rotation in degrees: 0, 90, 180, 270. */
  rotation: number;
  /** Resolved asset path. */
  modelPath: string;
}

/** Hedge maze decoration categories. */
export type HedgeMiscCategory = "fences" | "flowers" | "stone" | "structure";

/** Decoration placed within or near a hedge maze. */
export interface HedgeDecorationComponent {
  /** Decoration category. */
  category: HedgeMiscCategory;
  /** Specific item name (e.g., "fountain01_round_water", "vase3", "gazebo"). */
  itemId: string;
  /** Resolved asset path. */
  modelPath: string;
}
