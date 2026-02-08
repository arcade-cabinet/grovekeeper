/**
 * NpcDialogue — Modal dialogue UI for NPC conversations.
 *
 * Displays the current dialogue node with speaker info and
 * choice buttons. Choices can advance to next node, trigger
 * game actions (XP, open trade, etc.), or end the conversation.
 */

import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { COLORS } from "../constants/config";
import { RESOURCE_TYPES, type ResourceType } from "../constants/resources";
import { getDialogueNode, getNpcTemplate } from "../npcs/NpcManager";
import type { DialogueAction, DialogueNode } from "../npcs/types";
import { useGameStore } from "../stores/gameStore";
import { showParticle } from "./FloatingParticles";
import { showToast } from "./Toast";

interface NpcDialogueProps {
  open: boolean;
  onClose: () => void;
  npcTemplateId: string | null;
  onOpenTrade?: () => void;
  onOpenSeeds?: () => void;
}

export const NpcDialogue = ({
  open,
  onClose,
  npcTemplateId,
  onOpenTrade,
  onOpenSeeds,
}: NpcDialogueProps) => {
  const [currentNode, setCurrentNode] = useState<DialogueNode | null>(null);
  const template = npcTemplateId ? getNpcTemplate(npcTemplateId) : null;

  // Reset to greeting when opened with a new NPC
  useEffect(() => {
    if (open && template) {
      const greetingNode = getDialogueNode(template.dialogue.greeting);
      setCurrentNode(greetingNode ?? null);
    } else if (!open) {
      setCurrentNode(null);
    }
  }, [open, template]);

  const executeAction = useCallback(
    (action: DialogueAction) => {
      const store = useGameStore.getState();
      switch (action.type) {
        case "xp":
          if (action.amount) {
            store.addXp(action.amount);
            showParticle(`+${action.amount} XP`);
          }
          break;
        case "open_trade":
          onClose();
          onOpenTrade?.();
          break;
        case "open_seeds":
          onClose();
          onOpenSeeds?.();
          break;
        case "give_resource":
          if (
            action.resource &&
            action.amount &&
            RESOURCE_TYPES.includes(action.resource as ResourceType)
          ) {
            store.addResource(action.resource as ResourceType, action.amount);
            showToast(
              `Received ${action.amount} ${action.resource}!`,
              "success",
            );
          }
          break;
        case "give_seed":
          if (action.speciesId && action.amount) {
            store.addSeed(action.speciesId, action.amount);
            showToast(
              `Received ${action.amount} ${action.speciesId} seed(s)!`,
              "success",
            );
          }
          break;
        case "open_quests":
          // TODO: wire to quest panel when quest UI is built
          showToast("New quest available!", "info");
          break;
      }
    },
    [onClose, onOpenTrade, onOpenSeeds],
  );

  const handleChoice = useCallback(
    (choiceIndex: number) => {
      if (!currentNode) return;
      const choice = currentNode.choices[choiceIndex];
      if (!choice) return;

      // Execute action if present
      if (choice.action) {
        executeAction(choice.action);
      }

      // Navigate to next node or close
      if (choice.next) {
        const nextNode = getDialogueNode(choice.next);
        if (nextNode) {
          setCurrentNode(nextNode);
        } else {
          onClose();
        }
      } else {
        // action-based closes (open_trade, open_seeds) already called onClose
        if (
          !choice.action ||
          (choice.action.type !== "open_trade" &&
            choice.action.type !== "open_seeds")
        ) {
          onClose();
        }
      }
    },
    [currentNode, executeAction, onClose],
  );

  if (!template || !currentNode) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-sm"
        style={{
          background: COLORS.skyMist,
          border: `2px solid ${COLORS.barkBrown}`,
        }}
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle
            className="flex items-center gap-2"
            style={{ color: COLORS.soilDark }}
          >
            <span className="text-xl">{template.icon}</span>
            <span>{template.name}</span>
            <span
              className="text-xs font-normal ml-auto px-2 py-0.5 rounded-full"
              style={{
                background: `${COLORS.forestGreen}22`,
                color: COLORS.forestGreen,
              }}
            >
              {template.title}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Dialogue text */}
        <div
          className="rounded-lg p-3 text-sm leading-relaxed"
          style={{
            background: "rgba(255,255,255,0.7)",
            color: COLORS.soilDark,
            border: `1px solid ${COLORS.barkBrown}33`,
          }}
        >
          <span className="font-medium" style={{ color: COLORS.forestGreen }}>
            {currentNode.speaker}:
          </span>{" "}
          {currentNode.text}
        </div>

        {/* Choice buttons */}
        <div className="space-y-2 mt-2">
          {currentNode.choices.map((choice, i) => (
            <button
              key={`${currentNode.id}-${i}`}
              className="w-full p-3 rounded-lg text-sm font-medium text-left transition-colors motion-safe:active:scale-[0.98] motion-safe:transition-transform touch-manipulation"
              style={{
                background: "rgba(255,255,255,0.5)",
                border: `1px solid ${COLORS.barkBrown}`,
                color: COLORS.soilDark,
                minHeight: 44,
              }}
              onClick={() => handleChoice(i)}
            >
              {choice.label}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
