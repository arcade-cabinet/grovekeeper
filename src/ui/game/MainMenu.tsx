import { For, Show } from "solid-js";
import { actions as gameActions } from "@/actions";
import { COLORS } from "@/config/config";
import { useTrait } from "@/ecs/solid";
import { koota } from "@/koota";
import { Tracking } from "@/traits";
import { Button } from "@/ui/primitives/button";
import { Card } from "@/ui/primitives/card";
import { Credits } from "./Credits";
import { Logo } from "./Logo";

// FarmerMascot deleted; the journey wave (Wave 18) replaces this UI entirely.
const FarmerMascot = (_: { size?: number; animate?: boolean }) => null;

interface MainMenuProps {
  onStartGame?: () => void;
  onNewGame?: () => void;
}

export const MainMenu = (props: MainMenuProps) => {
  const tracking = useTrait(koota, Tracking);
  const treesPlanted = () => tracking()?.treesPlanted ?? 0;
  const hasSave = () => treesPlanted() > 0;

  const setScreen = (
    s: "menu" | "playing" | "paused" | "seedSelect" | "rules",
  ) => gameActions().setScreen(s);

  const handleStart = () => {
    if (props.onStartGame) {
      props.onStartGame();
    } else {
      setScreen("playing");
    }
  };

  const handleNewGrove = () => {
    if (props.onNewGame) {
      props.onNewGame();
    } else {
      handleStart();
    }
  };

  const leaves = [
    {
      x: "15%",
      y: "20%",
      dx: "40px",
      dy: "60vh",
      rot: "180deg",
      dur: "8s",
      delay: "0s",
    },
    {
      x: "45%",
      y: "10%",
      dx: "-30px",
      dy: "70vh",
      rot: "-120deg",
      dur: "10s",
      delay: "2s",
    },
    {
      x: "75%",
      y: "15%",
      dx: "20px",
      dy: "65vh",
      rot: "200deg",
      dur: "9s",
      delay: "4s",
    },
    {
      x: "30%",
      y: "5%",
      dx: "-50px",
      dy: "80vh",
      rot: "-160deg",
      dur: "12s",
      delay: "1s",
    },
    {
      x: "85%",
      y: "25%",
      dx: "-25px",
      dy: "55vh",
      rot: "140deg",
      dur: "7s",
      delay: "6s",
    },
  ];

  return (
    <div
      class="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6"
      style={{
        background: `linear-gradient(180deg, ${COLORS.skyMist} 0%, ${COLORS.leafLight}40 50%, ${COLORS.forestGreen}30 100%)`,
      }}
    >
      <style>{`
        @keyframes leaf-float {
          0%   { transform: translate(0, 0) rotate(0deg); opacity: 0; }
          10%  { opacity: 0.6; }
          90%  { opacity: 0.4; }
          100% { transform: translate(var(--leaf-dx), var(--leaf-dy)) rotate(var(--leaf-rot)); opacity: 0; }
        }
        .leaf-particle {
          animation: leaf-float var(--leaf-dur) ease-in-out infinite;
          animation-delay: var(--leaf-delay);
        }
        @media (prefers-reduced-motion: reduce) {
          .leaf-particle { animation: none; opacity: 0.3; }
        }
      `}</style>
      <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <svg
          class="absolute bottom-0 left-0 w-28 h-40 sm:w-36 sm:h-48"
          viewBox="0 0 100 140"
          fill="none"
        >
          <ellipse
            cx="50"
            cy="50"
            rx="40"
            ry="45"
            fill={`${COLORS.forestGreen}30`}
          />
          <ellipse
            cx="35"
            cy="60"
            rx="30"
            ry="35"
            fill={`${COLORS.forestGreen}20`}
          />
          <rect
            x="45"
            y="90"
            width="10"
            height="50"
            rx="2"
            fill={`${COLORS.barkBrown}20`}
          />
        </svg>
        <svg
          class="absolute bottom-0 right-0 w-24 h-36 sm:w-32 sm:h-44"
          viewBox="0 0 100 140"
          fill="none"
        >
          <ellipse
            cx="50"
            cy="55"
            rx="35"
            ry="40"
            fill={`${COLORS.forestGreen}25`}
          />
          <ellipse
            cx="60"
            cy="45"
            rx="25"
            ry="30"
            fill={`${COLORS.forestGreen}18`}
          />
          <rect
            x="46"
            y="90"
            width="8"
            height="50"
            rx="2"
            fill={`${COLORS.barkBrown}18`}
          />
        </svg>

        <For each={leaves}>
          {(l) => (
            <div
              class="leaf-particle absolute text-sm"
              style={{
                left: l.x,
                top: l.y,
                "--leaf-dx": l.dx,
                "--leaf-dy": l.dy,
                "--leaf-rot": l.rot,
                "--leaf-dur": l.dur,
                "--leaf-delay": l.delay,
                color: COLORS.leafLight,
              }}
            >
              {"\u{1F343}"}
            </div>
          )}
        </For>
      </div>

      <Card
        class="relative w-full max-w-xs sm:max-w-sm p-4 sm:p-6 flex flex-col items-center gap-4 sm:gap-6"
        style={{
          background: `linear-gradient(180deg, white 0%, ${COLORS.skyMist} 100%)`,
          border: `3px solid ${COLORS.forestGreen}40`,
          "box-shadow": `0 8px 32px ${COLORS.forestGreen}30`,
        }}
      >
        <Logo size={160} />

        <div class="relative">
          <FarmerMascot size={80} animate />
          <div
            class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-12 h-2 rounded-full"
            style={{ background: `${COLORS.soilDark}30` }}
          />
        </div>

        <p
          class="text-center text-sm italic"
          style={{ color: COLORS.barkBrown }}
        >
          "Every forest begins with a single seed."
        </p>

        <div class="w-full flex flex-col gap-2 sm:gap-3">
          <Show when={hasSave()}>
            <Button
              class="w-full h-11 sm:h-12 text-base sm:text-lg font-bold rounded-xl"
              style={{
                background: `linear-gradient(135deg, ${COLORS.forestGreen} 0%, ${COLORS.forestGreen}dd 100%)`,
                color: "white",
                "box-shadow": `0 4px 12px ${COLORS.forestGreen}40`,
              }}
              onClick={() => setScreen("playing")}
            >
              Continue Grove
            </Button>
          </Show>

          <Button
            class="w-full h-11 sm:h-12 text-base sm:text-lg font-bold rounded-xl"
            variant={hasSave() ? "outline" : "default"}
            style={
              hasSave()
                ? {
                    "border-color": COLORS.forestGreen,
                    "border-width": "2px",
                    color: COLORS.forestGreen,
                    background: "white",
                  }
                : {
                    background: `linear-gradient(135deg, ${COLORS.forestGreen} 0%, ${COLORS.forestGreen}dd 100%)`,
                    color: "white",
                    "box-shadow": `0 4px 12px ${COLORS.forestGreen}40`,
                  }
            }
            onClick={handleNewGrove}
          >
            {hasSave() ? "New Grove" : "Start Growing"}
          </Button>
        </div>

        <Show when={hasSave()}>
          <div
            class="flex items-center gap-2 text-xs sm:text-sm"
            style={{ color: COLORS.barkBrown }}
          >
            <span class="font-medium">{treesPlanted()}</span>
            <span>
              {treesPlanted() === 1 ? "tree" : "trees"} planted so far
            </span>
          </div>
        </Show>
      </Card>

      <div class="mt-4 flex items-center gap-3">
        <p class="text-xs" style={{ color: `${COLORS.forestGreen}80` }}>
          Grovekeeper v1.0.0-alpha.1
        </p>
        <Credits />
      </div>
    </div>
  );
};
