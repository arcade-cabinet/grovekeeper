import { For, Show } from "solid-js";
import { actions as gameActions } from "@/actions";
import { COLORS } from "@/config/config";
import { TREE_SPECIES, type TreeSpeciesData } from "@/config/trees";
import { useTrait } from "@/ecs/solid";
import { koota } from "@/koota";
import { PlayerProgress, Seeds } from "@/traits";
import { RiLock2Line } from "@/ui/icons";
import { Button } from "@/ui/primitives/button";
import { Card } from "@/ui/primitives/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/ui/primitives/dialog";

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

export const SeedSelect = (props: SeedSelectProps) => {
  const progress = useTrait(koota, PlayerProgress);
  const unlockedSpecies = () => progress()?.unlockedSpecies ?? ["white-oak"];
  const selectedSpecies = () => progress()?.selectedSpecies ?? "white-oak";
  const seedsAccessor = useTrait(koota, Seeds);
  const seeds = () => seedsAccessor() ?? {};

  const handleSelect = (species: TreeSpeciesData) => {
    if (!unlockedSpecies().includes(species.id)) return;
    const seedCount = seeds()[species.id] ?? 0;
    if (seedCount <= 0) return;
    gameActions().setSelectedSpecies(species.id);
    props.onSelect(species.id);
    props.onClose();
  };

  return (
    <Dialog open={props.open} onOpenChange={(o) => !o && props.onClose()}>
      <DialogContent
        class="max-w-sm max-h-[80vh] overflow-y-auto"
        style={{
          background: COLORS.skyMist,
          border: `3px solid ${COLORS.forestGreen}40`,
          "border-radius": "16px",
          "box-shadow": "0 8px 32px rgba(0,0,0,0.12)",
        }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: COLORS.soilDark }}>
            Select a Seed
          </DialogTitle>
        </DialogHeader>

        <div class="grid grid-cols-2 gap-3 mt-4">
          <For each={TREE_SPECIES}>
            {(species) => {
              const isUnlocked = () => unlockedSpecies().includes(species.id);
              const isSelected = () => selectedSpecies() === species.id;
              const seedCount = () => seeds()[species.id] ?? 0;
              const hasSeeds = () => seedCount() > 0;
              const isDisabled = () => !isUnlocked() || !hasSeeds();
              const costStr = formatSeedCost(species.seedCost);

              return (
                <Card
                  role="button"
                  tabIndex={isDisabled() ? -1 : 0}
                  aria-pressed={isSelected()}
                  aria-disabled={isDisabled()}
                  aria-label={`${species.name}${isSelected() ? " (selected)" : ""}${!isUnlocked() ? ` — unlocks at level ${species.unlockLevel}` : !hasSeeds() ? " — no seeds" : ""}`}
                  class={`p-3 cursor-pointer transition-all ${isSelected() ? "ring-2 ring-offset-2" : ""} ${isDisabled() ? "opacity-50" : ""}`}
                  style={{
                    background: isSelected()
                      ? `${COLORS.leafLight}30`
                      : "white",
                    "border-color": isSelected()
                      ? COLORS.forestGreen
                      : "transparent",
                    cursor: isDisabled() ? "default" : "pointer",
                  }}
                  onClick={() => handleSelect(species)}
                >
                  <div
                    class="relative w-full h-16 rounded flex items-end justify-center mb-2"
                    style={{ background: `${COLORS.soilDark}20` }}
                  >
                    <Show
                      when={isUnlocked()}
                      fallback={
                        <RiLock2Line
                          class="w-8 h-8 mb-2 text-gray-400"
                          aria-hidden="true"
                        />
                      }
                    >
                      <svg
                        width="36"
                        height="48"
                        viewBox="0 0 36 48"
                        fill="none"
                        aria-hidden="true"
                        class="mb-1"
                      >
                        <rect
                          x="15"
                          y="28"
                          width="6"
                          height="16"
                          rx="1.5"
                          fill={species.meshParams.color.trunk}
                        />
                        <ellipse
                          cx="18"
                          cy="22"
                          rx="14"
                          ry="12"
                          fill={species.meshParams.color.canopy}
                        />
                        <ellipse
                          cx="18"
                          cy="16"
                          rx="10"
                          ry="10"
                          fill={species.meshParams.color.canopy}
                          opacity="0.7"
                        />
                        <ellipse
                          cx="14"
                          cy="16"
                          rx="4"
                          ry="3"
                          fill="white"
                          opacity="0.15"
                        />
                      </svg>
                    </Show>

                    <Show when={isUnlocked()}>
                      <div
                        class="absolute top-1 right-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                        style={{
                          background: hasSeeds()
                            ? COLORS.forestGreen
                            : COLORS.earthRed,
                          color: "white",
                          "min-width": "20px",
                          "text-align": "center",
                        }}
                      >
                        x{seedCount()}
                      </div>
                    </Show>
                  </div>

                  <h3
                    class="font-bold text-sm"
                    style={{ color: COLORS.soilDark }}
                  >
                    {species.name}
                  </h3>

                  <div class="flex items-center gap-2 mt-1">
                    <span
                      class="text-xs px-1.5 py-0.5 rounded"
                      style={{
                        background: difficultyColors[species.difficulty],
                        color:
                          species.difficulty <= 2 ? COLORS.soilDark : "white",
                      }}
                    >
                      {"*".repeat(species.difficulty)}
                    </span>
                    <span class="text-xs text-gray-500">
                      Lv.{species.unlockLevel}
                    </span>
                  </div>

                  <Show when={isUnlocked() && costStr}>
                    <p
                      class="text-[10px] mt-1"
                      style={{ color: COLORS.earthRed }}
                    >
                      Cost: {costStr}
                    </p>
                  </Show>
                  <Show when={isUnlocked() && !costStr}>
                    <p
                      class="text-[10px] mt-1"
                      style={{ color: COLORS.leafLight }}
                    >
                      Free
                    </p>
                  </Show>

                  <Show when={isUnlocked()}>
                    <p class="text-xs text-gray-500 mt-1 line-clamp-2">
                      {species.special}
                    </p>
                  </Show>
                </Card>
              );
            }}
          </For>
        </div>

        <Button
          variant="outline"
          class="mt-4 w-full"
          onClick={props.onClose}
          style={{
            "border-color": COLORS.forestGreen,
            color: COLORS.forestGreen,
          }}
        >
          Cancel
        </Button>
      </DialogContent>
    </Dialog>
  );
};
