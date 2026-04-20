import type { JSX } from "solid-js";
import { For, Show } from "solid-js";
import { COLORS } from "@/config/config";
import { TOOLS } from "@/config/tools";
import { useTrait } from "@/ecs/solid";
import { koota } from "@/koota";
import { PlayerProgress, Seeds } from "@/traits";
import {
  RiBookOpenLine,
  RiDropLine,
  RiHammerLine,
  RiPlantLine,
  RiRecycleLine,
  RiScissorsLine,
  RiSeedlingLine,
  RiToolsLine,
} from "@/ui/icons";

const TOOL_ICONS: Record<string, () => JSX.Element> = {
  trowel: () => <RiPlantLine class="w-5 h-5" />,
  "watering-can": () => <RiDropLine class="w-5 h-5" />,
  almanac: () => <RiBookOpenLine class="w-5 h-5" />,
  "pruning-shears": () => <RiScissorsLine class="w-5 h-5" />,
  "seed-pouch": () => <RiSeedlingLine class="w-5 h-5" />,
  shovel: () => <RiToolsLine class="w-5 h-5" />,
  axe: () => <RiHammerLine class="w-5 h-5" />,
  "compost-bin": () => <RiRecycleLine class="w-5 h-5" />,
};

interface ToolBeltProps {
  onSelectTool: (toolId: string) => void;
}

export const ToolBelt = (props: ToolBeltProps) => {
  const progress = useTrait(koota, PlayerProgress);
  const selectedTool = () => progress()?.selectedTool ?? "trowel";
  const unlockedTools = () =>
    progress()?.unlockedTools ?? ["trowel", "watering-can"];
  const level = () => progress()?.level ?? 1;
  const selectedSpecies = () => progress()?.selectedSpecies ?? "white-oak";
  const seedsAccessor = useTrait(koota, Seeds);
  const seeds = () => seedsAccessor() ?? {};

  return (
    <div
      class="flex flex-col gap-1 p-1.5 rounded-xl"
      style={{
        background: `${COLORS.parchment}e6`,
        border: `2px solid ${COLORS.barkBrown}`,
        "box-shadow": "0 4px 12px rgba(26, 58, 42, 0.15)",
      }}
    >
      <div class="grid grid-cols-4 gap-1">
        <For each={TOOLS}>
          {(tool, index) => {
            const isUnlocked = () => unlockedTools().includes(tool.id);
            const isActive = () => selectedTool() === tool.id;
            const canUnlock = () => level() >= tool.unlockLevel;
            const keyNumber = index() + 1;
            return (
              <button
                type="button"
                data-tutorial-id={`tool-${tool.id}`}
                class="relative flex items-center justify-center rounded-lg motion-safe:transition-transform motion-safe:active:scale-95 touch-manipulation"
                style={{
                  width: "44px",
                  height: "44px",
                  "font-size": "1.25rem",
                  background: isActive()
                    ? "rgba(255, 193, 7, 0.3)"
                    : "rgba(255, 255, 255, 0.5)",
                  border: isActive()
                    ? "2px solid #FFC107"
                    : "2px solid transparent",
                  opacity: isUnlocked() ? 1 : canUnlock() ? 0.6 : 0.3,
                  transform: isActive() ? "scale(1.08)" : "scale(1)",
                  filter: isUnlocked() ? "none" : "grayscale(100%)",
                  "pointer-events": isUnlocked() ? "auto" : "none",
                }}
                onClick={() => props.onSelectTool(tool.id)}
                disabled={!isUnlocked()}
                title={`${tool.name}${!isUnlocked() ? ` (Lv.${tool.unlockLevel})` : ""}`}
                aria-label={`${tool.name}${!isUnlocked() ? ` (unlocks at level ${tool.unlockLevel})` : isActive() ? " (selected)" : ""}`}
                aria-pressed={isActive()}
              >
                <span aria-hidden="true">{(TOOL_ICONS[tool.id] ?? (() => <RiToolsLine class="w-5 h-5" />))()}</span>
                <span
                  class="hidden md:flex absolute top-0 right-0 items-center justify-center text-[8px] font-bold rounded-full"
                  style={{
                    width: "14px",
                    height: "14px",
                    background: COLORS.barkBrown,
                    color: "white",
                    transform: "translate(25%, -25%)",
                  }}
                >
                  {keyNumber}
                </span>
              </button>
            );
          }}
        </For>
      </div>

      <Show when={selectedTool() === "trowel"}>
        <div
          class="text-[10px] font-bold text-center px-1 py-0.5 rounded"
          style={{
            background: "rgba(74, 124, 89, 0.2)",
            color: COLORS.soilDark,
          }}
        >
          <RiSeedlingLine class="w-3 h-3 inline" aria-hidden="true" /> {selectedSpecies()} (
          {"\u{00D7}"}
          {seeds()[selectedSpecies()] ?? 0})
        </div>
      </Show>
    </div>
  );
};
