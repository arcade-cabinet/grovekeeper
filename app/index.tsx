import { Stack, useRouter } from "expo-router";
import { useCallback } from "react";
import { MainMenu } from "@/components/game/MainMenu";
import { useGameStore } from "@/game/stores/gameStore";

const SCREEN_OPTIONS = {
  headerShown: false,
};

export default function MainMenuScreen() {
  const router = useRouter();
  const treesPlanted = useGameStore((s) => s.treesPlanted);

  const handleContinue = useCallback(() => {
    useGameStore.getState().setScreen("playing");
    router.push("/game");
  }, [router]);

  const handleNewGrove = useCallback(() => {
    useGameStore.getState().resetGame();
    useGameStore.getState().setScreen("playing");
    router.push("/game");
  }, [router]);

  return (
    <>
      <Stack.Screen options={SCREEN_OPTIONS} />
      <MainMenu treesPlanted={treesPlanted} onContinue={handleContinue} onNewGrove={handleNewGrove} />
    </>
  );
}
