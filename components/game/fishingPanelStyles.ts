/**
 * fishingPanelStyles.ts -- StyleSheet for FishingPanel.
 *
 * Extracted to keep FishingPanel.tsx under 300 lines.
 * Spec §44 (Fishing Mechanic)
 */

import { StyleSheet } from "react-native";
import { ACCENT, FONTS, LIGHT, RADIUS, SPACE } from "@/components/ui/tokens";

export const fishingStyles = StyleSheet.create({
  fishingPanel: {
    maxWidth: 340,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  phaseContainer: {
    paddingHorizontal: SPACE[3],
    paddingVertical: SPACE[3],
    alignItems: "center",
  },
  phaseText: {
    fontFamily: FONTS.heading,
    fontSize: 18,
    fontWeight: "600",
    color: LIGHT.textPrimary,
    textAlign: "center",
  },
  phaseTextBiting: {
    fontFamily: FONTS.critical,
    fontSize: 22,
    fontWeight: "700",
    color: ACCENT.amber,
  },
  phaseTextCaught: {
    color: ACCENT.sap,
    fontWeight: "700",
  },
  phaseTextEscaped: {
    color: LIGHT.textMuted,
    fontStyle: "italic",
  },

  // Bobber animation
  bobberContainer: {
    width: 120,
    height: 40,
    marginTop: SPACE[2],
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  waterLine: {
    position: "absolute",
    width: "100%",
    height: 2,
    backgroundColor: "rgba(66,165,245,0.3)",
    top: 20,
  },
  bobber: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: ACCENT.ember,
    shadowColor: ACCENT.ember,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 2,
  },
  ripple: {
    position: "absolute",
    borderRadius: RADIUS.circle,
    borderWidth: 1,
    borderColor: "rgba(66,165,245,0.2)",
    top: 14,
  },
  ripple1: {
    width: 32,
    height: 32,
    opacity: 0.5,
  },
  ripple2: {
    width: 52,
    height: 52,
    top: 4,
    opacity: 0.25,
  },

  // Progress bars
  progressBarContainer: {
    height: 8,
    marginHorizontal: SPACE[3],
    marginBottom: SPACE[2],
    backgroundColor: "rgba(66,165,245,0.12)",
    borderRadius: RADIUS.pill,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: ACCENT.frost,
    borderRadius: RADIUS.pill,
  },
  urgencyBarContainer: {
    height: 28,
    marginHorizontal: SPACE[3],
    marginBottom: SPACE[2],
    backgroundColor: "rgba(255,193,7,0.12)",
    borderRadius: RADIUS.pill,
    overflow: "hidden",
    justifyContent: "center",
  },
  urgencyBarFill: {
    position: "absolute",
    height: "100%",
    borderRadius: RADIUS.pill,
  },
  urgencyLabel: {
    fontFamily: FONTS.critical,
    fontSize: 13,
    fontWeight: "700",
    color: LIGHT.textPrimary,
    textAlign: "center",
    zIndex: 1,
  },

  // Timing bar
  timingBarContainer: {
    height: 36,
    marginHorizontal: SPACE[3],
    marginBottom: SPACE[3],
    backgroundColor: "rgba(66,165,245,0.1)",
    borderRadius: RADIUS.pill,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(66,165,245,0.2)",
  },
  timingZone: {
    position: "absolute",
    top: 0,
    height: "100%",
    backgroundColor: "rgba(74, 222, 128, 0.3)",
    borderRadius: RADIUS.pill,
  },
  timingCursor: {
    position: "absolute",
    top: 3,
    width: 4,
    height: 30,
    backgroundColor: ACCENT.sap,
    borderRadius: 2,
    marginLeft: -2,
    shadowColor: ACCENT.sap,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 2,
  },

  // Result
  resultContainer: {
    alignItems: "center",
    paddingVertical: SPACE[1],
  },
  resultContainerCaught: {},
  resultEmoji: {
    fontSize: 36,
  },

  // Action button
  actionContainer: {
    paddingHorizontal: SPACE[3],
    paddingBottom: SPACE[3],
    alignItems: "center",
  },
  actionButton: {
    backgroundColor: ACCENT.frost,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACE[5],
    paddingVertical: SPACE[2],
    minWidth: 130,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: ACCENT.frost,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  actionButtonBiting: {
    backgroundColor: ACCENT.amber,
    shadowColor: ACCENT.amber,
  },
  actionButtonDisabled: {
    backgroundColor: "rgba(66,165,245,0.15)",
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  actionButtonText: {
    fontFamily: FONTS.body,
    fontSize: 16,
    fontWeight: "700",
    color: "#FAFAFA",
  },
  actionButtonTextDisabled: {
    color: LIGHT.textMuted,
  },
});
