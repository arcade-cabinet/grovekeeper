import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { COLORS } from "../constants/config";
import { useGameStore } from "../stores/gameStore";
import { FarmerMascot } from "./FarmerMascot";

interface PauseMenuProps {
  open: boolean;
  onClose: () => void;
  onMainMenu: () => void;
}

export const PauseMenu = ({ open, onClose, onMainMenu }: PauseMenuProps) => {
  const { coins, xp, level, treesPlanted, treesMatured, unlockedSpecies, unlockedTools } =
    useGameStore();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-sm"
        style={{ background: COLORS.skyMist }}
      >
        <DialogHeader>
          <DialogTitle
            className="flex items-center gap-3"
            style={{ color: COLORS.soilDark }}
          >
            <FarmerMascot size={40} animate={false} />
            Grove Stats
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <Card className="p-4" style={{ background: "white" }}>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Level</p>
                <p className="text-xl font-bold" style={{ color: COLORS.forestGreen }}>
                  {level}
                </p>
              </div>
              <div>
                <p className="text-gray-500">XP</p>
                <p className="text-xl font-bold" style={{ color: COLORS.forestGreen }}>
                  {xp}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Coins</p>
                <p className="text-xl font-bold" style={{ color: COLORS.autumnGold }}>
                  {coins}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Trees Planted</p>
                <p className="text-xl font-bold" style={{ color: COLORS.leafLight }}>
                  {treesPlanted}
                </p>
              </div>
            </div>
          </Card>

          <div className="text-sm text-gray-600">
            <p>Species unlocked: {unlockedSpecies.length}/6</p>
            <p>Tools unlocked: {unlockedTools.length}/6</p>
          </div>

          <Separator />

          <div className="flex flex-col gap-2">
            <Button
              className="w-full"
              style={{ background: COLORS.forestGreen, color: "white" }}
              onClick={onClose}
            >
              Continue Playing
            </Button>
            <Button
              variant="outline"
              className="w-full"
              style={{ borderColor: COLORS.earthRed, color: COLORS.earthRed }}
              onClick={onMainMenu}
            >
              Return to Menu
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
