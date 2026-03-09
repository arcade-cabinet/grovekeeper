/**
 * ToolWheel -- Radial tool selector with pie layout and smooth animation.
 *
 * Tools arranged in a circle around a center hub. Spring scale-in animation
 * on open. Selected tool gets golden highlight + scale-up. Center shows
 * currently selected tool name. Semi-transparent dark backdrop.
 *
 * Spec S11: Tab key (desktop) or long-press (mobile) opens the tool selector.
 */

import { useEffect, useRef } from "react";
import { Animated, Modal, Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/text";
import { ACCENT, LIGHT, RADIUS, TYPE } from "@/components/ui/tokens";
import type { ToolData } from "@/game/config/tools";
import { TOOLS } from "@/game/config/tools";
import { computeRadialPositions, TOOL_EMOJI } from "./toolWheelLayout.ts";
import { useToolWheelTabKey } from "./toolWheelLogic.ts";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ToolWheelProps {
  open: boolean;
  /** Called to open the wheel. Used internally for Tab key / long-press wiring. */
  onOpen?: () => void;
  onClose: () => void;
  unlockedTools: string[];
  selectedTool: string;
  level: number;
  onSelectTool: (toolId: string) => void;
  onUnlockTool: (toolId: string) => void;
}

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const WHEEL_RADIUS = 110;
const TOOL_SLOT_SIZE = 56;
const CENTER_SIZE = 64;
const WHEEL_TOTAL = WHEEL_RADIUS * 2 + TOOL_SLOT_SIZE + 24;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ToolWheel({
  open,
  onOpen,
  onClose,
  unlockedTools,
  selectedTool,
  level,
  onSelectTool,
  onUnlockTool,
}: ToolWheelProps) {
  useToolWheelTabKey(() => (open ? onClose() : onOpen?.()));

  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (open) {
      scaleAnim.setValue(0.3);
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 60,
        useNativeDriver: true,
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [open, scaleAnim]);

  const handleSelectTool = (tool: ToolData) => {
    if (unlockedTools.includes(tool.id)) {
      onSelectTool(tool.id);
      onClose();
    } else if (level >= tool.unlockLevel) {
      onUnlockTool(tool.id);
      onSelectTool(tool.id);
      onClose();
    }
  };

  if (!open) return null;

  const positions = computeRadialPositions(TOOLS.length, WHEEL_RADIUS);
  const selectedToolData = TOOLS.find((t) => t.id === selectedTool);

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {/* Dismiss on tap outside */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close tool selector"
        />

        <Animated.View
          style={[styles.wheelContainer, { transform: [{ scale: scaleAnim }], opacity: scaleAnim }]}
        >
          {/* Center hub: shows selected tool name */}
          <View style={styles.centerHub}>
            <Text style={styles.centerEmoji}>{TOOL_EMOJI[selectedTool] ?? "\u{1FA93}"}</Text>
            <Text style={styles.centerText} numberOfLines={1}>
              {selectedToolData?.name ?? ""}
            </Text>
          </View>

          {/* Radial tool slots */}
          {TOOLS.map((tool, i) => {
            const pos = positions[i];
            const isUnlocked = unlockedTools.includes(tool.id);
            const isSelected = selectedTool === tool.id;
            const canUnlock = level >= tool.unlockLevel;
            const emoji = TOOL_EMOJI[tool.id] ?? "\u{1F527}";

            return (
              <Pressable
                key={tool.id}
                style={[
                  styles.toolSlot,
                  {
                    left: WHEEL_TOTAL / 2 + pos.x - TOOL_SLOT_SIZE / 2,
                    top: WHEEL_TOTAL / 2 + pos.y - TOOL_SLOT_SIZE / 2,
                  },
                  isSelected && styles.toolSlotSelected,
                  !isUnlocked && !canUnlock && styles.toolSlotLocked,
                ]}
                disabled={!isUnlocked && !canUnlock}
                onPress={() => handleSelectTool(tool)}
                accessibilityLabel={`${tool.name}${!isUnlocked ? ` (unlock at level ${tool.unlockLevel})` : ""}${isSelected ? " (selected)" : ""}`}
              >
                <Text style={[styles.toolEmoji, isSelected && styles.toolEmojiSelected]}>
                  {emoji}
                </Text>
                <Text
                  style={[styles.toolName, isSelected && styles.toolNameSelected]}
                  numberOfLines={1}
                >
                  {tool.name}
                </Text>
                {!isUnlocked && <Text style={styles.toolLevel}>Lv.{tool.unlockLevel}</Text>}
              </Pressable>
            );
          })}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  wheelContainer: {
    width: WHEEL_TOTAL,
    height: WHEEL_TOTAL,
    position: "relative",
  },
  centerHub: {
    position: "absolute",
    left: WHEEL_TOTAL / 2 - CENTER_SIZE / 2,
    top: WHEEL_TOTAL / 2 - CENTER_SIZE / 2,
    width: CENTER_SIZE,
    height: CENTER_SIZE,
    borderRadius: CENTER_SIZE / 2,
    backgroundColor: "rgba(232,245,233,0.9)",
    borderWidth: 2,
    borderColor: ACCENT.sap,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    shadowColor: ACCENT.sap,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  centerEmoji: {
    fontSize: 20,
  },
  centerText: {
    ...TYPE.caption,
    color: LIGHT.textPrimary,
    marginTop: 1,
  },
  toolSlot: {
    position: "absolute",
    width: TOOL_SLOT_SIZE,
    height: TOOL_SLOT_SIZE,
    borderRadius: RADIUS.organic,
    backgroundColor: "rgba(232,245,233,0.85)",
    borderWidth: 2,
    borderColor: "rgba(102,187,106,0.3)",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
  },
  toolSlotSelected: {
    borderColor: ACCENT.gold,
    backgroundColor: "rgba(255,213,79,0.15)",
    transform: [{ scale: 1.1 }],
    shadowColor: ACCENT.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  toolSlotLocked: {
    opacity: 0.4,
  },
  toolEmoji: {
    fontSize: 20,
  },
  toolEmojiSelected: {
    fontSize: 22,
  },
  toolName: {
    ...TYPE.caption,
    fontSize: 8,
    color: LIGHT.textPrimary,
    textAlign: "center",
  },
  toolNameSelected: {
    color: ACCENT.gold,
    fontWeight: "700",
  },
  toolLevel: {
    ...TYPE.caption,
    fontSize: 7,
    color: ACCENT.amber,
  },
});
