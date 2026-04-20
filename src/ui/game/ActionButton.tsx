import { COLORS } from "@/config/config";

export interface TileState {
  occupied: boolean;
  treeStage: number;
  cellType: string;
}

interface Props {
  selectedTool: string;
  tileState: TileState | null;
  onAction: () => void;
}

export function getActionLabel(
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

export const ActionButton = (props: Props) => {
  const computed = () => getActionLabel(props.selectedTool, props.tileState);

  return (
    <button
      type="button"
      data-tutorial-id="action-button"
      class="flex items-center justify-center rounded-xl font-bold text-sm tracking-wide motion-safe:active:scale-95 motion-safe:transition-all touch-manipulation select-none"
      style={{
        "min-width": "72px",
        "min-height": "48px",
        "padding-left": "16px",
        "padding-right": "16px",
        background: computed().enabled ? COLORS.forestGreen : "#9E9E9E",
        color: "white",
        border: `2px solid ${computed().enabled ? COLORS.soilDark : "#757575"}`,
        "box-shadow": computed().enabled
          ? `0 4px 12px ${COLORS.forestGreen}60`
          : "0 2px 4px rgba(0,0,0,0.15)",
        opacity: computed().enabled ? 1 : 0.55,
        cursor: computed().enabled ? "pointer" : "default",
      }}
      disabled={!computed().enabled}
      onClick={computed().enabled ? props.onAction : undefined}
      aria-label={`${computed().label} action`}
    >
      {computed().label}
    </button>
  );
};
