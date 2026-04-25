import { createEffect, createSignal, For, Show } from "solid-js";
import { actions as gameActions } from "@/actions";
import { COLORS } from "@/config/config";
import { RESOURCE_TYPES, type ResourceType } from "@/config/resources";
import { getDialogueNode, getNpcTemplate } from "@/npcs/NpcManager";
import type { DialogueAction, DialogueNode } from "@/npcs/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/ui/primitives/dialog";
import { showParticle } from "./FloatingParticles";
import { showToast } from "./Toast";

interface NpcDialogueProps {
  open: boolean;
  onClose: () => void;
  npcTemplateId: string | null;
  onOpenTrade?: () => void;
  onOpenSeeds?: () => void;
  overrideDialogueId?: string;
  onDialogueAction?: (actionType: string) => void;
}

export const NpcDialogue = (props: NpcDialogueProps) => {
  const [currentNode, setCurrentNode] = createSignal<DialogueNode | null>(null);
  const template = () =>
    props.npcTemplateId ? getNpcTemplate(props.npcTemplateId) : null;

  createEffect(() => {
    if (props.open) {
      if (props.overrideDialogueId) {
        const overrideNode = getDialogueNode(props.overrideDialogueId);
        setCurrentNode(overrideNode ?? null);
      } else {
        const t = template();
        if (t) {
          const greetingNode = getDialogueNode(t.dialogue.greeting);
          setCurrentNode(greetingNode ?? null);
        }
      }
    } else {
      setCurrentNode(null);
    }
  });

  const executeAction = (action: DialogueAction) => {
    props.onDialogueAction?.(action.type);

    const a = gameActions();
    switch (action.type) {
      case "xp":
        if (action.amount) {
          a.addXp(action.amount);
          showParticle(`+${action.amount} XP`);
        }
        break;
      case "open_trade":
        props.onClose();
        props.onOpenTrade?.();
        break;
      case "open_seeds":
        props.onClose();
        props.onOpenSeeds?.();
        break;
      case "give_resource":
        if (
          action.resource &&
          action.amount &&
          RESOURCE_TYPES.includes(action.resource as ResourceType)
        ) {
          a.addResource(action.resource as ResourceType, action.amount);
          showToast(`Received ${action.amount} ${action.resource}!`, "success");
        }
        break;
      case "give_seed":
        if (action.speciesId && action.amount) {
          a.addSeed(action.speciesId, action.amount);
          showToast(
            `Received ${action.amount} ${action.speciesId} seed(s)!`,
            "success",
          );
        }
        break;
      case "open_quests":
        showToast("Check your quest panel!", "info");
        props.onClose();
        break;
      case "skip_tutorial":
        break;
    }
  };

  const handleChoice = (choiceIndex: number) => {
    const node = currentNode();
    if (!node) return;
    const choice = node.choices[choiceIndex];
    if (!choice) return;

    if (choice.action) {
      executeAction(choice.action);
    }

    if (choice.next) {
      const nextNode = getDialogueNode(choice.next);
      if (nextNode) {
        setCurrentNode(nextNode);
      } else {
        props.onClose();
      }
    } else {
      if (
        !choice.action ||
        (choice.action.type !== "open_trade" &&
          choice.action.type !== "open_seeds")
      ) {
        props.onClose();
      }
    }
  };

  return (
    <Show when={template() && currentNode()}>
      <Dialog open={props.open} onOpenChange={(o) => !o && props.onClose()}>
        <DialogContent
          class="max-w-sm"
          style={{
            background: COLORS.skyMist,
            border: `3px solid ${COLORS.barkBrown}`,
            "border-radius": "16px",
            "box-shadow": "0 8px 32px rgba(0,0,0,0.15)",
          }}
        >
          <DialogHeader>
            <DialogTitle
              class="flex items-center gap-2"
              style={{ color: COLORS.soilDark }}
            >
              <span class="text-xl">{template()?.icon}</span>
              <span>{template()?.name}</span>
              <span
                class="text-xs font-normal ml-auto px-2 py-0.5 rounded-full"
                style={{
                  background: `${COLORS.forestGreen}22`,
                  color: COLORS.forestGreen,
                }}
              >
                {template()?.title}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div
            class="rounded-lg p-3 text-sm leading-relaxed"
            style={{
              background: "rgba(255,255,255,0.7)",
              color: COLORS.soilDark,
              border: `1px solid ${COLORS.barkBrown}33`,
            }}
          >
            <span class="font-medium" style={{ color: COLORS.forestGreen }}>
              {currentNode()?.speaker}:
            </span>{" "}
            {currentNode()?.text}
          </div>

          <div class="space-y-2 mt-2">
            <For each={currentNode()?.choices ?? []}>
              {(choice, i) => (
                <button
                  type="button"
                  class="w-full p-3 rounded-lg text-sm font-medium text-left transition-colors motion-safe:active:scale-[0.98] motion-safe:transition-transform touch-manipulation"
                  style={{
                    background: "rgba(255,255,255,0.5)",
                    border: `1px solid ${COLORS.barkBrown}`,
                    color: COLORS.soilDark,
                    "min-height": "44px",
                  }}
                  onClick={() => handleChoice(i())}
                >
                  {choice.label}
                </button>
              )}
            </For>
          </div>
        </DialogContent>
      </Dialog>
    </Show>
  );
};
