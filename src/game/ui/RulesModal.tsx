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
      description: "Use the trowel to plant seeds and grow various tree species. Different trees grow at different rates and offer different rewards.",
    },
    {
      icon: "💧",
      title: "Water & Care",
      description: "Keep your trees healthy by watering them regularly. Well-watered trees grow faster and produce better yields.",
    },
    {
      icon: "🪓",
      title: "Harvest",
      description: "Once trees reach maturity, use the axe to harvest them for resources, coins, and XP. Ancient trees yield the highest rewards.",
    },
    {
      icon: "⏰",
      title: "Time Flows",
      description: "The game has a day/night cycle and seasons. Some trees thrive in specific seasons, and growth rates change throughout the day.",
    },
    {
      icon: "🎯",
      title: "Complete Quests",
      description: "Take on daily quests to earn bonus rewards. Quests range from simple planting tasks to complex seasonal challenges.",
    },
    {
      icon: "📈",
      title: "Level Up",
      description: "Earn XP to level up and unlock new tree species, tools, and abilities. Higher levels unlock harder quests with better rewards.",
    },
  ];

  const controls = [
    {
      icon: "🕹️",
      title: "Movement",
      description: "Use the joystick on the left to move your farmer around the grove.",
    },
    {
      icon: "👆",
      title: "Action",
      description: "Tap the action button on the right to use your current tool on the nearest tile.",
    },
    {
      icon: "🔧",
      title: "Tools",
      description: "Tap the tools button in the top bar to switch between different tools.",
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
          <DialogDescription className="text-sm" style={{ color: COLORS.barkBrown }}>
            Welcome to Grove Keeper! Here's how to grow your forest.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-4 max-h-[55vh]">
          {/* Game Rules */}
          <div className="space-y-3 pb-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: COLORS.forestGreen }}>
              Game Rules
            </h3>
            {rules.map((rule, index) => (
              <div
                key={index}
                className="flex gap-3 p-3 rounded-xl"
                style={{
                  background: 'rgba(255,255,255,0.7)',
                  border: `1px solid ${COLORS.forestGreen}20`,
                }}
              >
                <span className="text-2xl flex-shrink-0">{rule.icon}</span>
                <div>
                  <h4 className="font-semibold text-sm" style={{ color: COLORS.soilDark }}>
                    {rule.title}
                  </h4>
                  <p className="text-xs leading-relaxed" style={{ color: COLORS.barkBrown }}>
                    {rule.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Controls */}
          <div className="space-y-3 py-3 border-t" style={{ borderColor: `${COLORS.forestGreen}20` }}>
            <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: COLORS.forestGreen }}>
              Controls
            </h3>
            {controls.map((control, index) => (
              <div
                key={index}
                className="flex gap-3 p-3 rounded-xl"
                style={{
                  background: 'rgba(255,255,255,0.7)',
                  border: `1px solid ${COLORS.forestGreen}20`,
                }}
              >
                <span className="text-2xl flex-shrink-0">{control.icon}</span>
                <div>
                  <h4 className="font-semibold text-sm" style={{ color: COLORS.soilDark }}>
                    {control.title}
                  </h4>
                  <p className="text-xs leading-relaxed" style={{ color: COLORS.barkBrown }}>
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
              color: 'white',
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
