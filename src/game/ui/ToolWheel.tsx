import {
  RiBookOpenLine,
  RiDropLine,
  RiHammerLine,
  RiPlantLine,
  RiRecycleLine,
  RiScissorsLine,
  RiSeedlingLine,
  RiToolsLine,
} from "@remixicon/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { COLORS } from "../constants/config";
import { TOOLS, type ToolData } from "../constants/tools";
import { useGameStore } from "../stores/gameStore";

interface ToolWheelProps {
  open: boolean;
  onClose: () => void;
}

const toolIcons: Record<string, React.ReactNode> = {
  trowel: <RiPlantLine className="w-6 h-6" />,
  "watering-can": <RiDropLine className="w-6 h-6" />,
  almanac: <RiBookOpenLine className="w-6 h-6" />,
  "pruning-shears": <RiScissorsLine className="w-6 h-6" />,
  "seed-pouch": <RiSeedlingLine className="w-6 h-6" />,
  shovel: <RiToolsLine className="w-6 h-6" />,
  axe: <RiHammerLine className="w-6 h-6" />,
  "compost-bin": <RiRecycleLine className="w-6 h-6" />,
};

export const ToolWheel = ({ open, onClose }: ToolWheelProps) => {
  const { unlockedTools, selectedTool, setSelectedTool, level, unlockTool } =
    useGameStore();

  const handleSelectTool = (tool: ToolData) => {
    if (unlockedTools.includes(tool.id)) {
      setSelectedTool(tool.id);
      onClose();
    } else if (level >= tool.unlockLevel) {
      unlockTool(tool.id);
      setSelectedTool(tool.id);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-xs"
        style={{
          background: COLORS.skyMist,
          border: `3px solid ${COLORS.forestGreen}40`,
          borderRadius: 16,
          boxShadow: `0 8px 32px rgba(0,0,0,0.12)`,
        }}
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle style={{ color: COLORS.soilDark }}>Tools</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 mt-2">
          {TOOLS.map((tool) => {
            const isUnlocked = unlockedTools.includes(tool.id);
            const isSelected = selectedTool === tool.id;
            const canUnlock = level >= tool.unlockLevel;

            return (
              <Button
                key={tool.id}
                variant="outline"
                className={`flex flex-col h-20 p-2 ${isSelected ? "ring-2" : ""}`}
                style={{
                  background: isSelected
                    ? `${COLORS.leafLight}40`
                    : isUnlocked
                      ? "white"
                      : `${COLORS.soilDark}20`,
                  borderColor: isSelected ? COLORS.forestGreen : "transparent",
                  opacity: isUnlocked || canUnlock ? 1 : 0.5,
                }}
                onClick={() => handleSelectTool(tool)}
                disabled={!isUnlocked && !canUnlock}
              >
                <div
                  style={{
                    color: isUnlocked ? COLORS.forestGreen : COLORS.barkBrown,
                  }}
                >
                  {toolIcons[tool.id] || <RiToolsLine className="w-6 h-6" />}
                </div>
                <span
                  className="text-xs mt-1"
                  style={{ color: COLORS.soilDark }}
                >
                  {tool.name}
                </span>
                {!isUnlocked && (
                  <span
                    className="text-xs"
                    style={{ color: COLORS.autumnGold }}
                  >
                    Lv.{tool.unlockLevel}
                  </span>
                )}
              </Button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};
