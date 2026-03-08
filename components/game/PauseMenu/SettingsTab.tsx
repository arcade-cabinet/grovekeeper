import { BookOpenIcon, DownloadIcon, SettingsIcon, UploadIcon } from "lucide-react-native";
import { Alert, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { ToggleSwitch } from "./ToggleSwitch";

interface SettingsTabProps {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  onSettings?: () => void;
  onOpenSettingsScreen: () => void;
  onToggleSound: () => void;
  onToggleHaptics: () => void;
  onExportSave?: () => void;
  onImportSave?: () => void;
  onHowToPlay?: () => void;
  onResetGame: () => void;
}

export function SettingsTab({
  soundEnabled,
  hapticsEnabled,
  onSettings,
  onOpenSettingsScreen,
  onToggleSound,
  onToggleHaptics,
  onExportSave,
  onImportSave,
  onHowToPlay,
  onResetGame,
}: SettingsTabProps) {
  return (
    <View className="gap-3">
      {/* Audio / Graphics / Controls */}
      <Button
        className="min-h-[48px] w-full rounded-xl bg-forest-green"
        onPress={() => {
          if (onSettings) {
            onSettings();
          } else {
            onOpenSettingsScreen();
          }
        }}
      >
        <Icon as={SettingsIcon} size={16} className="text-white" />
        <Text className="ml-1 font-bold text-white">Audio, Graphics & Controls</Text>
      </Button>

      {/* Sound toggle */}
      <View className="rounded-xl bg-white p-3">
        <ToggleSwitch
          enabled={soundEnabled}
          onToggle={onToggleSound}
          label="Sound Effects"
        />
      </View>

      {/* Haptics toggle */}
      <View className="rounded-xl bg-white p-3">
        <ToggleSwitch
          enabled={hapticsEnabled}
          onToggle={onToggleHaptics}
          label="Haptic Feedback"
        />
      </View>

      {/* Save management */}
      {(onExportSave || onImportSave) && (
        <View className="rounded-xl bg-white p-3">
          <Text className="mb-2 text-sm font-bold text-soil-dark">Save Management</Text>
          <View className="flex-row gap-2">
            {onExportSave && (
              <Button
                className="min-h-[44px] flex-1 rounded-xl border-2 border-bark-brown bg-transparent"
                variant="outline"
                onPress={onExportSave}
              >
                <Icon as={DownloadIcon} size={14} className="text-soil-dark" />
                <Text className="ml-1 text-xs font-bold text-soil-dark">Export</Text>
              </Button>
            )}
            {onImportSave && (
              <Button
                className="min-h-[44px] flex-1 rounded-xl border-2 border-bark-brown bg-transparent"
                variant="outline"
                onPress={onImportSave}
              >
                <Icon as={UploadIcon} size={14} className="text-soil-dark" />
                <Text className="ml-1 text-xs font-bold text-soil-dark">Import</Text>
              </Button>
            )}
          </View>
        </View>
      )}

      {/* How to Play */}
      {onHowToPlay && (
        <Button
          className="min-h-[44px] w-full rounded-xl border-2 border-forest-green bg-transparent"
          variant="outline"
          onPress={onHowToPlay}
        >
          <Icon as={BookOpenIcon} size={16} className="text-forest-green" />
          <Text className="ml-1 font-bold text-forest-green">How to Play</Text>
        </Button>
      )}

      {/* Reset game */}
      <Button
        className="min-h-[44px] w-full rounded-xl border-2 border-red-400 bg-transparent"
        variant="outline"
        onPress={() => {
          Alert.alert(
            "Reset All Data",
            "This will permanently delete all your progress. This cannot be undone.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Reset",
                style: "destructive",
                onPress: onResetGame,
              },
            ],
          );
        }}
      >
        <Text className="font-bold text-red-500">Reset All Data</Text>
      </Button>
    </View>
  );
}
