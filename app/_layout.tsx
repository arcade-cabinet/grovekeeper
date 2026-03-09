import "@/global.css";

import {
  Cabin_400Regular,
  Cabin_500Medium,
  Cabin_600SemiBold,
  Cabin_700Bold,
} from "@expo-google-fonts/cabin";
import { Cinzel_400Regular, Cinzel_600SemiBold, Cinzel_700Bold } from "@expo-google-fonts/cinzel";
import {
  CinzelDecorative_400Regular,
  CinzelDecorative_700Bold,
  CinzelDecorative_900Black,
} from "@expo-google-fonts/cinzel-decorative";
import { JetBrainsMono_400Regular, JetBrainsMono_700Bold } from "@expo-google-fonts/jetbrains-mono";
import { Orbitron_400Regular, Orbitron_700Bold } from "@expo-google-fonts/orbitron";
import { ThemeProvider } from "@react-navigation/native";
import { PortalHost } from "@rn-primitives/portal";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";
import { useCallback } from "react";
import { ActivityIndicator, View } from "react-native";
import { getSpeciesById } from "@/game/config/species";
import { useAutoSave } from "@/game/hooks/useAutoSave";
import { usePersistence } from "@/game/hooks/usePersistence";
import { initPersistence } from "@/game/stores";
import type { OfflineSpeciesData } from "@/game/systems/offlineGrowth";
import { NAV_THEME } from "@/lib/theme";

// Initialize Legend State → expo-sqlite/kv-store persistence
initPersistence();

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

export default function RootLayout() {
  const { colorScheme } = useColorScheme();

  const [fontsLoaded] = useFonts({
    CinzelDecorative: CinzelDecorative_400Regular,
    CinzelDecorative_700Bold,
    CinzelDecorative_900Black,
    Cinzel: Cinzel_400Regular,
    Cinzel_600SemiBold,
    Cinzel_700Bold,
    Cabin: Cabin_400Regular,
    Cabin_500Medium,
    Cabin_600SemiBold,
    Cabin_700Bold,
    JetBrainsMono: JetBrainsMono_400Regular,
    JetBrainsMono_700Bold,
    Orbitron: Orbitron_400Regular,
    Orbitron_700Bold,
  });

  const speciesLookup = useCallback((id: string): OfflineSpeciesData | undefined => {
    const sp = getSpeciesById(id);
    if (!sp) return undefined;
    return {
      difficulty: sp.difficulty,
      baseGrowthTimes: sp.baseGrowthTimes,
      evergreen: sp.evergreen,
    };
  }, []);

  const { ready } = usePersistence(speciesLookup);

  // Start auto-save subscription (no-op until store is hydrated)
  useAutoSave();

  if (!ready || !fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ThemeProvider value={NAV_THEME[colorScheme ?? "light"]}>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <Stack />
      <PortalHost />
    </ThemeProvider>
  );
}
