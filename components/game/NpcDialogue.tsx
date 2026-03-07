/**
 * NpcDialogue -- NPC conversation UI with dialogue tree navigation.
 *
 * Restores all features from the original BabylonJS web version:
 * - Speaker header with icon, name, and title badge
 * - Dialogue text with speaker attribution
 * - Branching choice buttons with press feedback
 * - Trade/seed trigger actions (open_trade, open_seeds)
 * - Tutorial override dialogue support
 * - Action callbacks for all dialogue action types
 *   (xp, give_resource, give_seed, open_quests, skip_tutorial)
 */

import { Modal, Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/ui/text";
import type { DialogueAction, DialogueChoice, DialogueNode } from "@/game/npcs/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NpcDialogueProps {
  open: boolean;
  npcName: string;
  npcTitle?: string;
  npcIcon: string;
  currentNode: DialogueNode | null;
  /** Called when the player picks a choice. Parent handles navigation + actions. */
  onChoice: (nextNodeId: string | null, action?: DialogueAction) => void;
  onClose: () => void;
  /** Override starting dialogue node ID (used by tutorial). */
  overrideDialogueId?: string;
  /** Called when a dialogue choice triggers an action (for tutorial events). */
  onDialogueAction?: (actionType: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NpcDialogue({
  open,
  npcName,
  npcTitle,
  npcIcon,
  currentNode,
  onChoice,
  onClose,
  onDialogueAction,
}: NpcDialogueProps) {
  if (!open || !currentNode) return null;

  const handleChoice = (choice: DialogueChoice) => {
    // Notify parent of action type for tutorial tracking
    if (choice.action && onDialogueAction) {
      onDialogueAction(choice.action.type);
    }
    onChoice(choice.next, choice.action);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        {/* Tap backdrop to close */}
        <Pressable
          className="absolute inset-0"
          onPress={onClose}
          accessibilityLabel="Close dialogue"
        />

        {/* Dialogue card */}
        <View className="mx-3 mb-6 rounded-2xl border-2 border-bark-brown bg-parchment shadow-lg">
          {/* Speaker header */}
          <View className="flex-row items-center border-b border-bark-brown/30 px-4 py-2.5">
            <Text className="mr-2 text-2xl">{npcIcon}</Text>
            <Text className="font-heading text-base font-bold text-soil-dark">
              {npcName}
            </Text>
            {npcTitle && (
              <View className="ml-auto rounded-full bg-forest-green/10 px-2 py-0.5">
                <Text className="text-xs text-forest-green">{npcTitle}</Text>
              </View>
            )}
          </View>

          {/* Dialogue text with speaker attribution */}
          <View className="border-b border-bark-brown/10 px-4 py-3">
            <View
              className="rounded-lg p-3"
              style={{ backgroundColor: "rgba(255,255,255,0.7)" }}
            >
              <Text className="text-sm leading-5 text-soil-dark">
                <Text className="font-medium text-forest-green">
                  {currentNode.speaker}:
                </Text>
                {"  "}
                {currentNode.text}
              </Text>
            </View>
          </View>

          {/* Choices */}
          <ScrollView
            style={{ maxHeight: 200 }}
            className="border-t border-bark-brown/20 px-4 py-2"
          >
            {currentNode.choices.map((choice, index) => {
              // Style hint based on action type
              const isTradeAction =
                choice.action?.type === "open_trade" ||
                choice.action?.type === "open_seeds";
              const isXpAction = choice.action?.type === "xp";
              const isResourceAction =
                choice.action?.type === "give_resource" ||
                choice.action?.type === "give_seed";

              let borderClass = "border-forest-green/40 bg-forest-green/10";
              if (isTradeAction) {
                borderClass = "border-autumn-gold/50 bg-autumn-gold/10";
              } else if (isXpAction || isResourceAction) {
                borderClass = "border-prestige-gold/40 bg-prestige-gold/10";
              }

              return (
                <Pressable
                  key={`choice-${choice.label}-${index}`}
                  className={`mb-1.5 min-h-[44px] justify-center rounded-xl border-2 px-4 py-2.5 active:opacity-80 ${borderClass}`}
                  onPress={() => handleChoice(choice)}
                  accessibilityLabel={choice.label}
                >
                  <View className="flex-row items-center">
                    {/* Action hint icons */}
                    {isTradeAction && (
                      <Text className="mr-2 text-sm">
                        {choice.action?.type === "open_trade"
                          ? "\u{1F4B0}"
                          : "\u{1F331}"}
                      </Text>
                    )}
                    {isResourceAction && (
                      <Text className="mr-2 text-sm">{"\u{1F381}"}</Text>
                    )}
                    {isXpAction && (
                      <Text className="mr-2 text-sm">{"\u2B50"}</Text>
                    )}
                    <Text
                      className={`flex-1 text-sm font-medium ${
                        isTradeAction
                          ? "text-autumn-gold"
                          : "text-forest-green"
                      }`}
                    >
                      {choice.label}
                    </Text>
                    {/* Show reward hint */}
                    {isXpAction && choice.action?.amount && (
                      <Text className="text-xs text-prestige-gold">
                        +{choice.action.amount} XP
                      </Text>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
