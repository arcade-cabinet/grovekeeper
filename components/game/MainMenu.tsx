/**
 * MainMenu -- entry screen for Grovekeeper.
 * Spec §26. Wind Waker bright aesthetic. Mobile-first, portrait-primary.
 *
 * Renders as a semi-transparent overlay on the 3D world (§0.2 Zelda-style immersion).
 * Brand: docs/plans/2026-03-07-ux-brand-design.md §8
 * Tokens: components/ui/tokens.ts
 */
import { useMemo } from "react";
import { View } from "react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { ACCENT, FONTS, LIGHT, TYPE } from "@/components/ui/tokens";
import { FloatingLeaf, LEAF_CONFIGS, useReducedMotion } from "./mainMenuBackground.tsx";
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
// Main menu component — Wind Waker bright overlay
// ---------------------------------------------------------------------------

export function MainMenu({ treesPlanted, onContinue, onNewGrove, onSettings }: MainMenuProps) {
  const saveExists = hasSave(treesPlanted);
  const reduceMotion = useReducedMotion();
  const leaves = useMemo(() => LEAF_CONFIGS, []);

  return (
    <View
      className="flex-1 items-center justify-center px-4 py-6"
      style={{ backgroundColor: "rgba(232,245,233,0.75)" }}
    >
      {/* Background: floating leaf particles */}
      <View className="absolute inset-0 overflow-hidden" pointerEvents="none">
        {!reduceMotion && leaves.map((leaf, i) => <FloatingLeaf key={`leaf-${i}`} config={leaf} />)}
      </View>

      {/* Logo: GROVEKEEPER wordmark */}
      <View className="z-10 mb-2 items-center">
        <Text
          style={{
            ...TYPE.hero,
            fontFamily: FONTS.display,
            color: LIGHT.textPrimary,
            letterSpacing: 4,
            textShadowColor: ACCENT.gold,
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 12,
          }}
        >
          GROVEKEEPER
        </Text>
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

      {/* Save preview card (if save exists) */}
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
          <Text style={{ ...TYPE.label, color: LIGHT.textMuted, marginBottom: 4 }}>
            SAVED GROVE
          </Text>
          <Text style={{ ...TYPE.body, color: LIGHT.textPrimary }}>
            {treeSummaryText(treesPlanted)}
          </Text>
        </View>
      )}

      {/* Buttons */}
      <View className="z-10 w-full gap-3" style={{ maxWidth: 340 }}>
        {/* Continue — primary green */}
        {saveExists && (
          <Button
            className="min-h-[48px] w-full overflow-hidden rounded-xl"
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
          </Button>
        )}

        {/* New Grove */}
        <Button
          className="min-h-[48px] w-full rounded-xl"
          variant={saveExists ? "outline" : "default"}
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
          onPress={onNewGrove}
          testID="btn-new-grove"
        >
          <Text
            style={{
              ...TYPE.heading,
              color: saveExists ? LIGHT.textPrimary : "#FAFAFA",
            }}
          >
            {saveExists ? "New Grove" : primaryButtonLabel(treesPlanted)}
          </Text>
        </Button>

        {/* Settings — ghost button */}
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
