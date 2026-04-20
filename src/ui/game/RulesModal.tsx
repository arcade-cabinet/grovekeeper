import { createSignal, For, Show } from "solid-js";
import { COLORS } from "@/config/config";
import { Button } from "@/ui/primitives/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/ui/primitives/dialog";

interface RulesModalProps {
  open: boolean;
  onClose: () => void;
  onStart: () => void;
}

const STEPS = [
  {
    icon: "🌱",
    title: "Plant Trees",
    description:
      "Select the trowel, stand on an empty soil tile, and tap the action button to plant. Each species needs seeds — some require resources too.",
  },
  {
    icon: "💧",
    title: "Water & Care",
    description:
      "Switch to the watering can and tap near growing trees. Watered trees grow 30% faster and produce better yields at harvest.",
  },
  {
    icon: "🪓",
    title: "Harvest",
    description:
      "Mature trees can be harvested with the axe for Timber, Sap, Fruit, or Acorns depending on the species. Pruning first gives 1.5x yield!",
  },
  {
    icon: "🔋",
    title: "Stamina",
    description:
      "Every tool action costs stamina. When you run low, rest and it regenerates over time. Plan your actions wisely!",
  },
  {
    icon: "🪵",
    title: "Resources & Seeds",
    description:
      "Harvest trees to collect resources. Some species cost resources to plant. Trade surplus at the seasonal market for what you need.",
  },
  {
    icon: "⏰",
    title: "Seasons & Weather",
    description:
      "Spring boosts growth, winter halts it. Rain helps, drought hurts, windstorms can damage young trees. Evergreens grow in winter!",
  },
  {
    icon: "📈",
    title: "Level Up & Explore",
    description:
      "Earn XP from everything you do. Level up to unlock new species, tools, grid expansions, and new zones to explore.",
  },
  {
    icon: "👆",
    title: "Controls",
    description:
      "Tap to walk anywhere. Use the joystick (mobile) or WASD (desktop) to move. Tap objects to interact. The action button uses your current tool.",
  },
];

export const RulesModal = (props: RulesModalProps) => {
  const [step, setStep] = createSignal(0);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setStep(0);
      props.onClose();
    }
  };

  const handleNext = () => {
    if (step() < STEPS.length - 1) {
      setStep(step() + 1);
    } else {
      setStep(0);
      props.onStart();
    }
  };

  const handleBack = () => {
    if (step() > 0) setStep(step() - 1);
  };

  const current = () => STEPS[step()];
  const isLast = () => step() === STEPS.length - 1;

  return (
    <Dialog open={props.open} onOpenChange={handleOpenChange}>
      <DialogContent
        class="max-w-sm w-[calc(100%-2rem)] p-0 gap-0 rounded-2xl overflow-hidden"
        style={{
          background: `linear-gradient(180deg, #faf9f6 0%, ${COLORS.skyMist} 100%)`,
          border: `3px solid ${COLORS.forestGreen}40`,
        }}
      >
        <DialogHeader class="p-5 pb-3 text-center">
          <DialogTitle
            class="text-xl font-bold flex items-center justify-center gap-2"
            style={{ color: COLORS.forestGreen }}
          >
            <span>🌲</span>
            How to Play
            <span>🌲</span>
          </DialogTitle>
          <DialogDescription
            class="text-xs"
            style={{ color: COLORS.barkBrown }}
          >
            Step {step() + 1} of {STEPS.length}
          </DialogDescription>
        </DialogHeader>

        <div class="flex justify-center gap-1.5 px-5 pb-3">
          <For each={STEPS}>
            {(_s, i) => {
              const bg = () => {
                if (i() === step()) return COLORS.forestGreen;
                if (i() < step()) return `${COLORS.forestGreen}60`;
                return `${COLORS.forestGreen}20`;
              };
              return (
                <button
                  type="button"
                  class="w-11 h-11 flex items-center justify-center"
                  onClick={() => setStep(i())}
                  aria-label={`Go to step ${i() + 1}`}
                >
                  <span
                    class="w-2 h-2 rounded-full motion-safe:transition-all"
                    style={{
                      background: bg(),
                      transform: i() === step() ? "scale(1.3)" : "scale(1)",
                    }}
                  />
                </button>
              );
            }}
          </For>
        </div>

        <div class="px-5 pb-4">
          <div
            class="flex flex-col items-center gap-3 p-5 rounded-xl text-center"
            style={{
              background: "rgba(255,255,255,0.7)",
              border: `1px solid ${COLORS.forestGreen}20`,
            }}
          >
            <span class="text-5xl">{current().icon}</span>
            <h4 class="font-bold text-lg" style={{ color: COLORS.soilDark }}>
              {current().title}
            </h4>
            <p
              class="text-sm leading-relaxed"
              style={{ color: COLORS.barkBrown }}
            >
              {current().description}
            </p>
          </div>
        </div>

        <div class="p-4 pt-0 flex gap-2">
          <Show
            when={step() > 0}
            fallback={
              <Button
                variant="outline"
                class="flex-1 h-11 rounded-xl font-semibold"
                style={{
                  "border-color": `${COLORS.barkBrown}80`,
                  color: COLORS.barkBrown,
                }}
                onClick={props.onStart}
              >
                Skip
              </Button>
            }
          >
            <Button
              variant="outline"
              class="flex-1 h-11 rounded-xl font-semibold"
              style={{
                "border-color": COLORS.forestGreen,
                "border-width": "2px",
                color: COLORS.forestGreen,
              }}
              onClick={handleBack}
            >
              Back
            </Button>
          </Show>
          <Button
            class="flex-1 h-11 rounded-xl font-semibold"
            style={{
              background: `linear-gradient(135deg, ${COLORS.forestGreen} 0%, ${COLORS.forestGreen}dd 100%)`,
              color: "white",
            }}
            onClick={handleNext}
          >
            {isLast() ? "Let's Grow!" : "Next"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
