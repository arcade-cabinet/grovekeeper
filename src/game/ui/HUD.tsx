import { RiBuilding2Line, RiMenuLine, RiToolsLine } from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { COLORS } from "../constants/config";
import { useGameStore } from "../stores/gameStore";
import type { GameTime } from "../systems/time";
import { QuestPanel } from "./QuestPanel";
import { ResourceBar } from "./ResourceBar";
import { TimeDisplay, TimeDisplayCompact } from "./TimeDisplay";
import { XPBar } from "./XPBar";

interface HUDProps {
  onPlant: () => void;
  onOpenMenu: () => void;
  onOpenTools: () => void;
  onOpenBuild?: () => void;
  gameTime: GameTime | null;
}

export const HUD = ({
  onOpenMenu,
  onOpenTools,
  onOpenBuild,
  gameTime,
}: HUDProps) => {
  const {
    selectedTool,
    activeQuests,
    addXp,
    addResource,
    addSeed,
    completeQuest,
    level,
  } = useGameStore();

  const handleClaimReward = (questId: string) => {
    const quest = activeQuests.find((q) => q.id === questId);
    if (quest?.completed) {
      addXp(quest.rewards.xp);
      if (quest.rewards.resources) {
        for (const r of quest.rewards.resources) {
          addResource(r.type, r.amount);
        }
      }
      if (quest.rewards.seeds) {
        for (const s of quest.rewards.seeds) {
          addSeed(s.speciesId, s.amount);
        }
      }
      completeQuest(questId);
    }
  };

  return (
    <div className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3">
      {/* Left side - Stats */}
      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 overflow-hidden">
        {/* Resources */}
        <ResourceBar />

        {/* Level & XP bar */}
        <XPBar />

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

        {/* Build button (unlocked at level 3) */}
        {level >= 3 && onOpenBuild && (
          <Button
            size="sm"
            className="h-11 px-2 sm:px-3 rounded-full"
            style={{
              background: COLORS.barkBrown,
              color: "white",
            }}
            onClick={onOpenBuild}
          >
            <RiBuilding2Line className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline text-xs">Build</span>
          </Button>
        )}

        {/* Tool selector button */}
        <Button
          size="sm"
          className="h-11 px-2 sm:px-3 rounded-full"
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
          className="w-11 h-11 text-white hover:bg-white/10"
          onClick={onOpenMenu}
        >
          <RiMenuLine className="w-5 h-5 sm:w-6 sm:h-6" />
        </Button>
      </div>
    </div>
  );
};
