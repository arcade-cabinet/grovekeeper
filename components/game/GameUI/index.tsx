import { useState } from "react";
import { Platform, View } from "react-native";
import { useGameStore } from "@/game/stores/gameStore";
import { BatchHarvestButton } from "../BatchHarvestButton.tsx";
import { BuildPanel } from "../BuildPanel.tsx";
import { HUD } from "../HUD.tsx";
import { MiniMap } from "../MiniMap/index.ts";
import { MobileActionButtons } from "../MobileActionButtons.tsx";
import { NpcDialogue } from "../NpcDialogue.tsx";
import { PauseMenu } from "../PauseMenu/index.tsx";
import { RadialActionMenu } from "../RadialActionMenu.tsx";
import { SeedSelect } from "../SeedSelect.tsx";
import { StaminaGauge } from "../StaminaGauge.tsx";
import { ToolBelt } from "../ToolBelt.tsx";
import { ToolWheel } from "../ToolWheel.tsx";
import { TradeDialog } from "../TradeDialog.tsx";
import { TutorialOverlay } from "../TutorialOverlay.tsx";
import { VirtualJoystick } from "../VirtualJoystick.tsx";
import { WeatherForecast } from "../WeatherForecast.tsx";
import { WeatherOverlay } from "../WeatherOverlay.tsx";
import { styles } from "./styles";
import type { GameUIProps } from "./types";
import { useGameUIData } from "./useGameUIData";

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
    stamina,
    maxStamina,
    achievements,
    soundEnabled,
    hapticsEnabled,
    toolBeltTools,
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

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {/* Prestige cosmetic vignette border */}
      {cosmetic && (
        <View
          style={[styles.vignette, { borderWidth: 3, borderColor: cosmetic.borderColor }]}
          pointerEvents="none"
        />
      )}

      {/* Weather visual overlay (rain, drought, windstorm) */}
      <WeatherOverlay weatherType={currentWeather ?? "clear"} />

      {/* Full FPS HUD overlay — self-contained, reads from ECS + Legend State */}
      <HUD onOpenMenu={onOpenMenu} onOpenSeedSelect={() => setSeedSelectOpen(true)} />

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
        <VirtualJoystick movementRef={movementRef} onActiveChange={onJoystickActiveChange} />
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
