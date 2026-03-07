/**
 * SettingsScreen -- Full settings modal for audio, graphics, controls, and accessibility.
 *
 * Spec §26. Accessible from MainMenu (via route) and PauseMenu (modal).
 * Reads/writes gameStore.settings via Legend State.
 * Mobile-first: 44px touch targets, 375px min viewport.
 */

import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { AccessibilityInfo, Modal, Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/ui/text";
import { useGameStore } from "@/game/stores/gameStore";
import {
  applySettingsUpdate,
  clampDrawDistance,
  clampTouchSensitivity,
  clampVolume,
  DRAW_DISTANCE_MAX,
  DRAW_DISTANCE_MIN,
  formatDrawDistance,
  formatTouchSensitivity,
  formatVolumePct,
  SETTINGS_DEFAULTS,
  type SettingsValues,
  TOUCH_SENSITIVITY_MAX,
  TOUCH_SENSITIVITY_MIN,
} from "./settingsLogic";

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

const C = {
  forestGreen: "#2D5A27",
  barkBrown: "#5D4037",
  skyMist: "#E8F5E9",
  leafLight: "#81C784",
  soilDark: "#3E2723",
  trackBg: "#E0E0E0",
} as const;

// ---------------------------------------------------------------------------
// Reduced motion hook (same pattern as MainMenu.tsx)
// ---------------------------------------------------------------------------

function useReducedMotionSystem(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => sub.remove();
  }, []);
  return reduced;
}

// ---------------------------------------------------------------------------
// SettingRow -- label + value label + +/- buttons
// ---------------------------------------------------------------------------

interface StepSliderProps {
  label: string;
  valueLabel: string;
  progress: number; // 0–1 fill proportion for the visual bar
  onDecrement: () => void;
  onIncrement: () => void;
  decrementLabel?: string;
  incrementLabel?: string;
  accessibilityLabel?: string;
}

function StepSlider({
  label,
  valueLabel,
  progress,
  onDecrement,
  onIncrement,
  decrementLabel = "−",
  incrementLabel = "+",
  accessibilityLabel,
}: StepSliderProps) {
  return (
    <View style={{ gap: 6 }}>
      {/* Label row */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontSize: 13, color: C.barkBrown, fontWeight: "600" }}>{label}</Text>
        <Text
          style={{ fontSize: 13, color: C.forestGreen, fontWeight: "700", minWidth: 44, textAlign: "right" }}
        >
          {valueLabel}
        </Text>
      </View>

      {/* Controls row */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {/* Decrement */}
        <Pressable
          onPress={onDecrement}
          accessibilityLabel={`Decrease ${label}`}
          accessibilityRole="button"
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: `${C.barkBrown}40`,
            backgroundColor: pressed ? `${C.forestGreen}10` : "white",
            alignItems: "center",
            justifyContent: "center",
          })}
        >
          <Text style={{ fontSize: 20, color: C.barkBrown, lineHeight: 24 }}>{decrementLabel}</Text>
        </Pressable>

        {/* Track */}
        <View
          style={{
            flex: 1,
            height: 8,
            borderRadius: 4,
            backgroundColor: C.trackBg,
            overflow: "hidden",
          }}
          accessibilityRole="adjustable"
          accessibilityLabel={accessibilityLabel ?? label}
        >
          <View
            style={{
              height: "100%",
              width: `${Math.round(progress * 100)}%`,
              backgroundColor: C.forestGreen,
              borderRadius: 4,
            }}
          />
        </View>

        {/* Increment */}
        <Pressable
          onPress={onIncrement}
          accessibilityLabel={`Increase ${label}`}
          accessibilityRole="button"
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: `${C.barkBrown}40`,
            backgroundColor: pressed ? `${C.forestGreen}10` : "white",
            alignItems: "center",
            justifyContent: "center",
          })}
        >
          <Text style={{ fontSize: 20, color: C.forestGreen, lineHeight: 24 }}>{incrementLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// ToggleRow
// ---------------------------------------------------------------------------

function ToggleRow({
  label,
  description,
  enabled,
  onToggle,
}: {
  label: string;
  description?: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="switch"
      accessibilityState={{ checked: enabled }}
      accessibilityLabel={label}
      style={{ minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, color: C.barkBrown, fontWeight: "600" }}>{label}</Text>
        {description ? (
          <Text style={{ fontSize: 11, color: `${C.barkBrown}80`, marginTop: 2 }}>{description}</Text>
        ) : null}
      </View>
      {/* Toggle pill */}
      <View
        style={{
          width: 48,
          height: 28,
          borderRadius: 14,
          backgroundColor: enabled ? C.forestGreen : C.trackBg,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 3,
          justifyContent: enabled ? "flex-end" : "flex-start",
        }}
      >
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: "white",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.2,
            shadowRadius: 2,
            elevation: 2,
          }}
        />
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Section header
// ---------------------------------------------------------------------------

function SectionHeader({ title }: { title: string }) {
  return (
    <Text
      style={{
        fontSize: 11,
        fontWeight: "700",
        color: `${C.barkBrown}99`,
        letterSpacing: 0.8,
        marginBottom: 4,
      }}
    >
      {title.toUpperCase()}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// SettingsCard
// ---------------------------------------------------------------------------

function SettingsCard({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: "white",
        borderRadius: 12,
        padding: 16,
        gap: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 1,
      }}
    >
      {children}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface SettingsScreenProps {
  /** When true the modal is visible. Pass true always for route-based usage. */
  open: boolean;
  /** Called when user presses Close / Back. */
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SettingsScreen({ open, onClose }: SettingsScreenProps) {
  const settings = useGameStore((s) => s.settings);
  const systemReducedMotion = useReducedMotionSystem();

  // Effective settings — system pref overrides store when system says reduce motion
  const effective: SettingsValues = settings ?? SETTINGS_DEFAULTS;

  function update(partial: Partial<SettingsValues>) {
    const next = applySettingsUpdate(effective, partial);
    useGameStore.getState().updateSettings(next);
  }

  // Volume step: 0.1 (10%)
  const VOLUME_STEP = 0.1;
  // Draw distance: integer steps
  const DD_RANGE = DRAW_DISTANCE_MAX - DRAW_DISTANCE_MIN; // 4
  // Touch sensitivity step: 0.1
  const TS_STEP = 0.1;
  const TS_RANGE = TOUCH_SENSITIVITY_MAX - TOUCH_SENSITIVITY_MIN; // 1.5

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}>
        <LinearGradient
          colors={[C.skyMist, "white"]}
          locations={[0, 1]}
          style={{
            maxHeight: "90%",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            overflow: "hidden",
          }}
        >
          {/* Handle bar */}
          <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 4 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: `${C.barkBrown}30` }} />
          </View>

          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: `${C.barkBrown}20`,
            }}
          >
            <Text
              style={{ fontSize: 20, fontWeight: "700", color: C.soilDark }}
            >
              Settings
            </Text>
            <Pressable
              onPress={onClose}
              accessibilityLabel="Close settings"
              accessibilityRole="button"
              style={({ pressed }) => ({
                minWidth: 44,
                minHeight: 44,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text style={{ fontSize: 16, color: C.forestGreen, fontWeight: "600" }}>Done</Text>
            </Pressable>
          </View>

          {/* Scrollable content */}
          <ScrollView
            contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            {/* ── Audio ── */}
            <View style={{ gap: 8 }}>
              <SectionHeader title="Audio" />
              <SettingsCard>
                <StepSlider
                  label="Master Volume"
                  valueLabel={formatVolumePct(effective.masterVolume)}
                  progress={effective.masterVolume}
                  onDecrement={() => update({ masterVolume: clampVolume(effective.masterVolume - VOLUME_STEP) })}
                  onIncrement={() => update({ masterVolume: clampVolume(effective.masterVolume + VOLUME_STEP) })}
                  accessibilityLabel={`Master volume, currently ${formatVolumePct(effective.masterVolume)}`}
                />
                <View style={{ height: 1, backgroundColor: `${C.barkBrown}12` }} />
                <StepSlider
                  label="Sound Effects"
                  valueLabel={formatVolumePct(effective.sfxVolume)}
                  progress={effective.sfxVolume}
                  onDecrement={() => update({ sfxVolume: clampVolume(effective.sfxVolume - VOLUME_STEP) })}
                  onIncrement={() => update({ sfxVolume: clampVolume(effective.sfxVolume + VOLUME_STEP) })}
                  accessibilityLabel={`SFX volume, currently ${formatVolumePct(effective.sfxVolume)}`}
                />
                <View style={{ height: 1, backgroundColor: `${C.barkBrown}12` }} />
                <StepSlider
                  label="Ambient & Music"
                  valueLabel={formatVolumePct(effective.ambientVolume)}
                  progress={effective.ambientVolume}
                  onDecrement={() =>
                    update({ ambientVolume: clampVolume(effective.ambientVolume - VOLUME_STEP) })
                  }
                  onIncrement={() =>
                    update({ ambientVolume: clampVolume(effective.ambientVolume + VOLUME_STEP) })
                  }
                  accessibilityLabel={`Ambient volume, currently ${formatVolumePct(effective.ambientVolume)}`}
                />
              </SettingsCard>
            </View>

            {/* ── Graphics ── */}
            <View style={{ gap: 8 }}>
              <SectionHeader title="Graphics" />
              <SettingsCard>
                <ToggleRow
                  label="PSX Pixel Ratio"
                  description="Forces pixel ratio 1 for PSX-style pixelated look"
                  enabled={effective.psxPixelRatio}
                  onToggle={() => update({ psxPixelRatio: !effective.psxPixelRatio })}
                />
                <View style={{ height: 1, backgroundColor: `${C.barkBrown}12` }} />
                <StepSlider
                  label="Draw Distance"
                  valueLabel={formatDrawDistance(effective.drawDistance)}
                  progress={(effective.drawDistance - DRAW_DISTANCE_MIN) / DD_RANGE}
                  onDecrement={() =>
                    update({ drawDistance: clampDrawDistance(effective.drawDistance - 1) })
                  }
                  onIncrement={() =>
                    update({ drawDistance: clampDrawDistance(effective.drawDistance + 1) })
                  }
                  accessibilityLabel={`Draw distance, currently ${formatDrawDistance(effective.drawDistance)}`}
                />
              </SettingsCard>
            </View>

            {/* ── Controls ── */}
            <View style={{ gap: 8 }}>
              <SectionHeader title="Controls" />
              <SettingsCard>
                <StepSlider
                  label="Touch Look Sensitivity"
                  valueLabel={formatTouchSensitivity(effective.touchSensitivity)}
                  progress={(effective.touchSensitivity - TOUCH_SENSITIVITY_MIN) / TS_RANGE}
                  onDecrement={() =>
                    update({
                      touchSensitivity: clampTouchSensitivity(effective.touchSensitivity - TS_STEP),
                    })
                  }
                  onIncrement={() =>
                    update({
                      touchSensitivity: clampTouchSensitivity(effective.touchSensitivity + TS_STEP),
                    })
                  }
                  accessibilityLabel={`Touch sensitivity, currently ${formatTouchSensitivity(effective.touchSensitivity)}`}
                />
              </SettingsCard>
            </View>

            {/* ── Accessibility ── */}
            <View style={{ gap: 8 }}>
              <SectionHeader title="Accessibility" />
              <SettingsCard>
                <ToggleRow
                  label="Reduced Motion"
                  description={
                    systemReducedMotion
                      ? "System reduced motion is on — animations are suppressed"
                      : "Disable particle effects and UI animations"
                  }
                  enabled={effective.reducedMotion || systemReducedMotion}
                  onToggle={() => {
                    // If system pref is forcing reduced motion, ignore the toggle
                    if (!systemReducedMotion) {
                      update({ reducedMotion: !effective.reducedMotion });
                    }
                  }}
                />
              </SettingsCard>
            </View>
          </ScrollView>
        </LinearGradient>
      </View>
    </Modal>
  );
}
