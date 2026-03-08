/**
 * Building ECS components for Fallout-style kitbashing base building.
 *
 * Modular pieces snap together on a coarse grid (1-unit cells).
 * Player assembles shelters, workshops, storage from modular GLB pieces.
 * Progressive unlock: wood L5, stone L10, metal L15, decorative L20.
 */

/** Direction for snap point connections. */
export type SnapDirection = "up" | "down" | "north" | "south" | "east" | "west";

/** Piece type classification for modular building pieces. */
export type PieceType =
  | "wall"
  | "floor"
  | "roof"
  | "stairs"
  | "foundation"
  | "door"
  | "window"
  | "pillar"
  | "platform"
  | "beam"
  | "pipe";

/** Material type for visual style and durability tier. */
export type MaterialType = "wood" | "stone" | "metal" | "thatch" | "reinforced";

/** Structure category for base value and gameplay effects. */
export type StructureCategory = "shelter" | "workshop" | "storage" | "defensive" | "decorative";

/** Snap point for kitbashing connection between modular pieces. */
export interface SnapPoint {
  localPosition: { x: number; y: number; z: number };
  direction: SnapDirection;
  accepts: PieceType[];
}

/** Modular building piece for Fallout-style kitbashing. */
export interface ModularPieceComponent {
  pieceType: PieceType;
  variant: string;
  modelPath: string;
  gridX: number;
  gridY: number;
  gridZ: number;
  rotation: 0 | 90 | 180 | 270;
  snapPoints: SnapPoint[];
  materialType: MaterialType;
}

/** Player-built structure (collection of modular pieces). */
export interface BuildableComponent {
  ownerId: string;
  pieces: string[];
  baseValue: number;
  category: StructureCategory;
  level: number;
}

/** Light source with on/off state. */
export interface LightSourceComponent {
  lightType: string;
  on: boolean;
  radius: number;
  color: string;
  intensity: number;
  modelOnPath: string;
  modelOffPath: string;
}
