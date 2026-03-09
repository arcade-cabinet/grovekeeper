/**
 * FishingPanel -- FPS HUD overlay for the fishing timing minigame.
 *
 * Opened by the FISH action dispatcher when the player interacts with a
 * fishable water body (store.activeCraftingStation.type === "fishing").
 *
 * Uses the pure state machine from game/systems/fishing.ts. All timing,
 * species selection, and yield computation are config-driven (fishing.json).
 *
 * Spec §44 (Fishing Mechanic)
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/text";
import { ACCENT, DARK, FONTS, HUD_PANEL, LIGHT, RADIUS, SPACE, TYPE } from "@/components/ui/tokens";
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
import {
  computeBiteUrgency,
  computeWaitProgress,
  getPhaseText,
  isActionEnabled,
  isTimingBarVisible,
} from "./fishingPanelLogic.ts";

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

  // Start fishing session when panel opens
  useEffect(() => {
    if (!open) return;

    const state = createFishingState();
    const rng = scopedRNG("fish", worldSeed, String(castCountRef.current));
    startFishing(state, rng);
    castCountRef.current += 1;
    setFishingState({ ...state });
    stateRef.current = state;
    lastTimeRef.current = performance.now();

    // Animation loop
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

  // Handle catch result when session completes
  useEffect(() => {
    if (!isFishingComplete(fishingState)) return;

    if (fishingState.phase === "caught") {
      const rng = scopedRNG("fish", worldSeed, String(castCountRef.current));
      const species = selectFishSpecies(currentZoneId, currentSeason, rng);
      const yield_ = computeFishYield(false);

      useGameStore.getState().addResource("fish" as ResourceType, yield_);
      useGameStore.getState().incrementToolUse("fishing-rod");

      const speciesName = species ?? "fish";
      showToast(`Caught ${yield_} ${speciesName}!`, "success");
    } else {
      showToast("The fish got away!", "info");
    }

    // Auto-close after a brief delay
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
  const waitProgress = computeWaitProgress(
    fishingState.phase,
    fishingState.elapsed,
    fishingState.waitDuration,
  );
  const biteUrgency = computeBiteUrgency(fishingState.phase, fishingState.elapsed, 4);

  return (
    <View style={StyleSheet.absoluteFillObject} className="items-center justify-center px-4">
      {/* Backdrop */}
      <Pressable
        style={StyleSheet.absoluteFillObject}
        className="bg-black/20"
        onPress={onClose}
        accessibilityLabel="Close fishing panel"
      />

      {/* Panel */}
      <View style={styles.panel}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Fishing</Text>
          <Pressable style={styles.closeButton} onPress={onClose} accessibilityLabel="Close">
            <Text style={styles.closeText}>X</Text>
          </Pressable>
        </View>

        {/* Phase text */}
        <View style={styles.phaseContainer}>
          <Text style={styles.phaseText}>{phaseText}</Text>
        </View>

        {/* Wait progress indicator */}
        {fishingState.phase === "waiting" && (
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarFill, { width: `${waitProgress * 100}%` }]} />
          </View>
        )}

        {/* Bite urgency indicator */}
        {fishingState.phase === "biting" && (
          <View style={styles.urgencyBarContainer}>
            <View
              style={[
                styles.urgencyBarFill,
                {
                  width: `${(1 - biteUrgency) * 100}%`,
                  backgroundColor: biteUrgency > 0.7 ? ACCENT.ember : ACCENT.amber,
                },
              ]}
            />
            <Text style={styles.urgencyLabel}>TAP NOW!</Text>
          </View>
        )}

        {/* Timing bar minigame */}
        {showBar && (
          <View style={styles.timingBarContainer}>
            {/* Success zone */}
            <View
              style={[
                styles.timingZone,
                {
                  left: `${fishingState.zoneStart * 100}%`,
                  width: `${(fishingState.zoneEnd - fishingState.zoneStart) * 100}%`,
                },
              ]}
            />
            {/* Cursor */}
            <View
              style={[styles.timingCursor, { left: `${fishingState.timingProgress * 100}%` }]}
            />
          </View>
        )}

        {/* Action button */}
        <View style={styles.actionContainer}>
          <Pressable
            style={[styles.actionButton, !actionEnabled && styles.actionButtonDisabled]}
            onPress={handleAction}
            disabled={!actionEnabled}
            accessibilityLabel="Fishing action"
          >
            <Text
              style={[styles.actionButtonText, !actionEnabled && styles.actionButtonTextDisabled]}
            >
              {fishingState.phase === "biting" ? "REEL!" : "HIT!"}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  panel: {
    ...HUD_PANEL,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderColor: LIGHT.borderBranch,
    borderWidth: 1,
    borderRadius: RADIUS.organic,
    width: "100%",
    maxWidth: 380,
    zIndex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACE[3],
    paddingVertical: SPACE[2],
    borderBottomWidth: 1,
    borderBottomColor: LIGHT.borderBranch,
  },
  title: {
    ...TYPE.display,
    fontFamily: FONTS.heading,
    color: LIGHT.textPrimary,
  },
  closeButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    ...TYPE.heading,
    color: LIGHT.textSecondary,
    fontWeight: "700",
  },
  phaseContainer: {
    paddingHorizontal: SPACE[3],
    paddingVertical: SPACE[3],
    alignItems: "center",
  },
  phaseText: {
    ...TYPE.heading,
    color: LIGHT.textPrimary,
    textAlign: "center",
  },
  progressBarContainer: {
    height: 8,
    marginHorizontal: SPACE[3],
    marginBottom: SPACE[2],
    backgroundColor: "rgba(102,187,106,0.2)",
    borderRadius: RADIUS.pill,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: ACCENT.frost,
    borderRadius: RADIUS.pill,
  },
  urgencyBarContainer: {
    height: 24,
    marginHorizontal: SPACE[3],
    marginBottom: SPACE[2],
    backgroundColor: "rgba(102,187,106,0.2)",
    borderRadius: RADIUS.pill,
    overflow: "hidden",
    justifyContent: "center",
  },
  urgencyBarFill: {
    position: "absolute",
    height: "100%",
    borderRadius: RADIUS.pill,
  },
  urgencyLabel: {
    ...TYPE.critical,
    color: LIGHT.textPrimary,
    textAlign: "center",
    zIndex: 1,
  },
  timingBarContainer: {
    height: 32,
    marginHorizontal: SPACE[3],
    marginBottom: SPACE[3],
    backgroundColor: "rgba(102,187,106,0.2)",
    borderRadius: RADIUS.pill,
    overflow: "hidden",
    position: "relative",
  },
  timingZone: {
    position: "absolute",
    top: 0,
    height: "100%",
    backgroundColor: "rgba(74, 222, 128, 0.35)",
    borderRadius: RADIUS.pill,
  },
  timingCursor: {
    position: "absolute",
    top: 2,
    width: 4,
    height: 28,
    backgroundColor: ACCENT.sap,
    borderRadius: 2,
    marginLeft: -2,
  },
  actionContainer: {
    paddingHorizontal: SPACE[3],
    paddingBottom: SPACE[3],
    alignItems: "center",
  },
  actionButton: {
    backgroundColor: ACCENT.sap,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACE[5],
    paddingVertical: SPACE[2],
    minWidth: 120,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonDisabled: {
    backgroundColor: "rgba(102,187,106,0.2)",
    opacity: 0.5,
  },
  actionButtonText: {
    ...TYPE.heading,
    color: "#FAFAFA",
    fontWeight: "700",
  },
  actionButtonTextDisabled: {
    color: LIGHT.textMuted,
  },
});
