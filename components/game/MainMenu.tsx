import { TreesIcon } from "lucide-react-native";
import { View } from "react-native";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

export interface MainMenuProps {
  treesPlanted: number;
  onContinue: () => void;
  onNewGrove: () => void;
}

export function MainMenu({
  treesPlanted,
  onContinue,
  onNewGrove,
}: MainMenuProps) {
  const hasSave = treesPlanted > 0;

  return (
    <View className="flex-1 items-center justify-center bg-sky-mist px-6">
      {/* Logo area */}
      <View className="mb-6 items-center">
        <Icon as={TreesIcon} size={64} className="text-forest-green" />
        <Text className="mt-3 font-heading text-4xl font-extrabold tracking-tight text-forest-green">
          Grovekeeper
        </Text>
      </View>

      {/* Tagline */}
      <Text className="mb-8 text-center font-body text-sm italic text-bark-brown">
        "Every forest begins with a single seed."
      </Text>

      {/* Card */}
      <View className="w-full max-w-xs gap-3 rounded-2xl border-[3px] border-forest-green/40 bg-white p-6 shadow-lg shadow-forest-green/20">
        {hasSave && (
          <Button
            className="min-h-[48px] w-full rounded-xl bg-forest-green shadow-md shadow-forest-green/40"
            onPress={onContinue}
          >
            <Text className="text-base font-bold text-white">
              Continue Grove
            </Text>
          </Button>
        )}

        <Button
          className={`min-h-[48px] w-full rounded-xl ${
            hasSave
              ? "border-2 border-forest-green bg-white"
              : "bg-forest-green shadow-md shadow-forest-green/40"
          }`}
          variant={hasSave ? "outline" : "default"}
          onPress={onNewGrove}
        >
          <Text
            className={`text-base font-bold ${hasSave ? "text-forest-green" : "text-white"}`}
          >
            {hasSave ? "New Grove" : "Start Growing"}
          </Text>
        </Button>

        {hasSave && (
          <Text className="text-center text-xs text-bark-brown">
            {treesPlanted} {treesPlanted === 1 ? "tree" : "trees"} planted so
            far
          </Text>
        )}
      </View>

      {/* Version */}
      <Text className="mt-6 text-xs text-forest-green/50">
        Grovekeeper v0.1.0
      </Text>
    </View>
  );
}
