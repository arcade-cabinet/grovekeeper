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
import { ACCENT, DARK, HUD_PANEL } from "@/components/ui/tokens";

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
    <View className="gap-1 rounded-xl p-1.5" style={{ ...HUD_PANEL }}>
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
              className="min-h-[44px] min-w-[44px] items-center justify-center rounded-lg"
              style={{
                borderWidth: 2,
                borderColor: isActive ? ACCENT.amber : "transparent",
                backgroundColor: isActive ? "rgba(245,158,11,0.2)" : DARK.surfaceMoss,
                opacity: !isUnlocked ? (canUnlock ? 0.6 : 0.3) : 1,
              }}
              disabled={!isUnlocked}
              onPress={() => onSelectTool(tool.id)}
              accessibilityLabel={`${tool.name}${!isUnlocked ? ` (Level ${tool.unlockLevel})` : ""}`}
            >
              <Icon as={IconComponent} size={20} color={isUnlocked ? ACCENT.sap : DARK.textMuted} />
            </Pressable>
          );
        })}
      </View>

      {/* Active seed display when trowel selected */}
      {selectedTool === "trowel" && selectedSpecies && (
        <View
          className="items-center rounded px-1 py-0.5"
          style={{ backgroundColor: "rgba(74,222,128,0.15)" }}
        >
          <Text style={{ fontSize: 10, fontWeight: "700", color: ACCENT.sap }}>
            <Icon as={SproutIcon} size={10} color={ACCENT.sap} /> {selectedSpecies} (x
            {seedCount ?? 0})
          </Text>
        </View>
      )}
    </View>
  );
}
