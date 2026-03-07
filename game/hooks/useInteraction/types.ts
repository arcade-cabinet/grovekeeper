import type { TileState } from "@/components/game/ActionButton";

export type SelectionType =
  | "tile"
  | "tree"
  | "npc"
  | "campfire"
  | "forge"
  | "water"
  | "trap"
  | null;

export interface InteractionSelection {
  type: SelectionType;
  gridX: number;
  gridZ: number;
  entityId: string | null;
}

export interface InteractionState {
  selection: InteractionSelection | null;
  tileState: TileState | null;
  actionLabel: string;
  actionEnabled: boolean;
}

/** Max distance (in grid tiles) for NPC interaction. */
export const NPC_INTERACT_RANGE = 2.5;
