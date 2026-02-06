import { COLORS } from "../constants/config";

/**
 * Tile state information passed to the ActionButton to determine
 * the contextual label and enabled/disabled state.
 */
export interface TileState {
  /** Whether the tile has a tree on it. */
  occupied: boolean;
  /** Growth stage of the tree (0-4), or -1 if no tree. */
  treeStage: number;
  /** Cell type: "soil", "water", "rock", "path". */
  cellType: string;
}

interface ActionButtonProps {
  /** Currently selected tool id. */
  selectedTool: string;
  /** State of the tile the player is standing on, or null if unknown. */
  tileState: TileState | null;
  /** Called when the player taps the action button. */
  onAction: () => void;
}

/**
 * Determine the contextual action label based on the active tool and
 * the tile the player is standing on.
 */
function getActionLabel(
  selectedTool: string,
  tile: TileState | null,
): { label: string; enabled: boolean } {
  if (!tile) {
    return { label: "ACTION", enabled: false };
  }

  const { occupied, treeStage, cellType } = tile;
  const isSoil = cellType === "soil";
  const isBlocked = cellType === "rock";

  switch (selectedTool) {
    case "trowel":
      if (!occupied && isSoil) return { label: "PLANT", enabled: true };
      return { label: "PLANT", enabled: false };

    case "watering-can":
      if (occupied && treeStage >= 0 && treeStage <= 2)
        return { label: "WATER", enabled: true };
      return { label: "WATER", enabled: false };

    case "pruning-shears":
      if (occupied && treeStage >= 3 && treeStage <= 4)
        return { label: "PRUNE", enabled: true };
      return { label: "PRUNE", enabled: false };

    case "axe":
      if (occupied && treeStage >= 3) return { label: "CHOP", enabled: true };
      return { label: "CHOP", enabled: false };

    case "shovel":
      if (isBlocked) return { label: "CLEAR", enabled: true };
      return { label: "CLEAR", enabled: false };

    case "compost-bin":
      if (occupied) return { label: "COMPOST", enabled: true };
      return { label: "COMPOST", enabled: false };

    case "almanac":
      if (occupied) return { label: "INSPECT", enabled: true };
      return { label: "INSPECT", enabled: false };

    default:
      return { label: "ACTION", enabled: false };
  }
}

/**
 * Context-sensitive action button positioned at the bottom-right.
 *
 * Displays a label that changes based on the active tool and the
 * state of the tile the player is standing on. Greyed out when
 * no valid action is available.
 *
 * Minimum touch target: 72x48px.
 */
export const ActionButton = ({
  selectedTool,
  tileState,
  onAction,
}: ActionButtonProps) => {
  const { label, enabled } = getActionLabel(selectedTool, tileState);

  return (
    <button
      type="button"
      className="flex items-center justify-center rounded-xl font-bold text-sm tracking-wide active:scale-95 transition-all touch-manipulation select-none"
      style={{
        minWidth: 72,
        minHeight: 48,
        paddingLeft: 16,
        paddingRight: 16,
        background: enabled ? COLORS.forestGreen : "#9E9E9E",
        color: "white",
        border: `2px solid ${enabled ? COLORS.soilDark : "#757575"}`,
        boxShadow: enabled
          ? `0 4px 12px ${COLORS.forestGreen}60`
          : "0 2px 4px rgba(0,0,0,0.15)",
        opacity: enabled ? 1 : 0.55,
        cursor: enabled ? "pointer" : "default",
      }}
      disabled={!enabled}
      onClick={enabled ? onAction : undefined}
      aria-label={`${label} action`}
    >
      {label}
    </button>
  );
};
