import { useState } from "react";
import { COLORS } from "../constants/config";
import { useGameStore } from "../stores/gameStore";
import { HUD } from "./HUD";
import { Joystick } from "./Joystick";
import { PauseMenu } from "./PauseMenu";
import { SeedSelect } from "./SeedSelect";
import { ToolWheel } from "./ToolWheel";
import { StaminaGauge } from "./StaminaGauge";
import { ToolBelt } from "./ToolBelt";
import { WeatherOverlay } from "./WeatherOverlay";
import { MiniMap } from "./MiniMap";
import { BuildPanel } from "./BuildPanel";
import type { GameTime } from "../systems/time";
import { getCosmeticById } from "../systems/prestige";
import type { StructureTemplate } from "../structures/types";

interface GameUIProps {
  onMove: (x: number, z: number) => void;
  onMoveEnd: () => void;
  onAction: () => void;
  onPlant: () => void;
  onOpenMenu: () => void;
  onOpenTools: () => void;
  onPlaceStructure?: (template: StructureTemplate, worldX: number, worldZ: number) => void;
  seedSelectOpen: boolean;
  setSeedSelectOpen: (open: boolean) => void;
  toolWheelOpen: boolean;
  setToolWheelOpen: (open: boolean) => void;
  pauseMenuOpen: boolean;
  setPauseMenuOpen: (open: boolean) => void;
  onMainMenu: () => void;
  gameTime: GameTime | null;
}

export const GameUI = ({
  onMove,
  onMoveEnd,
  onAction,
  onPlant,
  onOpenMenu,
  onOpenTools,
  onPlaceStructure,
  seedSelectOpen,
  setSeedSelectOpen,
  toolWheelOpen,
  setToolWheelOpen,
  pauseMenuOpen,
  setPauseMenuOpen,
  onMainMenu,
  gameTime,
}: GameUIProps) => {
  const { activeQuests, addCoins, addXp, completeQuest, activeBorderCosmetic } = useGameStore();
  const [buildPanelOpen, setBuildPanelOpen] = useState(false);

  const _handleClaimReward = (questId: string) => {
    const quest = activeQuests.find(q => q.id === questId);
    if (quest?.completed) {
      addCoins(quest.rewards.coins);
      addXp(quest.rewards.xp);
      completeQuest(questId);
    }
  };

  // Prestige cosmetic border — applied as subtle screen vignette
  const cosmetic = activeBorderCosmetic ? getCosmeticById(activeBorderCosmetic) : null;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Prestige cosmetic vignette border */}
      {cosmetic && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            border: cosmetic.borderStyle,
            borderColor: cosmetic.borderColor,
            boxShadow: cosmetic.glowColor
              ? `inset 0 0 20px ${cosmetic.glowColor}`
              : undefined,
            zIndex: 50,
          }}
        />
      )}

      {/* Weather visual overlay (rain, drought, windstorm) */}
      <WeatherOverlay />

      {/* Top HUD bar */}
      <div
        className="absolute top-0 left-0 right-0 pointer-events-auto"
        style={{
          background: `linear-gradient(180deg, ${COLORS.soilDark} 0%, ${COLORS.soilDark}ee 70%, transparent 100%)`,
          paddingBottom: "env(safe-area-inset-top, 0px)",
        }}
      >
        <div className="pt-[env(safe-area-inset-top,0px)]">
          <HUD
            onPlant={onAction}
            onOpenMenu={onOpenMenu}
            onOpenTools={onOpenTools}
            onOpenBuild={() => setBuildPanelOpen(true)}
            gameTime={gameTime}
          />
        </div>
      </div>

      {/* Stamina gauge - right side */}
      <div className="absolute pointer-events-none" style={{ bottom: 180, right: 20 }}>
        <StaminaGauge />
      </div>

      {/* Tool belt - bottom right */}
      <div className="absolute pointer-events-auto" style={{ bottom: 140, right: 12 }}>
        <ToolBelt onSelectTool={(id) => useGameStore.getState().setSelectedTool(id)} />
      </div>

      {/* Bottom control area */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-auto"
        style={{
          background: `linear-gradient(0deg, ${COLORS.soilDark} 0%, ${COLORS.soilDark}ee 60%, transparent 100%)`,
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <BottomControls
          onMove={onMove}
          onMoveEnd={onMoveEnd}
          onAction={onAction}
        />
      </div>

      {/* Mini-map - desktop only, bottom-left */}
      <MiniMap />

      {/* Modals */}
      <div className="pointer-events-auto">
        <SeedSelect
          open={seedSelectOpen}
          onClose={() => setSeedSelectOpen(false)}
          onSelect={() => onPlant()}
        />
        <ToolWheel
          open={toolWheelOpen}
          onClose={() => setToolWheelOpen(false)}
        />
        <BuildPanel
          open={buildPanelOpen}
          onClose={() => setBuildPanelOpen(false)}
          onSelectStructure={(template) => {
            // For now, place at player position; full PlacementGhost integration is future work
            if (onPlaceStructure) {
              onPlaceStructure(template, 0, 0);
            }
          }}
        />
        <PauseMenu
          open={pauseMenuOpen}
          onClose={() => setPauseMenuOpen(false)}
          onMainMenu={onMainMenu}
        />
      </div>
    </div>
  );
};

// Bottom controls component with responsive joystick
const BottomControls = ({
  onMove,
  onMoveEnd,
  onAction,
}: {
  onMove: (x: number, z: number) => void;
  onMoveEnd: () => void;
  onAction: () => void;
}) => {
  const { selectedTool } = useGameStore();

  // Tool-specific action button appearance
  const getActionButtonStyle = () => {
    switch (selectedTool) {
      case "trowel":
        return { bg: COLORS.leafLight, icon: "🌱", label: "Plant" };
      case "watering-can":
        return { bg: "#64B5F6", icon: "💧", label: "Water" };
      case "axe":
        return { bg: COLORS.earthRed, icon: "🪓", label: "Harvest" };
      case "compost-bin":
        return { bg: COLORS.autumnGold, icon: "✨", label: "Fertilize" };
      case "pruning-shears":
        return { bg: COLORS.barkBrown, icon: "✂️", label: "Prune" };
      case "seed-pouch":
        return { bg: COLORS.forestGreen, icon: "🌰", label: "Seeds" };
      case "shovel":
        return { bg: COLORS.soilDark, icon: "⛏️", label: "Dig" };
      case "almanac":
        return { bg: COLORS.skyMist, icon: "📖", label: "Info" };
      default:
        return { bg: COLORS.leafLight, icon: "👆", label: "Action" };
    }
  };

  const actionStyle = getActionButtonStyle();

  return (
    <div className="relative h-32 sm:h-36 md:h-40 lg:h-44 flex items-center justify-between px-4 sm:px-6 md:px-8 lg:px-12">
      {/* Joystick area - left side */}
      <div className="relative flex-shrink-0">
        <Joystick onMove={onMove} onEnd={onMoveEnd} />
      </div>

      {/* Status text - center (hidden on mobile) */}
      <div className="hidden md:flex flex-col items-center gap-1">
        <span
          className="text-xs font-medium px-3 py-1 rounded-full capitalize"
          style={{
            background: `${COLORS.forestGreen}dd`,
            color: "white",
          }}
        >
          {selectedTool}
        </span>
      </div>

      {/* Action button - right side */}
      <div className="flex flex-col items-center gap-1 flex-shrink-0">
        <button
          className="w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 lg:w-24 lg:h-24 rounded-full flex items-center justify-center text-2xl sm:text-3xl lg:text-4xl shadow-lg active:scale-95 transition-transform touch-manipulation"
          style={{
            background: `linear-gradient(135deg, ${actionStyle.bg} 0%, ${actionStyle.bg}cc 100%)`,
            border: `3px solid ${COLORS.soilDark}`,
            boxShadow: `0 4px 12px ${actionStyle.bg}60, inset 0 2px 4px rgba(255,255,255,0.3)`,
          }}
          onClick={onAction}
        >
          {actionStyle.icon}
        </button>
        {/* Action label on mobile */}
        <span 
          className="text-[10px] font-medium md:hidden"
          style={{ color: "white" }}
        >
          {actionStyle.label}
        </span>
      </div>
    </div>
  );
};
