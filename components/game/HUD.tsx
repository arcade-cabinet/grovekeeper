/**
 * HUD -- Zelda-inspired minimal FPS overlay (Spec S24).
 *
 * Design philosophy: The world IS the UI. The HUD should be nearly invisible.
 * - Hearts: top-left, always visible (like every Zelda game since 1986)
 * - Hunger: tiny icon below hearts, only when < 100%
 * - Compass: golden arrow toward nearest spirit (Navi-style guidance)
 * - Crosshair: subtle dot, not a thick cross
 * - Target info: context text when looking at something interactable
 * - Stamina: ring around crosshair, only visible when draining
 *
 * REMOVED from HUD (accessible via Pause Menu only):
 * - Resource bars (timber, sap, fruit, acorns)
 * - XP bar
 * - Tool belt / tool grid
 * - Stamina gauge bar
 *
 * Tool switching: via Tool Wheel (Tab / long-press). Tool appears in 3D hand.
 */

import { MenuIcon } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TargetInfo } from "@/components/player/TargetInfo";
import { Icon } from "@/components/ui/icon";
import { ACCENT, HUD_PANEL, LIGHT } from "@/components/ui/tokens";
import { grovekeeperSpiritsQuery, playerQuery } from "@/game/ecs/world";
import { useGameStore } from "@/game/stores";
import { computeTimeState } from "@/game/systems/time";
import { HeartsDisplay } from "./HeartsDisplay.tsx";

// -- Pure exports (testable seams) --------------------------------------------
/**
 * Compass bearing in degrees from player to target.
 * 0 = North (-Z axis), 90 = East (+X), 180 = South (+Z), 270 = West (-X).
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

// -- Crosshair -- Zelda-style subtle dot --------------------------------------

function Crosshair() {
  return (
    <View style={styles.crosshairWrap} pointerEvents="none">
      <View style={styles.crosshairDot} />
    </View>
  );
}

// -- Compass -- golden arrow toward nearest spirit ----------------------------

function Compass({ playerX, playerZ }: { playerX: number; playerZ: number }) {
  const poi = findNearestUndiscoveredSpirit([...grovekeeperSpiritsQuery], playerX, playerZ);
  if (!poi) return null;

  const bearing = resolveCompassBearing(playerX, playerZ, poi.x, poi.z);

  return (
    <View style={styles.compassWrap} pointerEvents="none">
      <Text
        style={[styles.compassArrow, { transform: [{ rotate: `${bearing}deg` }] }]}
        accessibilityLabel={`Spirit at bearing ${Math.round(bearing)} degrees`}
      >
        {"\u25C6"}
      </Text>
    </View>
  );
}

// -- Hunger indicator -- tiny, only when < 100% ------------------------------

function HungerIndicator({ hunger }: { hunger: number }) {
  if (hunger >= 99.5) return null;
  const pct = Math.round(hunger);
  const color = hunger < 25 ? ACCENT.ember : hunger < 50 ? ACCENT.amber : LIGHT.textSecondary;
  return (
    <Text style={[styles.hungerText, { color }]} pointerEvents="none">
      {hunger < 25 ? "\uD83C\uDF56" : ""} {pct}%
    </Text>
  );
}

// -- Stamina ring -- appears around crosshair only when < max ----------------

function StaminaRing({ stamina, maxStamina }: { stamina: number; maxStamina: number }) {
  if (stamina >= maxStamina - 0.5) return null;
  const pct = stamina / maxStamina;
  const color = pct < 0.25 ? ACCENT.ember : pct < 0.5 ? ACCENT.amber : ACCENT.sap;
  return (
    <View style={styles.staminaWrap} pointerEvents="none">
      <Text style={[styles.staminaText, { color }]}>{Math.round(stamina)}</Text>
    </View>
  );
}

// -- Time -- tiny corner display ---------------------------------------------

function TimeChip({
  gameTimeMicroseconds,
  currentSeason,
}: {
  gameTimeMicroseconds: number;
  currentSeason: string;
}) {
  const ts = computeTimeState(gameTimeMicroseconds);
  const hour = ts.hour;
  const period = hour < 6 ? "Night" : hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";
  const seasonCap = currentSeason.charAt(0).toUpperCase() + currentSeason.slice(1);
  return (
    <View style={styles.timeChipContainer} pointerEvents="none">
      <Text style={styles.timeChip}>
        {period} {seasonCap}
      </Text>
    </View>
  );
}

// -- HUD ---------------------------------------------------------------------

export interface HUDProps {
  /** Opens the pause menu. */
  onOpenMenu: () => void;
  /** Opens the seed selector modal (triggered when trowel slot is tapped). */
  onOpenSeedSelect: () => void;
}

export function HUD({ onOpenMenu }: HUDProps) {
  const stamina = useGameStore((s) => s.stamina);
  const maxStamina = useGameStore((s) => s.maxStamina);
  const gameTimeMicroseconds = useGameStore((s) => s.gameTimeMicroseconds);
  const currentSeason = useGameStore((s) => s.currentSeason);
  const hearts = useGameStore((s) => s.hearts ?? 5);
  const maxHearts = useGameStore((s) => s.maxHearts ?? 5);
  const hunger = useGameStore((s) => s.hunger ?? 100);

  // Player position from ECS for compass
  const [playerEntity] = [...playerQuery];
  const playerX = playerEntity?.position?.x ?? 0;
  const playerZ = playerEntity?.position?.z ?? 0;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none" testID="hud-overlay">
      {/* -- Top-left: Hearts + hunger (Zelda-style) -- */}
      <SafeAreaView edges={["top"]} pointerEvents="box-none" style={styles.safeTop}>
        <View style={styles.topRow}>
          <View style={styles.heartsColumn}>
            <HeartsDisplay current={hearts} max={maxHearts} />
            <HungerIndicator hunger={hunger} />
          </View>
          <View style={styles.topRight}>
            <TimeChip gameTimeMicroseconds={gameTimeMicroseconds} currentSeason={currentSeason} />
            <Compass playerX={playerX} playerZ={playerZ} />
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
    backgroundColor: "rgba(240,253,244,0.5)",
  },
  // Crosshair: subtle white dot (not thick cross)
  crosshairWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  crosshairDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.7)",
    // Glow effect via shadow
    shadowColor: "#fff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
  },
  // Compass: golden diamond pointing to spirits
  compassWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  compassArrow: {
    fontSize: 16,
    color: ACCENT.gold,
    textShadowColor: "rgba(255,215,0,0.6)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  // Hunger: tiny text under hearts
  hungerText: {
    fontSize: 11,
    fontWeight: "600",
    textShadowColor: "rgba(255,255,255,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  // Stamina: appears below crosshair when draining
  staminaWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 40,
  },
  staminaText: {
    fontSize: 12,
    fontWeight: "700",
    textShadowColor: "rgba(255,255,255,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  // Time: chip in top-right with bright panel
  timeChipContainer: {
    ...HUD_PANEL,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  timeChip: {
    fontSize: 11,
    color: LIGHT.textSecondary,
    fontWeight: "600",
  },
});
