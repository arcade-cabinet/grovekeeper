import { useCallback, useEffect, useState } from "react";
import { Platform, View } from "react-native";
import { useGameStore } from "@/game/stores";
import { BatchHarvestButton } from "../BatchHarvestButton.tsx";
import { BuildPanel } from "../BuildPanel.tsx";
import { CookingPanel } from "../CookingPanel.tsx";
import { FishingPanel } from "../FishingPanel.tsx";
import { ForgingPanel } from "../ForgingPanel.tsx";
import { HUD } from "../HUD.tsx";
import { MobileActionButtons } from "../MobileActionButtons.tsx";
import { MiniMap } from "../minimap/index.ts";
import { NpcDialogue } from "../NpcDialogue.tsx";
import { PauseMenu } from "../PauseMenu/index.tsx";
import { RadialActionMenu } from "../RadialActionMenu.tsx";
import { SeedSelect } from "../SeedSelect.tsx";
import { ToolWheel } from "../ToolWheel.tsx";
import { TradeDialog } from "../TradeDialog.tsx";
import { TutorialOverlay } from "../TutorialOverlay.tsx";
import { VirtualJoystick } from "../VirtualJoystick.tsx";
import { WeatherForecast } from "../WeatherForecast.tsx";
import { WeatherOverlay } from "../WeatherOverlay.tsx";
import { styles } from "./styles.ts";
import type { GameUIProps } from "./types.ts";
import { useGameUIData } from "./useGameUIData.ts";

export type { GameUIProps };

export function GameUI({
  onAction,
  onPlant,
  onOpenMenu,
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
  radialActions,
  radialOpen,
  radialScreenPos,
  onRadialAction,
  onDismissRadial,
  movementRef,
  onJoystickActiveChange,
  tutorialTargetRect,
  tutorialLabel,
}: GameUIProps) {
  const {
    resources,
    level,
    selectedTool,
    unlockedTools,
    unlockedSpecies,
    seeds,
    selectedSpecies,
    achievements,
    soundEnabled,
    hapticsEnabled,
    seedSelectSpecies,
    tradeRates,
    pauseStats,
    achievementDefs,
    gridExpansionInfo,
    prestigeInfo,
    pauseUnlockedCosmetics,
    pauseLockedCosmetics,
    mobileActions,
    cosmetic,
    activeBorderCosmetic,
  } = useGameUIData();

  const [buildPanelOpen, setBuildPanelOpen] = useState(false);
  const [tradeDialogOpen, setTradeDialogOpen] = useState(false);

  // Crafting station panel state driven by store (Spec §44, §22)
  const activeCraftingStation = useGameStore((s) => s.activeCraftingStation);

  const closeCraftingStation = useCallback(() => {
    useGameStore.getState().setActiveCraftingStation(null);
  }, []);

  // Open BuildPanel when BUILD action dispatches (Spec §46)
  useEffect(() => {
    if (activeCraftingStation?.type === "kitbash") {
      setBuildPanelOpen(true);
      // Clear the crafting station so it doesn't re-trigger
      useGameStore.getState().setActiveCraftingStation(null);
    }
  }, [activeCraftingStation]);

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {/* Prestige cosmetic vignette border */}
      {cosmetic ? (
        <View
          style={[styles.vignette, { borderWidth: 3, borderColor: cosmetic.borderColor }]}
          pointerEvents="none"
        />
      ) : null}

      {/* Weather visual overlay (rain, drought, windstorm) */}
      <WeatherOverlay />

      {/* Full FPS HUD overlay — self-contained, reads from ECS + Legend State */}
      <HUD onOpenMenu={onOpenMenu} onOpenSeedSelect={() => setSeedSelectOpen(true)} />

      {/* Weather forecast widget - below HUD */}
      {currentWeather && gameTime ? (
        <View style={styles.weatherForecast} pointerEvents="box-none">
          <WeatherForecast
            currentWeather={currentWeather}
            weatherTimeRemaining={weatherTimeRemaining ?? 0}
            currentSeason={gameTime.season}
          />
        </View>
      ) : null}

      {/* Batch harvest button */}
      {onBatchHarvest ? (
        <View style={styles.batchHarvest} pointerEvents="box-none">
          <BatchHarvestButton
            readyCount={batchHarvestReadyCount ?? 0}
            onBatchHarvest={onBatchHarvest}
          />
        </View>
      ) : null}

      {/* Mobile controls -- joystick (left) + action buttons (right) */}
      {movementRef ? (
        <VirtualJoystick movementRef={movementRef} onActiveChange={onJoystickActiveChange} />
      ) : null}
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
        playerLevel={level}
        resources={resources}
        onSelectPiece={(pieceType, material) => {
          useGameStore.getState().setBuildMode(true, `${pieceType}:${material}`);
          setBuildPanelOpen(false);
        }}
        onClose={() => setBuildPanelOpen(false)}
      />
      <TradeDialog
        open={tradeDialogOpen}
        resources={resources}
        rates={tradeRates}
        npcName={nearbyNpcTemplateId ?? undefined}
        onExecuteTrade={(rate, quantity) => {
          const store = useGameStore.getState();
          const totalCost = rate.fromAmount * quantity;
          const totalGain = rate.toAmount * quantity;
          if (store.spendResource(rate.from, totalCost)) {
            store.addResource(rate.to, totalGain);
            store.recordMarketTrade(rate.from, "sell", totalCost);
            store.recordMarketTrade(rate.to, "buy", totalGain);
            if (nearbyNpcTemplateId) {
              store.awardNpcTradingXp(nearbyNpcTemplateId);
            }
          }
        }}
        onClose={() => setTradeDialogOpen(false)}
      />
      {/* Crafting station panels — driven by activeCraftingStation (Spec §44, §22) */}
      <FishingPanel
        open={activeCraftingStation?.type === "fishing"}
        onClose={closeCraftingStation}
      />
      <CookingPanel
        open={activeCraftingStation?.type === "cooking"}
        onClose={closeCraftingStation}
      />
      <ForgingPanel
        open={activeCraftingStation?.type === "forging"}
        onClose={closeCraftingStation}
        inventory={resources}
        toolUpgrades={useGameStore.getState().toolUpgrades ?? {}}
        onSmelt={(recipe) => {
          const store = useGameStore.getState();
          for (const [resId, amount] of Object.entries(recipe.inputs)) {
            store.spendResource(resId as keyof typeof resources, amount);
          }
          store.addResource(recipe.output.itemId as keyof typeof resources, recipe.output.amount);
        }}
        onUpgrade={(toolId) => {
          useGameStore.getState().upgradeToolTier(toolId);
        }}
      />

      {/* NpcDialogue is now self-driven from ECS via dialogueBridge */}
      <NpcDialogue />
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
      <TutorialOverlay targetRect={tutorialTargetRect ?? null} label={tutorialLabel ?? null} />
    </View>
  );
}
