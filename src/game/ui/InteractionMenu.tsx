/**
 * InteractionMenu — Contextual menu that appears when tapping a 3D object.
 *
 * Shows relevant actions based on the entity type (tree, NPC, soil).
 * Anchored near the tap position on screen. Dismissed by tapping elsewhere.
 */

import { COLORS } from "../constants/config";

/** An action the player can take on the tapped object. */
export interface InteractionAction {
  id: string;
  icon: string;
  label: string;
  enabled: boolean;
}

interface Props {
  /** Screen X coordinate where the menu should appear. */
  screenX: number;
  /** Screen Y coordinate where the menu should appear. */
  screenY: number;
  /** Entity type that was tapped. */
  entityType: string;
  /** Available actions for this entity. */
  actions: InteractionAction[];
  /** Called when an action is selected. */
  onSelect: (actionId: string) => void;
  /** Called when the menu should be dismissed. */
  onDismiss: () => void;
}

export const InteractionMenu = ({
  screenX,
  screenY,
  actions,
  onSelect,
  onDismiss,
}: Props) => {
  // Clamp position to keep menu within viewport
  const menuWidth = 160;
  const menuMaxHeight = actions.length * 52 + 16;
  const clampedX = Math.min(
    Math.max(screenX - menuWidth / 2, 8),
    window.innerWidth - menuWidth - 8,
  );
  const clampedY = Math.min(
    Math.max(screenY - menuMaxHeight - 16, 8),
    window.innerHeight - menuMaxHeight - 8,
  );

  return (
    <>
      {/* Invisible backdrop to dismiss on tap elsewhere */}
      <div
        role="button"
        tabIndex={-1}
        className="fixed inset-0 z-40"
        onClick={onDismiss}
        onPointerDown={onDismiss}
        onKeyDown={(e) => {
          if (e.key === "Escape") onDismiss();
        }}
      />

      {/* Menu card */}
      <div
        className="fixed z-50 flex flex-col gap-1 p-2 rounded-xl shadow-xl motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95"
        style={{
          left: clampedX,
          top: clampedY,
          width: menuWidth,
          background: `${COLORS.soilDark}f0`,
          border: `2px solid ${COLORS.forestGreen}`,
          backdropFilter: "blur(8px)",
        }}
      >
        {actions.map((action) => (
          <button
            key={action.id}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium motion-safe:active:scale-95 motion-safe:transition-all touch-manipulation"
            style={{
              minHeight: 44,
              background: action.enabled
                ? `${COLORS.forestGreen}40`
                : "transparent",
              color: action.enabled ? "white" : "rgba(255,255,255,0.4)",
              cursor: action.enabled ? "pointer" : "default",
            }}
            disabled={!action.enabled}
            onClick={() => {
              if (action.enabled) onSelect(action.id);
            }}
          >
            <span className="text-lg">{action.icon}</span>
            <span>{action.label}</span>
          </button>
        ))}
      </div>
    </>
  );
};

/** Build actions list for a tree entity based on its growth stage. */
export function getTreeActions(
  treeStage: number,
  isWatered: boolean,
): InteractionAction[] {
  const actions: InteractionAction[] = [];

  if (treeStage >= 0 && treeStage <= 2) {
    actions.push({
      id: "water",
      icon: "\u{1F4A7}",
      label: isWatered ? "Watered" : "Water",
      enabled: !isWatered,
    });
  }

  if (treeStage >= 3) {
    actions.push({
      id: "prune",
      icon: "\u2702\uFE0F",
      label: "Prune",
      enabled: true,
    });
    actions.push({
      id: "harvest",
      icon: "\u{1FA93}",
      label: "Harvest",
      enabled: true,
    });
  }

  actions.push({
    id: "inspect",
    icon: "\u{1F4D6}",
    label: "Inspect",
    enabled: true,
  });

  return actions;
}

/** Build actions list for an NPC entity. */
export function getNpcActions(): InteractionAction[] {
  return [
    {
      id: "talk",
      icon: "\u{1F4AC}",
      label: "Talk",
      enabled: true,
    },
  ];
}

/** Build actions list for an empty soil tile. */
export function getSoilActions(): InteractionAction[] {
  return [
    {
      id: "plant",
      icon: "\u{1F331}",
      label: "Plant",
      enabled: true,
    },
  ];
}
