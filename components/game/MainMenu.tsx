/**
 * MainMenu -- entry screen for Grovekeeper.
 * Spec S26. Wind Waker bright aesthetic. Mobile-first, portrait-primary.
 *
 * Renders as a semi-transparent overlay on the 3D world (S0.2 Zelda-style immersion).
 * Brand: docs/plans/2026-03-07-ux-brand-design.md S8
 * Tokens: components/ui/tokens.ts
 */
import { useEffect, useMemo, useRef } from "react";
import { Animated as RNAnimated, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { ACCENT, FONTS, LIGHT, TYPE } from "@/components/ui/tokens";
import {
  animateButtonPressIn,
  animateButtonPressOut,
  createButtonScale,
  createGlowPulse,
  generateVariedLeaves,
  interpolateGlowOpacity,
  interpolateGlowRadius,
} from "./mainMenuAnimations.ts";
import { useReducedMotion, VariedFloatingLeaf } from "./mainMenuBackground.tsx";
import { hasSave, primaryButtonLabel, treeSummaryText } from "./mainMenuLogic.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MainMenuProps {
  treesPlanted: number;
  onContinue: () => void;
  onNewGrove: () => void;
  onSettings: () => void;
}

// ---------------------------------------------------------------------------
// Animated button wrapper — scale spring on press
// ---------------------------------------------------------------------------

function AnimatedButton({
  onPress,
  testID,
  style,
  children,
}: {
  onPress: () => void;
  testID: string;
  style: Record<string, unknown>;
  children: React.ReactNode;
}) {
  const { scale } = useMemo(() => createButtonScale(), []);

  return (
    <RNAnimated.View style={{ transform: [{ scale }] }}>
      <Button
        className="min-h-[48px] w-full overflow-hidden rounded-xl"
        onPress={onPress}
        onPressIn={() => animateButtonPressIn(scale)}
        onPressOut={() => animateButtonPressOut(scale)}
        testID={testID}
        style={style}
      >
        {children}
      </Button>
    </RNAnimated.View>
  );
}

// ---------------------------------------------------------------------------
// Main menu component -- Wind Waker bright overlay
// ---------------------------------------------------------------------------

export function MainMenu({ treesPlanted, onContinue, onNewGrove, onSettings }: MainMenuProps) {
  const saveExists = hasSave(treesPlanted);
  const reduceMotion = useReducedMotion();
  const leaves = useMemo(() => generateVariedLeaves(8), []);

  // Logo glow pulse
  const glowRefs = useMemo(() => createGlowPulse(reduceMotion), [reduceMotion]);
  useEffect(() => {
    if (reduceMotion) return;
    glowRefs.loop.start();
    return () => glowRefs.loop.stop();
  }, [glowRefs, reduceMotion]);

  const glowRadius = interpolateGlowRadius(glowRefs.anim);
  const glowOpacity = interpolateGlowOpacity(glowRefs.anim);

  return (
    <View
      className="flex-1 items-center justify-center px-4 py-6"
      style={{ backgroundColor: "rgba(232,245,233,0.75)" }}
    >
      {/* Background: varied floating leaf particles */}
      <View className="absolute inset-0 overflow-hidden" pointerEvents="none">
        {!reduceMotion &&
          leaves.map((leaf, i) => <VariedFloatingLeaf key={`leaf-${i}`} config={leaf} />)}
      </View>

      {/* Logo: GROVEKEEPER wordmark with animated golden glow */}
      <View className="z-10 mb-2 items-center">
        <RNAnimated.Text
          style={{
            ...TYPE.hero,
            fontFamily: FONTS.display,
            color: LIGHT.textPrimary,
            letterSpacing: 4,
            textShadowColor: ACCENT.gold,
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: glowRadius,
            opacity: glowOpacity,
          }}
        >
          GROVEKEEPER
        </RNAnimated.Text>
        <Text
          style={{
            ...TYPE.body,
            fontFamily: FONTS.body,
            color: LIGHT.textSecondary,
            fontStyle: "italic",
            marginTop: 4,
          }}
        >
          Every forest begins with a single seed.
        </Text>
      </View>

      {/* Save preview card */}
      {saveExists && (
        <View
          className="z-10 mb-4 w-full"
          style={{
            maxWidth: 340,
            padding: 12,
            backgroundColor: "rgba(255,255,255,0.7)",
            borderWidth: 1,
            borderColor: LIGHT.borderBranch,
            borderRadius: 8,
          }}
        >
          <View className="flex-row items-center gap-2">
            <Text style={{ fontSize: 18 }}>{"\u{1F333}"}</Text>
            <Text style={{ ...TYPE.label, color: LIGHT.textMuted }}>SAVED GROVE</Text>
          </View>
          <Text style={{ ...TYPE.body, color: LIGHT.textPrimary, marginTop: 4, fontWeight: "600" }}>
            {treeSummaryText(treesPlanted)}
          </Text>
        </View>
      )}

      {/* Buttons */}
      <View className="z-10 w-full gap-3" style={{ maxWidth: 340 }}>
        {/* Continue -- primary green with press animation */}
        {saveExists && (
          <AnimatedButton
            onPress={onContinue}
            testID="btn-continue-grove"
            style={{
              backgroundColor: ACCENT.sap,
              shadowColor: ACCENT.sap,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.35,
              shadowRadius: 12,
              elevation: 4,
            }}
          >
            <Text style={{ ...TYPE.heading, color: "#FAFAFA" }}>Continue Grove</Text>
          </AnimatedButton>
        )}

        {/* New Grove */}
        <AnimatedButton
          onPress={onNewGrove}
          testID="btn-new-grove"
          style={
            saveExists
              ? {
                  borderColor: LIGHT.borderBranch,
                  borderWidth: 2,
                  backgroundColor: "rgba(255,255,255,0.5)",
                }
              : {
                  backgroundColor: ACCENT.sap,
                  shadowColor: ACCENT.sap,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.35,
                  shadowRadius: 12,
                  elevation: 4,
                }
          }
        >
          <Text
            style={{
              ...TYPE.heading,
              color: saveExists ? LIGHT.textPrimary : "#FAFAFA",
            }}
          >
            {saveExists ? "New Grove" : primaryButtonLabel(treesPlanted)}
          </Text>
        </AnimatedButton>

        {/* Settings -- ghost button */}
        <Button
          className="min-h-[44px] w-full rounded-xl"
          variant="ghost"
          onPress={onSettings}
          testID="btn-settings"
        >
          <Text style={{ ...TYPE.body, color: LIGHT.textMuted }}>Settings</Text>
        </Button>
      </View>

      {/* Version */}
      <Text className="mt-6" style={{ ...TYPE.caption, color: LIGHT.textMuted }}>
        Grovekeeper v0.1.0
      </Text>
    </View>
  );
}
