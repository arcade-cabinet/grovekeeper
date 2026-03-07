/**
 * HUD -- Top-bar overlay with resources, XP, time, quest panel,
 * build button (level 3+), tool selector, and menu button.
 *
 * Matches the original BabylonJS web version's full feature set:
 * - Quest panel integration with claim reward flow
 * - Build button (level 3+)
 * - Full time display (expanded on wide screens, compact otherwise)
 * - Responsive behavior for all elements
 */

import {
  BuildingIcon,
  MenuIcon,
  WrenchIcon,
} from "lucide-react-native";
import { useWindowDimensions, Pressable, View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { QuestPanel, type ActiveQuestDisplay } from "./QuestPanel";
import { ResourceBar, type ResourceType } from "./ResourceBar";
import { type GameTime, TimeDisplay, TimeDisplayCompact } from "./TimeDisplay";
import { XPBar } from "./XPBar";

export interface HUDProps {
  resources: Record<ResourceType, number>;
  level: number;
  xpProgress: number;
  gameTime: GameTime | null;
  selectedTool: string;
  showBuild?: boolean;
  activeQuests?: ActiveQuestDisplay[];
  onClaimReward?: (chainId: string) => void;
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
  activeQuests = [],
  onClaimReward,
  onOpenMenu,
  onOpenTools,
  onOpenBuild,
}: HUDProps) {
  const { width } = useWindowDimensions();
  const isWide = width >= 640;

  return (
    <View className="flex-row items-center justify-between px-3 py-2">
      {/* Left side - Stats */}
      <View className="min-w-0 shrink flex-row items-center gap-2">
        {/* Resources */}
        <ResourceBar resources={resources} />

        {/* Level & XP bar */}
        <XPBar level={level} progress={xpProgress} />

        {/* Time display - full on wide screens, compact otherwise */}
        {gameTime &&
          (isWide ? (
            <TimeDisplay time={gameTime} />
          ) : (
            <TimeDisplayCompact time={gameTime} />
          ))}
      </View>

      {/* Right side - Controls */}
      <View className="flex-row items-center gap-1">
        {/* Quest panel (compact in HUD bar) */}
        {activeQuests.length > 0 && (
          <QuestPanel
            quests={activeQuests}
            onClaimReward={onClaimReward}
            compact
          />
        )}

        {/* Build button (unlocked at level 3) */}
        {showBuild && onOpenBuild && (
          <Pressable
            className="min-h-[44px] min-w-[44px] flex-row items-center justify-center rounded-full bg-bark-brown px-2"
            onPress={onOpenBuild}
            accessibilityLabel="Open build menu"
          >
            <Icon as={BuildingIcon} size={16} className="text-white" />
            {isWide && (
              <Text className="ml-1 text-xs font-bold text-white">Build</Text>
            )}
          </Pressable>
        )}

        {/* Tool selector */}
        <Pressable
          className="min-h-[44px] min-w-[44px] flex-row items-center justify-center rounded-full bg-forest-green px-2"
          onPress={onOpenTools}
          accessibilityLabel={`Current tool: ${selectedTool}. Open tool selector`}
        >
          <Icon as={WrenchIcon} size={16} className="text-white" />
          {isWide ? (
            <Text className="ml-1 text-xs font-bold text-white">
              {selectedTool}
            </Text>
          ) : null}
        </Pressable>

        {/* Menu */}
        <Pressable
          className="min-h-[44px] min-w-[44px] items-center justify-center rounded-full"
          onPress={onOpenMenu}
          accessibilityLabel="Open menu"
        >
          <Icon
            as={MenuIcon}
            size={isWide ? 24 : 22}
            className="text-white"
          />
        </Pressable>
      </View>
    </View>
  );
}
