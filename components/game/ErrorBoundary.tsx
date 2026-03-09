/**
 * GameErrorBoundary -- React error boundary for the game.
 *
 * Catches render errors and displays a recovery UI with options to
 * reload the app or return to the main menu.
 */
import { Component, type ErrorInfo, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GameErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[Grovekeeper] Game error:", error, errorInfo.componentStack);
    // No explicit save here; rely on existing autosave to avoid cascading errors
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  handleReload = () => {
    // In React Native / Expo, we trigger a reload via Updates or just reset state.
    // expo-updates reload is preferred if available; fallback to reset.
    try {
      // Attempt Expo Updates reload if available
      // biome-ignore lint/correctness/noUndeclaredDependencies: expo-updates is an optional peer dep (may not be installed in all envs)
      const Updates = require("expo-updates");
      if (Updates?.reloadAsync) {
        Updates.reloadAsync();
        return;
      }
    } catch {
      // expo-updates not available (e.g. dev client), fall through to reset
    }
    // Fallback: reset error state and call onReset
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      const msg = this.state.error?.message ?? "Unknown error";
      const isChunkError =
        msg.includes("Failed to fetch") ||
        msg.includes("Loading chunk") ||
        msg.includes("dynamically imported module");

      return (
        <View className="flex-1 items-center justify-center bg-[#1a0e0a] px-8">
          <Text className="mb-4 text-center text-2xl font-bold text-white">
            Something went wrong
          </Text>
          <Text className="mb-6 max-w-md text-center text-gray-400">
            {isChunkError
              ? "A new version is available. Please reload to update."
              : "The game encountered an error. Your latest progress may not be saved."}
          </Text>
          <View className="flex-row gap-3">
            <Pressable
              className="min-h-[48px] items-center justify-center rounded-lg bg-forest-green px-6 py-3"
              onPress={this.handleReload}
              accessibilityRole="button"
              accessibilityLabel="Reload Game"
            >
              <Text className="font-semibold text-white">Reload Game</Text>
            </Pressable>
            <Pressable
              className="min-h-[48px] items-center justify-center rounded-lg bg-[#2D5A27] px-6 py-3"
              onPress={this.handleReset}
              accessibilityRole="button"
              accessibilityLabel="Return to Menu"
            >
              <Text className="font-semibold text-white">Return to Menu</Text>
            </Pressable>
          </View>
          <Text className="mt-4 max-w-md text-center text-xs text-gray-600">{msg}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}
