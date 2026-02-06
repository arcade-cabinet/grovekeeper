import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RiTrophyLine } from "@remixicon/react";
import { COLORS } from "../constants/config";
import type { ActiveQuest, GoalDifficulty } from "../systems/quests";

interface QuestPanelProps {
  quests: ActiveQuest[];
  onClaimReward?: (questId: string) => void;
}

const difficultyColors: Record<GoalDifficulty, string> = {
  easy: "#4CAF50",
  medium: "#FF9800",
  hard: "#F44336",
  epic: "#9C27B0",
};

const difficultyLabels: Record<GoalDifficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
  epic: "Epic",
};

export const QuestPanel = ({ quests, onClaimReward }: QuestPanelProps) => {
  const activeQuests = quests.filter((q) => !q.completed);
  const completedQuests = quests.filter((q) => q.completed);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          size="sm"
          className="h-8 px-2 sm:h-9 sm:px-3 rounded-full relative"
          style={{
            background: COLORS.autumnGold,
            color: COLORS.soilDark,
          }}
        >
          <RiTrophyLine className="w-4 h-4 sm:mr-1" />
          <span className="hidden sm:inline text-xs font-semibold">Quests</span>
          {activeQuests.length > 0 && (
            <span
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center"
              style={{
                background: COLORS.forestGreen,
                color: "white",
              }}
            >
              {activeQuests.length}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-[320px] sm:w-[400px] p-0"
        style={{
          background: `linear-gradient(180deg, #faf9f6 0%, ${COLORS.skyMist} 100%)`,
        }}
      >
        <SheetHeader className="p-4 pb-2">
          <SheetTitle
            className="flex items-center gap-2"
            style={{ color: COLORS.forestGreen }}
          >
            <RiTrophyLine className="w-5 h-5" />
            Daily Quests
          </SheetTitle>
          <SheetDescription style={{ color: COLORS.barkBrown }}>
            Complete quests to earn rewards
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 h-[calc(100vh-120px)]">
          <div className="px-4 pb-4 space-y-4">
            {/* Active Quests */}
            {activeQuests.length > 0 && (
              <div className="space-y-2">
                <h3
                  className="text-sm font-semibold uppercase tracking-wider"
                  style={{ color: COLORS.forestGreen }}
                >
                  Active
                </h3>
                {activeQuests.map((quest) => (
                  <QuestCard key={quest.id} quest={quest} />
                ))}
              </div>
            )}

            {/* Completed Quests */}
            {completedQuests.length > 0 && (
              <div className="space-y-2">
                <h3
                  className="text-sm font-semibold uppercase tracking-wider"
                  style={{ color: COLORS.autumnGold }}
                >
                  Completed
                </h3>
                {completedQuests.map((quest) => (
                  <QuestCard
                    key={quest.id}
                    quest={quest}
                    onClaim={() => onClaimReward?.(quest.id)}
                  />
                ))}
              </div>
            )}

            {/* Empty state */}
            {quests.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm" style={{ color: COLORS.barkBrown }}>
                  No active quests. Check back tomorrow!
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

interface QuestCardProps {
  quest: ActiveQuest;
  onClaim?: () => void;
}

const QuestCard = ({ quest, onClaim }: QuestCardProps) => {
  const _totalProgress =
    quest.goals.reduce((sum, g) => sum + g.currentProgress, 0) /
    quest.goals.reduce((sum, g) => sum + g.targetAmount, 0);

  return (
    <div
      className="p-3 rounded-xl space-y-2"
      style={{
        background: quest.completed ? `${COLORS.forestGreen}10` : "white",
        border: `1px solid ${quest.completed ? COLORS.forestGreen : `${COLORS.forestGreen}30`}`,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4
              className="font-semibold text-sm"
              style={{ color: COLORS.soilDark }}
            >
              {quest.name}
            </h4>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              style={{
                background: `${difficultyColors[quest.difficulty]}20`,
                color: difficultyColors[quest.difficulty],
              }}
            >
              {difficultyLabels[quest.difficulty]}
            </span>
          </div>
          <p className="text-xs" style={{ color: COLORS.barkBrown }}>
            {quest.description}
          </p>
        </div>
      </div>

      {/* Goals */}
      <div className="space-y-1.5">
        {quest.goals.map((goal) => (
          <div key={goal.id} className="space-y-0.5">
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: COLORS.soilDark }}>{goal.name}</span>
              <span style={{ color: COLORS.barkBrown }}>
                {goal.currentProgress}/{goal.targetAmount}
              </span>
            </div>
            <Progress
              value={(goal.currentProgress / goal.targetAmount) * 100}
              className="h-1.5"
              style={{
                background: `${COLORS.forestGreen}20`,
              }}
            />
          </div>
        ))}
      </div>

      {/* Rewards */}
      <div className="flex items-center justify-between pt-1 border-t" style={{ borderColor: `${COLORS.forestGreen}20` }}>
        <div className="flex items-center gap-3 text-xs">
          <span style={{ color: COLORS.autumnGold }}>
            +{quest.rewards.coins} coins
          </span>
          <span style={{ color: COLORS.forestGreen }}>
            +{quest.rewards.xp} XP
          </span>
        </div>
        {quest.completed && onClaim && (
          <Button
            size="sm"
            className="h-7 px-3 text-xs rounded-full"
            style={{
              background: COLORS.forestGreen,
              color: "white",
            }}
            onClick={onClaim}
          >
            Claim
          </Button>
        )}
      </div>
    </div>
  );
};

// Mini quest indicator for HUD
export const QuestIndicator = ({ quests }: { quests: ActiveQuest[] }) => {
  const activeCount = quests.filter((q) => !q.completed).length;
  const completedCount = quests.filter((q) => q.completed).length;

  if (quests.length === 0) return null;

  return (
    <div
      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
      style={{
        background: "rgba(0,0,0,0.25)",
        color: "white",
      }}
    >
      <RiTrophyLine className="w-3 h-3" />
      {completedCount > 0 ? (
        <span style={{ color: COLORS.autumnGold }}>{completedCount}!</span>
      ) : (
        <span>{activeCount}</span>
      )}
    </div>
  );
};
