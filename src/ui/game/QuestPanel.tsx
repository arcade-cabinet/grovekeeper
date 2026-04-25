import { createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { COLORS } from "@/config/config";
import type { ActiveQuest, GoalDifficulty } from "@/systems/quests";
import { RiTrophyLine } from "@/ui/icons";
import { Button } from "@/ui/primitives/button";
import { Progress } from "@/ui/primitives/progress";
import { ScrollArea } from "@/ui/primitives/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/ui/primitives/sheet";

/** Human-readable HH:MM:SS countdown to local-midnight quest refresh. */
function useDailyRefreshCountdown(): () => string {
  const compute = (): string => {
    const now = new Date();
    const midnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      0,
      0,
    );
    const totalSec = Math.max(
      0,
      Math.floor((midnight.getTime() - now.getTime()) / 1000),
    );
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };
  const [text, setText] = createSignal(compute());
  let timer: ReturnType<typeof setInterval> | undefined;
  onMount(() => {
    timer = setInterval(() => setText(compute()), 1000);
  });
  onCleanup(() => {
    if (timer) clearInterval(timer);
  });
  return text;
}

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

export const QuestPanel = (props: QuestPanelProps) => {
  const activeQuests = () => props.quests.filter((q) => !q.completed);
  const completedQuests = () => props.quests.filter((q) => q.completed);
  const refreshIn = useDailyRefreshCountdown();

  return (
    <Sheet>
      <SheetTrigger
        class="h-11 px-3 sm:h-11 sm:px-3 rounded-full relative inline-flex items-center justify-center text-sm font-medium"
        style={{
          background: COLORS.autumnGold,
          color: COLORS.soilDark,
        }}
        aria-label={`Open quests panel${activeQuests().length > 0 ? ` — ${activeQuests().length} active` : ""}`}
      >
        <RiTrophyLine class="w-4 h-4 sm:mr-1" aria-hidden="true" />
        <span class="hidden sm:inline text-xs font-semibold">Quests</span>
        <Show when={activeQuests().length > 0}>
          <span
            class="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center"
            style={{
              background: COLORS.forestGreen,
              color: "white",
            }}
          >
            {activeQuests().length}
          </span>
        </Show>
      </SheetTrigger>
      <SheetContent
        side="right"
        class="w-[320px] sm:w-[400px] p-0"
        style={{
          background: `linear-gradient(180deg, #faf9f6 0%, ${COLORS.skyMist} 100%)`,
        }}
      >
        <SheetHeader class="p-4 pb-2">
          <SheetTitle
            class="flex items-center gap-2"
            style={{ color: COLORS.forestGreen }}
          >
            <RiTrophyLine class="w-5 h-5" />
            Daily Quests
          </SheetTitle>
          <SheetDescription style={{ color: COLORS.barkBrown }}>
            Complete quests to earn rewards · refreshes in{" "}
            <span class="tabular-nums font-semibold">{refreshIn()}</span>
          </SheetDescription>
        </SheetHeader>

        <ScrollArea class="flex-1 h-[calc(100vh-120px)]">
          <div class="px-4 pb-4 space-y-4">
            <Show when={activeQuests().length > 0}>
              <div class="space-y-2">
                <h3
                  class="text-sm font-semibold uppercase tracking-wider"
                  style={{ color: COLORS.forestGreen }}
                >
                  Active
                </h3>
                <For each={activeQuests()}>
                  {(quest) => <QuestCard quest={quest} />}
                </For>
              </div>
            </Show>

            <Show when={completedQuests().length > 0}>
              <div class="space-y-2">
                <h3
                  class="text-sm font-semibold uppercase tracking-wider"
                  style={{ color: COLORS.autumnGold }}
                >
                  Completed
                </h3>
                <For each={completedQuests()}>
                  {(quest) => (
                    <QuestCard
                      quest={quest}
                      onClaim={() => props.onClaimReward?.(quest.id)}
                    />
                  )}
                </For>
              </div>
            </Show>

            <Show when={props.quests.length === 0}>
              <div class="text-center py-8">
                <p class="text-sm" style={{ color: COLORS.barkBrown }}>
                  No active quests. Check back tomorrow!
                </p>
              </div>
            </Show>
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

const QuestCard = (props: QuestCardProps) => {
  return (
    <div
      class="p-3 rounded-xl space-y-2"
      style={{
        background: props.quest.completed ? `${COLORS.forestGreen}10` : "white",
        border: `1px solid ${props.quest.completed ? COLORS.forestGreen : `${COLORS.forestGreen}30`}`,
      }}
    >
      <div class="flex items-start justify-between gap-2">
        <div class="flex-1">
          <div class="flex items-center gap-2">
            <h4
              class="font-semibold text-sm"
              style={{ color: COLORS.soilDark }}
            >
              {props.quest.name}
            </h4>
            <span
              class="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              style={{
                background: `${difficultyColors[props.quest.difficulty]}20`,
                color: difficultyColors[props.quest.difficulty],
              }}
            >
              {difficultyLabels[props.quest.difficulty]}
            </span>
          </div>
          <p class="text-xs" style={{ color: COLORS.barkBrown }}>
            {props.quest.description}
          </p>
        </div>
      </div>

      <div class="space-y-1.5">
        <For each={props.quest.goals}>
          {(goal) => (
            <div class="space-y-0.5">
              <div class="flex items-center justify-between text-xs">
                <span style={{ color: COLORS.soilDark }}>{goal.name}</span>
                <span style={{ color: COLORS.barkBrown }}>
                  {goal.currentProgress}/{goal.targetAmount}
                </span>
              </div>
              <Progress
                value={(goal.currentProgress / goal.targetAmount) * 100}
                class="h-1.5"
                style={{
                  background: `${COLORS.forestGreen}20`,
                }}
                aria-label={`${goal.name}: ${goal.currentProgress} of ${goal.targetAmount}`}
              />
            </div>
          )}
        </For>
      </div>

      <div
        class="flex items-center justify-between pt-1 border-t"
        style={{ "border-color": `${COLORS.forestGreen}20` }}
      >
        <div class="flex items-center gap-2 text-xs flex-wrap">
          <span style={{ color: COLORS.forestGreen }}>
            +{props.quest.rewards.xp} XP
          </span>
          <For each={props.quest.rewards.resources ?? []}>
            {(r) => (
              <span style={{ color: COLORS.autumnGold }}>
                +{r.amount} {r.type}
              </span>
            )}
          </For>
          <For each={props.quest.rewards.seeds ?? []}>
            {(s) => (
              <span style={{ color: COLORS.leafLight }}>
                +{s.amount} {s.speciesId} seeds
              </span>
            )}
          </For>
        </div>
        <Show when={props.quest.completed && props.onClaim}>
          <Button
            size="sm"
            class="h-11 px-4 text-xs rounded-full"
            style={{
              background: COLORS.forestGreen,
              color: "white",
            }}
            onClick={props.onClaim}
            aria-label={`Claim reward for quest: ${props.quest.name}`}
          >
            Claim
          </Button>
        </Show>
      </div>
    </div>
  );
};

export const QuestIndicator = (props: { quests: ActiveQuest[] }) => {
  const activeCount = () => props.quests.filter((q) => !q.completed).length;
  const completedCount = () => props.quests.filter((q) => q.completed).length;

  return (
    <Show when={props.quests.length > 0}>
      <div
        class="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
        style={{
          background: "rgba(0,0,0,0.25)",
          color: "white",
        }}
      >
        <RiTrophyLine class="w-3 h-3" />
        <Show
          when={completedCount() > 0}
          fallback={<span>{activeCount()}</span>}
        >
          <span style={{ color: COLORS.autumnGold }}>{completedCount()}!</span>
        </Show>
      </div>
    </Show>
  );
};
