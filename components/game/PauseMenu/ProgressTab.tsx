import { Pressable, ScrollView, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { ACCENT, FONTS, LIGHT, TYPE } from "@/components/ui/tokens";
import type { AchievementDef, BorderCosmetic, GridExpansionInfo, PrestigeInfo } from "./types.ts";

const cardBg = LIGHT.bgCanopy;
const cardBorder = LIGHT.borderBranch;

interface ProgressTabProps {
  gridSize: number;
  level: number;
  achievements: string[];
  achievementDefs: AchievementDef[];
  gridExpansion: GridExpansionInfo | null;
  prestige: PrestigeInfo;
  activeBorderCosmetic: string | null;
  unlockedCosmetics: BorderCosmetic[];
  lockedCosmetics: BorderCosmetic[];
  confirmingPrestige: boolean;
  onExpandGrid: () => void;
  onSetBorderCosmetic: (id: string | null) => void;
  onPrestige: () => void;
  onCancelPrestige: () => void;
}

export function ProgressTab({
  gridSize,
  level,
  achievements,
  achievementDefs,
  gridExpansion,
  prestige,
  activeBorderCosmetic,
  unlockedCosmetics,
  lockedCosmetics,
  confirmingPrestige,
  onExpandGrid,
  onSetBorderCosmetic,
  onPrestige,
  onCancelPrestige,
}: ProgressTabProps) {
  return (
    <View className="gap-3">
      {/* Achievements */}
      <View
        className="rounded-xl p-3"
        style={{ backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder }}
      >
        <View className="mb-2 flex-row items-center justify-between">
          <Text
            style={{
              ...TYPE.label,
              fontFamily: FONTS.heading,
              color: LIGHT.textPrimary,
            }}
          >
            Achievements
          </Text>
          <Text style={{ fontSize: 10, fontFamily: FONTS.data, color: ACCENT.amber }}>
            {achievements.length}/{achievementDefs.length}
          </Text>
        </View>
        <ScrollView style={{ maxHeight: 192 }} nestedScrollEnabled>
          <View className="gap-2">
            {achievementDefs.map((achievement) => {
              const isUnlocked = achievements.includes(achievement.id);
              return (
                <View
                  key={achievement.id}
                  className="flex-row items-start gap-2 rounded-lg p-2"
                  style={{
                    borderWidth: 1,
                    borderColor: isUnlocked ? "rgba(255,215,0,0.5)" : "rgba(134,239,172,0.3)",
                    backgroundColor: isUnlocked ? "rgba(255,215,0,0.1)" : "rgba(255,255,255,0.4)",
                  }}
                >
                  <View
                    className="h-6 w-6 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: isUnlocked ? ACCENT.gold : LIGHT.textMuted,
                    }}
                  >
                    <Text style={{ fontSize: 10, color: isUnlocked ? "#FFF" : "#FFF" }}>
                      {isUnlocked ? "\u2713" : "?"}
                    </Text>
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: "600",
                        color: isUnlocked ? LIGHT.textPrimary : LIGHT.textMuted,
                      }}
                    >
                      {achievement.name}
                    </Text>
                    <Text style={{ fontSize: 10, marginTop: 2, color: LIGHT.textSecondary }}>
                      {isUnlocked ? achievement.description : "???"}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Grid Expansion */}
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
          Grid Expansion
        </Text>
        <Text style={{ fontSize: 10, color: LIGHT.textSecondary, marginBottom: 4 }}>
          Current: {gridSize}x{gridSize}
        </Text>
        {gridExpansion ? (
          <>
            <Text style={{ fontSize: 10, color: LIGHT.textSecondary, marginBottom: 2 }}>
              Next: {gridExpansion.nextSize}x{gridExpansion.nextSize} (Lv.
              {gridExpansion.nextRequiredLevel})
            </Text>
            <Text style={{ fontSize: 10, color: LIGHT.textMuted, marginBottom: 8 }}>
              Cost: {gridExpansion.costLabel}
            </Text>
            <Button
              className="min-h-[44px] w-full rounded-xl"
              style={{
                backgroundColor: gridExpansion.canAfford ? ACCENT.greenBright : LIGHT.textMuted,
              }}
              disabled={!gridExpansion.canAfford}
              onPress={onExpandGrid}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  fontFamily: FONTS.data,
                  color: gridExpansion.canAfford ? "#FFF" : LIGHT.bgDeep,
                }}
              >
                Expand to {gridExpansion.nextSize}x{gridExpansion.nextSize}
              </Text>
            </Button>
            {!gridExpansion.meetsLevel && (
              <Text
                style={{
                  fontSize: 10,
                  textAlign: "center",
                  color: ACCENT.ember,
                  marginTop: 4,
                }}
              >
                Requires Level {gridExpansion.nextRequiredLevel}
              </Text>
            )}
          </>
        ) : (
          <Text style={{ fontSize: 10, fontStyle: "italic", color: LIGHT.textMuted }}>
            Maximum grid size reached.
          </Text>
        )}
      </View>

      {/* Border Cosmetics */}
      {unlockedCosmetics.length > 0 && (
        <View
          className="rounded-xl p-3"
          style={{ backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder }}
        >
          <Text
            style={{
              ...TYPE.label,
              fontFamily: FONTS.heading,
              color: LIGHT.textPrimary,
              marginBottom: 4,
            }}
          >
            Border Cosmetics
          </Text>
          <Text style={{ fontSize: 10, color: LIGHT.textSecondary, marginBottom: 8 }}>
            Customize your grove border (unlocked by prestige)
          </Text>
          <View className="gap-2">
            {/* Default option */}
            <Pressable
              className="min-h-[44px] rounded-lg p-2"
              style={{
                borderWidth: 1,
                borderColor:
                  activeBorderCosmetic === null ? ACCENT.greenBright : "rgba(134,239,172,0.3)",
                backgroundColor:
                  activeBorderCosmetic === null ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.5)",
              }}
              onPress={() => onSetBorderCosmetic(null)}
              accessibilityLabel="Select Default Wood Frame border"
            >
              <Text style={{ fontSize: 10, fontWeight: "600", color: LIGHT.textPrimary }}>
                Default Wood Frame
              </Text>
              <Text style={{ fontSize: 10, marginTop: 2, color: LIGHT.textSecondary }}>
                Classic wooden border
              </Text>
            </Pressable>

            {/* Unlocked cosmetics */}
            {unlockedCosmetics.map((cosmetic) => (
              <Pressable
                key={cosmetic.id}
                className="min-h-[44px] rounded-lg p-2"
                style={{
                  borderWidth: 1,
                  borderColor:
                    activeBorderCosmetic === cosmetic.id
                      ? ACCENT.greenBright
                      : "rgba(134,239,172,0.3)",
                  backgroundColor:
                    activeBorderCosmetic === cosmetic.id
                      ? "rgba(34,197,94,0.1)"
                      : "rgba(255,255,255,0.5)",
                }}
                onPress={() => onSetBorderCosmetic(cosmetic.id)}
                accessibilityLabel={`Select ${cosmetic.name} border`}
              >
                <View className="flex-row items-center justify-between">
                  <Text style={{ fontSize: 10, fontWeight: "600", color: LIGHT.textPrimary }}>
                    {cosmetic.name}
                  </Text>
                  {activeBorderCosmetic === cosmetic.id && (
                    <Text style={{ fontSize: 10, color: ACCENT.greenBright }}>{"\u2713"}</Text>
                  )}
                </View>
                <Text style={{ fontSize: 10, marginTop: 2, color: LIGHT.textSecondary }}>
                  {cosmetic.description}
                </Text>
                {/* Color preview swatch */}
                <View
                  className="mt-1 h-4 rounded"
                  style={{
                    borderWidth: 3,
                    borderColor: cosmetic.borderColor,
                    ...(cosmetic.glowColor
                      ? {
                          shadowColor: cosmetic.glowColor,
                          shadowOffset: { width: 0, height: 0 },
                          shadowOpacity: 0.8,
                          shadowRadius: 8,
                          elevation: 4,
                        }
                      : {}),
                  }}
                />
              </Pressable>
            ))}

            {/* Locked cosmetics */}
            {lockedCosmetics.map((cosmetic) => (
              <View
                key={cosmetic.id}
                className="rounded-lg p-2 opacity-60"
                style={{
                  borderWidth: 1,
                  borderStyle: "dashed",
                  borderColor: LIGHT.textMuted,
                }}
              >
                <View className="flex-row items-center justify-between">
                  <Text style={{ fontSize: 10, fontWeight: "600", color: LIGHT.textMuted }}>
                    {cosmetic.name}
                  </Text>
                  <Text style={{ fontSize: 10, color: ACCENT.amber }}>
                    Prestige {cosmetic.prestigeRequired}
                  </Text>
                </View>
                <Text style={{ fontSize: 10, marginTop: 2, color: LIGHT.textMuted }}>
                  {cosmetic.description}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Prestige */}
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
          Prestige
        </Text>
        {prestige.count > 0 && (
          <View className="mb-2 gap-0.5">
            <Text style={{ fontSize: 10, color: LIGHT.textSecondary }}>
              Current prestige: {prestige.count}
            </Text>
            <Text style={{ fontSize: 10, color: LIGHT.textSecondary }}>
              Growth speed: {prestige.growthBonusPct}% bonus
            </Text>
          </View>
        )}
        {prestige.isEligible ? (
          confirmingPrestige ? (
            <View className="gap-2">
              <Text style={{ fontSize: 10, color: LIGHT.textSecondary }}>
                Prestige will reset your level, resources, seeds, and grove to start fresh. You keep
                achievements, lifetime stats, and gain permanent bonuses. Are you sure?
              </Text>
              <View className="flex-row gap-2">
                <Button
                  className="min-h-[44px] flex-1 rounded-xl"
                  style={{ backgroundColor: ACCENT.amber }}
                  onPress={onPrestige}
                >
                  <Text style={{ fontSize: 10, fontWeight: "700", color: "#FFF" }}>
                    Confirm Prestige
                  </Text>
                </Button>
                <Button
                  className="min-h-[44px] flex-1 rounded-xl bg-transparent"
                  style={{ borderWidth: 2, borderColor: LIGHT.borderBranch }}
                  variant="outline"
                  onPress={onCancelPrestige}
                >
                  <Text style={{ fontSize: 10, fontWeight: "700", color: LIGHT.textSecondary }}>
                    Cancel
                  </Text>
                </Button>
              </View>
            </View>
          ) : (
            <Button
              className="min-h-[44px] w-full rounded-xl"
              style={{ backgroundColor: ACCENT.amber }}
              onPress={onPrestige}
            >
              <Text style={{ fontSize: 10, fontWeight: "700", color: "#FFF" }}>
                Prestige (Reset for Bonuses)
              </Text>
            </Button>
          )
        ) : (
          <View>
            <Text style={{ fontSize: 10, color: LIGHT.textMuted }}>
              Reach Level {prestige.minLevel} to unlock Prestige.
            </Text>
            {level > 0 && (
              <Text style={{ fontSize: 10, marginTop: 2, color: ACCENT.ember }}>
                Current: Lv.{level} / {prestige.minLevel}
              </Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}
