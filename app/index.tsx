import { Stack, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { MainMenu } from "@/components/game/MainMenu";
import { type NewGameConfig, NewGameModal } from "@/components/game/NewGameModal";
import { useGameStore } from "@/game/stores";
import { startNewGame } from "@/game/stores/survivalState";

const SCREEN_OPTIONS = {
  headerShown: false,
};

export default function MainMenuScreen() {
  const router = useRouter();
  const treesPlanted = useGameStore((s) => s.treesPlanted);
  const [newGameOpen, setNewGameOpen] = useState(false);

  const handleContinue = useCallback(() => {
    useGameStore.getState().setScreen("playing");
    router.push("/game");
  }, [router]);

  const handleNewGrove = useCallback(() => {
    setNewGameOpen(true);
  }, []);

  const handleNewGameStart = useCallback(
    (config: NewGameConfig) => {
      useGameStore.getState().resetGame(config.worldSeed);
      startNewGame(config.difficulty, config.permadeath);
      useGameStore.getState().setScreen("playing");
      setNewGameOpen(false);
      router.push("/game");
    },
    [router],
  );

  const handleSettings = useCallback(() => {
    router.push("/settings");
  }, [router]);

  return (
    <>
      <Stack.Screen options={SCREEN_OPTIONS} />
      <MainMenu
        treesPlanted={treesPlanted}
        onContinue={handleContinue}
        onNewGrove={handleNewGrove}
        onSettings={handleSettings}
      />
      <NewGameModal
        open={newGameOpen}
        onClose={() => setNewGameOpen(false)}
        onStart={handleNewGameStart}
      />
    </>
  );
}
