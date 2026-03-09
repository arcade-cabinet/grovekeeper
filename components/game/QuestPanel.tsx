/**
 * QuestPanel -- Active quest tracker sidebar (Spec SS14.4).
 * ConnectedQuestPanel reads from ECS questBranchQuery + Legend State.
 * mapQuestBranchToDisplay is the pure mapping function (exported for tests).
 *
 * Dark forest RPG aesthetic:
 *   - Quest cards with golden border for active quest (QuestCard subcomponent)
 *   - Objective checklist with checkmark styling (ObjectiveProgress)
 *   - Progress bars with sap/amber coloring
 *   - Compact mode for HUD overlay
 */

import { useEffect, useRef } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/ui/text";
import { ACCENT, FONTS, TYPE } from "@/components/ui/tokens";
import type { QuestBranchComponent } from "@/game/ecs/components/dialogue";
import { questBranchQuery } from "@/game/ecs/world";
import {
  getChainDef,
  getCurrentStep,
  getCurrentStepProgress,
} from "@/game/quests/questChainEngine";
import type { QuestChainState } from "@/game/quests/types";
import { useGameStore } from "@/game/stores";
import { QuestCard } from "./QuestCard.tsx";
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
 * Pure function -- safe to call in tests without React context.
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
      icon: def?.icon ?? "\u{1F4DC}",
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
// Panel
// ---------------------------------------------------------------------------

export function QuestPanel({ quests, onClaimReward, onDismiss, compact = false }: QuestPanelProps) {
  if (quests.length === 0) return null;

  if (compact) {
    const first = quests[0];
    const step = first.currentStep;
    if (!step) return null;

    const firstIncomplete = step.objectives.find((o) => !o.completed);

    return (
      <View
        className="rounded-lg px-3 py-2"
        style={{
          backgroundColor: "rgba(15,45,20,0.85)",
          borderWidth: 1,
          borderColor: "rgba(255,213,79,0.2)",
        }}
      >
        <Text
          style={{
            ...TYPE.caption,
            fontWeight: "700",
            fontFamily: FONTS.heading,
            color: ACCENT.gold,
          }}
          numberOfLines={1}
        >
          {first.icon} {step.name}
        </Text>
        {firstIncomplete && (
          <Text
            style={{ ...TYPE.caption, fontFamily: FONTS.data, color: "rgba(232,245,233,0.6)" }}
            numberOfLines={1}
          >
            {firstIncomplete.description}: {firstIncomplete.current}/{firstIncomplete.target}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View
      className="max-h-[320px] w-[220px] overflow-hidden rounded-xl"
      style={{
        backgroundColor: "rgba(15,45,20,0.9)",
        borderWidth: 1,
        borderColor: "rgba(255,213,79,0.2)",
      }}
    >
      {/* Header */}
      <View
        className="flex-row items-center justify-between px-3 py-2"
        style={{ borderBottomWidth: 1, borderBottomColor: "rgba(255,213,79,0.15)" }}
      >
        <Text
          style={{
            ...TYPE.label,
            fontWeight: "700",
            fontFamily: FONTS.heading,
            color: ACCENT.gold,
          }}
        >
          Quests
        </Text>
        {onDismiss ? (
          <Pressable
            className="min-h-[28px] min-w-[28px] items-center justify-center"
            onPress={onDismiss}
            accessibilityLabel="Close quest panel"
          >
            <Text style={{ ...TYPE.label, fontWeight: "700", color: ACCENT.gold }}>X</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView className="px-2 py-2">
        {quests.map((quest) => (
          <QuestCard key={quest.chainId} quest={quest} onClaimReward={onClaimReward} />
        ))}
      </ScrollView>
    </View>
  );
}
