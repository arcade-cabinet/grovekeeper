import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { COLORS } from "../constants/config";
import { useGameStore } from "../stores/gameStore";
import { FarmerMascot } from "./FarmerMascot";
import { Logo } from "./Logo";

interface MainMenuProps {
  onStartGame?: () => void;
}

export const MainMenu = ({ onStartGame }: MainMenuProps) => {
  const { setScreen, treesPlanted, resetGame, hasSeenRules } = useGameStore();
  const hasSave = treesPlanted > 0;
  
  const handleStart = () => {
    if (onStartGame) {
      onStartGame();
    } else {
      setScreen("playing");
    }
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6"
      style={{
        background: `linear-gradient(180deg, ${COLORS.skyMist} 0%, ${COLORS.leafLight}40 50%, ${COLORS.forestGreen}30 100%)`,
      }}
    >
      {/* Decorative tree silhouettes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute bottom-0 left-0 w-24 h-32 sm:w-32 sm:h-40"
          style={{
            background: `linear-gradient(0deg, ${COLORS.forestGreen}40 0%, transparent 100%)`,
            borderRadius: "50% 50% 0 0",
          }}
        />
        <div
          className="absolute bottom-0 right-0 w-20 h-28 sm:w-28 sm:h-36"
          style={{
            background: `linear-gradient(0deg, ${COLORS.forestGreen}30 0%, transparent 100%)`,
            borderRadius: "50% 50% 0 0",
          }}
        />
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
          "Tend. Grow. Thrive."
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
            onClick={() => {
              if (hasSave) {
                resetGame();
              }
              handleStart();
            }}
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
            <span>trees planted so far</span>
          </div>
        )}
      </Card>

      {/* Version */}
      <p
        className="mt-4 text-xs"
        style={{ color: `${COLORS.forestGreen}80` }}
      >
        Grove Keeper v0.1.0
      </p>
    </div>
  );
};
