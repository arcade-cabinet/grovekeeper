import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Stack } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { GrassInstances } from "@/components/entities/GrassInstances";
import { NpcMeshes } from "@/components/entities/NpcMeshes";
import { TreeInstances } from "@/components/entities/TreeInstances";
import { ActionButton } from "@/components/game/ActionButton";
import { HUD } from "@/components/game/HUD";
import { PauseMenu } from "@/components/game/PauseMenu";
import { SeedSelect } from "@/components/game/SeedSelect";
import { TutorialOverlay } from "@/components/game/TutorialOverlay";
import { FPSCamera } from "@/components/player/FPSCamera";
import { PlayerCapsule } from "@/components/player/PlayerCapsule";
import { TouchLookZone } from "@/components/player/TouchLookZone";
import { BirmotherMesh } from "@/components/scene/BirmotherMesh";
import { Lighting } from "@/components/scene/Lighting";
import { Sky } from "@/components/scene/Sky";
import { WaterBodies } from "@/components/scene/WaterBody";
import { TerrainChunks } from "@/components/scene/TerrainChunk";
import { TREE_SPECIES } from "@/game/config/species";
import { TOOLS } from "@/game/config/tools";
import { dayNightQuery } from "@/game/ecs/world";
import { useBirmotherEncounter } from "@/game/hooks/useBirmotherEncounter";
import { useGameLoop } from "@/game/hooks/useGameLoop";
import { useInput } from "@/game/hooks/useInput";
import { useInteraction } from "@/game/hooks/useInteraction";
import { useRaycast } from "@/game/hooks/useRaycast";
import { useSpiritProximity } from "@/game/hooks/useSpiritProximity";
import { ChunkStreamer, useWorldLoader } from "@/game/hooks/useWorldLoader";
import { useGameStore } from "@/game/stores";
import { ACHIEVEMENTS } from "@/game/systems/achievements";
import { canAffordExpansion, getNextExpansionTier } from "@/game/systems/gridExpansion";
import {
  calculatePrestigeBonus,
  canPrestige as checkCanPrestige,
  getUnlockedCosmetics,
  PRESTIGE_COSMETICS,
  PRESTIGE_MIN_LEVEL,
} from "@/game/systems/prestige";
import { computeTimeState, getLightIntensity, getSkyColors } from "@/game/systems/time";
import { startAudio } from "@/game/systems/AudioManager";
import { initAmbientLayers } from "@/game/systems/ambientAudio";
import type { AmbientAudioState } from "@/game/systems/ambientAudio";
import { createToneLayerNode } from "@/game/systems/toneLayerFactory";

/** Null-rendering component that drives all game systems via useFrame. */
function GameSystems() {
  useGameLoop();
  useRaycast();
  useSpiritProximity();
  useBirmotherEncounter();
  // ChunkStreamer calls ChunkManager.update(playerPos) every frame to drive
  // open-world chunk streaming (Spec §17.1). Must be inside Canvas for useFrame.
  return <ChunkStreamer />;
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
  const activeBorderCosmetic = useGameStore((s) => s.activeBorderCosmetic);
  const setActiveBorderCosmetic = useGameStore((s) => s.setActiveBorderCosmetic);

  // Seed select modal state
  const [seedSelectOpen, setSeedSelectOpen] = useState(false);

  // Ambient audio state — initialized on first user gesture (satisfies browser autoplay policy).
  const ambientAudioRef = useRef<AmbientAudioState | null>(null);
  const audioStarted = useRef(false);

  /** Called on first touch/click — unlocks Web Audio and sets up ambient synthesis nodes. */
  const handleFirstGesture = useCallback(() => {
    if (audioStarted.current) return;
    audioStarted.current = true;
    void startAudio().then(() => {
      if (!ambientAudioRef.current) {
        ambientAudioRef.current = initAmbientLayers(createToneLayerNode);
      }
    });
  }, []);

  // Grid expansion info for PauseMenu
  const gridExpansionInfo = useMemo(() => {
    const nextTier = getNextExpansionTier(gridSize);
    if (!nextTier) return null;
    const canAfford = canAffordExpansion(nextTier, resources, level);
    const meetsLevel = level >= nextTier.requiredLevel;
    const costLabel = Object.entries(nextTier.cost)
      .filter(([, amount]) => amount > 0)
      .map(
        ([resource, amount]) => `${amount} ${resource.charAt(0).toUpperCase() + resource.slice(1)}`,
      )
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

  // Show rules on first play
  const _handleDismissRules = useCallback(() => {
    setHasSeenRules(true);
  }, [setHasSeenRules]);

  // Load zone entities into ECS on mount
  useWorldLoader();

  // Input hook (keyboard on web, touch gestures on native)
  const { moveDirection } = useInput();

  // Interaction hook (tile/tree/NPC selection and game actions)
  const { tileState, onGroundTap, onTreeTap, onNpcTap, executeAction } = useInteraction();

  // Time-of-day visual state for the 3D scene (Lighting + Sky).
  // Prefer ECS DayNightComponent values (8-slot lerped) when available.
  // Falls back to time.ts getSkyColors() (4 hard phases) before ECS bootstraps.
  const timeVisuals = useMemo(() => {
    const ecsEntity = dayNightQuery.entities[0];
    const dn = ecsEntity?.dayNight;

    if (dn) {
      // System B active — use 8-slot lerped ECS values (Spec §31.3)
      return {
        timeOfDay: dn.gameHour / 24,
        sunIntensity: dn.sunIntensity,
        ambientIntensity: dn.ambientIntensity,
        shadowOpacity: dn.shadowOpacity,
        starIntensity: dn.starIntensity,
        skyColors: {
          zenith: dn.skyZenithColor,
          horizon: dn.skyHorizonColor,
          sun: dn.directionalColor,
          ambient: dn.ambientColor,
        },
      };
    }

    // Fallback: System A (4 hard-bucketed phases from time.ts)
    const timeState = computeTimeState(gameTimeMicroseconds);
    const sunIntensity = getLightIntensity(timeState.dayProgress);
    const rawSky = getSkyColors(timeState.dayProgress);
    return {
      timeOfDay: timeState.dayProgress,
      sunIntensity,
      ambientIntensity: 0.15 + sunIntensity * 0.65,
      shadowOpacity: sunIntensity,
      starIntensity: 1 - sunIntensity,
      skyColors: {
        zenith: rawSky.top,
        horizon: rawSky.bottom,
        sun: rawSky.bottom,
        ambient: rawSky.top,
      },
    };
  }, [gameTimeMicroseconds]);

  return (
    <>
      <Stack.Screen options={SCREEN_OPTIONS} />
      <View style={styles.container} onTouchStart={handleFirstGesture}>
        {/* 3D Canvas */}
        <Canvas shadows style={styles.canvas}>
          <Physics>
            <GameSystems />
            <FPSCamera />
            <Lighting
              timeOfDay={timeVisuals.timeOfDay}
              season={currentSeason}
              sunIntensity={timeVisuals.sunIntensity}
              ambientIntensity={timeVisuals.ambientIntensity}
              shadowOpacity={timeVisuals.shadowOpacity}
              skyColors={timeVisuals.skyColors}
            />
            <Sky
              skyColors={timeVisuals.skyColors}
              season={currentSeason}
              sunIntensity={timeVisuals.sunIntensity}
              starIntensity={timeVisuals.starIntensity}
            />
            <TerrainChunks />
            <WaterBodies />
            <PlayerCapsule moveDirection={moveDirection} />
            <TreeInstances onTreeTap={onTreeTap} />
            <GrassInstances />
            <NpcMeshes onNpcTap={onNpcTap} />
            <BirmotherMesh />
          </Physics>
        </Canvas>

        {/* Full FPS HUD overlay — self-contained, reads from ECS + Legend State */}
        <HUD
          onOpenMenu={() => setScreen("paused")}
          onOpenSeedSelect={() => setSeedSelectOpen(true)}
        />

        {/* Touch look zone — right-half swipe area driving FPS camera look on mobile (Spec §23).
            Mounted below HUD so HUD touch targets (left-side, top bar) are not captured by this zone. */}
        <TouchLookZone />

        {/* Action button overlay (bottom-right) — executes current tool action */}
        <View style={styles.actionOverlay} pointerEvents="box-none">
          <ActionButton
            selectedTool={selectedTool}
            tileState={tileState}
            onAction={executeAction}
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
            unlockedToolsCount: useGameStore.getState().unlockedTools.length,
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

        {/* Tutorial overlay — reads tutorialState from store; null targetRect = label at top-center */}
        <TutorialOverlay targetRect={null} />

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
  actionOverlay: {
    position: "absolute",
    bottom: 32,
    right: 16,
  },
});
