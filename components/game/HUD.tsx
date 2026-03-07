/**
 * HUD -- Full FPS HUD overlay (Spec §24).
 *
 * Self-contained: reads live data from ECS queries and Legend State.
 * Renders: top bar (resources, XP, time, menu), compass arrow toward the
 * nearest undiscovered Grovekeeper spirit, center crosshair, target info,
 * and a right-side panel with stamina gauge + tool belt.
 *
 * Mobile-first: all touch targets >= 44px, no overlap with virtual joystick zone.
 */

import { useMemo, useState } from "react";
import { MenuIcon, ScrollIcon } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@/components/ui/icon";
import { TargetInfo } from "@/components/player/TargetInfo";
import { TOOLS } from "@/game/config/tools";
import { grovekeeperSpiritsQuery, playerQuery } from "@/game/ecs/world";
import { totalXpForLevel, useGameStore, xpToNext } from "@/game/stores/gameStore";
import { computeTimeState } from "@/game/systems/time";
import { ConnectedQuestPanel } from "./QuestPanel";
import { ResourceBar } from "./ResourceBar";
import { StaminaGauge } from "./StaminaGauge";
import { TimeDisplayCompact, type GameTime } from "./TimeDisplay";
import { ToolBelt } from "./ToolBelt";
import { XPBar } from "./XPBar";

// ── Pure exports (testable seams) ────────────────────────────────────────────

/**
 * Compass bearing in degrees from player to target.
 * 0 = North (−Z axis), 90 = East (+X), 180 = South (+Z), 270 = West (−X).
 */
export function resolveCompassBearing(
  playerX: number,
  playerZ: number,
  targetX: number,
  targetZ: number,
): number {
  const dx = targetX - playerX;
  const dz = targetZ - playerZ;
  const angle = Math.atan2(dx, -dz) * (180 / Math.PI);
  return ((angle % 360) + 360) % 360;
}

/**
 * Returns the world-space position of the nearest undiscovered Grovekeeper
 * spirit, or null when all spirits are discovered or none exist in the world.
 */
export function findNearestUndiscoveredSpirit(
  spirits: ReadonlyArray<{
    position: { x: number; z: number };
    grovekeeperSpirit: { discovered: boolean };
  }>,
  playerX: number,
  playerZ: number,
): { x: number; z: number } | null {
  let nearest: { x: number; z: number } | null = null;
  let minDist = Infinity;
  for (const s of spirits) {
    if (s.grovekeeperSpirit.discovered) continue;
    const dx = s.position.x - playerX;
    const dz = s.position.z - playerZ;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < minDist) {
      minDist = dist;
      nearest = { x: s.position.x, z: s.position.z };
    }
  }
  return nearest;
}

// ── Stable module-level tool data (no per-render allocation) ─────────────────

const TOOL_BELT_DATA = TOOLS.map((t) => ({
  id: t.id,
  name: t.name,
  unlockLevel: t.unlockLevel,
}));

// ── Crosshair ─────────────────────────────────────────────────────────────────

function Crosshair() {
  return (
    <View style={styles.crosshairWrap} pointerEvents="none">
      <View style={styles.crosshairH} />
      <View style={styles.crosshairV} />
    </View>
  );
}

// ── Compass ───────────────────────────────────────────────────────────────────

function Compass({ playerX, playerZ }: { playerX: number; playerZ: number }) {
  // Snapshot query — refreshes on every re-render (gameTimeMicroseconds drives ~60fps updates)
  const poi = findNearestUndiscoveredSpirit([...grovekeeperSpiritsQuery], playerX, playerZ);
  if (!poi) return null;

  const bearing = resolveCompassBearing(playerX, playerZ, poi.x, poi.z);

  return (
    <View style={styles.compassWrap} pointerEvents="none">
      <Text
        style={[styles.compassArrow, { transform: [{ rotate: `${bearing}deg` }] }]}
        accessibilityLabel={`Compass: spirit at bearing ${Math.round(bearing)} degrees`}
      >
        ↑
      </Text>
    </View>
  );
}

// ── HUD ───────────────────────────────────────────────────────────────────────

export interface HUDProps {
  /** Opens the pause menu. */
  onOpenMenu: () => void;
  /** Opens the seed selector modal (triggered when trowel slot is tapped). */
  onOpenSeedSelect: () => void;
}

export function HUD({ onOpenMenu, onOpenSeedSelect }: HUDProps) {
  const resources = useGameStore((s) => s.resources);
  const level = useGameStore((s) => s.level);
  const xp = useGameStore((s) => s.xp);
  const stamina = useGameStore((s) => s.stamina);
  const maxStamina = useGameStore((s) => s.maxStamina);
  const selectedTool = useGameStore((s) => s.selectedTool);
  const gameTimeMicroseconds = useGameStore((s) => s.gameTimeMicroseconds);
  const currentSeason = useGameStore((s) => s.currentSeason);
  const unlockedTools = useGameStore((s) => s.unlockedTools);
  const seeds = useGameStore((s) => s.seeds);
  const selectedSpecies = useGameStore((s) => s.selectedSpecies);

  const [questPanelVisible, setQuestPanelVisible] = useState(false);

  const xpProgress = useMemo(() => {
    const base = totalXpForLevel(level);
    const needed = xpToNext(level);
    return needed <= 0 ? 1 : (xp - base) / needed;
  }, [xp, level]);

  const gameTime: GameTime = useMemo(() => {
    const ts = computeTimeState(gameTimeMicroseconds);
    return {
      hours: ts.hour,
      minutes: Math.floor((ts.dayProgress * 24 - ts.hour) * 60),
      day: ts.dayNumber,
      season: currentSeason,
    };
  }, [gameTimeMicroseconds, currentSeason]);

  // Player position snapshot from ECS — updated on every Legend State re-render.
  // gameTimeMicroseconds ticks every frame, so this refreshes at game-loop frequency.
  const [playerEntity] = [...playerQuery];
  const playerX = playerEntity?.position?.x ?? 0;
  const playerZ = playerEntity?.position?.z ?? 0;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* ── Top safe-area bar ─────────────────────────────────────── */}
      <SafeAreaView edges={["top"]} pointerEvents="box-none" style={styles.safeTop}>
        <View style={styles.topBar}>
          <View style={styles.topLeft}>
            <ResourceBar resources={resources} />
            <XPBar level={level} progress={xpProgress} />
            <TimeDisplayCompact time={gameTime} />
          </View>
          <Pressable
            style={styles.menuButton}
            onPress={() => setQuestPanelVisible((v) => !v)}
            accessibilityLabel="Toggle quest panel"
          >
            <Icon as={ScrollIcon} size={22} className="text-white" />
          </Pressable>
          <Pressable
            style={styles.menuButton}
            onPress={onOpenMenu}
            accessibilityLabel="Open menu"
          >
            <Icon as={MenuIcon} size={22} className="text-white" />
          </Pressable>
        </View>
        {/* Compass — arrow pointing toward nearest undiscovered spirit */}
        <Compass playerX={playerX} playerZ={playerZ} />
      </SafeAreaView>

      {/* ── Center: crosshair + target info ───────────────────────── */}
      <Crosshair />
      <TargetInfo />

      {/* ── Left quest panel (toggled via quest button) ──────────── */}
      {questPanelVisible && (
        <View style={styles.questPanel} pointerEvents="box-none">
          <ConnectedQuestPanel onDismiss={() => setQuestPanelVisible(false)} />
        </View>
      )}

      {/* ── Right-side panel: stamina gauge + tool belt ───────────── */}
      <View style={styles.rightPanel} pointerEvents="box-none">
        <StaminaGauge stamina={stamina} maxStamina={maxStamina} />
        <ToolBelt
          tools={TOOL_BELT_DATA}
          selectedTool={selectedTool}
          unlockedTools={unlockedTools}
          level={level}
          selectedSpecies={selectedSpecies}
          seedCount={seeds[selectedSpecies] ?? 0}
          onSelectTool={(id) => {
            useGameStore.getState().setSelectedTool(id);
            if (id === "trowel") onOpenSeedSelect();
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  topLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: 0,
  },
  menuButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
  },
  crosshairWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  crosshairH: {
    position: "absolute",
    width: 20,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.85)",
  },
  crosshairV: {
    position: "absolute",
    width: 2,
    height: 20,
    backgroundColor: "rgba(255,255,255,0.85)",
  },
  compassWrap: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  compassArrow: {
    fontSize: 22,
    color: "#FFDD88",
    fontWeight: "bold",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  rightPanel: {
    position: "absolute",
    right: 16,
    bottom: 100,
    alignItems: "flex-end",
    gap: 8,
  },
  questPanel: {
    position: "absolute",
    top: 80,
    left: 8,
  },
});
