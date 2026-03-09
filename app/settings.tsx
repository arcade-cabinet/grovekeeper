import { Stack, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { SettingsScreen } from "@/components/game/SettingsScreen";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { ACCENT, FONTS, LIGHT } from "@/components/ui/tokens";
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
      <View style={{ flex: 1, backgroundColor: "rgba(232,245,233,0.85)" }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 56 }}>
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 32 }}>
            <Button
              variant="ghost"
              onPress={handleBack}
              style={{ marginRight: 12 }}
              testID="btn-settings-back"
            >
              <Text style={{ color: ACCENT.sap, fontSize: 16, fontWeight: "600" }}>
                {"\u2190"} Back
              </Text>
            </Button>
            <Text
              style={{
                fontSize: 24,
                fontWeight: "700",
                color: LIGHT.textPrimary,
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
              color: LIGHT.textMuted,
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
              borderColor: LIGHT.borderBranch,
              backgroundColor: "rgba(255,255,255,0.7)",
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              minHeight: 56,
              marginBottom: 24,
            }}
            accessibilityRole="button"
            accessibilityLabel="Open audio, graphics and controls settings"
          >
            <Text style={{ fontSize: 15, fontWeight: "700", color: LIGHT.textPrimary, flex: 1 }}>
              Audio, Graphics & Controls
            </Text>
            <Text style={{ fontSize: 18, color: LIGHT.textSecondary }}>{"\u203A"}</Text>
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
                    borderColor: selected ? d.color : LIGHT.borderBranch,
                    backgroundColor: selected ? `${d.color}20` : "rgba(255,255,255,0.6)",
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
                      backgroundColor: selected ? d.color : LIGHT.textMuted,
                      marginRight: 14,
                    }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "700",
                        color: selected ? d.color : LIGHT.textPrimary,
                      }}
                    >
                      {d.name}
                    </Text>
                    <Text style={{ fontSize: 12, color: LIGHT.textSecondary, marginTop: 2 }}>
                      {d.tagline}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Audio / Graphics / Controls modal */}
      <SettingsScreen open={audioGraphicsOpen} onClose={() => setAudioGraphicsOpen(false)} />
    </>
  );
}
