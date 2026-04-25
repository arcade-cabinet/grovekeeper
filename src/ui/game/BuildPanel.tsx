import { For, Show } from "solid-js";
import { COLORS } from "@/config/config";
import type { ResourceType } from "@/config/resources";
import { useTrait } from "@/ecs/solid";
import { koota } from "@/koota";
import { getAvailableTemplates } from "@/structures/StructureManager";
import type { StructureTemplate } from "@/structures/types";
import { PlayerProgress, Resources } from "@/traits";
import { Button } from "@/ui/primitives/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/ui/primitives/dialog";

interface BuildPanelProps {
  open: boolean;
  onClose: () => void;
  onSelectStructure: (template: StructureTemplate) => void;
}

export const BuildPanel = (props: BuildPanelProps) => {
  const progress = useTrait(koota, PlayerProgress);
  const resourcesAccessor = useTrait(koota, Resources);
  const level = () => progress()?.level ?? 1;
  const resources = () =>
    resourcesAccessor() ?? { timber: 0, sap: 0, fruit: 0, acorns: 0 };
  const templates = () => getAvailableTemplates(level());

  const canAfford = (template: StructureTemplate): boolean => {
    for (const [resource, amount] of Object.entries(template.cost)) {
      if ((resources()[resource as ResourceType] ?? 0) < amount) return false;
    }
    return true;
  };

  const handleSelect = (template: StructureTemplate) => {
    if (!canAfford(template)) return;
    props.onSelectStructure(template);
    props.onClose();
  };

  return (
    <Dialog open={props.open} onOpenChange={(v) => !v && props.onClose()}>
      <DialogContent
        class="max-w-sm mx-auto"
        style={{
          background: COLORS.parchment,
          border: `3px solid ${COLORS.barkBrown}`,
          "border-radius": "16px",
        }}
      >
        <DialogHeader>
          <DialogTitle
            class="text-lg font-bold text-center"
            style={{
              color: COLORS.forestGreen,
              "font-family": "var(--font-heading)",
            }}
          >
            Build Structure
          </DialogTitle>
        </DialogHeader>

        <div class="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          <Show when={templates().length === 0}>
            <p
              class="text-sm text-center py-4"
              style={{ color: COLORS.soilDark }}
            >
              No structures available yet. Level up!
            </p>
          </Show>

          <For each={templates()}>
            {(template) => {
              const affordable = () => canAfford(template);
              return (
                <button
                  type="button"
                  class="w-full flex items-start gap-3 p-3 rounded-xl transition-colors"
                  style={{
                    background: affordable() ? "white" : "#f0ece4",
                    border: `2px solid ${affordable() ? COLORS.forestGreen : "#ccc"}`,
                    opacity: affordable() ? 1 : 0.6,
                    cursor: affordable() ? "pointer" : "not-allowed",
                  }}
                  onClick={() => handleSelect(template)}
                  disabled={!affordable()}
                >
                  <span
                    class="text-2xl flex-shrink-0 mt-0.5"
                    aria-hidden="true"
                  >
                    {template.icon}
                  </span>
                  <div class="text-left flex-1 min-w-0">
                    <div
                      class="font-semibold text-sm"
                      style={{ color: COLORS.soilDark }}
                    >
                      {template.name}
                    </div>
                    <div
                      class="text-xs mt-0.5"
                      style={{ color: COLORS.barkBrown }}
                    >
                      {template.description}
                    </div>
                    <div class="flex flex-wrap gap-1.5 mt-1.5">
                      <For each={Object.entries(template.cost)}>
                        {([res, amount]) => (
                          <span
                            class="text-[10px] px-1.5 py-0.5 rounded-full"
                            style={{
                              background: `${COLORS.forestGreen}20`,
                              color: COLORS.forestGreen,
                            }}
                          >
                            {amount} {res}
                          </span>
                        )}
                      </For>
                    </div>
                    <Show when={template.effect}>
                      <div
                        class="text-[10px] mt-1"
                        style={{ color: COLORS.forestGreen }}
                      >
                        {formatEffect(
                          template.effect as NonNullable<
                            StructureTemplate["effect"]
                          >,
                        )}
                      </div>
                    </Show>
                  </div>
                  <span
                    class="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0"
                    style={{
                      background: `${COLORS.barkBrown}20`,
                      color: COLORS.barkBrown,
                    }}
                  >
                    Lv{template.requiredLevel}
                  </span>
                </button>
              );
            }}
          </For>
        </div>

        <Button
          class="w-full mt-2"
          variant="outline"
          onClick={props.onClose}
          style={{
            "border-color": COLORS.barkBrown,
            color: COLORS.barkBrown,
          }}
        >
          Cancel
        </Button>
      </DialogContent>
    </Dialog>
  );
};

function formatEffect(
  effect: NonNullable<StructureTemplate["effect"]>,
): string {
  const pct = Math.round(effect.magnitude * 100);
  switch (effect.type) {
    case "growth_boost":
      return `+${pct}% growth within ${effect.radius} tiles`;
    case "harvest_boost":
      return `+${pct}% harvest within ${effect.radius} tiles`;
    case "stamina_regen":
      return `-${pct}% stamina cost within ${effect.radius} tiles`;
    case "storage":
      return `+${pct}% storage within ${effect.radius} tiles`;
  }
}
