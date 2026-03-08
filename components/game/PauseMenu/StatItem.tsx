import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { ACCENT, FONTS, LIGHT } from "@/components/ui/tokens";

export function StatItem({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <View className="gap-0.5">
      <Text style={{ fontSize: 10, color: LIGHT.textMuted }}>{label}</Text>
      <Text
        style={{
          fontSize: 20,
          fontWeight: "700",
          fontFamily: FONTS.data,
          color: color ?? ACCENT.greenBright,
        }}
      >
        {value}
      </Text>
    </View>
  );
}
