import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { COLORS } from "../constants/config";
import { useGameStore } from "../stores/gameStore";
import { FarmerMascot } from "./FarmerMascot";
import { Logo } from "./Logo";

interface MainMenuProps {
  onStartGame?: () => void;
  onNewGame?: () => void;
}

export const MainMenu = ({ onStartGame, onNewGame }: MainMenuProps) => {
  const { setScreen, treesPlanted } = useGameStore();
  const hasSave = treesPlanted > 0;

  const handleStart = () => {
    if (onStartGame) {
      onStartGame();
    } else {
      setScreen("playing");
    }
  };

  const handleNewGrove = () => {
    if (onNewGame) {
      onNewGame();
    } else {
      handleStart();
    }
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6"
      style={{
        background: `linear-gradient(180deg, ${COLORS.skyMist} 0%, ${COLORS.leafLight}40 50%, ${COLORS.forestGreen}30 100%)`,
      }}
    >
      {/* Floating leaf particles */}
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
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Decorative tree silhouettes */}
        <svg className="absolute bottom-0 left-0 w-28 h-40 sm:w-36 sm:h-48" viewBox="0 0 100 140" fill="none">
          <ellipse cx="50" cy="50" rx="40" ry="45" fill={`${COLORS.forestGreen}30`} />
          <ellipse cx="35" cy="60" rx="30" ry="35" fill={`${COLORS.forestGreen}20`} />
          <rect x="45" y="90" width="10" height="50" rx="2" fill={`${COLORS.barkBrown}20`} />
        </svg>
        <svg className="absolute bottom-0 right-0 w-24 h-36 sm:w-32 sm:h-44" viewBox="0 0 100 140" fill="none">
          <ellipse cx="50" cy="55" rx="35" ry="40" fill={`${COLORS.forestGreen}25`} />
          <ellipse cx="60" cy="45" rx="25" ry="30" fill={`${COLORS.forestGreen}18`} />
          <rect x="46" y="90" width="8" height="50" rx="2" fill={`${COLORS.barkBrown}18`} />
        </svg>

        {/* Floating leaves */}
        {[
          { x: "15%", y: "20%", dx: "40px", dy: "60vh", rot: "180deg", dur: "8s", delay: "0s" },
          { x: "45%", y: "10%", dx: "-30px", dy: "70vh", rot: "-120deg", dur: "10s", delay: "2s" },
          { x: "75%", y: "15%", dx: "20px", dy: "65vh", rot: "200deg", dur: "9s", delay: "4s" },
          { x: "30%", y: "5%", dx: "-50px", dy: "80vh", rot: "-160deg", dur: "12s", delay: "1s" },
          { x: "85%", y: "25%", dx: "-25px", dy: "55vh", rot: "140deg", dur: "7s", delay: "6s" },
        ].map((l, i) => (
          <div
            key={i}
            className="leaf-particle absolute text-sm"
            style={{
              left: l.x,
              top: l.y,
              "--leaf-dx": l.dx,
              "--leaf-dy": l.dy,
              "--leaf-rot": l.rot,
              "--leaf-dur": l.dur,
              "--leaf-delay": l.delay,
              color: COLORS.leafLight,
            } as React.CSSProperties}
          >
            {"\u{1F343}"}
          </div>
        ))}
      </div>

      <Card
        className="relative w-full max-w-xs sm:max-w-sm p-4 sm:p-6 flex flex-col items-center gap-4 sm:gap-6"
        style={{
          background: `linear-gradient(180deg, white 0%, ${COLORS.skyMist} 100%)`,
          border: `3px solid ${COLORS.forestGreen}40`,
          boxShadow: `0 8px 32px ${COLORS.forestGreen}30`,
        }}
      >
        {/* Logo */}
        <Logo size={160} />

        {/* Mascot */}
        <div className="relative">
          <FarmerMascot size={80} animate />
          {/* Ground shadow */}
          <div
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-12 h-2 rounded-full"
            style={{ background: `${COLORS.soilDark}30` }}
          />
        </div>

        {/* Tagline */}
        <p
          className="text-center text-sm italic"
          style={{ color: COLORS.barkBrown }}
        >
          "Every forest begins with a single seed."
        </p>

        {/* Buttons */}
        <div className="w-full flex flex-col gap-2 sm:gap-3">
          {hasSave && (
            <Button
              className="w-full h-11 sm:h-12 text-base sm:text-lg font-bold rounded-xl"
              style={{
                background: `linear-gradient(135deg, ${COLORS.forestGreen} 0%, ${COLORS.forestGreen}dd 100%)`,
                color: "white",
                boxShadow: `0 4px 12px ${COLORS.forestGreen}40`,
              }}
              onClick={() => setScreen("playing")}
            >
              Continue Grove
            </Button>
          )}

          <Button
            className="w-full h-11 sm:h-12 text-base sm:text-lg font-bold rounded-xl"
            variant={hasSave ? "outline" : "default"}
            style={
              hasSave
                ? {
                    borderColor: COLORS.forestGreen,
                    borderWidth: 2,
                    color: COLORS.forestGreen,
                    background: "white",
                  }
                : {
                    background: `linear-gradient(135deg, ${COLORS.forestGreen} 0%, ${COLORS.forestGreen}dd 100%)`,
                    color: "white",
                    boxShadow: `0 4px 12px ${COLORS.forestGreen}40`,
                  }
            }
            onClick={handleNewGrove}
          >
            {hasSave ? "New Grove" : "Start Growing"}
          </Button>
        </div>

        {/* Stats */}
        {hasSave && (
          <div
            className="flex items-center gap-2 text-xs sm:text-sm"
            style={{ color: COLORS.barkBrown }}
          >
            <span className="font-medium">{treesPlanted}</span>
            <span>{treesPlanted === 1 ? "tree" : "trees"} planted so far</span>
          </div>
        )}
      </Card>

      {/* Version */}
      <p className="mt-4 text-xs" style={{ color: `${COLORS.forestGreen}80` }}>
        Grovekeeper v0.1.0
      </p>
    </div>
  );
};
