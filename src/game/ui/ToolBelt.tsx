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
import { COLORS } from "../constants/config";
import { TOOLS } from "../constants/tools";
import { useGameStore } from "../stores/gameStore";

const TOOL_ICONS: Record<string, React.ReactNode> = {
  trowel: <RiPlantLine className="w-5 h-5" />,
  "watering-can": <RiDropLine className="w-5 h-5" />,
  almanac: <RiBookOpenLine className="w-5 h-5" />,
  "pruning-shears": <RiScissorsLine className="w-5 h-5" />,
  "seed-pouch": <RiSeedlingLine className="w-5 h-5" />,
  shovel: <RiToolsLine className="w-5 h-5" />,
  axe: <RiHammerLine className="w-5 h-5" />,
  "compost-bin": <RiRecycleLine className="w-5 h-5" />,
};

interface ToolBeltProps {
  onSelectTool: (toolId: string) => void;
}

export const ToolBelt = ({ onSelectTool }: ToolBeltProps) => {
  const selectedTool = useGameStore((s) => s.selectedTool);
  const unlockedTools = useGameStore((s) => s.unlockedTools);
  const level = useGameStore((s) => s.level);
  const seeds = useGameStore((s) => s.seeds);
  const selectedSpecies = useGameStore((s) => s.selectedSpecies);

  return (
    <div
      className="flex flex-col gap-1 p-1.5 rounded-xl"
      style={{
        background: `${COLORS.parchment}e6`,
        border: `2px solid ${COLORS.barkBrown}`,
        boxShadow: "0 4px 12px rgba(26, 58, 42, 0.15)",
      }}
    >
      {/* 2x4 grid of tools */}
      <div className="grid grid-cols-4 gap-1">
        {TOOLS.map((tool, index) => {
          const isUnlocked = unlockedTools.includes(tool.id);
          const isActive = selectedTool === tool.id;
          const canUnlock = level >= tool.unlockLevel;
          const keyNumber = index + 1;

          return (
            <button
              key={tool.id}
              type="button"
              className="relative flex items-center justify-center rounded-lg motion-safe:transition-transform motion-safe:active:scale-95 touch-manipulation"
              style={{
                width: 44,
                height: 44,
                fontSize: "1.25rem",
                background: isActive
                  ? "rgba(255, 193, 7, 0.3)"
                  : "rgba(255, 255, 255, 0.5)",
                border: isActive
                  ? "2px solid #FFC107"
                  : "2px solid transparent",
                opacity: isUnlocked ? 1 : canUnlock ? 0.6 : 0.3,
                transform: isActive ? "scale(1.08)" : "scale(1)",
                filter: isUnlocked ? "none" : "grayscale(100%)",
                pointerEvents: isUnlocked ? "auto" : "none",
              }}
              onClick={() => onSelectTool(tool.id)}
              disabled={!isUnlocked}
              title={`${tool.name}${!isUnlocked ? ` (Lv.${tool.unlockLevel})` : ""}`}
            >
              {TOOL_ICONS[tool.id] ?? <RiToolsLine className="w-5 h-5" />}
              {/* Keyboard shortcut badge - desktop only */}
              <span
                className="hidden md:flex absolute top-0 right-0 items-center justify-center text-[8px] font-bold rounded-full"
                style={{
                  width: 14,
                  height: 14,
                  background: COLORS.barkBrown,
                  color: "white",
                  transform: "translate(25%, -25%)",
                }}
              >
                {keyNumber}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active seed display when trowel selected */}
      {selectedTool === "trowel" && (
        <div
          className="text-[10px] font-bold text-center px-1 py-0.5 rounded"
          style={{
            background: "rgba(74, 124, 89, 0.2)",
            color: COLORS.soilDark,
          }}
        >
          <RiSeedlingLine className="w-3 h-3 inline" /> {selectedSpecies} ({"\u{00D7}"}
          {seeds[selectedSpecies] ?? 0})
        </div>
      )}
    </div>
  );
};
