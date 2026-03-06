import { Link, Stack } from "expo-router";
import { View } from "react-native";
import { Text } from "@/components/ui/text";

const SCREEN_OPTIONS = {
  headerShown: false,
};

export default function MainMenuScreen() {
  return (
    <>
      <Stack.Screen options={SCREEN_OPTIONS} />
      <View className="flex-1 items-center justify-center bg-forest-green p-4">
        <Text className="font-heading text-4xl text-parchment">
          Grovekeeper
        </Text>
        <Text className="mt-2 font-body text-lg text-leaf-light">
          Every forest begins with a single seed.
        </Text>
        <View className="mt-12 gap-4">
          <Link href="/game" asChild>
            <View className="min-h-[44px] min-w-[200px] items-center justify-center rounded-lg bg-parchment px-8 py-3">
              <Text className="font-heading text-lg text-forest-green">
                Play
              </Text>
            </View>
          </Link>
        </View>
      </View>
    </>
  );
}
