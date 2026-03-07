/**
 * Hedge maze placement system — barrel export. Spec §17.5.
 *
 * Consumers import from "@/game/systems/hedgePlacement" (resolves to this file).
 */
export type { MazeCell, MazeResult, HedgePiece, MazeDecoration } from "./types";
export { generateMaze } from "./mazeGen";
export { mazeToHedgePieces } from "./wallPieces";
export { placeMazeDecorations } from "./decorations";
