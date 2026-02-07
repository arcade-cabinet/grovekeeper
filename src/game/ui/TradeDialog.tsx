import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { COLORS } from "../constants/config";
import { useGameStore } from "../stores/gameStore";
import { getTradeRates, executeTrade } from "../systems/trading";
import type { TradeRate } from "../systems/trading";
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
        style={{ background: "#F5F0E3", border: `2px solid ${COLORS.barkBrown}` }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: COLORS.soilDark }}>Trading Post</DialogTitle>
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
                  selectedRate === rate ? `${COLORS.leafLight}33` : "rgba(255,255,255,0.5)",
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
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: COLORS.soilDark }}>
                x
              </span>
              <input
                type="range"
                min={1}
                max={Math.max(
                  1,
                  Math.floor((resources[selectedRate.from] ?? 0) / selectedRate.fromAmount),
                )}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="flex-1"
              />
              <span
                className="text-sm font-medium w-8 text-center"
                style={{ color: COLORS.soilDark }}
              >
                {quantity}
              </span>
            </div>
            <div className="text-xs" style={{ color: COLORS.soilDark }}>
              Pay: {quantity * selectedRate.fromAmount} {selectedRate.from} {"\u2192"} Get:{" "}
              {quantity * selectedRate.toAmount} {selectedRate.to}
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
