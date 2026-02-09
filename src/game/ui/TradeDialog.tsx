import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { COLORS } from "../constants/config";
import { useGameStore } from "../stores/gameStore";
import type { TradeRate } from "../systems/trading";
import { executeTrade, getTradeRates } from "../systems/trading";
import { showToast } from "./Toast";

interface TradeDialogProps {
  open: boolean;
  onClose: () => void;
}

export const TradeDialog = ({ open, onClose }: TradeDialogProps) => {
  const { resources, addResource, spendResource } = useGameStore();
  const [selectedRate, setSelectedRate] = useState<TradeRate | null>(null);
  const [quantity, setQuantity] = useState(1);
  const rates = getTradeRates();

  const handleTrade = () => {
    if (!selectedRate) return;
    const inputAmount = quantity * selectedRate.fromAmount;
    const result = executeTrade(selectedRate, inputAmount, resources);
    if (!result) {
      showToast("Not enough resources!", "warning");
      return;
    }
    if (spendResource(result.spend.type, result.spend.amount)) {
      addResource(result.gain.type, result.gain.amount);
      showToast(
        `Traded ${result.spend.amount} ${result.spend.type} for ${result.gain.amount} ${result.gain.type}`,
        "success",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-sm"
        style={{
          background: COLORS.parchment,
          border: `3px solid ${COLORS.barkBrown}`,
          borderRadius: 16,
          boxShadow: `0 8px 32px rgba(0,0,0,0.15), inset 0 1px 0 ${COLORS.parchment}`,
        }}
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle style={{ color: COLORS.soilDark }}>
            Trading Post
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {rates.map((rate) => (
            <button
              key={`${rate.from}-${rate.to}`}
              className={`w-full p-3 rounded-lg text-left text-sm transition-colors ${
                selectedRate === rate ? "ring-2 ring-offset-1" : ""
              }`}
              style={{
                background:
                  selectedRate === rate
                    ? `${COLORS.leafLight}33`
                    : "rgba(255,255,255,0.5)",
                borderColor: COLORS.barkBrown,
                border: "1px solid",
                color: COLORS.soilDark,
              }}
              onClick={() => {
                setSelectedRate(rate);
                setQuantity(1);
              }}
            >
              <span className="font-medium capitalize">
                {rate.fromAmount} {rate.from}
              </span>
              <span className="mx-2">{"\u2192"}</span>
              <span className="font-medium capitalize">
                {rate.toAmount} {rate.to}
              </span>
            </button>
          ))}
        </div>
        {selectedRate && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-sm" style={{ color: COLORS.soilDark }}>
                x
              </span>
              <Slider
                min={1}
                max={Math.max(
                  1,
                  Math.floor(
                    (resources[selectedRate.from] ?? 0) /
                      selectedRate.fromAmount,
                  ),
                )}
                value={[quantity]}
                onValueChange={([v]) => setQuantity(v)}
                className="flex-1 [&_[data-slot=slider-track]]:h-2 [&_[data-slot=slider-range]]:bg-[var(--range-color)] [&_[data-slot=slider-thumb]]:border-[var(--range-color)] [&_[data-slot=slider-thumb]]:size-5"
                style={
                  { "--range-color": COLORS.forestGreen } as React.CSSProperties
                }
              />
              <span
                className="text-sm font-bold w-8 text-center tabular-nums"
                style={{ color: COLORS.forestGreen }}
              >
                {quantity}
              </span>
            </div>
            <div className="text-xs" style={{ color: COLORS.soilDark }}>
              Pay: {quantity * selectedRate.fromAmount} {selectedRate.from}{" "}
              {"\u2192"} Get: {quantity * selectedRate.toAmount}{" "}
              {selectedRate.to}
            </div>
            <Button
              className="w-full"
              style={{ background: COLORS.forestGreen, color: "white" }}
              onClick={handleTrade}
            >
              Trade
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
