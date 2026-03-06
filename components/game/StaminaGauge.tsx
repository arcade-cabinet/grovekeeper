import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from "react-native-reanimated";
import { Text } from "@/components/ui/text";

export interface StaminaGaugeProps {
  stamina: number;
  maxStamina: number;
}

export function StaminaGauge({ stamina, maxStamina }: StaminaGaugeProps) {
  const pct = maxStamina > 0 ? Math.round((stamina / maxStamina) * 100) : 0;
  const isLow = pct < 25;

  const animatedHeight = useDerivedValue(() =>
    withTiming(pct, { duration: 300 }),
  );

  const fillStyle = useAnimatedStyle(() => ({
    height: `${animatedHeight.value}%`,
  }));

  const fillColor =
    pct < 25 ? "bg-red-500" : pct < 50 ? "bg-orange-400" : "bg-emerald-500";

  return (
    <View className="items-center gap-1" style={{ width: 28 }}>
      {/* Vertical bar container */}
      <View
        className="w-full overflow-hidden rounded-lg border-2 border-bark-brown bg-parchment/90"
        style={{ height: 100 }}
      >
        {/* Fill grows from bottom */}
        <View className="absolute bottom-0 left-0 right-0 h-full justify-end">
          <Animated.View
            className={`w-full rounded-b-md ${fillColor} ${isLow ? "opacity-80" : ""}`}
            style={fillStyle}
          />
        </View>
      </View>

      {/* Label: current/max */}
      <Text
        className="text-xs font-bold text-parchment"
        style={{
          textShadowColor: "rgba(0,0,0,0.5)",
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 2,
        }}
      >
        {Math.round(stamina)}/{maxStamina}
      </Text>
    </View>
  );
}
