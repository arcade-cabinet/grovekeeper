import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { SettingsScreen } from "@/components/game/SettingsScreen";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { ACCENT, DARK, FONTS } from "@/components/ui/tokens";
import difficultyConfig from "@/config/game/difficulty.json" with { type: "json" };
import { useGameStore } from "@/game/stores";

const SCREEN_OPTIONS = { headerShown: false };

type DifficultyEntry = {
  id: string;
  name: string;
  tagline: string;
  color: string;
};

const DIFFICULTIES: DifficultyEntry[] = (difficultyConfig as DifficultyEntry[]).map((d) => ({
  id: d.id,
  name: d.name,
  tagline: d.tagline,
  color: d.color,
}));

export default function SettingsRoute() {
  const router = useRouter();
  const difficulty = useGameStore((s) => s.difficulty);
  const [audioGraphicsOpen, setAudioGraphicsOpen] = useState(false);

  const handleSelectDifficulty = useCallback((id: string) => {
    useGameStore.getState().setDifficulty(id);
  }, []);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <>
      <Stack.Screen options={SCREEN_OPTIONS} />
      <LinearGradient
        colors={[DARK.bgDeep, DARK.bgCanopy, DARK.bgDeep]}
        locations={[0, 0.5, 1]}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 56 }}>
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 32 }}>
            <Button
              variant="ghost"
              onPress={handleBack}
              style={{ marginRight: 12 }}
              testID="btn-settings-back"
            >
              <Text style={{ color: ACCENT.sap, fontSize: 16, fontWeight: "600" }}>← Back</Text>
            </Button>
            <Text
              style={{
                fontSize: 24,
                fontWeight: "700",
                color: DARK.textPrimary,
                fontFamily: FONTS.heading,
              }}
            >
              Settings
            </Text>
          </View>

          {/* Difficulty section */}
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: DARK.textSecondary,
              marginBottom: 12,
              letterSpacing: 0.5,
            }}
          >
            DIFFICULTY
          </Text>

          {/* Audio, Graphics, Controls, Accessibility */}
          <TouchableOpacity
            onPress={() => setAudioGraphicsOpen(true)}
            style={{
              borderRadius: 12,
              borderWidth: 1,
              borderColor: DARK.borderBranch,
              backgroundColor: DARK.surfaceMoss,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              minHeight: 56,
              marginBottom: 24,
            }}
            accessibilityRole="button"
            accessibilityLabel="Open audio, graphics and controls settings"
          >
            <Text style={{ fontSize: 15, fontWeight: "700", color: DARK.textPrimary, flex: 1 }}>
              Audio, Graphics & Controls
            </Text>
            <Text style={{ fontSize: 18, color: DARK.textSecondary }}>›</Text>
          </TouchableOpacity>

          <View style={{ gap: 10 }}>
            {DIFFICULTIES.map((d) => {
              const selected = difficulty === d.id;
              return (
                <TouchableOpacity
                  key={d.id}
                  onPress={() => handleSelectDifficulty(d.id)}
                  style={{
                    borderRadius: 12,
                    borderWidth: selected ? 2 : 1,
                    borderColor: selected ? d.color : DARK.borderBranch,
                    backgroundColor: selected ? `${d.color}15` : DARK.bgCanopy,
                    padding: 16,
                    flexDirection: "row",
                    alignItems: "center",
                    minHeight: 64,
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                >
                  <View
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: selected ? d.color : DARK.textMuted,
                      marginRight: 14,
                    }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "700",
                        color: selected ? d.color : DARK.textPrimary,
                      }}
                    >
                      {d.name}
                    </Text>
                    <Text style={{ fontSize: 12, color: DARK.textSecondary, marginTop: 2 }}>
                      {d.tagline}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </LinearGradient>

      {/* Audio / Graphics / Controls modal */}
      <SettingsScreen open={audioGraphicsOpen} onClose={() => setAudioGraphicsOpen(false)} />
    </>
  );
}
