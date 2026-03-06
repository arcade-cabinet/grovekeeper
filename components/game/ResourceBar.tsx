import type { LucideIcon } from "lucide-react-native";
import {
  AppleIcon,
  DropletIcon,
  NutIcon,
  TreesIcon,
} from "lucide-react-native";
import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

export type ResourceType = "timber" | "sap" | "fruit" | "acorns";

interface ResourceCellProps {
  type: ResourceType;
  value: number;
}

const RESOURCE_ICONS: Record<ResourceType, LucideIcon> = {
  timber: TreesIcon,
  sap: DropletIcon,
  fruit: AppleIcon,
  acorns: NutIcon,
};

const RESOURCE_TYPES: ResourceType[] = ["timber", "sap", "fruit", "acorns"];

function ResourceCell({ type, value }: ResourceCellProps) {
  const scale = useSharedValue(1);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scale is a shared value ref, stable across renders
  useEffect(() => {
    scale.value = withSequence(
      withTiming(1.12, { duration: 80 }),
      withTiming(1, { duration: 320 }),
    );
  }, [value, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      className="flex-row items-center gap-1 rounded px-1"
      style={animatedStyle}
    >
      <Icon as={RESOURCE_ICONS[type]} className="text-forest-green" size={14} />
      <Text className="text-xs font-bold text-soil-dark tabular-nums">
        {value}
      </Text>
    </Animated.View>
  );
}

export interface ResourceBarProps {
  resources: Record<ResourceType, number>;
}

export function ResourceBar({ resources }: ResourceBarProps) {
  return (
    <View className="flex-row flex-wrap gap-x-3 gap-y-0.5 rounded-xl border-2 border-bark-brown bg-parchment/90 px-2 py-1">
      {RESOURCE_TYPES.map((type) => (
        <ResourceCell key={type} type={type} value={resources[type]} />
      ))}
    </View>
  );
}
