import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RiCoinLine, RiMenuLine, RiToolsLine, RiTrophyLine } from "@remixicon/react";
import { COLORS } from "../constants/config";
import { useGameStore } from "../stores/gameStore";
import { TimeDisplay, TimeDisplayCompact } from "./TimeDisplay";
import { QuestPanel } from "./QuestPanel";
import type { GameTime } from "../systems/time";

interface HUDProps {
  onPlant: () => void;
  onOpenMenu: () => void;
  onOpenTools: () => void;
  gameTime: GameTime | null;
}

export const HUD = ({ onOpenMenu, onOpenTools, gameTime }: HUDProps) => {
  const { coins, xp, level, selectedTool, activeQuests, addCoins, addXp, completeQuest } = useGameStore();

  const xpForNextLevel = level * 500;
  const xpProgress = ((xp % 500) / 500) * 100;
  
  const handleClaimReward = (questId: string) => {
    const quest = activeQuests.find(q => q.id === questId);
    if (quest?.completed) {
      addCoins(quest.rewards.coins);
      addXp(quest.rewards.xp);
      completeQuest(questId);
    }
  };

  return (
    <div className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3">
      {/* Left side - Stats */}
      <div className="flex items-center gap-1.5 sm:gap-3">
        {/* Coins */}
        <div className="flex items-center gap-1 bg-black/20 rounded-full px-2 py-1 sm:px-3">
          <RiCoinLine className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
          <span className="text-white font-bold text-sm sm:text-base">{coins}</span>
        </div>

        {/* Level & XP */}
        <div className="flex items-center gap-1 sm:gap-2">
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: COLORS.forestGreen, color: "white" }}
          >
            Lv.{level}
          </span>
          <div className="w-12 sm:w-16 lg:w-20 hidden sm:block">
            <Progress
              value={xpProgress}
              className="h-1.5 sm:h-2"
              style={{ background: "rgba(0,0,0,0.3)" }}
            />
          </div>
        </div>
        
        {/* Time display - compact on mobile */}
        {gameTime && (
          <>
            <div className="hidden sm:block">
              <TimeDisplay time={gameTime} />
            </div>
            <div className="block sm:hidden">
              <TimeDisplayCompact time={gameTime} />
            </div>
          </>
        )}
      </div>

      {/* Right side - Controls */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Quest panel */}
        <QuestPanel quests={activeQuests} onClaimReward={handleClaimReward} />
        
        {/* Tool selector button */}
        <Button
          size="sm"
          className="h-8 px-2 sm:h-9 sm:px-3 rounded-full"
          style={{
            background: COLORS.forestGreen,
            color: "white",
          }}
          onClick={onOpenTools}
        >
          <RiToolsLine className="w-4 h-4 sm:mr-1" />
          <span className="hidden sm:inline text-xs">{selectedTool}</span>
        </Button>

        {/* Menu button */}
        <Button
          size="icon"
          variant="ghost"
          className="w-8 h-8 sm:w-9 sm:h-9 text-white hover:bg-white/10"
          onClick={onOpenMenu}
        >
          <RiMenuLine className="w-5 h-5 sm:w-6 sm:h-6" />
        </Button>
      </div>
    </div>
  );
};
