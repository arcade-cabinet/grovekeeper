/** Shared types for the hedge maze placement system. Spec §17.5. */
import type { HedgePieceType } from "@/game/ecs/components/terrain";

export interface MazeCell {
  x: number;
  z: number;
  walls: { north: boolean; south: boolean; east: boolean; west: boolean };
  visited: boolean;
  isCenter: boolean;
}

export interface MazeResult {
  grid: MazeCell[][];
  size: number;
  centerX: number;
  centerZ: number;
}

/** A resolved hedge piece ready for ECS entity creation. */
export interface HedgePiece {
  modelPath: string;
  rotation: number;
  x: number;
  z: number;
  /** Piece shape type — drives rendering and physics. */
  pieceType: HedgePieceType;
  /** Size class from filename (e.g., "1x1", "2x3"). */
  sizeClass: string;
  /** Junction type: "L", "T", "X", or empty for straight/corner. */
  junction: string;
}

export interface MazeDecoration {
  modelPath: string;
  x: number;
  z: number;
  rotation: number;
  category: "flowers" | "stone" | "fences" | "structure" | "dungeon";
}
