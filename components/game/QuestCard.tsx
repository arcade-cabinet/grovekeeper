/**
 * QuestCard + ObjectiveProgress -- Quest display subcomponents (Spec SS14.4).
 *
 * Extracted from QuestPanel.tsx to keep both files under 300 lines.
 * Dark forest RPG aesthetic with golden accents and checkmark indicators.
 */

import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";
import { ACCENT, FONTS, TYPE } from "@/components/ui/tokens";
import type { ActiveQuestDisplay, QuestObjectiveDisplay } from "./QuestPanel.tsx";

// ---------------------------------------------------------------------------
// Objective progress row
// ---------------------------------------------------------------------------

export function ObjectiveProgress({ objective }: { objective: QuestObjectiveDisplay }) {
  const pct =
    objective.target > 0
      ? Math.min(100, Math.round((objective.current / objective.target) * 100))
      : 0;

  return (
    <View style={{ marginBottom: 6 }}>
      <View className="flex-row items-center">
        {/* Checkmark / circle indicator */}
        <View
          style={{
            width: 16,
            height: 16,
            borderRadius: 8,
            borderWidth: 1.5,
            borderColor: objective.completed ? ACCENT.sap : "rgba(255,213,79,0.3)",
            backgroundColor: objective.completed ? ACCENT.sap : "transparent",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 8,
          }}
        >
          {objective.completed ? (
            <Text style={{ fontSize: 9, color: "#fff", fontWeight: "700" }}>{"\u2713"}</Text>
          ) : null}
        </View>

        <Text
          style={{
            ...TYPE.caption,
            flex: 1,
            color: objective.completed ? "rgba(232,245,233,0.5)" : "rgba(232,245,233,0.85)",
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
            fontFamily: FONTS.data,
            marginLeft: 8,
            color: objective.completed ? ACCENT.sap : ACCENT.gold,
          }}
        >
          {objective.current}/{objective.target}
        </Text>
      </View>

      {/* Progress bar */}
      <View
        className="mt-1 h-1.5 overflow-hidden rounded-full"
        style={{ backgroundColor: "rgba(232,245,233,0.08)", marginLeft: 24 }}
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
// Quest card
// ---------------------------------------------------------------------------

export function QuestCard({
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
      className="mb-2 rounded-xl px-3 py-3"
      style={{
        backgroundColor: "rgba(232,245,233,0.04)",
        borderWidth: 1,
        borderColor: canClaim ? ACCENT.gold : "rgba(255,213,79,0.15)",
        ...(canClaim
          ? {
              shadowColor: ACCENT.gold,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.2,
              shadowRadius: 6,
            }
          : {}),
      }}
    >
      {/* Header */}
      <View className="mb-2 flex-row items-center">
        <Text style={{ marginRight: 6, fontSize: 14 }}>{quest.icon}</Text>
        <Text
          style={{
            ...TYPE.caption,
            flex: 1,
            fontWeight: "700",
            fontFamily: FONTS.heading,
            color: ACCENT.gold,
          }}
          numberOfLines={1}
        >
          {quest.chainName}
        </Text>
        <View
          className="rounded-full px-2 py-0.5"
          style={{ backgroundColor: "rgba(255,213,79,0.1)" }}
        >
          <Text
            style={{
              ...TYPE.caption,
              fontFamily: FONTS.data,
              fontWeight: "600",
              color: "rgba(232,245,233,0.5)",
              fontSize: 10,
            }}
          >
            {quest.currentStepIndex + 1}/{quest.totalSteps}
          </Text>
        </View>
      </View>

      {/* Current step */}
      {step ? (
        <>
          <Text
            style={{
              ...TYPE.caption,
              fontWeight: "600",
              marginBottom: 6,
              color: "rgba(232,245,233,0.7)",
            }}
          >
            {step.name}
          </Text>

          {step.objectives.map((obj, i) => (
            <ObjectiveProgress key={`${quest.chainId}-obj-${i}`} objective={obj} />
          ))}

          {/* Claim button */}
          {canClaim && onClaimReward ? (
            <Pressable
              className="mt-2 min-h-[44px] items-center justify-center rounded-lg active:opacity-80"
              style={{
                backgroundColor: ACCENT.gold,
                shadowColor: ACCENT.gold,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 6,
              }}
              onPress={() => onClaimReward(quest.chainId)}
              accessibilityLabel={`Claim reward for ${step.name}`}
            >
              <Text
                style={{
                  ...TYPE.caption,
                  fontWeight: "700",
                  fontFamily: FONTS.heading,
                  color: "rgba(15,45,20,0.95)",
                }}
              >
                Claim Reward
              </Text>
            </Pressable>
          ) : null}
        </>
      ) : null}
    </View>
  );
}
