/**
 * pauseMenuStyles.ts -- StyleSheet for PauseMenu/index.tsx.
 *
 * Extracted to keep PauseMenu under 300 lines.
 */

import { StyleSheet } from "react-native";
import { ACCENT, FONTS, LIGHT, RADIUS, SPACE, TYPE } from "@/components/ui/tokens";

export const pauseStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    paddingHorizontal: SPACE[3],
  },
  panelOuter: {
    width: "100%",
    maxWidth: 400,
    position: "relative",
  },

  // Corner decorations
  cornerTL: { position: "absolute", top: -2, left: 4, zIndex: 10 },
  cornerTR: { position: "absolute", top: -2, right: 4, zIndex: 10 },
  cornerBL: { position: "absolute", bottom: -2, left: 4, zIndex: 10 },
  cornerBR: { position: "absolute", bottom: -2, right: 4, zIndex: 10 },
  cornerText: {
    fontSize: 18,
    color: ACCENT.sap,
    opacity: 0.6,
  },
  cornerFlipped: {
    transform: [{ scaleX: -1 }],
  },
  cornerRotated: {
    transform: [{ rotate: "180deg" }, { scaleX: -1 }],
  },
  cornerRotatedFlipped: {
    transform: [{ rotate: "180deg" }],
  },

  // Panel
  panel: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: RADIUS.organic * 2,
    borderWidth: 2,
    borderColor: LIGHT.borderBranch,
    overflow: "hidden",
    shadowColor: "#1B5E20",
    shadowOffset: { width: -4, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 16,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACE[3],
    paddingVertical: SPACE[2],
    borderBottomWidth: 1,
    borderBottomColor: "rgba(102,187,106,0.3)",
    backgroundColor: "rgba(232,245,233,0.4)",
  },
  headerTitle: {
    fontFamily: FONTS.heading,
    fontSize: 18,
    fontWeight: "700",
    color: LIGHT.textPrimary,
  },
  closeButton: {
    minHeight: 44,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: RADIUS.circle,
    backgroundColor: "rgba(102,187,106,0.1)",
  },

  // Tab bar
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(102,187,106,0.3)",
    backgroundColor: "rgba(232,245,233,0.2)",
  },
  tab: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 4,
  },
  tabActive: {
    borderBottomWidth: 3,
    borderBottomColor: ACCENT.greenBright,
  },
  tabIcon: {
    fontSize: 13,
  },
  tabLabel: {
    ...TYPE.label,
    textTransform: "capitalize",
    color: LIGHT.textMuted,
    fontWeight: "500",
  },
  tabLabelActive: {
    color: ACCENT.greenBright,
    fontWeight: "700",
  },

  // Tab content
  tabContentWrap: {
    flexShrink: 1,
  },
  scrollArea: {
    maxHeight: 320,
  },
  scrollContent: {
    paddingHorizontal: SPACE[3],
    paddingVertical: SPACE[2],
  },

  // Footer
  footer: {
    gap: SPACE[1],
    paddingHorizontal: SPACE[3],
    paddingVertical: SPACE[2],
    borderTopWidth: 1,
    borderTopColor: "rgba(102,187,106,0.3)",
  },
  continueText: {
    fontWeight: "700",
    color: "#FAFAFA",
  },
  menuText: {
    fontWeight: "700",
    color: ACCENT.ember,
  },
});
