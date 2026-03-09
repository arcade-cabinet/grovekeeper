/**
 * Hedge maze placement system — barrel export. Spec §17.5.
 *
 * Consumers import from "@/game/systems/hedgePlacement" (resolves to this file).
 */

export { placeMazeDecorations } from "./decorations.ts";
export { generateMaze } from "./mazeGen.ts";
export type { HedgePiece, MazeCell, MazeDecoration, MazeResult } from "./types.ts";
export { mazeToHedgePieces } from "./wallPieces.ts";
