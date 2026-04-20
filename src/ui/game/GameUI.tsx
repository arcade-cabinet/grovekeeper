import { createSignal, Show } from "solid-js";
import { actions as gameActions } from "@/actions";
import { COLORS } from "@/config/config";
import { useTrait } from "@/ecs/solid";
import { koota } from "@/koota";
import { getNpcTemplate } from "@/npcs/NpcManager";
import type { StructureTemplate } from "@/structures/types";
import { getCosmeticById } from "@/systems/prestige";
import type { GameTime } from "@/systems/time";
import type { WeatherType } from "@/systems/weather";
import { Build, PlayerProgress } from "@/traits";
import { getActionLabel, type TileState } from "./ActionButton";
import { BatchHarvestButton } from "./BatchHarvestButton";
import { BuildPanel } from "./BuildPanel";
import { HUD } from "./HUD";
import { MiniMap } from "./MiniMap";
import { MobileActionButtons } from "./MobileActionButtons";
import { NpcDialogue } from "./NpcDialogue";
import { PauseMenu } from "./PauseMenu";
import { RadialActionMenu } from "./RadialActionMenu";
import type { RadialAction } from "./radialActions";
import { SeedSelect } from "./SeedSelect";
import { LowStaminaOverlay, StaminaGauge } from "./StaminaGauge";
import { ToolBelt } from "./ToolBelt";
import { ToolWheel } from "./ToolWheel";
import { TradeDialog } from "./TradeDialog";
import { TutorialOverlay } from "./TutorialOverlay";
import { VirtualJoystick } from "./VirtualJoystick";
import { WeatherForecast } from "./WeatherForecast";
import { WeatherOverlay } from "./WeatherOverlay";

type Ref<T> = { current: T };

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
  radialActions?: RadialAction[];
  radialScreenPos?: { x: number; y: number } | null;
  onRadialAction?: (actionId: string) => void;
  onDismissRadial?: () => void;
  movementRef?: Ref<{ x: number; z: number } | null>;
  onJoystickActiveChange?: (active: boolean) => void;
  tutorialDialogueId?: string | null;
  onTutorialDialogueAction?: (actionType: string) => void;
  tutorialHighlightId?: string | null;
  tutorialHighlightLabel?: string | null;
}

export const GameUI = (props: GameUIProps) => {
  const progress = useTrait(koota, PlayerProgress);
  const activeBorderCosmetic = () => progress()?.activeBorderCosmetic ?? null;
  const [buildPanelOpen, setBuildPanelOpen] = createSignal(false);
  const [tradeDialogOpen, setTradeDialogOpen] = createSignal(false);

  // Prestige cosmetic border — applied as subtle screen vignette
  const cosmetic = () => {
    const id = activeBorderCosmetic();
    return id ? getCosmeticById(id) : null;
  };

  return (
    <div class="absolute inset-0 pointer-events-none">
      {/* Prestige cosmetic vignette border */}
      <Show when={cosmetic()}>
        {(c) => (
          <div
            class="absolute inset-0 pointer-events-none"
            style={{
              border: c().borderStyle,
              "border-color": c().borderColor,
              "box-shadow": c().glowColor
                ? `inset 0 0 20px ${c().glowColor}`
                : undefined,
              "z-index": 50,
            }}
          />
        )}
      </Show>

      {/* Weather visual overlay (rain, drought, windstorm) */}
      <WeatherOverlay />

      {/* Top HUD bar */}
      <div
        class="absolute top-0 left-0 right-0 pointer-events-auto"
        style={{
          background: `linear-gradient(180deg, ${COLORS.soilDark} 0%, ${COLORS.soilDark}ee 70%, transparent 100%)`,
          "padding-bottom": "env(safe-area-inset-top, 0px)",
        }}
      >
        <div class="pt-[env(safe-area-inset-top,0px)]">
          <HUD
            onPlant={props.onAction}
            onOpenMenu={props.onOpenMenu}
            onOpenTools={props.onOpenTools}
            onOpenBuild={() => setBuildPanelOpen(true)}
            gameTime={props.gameTime}
          />
        </div>
      </div>

      {/* Weather forecast widget - below top HUD */}
      <Show when={props.currentWeather && props.gameTime}>
        <div
          class="absolute pointer-events-auto"
          style={{ top: "64px", right: "12px" }}
        >
          <WeatherForecast
            currentWeather={props.currentWeather as WeatherType}
            weatherTimeRemaining={props.weatherTimeRemaining ?? 0}
            currentSeason={(props.gameTime as GameTime).season}
          />
        </div>
      </Show>

      {/* Tool belt - bottom right */}
      <div
        class="absolute pointer-events-auto"
        style={{ bottom: "140px", right: "12px" }}
      >
        <ToolBelt
          onSelectTool={(id) => gameActions().setSelectedTool(id)}
        />
      </div>

      {/* Batch harvest button - above tool belt, higher z-index */}
      <Show when={props.onBatchHarvest}>
        <div
          class="absolute pointer-events-auto"
          style={{ bottom: "240px", right: "16px", "z-index": 10 }}
        >
          <BatchHarvestButton
            onBatchHarvest={props.onBatchHarvest as () => void}
          />
        </div>
      </Show>

      {/* Stamina gauge - right side */}
      <div
        class="absolute pointer-events-none"
        style={{ bottom: "240px", right: "20px" }}
      >
        <StaminaGauge />
      </div>

      {/* Screen-edge vignette when stamina is low */}
      <LowStaminaOverlay />

      {/* Bottom control area — desktop only */}
      <div
        class="absolute bottom-0 left-0 right-0 pointer-events-auto hidden md:block"
        style={{
          background: `linear-gradient(0deg, ${COLORS.soilDark} 0%, ${COLORS.soilDark}ee 60%, transparent 100%)`,
          "padding-bottom": "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <BottomControls
          onAction={props.onAction}
          tileState={props.playerTileInfo ?? null}
          nearbyNpcTemplateId={props.nearbyNpcTemplateId ?? null}
        />
      </div>

      {/* Mobile controls — joystick (left) + action buttons (right) */}
      <Show when={props.movementRef}>
        <VirtualJoystick
          movementRef={
            props.movementRef as Ref<{ x: number; z: number } | null>
          }
          onActiveChange={props.onJoystickActiveChange}
        />
      </Show>
      <MobileActionButtons
        onAction={props.onAction}
        onOpenSeeds={() => props.setSeedSelectOpen(true)}
        onPause={() => props.setPauseMenuOpen(true)}
        tileState={props.playerTileInfo ?? null}
        nearbyNpcTemplateId={props.nearbyNpcTemplateId ?? null}
      />

      {/* Mini-map - desktop only, bottom-left */}
      <MiniMap />

      {/* Radial action menu - shown when tapping ground/objects */}
      <Show
        when={
          props.radialActions &&
          props.radialActions.length > 0 &&
          props.radialScreenPos &&
          props.onRadialAction &&
          props.onDismissRadial
        }
      >
        <div class="pointer-events-auto">
          <RadialActionMenu
            centerX={(props.radialScreenPos as { x: number; y: number }).x}
            centerY={(props.radialScreenPos as { x: number; y: number }).y}
            actions={props.radialActions as RadialAction[]}
            onSelect={props.onRadialAction as (actionId: string) => void}
            onDismiss={props.onDismissRadial as () => void}
          />
        </div>
      </Show>

      {/* Modals */}
      <div class="pointer-events-auto">
        <SeedSelect
          open={props.seedSelectOpen}
          onClose={() => props.setSeedSelectOpen(false)}
          onSelect={() => props.onPlant()}
        />
        <ToolWheel
          open={props.toolWheelOpen}
          onClose={() => props.setToolWheelOpen(false)}
        />
        <BuildPanel
          open={buildPanelOpen()}
          onClose={() => setBuildPanelOpen(false)}
          onSelectStructure={(template) => {
            gameActions().setBuildMode(true, template.id);
            setBuildPanelOpen(false);
          }}
        />
        <TradeDialog
          open={tradeDialogOpen()}
          onClose={() => setTradeDialogOpen(false)}
        />
        <Show when={props.setNpcDialogueOpen}>
          <NpcDialogue
            open={props.npcDialogueOpen ?? false}
            onClose={() =>
              (props.setNpcDialogueOpen as (open: boolean) => void)(false)
            }
            npcTemplateId={props.nearbyNpcTemplateId ?? null}
            onOpenTrade={() => setTradeDialogOpen(true)}
            onOpenSeeds={() => props.setSeedSelectOpen(true)}
            overrideDialogueId={props.tutorialDialogueId ?? undefined}
            onDialogueAction={props.onTutorialDialogueAction}
          />
        </Show>
        <PauseMenu
          open={props.pauseMenuOpen}
          onClose={() => props.setPauseMenuOpen(false)}
          onMainMenu={props.onMainMenu}
        />
      </div>

      {/* Tutorial highlight overlay */}
      <TutorialOverlay
        targetId={props.tutorialHighlightId ?? null}
        label={props.tutorialHighlightLabel ?? null}
      />
    </div>
  );
};

// Bottom controls — action button + tool label (joystick removed)
const BottomControls = (props: {
  onAction: () => void;
  tileState: TileState | null;
  nearbyNpcTemplateId: string | null;
}) => {
  const progress = useTrait(koota, PlayerProgress);
  const build = useTrait(koota, Build);
  const selectedTool = () => progress()?.selectedTool ?? "trowel";
  const buildMode = () => build()?.mode ?? false;

  // Tool-specific action button appearance
  const getActionButtonStyle = () => {
    // NPC interaction override
    if (props.nearbyNpcTemplateId) {
      const npcTemplate = getNpcTemplate(props.nearbyNpcTemplateId);
      return {
        bg: COLORS.autumnGold,
        icon: npcTemplate?.icon ?? "\u{1F4AC}",
        label: "Talk",
      };
    }
    if (buildMode()) {
      return { bg: COLORS.barkBrown, icon: "\u{1F3D7}\uFE0F", label: "Build" };
    }
    switch (selectedTool()) {
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

  const actionStyle = () => getActionButtonStyle();

  // Determine if the action is valid for the current tool + tile combo
  const actionEnabled = () =>
    !!props.nearbyNpcTemplateId ||
    buildMode() ||
    getActionLabel(selectedTool(), props.tileState).enabled;

  return (
    <div class="relative h-24 sm:h-28 md:h-32 lg:h-36 flex items-center justify-end px-4 sm:px-6 md:px-8 lg:px-12">
      {/* Status text - center (hidden on mobile) */}
      <div class="hidden md:flex flex-col items-center gap-1 flex-1 justify-center">
        <span
          class="text-xs font-medium px-3 py-1 rounded-full capitalize"
          style={{
            background: `${COLORS.forestGreen}dd`,
            color: "white",
          }}
        >
          {selectedTool()}
        </span>
      </div>

      {/* Action button - right side */}
      <div class="flex flex-col items-center gap-1 flex-shrink-0">
        <button
          type="button"
          data-tutorial-id="action-button"
          class="w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 lg:w-24 lg:h-24 rounded-full flex items-center justify-center text-2xl sm:text-3xl lg:text-4xl shadow-lg motion-safe:active:scale-95 motion-safe:transition-transform touch-manipulation"
          style={{
            background: actionEnabled()
              ? `linear-gradient(135deg, ${actionStyle().bg} 0%, ${actionStyle().bg}cc 100%)`
              : `linear-gradient(135deg, #9E9E9E 0%, #757575 100%)`,
            border: `3px solid ${actionEnabled() ? COLORS.soilDark : "#616161"}`,
            "box-shadow": actionEnabled()
              ? `0 4px 12px ${actionStyle().bg}60, inset 0 2px 4px rgba(255,255,255,0.3)`
              : "0 2px 4px rgba(0,0,0,0.15)",
            opacity: actionEnabled() ? 1 : 0.55,
          }}
          disabled={!actionEnabled()}
          onClick={actionEnabled() ? props.onAction : undefined}
        >
          {actionStyle().icon}
        </button>
        {/* Action label on mobile */}
        <span
          class="text-xs font-medium md:hidden"
          style={{
            color: actionEnabled() ? "white" : "rgba(255,255,255,0.5)",
          }}
        >
          {actionStyle().label}
        </span>
      </div>
    </div>
  );
};
