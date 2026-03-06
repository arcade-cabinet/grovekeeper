import { Canvas } from "@react-three/fiber/native";
import { Stack } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NpcMeshes } from "@/components/entities/NpcMeshes";
import { Player } from "@/components/entities/Player";
import { TreeInstances } from "@/components/entities/TreeInstances";
import { HUD } from "@/components/game/HUD";
import { Camera } from "@/components/scene/Camera";
import { Ground } from "@/components/scene/Ground";
import { Lighting } from "@/components/scene/Lighting";
import { Sky } from "@/components/scene/Sky";
import { useInput } from "@/game/hooks/useInput";
import {
  totalXpForLevel,
  useGameStore,
  xpToNext,
} from "@/game/stores/gameStore";
import {
  computeTimeState,
  getLightIntensity,
  getSkyColors,
} from "@/game/systems/time";

const SCREEN_OPTIONS = { headerShown: false, gestureEnabled: false };

export default function GameScreen() {
  const resources = useGameStore((s) => s.resources);
  const level = useGameStore((s) => s.level);
  const xp = useGameStore((s) => s.xp);
  const selectedTool = useGameStore((s) => s.selectedTool);
  const gridSize = useGameStore((s) => s.gridSize);
  const currentSeason = useGameStore((s) => s.currentSeason);
  const gameTimeMicroseconds = useGameStore((s) => s.gameTimeMicroseconds);
  const setScreen = useGameStore((s) => s.setScreen);

  // Input hook (keyboard on web, touch gestures on native)
  useInput();

  // Compute XP progress as a 0-1 fraction
  const xpProgress = useMemo(() => {
    const levelBase = totalXpForLevel(level);
    const needed = xpToNext(level);
    if (needed <= 0) return 1;
    return (xp - levelBase) / needed;
  }, [xp, level]);

  // Derive time-of-day visual state from persisted game time
  const timeVisuals = useMemo(() => {
    const timeState = computeTimeState(gameTimeMicroseconds);
    const sunIntensity = getLightIntensity(timeState.dayProgress);
    const rawSky = getSkyColors(timeState.dayProgress);
    // Map time system's {top, bottom} to scene components' {zenith, horizon, sun, ambient}
    const skyColors = {
      zenith: rawSky.top,
      horizon: rawSky.bottom,
      sun: rawSky.bottom, // Sun color approximated from horizon
      ambient: rawSky.top, // Ambient from zenith
    };
    const ambientIntensity = 0.15 + sunIntensity * 0.65;
    return {
      timeOfDay: timeState.dayProgress,
      sunIntensity,
      ambientIntensity,
      skyColors,
    };
  }, [gameTimeMicroseconds]);

  return (
    <>
      <Stack.Screen options={SCREEN_OPTIONS} />
      <View style={styles.container}>
        {/* 3D Canvas */}
        <Canvas shadows style={styles.canvas}>
          <Camera />
          <Lighting
            timeOfDay={timeVisuals.timeOfDay}
            season={currentSeason}
            sunIntensity={timeVisuals.sunIntensity}
            ambientIntensity={timeVisuals.ambientIntensity}
            skyColors={timeVisuals.skyColors}
          />
          <Sky
            skyColors={timeVisuals.skyColors}
            season={currentSeason}
            sunIntensity={timeVisuals.sunIntensity}
          />
          <Ground gridSize={gridSize} biome="grass" season={currentSeason} />
          <Player />
          <TreeInstances />
          <NpcMeshes />
        </Canvas>

        {/* HUD overlay */}
        <SafeAreaView style={styles.hudOverlay} pointerEvents="box-none">
          <HUD
            resources={resources}
            level={level}
            xpProgress={xpProgress}
            gameTime={timeVisuals.gameTime}
            selectedTool={selectedTool}
            onOpenMenu={() => setScreen("paused")}
            onOpenTools={() => {
              // Tool selector will be wired in a later phase
            }}
          />
        </SafeAreaView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  canvas: {
    flex: 1,
  },
  hudOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
});
