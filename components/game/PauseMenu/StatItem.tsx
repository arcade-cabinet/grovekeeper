import { View } from "react-native";
import { Text } from "@/components/ui/text";

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
      <Text className="text-xs text-gray-500">{label}</Text>
      <Text className={`text-xl font-bold ${color ?? "text-forest-green"}`}>{value}</Text>
    </View>
  );
}
