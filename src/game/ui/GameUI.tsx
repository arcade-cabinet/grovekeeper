import { useState } from "react";
import { COLORS } from "../constants/config";
import { getNpcTemplate } from "../npcs/NpcManager";
import { useGameStore } from "../stores/gameStore";
import type { StructureTemplate } from "../structures/types";
import { getCosmeticById } from "../systems/prestige";
import type { GameTime } from "../systems/time";
import type { WeatherType } from "../systems/weather";
import { getActionLabel, type TileState } from "./ActionButton";
import { BatchHarvestButton } from "./BatchHarvestButton";
import { BuildPanel } from "./BuildPanel";
import { HUD } from "./HUD";
import { MiniMap } from "./MiniMap";
import { NpcDialogue } from "./NpcDialogue";
import { PauseMenu } from "./PauseMenu";
import { SeedSelect } from "./SeedSelect";
import { StaminaGauge } from "./StaminaGauge";
import { ToolBelt } from "./ToolBelt";
import { ToolWheel } from "./ToolWheel";
import { TradeDialog } from "./TradeDialog";
import { WeatherForecast } from "./WeatherForecast";
import { WeatherOverlay } from "./WeatherOverlay";

interface GameUIProps {
  onAction: () => void;
  onPlant: () => void;
  onOpenMenu: () => void;
  onOpenTools: () => void;
  onPlaceStructure?: (
    template: StructureTemplate,
    worldX: number,
    worldZ: number,
  ) => void;
  onBatchHarvest?: () => void;
  currentWeather?: WeatherType;
  weatherTimeRemaining?: number;
  seedSelectOpen: boolean;
  setSeedSelectOpen: (open: boolean) => void;
  toolWheelOpen: boolean;
  setToolWheelOpen: (open: boolean) => void;
  pauseMenuOpen: boolean;
  setPauseMenuOpen: (open: boolean) => void;
  onMainMenu: () => void;
  gameTime: GameTime | null;
  playerTileInfo?: TileState | null;
  nearbyNpcTemplateId?: string | null;
  npcDialogueOpen?: boolean;
  setNpcDialogueOpen?: (open: boolean) => void;
}

export const GameUI = ({
  onAction,
  onPlant,
  onOpenMenu,
  onOpenTools,
  onBatchHarvest,
  currentWeather,
  weatherTimeRemaining,
  seedSelectOpen,
  setSeedSelectOpen,
  toolWheelOpen,
  setToolWheelOpen,
  pauseMenuOpen,
  setPauseMenuOpen,
  onMainMenu,
  gameTime,
  playerTileInfo,
  nearbyNpcTemplateId,
  npcDialogueOpen,
  setNpcDialogueOpen,
}: GameUIProps) => {
  const { activeBorderCosmetic } = useGameStore();
  const [buildPanelOpen, setBuildPanelOpen] = useState(false);
  const [tradeDialogOpen, setTradeDialogOpen] = useState(false);

  // Prestige cosmetic border — applied as subtle screen vignette
  const cosmetic = activeBorderCosmetic
    ? getCosmeticById(activeBorderCosmetic)
    : null;

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

      {/* Weather forecast widget - below top HUD */}
      {currentWeather && gameTime && (
        <div
          className="absolute pointer-events-auto"
          style={{ top: 64, right: 12 }}
        >
          <WeatherForecast
            currentWeather={currentWeather}
            weatherTimeRemaining={weatherTimeRemaining ?? 0}
            currentSeason={gameTime.season}
          />
        </div>
      )}

      {/* Tool belt - bottom right */}
      <div
        className="absolute pointer-events-auto"
        style={{ bottom: 140, right: 12 }}
      >
        <ToolBelt
          onSelectTool={(id) => useGameStore.getState().setSelectedTool(id)}
        />
      </div>

      {/* Batch harvest button - above tool belt, higher z-index */}
      {onBatchHarvest && (
        <div
          className="absolute pointer-events-auto"
          style={{ bottom: 240, right: 16, zIndex: 10 }}
        >
          <BatchHarvestButton onBatchHarvest={onBatchHarvest} />
        </div>
      )}

      {/* Stamina gauge - right side */}
      <div
        className="absolute pointer-events-none"
        style={{ bottom: 240, right: 20 }}
      >
        <StaminaGauge />
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
          onAction={onAction}
          tileState={playerTileInfo ?? null}
          nearbyNpcTemplateId={nearbyNpcTemplateId ?? null}
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
            useGameStore.getState().setBuildMode(true, template.id);
            setBuildPanelOpen(false);
          }}
        />
        <TradeDialog
          open={tradeDialogOpen}
          onClose={() => setTradeDialogOpen(false)}
        />
        {setNpcDialogueOpen && (
          <NpcDialogue
            open={npcDialogueOpen ?? false}
            onClose={() => setNpcDialogueOpen(false)}
            npcTemplateId={nearbyNpcTemplateId ?? null}
            onOpenTrade={() => setTradeDialogOpen(true)}
            onOpenSeeds={() => setSeedSelectOpen(true)}
          />
        )}
        <PauseMenu
          open={pauseMenuOpen}
          onClose={() => setPauseMenuOpen(false)}
          onMainMenu={onMainMenu}
        />
      </div>
    </div>
  );
};

// Bottom controls — action button + tool label (joystick removed)
const BottomControls = ({
  onAction,
  tileState,
  nearbyNpcTemplateId,
}: {
  onAction: () => void;
  tileState: TileState | null;
  nearbyNpcTemplateId: string | null;
}) => {
  const { selectedTool, buildMode } = useGameStore();

  // Tool-specific action button appearance
  const getActionButtonStyle = () => {
    // NPC interaction override
    if (nearbyNpcTemplateId) {
      const npcTemplate = getNpcTemplate(nearbyNpcTemplateId);
      return {
        bg: COLORS.autumnGold,
        icon: npcTemplate?.icon ?? "\u{1F4AC}",
        label: "Talk",
      };
    }
    if (buildMode) {
      return { bg: COLORS.barkBrown, icon: "\u{1F3D7}\uFE0F", label: "Build" };
    }
    switch (selectedTool) {
      case "trowel":
        return { bg: COLORS.leafLight, icon: "\u{1F331}", label: "Plant" };
      case "watering-can":
        return { bg: "#64B5F6", icon: "\u{1F4A7}", label: "Water" };
      case "axe":
        return { bg: COLORS.earthRed, icon: "\u{1FA93}", label: "Harvest" };
      case "compost-bin":
        return { bg: COLORS.autumnGold, icon: "\u2728", label: "Fertilize" };
      case "pruning-shears":
        return { bg: COLORS.barkBrown, icon: "\u2702\uFE0F", label: "Prune" };
      case "seed-pouch":
        return { bg: COLORS.forestGreen, icon: "\u{1F330}", label: "Seeds" };
      case "shovel":
        return { bg: COLORS.soilDark, icon: "\u26CF\uFE0F", label: "Dig" };
      case "almanac":
        return { bg: COLORS.skyMist, icon: "\u{1F4D6}", label: "Info" };
      case "rain-catcher":
        return { bg: "#64B5F6", icon: "\u{1F327}\uFE0F", label: "Catch" };
      case "fertilizer-spreader":
        return { bg: COLORS.autumnGold, icon: "\u{1F33E}", label: "Spread" };
      case "scarecrow":
        return { bg: COLORS.barkBrown, icon: "\u{1F383}", label: "Guard" };
      case "grafting-tool":
        return { bg: COLORS.forestGreen, icon: "\u{1F500}", label: "Graft" };
      default:
        return { bg: COLORS.leafLight, icon: "\u{1F446}", label: "Action" };
    }
  };

  const actionStyle = getActionButtonStyle();

  // Determine if the action is valid for the current tool + tile combo
  const actionEnabled =
    !!nearbyNpcTemplateId ||
    buildMode ||
    getActionLabel(selectedTool, tileState).enabled;

  return (
    <div className="relative h-24 sm:h-28 md:h-32 lg:h-36 flex items-center justify-end px-4 sm:px-6 md:px-8 lg:px-12">
      {/* Status text - center (hidden on mobile) */}
      <div className="hidden md:flex flex-col items-center gap-1 flex-1 justify-center">
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
          className="w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 lg:w-24 lg:h-24 rounded-full flex items-center justify-center text-2xl sm:text-3xl lg:text-4xl shadow-lg motion-safe:active:scale-95 motion-safe:transition-transform touch-manipulation"
          style={{
            background: actionEnabled
              ? `linear-gradient(135deg, ${actionStyle.bg} 0%, ${actionStyle.bg}cc 100%)`
              : `linear-gradient(135deg, #9E9E9E 0%, #757575 100%)`,
            border: `3px solid ${actionEnabled ? COLORS.soilDark : "#616161"}`,
            boxShadow: actionEnabled
              ? `0 4px 12px ${actionStyle.bg}60, inset 0 2px 4px rgba(255,255,255,0.3)`
              : "0 2px 4px rgba(0,0,0,0.15)",
            opacity: actionEnabled ? 1 : 0.55,
          }}
          disabled={!actionEnabled}
          onClick={actionEnabled ? onAction : undefined}
        >
          {actionStyle.icon}
        </button>
        {/* Action label on mobile */}
        <span
          className="text-xs font-medium md:hidden"
          style={{ color: actionEnabled ? "white" : "rgba(255,255,255,0.5)" }}
        >
          {actionStyle.label}
        </span>
      </div>
    </div>
  );
};
