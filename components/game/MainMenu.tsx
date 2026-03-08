/**
 * MainMenu -- entry screen for Grovekeeper.
 * Spec §26. Dark forest RPG aesthetic. Mobile-first, portrait-primary.
 *
 * Brand: docs/plans/2026-03-07-ux-brand-design.md §8
 * Tokens: components/ui/tokens.ts
 */
import { LinearGradient } from "expo-linear-gradient";
import { useMemo } from "react";
import { View } from "react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { ACCENT, DARK, FONTS, HUD_PANEL, TYPE } from "@/components/ui/tokens";
import {
  FloatingLeaf,
  LEAF_CONFIGS,
  LeftTreeSilhouette,
  RightTreeSilhouette,
  useReducedMotion,
} from "./mainMenuBackground.tsx";
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
// Main menu component — Dark Forest RPG
// ---------------------------------------------------------------------------

export function MainMenu({ treesPlanted, onContinue, onNewGrove, onSettings }: MainMenuProps) {
  const saveExists = hasSave(treesPlanted);
  const reduceMotion = useReducedMotion();
  const leaves = useMemo(() => LEAF_CONFIGS, []);

  return (
    <LinearGradient
      colors={[DARK.bgDeep, DARK.bgCanopy, DARK.bgBark]}
      locations={[0, 0.6, 1]}
      className="flex-1 items-center justify-center px-4 py-6"
    >
      {/* Background: dark silhouettes + bioluminescent particles */}
      <View className="absolute inset-0 overflow-hidden" pointerEvents="none">
        <LeftTreeSilhouette />
        <RightTreeSilhouette />
        {!reduceMotion && leaves.map((leaf, i) => <FloatingLeaf key={`leaf-${i}`} config={leaf} />)}
      </View>

      {/* Logo: GROVEKEEPER wordmark */}
      <View className="z-10 mb-2 items-center">
        <Text
          style={{
            ...TYPE.hero,
            fontFamily: FONTS.display,
            color: DARK.textPrimary,
            letterSpacing: 4,
            textShadowColor: ACCENT.sap,
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
            color: DARK.textSecondary,
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
            ...HUD_PANEL,
            maxWidth: 340,
            padding: 12,
          }}
        >
          <Text style={{ ...TYPE.label, color: DARK.textMuted, marginBottom: 4 }}>SAVED GROVE</Text>
          <Text style={{ ...TYPE.body, color: DARK.textPrimary }}>
            {treeSummaryText(treesPlanted)}
          </Text>
        </View>
      )}

      {/* Buttons */}
      <View className="z-10 w-full gap-3" style={{ maxWidth: 340 }}>
        {/* Continue — primary sap gradient */}
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
            <Text style={{ ...TYPE.heading, color: DARK.bgDeep }}>Continue Grove</Text>
          </Button>
        )}

        {/* New Grove */}
        <Button
          className="min-h-[48px] w-full rounded-xl"
          variant={saveExists ? "outline" : "default"}
          style={
            saveExists
              ? { borderColor: DARK.borderBranch, borderWidth: 2, backgroundColor: "transparent" }
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
              color: saveExists ? DARK.textPrimary : DARK.bgDeep,
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
          <Text style={{ ...TYPE.body, color: DARK.textMuted }}>Settings</Text>
        </Button>
      </View>

      {/* Version */}
      <Text className="mt-6" style={{ ...TYPE.caption, color: DARK.textMuted }}>
        Grovekeeper v0.1.0
      </Text>
    </LinearGradient>
  );
}
