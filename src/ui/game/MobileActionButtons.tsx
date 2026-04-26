import { COLORS } from "@/config/config";
import { useTrait } from "@/ecs/solid";
import { koota } from "@/koota";
import { getNpcTemplate } from "@/npcs/NpcManager";
import { Build, PlayerProgress } from "@/traits";
import { getActionLabel, type TileState } from "./ActionButton";

interface MobileActionButtonsProps {
  onAction: () => void;
  onOpenSeeds: () => void;
  onPause: () => void;
  tileState: TileState | null;
  nearbyNpcTemplateId: string | null;
}

export const MobileActionButtons = (props: MobileActionButtonsProps) => {
  const progress = useTrait(koota, PlayerProgress);
  const build = useTrait(koota, Build);
  const selectedTool = () => progress()?.selectedTool ?? "trowel";
  const buildMode = () => build()?.mode ?? false;

  const getActionButtonStyle = () => {
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
  const actionEnabled = () =>
    !!props.nearbyNpcTemplateId ||
    buildMode() ||
    getActionLabel(selectedTool(), props.tileState).enabled;

  return (
    <div
      class="md:hidden pointer-events-auto flex flex-col items-center gap-2.5"
      style={{
        position: "fixed",
        bottom: "calc(24px + env(safe-area-inset-bottom, 0px))",
        right: "calc(12px + env(safe-area-inset-right, 0px))",
        "z-index": "var(--gk-z-joystick)",
      }}
    >
      <button
        type="button"
        class="flex items-center justify-center rounded-full text-lg motion-safe:active:scale-95 motion-safe:transition-transform touch-manipulation"
        style={{
          width: "44px",
          height: "44px",
          background: `linear-gradient(135deg, ${COLORS.earthRed}, ${COLORS.barkBrown})`,
          border: `2px solid ${COLORS.soilDark}`,
          color: COLORS.parchment,
          "box-shadow": `0 4px 12px ${COLORS.barkBrown}60`,
        }}
        onClick={props.onPause}
        aria-label="Pause"
      >
        <span aria-hidden="true">{"\u23F8\uFE0F"}</span>
      </button>

      <button
        type="button"
        class="flex items-center justify-center rounded-full text-lg motion-safe:active:scale-95 motion-safe:transition-transform touch-manipulation"
        style={{
          width: "44px",
          height: "44px",
          background: `linear-gradient(135deg, ${COLORS.leafLight}, ${COLORS.forestGreen})`,
          border: `2px solid ${COLORS.soilDark}`,
          color: COLORS.parchment,
          "box-shadow": `0 4px 12px ${COLORS.forestGreen}60`,
        }}
        onClick={props.onOpenSeeds}
        aria-label="Open seed selection"
      >
        <span aria-hidden="true">{"\u{1F331}"}</span>
      </button>

      <button
        data-tutorial-id="action-button"
        class="flex flex-col items-center justify-center rounded-full text-2xl motion-safe:active:scale-95 motion-safe:transition-transform touch-manipulation"
        style={{
          width: "64px",
          height: "64px",
          background: actionEnabled()
            ? `linear-gradient(135deg, ${actionStyle().bg} 0%, ${actionStyle().bg}cc 100%)`
            : "linear-gradient(135deg, #9E9E9E 0%, #757575 100%)",
          border: `3px solid ${actionEnabled() ? COLORS.soilDark : "#616161"}`,
          "box-shadow": actionEnabled()
            ? `0 4px 12px ${actionStyle().bg}60, inset 0 2px 4px rgba(255,255,255,0.3)`
            : "0 2px 4px rgba(0,0,0,0.15)",
          opacity: actionEnabled() ? 1 : 0.55,
        }}
        disabled={!actionEnabled()}
        onClick={actionEnabled() ? props.onAction : undefined}
        aria-label={actionStyle().label}
      >
        <span aria-hidden="true">{actionStyle().icon}</span>
        <span
          aria-hidden="true"
          class="text-[10px] font-medium leading-none mt-0.5"
          style={{
            color: actionEnabled() ? "white" : "rgba(255,255,255,0.5)",
          }}
        >
          {actionStyle().label}
        </span>
      </button>
    </div>
  );
};
