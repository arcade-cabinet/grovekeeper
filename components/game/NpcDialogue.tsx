/**
 * NpcDialogue -- ECS-driven RPG dialogue overlay (Spec SS15, SS33).
 * Portrait circle, typing animation, bouncing arrow, branch choices.
 * Pure functions in NpcDialogue.logic.ts; hooks in dialogueHooks.ts.
 */

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Animated, Modal, Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/ui/text";
import type { DialogueBranch } from "@/game/ecs/components/dialogue";
import { activeDialogueQuery } from "@/game/ecs/world";
import { useGameStore } from "@/game/stores";
import { getDialogueTreeById } from "@/game/systems/dialogueLoader";
import {
  closeDialogueSession,
  getDialogueSession,
  subscribeDialogueSession,
} from "@/game/ui/dialogueBridge";
import { DialogueChoices } from "./DialogueChoices.tsx";
import { portraitBgColor, portraitColor } from "./dialogueAnimations.ts";
import { useBounceAnim, useTypingText } from "./dialogueHooks.ts";
import { getActiveDialogueNode, resolveEntityDisplayName } from "./NpcDialogue.logic.ts";
import { dialogueStyles as ds } from "./npcDialogueStyles.ts";

/** Self-contained ECS-driven dialogue overlay. See GAME_SPEC.md SS33.5. */
export const NpcDialogue = () => {
  const session = useSyncExternalStore(
    subscribeDialogueSession,
    getDialogueSession,
    getDialogueSession,
  );

  const worldSeed = useGameStore((s) => s.worldSeed);
  const [speakerName, setSpeakerName] = useState("");
  const [treeId, setTreeId] = useState<string | null>(null);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [nodeIndex, setNodeIndex] = useState(0);

  useEffect(() => {
    if (!session) {
      setSpeakerName("");
      setTreeId(null);
      setCurrentNodeId(null);
      setNodeIndex(0);
      return;
    }

    let found: (typeof activeDialogueQuery extends Iterable<infer E> ? E : never) | null = null;
    for (const entity of activeDialogueQuery) {
      if (entity.id === session.entityId && entity.dialogue.inConversation) {
        found = entity;
        break;
      }
    }

    if (!found) {
      closeDialogueSession();
      return;
    }

    const name = resolveEntityDisplayName(found.npc, found.grovekeeperSpirit, session.entityId);
    const tid = found.dialogue.activeTreeId;
    const tree = tid ? getDialogueTreeById(tid) : undefined;

    setSpeakerName(name);
    setTreeId(tid);
    setCurrentNodeId(tree?.entryNodeId ?? null);
    setNodeIndex(0);
  }, [session]);

  const tree = useMemo(() => (treeId ? getDialogueTreeById(treeId) : undefined), [treeId]);

  const currentNode = useMemo(
    () => getActiveDialogueNode(tree, currentNodeId),
    [tree, currentNodeId],
  );
  const nodeText = currentNode?.text ?? "";
  const { displayText, complete: typingDone, skipToEnd } = useTypingText(nodeText);
  const bounceAnim = useBounceAnim();

  const bounceTranslateY = bounceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 4],
  });

  // Apply dialogue effects (Spec SS33.4)
  useEffect(() => {
    if (!currentNode?.effects?.length) return;
    useGameStore.getState().applyDialogueNodeEffects(currentNode.effects);
  }, [currentNode]);

  const handleClose = useCallback(() => {
    if (session) {
      for (const entity of activeDialogueQuery) {
        if (entity.id === session.entityId) {
          entity.dialogue.inConversation = false;
          entity.dialogue.bubbleVisible = false;
        }
      }
    }
    closeDialogueSession();
  }, [session]);

  const handleBranchSelect = useCallback(
    (branch: DialogueBranch) => {
      if (!tree) return;

      const nextNode = getActiveDialogueNode(tree, branch.targetNodeId);
      if (!nextNode) {
        handleClose();
        return;
      }

      setCurrentNodeId(branch.targetNodeId);
      setNodeIndex((prev) => prev + 1);
    },
    [tree, handleClose],
  );

  const handleTextTap = useCallback(() => {
    if (!typingDone) {
      skipToEnd();
    }
  }, [typingDone, skipToEnd]);

  const isVisible = !!(session && currentNode);

  if (!isVisible) return null;

  const initial = speakerName.charAt(0).toUpperCase();
  const borderCol = portraitColor(speakerName);
  const bgCol = portraitBgColor(speakerName);

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      testID="npc-dialogue-modal"
    >
      <View style={ds.backdrop}>
        <Pressable
          style={ds.backdropTap}
          onPress={handleClose}
          accessibilityLabel="Close dialogue"
        />

        <View style={ds.card}>
          <View style={ds.tail} />

          {/* Speaker header with portrait */}
          <View style={ds.header}>
            <View style={[ds.portrait, { borderColor: borderCol, backgroundColor: bgCol }]}>
              <Text style={[ds.portraitLetter, { color: borderCol }]}>{initial}</Text>
            </View>
            <View style={ds.nameContainer}>
              <Text style={ds.name}>{speakerName}</Text>
              <View style={ds.nameUnderline} />
            </View>
          </View>

          {/* Dialogue text with typing animation */}
          <Pressable style={ds.textArea} onPress={handleTextTap}>
            <View style={ds.textBubble}>
              <Text style={ds.bodyText}>
                <Text style={ds.speakerPrefix}>{currentNode.speaker}:</Text>
                {"  "}
                {displayText}
              </Text>
              {typingDone && currentNode.branches.length === 0 && (
                <View style={ds.bounceContainer}>
                  <Animated.View style={{ transform: [{ translateY: bounceTranslateY }] }}>
                    <Text style={ds.bounceArrow}>{"\u25BC"}</Text>
                  </Animated.View>
                </View>
              )}
            </View>
          </Pressable>

          {/* Branch choices or farewell */}
          {typingDone && (
            <ScrollView style={ds.choicesScroll} className="px-1 pb-2">
              <DialogueChoices
                branches={currentNode.branches}
                visible={isVisible}
                worldSeed={worldSeed || "default"}
                entityId={session.entityId}
                nodeIndex={nodeIndex}
                onBranchSelect={handleBranchSelect}
              />
              {currentNode.branches.length === 0 && (
                <Pressable
                  style={ds.farewell}
                  onPress={handleClose}
                  accessibilityLabel="Close dialogue"
                  accessibilityRole="button"
                >
                  <Text style={ds.farewellText}>Farewell</Text>
                </Pressable>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};
