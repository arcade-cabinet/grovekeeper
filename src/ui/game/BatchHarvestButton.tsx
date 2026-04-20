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
        class="relative px-4 py-2 rounded-full text-sm font-medium shadow-lg touch-manipulation"
        style={{
          background: `linear-gradient(135deg, ${COLORS.autumnGold} 0%, ${COLORS.earthRed} 100%)`,
          color: "white",
          border: `2px solid ${COLORS.soilDark}`,
        }}
        onClick={props.onBatchHarvest}
      >
        <span class="mr-1">{"\uD83E\uDE93"}</span>
        Harvest All
        <span
          class="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
          style={{ background: COLORS.earthRed, color: "white" }}
        >
          {readyCount()}
        </span>
      </Button>
    </Show>
  );
};
