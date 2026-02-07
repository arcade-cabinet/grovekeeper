import { Button } from "@/components/ui/button";
import { COLORS } from "../constants/config";
import { harvestableQuery } from "../ecs/world";

interface BatchHarvestButtonProps {
  onBatchHarvest: () => void;
}

export const BatchHarvestButton = ({
  onBatchHarvest,
}: BatchHarvestButtonProps) => {
  // Count ready trees
  let readyCount = 0;
  for (const entity of harvestableQuery) {
    if (entity.harvestable?.ready) readyCount++;
  }

  if (readyCount < 2) return null;

  return (
    <Button
      className="relative px-4 py-2 rounded-full text-sm font-medium shadow-lg touch-manipulation"
      style={{
        background: `linear-gradient(135deg, ${COLORS.autumnGold} 0%, ${COLORS.earthRed} 100%)`,
        color: "white",
        border: `2px solid ${COLORS.soilDark}`,
      }}
      onClick={onBatchHarvest}
    >
      <span className="mr-1">{"\uD83E\uDE93"}</span>
      Harvest All
      <span
        className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
        style={{ background: COLORS.earthRed, color: "white" }}
      >
        {readyCount}
      </span>
    </Button>
  );
};
