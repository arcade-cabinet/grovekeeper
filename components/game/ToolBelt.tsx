import type { LucideIcon } from "lucide-react-native";
import {
  AxeIcon,
  BookOpenIcon,
  DropletsIcon,
  RecycleIcon,
  ScissorsIcon,
  ShovelIcon,
  SproutIcon,
  WrenchIcon,
} from "lucide-react-native";
import { Pressable, View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

export interface Tool {
  id: string;
  name: string;
  unlockLevel: number;
}

export interface ToolBeltProps {
  tools: Tool[];
  selectedTool: string;
  unlockedTools: string[];
  level: number;
  selectedSpecies?: string;
  seedCount?: number;
  onSelectTool: (toolId: string) => void;
}

const TOOL_ICONS: Record<string, LucideIcon> = {
  trowel: ShovelIcon,
  "watering-can": DropletsIcon,
  almanac: BookOpenIcon,
  "pruning-shears": ScissorsIcon,
  "seed-pouch": SproutIcon,
  shovel: WrenchIcon,
  axe: AxeIcon,
  "compost-bin": RecycleIcon,
};

export function ToolBelt({
  tools,
  selectedTool,
  unlockedTools,
  level,
  selectedSpecies,
  seedCount,
  onSelectTool,
}: ToolBeltProps) {
  return (
    <View className="gap-1 rounded-xl border-2 border-bark-brown bg-parchment/90 p-1.5 shadow-sm">
      {/* 2x4 grid of tools */}
      <View className="flex-row flex-wrap gap-1">
        {tools.map((tool) => {
          const isUnlocked = unlockedTools.includes(tool.id);
          const isActive = selectedTool === tool.id;
          const canUnlock = level >= tool.unlockLevel;
          const IconComponent = TOOL_ICONS[tool.id] ?? WrenchIcon;

          return (
            <Pressable
              key={tool.id}
              className={`min-h-[44px] min-w-[44px] items-center justify-center rounded-lg ${
                isActive
                  ? "border-2 border-yellow-400 bg-yellow-400/30"
                  : "border-2 border-transparent bg-white/50"
              } ${!isUnlocked ? "opacity-30" : !canUnlock ? "opacity-60" : ""}`}
              disabled={!isUnlocked}
              onPress={() => onSelectTool(tool.id)}
              accessibilityLabel={`${tool.name}${!isUnlocked ? ` (Level ${tool.unlockLevel})` : ""}`}
            >
              <Icon
                as={IconComponent}
                size={20}
                className={isUnlocked ? "text-soil-dark" : "text-gray-400"}
              />
            </Pressable>
          );
        })}
      </View>

      {/* Active seed display when trowel selected */}
      {selectedTool === "trowel" && selectedSpecies && (
        <View className="items-center rounded bg-forest-green/20 px-1 py-0.5">
          <Text className="text-[10px] font-bold text-soil-dark">
            <Icon as={SproutIcon} size={10} className="text-forest-green" />{" "}
            {selectedSpecies} (x{seedCount ?? 0})
          </Text>
        </View>
      )}
    </View>
  );
}
