/**
 * MainMenu -- entry screen for Grovekeeper.
 * Spec §26. Mobile-first, portrait-primary, brand-aligned vertical gradient.
 */
import { LinearGradient } from "expo-linear-gradient";
import { useMemo } from "react";
import { View } from "react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { FarmerMascot } from "./FarmerMascot.tsx";
import { Logo } from "./Logo.tsx";
import {
  LEAF_CONFIGS,
  FloatingLeaf,
  LeftTreeSilhouette,
  RightTreeSilhouette,
  useReducedMotion,
} from "./mainMenuBackground.tsx";
import { hasSave, primaryButtonLabel, treeSummaryText } from "./mainMenuLogic.ts";

// ---------------------------------------------------------------------------
// Colors (match theme.json)
// ---------------------------------------------------------------------------

const C = {
  forestGreen: "#2D5A27",
  barkBrown: "#5D4037",
  soilDark: "#3E2723",
  leafLight: "#81C784",
  skyMist: "#E8F5E9",
} as const;

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
// Main menu component
// ---------------------------------------------------------------------------

export function MainMenu({ treesPlanted, onContinue, onNewGrove, onSettings }: MainMenuProps) {
  const saveExists = hasSave(treesPlanted);
  const reduceMotion = useReducedMotion();
  const leaves = useMemo(() => LEAF_CONFIGS, []);

  return (
    <LinearGradient
      colors={[C.skyMist, `${C.leafLight}40`, `${C.forestGreen}30`]}
      locations={[0, 0.5, 1]}
      className="flex-1 items-center justify-center px-4 py-6"
    >
      {/* Background: silhouettes + floating leaves */}
      <View className="absolute inset-0 overflow-hidden" pointerEvents="none">
        <LeftTreeSilhouette />
        <RightTreeSilhouette />
        {!reduceMotion && leaves.map((leaf, i) => <FloatingLeaf key={`leaf-${i}`} config={leaf} />)}
      </View>

      {/* Card */}
      <View
        className="relative w-full items-center gap-4 rounded-2xl p-4"
        style={{
          maxWidth: 340,
          backgroundColor: "white",
          borderWidth: 3,
          borderColor: `${C.forestGreen}40`,
          shadowColor: C.forestGreen,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.19,
          shadowRadius: 16,
          elevation: 8,
        }}
      >
        {/* Subtle gradient overlay on card */}
        <LinearGradient
          colors={["white", C.skyMist]}
          locations={[0, 1]}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 14 }}
        />

        {/* Logo */}
        <View className="z-10">
          <Logo size={160} />
        </View>

        {/* Mascot */}
        <View className="z-10 items-center">
          <FarmerMascot size={80} animate={!reduceMotion} />
          <View
            className="rounded-full"
            style={{ width: 48, height: 8, marginTop: -4, backgroundColor: `${C.soilDark}30` }}
          />
        </View>

        {/* Tagline */}
        <Text className="z-10 text-center text-sm italic" style={{ color: C.barkBrown }}>
          "Every forest begins with a single seed."
        </Text>

        {/* Buttons */}
        <View className="z-10 w-full gap-2">
          {/* Continue — only when save exists */}
          {saveExists && (
            <Button
              className="min-h-[48px] w-full rounded-xl"
              style={{
                backgroundColor: C.forestGreen,
                shadowColor: C.forestGreen,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 12,
                elevation: 4,
              }}
              onPress={onContinue}
            >
              <Text className="text-base font-bold text-white">Continue Grove</Text>
            </Button>
          )}

          {/* New Grove / Start Growing */}
          <Button
            className={`min-h-[48px] w-full rounded-xl ${saveExists ? "bg-white" : ""}`}
            variant={saveExists ? "outline" : "default"}
            style={
              saveExists
                ? { borderColor: C.forestGreen, borderWidth: 2, backgroundColor: "white" }
                : {
                    backgroundColor: C.forestGreen,
                    shadowColor: C.forestGreen,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 12,
                    elevation: 4,
                  }
            }
            onPress={onNewGrove}
          >
            <Text
              className={`text-base font-bold ${saveExists ? "" : "text-white"}`}
              style={saveExists ? { color: C.forestGreen } : undefined}
            >
              {saveExists ? "New Grove" : primaryButtonLabel(treesPlanted)}
            </Text>
          </Button>

          {/* Settings — always visible */}
          <Button className="min-h-[44px] w-full rounded-xl" variant="ghost" onPress={onSettings}>
            <Text className="text-sm font-medium" style={{ color: C.barkBrown }}>
              Settings
            </Text>
          </Button>
        </View>

        {/* Stats */}
        {saveExists && (
          <View className="z-10 flex-row items-center gap-2">
            <Text className="text-xs" style={{ color: C.barkBrown }}>
              {treeSummaryText(treesPlanted)}
            </Text>
          </View>
        )}
      </View>

      {/* Version */}
      <Text className="mt-4 text-xs" style={{ color: `${C.forestGreen}80` }}>
        Grovekeeper v0.1.0
      </Text>
    </LinearGradient>
  );
}
