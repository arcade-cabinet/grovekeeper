import { View } from "react-native";
import Animated, { useAnimatedStyle, useDerivedValue, withTiming } from "react-native-reanimated";
import { Text } from "@/components/ui/text";

export interface XPBarProps {
  level: number;
  /** Progress within current level, 0-1. */
  progress: number;
}

export function XPBar({ level, progress }: XPBarProps) {
  const percent = Math.round(Math.min(progress, 1) * 100);

  const animatedWidth = useDerivedValue(() => withTiming(percent, { duration: 400 }));

  const fillStyle = useAnimatedStyle(() => ({
    width: `${animatedWidth.value}%`,
  }));

  return (
    <View className="flex-row items-center">
      <View
        className="relative flex-row items-center overflow-hidden rounded-full border-2 border-bark-brown bg-parchment/90"
        style={{ height: 28, width: 160 }}
      >
        {/* Level badge */}
        <View
          className="z-10 items-center justify-center rounded-full bg-forest-green"
          style={{ width: 24, height: 24, marginLeft: 1 }}
        >
          <Text className="text-[11px] font-bold text-white">{level}</Text>
        </View>

        {/* Fill track area */}
        <View className="relative h-full flex-1">
          {/* Gold fill bar */}
          <Animated.View className="absolute inset-y-0 left-0 bg-autumn-gold" style={fillStyle} />

          {/* Percentage text */}
          <View className="relative z-10 h-full flex-row items-center justify-end pr-2">
            <Text className="text-[11px] font-bold text-soil-dark">{percent}%</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
