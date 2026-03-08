import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";
import { ACCENT, LIGHT } from "@/components/ui/tokens";

export function ToggleSwitch({
  enabled,
  onToggle,
  label,
}: {
  enabled: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <Pressable
      className="min-h-[44px] flex-row items-center justify-between"
      onPress={onToggle}
      accessibilityRole="switch"
      accessibilityState={{ checked: enabled }}
      accessibilityLabel={label}
    >
      <Text style={{ fontSize: 12, color: LIGHT.textPrimary }}>{label}</Text>
      <View
        className={`h-8 w-14 items-center rounded-full px-1 ${
          enabled ? "justify-end" : "justify-start"
        } flex-row`}
        style={{
          backgroundColor: enabled ? ACCENT.greenBright : LIGHT.textMuted,
        }}
      >
        <View className="h-6 w-6 rounded-full shadow" style={{ backgroundColor: "#FFF" }} />
      </View>
    </Pressable>
  );
}
