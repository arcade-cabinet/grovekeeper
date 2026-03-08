/**
 * QuestPanel -- Active quest tracker sidebar (Spec §14.4).
 * ConnectedQuestPanel reads from ECS questBranchQuery + Legend State.
 * mapQuestBranchToDisplay is the pure mapping function (exported for tests).
 */

import { useEffect, useRef } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/ui/text";
import { ACCENT, DARK, HUD_PANEL, TYPE } from "@/components/ui/tokens";
import type { QuestBranchComponent } from "@/game/ecs/components/dialogue";
import { questBranchQuery } from "@/game/ecs/world";
import {
  getChainDef,
  getCurrentStep,
  getCurrentStepProgress,
} from "@/game/quests/questChainEngine";
import type { QuestChainState } from "@/game/quests/types";
import { useGameStore } from "@/game/stores";
import { showToast } from "./Toast.tsx";

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
// Pure mapping (testable seam)
// ---------------------------------------------------------------------------

/**
 * Map ECS questBranch entities + store chain state to display objects.
 * Pure function — safe to call in tests without React context.
 */
export function mapQuestBranchToDisplay(
  branches: ReadonlyArray<{ questBranch: QuestBranchComponent }>,
  questChainState: QuestChainState,
): ActiveQuestDisplay[] {
  const result: ActiveQuestDisplay[] = [];
  for (const entity of branches) {
    const qb = entity.questBranch;
    if (qb.status !== "active") continue;

    const def = getChainDef(qb.questChainId);
    const stepDef = getCurrentStep(qb.questChainId, questChainState);
    const stepProgress = getCurrentStepProgress(qb.questChainId, questChainState);
    const totalSteps = def?.steps.length ?? qb.totalSteps;

    let currentStep: QuestStepDisplay | null = null;
    if (stepDef && stepProgress) {
      currentStep = {
        name: stepDef.name,
        objectives: stepDef.objectives.map((objDef, i) => {
          const prog = stepProgress.objectives[i];
          return {
            description: objDef.description,
            current: prog?.currentProgress ?? 0,
            target: objDef.targetAmount,
            completed: prog?.completed ?? false,
          };
        }),
        completed: stepProgress.completed,
        rewardClaimed: stepProgress.rewardClaimed,
      };
    } else if (qb.currentObjective) {
      currentStep = {
        name: qb.currentObjective,
        objectives: [{ description: qb.currentObjective, current: 0, target: 1, completed: false }],
        completed: false,
        rewardClaimed: false,
      };
    }

    result.push({
      chainId: qb.questChainId,
      chainName: def?.name ?? qb.questChainId,
      icon: def?.icon ?? "📜",
      currentStep,
      totalSteps,
      currentStepIndex: qb.currentStep,
    });
  }
  return result;
}

// ---------------------------------------------------------------------------
// ECS-connected hook
// ---------------------------------------------------------------------------

/** Reads live quest data from ECS + store; fires toasts on step completion. */
export function useActiveQuestsFromECS(): ActiveQuestDisplay[] {
  const questChainState = useGameStore((s) => s.questChainState);
  const branches = [...questBranchQuery];
  const quests = mapQuestBranchToDisplay(branches, questChainState);

  const prevCompletedRef = useRef<Record<string, boolean>>({});
  useEffect(() => {
    for (const q of quests) {
      const key = `${q.chainId}-${q.currentStepIndex}`;
      const isNowComplete = (q.currentStep?.completed && !q.currentStep.rewardClaimed) ?? false;
      if (isNowComplete && !prevCompletedRef.current[key]) {
        showToast(`Quest step ready: ${q.currentStep?.name ?? q.chainName}`, "success");
      }
      prevCompletedRef.current[key] = isNowComplete;
    }
  });

  return quests;
}

// ---------------------------------------------------------------------------
// Connected component (ECS-wired)
// ---------------------------------------------------------------------------

export interface ConnectedQuestPanelProps {
  onDismiss?: () => void;
  compact?: boolean;
}

/** Self-wired QuestPanel: reads ECS questBranchQuery + Legend State directly. */
export function ConnectedQuestPanel({ onDismiss, compact }: ConnectedQuestPanelProps) {
  const quests = useActiveQuestsFromECS();
  return (
    <QuestPanel
      quests={quests}
      onClaimReward={(chainId) => useGameStore.getState().claimQuestStepReward(chainId)}
      onDismiss={onDismiss}
      compact={compact}
    />
  );
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
    <View style={{ marginBottom: 4 }}>
      <View className="flex-row items-center justify-between">
        <Text
          style={{
            ...TYPE.caption,
            flex: 1,
            color: objective.completed ? ACCENT.sap : DARK.textSecondary,
            textDecorationLine: objective.completed ? "line-through" : "none",
          }}
          numberOfLines={1}
        >
          {objective.description}
        </Text>
        <Text
          style={{
            ...TYPE.caption,
            fontWeight: "700",
            marginLeft: 8,
            color: DARK.textPrimary,
          }}
        >
          {objective.current}/{objective.target}
        </Text>
      </View>

      {/* Progress bar */}
      <View
        className="mt-0.5 h-1.5 overflow-hidden rounded-full"
        style={{ backgroundColor: DARK.surfaceStone }}
      >
        <View
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            backgroundColor: objective.completed ? ACCENT.sap : ACCENT.amber,
          }}
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
    <View
      className="mb-2 rounded-xl px-3 py-2"
      style={{
        backgroundColor: DARK.bgCanopy,
        borderWidth: 1,
        borderColor: DARK.borderBranch,
      }}
    >
      {/* Header */}
      <View className="mb-1 flex-row items-center">
        <Text style={{ marginRight: 6, fontSize: 14 }}>{quest.icon}</Text>
        <Text
          style={{ ...TYPE.caption, flex: 1, fontWeight: "700", color: DARK.textPrimary }}
          numberOfLines={1}
        >
          {quest.chainName}
        </Text>
        <Text style={{ ...TYPE.caption, color: DARK.textMuted }}>
          {quest.currentStepIndex + 1}/{quest.totalSteps}
        </Text>
      </View>

      {/* Current step */}
      {step ? (
        <>
          <Text style={{ ...TYPE.caption, fontWeight: "500", marginBottom: 4, color: ACCENT.sap }}>
            {step.name}
          </Text>

          {step.objectives.map((obj, i) => (
            <ObjectiveProgress key={`${quest.chainId}-obj-${i}`} objective={obj} />
          ))}

          {/* Claim button */}
          {canClaim && onClaimReward ? (
            <Pressable
              className="mt-1.5 min-h-[44px] items-center justify-center rounded-lg"
              style={{ backgroundColor: ACCENT.amber }}
              onPress={() => onClaimReward(quest.chainId)}
              accessibilityLabel={`Claim reward for ${step.name}`}
            >
              <Text style={{ ...TYPE.caption, fontWeight: "700", color: DARK.bgDeep }}>
                Claim Reward
              </Text>
            </Pressable>
          ) : null}
        </>
      ) : null}
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
      <View className="rounded-lg px-2 py-1" style={HUD_PANEL}>
        <Text
          style={{ ...TYPE.caption, fontWeight: "700", color: DARK.textPrimary }}
          numberOfLines={1}
        >
          {first.icon} {step.name}
        </Text>
        {firstIncomplete && (
          <Text style={{ ...TYPE.caption, color: DARK.textSecondary }} numberOfLines={1}>
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
        <Text style={{ ...TYPE.label, fontWeight: "700", color: DARK.textPrimary }}>Quests</Text>
        {onDismiss ? (
          <Pressable
            className="min-h-[28px] min-w-[28px] items-center justify-center"
            onPress={onDismiss}
            accessibilityLabel="Close quest panel"
          >
            <Text style={{ ...TYPE.label, fontWeight: "700", color: DARK.textPrimary }}>X</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView>
        {quests.map((quest) => (
          <QuestCard key={quest.chainId} quest={quest} onClaimReward={onClaimReward} />
        ))}
      </ScrollView>
    </View>
  );
}
