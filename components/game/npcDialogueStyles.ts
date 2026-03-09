/**
 * npcDialogueStyles.ts -- StyleSheet for NpcDialogue.tsx.
 *
 * Dark RPG dialogue card styling. Extracted to keep NpcDialogue under 300 lines.
 * Spec SS15, SS33.
 */

import { StyleSheet } from "react-native";
import { ACCENT, FONTS, RADIUS, SPACE, TYPE } from "@/components/ui/tokens";

export const dialogueStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.30)",
  },
  backdropTap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  // Card frame -- dark forest RPG
  card: {
    marginHorizontal: SPACE[2],
    marginBottom: SPACE[5],
    overflow: "hidden",
    borderRadius: RADIUS.organic * 2,
    backgroundColor: "rgba(15,45,20,0.94)",
    borderWidth: 2,
    borderColor: ACCENT.gold,
    shadowColor: ACCENT.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 14,
  },

  // Speech bubble tail (pointing down-left)
  tail: {
    position: "absolute",
    bottom: -8,
    left: 28,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: ACCENT.gold,
  },

  // Header with portrait
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACE[3],
    paddingTop: SPACE[2],
    paddingBottom: SPACE[1],
  },
  portrait: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACE[2],
  },
  portraitLetter: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: FONTS.heading,
  },
  nameContainer: {
    flexShrink: 1,
  },
  name: {
    fontSize: 16,
    fontFamily: FONTS.heading,
    fontWeight: "700",
    color: ACCENT.gold,
  },
  nameUnderline: {
    height: 2,
    marginTop: 3,
    borderRadius: 1,
    backgroundColor: ACCENT.gold,
    opacity: 0.5,
  },

  // Text bubble
  textArea: {
    paddingHorizontal: SPACE[3],
    paddingBottom: SPACE[2],
  },
  textBubble: {
    borderRadius: RADIUS.organic,
    paddingHorizontal: SPACE[3],
    paddingVertical: SPACE[2],
    backgroundColor: "rgba(232,245,233,0.08)",
    borderWidth: 1,
    borderColor: "rgba(232,245,233,0.06)",
  },
  bodyText: {
    ...TYPE.body,
    lineHeight: 22,
    color: "rgba(232,245,233,0.95)",
    fontSize: 15,
  },
  speakerPrefix: {
    fontWeight: "600",
    fontFamily: FONTS.heading,
    color: ACCENT.gold,
    fontSize: 13,
  },

  // Bounce arrow
  bounceContainer: {
    alignItems: "flex-end",
    marginTop: 6,
  },
  bounceArrow: {
    color: ACCENT.gold,
    fontSize: 14,
    opacity: 0.7,
  },

  // Choices scroll area
  choicesScroll: {
    maxHeight: 220,
  },

  // Farewell button
  farewell: {
    marginHorizontal: SPACE[3],
    marginBottom: SPACE[2],
    minHeight: 44,
    justifyContent: "center",
    borderRadius: RADIUS.organic * 1.5,
    paddingHorizontal: SPACE[3],
    paddingVertical: SPACE[2],
    borderWidth: 1,
    borderColor: "rgba(255,213,79,0.3)",
    backgroundColor: "rgba(255,213,79,0.08)",
  },
  farewellText: {
    ...TYPE.body,
    textAlign: "center",
    fontWeight: "600",
    fontFamily: FONTS.heading,
    color: ACCENT.gold,
  },
});
