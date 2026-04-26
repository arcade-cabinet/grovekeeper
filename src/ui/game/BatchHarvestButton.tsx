import { Show } from "solid-js";
import { COLORS } from "@/config/config";
import { koota } from "@/koota";
import { Harvestable, Tree } from "@/traits";
import { Button } from "@/ui/primitives/button";

interface BatchHarvestButtonProps {
  onBatchHarvest: () => void;
}

export const BatchHarvestButton = (props: BatchHarvestButtonProps) => {
  const readyCount = () => {
    let n = 0;
    for (const entity of koota.query(Tree, Harvestable)) {
      const h = entity.get(Harvestable);
      if (h?.ready) n++;
    }
    return n;
  };

  return (
    <Show when={readyCount() >= 2}>
      <Button
        class="relative px-4 py-2 rounded-full text-sm font-medium motion-safe:transition-all hover:brightness-110 touch-manipulation"
        style={{
          background: `linear-gradient(135deg, ${COLORS.autumnGold} 0%, ${COLORS.earthRed} 100%)`,
          color: COLORS.parchment,
          border: `2px solid ${COLORS.soilDark}`,
          "box-shadow": `0 4px 12px ${COLORS.earthRed}60`,
        }}
        onClick={props.onBatchHarvest}
      >
        <span class="mr-1" aria-hidden="true">
          {"\uD83E\uDE93"}
        </span>
        <span>Harvest All ({readyCount()} ready)</span>
        <span
          aria-hidden="true"
          class="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
          style={{
            background: COLORS.earthRed,
            color: COLORS.parchment,
            border: `1px solid ${COLORS.soilDark}`,
          }}
        >
          {readyCount()}
        </span>
      </Button>
    </Show>
  );
};
