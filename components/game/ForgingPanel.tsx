/**
 * ForgingPanel -- FPS HUD overlay for smelting ore and upgrading tools.
 *
 * Two tabs: [Smelt] for smelting recipes, [Upgrade] for tool tier upgrades.
 * Wind Waker bright theme with fire/amber accents for the forge.
 *
 * Spec §22.2
 */

import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/text";
import type { SmeltRecipe, ToolTierUpgrade } from "@/game/systems/forging";
import { getIngredientEmoji, sharedStyles } from "./craftingPanelShared.ts";
import {
  buildSmeltRows,
  buildUpgradeRows,
  type ForgingTab,
  formatSmeltTime,
  type SmeltRecipeRow,
  type ToolUpgradeRow,
} from "./forgingPanelLogic.ts";
import { forgingStyles as ls } from "./forgingPanelStyles.ts";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ForgingPanelProps {
  open: boolean;
  onClose: () => void;
  inventory: Record<string, number>;
  toolUpgrades: Record<string, number>;
  onSmelt: (recipe: SmeltRecipe) => void;
  onUpgrade: (toolId: string, upgrade: ToolTierUpgrade) => void;
}

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
      <View style={sharedStyles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={onClose}
          accessibilityLabel="Close forge panel"
        />
        <View style={sharedStyles.panel} testID="forging-panel">
          {/* Header */}
          <View style={sharedStyles.header}>
            <View style={ls.titleRow}>
              <Text style={sharedStyles.titleIcon}>{"\u2692\uFE0F"}</Text>
              <Text style={sharedStyles.title}>The Forge</Text>
            </View>
            <Pressable
              style={sharedStyles.closeButton}
              onPress={onClose}
              accessibilityLabel="Close"
            >
              <Text style={sharedStyles.closeText}>{"\u2715"}</Text>
            </Pressable>
          </View>

          {/* Tab bar */}
          <View style={sharedStyles.tabBar}>
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  style={[sharedStyles.tab, isActive && sharedStyles.tabActive]}
                  onPress={() => setActiveTab(tab.key)}
                  accessibilityLabel={`${tab.label} tab`}
                  accessibilityRole="tab"
                >
                  <Text style={[sharedStyles.tabLabel, isActive && sharedStyles.tabLabelActive]}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Content */}
          <ScrollView
            style={sharedStyles.scrollArea}
            contentContainerStyle={sharedStyles.scrollContent}
          >
            {activeTab === "smelt" && <SmeltTab rows={smeltRows} onSmelt={onSmelt} />}
            {activeTab === "upgrade" && <UpgradeTab rows={upgradeRows} onUpgrade={onUpgrade} />}
          </ScrollView>

          {/* Footer */}
          <View style={sharedStyles.footer}>
            <Pressable
              style={sharedStyles.footerButton}
              onPress={onClose}
              accessibilityLabel="Close forge"
            >
              <Text style={sharedStyles.footerButtonText}>Close</Text>
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
  onSmelt: (r: SmeltRecipe) => void;
}) {
  return (
    <View style={ls.tabContent}>
      {rows.map((row) => (
        <View
          key={row.recipe.id}
          style={[sharedStyles.card, !row.canAfford && sharedStyles.cardDisabled]}
        >
          <View style={sharedStyles.cardHeader}>
            <Text style={sharedStyles.cardName}>{row.recipe.name}</Text>
            <Text style={sharedStyles.cardTime}>{formatSmeltTime(row.timeSec)}</Text>
          </View>
          <View style={sharedStyles.ingredientRow}>
            {row.inputRows.map((input) => (
              <View
                key={input.label}
                style={[
                  sharedStyles.ingredientChip,
                  !input.enough && sharedStyles.ingredientChipInsufficient,
                ]}
              >
                <Text style={sharedStyles.ingredientEmoji}>
                  {getIngredientEmoji(input.label.toLowerCase())}
                </Text>
                <Text
                  style={[
                    sharedStyles.ingredientText,
                    !input.enough && sharedStyles.ingredientTextInsufficient,
                  ]}
                >
                  {input.have}/{input.amount}
                </Text>
              </View>
            ))}
          </View>
          <Text style={sharedStyles.outputLabel}>{row.outputLabel}</Text>
          <Pressable
            style={[ls.smeltButton, !row.canAfford && sharedStyles.actionButtonDisabled]}
            onPress={() => onSmelt(row.recipe)}
            disabled={!row.canAfford}
            accessibilityLabel={`Smelt ${row.recipe.name}`}
          >
            <Text
              style={[
                sharedStyles.actionButtonText,
                !row.canAfford && sharedStyles.actionButtonTextDisabled,
              ]}
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
  onUpgrade: (id: string, u: ToolTierUpgrade) => void;
}) {
  return (
    <View style={ls.tabContent}>
      {rows.map((row) => (
        <View
          key={row.toolId}
          style={[sharedStyles.card, !row.canAfford && row.upgrade && sharedStyles.cardDisabled]}
        >
          <View style={sharedStyles.cardHeader}>
            <Text style={sharedStyles.cardName}>{row.toolName}</Text>
            <Text style={sharedStyles.tierBadge}>{row.currentTierLabel}</Text>
          </View>
          {row.upgrade ? (
            <>
              <View style={ls.upgradeArrow}>
                <Text style={ls.upgradeFrom}>{row.currentTierLabel}</Text>
                <Text style={ls.arrow}>{"\u2192"}</Text>
                <Text style={ls.upgradeTo}>{row.nextTierLabel}</Text>
              </View>
              <View style={sharedStyles.costList}>
                {row.costRows.map((cost) => (
                  <View key={cost.label} style={sharedStyles.costRow}>
                    <View style={sharedStyles.costLabel}>
                      <Text style={sharedStyles.ingredientEmoji}>
                        {getIngredientEmoji(cost.label.toLowerCase().replace(/ /g, "-"))}
                      </Text>
                      <Text style={sharedStyles.costLabelText}>{cost.label}</Text>
                    </View>
                    <Text
                      style={[
                        sharedStyles.costAmount,
                        !cost.enough && sharedStyles.costInsufficient,
                      ]}
                    >
                      {cost.have}/{cost.amount}
                    </Text>
                  </View>
                ))}
              </View>
              <Pressable
                style={[ls.upgradeButton, !row.canAfford && sharedStyles.actionButtonDisabled]}
                // biome-ignore lint/style/noNonNullAssertion: guarded by row.upgrade ternary
                onPress={() => onUpgrade(row.toolId, row.upgrade!)}
                disabled={!row.canAfford}
                accessibilityLabel={`Upgrade ${row.toolName} to ${row.nextTierLabel}`}
              >
                <Text
                  style={[
                    sharedStyles.actionButtonText,
                    !row.canAfford && sharedStyles.actionButtonTextDisabled,
                  ]}
                >
                  Upgrade
                </Text>
              </Pressable>
            </>
          ) : (
            <View style={ls.maxTierContainer}>
              <Text style={ls.maxTierStar}>{"\u2B50"}</Text>
              <Text style={sharedStyles.maxTierLabel}>Max tier reached</Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}
