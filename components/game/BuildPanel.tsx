/**
 * BuildPanel -- Modal overlay for selecting and placing structures.
 *
 * Shows available structures (filtered by player level), their costs,
 * and effects. Selecting a structure enters placement mode.
 */

import { Modal, Pressable, ScrollView, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import type { ResourceType } from "@/game/config/resources";
import type { StructureTemplate } from "@/game/structures/types";

export interface BuildPanelProps {
  open: boolean;
  level: number;
  resources: Record<ResourceType, number>;
  templates: StructureTemplate[];
  onSelectStructure: (template: StructureTemplate) => void;
  onClose: () => void;
}

function canAfford(
  template: StructureTemplate,
  resources: Record<ResourceType, number>,
): boolean {
  for (const [resource, amount] of Object.entries(template.cost)) {
    if ((resources[resource as ResourceType] ?? 0) < amount) return false;
  }
  return true;
}

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

export function BuildPanel({
  open,
  resources,
  templates,
  onSelectStructure,
  onClose,
}: BuildPanelProps) {
  const handleSelect = (template: StructureTemplate) => {
    if (!canAfford(template, resources)) return;
    onSelectStructure(template);
    onClose();
  };

  if (!open) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <Pressable
          className="absolute inset-0"
          onPress={onClose}
          accessibilityLabel="Close build panel"
        />

        <View className="max-h-[70%] rounded-t-2xl border-t-2 border-bark-brown bg-parchment pb-8">
          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-bark-brown/30 px-4 py-3">
            <Text className="font-heading text-lg font-bold text-forest-green">
              Build Structure
            </Text>
            <Pressable
              className="min-h-[44px] min-w-[44px] items-center justify-center"
              onPress={onClose}
              accessibilityLabel="Close"
            >
              <Text className="text-lg font-bold text-soil-dark">X</Text>
            </Pressable>
          </View>

          {/* Structure list */}
          <ScrollView className="px-4 py-2">
            {templates.length === 0 && (
              <Text className="py-8 text-center text-sm text-soil-dark">
                No structures available yet. Level up!
              </Text>
            )}

            {templates.map((template) => {
              const affordable = canAfford(template, resources);
              return (
                <Pressable
                  key={template.id}
                  className="mb-2 flex-row items-start gap-3 rounded-xl border-2 px-3 py-3"
                  style={{
                    backgroundColor: affordable ? "white" : "#f0ece4",
                    borderColor: affordable ? "#2D5A27" : "#ccc",
                    opacity: affordable ? 1 : 0.6,
                  }}
                  onPress={() => handleSelect(template)}
                  disabled={!affordable}
                  accessibilityLabel={`${template.name}, level ${template.requiredLevel} required`}
                >
                  {/* Icon */}
                  <Text className="mt-0.5 flex-shrink-0 text-2xl">
                    {template.icon}
                  </Text>

                  {/* Info */}
                  <View className="min-w-0 flex-1">
                    <Text className="text-sm font-semibold text-soil-dark">
                      {template.name}
                    </Text>
                    <Text className="mt-0.5 text-xs text-bark-brown">
                      {template.description}
                    </Text>

                    {/* Cost tags */}
                    <View className="mt-1.5 flex-row flex-wrap gap-1.5">
                      {Object.entries(template.cost).map(([res, amount]) => (
                        <View
                          key={res}
                          className="rounded-full px-1.5 py-0.5"
                          style={{ backgroundColor: "rgba(45,90,39,0.13)" }}
                        >
                          <Text className="text-[10px] text-forest-green">
                            {amount} {res}
                          </Text>
                        </View>
                      ))}
                    </View>

                    {/* Effect description */}
                    {template.effect && (
                      <Text className="mt-1 text-[10px] text-forest-green">
                        {formatEffect(template.effect)}
                      </Text>
                    )}
                  </View>

                  {/* Level badge */}
                  <View
                    className="flex-shrink-0 rounded-full px-1.5 py-0.5"
                    style={{ backgroundColor: "rgba(93,64,55,0.13)" }}
                  >
                    <Text className="text-[10px] text-bark-brown">
                      Lv{template.requiredLevel}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Cancel button */}
          <View className="px-4">
            <Button
              className="min-h-[44px] w-full rounded-xl border-2 border-bark-brown bg-transparent"
              variant="outline"
              onPress={onClose}
            >
              <Text className="font-bold text-bark-brown">Cancel</Text>
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
