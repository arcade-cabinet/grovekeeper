/**
 * craftingPanelShared.ts -- Shared styles and constants for crafting panels.
 *
 * Provides a consistent "bright Wind Waker" design language for CookingPanel,
 * ForgingPanel, and FishingPanel. Spec §22 (Crafting)
 */

import { StyleSheet } from "react-native";
import { ACCENT, FONTS, LIGHT, RADIUS, SPACE, TYPE } from "@/components/ui/tokens";

// ---------------------------------------------------------------------------
// Ingredient emoji mapping
// ---------------------------------------------------------------------------

const INGREDIENT_EMOJI: Record<string, string> = {
  apple: "\uD83C\uDF4E",
  carrot: "\uD83E\uDD55",
  cucumber: "\uD83E\uDD52",
  pumpkin: "\uD83C\uDF83",
  tomato: "\uD83C\uDF45",
  fish: "\uD83D\uDC1F",
  wood: "\uD83E\uDEB5",
  stone: "\uD83E\uDEA8",
  ore: "\u26CF\uFE0F",
  "iron-ingot": "\uD83D\uDD29",
  "grovekeeper-shard": "\uD83D\uDC8E",
  coal: "\u26AB",
  seed: "\uD83C\uDF31",
};

export function getIngredientEmoji(id: string): string {
  return INGREDIENT_EMOJI[id] ?? "\uD83D\uDCE6";
}

// ---------------------------------------------------------------------------
// Shared color constants
// ---------------------------------------------------------------------------

export const PANEL_BG = "rgba(255,255,255,0.94)";
export const PANEL_BORDER = LIGHT.borderBranch;
export const CARD_BG = "rgba(232,245,233,0.65)";
export const CARD_BG_DISABLED = "rgba(232,245,233,0.3)";
export const CARD_BORDER = "rgba(102,187,106,0.4)";

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

export const sharedStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
    paddingHorizontal: SPACE[3],
  },
  panel: {
    width: "100%",
    maxWidth: 380,
    maxHeight: "85%",
    backgroundColor: PANEL_BG,
    borderRadius: RADIUS.organic * 2,
    borderWidth: 2,
    borderColor: PANEL_BORDER,
    overflow: "hidden",
    zIndex: 1,
    shadowColor: "#1B5E20",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACE[3],
    paddingVertical: SPACE[2],
    borderBottomWidth: 1,
    borderBottomColor: CARD_BORDER,
    backgroundColor: "rgba(232,245,233,0.4)",
  },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 20,
    fontWeight: "700",
    color: LIGHT.textPrimary,
  },
  titleIcon: { fontSize: 20, marginRight: SPACE[1] },
  closeButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: RADIUS.circle,
    backgroundColor: "rgba(102,187,106,0.12)",
  },
  closeText: { fontSize: 18, fontWeight: "700", color: LIGHT.textMuted },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: CARD_BORDER,
    backgroundColor: "rgba(232,245,233,0.25)",
  },
  tab: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center" },
  tabActive: { borderBottomWidth: 3, borderBottomColor: ACCENT.amber },
  tabLabel: {
    fontFamily: FONTS.body,
    fontSize: 13,
    fontWeight: "600",
    color: LIGHT.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  tabLabelActive: { color: ACCENT.amber, fontWeight: "700" },
  scrollArea: { flexGrow: 0, flexShrink: 1 },
  scrollContent: { padding: SPACE[2], gap: SPACE[2] },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: RADIUS.organic,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: SPACE[2],
    gap: SPACE[1],
  },
  cardDisabled: { backgroundColor: CARD_BG_DISABLED, opacity: 0.55 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardName: { fontFamily: FONTS.body, fontSize: 15, fontWeight: "600", color: LIGHT.textPrimary },
  cardTime: { fontFamily: FONTS.data, fontSize: 11, color: LIGHT.textSecondary },
  ingredientRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACE[1] },
  ingredientChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACE[1],
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "rgba(102,187,106,0.3)",
  },
  ingredientChipInsufficient: {
    borderColor: "rgba(239,83,80,0.4)",
    backgroundColor: "rgba(239,83,80,0.06)",
  },
  ingredientEmoji: { fontSize: 14, marginRight: 3 },
  ingredientText: { fontFamily: FONTS.data, fontSize: 11, color: ACCENT.sap },
  ingredientTextInsufficient: { color: ACCENT.ember },
  costList: { gap: 3 },
  costRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 2,
  },
  costLabel: { flexDirection: "row", alignItems: "center", gap: 4 },
  costLabelText: { fontFamily: FONTS.body, fontSize: 12, color: LIGHT.textSecondary },
  costAmount: { fontFamily: FONTS.data, fontSize: 12, fontWeight: "600", color: ACCENT.sap },
  costInsufficient: { color: ACCENT.ember },
  effectText: { ...TYPE.caption, color: ACCENT.amber, fontWeight: "500" },
  outputLabel: { fontFamily: FONTS.body, fontSize: 12, fontWeight: "600", color: ACCENT.gold },
  actionButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: RADIUS.organic,
    marginTop: SPACE[1],
  },
  actionButtonText: { fontFamily: FONTS.body, fontSize: 14, fontWeight: "700", color: "#FAFAFA" },
  actionButtonDisabled: { backgroundColor: "#CFD8DC", opacity: 0.5 },
  actionButtonTextDisabled: { color: LIGHT.textMuted },
  progressContainer: {
    height: 10,
    borderRadius: RADIUS.pill,
    backgroundColor: "rgba(102,187,106,0.15)",
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: RADIUS.pill, backgroundColor: ACCENT.sap },
  tierBadge: {
    fontFamily: FONTS.data,
    fontSize: 10,
    fontWeight: "700",
    color: LIGHT.textSecondary,
    backgroundColor: "rgba(255,255,255,0.8)",
    paddingHorizontal: SPACE[1],
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
    overflow: "hidden",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  maxTierLabel: {
    fontFamily: FONTS.body,
    fontSize: 12,
    fontStyle: "italic",
    color: LIGHT.textMuted,
  },
  footer: { borderTopWidth: 1, borderTopColor: CARD_BORDER, padding: SPACE[2] },
  footerButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: RADIUS.organic,
    borderWidth: 2,
    borderColor: CARD_BORDER,
  },
  footerButtonText: {
    fontFamily: FONTS.body,
    fontSize: 14,
    fontWeight: "700",
    color: LIGHT.textSecondary,
  },
});
