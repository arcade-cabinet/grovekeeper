import { Canvas, useFrame } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Stack, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { ChibiNpcScene } from "@/components/entities/ChibiNpcScene";
import { GrovekeeperSpirit } from "@/components/entities/GrovekeeperSpirit";
import { ProceduralBushes } from "@/components/entities/ProceduralBushes";
import { ProceduralEnemies } from "@/components/entities/ProceduralEnemies";
import { ProceduralFences } from "@/components/entities/ProceduralFences";
import { ProceduralGrass } from "@/components/entities/ProceduralGrass";
import { ProceduralHedgeMaze } from "@/components/entities/ProceduralHedgeMaze";
import { ProceduralProps } from "@/components/entities/ProceduralProps";
import { ProceduralTrees } from "@/components/entities/ProceduralTrees";
import { BuildPanel } from "@/components/game/BuildPanel";
import { CookingPanel } from "@/components/game/CookingPanel";
import { DeathScreen } from "@/components/game/DeathScreen";
import {
  FloatingParticlesContainer,
  WeatherParticlesLayer,
} from "@/components/game/FloatingParticles";
import { ForgingPanel } from "@/components/game/ForgingPanel";
import { HUD } from "@/components/game/HUD";
import { LoadingScreen } from "@/components/game/LoadingScreen";
import type { LoadingPhase } from "@/components/game/loadingScreenLogic";
import { NpcDialogue } from "@/components/game/NpcDialogue";
import { PauseMenu } from "@/components/game/PauseMenu";
import { PermadeathScreen } from "@/components/game/PermadeathScreen";
import { SeedSelect } from "@/components/game/SeedSelect";
import { TradeDialog } from "@/components/game/TradeDialog";
import { TutorialOverlay } from "@/components/game/TutorialOverlay";
import { WeatherOverlay } from "@/components/game/WeatherOverlay";
import { FPSCamera } from "@/components/player/FPSCamera";
import { PlayerCapsule } from "@/components/player/PlayerCapsule";
import { ProceduralToolView } from "@/components/player/ProceduralToolView";
import { TouchLookZone } from "@/components/player/TouchLookZone";
import { BirmotherMesh } from "@/components/scene/BirmotherMesh";
import { Lighting } from "@/components/scene/Lighting";
import { ProceduralTown } from "@/components/scene/ProceduralTown";
import { Sky } from "@/components/scene/Sky";
import { TerrainChunks } from "@/components/scene/TerrainChunk";
import { WaterBodies } from "@/components/scene/WaterBody";
import { TREE_SPECIES } from "@/game/config/species";
import { TOOLS } from "@/game/config/tools";
import { useDebugBridge } from "@/game/debug/useDebugBridge";
import { createPlayerEntity } from "@/game/ecs/archetypes";
import type { DialogueComponent } from "@/game/ecs/components/dialogue";
import { dayNightQuery, npcsQuery, terrainChunksQuery, world } from "@/game/ecs/world";
import { resolvePanelState } from "@/game/hooks/craftingStationLogic";
import { useBirmotherEncounter } from "@/game/hooks/useBirmotherEncounter";
import { useGameLoop } from "@/game/hooks/useGameLoop";
import { useInput } from "@/game/hooks/useInput";
import { useInteraction } from "@/game/hooks/useInteraction";
import { useRaycast } from "@/game/hooks/useRaycast";
import { useSpiritProximity } from "@/game/hooks/useSpiritProximity";
import { ChunkStreamer, useWorldLoader } from "@/game/hooks/useWorldLoader";
import { getNpcTemplate } from "@/game/npcs/NpcManager";
import { teleportPlayer } from "@/game/player/teleport";
import { useGameStore } from "@/game/stores";
import { startAudio } from "@/game/systems/AudioManager";
import { ACHIEVEMENTS } from "@/game/systems/achievements";
import type { AmbientAudioState } from "@/game/systems/ambientAudio";
import { initAmbientLayers } from "@/game/systems/ambientAudio";
import { computeRespawnPosition } from "@/game/systems/deathRespawn";
import type { SmeltRecipe, ToolTierUpgrade } from "@/game/systems/forging";
import { canSmelt } from "@/game/systems/forging";
import { canAffordExpansion, getNextExpansionTier } from "@/game/systems/gridExpansion";
import {
  calculatePrestigeBonus,
  canPrestige as checkCanPrestige,
  getUnlockedCosmetics,
  PRESTIGE_COSMETICS,
  PRESTIGE_MIN_LEVEL,
} from "@/game/systems/prestige";
import { computeTimeState, getLightIntensity, getSkyColors } from "@/game/systems/time";
import { createToneLayerNode } from "@/game/systems/toneLayerFactory";
import type { TradeRate } from "@/game/systems/trading";
import { getTradeRates } from "@/game/systems/trading";
import { openDialogueSession } from "@/game/ui/dialogueBridge";

/** Inside-Canvas sentinel: fires onReady() once the first terrain chunk appears in ECS (Spec §1.3). */
function LoadingProgressSentinel({ onReady }: { onReady: () => void }) {
  const readyRef = useRef(false);
  useFrame(() => {
    if (readyRef.current) return;
    if (terrainChunksQuery.entities.length > 0) {
      readyRef.current = true;
      onReady();
    }
  });
  return null;
}

/** Null-rendering component that drives all game systems via useFrame. */
function GameSystems() {
  useGameLoop();
  useRaycast();
  useSpiritProximity();
  useBirmotherEncounter();
  useDebugBridge();

  // Create the player ECS entity on mount so FPSCamera and all systems that read
  // playerQuery.entities[0] have a target to track (Spec §9).
  useEffect(() => {
    const entity = createPlayerEntity();
    world.add(entity);
    return () => {
      world.remove(entity);
    };
  }, []);

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
  const router = useRouter();
  const resources = useGameStore((s) => s.resources);
  const level = useGameStore((s) => s.level);
  const xp = useGameStore((s) => s.xp);
  const coins = useGameStore((s) => s.coins);
  const _selectedTool = useGameStore((s) => s.selectedTool);
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
  const worldSeed = useGameStore((s) => s.worldSeed);
  const _hasSeenRules = useGameStore((s) => s.hasSeenRules);
  const setHasSeenRules = useGameStore((s) => s.setHasSeenRules);
  const activeBorderCosmetic = useGameStore((s) => s.activeBorderCosmetic);
  const setActiveBorderCosmetic = useGameStore((s) => s.setActiveBorderCosmetic);
  const activeCraftingStation = useGameStore((s) => s.activeCraftingStation);
  const toolUpgrades = useGameStore((s) => s.toolUpgrades);

  // Crafting panel open/close state derived from activeCraftingStation (Spec §7.3, §22.2, §35)
  const craftingPanels = useMemo(
    () => resolvePanelState(activeCraftingStation),
    [activeCraftingStation],
  );

  /** Close whichever crafting panel is open by clearing the active station. */
  const closeCraftingPanel = useCallback(() => {
    useGameStore.getState().setActiveCraftingStation(null);
  }, []);

  /** Smelt handler: deducts inputs and credits output immediately (MVP). Spec §22.2. */
  const handleSmelt = useCallback((recipe: SmeltRecipe) => {
    const store = useGameStore.getState();
    const inventory = store.resources as unknown as Record<string, number>;
    if (!canSmelt(recipe, inventory)) return;
    // Deduct inputs + credit output via store actions
    for (const [res, amt] of Object.entries(recipe.inputs)) {
      store.spendResource(res as Parameters<typeof store.spendResource>[0], amt);
    }
    store.addResource(
      recipe.output.itemId as Parameters<typeof store.addResource>[0],
      recipe.output.amount,
    );
  }, []);

  /** Tool upgrade handler: delegates to store.upgradeToolTier. Spec §22.2. */
  const handleToolUpgrade = useCallback((toolId: string, _upgrade: ToolTierUpgrade) => {
    useGameStore.getState().upgradeToolTier(toolId);
  }, []);

  /** Build piece selection handler: enters build mode with selected piece. Spec §35. */
  const handleBuildPieceSelect = useCallback(
    (pieceType: string, material: string) => {
      useGameStore.getState().setBuildMode(true, `${pieceType}_${material}`);
      closeCraftingPanel();
    },
    [closeCraftingPanel],
  );

  // Ensure screen is "playing" when this component mounts.
  // On web, Legend State persistence is skipped so a page refresh resets to "menu",
  // which prevents the game loop from ticking. Spec §5.
  useEffect(() => {
    if (screen === "menu") {
      setScreen("playing");
    }
  }, [screen, setScreen]);

  // Loading screen phase (1 = start, 4 = done). Starts at 1 so overlay shows immediately.
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>(1);

  // Quickly advance phases 1 → 2 → 3 on mount (fonts + store init are near-instant).
  // Phase 4 is signalled by LoadingProgressSentinel inside Canvas when terrain chunks exist.
  useEffect(() => {
    setLoadingPhase(2);
    const t = setTimeout(() => setLoadingPhase(3), 400);
    return () => clearTimeout(t);
  }, []);

  const handleLoadingReady = useCallback(() => {
    setLoadingPhase(4);
  }, []);

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

  /** Respawn after non-permadeath death: resume playing at campfire. Spec §12.5. */
  const handleRespawn = useCallback(() => {
    const state = useGameStore.getState();
    const respawnPos = computeRespawnPosition(state.lastCampfirePosition);
    teleportPlayer(respawnPos.x, respawnPos.y, respawnPos.z);
    setScreen("playing");
  }, [setScreen]);

  /** Return to main menu after permadeath. Spec §2.1. */
  const handlePermadeathReturn = useCallback(() => {
    useGameStore.getState().resetGame();
    setScreen("menu");
    router.replace("/");
  }, [setScreen, router]);

  // Show rules on first play
  const _handleDismissRules = useCallback(() => {
    setHasSeenRules(true);
  }, [setHasSeenRules]);

  // Load zone entities into ECS on mount
  useWorldLoader();

  // Input hook (keyboard on web, touch gestures on native)
  const { moveDirection } = useInput();

  // Interaction hook (tile/tree/NPC selection and game actions)
  const {
    selection,
    tileState: _tileState,
    onGroundTap: _onGroundTap,
    onTreeTap,
    executeAction: rawExecuteAction,
  } = useInteraction();

  // Trade dialog state
  const [tradeDialogOpen, setTradeDialogOpen] = useState(false);
  const [tradeNpcName, setTradeNpcName] = useState<string | undefined>();

  // Trade rates for TradeDialog
  const tradeRates = useMemo(() => getTradeRates(), []);

  /**
   * Opens NPC dialogue for the given entity.
   *
   * Attaches a DialogueComponent to the ECS entity and opens the dialogue
   * session via the bridge module. NpcDialogue subscribes to dialogueBridge
   * and will render the dialogue UI automatically (Spec §15, §33).
   */
  const openNpcDialogue = useCallback((entityId: string) => {
    let npcEntity: (typeof npcsQuery.entities)[number] | null = null;
    for (const entity of npcsQuery) {
      if (entity.id === entityId) {
        npcEntity = entity;
        break;
      }
    }
    if (!npcEntity?.npc) return;

    const template = getNpcTemplate(npcEntity.npc.templateId);
    const dialogueTreeId = template?.dialogue?.greeting ?? `${npcEntity.npc.templateId}-greeting`;

    const dialogueComponent: DialogueComponent = {
      activeTreeId: dialogueTreeId,
      currentNodeId: null,
      bubbleVisible: true,
      visitedNodes: [],
      seedPath: [],
      inConversation: true,
    };
    world.addComponent(npcEntity, "dialogue", dialogueComponent);

    const currentWorldSeed = useGameStore.getState().worldSeed ?? "default";
    openDialogueSession(entityId, currentWorldSeed);
  }, []);

  /**
   * Action button handler: intercepts NPC selections to open dialogue instead
   * of dispatching a tool action. All other selection types delegate to the
   * raw executeAction from useInteraction.
   */
  const _executeAction = useCallback(() => {
    if (selection?.type === "npc" && selection.entityId) {
      openNpcDialogue(selection.entityId);
      return;
    }
    rawExecuteAction();
  }, [selection, openNpcDialogue, rawExecuteAction]);

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
      <View style={styles.container} onTouchStart={handleFirstGesture} testID="game-screen">
        {/* 3D Canvas — antialias:false + dpr=1 per PSX aesthetic (Spec §28.1).
            No MSAA framebuffer allocation → lower mobile GPU memory. */}
        <Canvas shadows="percentage" style={styles.canvas} gl={{ antialias: false }} dpr={1}>
          <Physics>
            <GameSystems />
            <LoadingProgressSentinel onReady={handleLoadingReady} />
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
            <ProceduralTrees onTreeTap={onTreeTap} />
            <ProceduralGrass />
            <ProceduralTown />
            <ProceduralFences />
            <ProceduralProps />
            <ChibiNpcScene worldSeed={worldSeed} />
            <ProceduralBushes />
            <ProceduralHedgeMaze />
            <GrovekeeperSpirit />
            <ProceduralToolView moveDirection={moveDirection} />
            <BirmotherMesh />
            <ProceduralEnemies />
          </Physics>
        </Canvas>

        {/* Loading screen overlay — shown until first terrain chunk appears in ECS (Spec §1.3).
            Canvas renders behind it so ChunkStreamer generates terrain while user sees splash. */}
        {loadingPhase < 4 && (
          <View style={StyleSheet.absoluteFillObject} onTouchStart={handleFirstGesture}>
            <LoadingScreen phase={loadingPhase} />
          </View>
        )}

        {/* Full FPS HUD overlay — self-contained, reads from ECS + Legend State */}
        <HUD
          onOpenMenu={() => setScreen("paused")}
          onOpenSeedSelect={() => setSeedSelectOpen(true)}
        />

        {/* Weather visual overlay — self-drives from ECS WeatherComponent (Spec §12, §36).
            Renders rain, snow, fog, drought, windstorm, and thunderstorm 2D effects. */}
        <WeatherOverlay />

        {/* ECS-driven weather particle overlay (rain drops, snow flakes, leaves, dust)
            + floating text particles (+XP, +Timber, etc.) — Spec §36.1. */}
        <WeatherParticlesLayer />
        <FloatingParticlesContainer />

        {/* Touch look zone — right-half swipe area driving FPS camera look on mobile (Spec §23).
            Mounted below HUD so HUD touch targets (left-side, top bar) are not captured by this zone. */}
        <TouchLookZone />

        {/* NPC Dialogue overlay — self-driven from ECS via dialogueBridge (Spec §15, §33).
            Renders when openDialogueSession() is called (triggered by NPC tap, spirit proximity,
            or Birchmother encounter). No props needed. */}
        <NpcDialogue />

        {/* Trade dialog overlay — opened from NPC dialogue "open_trade" action or
            direct merchant interaction. */}
        <TradeDialog
          open={tradeDialogOpen}
          resources={resources}
          rates={tradeRates}
          npcName={tradeNpcName}
          onExecuteTrade={(rate: TradeRate, quantity: number) => {
            const store = useGameStore.getState();
            const totalCost = rate.fromAmount * quantity;
            const totalGain = rate.toAmount * quantity;
            if (store.spendResource(rate.from, totalCost)) {
              store.addResource(rate.to, totalGain);
            }
          }}
          onClose={() => {
            setTradeDialogOpen(false);
            setTradeNpcName(undefined);
          }}
        />

        {/* Crafting panel overlays — opened by actionDispatcher via store.activeCraftingStation.
            Each panel closes by calling closeCraftingPanel (clears the station). */}

        {/* Cooking panel — campfire interaction (Spec §7.3). */}
        <CookingPanel open={craftingPanels.cookingOpen} onClose={closeCraftingPanel} />

        {/* Forging panel — forge structure interaction (Spec §22.2). */}
        <ForgingPanel
          open={craftingPanels.forgingOpen}
          onClose={closeCraftingPanel}
          inventory={resources as unknown as Record<string, number>}
          toolUpgrades={toolUpgrades}
          onSmelt={handleSmelt}
          onUpgrade={handleToolUpgrade}
        />

        {/* Build panel — hammer on empty ground (Spec §35). */}
        <BuildPanel
          open={craftingPanels.buildOpen}
          playerLevel={level}
          resources={resources as unknown as Record<string, number>}
          onSelectPiece={handleBuildPieceSelect}
          onClose={closeCraftingPanel}
        />

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

        {/* Death screen overlay — non-permadeath: respawn at campfire (Spec §12.3, §12.5) */}
        <DeathScreen open={screen === "death"} onRespawn={handleRespawn} />

        {/* Permadeath screen overlay — session over, return to menu (Spec §2.1) */}
        <PermadeathScreen open={screen === "permadeath"} onReturnToMenu={handlePermadeathReturn} />
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
