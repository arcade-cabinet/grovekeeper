import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";

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
      <Text className="text-sm text-gray-700">{label}</Text>
      <View
        className={`h-8 w-14 items-center rounded-full px-1 ${
          enabled ? "justify-end bg-forest-green" : "justify-start bg-gray-300"
        } flex-row`}
      >
        <View className="h-6 w-6 rounded-full bg-white shadow" />
      </View>
    </Pressable>
  );
}
