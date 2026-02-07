import { RiLock2Line } from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

/**
 * Format a seed cost record as a compact display string.
 * e.g. { sap: 5 } -> "5 Sap"
 * e.g. { timber: 10, sap: 10, fruit: 10 } -> "10 Timber, 10 Sap, 10 Fruit"
 * Returns null for free seeds (empty cost).
 */
function formatSeedCost(cost: Record<string, number>): string | null {
  const entries = Object.entries(cost).filter(([, amount]) => amount > 0);
  if (entries.length === 0) return null;
  return entries
    .map(
      ([resource, amount]) =>
        `${amount} ${resource.charAt(0).toUpperCase() + resource.slice(1)}`,
    )
    .join(", ");
}

export const SeedSelect = ({ open, onClose, onSelect }: SeedSelectProps) => {
  const { unlockedSpecies, selectedSpecies, setSelectedSpecies, seeds } =
    useGameStore();

  const handleSelect = (species: TreeSpeciesData) => {
    if (!unlockedSpecies.includes(species.id)) return;
    const seedCount = seeds[species.id] ?? 0;
    if (seedCount <= 0) return;
    setSelectedSpecies(species.id);
    onSelect(species.id);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-sm max-h-[80vh] overflow-y-auto"
        style={{ background: COLORS.skyMist }}
        aria-describedby={undefined}
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
            const seedCount = seeds[species.id] ?? 0;
            const hasSeeds = seedCount > 0;
            const isDisabled = !isUnlocked || !hasSeeds;
            const costStr = formatSeedCost(species.seedCost);

            return (
              <Card
                key={species.id}
                className={`p-3 cursor-pointer transition-all ${
                  isSelected ? "ring-2 ring-offset-2" : ""
                } ${isDisabled ? "opacity-50" : ""}`}
                style={{
                  background: isSelected ? `${COLORS.leafLight}30` : "white",
                  borderColor: isSelected ? COLORS.forestGreen : "transparent",
                  cursor: isDisabled ? "default" : "pointer",
                }}
                onClick={() => handleSelect(species)}
              >
                {/* Tree preview */}
                <div
                  className="relative w-full h-16 rounded flex items-end justify-center mb-2"
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

                  {/* Seed count badge — top-right corner */}
                  {isUnlocked && (
                    <div
                      className="absolute top-1 right-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                      style={{
                        background: hasSeeds
                          ? COLORS.forestGreen
                          : COLORS.earthRed,
                        color: "white",
                        minWidth: 20,
                        textAlign: "center",
                      }}
                    >
                      x{seedCount}
                    </div>
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
                      color:
                        species.difficulty <= 2 ? COLORS.soilDark : "white",
                    }}
                  >
                    {"*".repeat(species.difficulty)}
                  </span>
                  <span className="text-xs text-gray-500">
                    Lv.{species.unlockLevel}
                  </span>
                </div>

                {/* Seed cost */}
                {isUnlocked && costStr && (
                  <p
                    className="text-[10px] mt-1"
                    style={{ color: COLORS.earthRed }}
                  >
                    Cost: {costStr}
                  </p>
                )}
                {isUnlocked && !costStr && (
                  <p
                    className="text-[10px] mt-1"
                    style={{ color: COLORS.leafLight }}
                  >
                    Free
                  </p>
                )}

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
          style={{
            borderColor: COLORS.forestGreen,
            color: COLORS.forestGreen,
          }}
        >
          Cancel
        </Button>
      </DialogContent>
    </Dialog>
  );
};
