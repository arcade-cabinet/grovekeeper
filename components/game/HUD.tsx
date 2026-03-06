import { BuildingIcon, MenuIcon, WrenchIcon } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { ResourceBar, type ResourceType } from "./ResourceBar";
import { type GameTime, TimeDisplayCompact } from "./TimeDisplay";
import { XPBar } from "./XPBar";

export interface HUDProps {
  resources: Record<ResourceType, number>;
  level: number;
  xpProgress: number;
  gameTime: GameTime | null;
  selectedTool: string;
  showBuild?: boolean;
  onOpenMenu: () => void;
  onOpenTools: () => void;
  onOpenBuild?: () => void;
}

export function HUD({
  resources,
  level,
  xpProgress,
  gameTime,
  selectedTool,
  showBuild,
  onOpenMenu,
  onOpenTools,
  onOpenBuild,
}: HUDProps) {
  return (
    <View className="flex-row items-center justify-between px-3 py-2">
      {/* Left side - Stats */}
      <View className="min-w-0 shrink flex-row items-center gap-2">
        <ResourceBar resources={resources} />
        <XPBar level={level} progress={xpProgress} />
        {gameTime && <TimeDisplayCompact time={gameTime} />}
      </View>

      {/* Right side - Controls */}
      <View className="flex-row items-center gap-1">
        {/* Build button */}
        {showBuild && onOpenBuild && (
          <Pressable
            className="min-h-[44px] min-w-[44px] flex-row items-center justify-center rounded-full bg-bark-brown px-2"
            onPress={onOpenBuild}
            accessibilityLabel="Open build menu"
          >
            <Icon as={BuildingIcon} size={16} className="text-white" />
          </Pressable>
        )}

        {/* Tool selector */}
        <Pressable
          className="min-h-[44px] min-w-[44px] flex-row items-center justify-center rounded-full bg-forest-green px-2"
          onPress={onOpenTools}
          accessibilityLabel={`Current tool: ${selectedTool}. Open tool selector`}
        >
          <Icon as={WrenchIcon} size={16} className="text-white" />
          <Text className="ml-1 text-xs font-bold text-white">
            {selectedTool}
          </Text>
        </Pressable>

        {/* Menu */}
        <Pressable
          className="min-h-[44px] min-w-[44px] items-center justify-center rounded-full"
          onPress={onOpenMenu}
          accessibilityLabel="Open menu"
        >
          <Icon as={MenuIcon} size={22} className="text-white" />
        </Pressable>
      </View>
    </View>
  );
}
