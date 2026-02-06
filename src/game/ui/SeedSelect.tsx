import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RiLock2Line } from "@remixicon/react";
import { COLORS } from "../constants/config";
import { TREE_SPECIES, type TreeSpeciesData } from "../constants/trees";
import { useGameStore } from "../stores/gameStore";

interface SeedSelectProps {
  open: boolean;
  onClose: () => void;
  onSelect: (speciesId: string) => void;
}

const difficultyColors: Record<number, string> = {
  1: COLORS.leafLight,
  2: COLORS.leafLight,
  3: COLORS.autumnGold,
  4: COLORS.sunsetWarm,
  5: COLORS.earthRed,
};

export const SeedSelect = ({ open, onClose, onSelect }: SeedSelectProps) => {
  const { unlockedSpecies, selectedSpecies, setSelectedSpecies } = useGameStore();

  const handleSelect = (species: TreeSpeciesData) => {
    if (!unlockedSpecies.includes(species.id)) return;
    setSelectedSpecies(species.id);
    onSelect(species.id);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-sm max-h-[80vh] overflow-y-auto"
        style={{ background: COLORS.skyMist }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: COLORS.soilDark }}>
            Select a Seed
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 mt-4">
          {TREE_SPECIES.map((species) => {
            const isUnlocked = unlockedSpecies.includes(species.id);
            const isSelected = selectedSpecies === species.id;

            return (
              <Card
                key={species.id}
                className={`p-3 cursor-pointer transition-all ${
                  isSelected ? "ring-2 ring-offset-2" : ""
                } ${!isUnlocked ? "opacity-50" : ""}`}
                style={{
                  background: isSelected ? `${COLORS.leafLight}30` : "white",
                  borderColor: isSelected ? COLORS.forestGreen : "transparent",
                }}
                onClick={() => handleSelect(species)}
              >
                {/* Tree preview */}
                <div
                  className="w-full h-16 rounded flex items-end justify-center mb-2"
                  style={{ background: `${COLORS.soilDark}20` }}
                >
                  {isUnlocked ? (
                    <div className="flex flex-col items-center">
                      <div
                        className="w-8 h-8 rounded-full"
                        style={{ background: species.meshParams.color.canopy }}
                      />
                      <div
                        className="w-2 h-4 -mt-1"
                        style={{ background: species.meshParams.color.trunk }}
                      />
                    </div>
                  ) : (
                    <RiLock2Line className="w-8 h-8 mb-2 text-gray-400" />
                  )}
                </div>

                <h3
                  className="font-bold text-sm"
                  style={{ color: COLORS.soilDark }}
                >
                  {species.name}
                </h3>

                <div className="flex items-center gap-2 mt-1">
                  <span
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{
                      background: difficultyColors[species.difficulty],
                      color: species.difficulty <= 2 ? COLORS.soilDark : "white",
                    }}
                  >
                    {"★".repeat(species.difficulty)}
                  </span>
                  <span className="text-xs text-gray-500">
                    Lv.{species.unlockLevel}
                  </span>
                </div>

                {isUnlocked && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                    {species.special}
                  </p>
                )}
              </Card>
            );
          })}
        </div>

        <Button
          variant="outline"
          className="mt-4 w-full"
          onClick={onClose}
          style={{ borderColor: COLORS.forestGreen, color: COLORS.forestGreen }}
        >
          Cancel
        </Button>
      </DialogContent>
    </Dialog>
  );
};
