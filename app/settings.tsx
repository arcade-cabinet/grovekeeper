import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import { useCallback } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import difficultyConfig from "@/config/game/difficulty.json" with { type: "json" };
import { useGameStore } from "@/game/stores/gameStore";

const SCREEN_OPTIONS = { headerShown: false };

const C = {
  forestGreen: "#2D5A27",
  barkBrown: "#5D4037",
  skyMist: "#E8F5E9",
  leafLight: "#81C784",
} as const;

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

export default function SettingsScreen() {
  const router = useRouter();
  const difficulty = useGameStore((s) => s.difficulty);

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
        colors={[C.skyMist, `${C.leafLight}40`, `${C.forestGreen}30`]}
        locations={[0, 0.5, 1]}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 56 }}>
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 32 }}>
            <Button variant="ghost" onPress={handleBack} style={{ marginRight: 12 }}>
              <Text style={{ color: C.forestGreen, fontSize: 16, fontWeight: "600" }}>← Back</Text>
            </Button>
            <Text
              style={{
                fontSize: 24,
                fontWeight: "700",
                color: C.forestGreen,
                fontFamily: "Fredoka",
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
              color: C.barkBrown,
              marginBottom: 12,
              letterSpacing: 0.5,
            }}
          >
            DIFFICULTY
          </Text>

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
                    borderColor: selected ? d.color : `${C.barkBrown}30`,
                    backgroundColor: selected ? `${d.color}15` : "white",
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
                      backgroundColor: selected ? d.color : `${C.barkBrown}40`,
                      marginRight: 14,
                    }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "700",
                        color: selected ? d.color : C.barkBrown,
                      }}
                    >
                      {d.name}
                    </Text>
                    <Text style={{ fontSize: 12, color: `${C.barkBrown}99`, marginTop: 2 }}>
                      {d.tagline}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </LinearGradient>
    </>
  );
}
