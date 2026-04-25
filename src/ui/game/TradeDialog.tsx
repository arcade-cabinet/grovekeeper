import { createSignal, For, Show } from "solid-js";
import { actions as gameActions } from "@/actions";
import { COLORS } from "@/config/config";
import { useTrait } from "@/ecs/solid";
import { koota } from "@/koota";
import { Resources } from "@/traits";
import type { TradeRate } from "@/systems/trading";
import { executeTrade, getTradeRates } from "@/systems/trading";
import { Button } from "@/ui/primitives/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/ui/primitives/dialog";
import { Slider } from "@/ui/primitives/slider";
import { showToast } from "./Toast";

interface TradeDialogProps {
  open: boolean;
  onClose: () => void;
}

export const TradeDialog = (props: TradeDialogProps) => {
  const resourcesAccessor = useTrait(koota, Resources);
  const resources = () =>
    resourcesAccessor() ?? { timber: 0, sap: 0, fruit: 0, acorns: 0 };
  const [selectedRate, setSelectedRate] = createSignal<TradeRate | null>(null);
  const [quantity, setQuantity] = createSignal(1);
  const rates = getTradeRates();

  const handleTrade = () => {
    const rate = selectedRate();
    if (!rate) return;
    const a = gameActions();
    const inputAmount = quantity() * rate.fromAmount;
    const result = executeTrade(rate, inputAmount, resources());
    if (!result) {
      showToast("Not enough resources!", "warning");
      return;
    }
    if (a.spendResource(result.spend.type, result.spend.amount)) {
      a.addResource(result.gain.type, result.gain.amount);
      showToast(
        `Traded ${result.spend.amount} ${result.spend.type} for ${result.gain.amount} ${result.gain.type}`,
        "success",
      );
    }
  };

  return (
    <Dialog open={props.open} onOpenChange={(o) => !o && props.onClose()}>
      <DialogContent
        class="max-w-sm"
        style={{
          background: COLORS.parchment,
          border: `3px solid ${COLORS.barkBrown}`,
          "border-radius": "16px",
          "box-shadow": `0 8px 32px rgba(0,0,0,0.15), inset 0 1px 0 ${COLORS.parchment}`,
        }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: COLORS.soilDark }}>
            Trading Post
          </DialogTitle>
        </DialogHeader>
        <div class="space-y-3">
          <For each={rates}>
            {(rate) => (
              <button
                type="button"
                class={`w-full p-3 rounded-lg text-left text-sm transition-colors ${
                  selectedRate() === rate ? "ring-2 ring-offset-1" : ""
                }`}
                style={{
                  background:
                    selectedRate() === rate
                      ? `${COLORS.leafLight}33`
                      : "rgba(255,255,255,0.5)",
                  "border-color": COLORS.barkBrown,
                  border: "1px solid",
                  color: COLORS.soilDark,
                }}
                onClick={() => {
                  setSelectedRate(rate);
                  setQuantity(1);
                }}
              >
                <span class="font-medium capitalize">
                  {rate.fromAmount} {rate.from}
                </span>
                <span class="mx-2">{"\u2192"}</span>
                <span class="font-medium capitalize">
                  {rate.toAmount} {rate.to}
                </span>
              </button>
            )}
          </For>
        </div>
        <Show when={selectedRate()}>
          {(rate) => (
            <div class="mt-3 space-y-2">
              <div class="flex items-center gap-3">
                <span class="text-sm" style={{ color: COLORS.soilDark }}>
                  x
                </span>
                <Slider
                  min={1}
                  max={Math.max(
                    1,
                    Math.floor(
                      (resources()[rate().from] ?? 0) / rate().fromAmount,
                    ),
                  )}
                  value={[quantity()]}
                  onValueChange={([v]) => setQuantity(v)}
                  class="flex-1 [&_[data-slot=slider-track]]:h-2 [&_[data-slot=slider-range]]:bg-[var(--range-color)] [&_[data-slot=slider-thumb]]:border-[var(--range-color)] [&_[data-slot=slider-thumb]]:size-5"
                  style={{ "--range-color": COLORS.forestGreen }}
                />
                <span
                  class="text-sm font-bold w-8 text-center tabular-nums"
                  style={{ color: COLORS.forestGreen }}
                >
                  {quantity()}
                </span>
              </div>
              <div class="text-xs" style={{ color: COLORS.soilDark }}>
                Pay: {quantity() * rate().fromAmount} {rate().from} {"\u2192"}{" "}
                Get: {quantity() * rate().toAmount} {rate().to}
              </div>
              <Button
                class="w-full"
                style={{ background: COLORS.forestGreen, color: "white" }}
                onClick={handleTrade}
              >
                Trade
              </Button>
            </div>
          )}
        </Show>
      </DialogContent>
    </Dialog>
  );
};
