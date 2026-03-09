/**
 * ForgingPanel -- FPS HUD overlay for smelting ore and upgrading tools.
 *
 * Opened when the player interacts with a Forge structure (Spec §22.2).
 * Two tabs: [Smelt] for smelting recipes, [Upgrade] for tool tier upgrades.
 * Dark forest theme styling per UX brand doc §5.
 */

import { XIcon } from "lucide-react-native";
import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { ACCENT, DARK, FONTS, LIGHT, RADIUS, SPACE } from "@/components/ui/tokens";
import type { SmeltRecipe, ToolTierUpgrade } from "@/game/systems/forging";
import {
  buildSmeltRows,
  buildUpgradeRows,
  type ForgingTab,
  formatSmeltTime,
  type SmeltRecipeRow,
  type ToolUpgradeRow,
} from "./forgingPanelLogic.ts";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ForgingPanelProps {
  open: boolean;
  onClose: () => void;
  /** Current resource inventory (keyed by resource id). */
  inventory: Record<string, number>;
  /** Tool upgrade levels from gameState.toolUpgrades. */
  toolUpgrades: Record<string, number>;
  /** Called when the player starts smelting a recipe. */
  onSmelt: (recipe: SmeltRecipe) => void;
  /** Called when the player upgrades a tool tier. */
  onUpgrade: (toolId: string, upgrade: ToolTierUpgrade) => void;
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

const TABS: { key: ForgingTab; label: string }[] = [
  { key: "smelt", label: "Smelt" },
  { key: "upgrade", label: "Upgrade" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ForgingPanel({
  open,
  onClose,
  inventory,
  toolUpgrades,
  onSmelt,
  onUpgrade,
}: ForgingPanelProps) {
  const [activeTab, setActiveTab] = useState<ForgingTab>("smelt");

  if (!open) return null;

  const smeltRows = buildSmeltRows(inventory);
  const upgradeRows = buildUpgradeRows(toolUpgrades, inventory);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {/* Backdrop tap to close */}
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={onClose}
          accessibilityLabel="Close forge panel"
        />

        {/* Panel */}
        <View style={styles.panel} testID="forging-panel">
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>The Forge</Text>
            <Pressable style={styles.closeButton} onPress={onClose} accessibilityLabel="Close">
              <Icon as={XIcon} size={20} color={LIGHT.textMuted} />
            </Pressable>
          </View>

          {/* Tab bar */}
          <View style={styles.tabBar}>
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  style={[styles.tab, isActive && styles.tabActive]}
                  onPress={() => setActiveTab(tab.key)}
                  accessibilityLabel={`${tab.label} tab`}
                  accessibilityRole="tab"
                >
                  <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Content */}
          <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
            {activeTab === "smelt" && <SmeltTab rows={smeltRows} onSmelt={onSmelt} />}
            {activeTab === "upgrade" && <UpgradeTab rows={upgradeRows} onUpgrade={onUpgrade} />}
          </ScrollView>

          {/* Close button */}
          <View style={styles.footer}>
            <Pressable
              style={styles.closeAction}
              onPress={onClose}
              accessibilityLabel="Close forge"
            >
              <Text style={styles.closeActionText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// SmeltTab
// ---------------------------------------------------------------------------

function SmeltTab({
  rows,
  onSmelt,
}: {
  rows: SmeltRecipeRow[];
  onSmelt: (recipe: SmeltRecipe) => void;
}) {
  return (
    <View style={styles.tabContent}>
      {rows.map((row) => (
        <View key={row.recipe.id} style={styles.recipeCard}>
          {/* Recipe name + time */}
          <View style={styles.recipeHeader}>
            <Text style={styles.recipeName}>{row.recipe.name}</Text>
            <Text style={styles.recipeTime}>{formatSmeltTime(row.timeSec)}</Text>
          </View>

          {/* Inputs */}
          <View style={styles.costList}>
            {row.inputRows.map((input) => (
              <View key={input.label} style={styles.costRow}>
                <Text style={styles.costLabel}>{input.label}</Text>
                <Text style={[styles.costAmount, !input.enough && styles.costInsufficient]}>
                  {input.have}/{input.amount}
                </Text>
              </View>
            ))}
          </View>

          {/* Output */}
          <Text style={styles.outputLabel}>{row.outputLabel}</Text>

          {/* Forge button */}
          <Pressable
            style={[styles.forgeButton, !row.canAfford && styles.forgeButtonDisabled]}
            onPress={() => onSmelt(row.recipe)}
            disabled={!row.canAfford}
            accessibilityLabel={`Smelt ${row.recipe.name}`}
          >
            <Text
              style={[styles.forgeButtonText, !row.canAfford && styles.forgeButtonTextDisabled]}
            >
              Smelt
            </Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// UpgradeTab
// ---------------------------------------------------------------------------

function UpgradeTab({
  rows,
  onUpgrade,
}: {
  rows: ToolUpgradeRow[];
  onUpgrade: (toolId: string, upgrade: ToolTierUpgrade) => void;
}) {
  return (
    <View style={styles.tabContent}>
      {rows.map((row) => (
        <View key={row.toolId} style={styles.recipeCard}>
          {/* Tool name + current tier */}
          <View style={styles.recipeHeader}>
            <Text style={styles.recipeName}>{row.toolName}</Text>
            <Text style={styles.tierBadge}>{row.currentTierLabel}</Text>
          </View>

          {row.upgrade ? (
            <>
              {/* Upgrade path label */}
              <Text style={styles.upgradePath}>
                {row.currentTierLabel} {"\u2192"} {row.nextTierLabel}
              </Text>

              {/* Cost */}
              <View style={styles.costList}>
                {row.costRows.map((cost) => (
                  <View key={cost.label} style={styles.costRow}>
                    <Text style={styles.costLabel}>{cost.label}</Text>
                    <Text style={[styles.costAmount, !cost.enough && styles.costInsufficient]}>
                      {cost.have}/{cost.amount}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Upgrade button */}
              <Pressable
                style={[styles.forgeButton, !row.canAfford && styles.forgeButtonDisabled]}
                // biome-ignore lint/style/noNonNullAssertion: guarded by row.upgrade ternary on line 208
                onPress={() => onUpgrade(row.toolId, row.upgrade!)}
                disabled={!row.canAfford}
                accessibilityLabel={`Upgrade ${row.toolName} to ${row.nextTierLabel}`}
              >
                <Text
                  style={[styles.forgeButtonText, !row.canAfford && styles.forgeButtonTextDisabled]}
                >
                  Upgrade
                </Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.maxTierLabel}>Max tier reached</Text>
          )}
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles -- Wind Waker bright theme
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
    paddingHorizontal: SPACE[3],
  },
  panel: {
    width: "100%",
    maxWidth: 380,
    maxHeight: "85%",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: RADIUS.organic * 2,
    borderWidth: 2,
    borderColor: LIGHT.borderBranch,
    overflow: "hidden",
    zIndex: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACE[3],
    paddingVertical: SPACE[2],
    borderBottomWidth: 1,
    borderBottomColor: LIGHT.borderBranch,
  },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 20,
    fontWeight: "700",
    color: LIGHT.textPrimary,
  },
  closeButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },

  // Tab bar
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: LIGHT.borderBranch,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: ACCENT.amber,
  },
  tabLabel: {
    fontFamily: FONTS.body,
    fontSize: 13,
    fontWeight: "600",
    color: LIGHT.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  tabLabelActive: {
    color: ACCENT.amber,
  },

  // Content area
  content: {
    flexGrow: 0,
    flexShrink: 1,
  },
  contentInner: {
    padding: SPACE[2],
  },
  tabContent: {
    gap: SPACE[2],
  },

  // Recipe / upgrade card
  recipeCard: {
    backgroundColor: "rgba(232,245,233,0.7)",
    borderRadius: RADIUS.organic,
    borderWidth: 1,
    borderColor: LIGHT.borderBranch,
    padding: SPACE[2],
    gap: SPACE[1],
  },
  recipeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  recipeName: {
    fontFamily: FONTS.body,
    fontSize: 15,
    fontWeight: "600",
    color: LIGHT.textPrimary,
  },
  recipeTime: {
    fontFamily: FONTS.data,
    fontSize: 12,
    color: LIGHT.textSecondary,
  },

  // Cost rows
  costList: {
    gap: 2,
  },
  costRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: SPACE[0],
  },
  costLabel: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: LIGHT.textSecondary,
  },
  costAmount: {
    fontFamily: FONTS.data,
    fontSize: 12,
    color: ACCENT.sap,
  },
  costInsufficient: {
    color: ACCENT.ember,
  },

  // Output
  outputLabel: {
    fontFamily: FONTS.body,
    fontSize: 12,
    fontWeight: "500",
    color: ACCENT.gold,
    marginTop: 2,
  },

  // Tier badge
  tierBadge: {
    fontFamily: FONTS.data,
    fontSize: 11,
    fontWeight: "700",
    color: LIGHT.textSecondary,
    backgroundColor: "#FAFAFA",
    paddingHorizontal: SPACE[1],
    paddingVertical: 2,
    borderRadius: RADIUS.sharp,
    overflow: "hidden",
    textTransform: "uppercase",
  },
  upgradePath: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: ACCENT.frost,
  },
  maxTierLabel: {
    fontFamily: FONTS.body,
    fontSize: 12,
    fontStyle: "italic",
    color: LIGHT.textMuted,
    marginTop: 2,
  },

  // Forge / Upgrade button
  forgeButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ACCENT.amber,
    borderRadius: RADIUS.organic,
    marginTop: SPACE[1],
  },
  forgeButtonDisabled: {
    backgroundColor: "#CFD8DC",
    opacity: 0.5,
  },
  forgeButtonText: {
    fontFamily: FONTS.body,
    fontSize: 14,
    fontWeight: "700",
    color: "#FAFAFA",
  },
  forgeButtonTextDisabled: {
    color: LIGHT.textMuted,
  },

  // Footer
  footer: {
    borderTopWidth: 1,
    borderTopColor: LIGHT.borderBranch,
    padding: SPACE[2],
  },
  closeAction: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: RADIUS.organic,
    borderWidth: 2,
    borderColor: LIGHT.borderBranch,
  },
  closeActionText: {
    fontFamily: FONTS.body,
    fontSize: 14,
    fontWeight: "700",
    color: LIGHT.textSecondary,
  },
});
