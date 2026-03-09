/**
 * CodexPanel -- Species Codex modal showing all 15 tree species in a grid.
 *
 * Each species card shows color swatches, name (or "???" if undiscovered),
 * biome tag, difficulty stars, and discovery status. Undiscovered cards
 * are dimmed. Footer shows discovery progress.
 *
 * Uses the shared craftingPanelShared panel frame (dark forest RPG aesthetic).
 *
 * Spec §8 (Species Codex), §25 (Discovery)
 */

import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/text";
import { ACCENT, FONTS, LIGHT, RADIUS, SPACE, TYPE } from "@/components/ui/tokens";
import { PRESTIGE_TREE_SPECIES, TREE_SPECIES } from "@/game/config/species";
import { useGameStore } from "@/game/stores";
import {
  buildCodexRows,
  type CodexRow,
  formatDifficulty,
  formatDiscoveryProgress,
  getTierLabel,
} from "./codexPanelLogic.ts";
import { sharedStyles } from "./craftingPanelShared.ts";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CodexPanelProps {
  open: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_SPECIES = [...TREE_SPECIES, ...PRESTIGE_TREE_SPECIES];

const TIER_COLORS: Record<number, string> = {
  0: LIGHT.textMuted,
  1: ACCENT.sap,
  2: ACCENT.frost,
  3: ACCENT.amber,
  4: ACCENT.gold,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CodexPanel({ open, onClose }: CodexPanelProps) {
  const speciesProgress = useGameStore((s) => s.speciesProgress);

  if (!open) return null;

  const rows = buildCodexRows(speciesProgress, ALL_SPECIES);
  const discoveredCount = rows.filter((r) => r.isDiscovered).length;
  const progressText = formatDiscoveryProgress(discoveredCount, ALL_SPECIES.length);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={sharedStyles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={onClose}
          accessibilityLabel="Close codex panel"
        />

        <View style={sharedStyles.panel} testID="codex-panel">
          {/* Header */}
          <View style={sharedStyles.header}>
            <View style={styles.titleRow}>
              <Text style={sharedStyles.titleIcon}>{"\uD83C\uDF3F"}</Text>
              <Text style={sharedStyles.title}>Species Codex</Text>
            </View>
            <Pressable
              style={sharedStyles.closeButton}
              onPress={onClose}
              accessibilityLabel="Close"
            >
              <Text style={sharedStyles.closeText}>{"\u2715"}</Text>
            </Pressable>
          </View>

          {/* Species grid */}
          <ScrollView style={sharedStyles.scrollArea} contentContainerStyle={styles.gridContent}>
            {rows.map((row) => (
              <SpeciesCard key={row.speciesId} row={row} />
            ))}
          </ScrollView>

          {/* Footer */}
          <View style={sharedStyles.footer}>
            <Text style={styles.footerText}>{progressText}</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// SpeciesCard sub-component
// ---------------------------------------------------------------------------

function SpeciesCard({ row }: { row: CodexRow }) {
  const tierColor = TIER_COLORS[row.discoveryTier] ?? LIGHT.textMuted;
  const stars = formatDifficulty(row.difficulty);
  const tierLabel = getTierLabel(row.discoveryTier);

  return (
    <View
      style={[
        sharedStyles.card,
        styles.speciesCard,
        !row.isDiscovered && sharedStyles.cardDisabled,
      ]}
    >
      {/* Color swatches */}
      <View style={styles.swatchRow}>
        <View style={[styles.swatch, { backgroundColor: row.canopyColor }]} />
        <View style={[styles.swatch, styles.trunkSwatch, { backgroundColor: row.trunkColor }]} />
      </View>

      {/* Name or ??? */}
      <Text style={styles.speciesName} numberOfLines={1}>
        {row.isDiscovered ? row.name : "???"}
      </Text>

      {/* Biome tag */}
      <Text style={styles.biomeTag} numberOfLines={1}>
        {row.isDiscovered ? row.biome : "Unknown"}
      </Text>

      {/* Difficulty stars */}
      <Text style={styles.stars}>{stars}</Text>

      {/* Discovery badge */}
      <View style={[styles.tierBadge, { borderColor: tierColor }]}>
        <Text style={[styles.tierText, { color: tierColor }]}>
          {row.isDiscovered ? "\u2714" : "\uD83D\uDD12"} {tierLabel}
        </Text>
      </View>

      {/* Prestige marker */}
      {row.isPrestige === true && <Text style={styles.prestigeMarker}>{"\u2728"}</Text>}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Local styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  gridContent: {
    padding: SPACE[2],
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACE[2],
    justifyContent: "center",
  },
  speciesCard: {
    width: 155,
    alignItems: "center",
    paddingVertical: SPACE[2],
    paddingHorizontal: SPACE[1],
    gap: SPACE[0],
    position: "relative",
  },
  swatchRow: {
    flexDirection: "row",
    gap: SPACE[0],
    marginBottom: SPACE[0],
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.organic,
    borderWidth: 1,
    borderColor: "rgba(102,187,106,0.3)",
  },
  trunkSwatch: {
    width: 16,
    height: 28,
    borderRadius: RADIUS.sharp,
  },
  speciesName: {
    fontFamily: FONTS.body,
    fontSize: 14,
    fontWeight: "700",
    color: LIGHT.textPrimary,
    textAlign: "center",
  },
  biomeTag: {
    fontFamily: FONTS.data,
    fontSize: 10,
    color: LIGHT.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  stars: {
    fontSize: 12,
    color: ACCENT.amber,
    letterSpacing: 1,
  },
  tierBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACE[1],
    paddingVertical: 2,
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  tierText: {
    fontFamily: FONTS.data,
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  prestigeMarker: {
    position: "absolute",
    top: SPACE[0],
    right: SPACE[0],
    fontSize: 14,
  },
  footerText: {
    ...TYPE.label,
    color: LIGHT.textSecondary,
    textAlign: "center",
    fontWeight: "600",
  },
});
