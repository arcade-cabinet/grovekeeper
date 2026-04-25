import type { JSX } from "solid-js";
import { For, Show } from "solid-js";
import { actions as gameActions } from "@/actions";
import { COLORS } from "@/config/config";
import { TOOLS, type ToolData } from "@/config/tools";
import { useTrait } from "@/ecs/solid";
import { koota } from "@/koota";
import { PlayerProgress } from "@/traits";
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
import { Button } from "@/ui/primitives/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/ui/primitives/dialog";

interface ToolWheelProps {
  open: boolean;
  onClose: () => void;
}

const toolIcons: Record<string, () => JSX.Element> = {
  trowel: () => <RiPlantLine class="w-6 h-6" />,
  "watering-can": () => <RiDropLine class="w-6 h-6" />,
  almanac: () => <RiBookOpenLine class="w-6 h-6" />,
  "pruning-shears": () => <RiScissorsLine class="w-6 h-6" />,
  "seed-pouch": () => <RiSeedlingLine class="w-6 h-6" />,
  shovel: () => <RiToolsLine class="w-6 h-6" />,
  axe: () => <RiHammerLine class="w-6 h-6" />,
  "compost-bin": () => <RiRecycleLine class="w-6 h-6" />,
};

export const ToolWheel = (props: ToolWheelProps) => {
  const progress = useTrait(koota, PlayerProgress);
  const unlockedTools = () =>
    progress()?.unlockedTools ?? ["trowel", "watering-can"];
  const selectedTool = () => progress()?.selectedTool ?? "trowel";
  const level = () => progress()?.level ?? 1;

  const handleSelectTool = (tool: ToolData) => {
    const a = gameActions();
    if (unlockedTools().includes(tool.id)) {
      a.setSelectedTool(tool.id);
      props.onClose();
    } else if (level() >= tool.unlockLevel) {
      a.unlockTool(tool.id);
      a.setSelectedTool(tool.id);
      props.onClose();
    }
  };

  return (
    <Dialog open={props.open} onOpenChange={(o) => !o && props.onClose()}>
      <DialogContent
        class="max-w-xs"
        style={{
          background: COLORS.skyMist,
          border: `3px solid ${COLORS.forestGreen}40`,
          "border-radius": "16px",
          "box-shadow": "0 8px 32px rgba(0,0,0,0.12)",
        }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: COLORS.soilDark }}>Tools</DialogTitle>
        </DialogHeader>

        <div class="grid grid-cols-3 gap-3 mt-2">
          <For each={TOOLS}>
            {(tool) => {
              const isUnlocked = () => unlockedTools().includes(tool.id);
              const isSelected = () => selectedTool() === tool.id;
              const canUnlock = () => level() >= tool.unlockLevel;
              return (
                <Button
                  variant="outline"
                  class={`flex flex-col h-20 p-2 ${isSelected() ? "ring-2" : ""}`}
                  style={{
                    background: isSelected()
                      ? `${COLORS.leafLight}40`
                      : isUnlocked()
                        ? "white"
                        : `${COLORS.soilDark}20`,
                    "border-color": isSelected()
                      ? COLORS.forestGreen
                      : "transparent",
                    opacity: isUnlocked() || canUnlock() ? 1 : 0.5,
                  }}
                  onClick={() => handleSelectTool(tool)}
                  disabled={!isUnlocked() && !canUnlock()}
                >
                  <div
                    aria-hidden="true"
                    style={{
                      color: isUnlocked()
                        ? COLORS.forestGreen
                        : COLORS.barkBrown,
                    }}
                  >
                    {(
                      toolIcons[tool.id] ??
                      (() => <RiToolsLine class="w-6 h-6" />)
                    )()}
                  </div>
                  <span class="text-xs mt-1" style={{ color: COLORS.soilDark }}>
                    {tool.name}
                  </span>
                  <Show when={!isUnlocked()}>
                    <span class="text-xs" style={{ color: COLORS.autumnGold }}>
                      Lv.{tool.unlockLevel}
                    </span>
                  </Show>
                </Button>
              );
            }}
          </For>
        </div>
      </DialogContent>
    </Dialog>
  );
};
