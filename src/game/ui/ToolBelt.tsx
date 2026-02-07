import { TOOLS } from "../constants/tools";
import { useGameStore } from "../stores/gameStore";

const TOOL_EMOJIS: Record<string, string> = {
  trowel: "\u{1F528}",
  "watering-can": "\u{1FAA3}",
  almanac: "\u{1F4D6}",
  "pruning-shears": "\u{2702}\u{FE0F}",
  "seed-pouch": "\u{1F331}",
  shovel: "\u{26CF}\u{FE0F}",
  axe: "\u{1FA93}",
  "compost-bin": "\u{267B}\u{FE0F}",
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
        background: "rgba(245, 240, 227, 0.90)",
        border: "2px solid #5D4037",
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
              className="relative flex items-center justify-center rounded-lg transition-transform active:scale-95 touch-manipulation"
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
              onClick={() => isUnlocked && onSelectTool(tool.id)}
              disabled={!isUnlocked}
              title={`${tool.name}${!isUnlocked ? ` (Lv.${tool.unlockLevel})` : ""}`}
            >
              {TOOL_EMOJIS[tool.id] ?? "\u{1F527}"}
              {/* Keyboard shortcut badge - desktop only */}
              <span
                className="hidden md:flex absolute top-0 right-0 items-center justify-center text-[8px] font-bold rounded-full"
                style={{
                  width: 14,
                  height: 14,
                  background: "#5D4037",
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
            color: "#3E2723",
          }}
        >
          {"\u{1F331}"} {selectedSpecies} ({"\u{00D7}"}{seeds[selectedSpecies] ?? 0})
        </div>
      )}
    </div>
  );
};
