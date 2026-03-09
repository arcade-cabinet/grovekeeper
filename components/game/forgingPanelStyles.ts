/**
 * forgingPanelStyles.ts -- Local styles for ForgingPanel.
 *
 * Extracted to keep ForgingPanel.tsx under 300 lines.
 * Spec §22.2
 */

import { StyleSheet } from "react-native";
import { ACCENT, FONTS, LIGHT, SPACE } from "@/components/ui/tokens";
import { sharedStyles } from "./craftingPanelShared.ts";

export const forgingStyles = StyleSheet.create({
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  tabContent: {
    gap: SPACE[2],
  },
  smeltButton: {
    ...sharedStyles.actionButton,
    backgroundColor: ACCENT.amber,
  },
  upgradeButton: {
    ...sharedStyles.actionButton,
    backgroundColor: ACCENT.frost,
  },
  upgradeArrow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE[1],
    paddingVertical: 2,
  },
  upgradeFrom: {
    fontFamily: FONTS.data,
    fontSize: 12,
    color: LIGHT.textSecondary,
  },
  arrow: {
    fontFamily: FONTS.body,
    fontSize: 16,
    color: ACCENT.amber,
    fontWeight: "700",
  },
  upgradeTo: {
    fontFamily: FONTS.data,
    fontSize: 12,
    fontWeight: "700",
    color: ACCENT.frost,
  },
  maxTierContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE[1],
    paddingVertical: SPACE[1],
  },
  maxTierStar: {
    fontSize: 14,
  },
});
