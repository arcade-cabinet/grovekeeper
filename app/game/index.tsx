import { Canvas } from "@react-three/fiber";
import { Stack } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NpcMeshes } from "@/components/entities/NpcMeshes";
import { Player } from "@/components/entities/Player";
import { TreeInstances } from "@/components/entities/TreeInstances";
import { ActionButton } from "@/components/game/ActionButton";
import { HUD } from "@/components/game/HUD";
import { PauseMenu } from "@/components/game/PauseMenu";
import { SeedSelect } from "@/components/game/SeedSelect";
import { StaminaGauge } from "@/components/game/StaminaGauge";
import { ToolBelt, type Tool as ToolBeltTool } from "@/components/game/ToolBelt";
import { Camera } from "@/components/scene/Camera";
import { Ground } from "@/components/scene/Ground";
import { Lighting } from "@/components/scene/Lighting";
import { Sky } from "@/components/scene/Sky";
import { TREE_SPECIES } from "@/game/config/species";
import { TOOLS } from "@/game/config/tools";
import { useGameLoop } from "@/game/hooks/useGameLoop";
import { useInput } from "@/game/hooks/useInput";
import { useInteraction } from "@/game/hooks/useInteraction";
import { useWorldLoader } from "@/game/hooks/useWorldLoader";
import { totalXpForLevel, useGameStore, xpToNext } from "@/game/stores/gameStore";
import { ACHIEVEMENTS } from "@/game/systems/achievements";
import {
  canAffordExpansion,
  getNextExpansionTier,
} from "@/game/systems/gridExpansion";
import {
  calculatePrestigeBonus,
  canPrestige as checkCanPrestige,
  getUnlockedCosmetics,
  PRESTIGE_COSMETICS,
  PRESTIGE_MIN_LEVEL,
} from "@/game/systems/prestige";
import { computeTimeState, getLightIntensity, getSkyColors } from "@/game/systems/time";

/** Null-rendering component that drives all game systems via useFrame. */
function GameSystems() {
  useGameLoop();
  return null;
}

const SCREEN_OPTIONS = { headerShown: false, gestureEnabled: false };

// Achievement definitions for PauseMenu (stripped of check function)
const ACHIEVEMENT_DEFS = ACHIEVEMENTS.map((a) => ({
  id: a.id,
  name: a.name,
  description: a.description,
}));

export default function GameScreen() {
  const resources = useGameStore((s) => s.resources);
  const level = useGameStore((s) => s.level);
  const xp = useGameStore((s) => s.xp);
  const coins = useGameStore((s) => s.coins);
  const selectedTool = useGameStore((s) => s.selectedTool);
  const gridSize = useGameStore((s) => s.gridSize);
  const currentSeason = useGameStore((s) => s.currentSeason);
  const gameTimeMicroseconds = useGameStore((s) => s.gameTimeMicroseconds);
  const screen = useGameStore((s) => s.screen);
  const setScreen = useGameStore((s) => s.setScreen);
  const treesPlanted = useGameStore((s) => s.treesPlanted);
  const treesMatured = useGameStore((s) => s.treesMatured);
  const unlockedSpecies = useGameStore((s) => s.unlockedSpecies);
  const unlockedTools = useGameStore((s) => s.unlockedTools);
  const prestigeCount = useGameStore((s) => s.prestigeCount);
  const achievements = useGameStore((s) => s.achievements);
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const setSoundEnabled = useGameStore((s) => s.setSoundEnabled);
  const hapticsEnabled = useGameStore((s) => s.hapticsEnabled);
  const setHapticsEnabled = useGameStore((s) => s.setHapticsEnabled);
  const seeds = useGameStore((s) => s.seeds);
  const selectedSpecies = useGameStore((s) => s.selectedSpecies);
  const setSelectedSpecies = useGameStore((s) => s.setSelectedSpecies);
  const _hasSeenRules = useGameStore((s) => s.hasSeenRules);
  const setHasSeenRules = useGameStore((s) => s.setHasSeenRules);
  const stamina = useGameStore((s) => s.stamina);
  const maxStamina = useGameStore((s) => s.maxStamina);
  const activeBorderCosmetic = useGameStore((s) => s.activeBorderCosmetic);
  const setActiveBorderCosmetic = useGameStore((s) => s.setActiveBorderCosmetic);

  // Seed select modal state
  const [seedSelectOpen, setSeedSelectOpen] = useState(false);

  // Grid expansion info for PauseMenu
  const gridExpansionInfo = useMemo(() => {
    const nextTier = getNextExpansionTier(gridSize);
    if (!nextTier) return null;
    const canAfford = canAffordExpansion(nextTier, resources, level);
    const meetsLevel = level >= nextTier.requiredLevel;
    const costLabel = Object.entries(nextTier.cost)
      .filter(([, amount]) => amount > 0)
      .map(([resource, amount]) => `${amount} ${resource.charAt(0).toUpperCase() + resource.slice(1)}`)
      .join(", ");
    return {
      nextSize: nextTier.size,
      nextRequiredLevel: nextTier.requiredLevel,
      costLabel,
      canAfford,
      meetsLevel,
    };
  }, [gridSize, resources, level]);

  // Prestige info for PauseMenu
  const prestigeInfo = useMemo(() => {
    const bonus = calculatePrestigeBonus(prestigeCount);
    return {
      count: prestigeCount,
      growthBonusPct: Math.round((bonus.growthSpeedMultiplier - 1) * 100),
      isEligible: checkCanPrestige(level),
      minLevel: PRESTIGE_MIN_LEVEL,
    };
  }, [prestigeCount, level]);

  // Border cosmetics for PauseMenu
  const pauseUnlockedCosmetics = useMemo(
    () => getUnlockedCosmetics(prestigeCount),
    [prestigeCount],
  );
  const pauseLockedCosmetics = useMemo(
    () => PRESTIGE_COSMETICS.filter((c) => c.prestigeRequired > prestigeCount),
    [prestigeCount],
  );

  // Seed select species data (all species, not just unlocked)
  const seedSelectSpecies = useMemo(
    () =>
      TREE_SPECIES.map((sp) => ({
        id: sp.id,
        name: sp.name,
        difficulty: sp.difficulty,
        unlockLevel: sp.unlockLevel,
        biome: sp.biome,
        special: sp.special,
        seedCost: sp.seedCost,
        trunkColor: sp.meshParams?.color?.trunk ?? "#5D4037",
        canopyColor: sp.meshParams?.color?.canopy ?? "#81C784",
      })),
    [],
  );

  // Tool belt data
  const toolBeltData: ToolBeltTool[] = useMemo(
    () => TOOLS.map((t) => ({ id: t.id, name: t.name, unlockLevel: t.unlockLevel })),
    [],
  );

  // Action handlers
  const handleExpandGrid = useCallback(() => {
    useGameStore.getState().expandGrid();
  }, []);

  const handlePrestige = useCallback(() => {
    useGameStore.getState().performPrestige();
  }, []);

  const handleResetGame = useCallback(() => {
    useGameStore.getState().resetGame();
    setScreen("menu");
  }, [setScreen]);

  const handleSelectTool = useCallback((toolId: string) => {
    useGameStore.getState().setSelectedTool(toolId);
  }, []);

  // Show rules on first play
  const _handleDismissRules = useCallback(() => {
    setHasSeenRules(true);
  }, [setHasSeenRules]);

  // Load zone entities into ECS on mount
  useWorldLoader();

  // Input hook (keyboard on web, touch gestures on native)
  useInput();

  // Interaction hook (tile/tree/NPC selection and game actions)
  const { tileState, onGroundTap, onTreeTap, onNpcTap, executeAction } = useInteraction();

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
      gameTime: {
        hours: timeState.hour,
        minutes: Math.floor((timeState.dayProgress * 24 - timeState.hour) * 60),
        day: timeState.dayNumber,
        season: timeState.season,
      },
    };
  }, [gameTimeMicroseconds]);

  return (
    <>
      <Stack.Screen options={SCREEN_OPTIONS} />
      <View style={styles.container}>
        {/* 3D Canvas */}
        <Canvas shadows style={styles.canvas}>
          <GameSystems />
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
          <Ground
            gridSize={gridSize}
            biome="grass"
            season={currentSeason}
            onPointerDown={onGroundTap}
          />
          <Player />
          <TreeInstances onTreeTap={onTreeTap} />
          <NpcMeshes onNpcTap={onNpcTap} />
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
            onOpenTools={() => setSeedSelectOpen(true)}
          />
        </SafeAreaView>

        {/* Action button overlay (bottom-right) */}
        <View style={styles.actionOverlay} pointerEvents="box-none">
          <View className="items-end gap-2">
            <StaminaGauge stamina={stamina} maxStamina={maxStamina} />
            <ActionButton
              selectedTool={selectedTool}
              tileState={tileState}
              onAction={executeAction}
            />
          </View>
        </View>

        {/* Tool belt overlay (bottom-left) */}
        <View style={styles.toolBeltOverlay} pointerEvents="box-none">
          <ToolBelt
            tools={toolBeltData}
            selectedTool={selectedTool}
            unlockedTools={unlockedTools}
            level={level}
            selectedSpecies={selectedSpecies}
            seedCount={seeds[selectedSpecies] ?? 0}
            onSelectTool={handleSelectTool}
          />
        </View>

        {/* Pause Menu overlay */}
        <PauseMenu
          open={screen === "paused"}
          stats={{
            level,
            xp,
            coins,
            treesPlanted,
            treesMatured,
            gridSize,
            unlockedSpeciesCount: unlockedSpecies.length,
            totalSpeciesCount: TREE_SPECIES.length,
            unlockedToolsCount: unlockedTools.length,
            totalToolsCount: TOOLS.length,
            prestigeCount,
          }}
          achievements={achievements}
          achievementDefs={ACHIEVEMENT_DEFS}
          soundEnabled={soundEnabled}
          hapticsEnabled={hapticsEnabled}
          gridExpansion={gridExpansionInfo}
          prestige={prestigeInfo}
          activeBorderCosmetic={activeBorderCosmetic}
          unlockedCosmetics={pauseUnlockedCosmetics}
          lockedCosmetics={pauseLockedCosmetics}
          onClose={() => setScreen("playing")}
          onMainMenu={() => setScreen("menu")}
          onToggleSound={() => setSoundEnabled(!soundEnabled)}
          onToggleHaptics={() => setHapticsEnabled(!hapticsEnabled)}
          onExpandGrid={handleExpandGrid}
          onPrestige={handlePrestige}
          onResetGame={handleResetGame}
          onSetBorderCosmetic={setActiveBorderCosmetic}
        />

        {/* Seed selector modal */}
        <SeedSelect
          open={seedSelectOpen}
          species={seedSelectSpecies}
          unlockedSpecies={unlockedSpecies}
          seeds={seeds}
          selectedSpecies={selectedSpecies}
          onSelect={setSelectedSpecies}
          onClose={() => setSeedSelectOpen(false)}
        />
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
  actionOverlay: {
    position: "absolute",
    bottom: 32,
    right: 16,
  },
  toolBeltOverlay: {
    position: "absolute",
    bottom: 32,
    left: 16,
  },
});
