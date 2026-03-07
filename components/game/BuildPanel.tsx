/**
 * BuildPanel -- Kitbashing piece picker with radial category selection.
 *
 * Two-step navigation: radial category wheel → scrollable piece list per
 * category. Categories derived from GAME_SPEC §35.2. Build costs and
 * unlock levels loaded from config/game/building.json at runtime.
 *
 * Pure functions live in buildPanelUtils.ts for testability (Spec §35.4).
 */

import { useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/ui/text";
import type { MaterialType, PieceType } from "@/game/ecs/components/building";
import {
  buildCosts,
  CATEGORIES,
  canAffordPiece,
  getBuildCost,
  getPieceUnlockLevel,
  isPieceLocked,
} from "./buildPanelUtils";

// Re-export pure functions for callers who import from this module
export {
  canAffordPiece,
  getBuildCost,
  getPiecesForCategory,
  getPieceUnlockLevel,
  getTier,
  isPieceLocked,
} from "./buildPanelUtils";

// ---------------------------------------------------------------------------
// Display maps
// ---------------------------------------------------------------------------

const PIECE_LABELS: Record<PieceType, string> = {
  wall: "Wall", floor: "Floor", roof: "Roof", stairs: "Stairs",
  foundation: "Foundation", door: "Door", window: "Window",
  pillar: "Pillar", platform: "Platform", beam: "Beam", pipe: "Pipe",
};

const MATERIAL_LABELS: Record<MaterialType, string> = {
  thatch: "Thatch", wood: "Wood", stone: "Stone", metal: "Metal", reinforced: "Reinforced",
};

const MATERIAL_COLORS: Record<MaterialType, string> = {
  thatch: "#D4A017", wood: "#8B6340", stone: "#9E9E9E", metal: "#607D8B", reinforced: "#455A64",
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface BuildPanelProps {
  open: boolean;
  playerLevel: number;
  resources: Record<string, number>;
  onSelectPiece: (pieceType: PieceType, material: MaterialType) => void;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Radial wheel constants
// ---------------------------------------------------------------------------

const RING_RADIUS = 68;
const BUTTON_SIZE = 52;

// ---------------------------------------------------------------------------
// CategoryWheel sub-component
// ---------------------------------------------------------------------------

function CategoryWheel({
  onSelect,
}: {
  onSelect: (categoryId: string) => void;
}) {
  const count = CATEGORIES.length;
  return (
    <View style={{ height: 180, alignItems: "center", justifyContent: "center" }}>
      <View style={{ width: 0, height: 0 }}>
        {CATEGORIES.map((cat, i) => {
          const angle = -Math.PI / 2 + (i / count) * 2 * Math.PI;
          const x = Math.cos(angle) * RING_RADIUS - BUTTON_SIZE / 2;
          const y = Math.sin(angle) * RING_RADIUS - BUTTON_SIZE / 2;
          return (
            <View
              key={cat.id}
              style={{
                position: "absolute",
                left: x,
                top: y,
                width: BUTTON_SIZE,
                height: BUTTON_SIZE,
              }}
            >
              <Pressable
                style={{
                  width: BUTTON_SIZE,
                  height: BUTTON_SIZE,
                  borderRadius: BUTTON_SIZE / 2,
                  backgroundColor: "rgba(45,90,39,0.12)",
                  borderWidth: 2,
                  borderColor: "#2D5A27",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onPress={() => onSelect(cat.id)}
                accessibilityLabel={cat.label}
              >
                <Text style={{ fontSize: 20, lineHeight: 24 }}>{cat.icon}</Text>
                <Text style={{ fontSize: 8, color: "#3E2723", fontWeight: "600" }}>
                  {cat.label}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
      <Text style={{ position: "absolute", bottom: 4, fontSize: 10, color: "#5D4037" }}>
        Select category
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// PieceRow sub-component
// ---------------------------------------------------------------------------

function PieceRow({
  pieceType,
  material,
  playerLevel,
  resources,
  onSelect,
}: {
  pieceType: PieceType;
  material: MaterialType;
  playerLevel: number;
  resources: Record<string, number>;
  onSelect: () => void;
}) {
  const locked = isPieceLocked(pieceType, material, playerLevel);
  const affordable = !locked && canAffordPiece(pieceType, material, resources);
  const unlockLvl = getPieceUnlockLevel(pieceType, material);
  const cost = getBuildCost(pieceType, material);

  return (
    <Pressable
      style={{
        flexDirection: "row",
        alignItems: "center",
        minHeight: 52,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 6,
        borderRadius: 12,
        borderWidth: 2,
        backgroundColor: locked ? "rgba(0,0,0,0.04)" : affordable ? "#fff" : "#f4f0e8",
        borderColor: affordable ? "#2D5A27" : "#ccc",
        opacity: locked ? 0.55 : 1,
      }}
      onPress={onSelect}
      disabled={locked || !affordable}
      accessibilityLabel={`${PIECE_LABELS[pieceType]} ${MATERIAL_LABELS[material]}${locked ? `, locked until level ${unlockLvl}` : ""}`}
    >
      {/* Material color swatch */}
      <View
        style={{
          width: 14,
          height: 36,
          borderRadius: 4,
          backgroundColor: MATERIAL_COLORS[material],
          marginRight: 10,
          flexShrink: 0,
        }}
      />

      {/* Piece + material name */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 13, fontWeight: "600", color: "#3E2723" }}>
          {PIECE_LABELS[pieceType]}
        </Text>
        <Text style={{ fontSize: 11, color: "#5D4037" }}>{MATERIAL_LABELS[material]}</Text>
      </View>

      {/* Build cost */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginHorizontal: 8 }}>
        {Object.entries(cost).map(([res, amt]) => (
          <View
            key={res}
            style={{
              backgroundColor: "rgba(45,90,39,0.12)",
              borderRadius: 99,
              paddingHorizontal: 6,
              paddingVertical: 2,
            }}
          >
            <Text style={{ fontSize: 10, color: "#2D5A27" }}>
              {amt} {res}
            </Text>
          </View>
        ))}
      </View>

      {/* Lock badge OR level badge */}
      {locked ? (
        <View
          style={{
            flexShrink: 0,
            backgroundColor: "rgba(93,64,55,0.15)",
            borderRadius: 99,
            paddingHorizontal: 6,
            paddingVertical: 2,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 10 }}>🔒</Text>
          <Text style={{ fontSize: 9, color: "#5D4037" }}>Lv{unlockLvl}</Text>
        </View>
      ) : (
        <View
          style={{
            flexShrink: 0,
            backgroundColor: "rgba(93,64,55,0.1)",
            borderRadius: 99,
            paddingHorizontal: 6,
            paddingVertical: 2,
          }}
        >
          <Text style={{ fontSize: 10, color: "#5D4037" }}>Lv{unlockLvl}</Text>
        </View>
      )}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// BuildPanel
// ---------------------------------------------------------------------------

export function BuildPanel({
  open,
  playerLevel,
  resources,
  onSelectPiece,
  onClose,
}: BuildPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleClose = () => {
    setSelectedCategory(null);
    onClose();
  };

  const handleSelect = (pieceType: PieceType, material: MaterialType) => {
    if (isPieceLocked(pieceType, material, playerLevel)) return;
    if (!canAffordPiece(pieceType, material, resources)) return;
    onSelectPiece(pieceType, material);
    setSelectedCategory(null);
    onClose();
  };

  if (!open) return null;

  const activeCat = CATEGORIES.find((c) => c.id === selectedCategory);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={handleClose}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" }}>
        <Pressable
          style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }}
          onPress={handleClose}
          accessibilityLabel="Close build panel"
        />

        <View
          style={{
            maxHeight: "75%",
            borderTopLeftRadius: 18,
            borderTopRightRadius: 18,
            borderTopWidth: 2,
            borderTopColor: "#5D4037",
            backgroundColor: "#FAF7F2",
            paddingBottom: 28,
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottomWidth: 1,
              borderBottomColor: "rgba(93,64,55,0.25)",
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}
          >
            {selectedCategory ? (
              <Pressable
                style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}
                onPress={() => setSelectedCategory(null)}
                accessibilityLabel="Back to categories"
              >
                <Text style={{ fontSize: 18, color: "#5D4037" }}>←</Text>
              </Pressable>
            ) : (
              <View style={{ width: 44 }} />
            )}

            <Text style={{ fontSize: 16, fontWeight: "700", color: "#2D5A27" }}>
              {activeCat ? `Build: ${activeCat.icon} ${activeCat.label}` : "Build"}
            </Text>

            <Pressable
              style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}
              onPress={handleClose}
              accessibilityLabel="Close"
            >
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#3E2723" }}>✕</Text>
            </Pressable>
          </View>

          {/* Body */}
          {!selectedCategory ? (
            <CategoryWheel onSelect={setSelectedCategory} />
          ) : (
            <ScrollView style={{ paddingHorizontal: 12, paddingTop: 8 }}>
              {activeCat?.pieces.map((pieceType) => {
                const materials = Object.keys(
                  buildCosts[pieceType] ?? {},
                ) as MaterialType[];
                return materials.map((material) => (
                  <PieceRow
                    key={`${pieceType}-${material}`}
                    pieceType={pieceType}
                    material={material}
                    playerLevel={playerLevel}
                    resources={resources}
                    onSelect={() => handleSelect(pieceType, material)}
                  />
                ));
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
