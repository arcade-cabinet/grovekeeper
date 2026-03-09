/**
 * NpcDialogue -- ECS-driven dialogue panel (Spec §15, §33).
 *
 * Self-contained overlay: reads the active dialogue session from the
 * dialogueBridge module, queries ECS for the entity's DialogueComponent,
 * loads the dialogue tree via getDialogueTreeById, and displays:
 *   - Speaker header (NPC name or spirit label)
 *   - Current node text with speaker attribution
 *   - Branch choice buttons with 44px touch targets (via DialogueChoices)
 *   - Auto-advance after 3s via seed-biased branch selection
 *
 * Applies DialogueEffect on each node display via the game store's
 * applyDialogueNodeEffects action (handles start_quest, advance_quest,
 * unlock_species).
 *
 * Bridge API: callers (useSpiritProximity, useBirmotherEncounter, onNpcTap)
 * import openDialogueSession from @/game/ui/dialogueBridge and call it
 * immediately after attaching a DialogueComponent to the ECS entity.
 *
 * Pure functions extracted to NpcDialogue.logic.ts for testability.
 * See GAME_SPEC.md §33.5.
 */

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/ui/text";
import { ACCENT, FONTS, LIGHT, TYPE } from "@/components/ui/tokens";
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
import { getActiveDialogueNode, resolveEntityDisplayName } from "./NpcDialogue.logic.ts";

// ---------------------------------------------------------------------------
// NpcDialogue component
// ---------------------------------------------------------------------------

/**
 * Self-contained ECS-driven dialogue overlay.
 *
 * Mount once inside the game screen (alongside HUD, TutorialOverlay, etc.).
 * No props needed — reads all state from dialogueBridge + ECS.
 *
 * See GAME_SPEC.md §33.5.
 */
export const NpcDialogue = () => {
  // Subscribe to the module-level dialogue session bridge.
  // Re-renders only when openDialogueSession / closeDialogueSession is called.
  const session = useSyncExternalStore(
    subscribeDialogueSession,
    getDialogueSession,
    getDialogueSession,
  );

  // World seed from store for deterministic auto-advance branch selection.
  const worldSeed = useGameStore((s) => s.worldSeed);

  // ---------------------------------------------------------------------------
  // Local state: resolved from ECS on session change
  // ---------------------------------------------------------------------------

  const [speakerName, setSpeakerName] = useState("");
  const [treeId, setTreeId] = useState<string | null>(null);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [nodeIndex, setNodeIndex] = useState(0);

  // Resolve ECS entity + dialogue tree when a new session opens.
  useEffect(() => {
    if (!session) {
      setSpeakerName("");
      setTreeId(null);
      setCurrentNodeId(null);
      setNodeIndex(0);
      return;
    }

    // Find the matching entity in ECS (must have dialogue.inConversation).
    let found: (typeof activeDialogueQuery extends Iterable<infer E> ? E : never) | null = null;
    for (const entity of activeDialogueQuery) {
      if (entity.id === session.entityId && entity.dialogue.inConversation) {
        found = entity;
        break;
      }
    }

    if (!found) {
      // Entity not found or no longer in conversation — dismiss.
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

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const tree = useMemo(() => (treeId ? getDialogueTreeById(treeId) : undefined), [treeId]);

  const currentNode = useMemo(
    () => getActiveDialogueNode(tree, currentNodeId),
    [tree, currentNodeId],
  );

  // ---------------------------------------------------------------------------
  // Node effect application (Spec §33.4)
  // ---------------------------------------------------------------------------

  // Apply dialogue effects when the displayed node changes.
  // Handles start_quest, advance_quest, unlock_species via game store action.
  useEffect(() => {
    if (!currentNode?.effects?.length) return;
    useGameStore.getState().applyDialogueNodeEffects(currentNode.effects);
  }, [currentNode]);

  // ---------------------------------------------------------------------------
  // Close handler (clears ECS flags + dismisses bridge)
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Branch selection handler
  // ---------------------------------------------------------------------------

  const handleBranchSelect = useCallback(
    (branch: DialogueBranch) => {
      if (!tree) return;

      const nextNode = getActiveDialogueNode(tree, branch.targetNodeId);
      if (!nextNode) {
        // Target is terminal or missing — end dialogue.
        handleClose();
        return;
      }

      setCurrentNodeId(branch.targetNodeId);
      setNodeIndex((prev) => prev + 1);
    },
    [tree, handleClose],
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const isVisible = !!(session && currentNode);

  if (!isVisible) return null;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      testID="npc-dialogue-modal"
    >
      <View className="flex-1 justify-end bg-black/20">
        {/* Tap backdrop to close */}
        <Pressable
          className="absolute inset-0"
          onPress={handleClose}
          accessibilityLabel="Close dialogue"
        />

        {/* Dialogue card */}
        <View
          className="mx-3 mb-6 rounded-2xl shadow-lg"
          style={{
            backgroundColor: "rgba(255,255,255,0.92)",
            borderWidth: 2,
            borderColor: LIGHT.borderBranch,
          }}
        >
          {/* Speaker header */}
          <View
            className="flex-row items-center px-4 py-2.5"
            style={{ borderBottomWidth: 1, borderBottomColor: LIGHT.borderBranch }}
          >
            <Text
              style={{
                ...TYPE.body,
                fontFamily: FONTS.heading,
                fontWeight: "700",
                color: ACCENT.sap,
              }}
            >
              {speakerName}
            </Text>
          </View>

          {/* Node text with speaker attribution */}
          <View
            className="px-4 py-3"
            style={{ borderBottomWidth: 1, borderBottomColor: "rgba(102,187,106,0.3)" }}
          >
            <View className="rounded-lg p-3" style={{ backgroundColor: "rgba(232,245,233,0.7)" }}>
              <Text style={{ ...TYPE.body, lineHeight: 20, color: LIGHT.textPrimary }}>
                <Text style={{ fontWeight: "500", color: ACCENT.sap }}>{currentNode.speaker}:</Text>
                {"  "}
                {currentNode.text}
              </Text>
            </View>
          </View>

          {/* Branch choices with 44px touch targets + 3s seed-biased auto-advance */}
          <ScrollView style={{ maxHeight: 220 }} className="px-1 py-1">
            <DialogueChoices
              branches={currentNode.branches}
              visible={isVisible}
              worldSeed={worldSeed || "default"}
              entityId={session.entityId}
              nodeIndex={nodeIndex}
              onBranchSelect={handleBranchSelect}
            />
            {/* Terminal node (no branches): show a farewell button */}
            {currentNode.branches.length === 0 && (
              <Pressable
                className="mx-4 mb-2 min-h-[44px] justify-center rounded-xl px-4 py-2.5 active:opacity-80"
                style={{
                  borderWidth: 2,
                  borderColor: LIGHT.borderBranch,
                  backgroundColor: "rgba(232,245,233,0.6)",
                }}
                onPress={handleClose}
                accessibilityLabel="Close dialogue"
                accessibilityRole="button"
              >
                <Text
                  style={{
                    ...TYPE.body,
                    textAlign: "center",
                    fontWeight: "500",
                    color: LIGHT.textSecondary,
                  }}
                >
                  Farewell
                </Text>
              </Pressable>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
