import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { COLORS } from "../constants/config";

interface RulesModalProps {
  open: boolean;
  onClose: () => void;
  onStart: () => void;
}

export const RulesModal = ({ open, onClose, onStart }: RulesModalProps) => {
  const rules = [
    {
      icon: "🌱",
      title: "Plant Trees",
      description:
        "Select the trowel, stand on an empty soil tile, and tap the action button to plant. Each species needs seeds and some require resources to plant.",
    },
    {
      icon: "💧",
      title: "Water & Care",
      description:
        "Switch to the watering can and tap near growing trees. Watered trees grow faster and produce better yields at harvest.",
    },
    {
      icon: "🪓",
      title: "Harvest",
      description:
        "Mature trees can be harvested with the axe for Timber, Sap, Fruit, or Acorns depending on the species. Pruning first gives bonus yields!",
    },
    {
      icon: "🔋",
      title: "Stamina",
      description:
        "Every tool action costs stamina. When you run low, rest and it will regenerate over time. Plan your actions wisely!",
    },
    {
      icon: "🪵",
      title: "Resources & Seeds",
      description:
        "Harvest trees to collect resources (Timber, Sap, Fruit, Acorns). Some tree species cost resources to plant. Trade surplus resources for ones you need.",
    },
    {
      icon: "⏰",
      title: "Seasons & Weather",
      description:
        "Seasons cycle through Spring, Summer, Autumn, and Winter. Rain boosts growth, drought slows it, and windstorms can damage trees.",
    },
    {
      icon: "📈",
      title: "Level Up",
      description:
        "Earn XP from planting, watering, and harvesting. Level up to unlock new species, tools, grid expansions, and quests.",
    },
  ];

  const controls = [
    {
      icon: "👆",
      title: "Tap to Move",
      description:
        "Tap any tile on the ground to walk there. Your farmer will pathfind around obstacles automatically.",
    },
    {
      icon: "👋",
      title: "Drag to Move",
      description:
        "On mobile, drag anywhere on the canvas to move your farmer. On desktop, use WASD keys.",
    },
    {
      icon: "🎯",
      title: "Action Button",
      description:
        "The big button at the bottom-right uses your current tool on the tile you're standing on.",
    },
    {
      icon: "🔧",
      title: "Switch Tools",
      description:
        "Tap the tools button in the top bar or use the tool belt on the right to switch between tools.",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        className="max-w-md w-[calc(100%-2rem)] max-h-[85vh] p-0 gap-0 rounded-2xl overflow-hidden"
        style={{
          background: `linear-gradient(180deg, #faf9f6 0%, ${COLORS.skyMist} 100%)`,
          border: `3px solid ${COLORS.forestGreen}40`,
        }}
      >
        <DialogHeader className="p-4 pb-2 text-center">
          <DialogTitle
            className="text-2xl font-bold flex items-center justify-center gap-2"
            style={{ color: COLORS.forestGreen }}
          >
            <span>🌲</span>
            How to Play
            <span>🌲</span>
          </DialogTitle>
          <DialogDescription
            className="text-sm"
            style={{ color: COLORS.barkBrown }}
          >
            Welcome to Grove Keeper! Here's how to grow your forest.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-4 max-h-[55vh]">
          {/* Game Rules */}
          <div className="space-y-3 pb-2">
            <h3
              className="text-sm font-semibold uppercase tracking-wider"
              style={{ color: COLORS.forestGreen }}
            >
              Game Rules
            </h3>
            {rules.map((rule, index) => (
              <div
                key={index}
                className="flex gap-3 p-3 rounded-xl"
                style={{
                  background: "rgba(255,255,255,0.7)",
                  border: `1px solid ${COLORS.forestGreen}20`,
                }}
              >
                <span className="text-2xl flex-shrink-0">{rule.icon}</span>
                <div>
                  <h4
                    className="font-semibold text-sm"
                    style={{ color: COLORS.soilDark }}
                  >
                    {rule.title}
                  </h4>
                  <p
                    className="text-xs leading-relaxed"
                    style={{ color: COLORS.barkBrown }}
                  >
                    {rule.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Controls */}
          <div
            className="space-y-3 py-3 border-t"
            style={{ borderColor: `${COLORS.forestGreen}20` }}
          >
            <h3
              className="text-sm font-semibold uppercase tracking-wider"
              style={{ color: COLORS.forestGreen }}
            >
              Controls
            </h3>
            {controls.map((control, index) => (
              <div
                key={index}
                className="flex gap-3 p-3 rounded-xl"
                style={{
                  background: "rgba(255,255,255,0.7)",
                  border: `1px solid ${COLORS.forestGreen}20`,
                }}
              >
                <span className="text-2xl flex-shrink-0">{control.icon}</span>
                <div>
                  <h4
                    className="font-semibold text-sm"
                    style={{ color: COLORS.soilDark }}
                  >
                    {control.title}
                  </h4>
                  <p
                    className="text-xs leading-relaxed"
                    style={{ color: COLORS.barkBrown }}
                  >
                    {control.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Action buttons */}
        <div className="p-4 pt-2 flex gap-2">
          <Button
            variant="outline"
            className="flex-1 h-11 rounded-xl font-semibold"
            style={{
              borderColor: COLORS.forestGreen,
              borderWidth: 2,
              color: COLORS.forestGreen,
            }}
            onClick={onClose}
          >
            Maybe Later
          </Button>
          <Button
            className="flex-1 h-11 rounded-xl font-semibold"
            style={{
              background: `linear-gradient(135deg, ${COLORS.forestGreen} 0%, ${COLORS.forestGreen}dd 100%)`,
              color: "white",
            }}
            onClick={onStart}
          >
            Let's Grow!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
