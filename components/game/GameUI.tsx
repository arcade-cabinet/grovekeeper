/**
 * GameUI -- orchestrator component for all in-game HUD layers, modals, and overlays.
 *
 * Faithfully ported from the original BabylonJS GameUI.tsx.
 * Coordinates: HUD bar, weather forecast, tool belt, batch harvest,
 * stamina gauge, mobile controls (joystick + action buttons),
 * minimap, radial action menu, all modals, tutorial overlay,
 * and prestige cosmetic vignette border.
 */

import { AxeIcon, DropletsIcon, ScissorsIcon, SproutIcon } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TREE_SPECIES } from "@/game/config/species";
import { TOOLS } from "@/game/config/tools";
import { totalXpForLevel, useGameStore, xpToNext } from "@/game/stores/gameStore";
import { ACHIEVEMENTS } from "@/game/systems/achievements";
import { canAffordExpansion, getNextExpansionTier } from "@/game/systems/gridExpansion";
import {
  calculatePrestigeBonus,
  canPrestige as checkCanPrestige,
  getCosmeticById,
  getUnlockedCosmetics,
  PRESTIGE_COSMETICS,
  PRESTIGE_MIN_LEVEL,
} from "@/game/systems/prestige";
import { getTradeRates } from "@/game/systems/trading";
import { getAvailableTemplates } from "@/game/structures/StructureManager";
import type { GameTime } from "./TimeDisplay";
import type { WeatherType } from "@/game/systems/weather";
import type { TileState } from "./ActionButton";
import { BatchHarvestButton } from "./BatchHarvestButton";
import { BuildPanel } from "./BuildPanel";
import { HUD } from "./HUD";
import { MiniMap } from "./MiniMap";
import { MobileActionButtons } from "./MobileActionButtons";
import { NpcDialogue } from "./NpcDialogue";
import { PauseMenu } from "./PauseMenu";
import { RadialActionMenu } from "./RadialActionMenu";
import type { RadialAction } from "./radialActions";
import { SeedSelect } from "./SeedSelect";
import { StaminaGauge } from "./StaminaGauge";
import { ToolBelt } from "./ToolBelt";
import { ToolWheel } from "./ToolWheel";
import { TradeDialog } from "./TradeDialog";
import { TutorialOverlay, type TutorialTargetRect } from "./TutorialOverlay";
import { VirtualJoystick } from "./VirtualJoystick";
import { WeatherForecast } from "./WeatherForecast";
import { WeatherOverlay } from "./WeatherOverlay";

export interface GameUIProps {
  onAction: () => void;
  onPlant: () => void;
  onOpenMenu: () => void;
  onOpenTools: () => void;
  onPlaceStructure?: (templateId: string, worldX: number, worldZ: number) => void;
  onBatchHarvest?: () => void;
  batchHarvestReadyCount?: number;
  currentWeather?: WeatherType;
  weatherTimeRemaining?: number;
  seedSelectOpen: boolean;
  setSeedSelectOpen: (open: boolean) => void;
  toolWheelOpen: boolean;
  setToolWheelOpen: (open: boolean) => void;
  pauseMenuOpen: boolean;
  setPauseMenuOpen: (open: boolean) => void;
  onMainMenu: () => void;
  gameTime: GameTime | null;
  playerTileInfo?: TileState | null;
  nearbyNpcTemplateId?: string | null;
  npcDialogueOpen?: boolean;
  setNpcDialogueOpen?: (open: boolean) => void;
  radialActions?: RadialAction[];
  radialOpen?: boolean;
  radialScreenPos?: { x: number; y: number } | null;
  onRadialAction?: (actionId: string) => void;
  onDismissRadial?: () => void;
  movementRef?: React.RefObject<{ x: number; z: number }>;
  onJoystickActiveChange?: (active: boolean) => void;
  tutorialTargetRect?: TutorialTargetRect | null;
  tutorialLabel?: string | null;
  tutorialDialogueId?: string | null;
  onTutorialDialogueAction?: (actionType: string) => void;
}

export function GameUI({
  onAction,
  onPlant,
  onOpenMenu,
  onOpenTools,
  onBatchHarvest,
  batchHarvestReadyCount,
  currentWeather,
  weatherTimeRemaining,
  seedSelectOpen,
  setSeedSelectOpen,
  toolWheelOpen,
  setToolWheelOpen,
  pauseMenuOpen,
  setPauseMenuOpen,
  onMainMenu,
  gameTime,
  nearbyNpcTemplateId,
  npcDialogueOpen,
  setNpcDialogueOpen,
  radialActions,
  radialOpen,
  radialScreenPos,
  onRadialAction,
  onDismissRadial,
  movementRef,
  onJoystickActiveChange,
  tutorialTargetRect,
  tutorialLabel,
  tutorialDialogueId,
  onTutorialDialogueAction,
}: GameUIProps) {
  const activeBorderCosmetic = useGameStore((s) => s.activeBorderCosmetic);
  const resources = useGameStore((s) => s.resources);
  const level = useGameStore((s) => s.level);
  const xp = useGameStore((s) => s.xp);
  const selectedTool = useGameStore((s) => s.selectedTool);
  const unlockedTools = useGameStore((s) => s.unlockedTools);
  const unlockedSpecies = useGameStore((s) => s.unlockedSpecies);
  const seeds = useGameStore((s) => s.seeds);
  const selectedSpecies = useGameStore((s) => s.selectedSpecies);
  const stamina = useGameStore((s) => s.stamina);
  const maxStamina = useGameStore((s) => s.maxStamina);
  const prestigeCount = useGameStore((s) => s.prestigeCount);
  const achievements = useGameStore((s) => s.achievements);
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const hapticsEnabled = useGameStore((s) => s.hapticsEnabled);
  const gridSize = useGameStore((s) => s.gridSize);
  const treesPlanted = useGameStore((s) => s.treesPlanted);
  const treesMatured = useGameStore((s) => s.treesMatured);
  const coins = useGameStore((s) => s.coins);

  const [buildPanelOpen, setBuildPanelOpen] = useState(false);
  const [tradeDialogOpen, setTradeDialogOpen] = useState(false);

  // Compute XP progress
  const xpProgress = useMemo(() => {
    const levelBase = totalXpForLevel(level);
    const needed = xpToNext(level);
    if (needed <= 0) return 1;
    return (xp - levelBase) / needed;
  }, [xp, level]);

  // Tool belt data (stripped to what ToolBelt needs)
  const toolBeltTools = useMemo(
    () => TOOLS.map((t) => ({ id: t.id, name: t.name, unlockLevel: t.unlockLevel })),
    [],
  );

  // Seed select species
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

  // Structure templates available at current level
  const structureTemplates = useMemo(() => getAvailableTemplates(level), [level]);

  // Trade rates
  const tradeRates = useMemo(() => getTradeRates(), []);

  // PauseMenu: stats
  const pauseStats = useMemo(
    () => ({
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
    }),
    [level, xp, coins, treesPlanted, treesMatured, gridSize, unlockedSpecies.length, unlockedTools.length, prestigeCount],
  );

  // PauseMenu: achievement defs
  const achievementDefs = useMemo(
    () => ACHIEVEMENTS.map((a) => ({ id: a.id, name: a.name, description: a.description })),
    [],
  );

  // PauseMenu: grid expansion info
  const gridExpansionInfo = useMemo(() => {
    const nextTier = getNextExpansionTier(gridSize);
    if (!nextTier) return null;
    const canAfford = canAffordExpansion(nextTier, resources, level);
    const meetsLevel = level >= nextTier.requiredLevel;
    const costLabel = Object.entries(nextTier.cost)
      .filter(([, amount]) => amount > 0)
      .map(([resource, amount]) => `${amount} ${resource.charAt(0).toUpperCase() + resource.slice(1)}`)
      .join(", ");
    return { nextSize: nextTier.size, nextRequiredLevel: nextTier.requiredLevel, costLabel, canAfford, meetsLevel };
  }, [gridSize, resources, level]);

  // PauseMenu: prestige info
  const prestigeInfo = useMemo(() => {
    const bonus = calculatePrestigeBonus(prestigeCount);
    return {
      count: prestigeCount,
      growthBonusPct: Math.round((bonus.growthSpeedMultiplier - 1) * 100),
      isEligible: checkCanPrestige(level),
      minLevel: PRESTIGE_MIN_LEVEL,
    };
  }, [prestigeCount, level]);

  // PauseMenu: cosmetics
  const pauseUnlockedCosmetics = useMemo(() => getUnlockedCosmetics(prestigeCount), [prestigeCount]);
  const pauseLockedCosmetics = useMemo(
    () => PRESTIGE_COSMETICS.filter((c) => c.prestigeRequired > prestigeCount),
    [prestigeCount],
  );

  // Mobile action buttons
  const mobileActions = useMemo(
    () => [
      { id: "plant", label: "Plant", icon: SproutIcon, toolId: "trowel", enabled: true },
      { id: "water", label: "Water", icon: DropletsIcon, toolId: "watering-can", enabled: true },
      { id: "harvest", label: "Harvest", icon: AxeIcon, toolId: "axe", enabled: true },
      { id: "prune", label: "Prune", icon: ScissorsIcon, toolId: "pruning-shears", enabled: unlockedTools.includes("pruning-shears") },
    ],
    [unlockedTools],
  );

  // Prestige cosmetic border
  const cosmetic = activeBorderCosmetic ? getCosmeticById(activeBorderCosmetic) : null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {/* Prestige cosmetic vignette border */}
      {cosmetic && (
        <View
          style={[
            styles.vignette,
            { borderWidth: 3, borderColor: cosmetic.borderColor },
          ]}
          pointerEvents="none"
        />
      )}

      {/* Weather visual overlay (rain, drought, windstorm) */}
      <WeatherOverlay weatherType={currentWeather ?? "clear"} />

      {/* Top HUD bar */}
      <SafeAreaView style={styles.hudTop} pointerEvents="box-none">
        <HUD
          resources={resources}
          level={level}
          xpProgress={xpProgress}
          gameTime={gameTime}
          selectedTool={selectedTool}
          showBuild={level >= 3}
          onOpenMenu={onOpenMenu}
          onOpenTools={onOpenTools}
          onOpenBuild={() => setBuildPanelOpen(true)}
        />
      </SafeAreaView>

      {/* Weather forecast widget - below HUD */}
      {currentWeather && gameTime && (
        <View style={styles.weatherForecast} pointerEvents="box-none">
          <WeatherForecast
            currentWeather={currentWeather}
            weatherTimeRemaining={weatherTimeRemaining ?? 0}
            currentSeason={gameTime.season}
          />
        </View>
      )}

      {/* Tool belt - bottom right */}
      <View style={styles.toolBelt} pointerEvents="box-none">
        <ToolBelt
          tools={toolBeltTools}
          selectedTool={selectedTool}
          unlockedTools={unlockedTools}
          level={level}
          selectedSpecies={selectedSpecies}
          seedCount={seeds[selectedSpecies] ?? 0}
          onSelectTool={(id: string) => useGameStore.getState().setSelectedTool(id)}
        />
      </View>

      {/* Batch harvest button - above tool belt */}
      {onBatchHarvest && (
        <View style={styles.batchHarvest} pointerEvents="box-none">
          <BatchHarvestButton
            readyCount={batchHarvestReadyCount ?? 0}
            onBatchHarvest={onBatchHarvest}
          />
        </View>
      )}

      {/* Stamina gauge - right side */}
      <View style={styles.staminaGauge} pointerEvents="none">
        <StaminaGauge stamina={stamina} maxStamina={maxStamina} />
      </View>

      {/* Mobile controls -- joystick (left) + action buttons (right) */}
      {movementRef && (
        <VirtualJoystick
          movementRef={movementRef}
          onActiveChange={onJoystickActiveChange}
        />
      )}
      <MobileActionButtons
        selectedTool={selectedTool}
        actions={mobileActions}
        onSelectTool={(toolId: string) => useGameStore.getState().setSelectedTool(toolId)}
        onAction={onAction}
      />

      {/* Mini-map - desktop only */}
      {Platform.OS === "web" && <MiniMap />}

      {/* Radial action menu - shown when tapping ground/objects */}
      {radialActions &&
        radialActions.length > 0 &&
        radialScreenPos &&
        onRadialAction &&
        onDismissRadial && (
          <RadialActionMenu
            open={radialOpen ?? true}
            centerX={radialScreenPos.x}
            centerY={radialScreenPos.y}
            actions={radialActions}
            onSelect={onRadialAction}
            onDismiss={onDismissRadial}
          />
        )}

      {/* Modals */}
      <SeedSelect
        open={seedSelectOpen}
        species={seedSelectSpecies}
        unlockedSpecies={unlockedSpecies}
        seeds={seeds}
        selectedSpecies={selectedSpecies}
        onSelect={(speciesId: string) => {
          useGameStore.getState().setSelectedSpecies(speciesId);
          onPlant();
        }}
        onClose={() => setSeedSelectOpen(false)}
      />
      <ToolWheel
        open={toolWheelOpen}
        onClose={() => setToolWheelOpen(false)}
        unlockedTools={unlockedTools}
        selectedTool={selectedTool}
        level={level}
        onSelectTool={(id: string) => useGameStore.getState().setSelectedTool(id)}
        onUnlockTool={(id: string) => useGameStore.getState().unlockTool(id)}
      />
      <BuildPanel
        open={buildPanelOpen}
        level={level}
        resources={resources}
        templates={structureTemplates}
        onSelectStructure={(template) => {
          useGameStore.getState().setBuildMode(true, template.id);
          setBuildPanelOpen(false);
        }}
        onClose={() => setBuildPanelOpen(false)}
      />
      <TradeDialog
        open={tradeDialogOpen}
        resources={resources}
        rates={tradeRates}
        onExecuteTrade={(rate, quantity) => {
          const store = useGameStore.getState();
          const totalCost = rate.fromAmount * quantity;
          const totalGain = rate.toAmount * quantity;
          if (store.spendResource(rate.from, totalCost)) {
            store.addResource(rate.to, totalGain);
          }
        }}
        onClose={() => setTradeDialogOpen(false)}
      />
      {setNpcDialogueOpen && (
        <NpcDialogue
          open={npcDialogueOpen ?? false}
          onClose={() => setNpcDialogueOpen(false)}
          npcName={nearbyNpcTemplateId ?? "NPC"}
          npcIcon={"\u{1F333}"}
          currentNode={null}
          onChoice={() => {}}
          overrideDialogueId={tutorialDialogueId ?? undefined}
          onDialogueAction={onTutorialDialogueAction}
        />
      )}
      <PauseMenu
        open={pauseMenuOpen}
        stats={pauseStats}
        achievements={achievements}
        achievementDefs={achievementDefs}
        soundEnabled={soundEnabled}
        hapticsEnabled={hapticsEnabled}
        gridExpansion={gridExpansionInfo}
        prestige={prestigeInfo}
        activeBorderCosmetic={activeBorderCosmetic}
        unlockedCosmetics={pauseUnlockedCosmetics}
        lockedCosmetics={pauseLockedCosmetics}
        onClose={() => setPauseMenuOpen(false)}
        onMainMenu={onMainMenu}
        onToggleSound={() => useGameStore.getState().setSoundEnabled(!soundEnabled)}
        onToggleHaptics={() => useGameStore.getState().setHapticsEnabled(!hapticsEnabled)}
        onExpandGrid={() => useGameStore.getState().expandGrid()}
        onPrestige={() => useGameStore.getState().performPrestige()}
        onResetGame={() => useGameStore.getState().resetGame()}
        onSetBorderCosmetic={(id) => useGameStore.getState().setActiveBorderCosmetic(id)}
      />

      {/* Tutorial highlight overlay */}
      <TutorialOverlay
        targetRect={tutorialTargetRect ?? null}
        label={tutorialLabel ?? null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  vignette: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
  },
  hudTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  weatherForecast: {
    position: "absolute",
    top: 64,
    right: 12,
  },
  toolBelt: {
    position: "absolute",
    bottom: 140,
    right: 12,
  },
  batchHarvest: {
    position: "absolute",
    bottom: 240,
    right: 16,
    zIndex: 10,
  },
  staminaGauge: {
    position: "absolute",
    bottom: 240,
    right: 20,
  },
});
