import { BookOpenIcon, DownloadIcon, SettingsIcon, UploadIcon } from "lucide-react-native";
import { Alert, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { ACCENT, FONTS, LIGHT, TYPE } from "@/components/ui/tokens";
import { ToggleSwitch } from "./ToggleSwitch.tsx";

const cardBg = LIGHT.bgCanopy;
const cardBorder = LIGHT.borderBranch;

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
        className="min-h-[48px] w-full rounded-xl"
        style={{ backgroundColor: ACCENT.greenBright }}
        onPress={() => {
          if (onSettings) {
            onSettings();
          } else {
            onOpenSettingsScreen();
          }
        }}
      >
        <Icon as={SettingsIcon} size={16} color="#FFF" />
        <Text style={{ marginLeft: 4, fontWeight: "700", color: "#FFF" }}>
          Audio, Graphics & Controls
        </Text>
      </Button>

      {/* Sound toggle */}
      <View
        className="rounded-xl p-3"
        style={{ backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder }}
      >
        <ToggleSwitch enabled={soundEnabled} onToggle={onToggleSound} label="Sound Effects" />
      </View>

      {/* Haptics toggle */}
      <View
        className="rounded-xl p-3"
        style={{ backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder }}
      >
        <ToggleSwitch enabled={hapticsEnabled} onToggle={onToggleHaptics} label="Haptic Feedback" />
      </View>

      {/* Save management */}
      {onExportSave || onImportSave ? (
        <View
          className="rounded-xl p-3"
          style={{ backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder }}
        >
          <Text
            style={{
              ...TYPE.label,
              fontFamily: FONTS.heading,
              color: LIGHT.textPrimary,
              marginBottom: 8,
            }}
          >
            Save Management
          </Text>
          <View className="flex-row gap-2">
            {onExportSave ? (
              <Button
                className="min-h-[44px] flex-1 rounded-xl bg-transparent"
                style={{ borderWidth: 2, borderColor: LIGHT.borderBranch }}
                variant="outline"
                onPress={onExportSave}
              >
                <Icon as={DownloadIcon} size={14} color={LIGHT.textPrimary} />
                <Text
                  style={{
                    marginLeft: 4,
                    fontSize: 10,
                    fontWeight: "700",
                    color: LIGHT.textPrimary,
                  }}
                >
                  Export
                </Text>
              </Button>
            ) : null}
            {onImportSave ? (
              <Button
                className="min-h-[44px] flex-1 rounded-xl bg-transparent"
                style={{ borderWidth: 2, borderColor: LIGHT.borderBranch }}
                variant="outline"
                onPress={onImportSave}
              >
                <Icon as={UploadIcon} size={14} color={LIGHT.textPrimary} />
                <Text
                  style={{
                    marginLeft: 4,
                    fontSize: 10,
                    fontWeight: "700",
                    color: LIGHT.textPrimary,
                  }}
                >
                  Import
                </Text>
              </Button>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* How to Play */}
      {onHowToPlay ? (
        <Button
          className="min-h-[44px] w-full rounded-xl bg-transparent"
          style={{ borderWidth: 2, borderColor: ACCENT.greenBright }}
          variant="outline"
          onPress={onHowToPlay}
        >
          <Icon as={BookOpenIcon} size={16} color={ACCENT.greenBright} />
          <Text style={{ marginLeft: 4, fontWeight: "700", color: ACCENT.greenBright }}>
            How to Play
          </Text>
        </Button>
      ) : null}

      {/* Reset game */}
      <Button
        className="min-h-[44px] w-full rounded-xl bg-transparent"
        style={{ borderWidth: 2, borderColor: ACCENT.ember }}
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
        <Text style={{ fontWeight: "700", color: ACCENT.ember }}>Reset All Data</Text>
      </Button>
    </View>
  );
}
