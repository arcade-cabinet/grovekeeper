import { Pressable } from "react-native";
import { Text } from "@/components/ui/text";

export interface TileState {
  occupied: boolean;
  treeStage: number;
  cellType: string;
}

export interface ActionButtonProps {
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

export function ActionButton({
  selectedTool,
  tileState,
  onAction,
}: ActionButtonProps) {
  const { label, enabled } = getActionLabel(selectedTool, tileState);

  return (
    <Pressable
      className={`min-h-[48px] min-w-[72px] items-center justify-center rounded-xl border-2 px-4 ${
        enabled
          ? "border-soil-dark bg-forest-green shadow-lg shadow-forest-green/40"
          : "border-gray-500 bg-gray-400 opacity-55"
      }`}
      disabled={!enabled}
      onPress={enabled ? onAction : undefined}
      accessibilityLabel={`${label} action`}
      accessibilityRole="button"
    >
      <Text className="text-sm font-bold tracking-wide text-white">
        {label}
      </Text>
    </Pressable>
  );
}
