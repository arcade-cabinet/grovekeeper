/**
 * HUD -- Zelda-inspired minimal FPS overlay (Spec S24).
 *
 * Design philosophy: The world IS the UI. The HUD should be nearly invisible.
 * - Hearts: top-left, always visible (like every Zelda game since 1986)
 * - Hunger: tiny icon below hearts, only when < 100%
 * - Compass: golden arrow toward nearest spirit (Navi-style guidance)
 *   -- pulses/glows brighter when spirit is within 20m
 * - Crosshair: subtle dot, not a thick cross
 * - Target info: context text when looking at something interactable
 * - Stamina: SVG arc ring around crosshair, only visible when draining
 * - Body temp: thermometer icon when extreme (< 30 or > 80)
 *
 * REMOVED from HUD (accessible via Pause Menu only):
 * - Resource bars, XP bar, Tool belt, Stamina gauge bar
 *
 * Tool switching: via Tool Wheel (Tab / long-press). Tool appears in 3D hand.
 */

import { BookOpenIcon, MenuIcon } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TargetInfo } from "@/components/player/TargetInfo";
import { Icon } from "@/components/ui/icon";
import { playerQuery } from "@/game/ecs/world";
import { useGameStore } from "@/game/stores";
import { HeartsDisplay } from "./HeartsDisplay.tsx";
import { HungerBar } from "./HungerBar.tsx";
import { BodyTempIndicator, Compass, Crosshair, StaminaRing, TimeChip } from "./hudWidgets.tsx";

// Re-export pure functions so existing tests / consumers can import from HUD
export { findNearestUndiscoveredSpirit, resolveCompassBearing } from "./hudAnimations.ts";

// -- HUD ---------------------------------------------------------------------

export interface HUDProps {
  /** Opens the pause menu. */
  onOpenMenu: () => void;
  /** Opens the seed selector modal (triggered when trowel slot is tapped). */
  onOpenSeedSelect: () => void;
  /** Opens the species codex modal (Spec §21). */
  onOpenCodex?: () => void;
}

export function HUD({ onOpenMenu, onOpenCodex }: HUDProps) {
  const stamina = useGameStore((s) => s.stamina);
  const maxStamina = useGameStore((s) => s.maxStamina);
  const gameTimeMicroseconds = useGameStore((s) => s.gameTimeMicroseconds);
  const currentSeason = useGameStore((s) => s.currentSeason);
  const hearts = useGameStore((s) => s.hearts ?? 5);
  const maxHearts = useGameStore((s) => s.maxHearts ?? 5);
  const hunger = useGameStore((s) => s.hunger ?? 100);
  const bodyTemp = useGameStore((s) => s.bodyTemp ?? 37);

  // Player position from ECS for compass
  const [playerEntity] = [...playerQuery];
  const playerX = playerEntity?.position?.x ?? 0;
  const playerZ = playerEntity?.position?.z ?? 0;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none" testID="hud-overlay">
      {/* -- Top-left: Hearts + hunger + temp (Zelda-style) -- */}
      <SafeAreaView edges={["top"]} pointerEvents="box-none" style={styles.safeTop}>
        <View style={styles.topRow}>
          <View style={styles.heartsColumn}>
            <View style={styles.heartsRow}>
              <HeartsDisplay current={hearts} max={maxHearts} />
              <BodyTempIndicator bodyTemp={bodyTemp} />
            </View>
            <HungerBar hunger={hunger} />
          </View>
          <View style={styles.topRight}>
            <TimeChip gameTimeMicroseconds={gameTimeMicroseconds} currentSeason={currentSeason} />
            <Compass playerX={playerX} playerZ={playerZ} />
            {onOpenCodex && (
              <Pressable
                style={styles.menuButton}
                onPress={onOpenCodex}
                accessibilityLabel="Open species codex"
                testID="btn-open-codex"
              >
                <Icon as={BookOpenIcon} size={18} className="text-emerald-800/70" />
              </Pressable>
            )}
            <Pressable
              style={styles.menuButton}
              onPress={onOpenMenu}
              accessibilityLabel="Open menu"
              testID="btn-open-menu"
            >
              <Icon as={MenuIcon} size={20} className="text-emerald-800/70" />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      {/* -- Center: crosshair + stamina ring + target info -- */}
      <Crosshair />
      <StaminaRing stamina={stamina} maxStamina={maxStamina} />
      <TargetInfo />
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
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heartsColumn: {
    gap: 2,
  },
  heartsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  topRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  menuButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: "rgba(232,245,233,0.5)",
  },
});
