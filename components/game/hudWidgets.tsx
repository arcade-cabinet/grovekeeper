/**
 * hudWidgets -- Small HUD sub-components extracted from HUD.tsx.
 *
 * Crosshair, StaminaRing (SVG arc), Compass (spirit proximity glow),
 * HungerIndicator, BodyTempIndicator, TimeChip.
 */

import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { ACCENT, HUD_PANEL, LIGHT } from "@/components/ui/tokens";
import { grovekeeperSpiritsQuery } from "@/game/ecs/world";
import { computeTimeState } from "@/game/systems/time";
import {
  findNearestUndiscoveredSpirit,
  resolveCompassBearing,
  spiritGlowIntensity,
  staminaArcPath,
  temperatureExtreme,
} from "./hudAnimations.ts";

// -- Crosshair ----------------------------------------------------------------

export function Crosshair() {
  return (
    <View style={styles.crosshairWrap} pointerEvents="none">
      <View style={styles.crosshairDot} />
    </View>
  );
}

// -- Stamina Ring (SVG arc) ---------------------------------------------------

const RING_SIZE = 60;
const RING_CENTER = RING_SIZE / 2;
const RING_RADIUS = 24;

export function StaminaRing({ stamina, maxStamina }: { stamina: number; maxStamina: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const isVisible = stamina < maxStamina - 0.5;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: isVisible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isVisible, fadeAnim]);

  const fraction = stamina / maxStamina;
  const color = fraction < 0.25 ? ACCENT.ember : fraction < 0.5 ? ACCENT.amber : ACCENT.sap;
  const pathD = staminaArcPath(RING_CENTER, RING_CENTER, RING_RADIUS, fraction);

  if (!pathD) return null;

  return (
    <Animated.View style={[styles.staminaWrap, { opacity: fadeAnim }]} pointerEvents="none">
      <Svg width={RING_SIZE} height={RING_SIZE}>
        <Path
          d={pathD}
          stroke={color}
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
          opacity={0.85}
        />
      </Svg>
    </Animated.View>
  );
}

// -- Compass (spirit proximity glow) ------------------------------------------

export function Compass({ playerX, playerZ }: { playerX: number; playerZ: number }) {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const poi = findNearestUndiscoveredSpirit([...grovekeeperSpiritsQuery], playerX, playerZ);

  const bearing = poi ? resolveCompassBearing(playerX, playerZ, poi.x, poi.z) : 0;
  const glow = poi ? spiritGlowIntensity(poi.distance) : 0;
  const isClose = glow > 0;

  // biome-ignore lint/correctness/useExhaustiveDependencies: glow drives animation target
  useEffect(() => {
    if (!isClose) {
      pulseAnim.setValue(0);
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [isClose, pulseAnim]);

  if (!poi) return null;

  const glowRadius = 4 + glow * 12;

  return (
    <View style={styles.compassWrap} pointerEvents="none">
      <Animated.Text
        style={[
          styles.compassArrow,
          {
            transform: [{ rotate: `${bearing}deg` }],
            textShadowRadius: glowRadius,
            opacity: isClose
              ? pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] })
              : 1,
          },
        ]}
        accessibilityLabel={`Spirit at bearing ${Math.round(bearing)} degrees`}
      >
        {"\u25C6"}
      </Animated.Text>
    </View>
  );
}

// -- Hunger indicator ---------------------------------------------------------

export function HungerIndicator({ hunger }: { hunger: number }) {
  if (hunger >= 99.5) return null;
  const pct = Math.round(hunger);
  const color = hunger < 25 ? ACCENT.ember : hunger < 50 ? ACCENT.amber : LIGHT.textSecondary;
  return (
    <Text style={[styles.hungerText, { color }]} pointerEvents="none">
      {hunger < 25 ? "\uD83C\uDF56" : ""} {pct}%
    </Text>
  );
}

// -- Body temperature indicator -----------------------------------------------

export function BodyTempIndicator({ bodyTemp }: { bodyTemp: number }) {
  const extreme = temperatureExtreme(bodyTemp);
  if (!extreme) return null;

  const icon = extreme === "cold" ? "\u{1F976}" : "\u{1F975}";
  const color = extreme === "cold" ? ACCENT.frost : ACCENT.ember;

  return (
    <Text style={[styles.tempText, { color }]} pointerEvents="none">
      {icon}
    </Text>
  );
}

// -- Time chip ----------------------------------------------------------------

export function TimeChip({
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

// -- Styles -------------------------------------------------------------------

const styles = StyleSheet.create({
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
    shadowColor: "#fff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
  },
  staminaWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
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
  hungerText: {
    fontSize: 11,
    fontWeight: "600",
    textShadowColor: "rgba(255,255,255,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  tempText: {
    fontSize: 14,
  },
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
