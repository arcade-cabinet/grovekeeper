/**
 * QuestPanel -- Active quest tracker sidebar.
 *
 * Displays active quest chains with their current step objectives
 * and progress bars. Compact format for HUD overlay.
 */

import { Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/ui/text";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QuestObjectiveDisplay {
  description: string;
  current: number;
  target: number;
  completed: boolean;
}

export interface QuestStepDisplay {
  name: string;
  objectives: QuestObjectiveDisplay[];
  completed: boolean;
  rewardClaimed: boolean;
}

export interface ActiveQuestDisplay {
  chainId: string;
  chainName: string;
  icon: string;
  currentStep: QuestStepDisplay | null;
  totalSteps: number;
  currentStepIndex: number;
}

export interface QuestPanelProps {
  quests: ActiveQuestDisplay[];
  onClaimReward?: (chainId: string) => void;
  onDismiss?: () => void;
  compact?: boolean;
}

// ---------------------------------------------------------------------------
// Progress bar
// ---------------------------------------------------------------------------

function ObjectiveProgress({ objective }: { objective: QuestObjectiveDisplay }) {
  const pct =
    objective.target > 0
      ? Math.min(100, Math.round((objective.current / objective.target) * 100))
      : 0;

  return (
    <View className="mb-1">
      <View className="flex-row items-center justify-between">
        <Text
          className={`flex-1 text-xs ${objective.completed ? "text-forest-green line-through" : "text-soil-dark"}`}
          numberOfLines={1}
        >
          {objective.description}
        </Text>
        <Text className="ml-2 text-xs font-bold tabular-nums text-soil-dark">
          {objective.current}/{objective.target}
        </Text>
      </View>

      {/* Progress bar */}
      <View className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-bark-brown/20">
        <View
          className={`h-full rounded-full ${objective.completed ? "bg-forest-green" : "bg-autumn-gold"}`}
          style={{ width: `${pct}%` }}
        />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Single quest card
// ---------------------------------------------------------------------------

function QuestCard({
  quest,
  onClaimReward,
}: {
  quest: ActiveQuestDisplay;
  onClaimReward?: (chainId: string) => void;
}) {
  const step = quest.currentStep;
  const canClaim = step?.completed && !step.rewardClaimed;

  return (
    <View className="mb-2 rounded-xl border-2 border-bark-brown/30 bg-parchment/90 px-3 py-2">
      {/* Header */}
      <View className="mb-1 flex-row items-center">
        <Text className="mr-1.5 text-base">{quest.icon}</Text>
        <Text className="flex-1 text-xs font-bold text-soil-dark" numberOfLines={1}>
          {quest.chainName}
        </Text>
        <Text className="text-[10px] text-gray-500">
          {quest.currentStepIndex + 1}/{quest.totalSteps}
        </Text>
      </View>

      {/* Current step */}
      {step && (
        <>
          <Text className="mb-1 text-[11px] font-medium text-forest-green">{step.name}</Text>

          {step.objectives.map((obj, i) => (
            <ObjectiveProgress key={`${quest.chainId}-obj-${i}`} objective={obj} />
          ))}

          {/* Claim button */}
          {canClaim && onClaimReward && (
            <Pressable
              className="mt-1.5 min-h-[36px] items-center justify-center rounded-lg bg-autumn-gold"
              onPress={() => onClaimReward(quest.chainId)}
              accessibilityLabel={`Claim reward for ${step.name}`}
            >
              <Text className="text-xs font-bold text-white">Claim Reward</Text>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export function QuestPanel({ quests, onClaimReward, onDismiss, compact = false }: QuestPanelProps) {
  if (quests.length === 0) return null;

  if (compact) {
    // Compact mode: show only first quest, minimal
    const first = quests[0];
    const step = first.currentStep;
    if (!step) return null;

    const firstIncomplete = step.objectives.find((o) => !o.completed);

    return (
      <View className="rounded-lg bg-parchment/80 px-2 py-1">
        <Text className="text-[10px] font-bold text-soil-dark" numberOfLines={1}>
          {first.icon} {step.name}
        </Text>
        {firstIncomplete && (
          <Text className="text-[10px] text-forest-green" numberOfLines={1}>
            {firstIncomplete.description}: {firstIncomplete.current}/{firstIncomplete.target}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View className="max-h-[300px] w-[220px]">
      {/* Header */}
      <View className="mb-1 flex-row items-center justify-between">
        <Text className="text-xs font-bold text-parchment">Quests</Text>
        {onDismiss && (
          <Pressable
            className="min-h-[28px] min-w-[28px] items-center justify-center"
            onPress={onDismiss}
            accessibilityLabel="Close quest panel"
          >
            <Text className="text-xs font-bold text-parchment">X</Text>
          </Pressable>
        )}
      </View>

      <ScrollView>
        {quests.map((quest) => (
          <QuestCard key={quest.chainId} quest={quest} onClaimReward={onClaimReward} />
        ))}
      </ScrollView>
    </View>
  );
}
