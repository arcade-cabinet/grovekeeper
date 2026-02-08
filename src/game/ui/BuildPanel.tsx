/**
 * BuildPanel — Modal overlay for selecting and placing structures.
 *
 * Shows available structures (filtered by player level), their costs,
 * and effects. Selecting a structure enters placement mode.
 */

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { COLORS } from "../constants/config";
import type { ResourceType } from "../constants/resources";
import { useGameStore } from "../stores/gameStore";
import { getAvailableTemplates } from "../structures/StructureManager";
import type { StructureTemplate } from "../structures/types";

interface BuildPanelProps {
  open: boolean;
  onClose: () => void;
  onSelectStructure: (template: StructureTemplate) => void;
}

export const BuildPanel = ({ open, onClose, onSelectStructure }: BuildPanelProps) => {
  const { level, resources } = useGameStore();
  const templates = getAvailableTemplates(level);

  const canAfford = (template: StructureTemplate): boolean => {
    for (const [resource, amount] of Object.entries(template.cost)) {
      if ((resources[resource as ResourceType] ?? 0) < amount) return false;
    }
    return true;
  };

  const handleSelect = (template: StructureTemplate) => {
    if (!canAfford(template)) return;
    onSelectStructure(template);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent
        className="max-w-sm mx-auto"
        style={{
          background: "#F5F0E3",
          border: `3px solid ${COLORS.barkBrown}`,
          borderRadius: 16,
        }}
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle
            className="text-lg font-bold text-center"
            style={{ color: COLORS.forestGreen, fontFamily: "var(--font-heading)" }}
          >
            Build Structure
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {templates.length === 0 && (
            <p className="text-sm text-center py-4" style={{ color: COLORS.soilDark }}>
              No structures available yet. Level up!
            </p>
          )}

          {templates.map((template) => {
            const affordable = canAfford(template);
            return (
              <button
                key={template.id}
                className="w-full flex items-start gap-3 p-3 rounded-xl transition-colors"
                style={{
                  background: affordable ? "white" : "#f0ece4",
                  border: `2px solid ${affordable ? COLORS.forestGreen : "#ccc"}`,
                  opacity: affordable ? 1 : 0.6,
                  cursor: affordable ? "pointer" : "not-allowed",
                }}
                onClick={() => handleSelect(template)}
                disabled={!affordable}
              >
                <span className="text-2xl flex-shrink-0 mt-0.5">{template.icon}</span>
                <div className="text-left flex-1 min-w-0">
                  <div className="font-semibold text-sm" style={{ color: COLORS.soilDark }}>
                    {template.name}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: COLORS.barkBrown }}>
                    {template.description}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {Object.entries(template.cost).map(([res, amount]) => (
                      <span
                        key={res}
                        className="text-[10px] px-1.5 py-0.5 rounded-full"
                        style={{
                          background: `${COLORS.forestGreen}20`,
                          color: COLORS.forestGreen,
                        }}
                      >
                        {amount} {res}
                      </span>
                    ))}
                  </div>
                  {template.effect && (
                    <div className="text-[10px] mt-1" style={{ color: COLORS.forestGreen }}>
                      {formatEffect(template.effect)}
                    </div>
                  )}
                </div>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0"
                  style={{
                    background: `${COLORS.barkBrown}20`,
                    color: COLORS.barkBrown,
                  }}
                >
                  Lv{template.requiredLevel}
                </span>
              </button>
            );
          })}
        </div>

        <Button
          className="w-full mt-2"
          variant="outline"
          onClick={onClose}
          style={{ borderColor: COLORS.barkBrown, color: COLORS.barkBrown }}
        >
          Cancel
        </Button>
      </DialogContent>
    </Dialog>
  );
};

function formatEffect(effect: NonNullable<StructureTemplate["effect"]>): string {
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
