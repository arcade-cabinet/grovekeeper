/**
 * FishingPanel -- FPS HUD overlay for the fishing timing minigame.
 *
 * Phase-specific visuals:
 * - Cast:    "Cast your line..." with ripple-style progress
 * - Wait:    Bobber pulsing dot + subtle progress bar
 * - Bite:    "NOW!" flash with urgency countdown
 * - Reel:    Timing bar minigame
 * - Result:  Fish name + yield with celebration or escape message
 *
 * Spec §44 (Fishing Mechanic)
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/text";
import type { ResourceType } from "@/game/config/resources";
import { useGameStore } from "@/game/stores";
import {
  computeFishYield,
  createFishingState,
  type FishingState,
  isFishingComplete,
  pressFishingAction,
  selectFishSpecies,
  startFishing,
  tickFishing,
} from "@/game/systems/fishing";
import { showToast } from "@/game/ui/Toast";
import { scopedRNG } from "@/game/utils/seedWords";
import { sharedStyles } from "./craftingPanelShared.ts";
import {
  computeBiteUrgency,
  computeWaitProgress,
  getPhaseText,
  isActionEnabled,
  isTimingBarVisible,
} from "./fishingPanelLogic.ts";
import { fishingStyles as styles } from "./fishingPanelStyles.ts";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface FishingPanelProps {
  open: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FishingPanel({ open, onClose }: FishingPanelProps) {
  const worldSeed = useGameStore((s) => s.worldSeed);
  const currentSeason = useGameStore((s) => s.currentSeason);
  const currentZoneId = useGameStore((s) => s.currentZoneId);

  const [fishingState, setFishingState] = useState<FishingState>(createFishingState);
  const stateRef = useRef(fishingState);
  stateRef.current = fishingState;

  const castCountRef = useRef(0);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef(0);

  useEffect(() => {
    if (!open) return;

    const state = createFishingState();
    const rng = scopedRNG("fish", worldSeed, String(castCountRef.current));
    startFishing(state, rng);
    castCountRef.current += 1;
    setFishingState({ ...state });
    stateRef.current = state;
    lastTimeRef.current = performance.now();

    const tick = (time: number) => {
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = time;
      const current = stateRef.current;
      tickFishing(current, dt);
      setFishingState({ ...current });
      if (!isFishingComplete(current)) {
        animFrameRef.current = requestAnimationFrame(tick);
      }
    };
    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [open, worldSeed]);

  useEffect(() => {
    if (!isFishingComplete(fishingState)) return;

    if (fishingState.phase === "caught") {
      const rng = scopedRNG("fish", worldSeed, String(castCountRef.current));
      const species = selectFishSpecies(currentZoneId, currentSeason, rng);
      const yield_ = computeFishYield(false);
      useGameStore.getState().addResource("fish" as ResourceType, yield_);
      useGameStore.getState().incrementToolUse("fishing-rod");
      showToast(`Caught ${yield_} ${species ?? "fish"}!`, "success");
    } else {
      showToast("The fish got away!", "info");
    }

    const timeout = setTimeout(() => {
      useGameStore.getState().setActiveCraftingStation(null);
      onClose();
    }, 1200);
    return () => clearTimeout(timeout);
  }, [fishingState.phase, worldSeed, currentZoneId, currentSeason, onClose, fishingState]);

  const handleAction = useCallback(() => {
    const current = stateRef.current;
    pressFishingAction(current);
    setFishingState({ ...current });
  }, []);

  if (!open) return null;

  const phaseText = getPhaseText(fishingState.phase);
  const showBar = isTimingBarVisible(fishingState.phase);
  const actionEnabled = isActionEnabled(fishingState.phase);
  const waitProg = computeWaitProgress(
    fishingState.phase,
    fishingState.elapsed,
    fishingState.waitDuration,
  );
  const biteUrg = computeBiteUrgency(fishingState.phase, fishingState.elapsed, 4);

  const isBiting = fishingState.phase === "biting";
  const isCaught = fishingState.phase === "caught";
  const isEscaped = fishingState.phase === "escaped";
  const isWaiting = fishingState.phase === "waiting";

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={sharedStyles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={onClose}
          accessibilityLabel="Close fishing panel"
        />
        <View style={[sharedStyles.panel, styles.fishingPanel]}>
          {/* Header */}
          <View style={sharedStyles.header}>
            <View style={styles.titleRow}>
              <Text style={sharedStyles.titleIcon}>{"\uD83C\uDFA3"}</Text>
              <Text style={sharedStyles.title}>Fishing</Text>
            </View>
            <Pressable
              style={sharedStyles.closeButton}
              onPress={onClose}
              accessibilityLabel="Close"
            >
              <Text style={sharedStyles.closeText}>{"\u2715"}</Text>
            </Pressable>
          </View>

          {/* Phase display */}
          <View style={styles.phaseContainer}>
            <Text
              style={[
                styles.phaseText,
                isBiting && styles.phaseTextBiting,
                isCaught && styles.phaseTextCaught,
                isEscaped && styles.phaseTextEscaped,
              ]}
            >
              {phaseText}
            </Text>
            {isWaiting && (
              <View style={styles.bobberContainer}>
                <View style={styles.waterLine} />
                <View
                  style={[
                    styles.bobber,
                    { transform: [{ translateY: Math.sin(fishingState.elapsed * 3) * 4 }] },
                  ]}
                />
                <View style={[styles.ripple, styles.ripple1]} />
                <View style={[styles.ripple, styles.ripple2]} />
              </View>
            )}
          </View>

          {isWaiting && (
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBarFill, { width: `${waitProg * 100}%` }]} />
            </View>
          )}
          {isBiting && (
            <View style={styles.urgencyBarContainer}>
              <View
                style={[
                  styles.urgencyBarFill,
                  {
                    width: `${(1 - biteUrg) * 100}%`,
                    backgroundColor: biteUrg > 0.7 ? "#EF5350" : "#FFC107",
                  },
                ]}
              />
              <Text style={styles.urgencyLabel}>TAP NOW!</Text>
            </View>
          )}
          {showBar && (
            <View style={styles.timingBarContainer}>
              <View
                style={[
                  styles.timingZone,
                  {
                    left: `${fishingState.zoneStart * 100}%`,
                    width: `${(fishingState.zoneEnd - fishingState.zoneStart) * 100}%`,
                  },
                ]}
              />
              <View
                style={[styles.timingCursor, { left: `${fishingState.timingProgress * 100}%` }]}
              />
            </View>
          )}
          {(isCaught || isEscaped) && (
            <View style={[styles.resultContainer, isCaught && styles.resultContainerCaught]}>
              <Text style={styles.resultEmoji}>{isCaught ? "\uD83D\uDC1F" : "\uD83D\uDCA8"}</Text>
            </View>
          )}

          <View style={styles.actionContainer}>
            <Pressable
              style={[
                styles.actionButton,
                isBiting && styles.actionButtonBiting,
                !actionEnabled && styles.actionButtonDisabled,
              ]}
              onPress={handleAction}
              disabled={!actionEnabled}
              accessibilityLabel="Fishing action"
            >
              <Text
                style={[styles.actionButtonText, !actionEnabled && styles.actionButtonTextDisabled]}
              >
                {isBiting ? "REEL!" : "HIT!"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
