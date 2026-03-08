/**
 * TargetInfo — HUD overlay showing entity name and action prompt (Spec §11).
 *
 * Reads the current raycast hit from the shared useTargetHit store (updated
 * each frame by useRaycast inside the R3F Canvas). Renders a centered overlay
 * showing the entity name and the action prompt for the selected tool.
 *
 * This is a React Native component rendered outside the Canvas — it must NOT
 * import any R3F or Three.js APIs directly.
 */

import { StyleSheet, Text, View } from "react-native";
import { getSpeciesById } from "@/game/config/species";
import type { RaycastEntityType, RaycastHit } from "@/game/hooks/useRaycast";
import { useTargetHit } from "@/game/hooks/useRaycast";
import { useGameStore } from "@/game/stores";

// ── Pure functions (testable seams) ──────────────────────────────────────────

/**
 * Derives a human-readable display name for the hit entity.
 *
 * - tree  → species name from config (e.g. "Oak Tree")
 * - npc   → NPC's given name from NpcComponent (e.g. "Merchant Ros")
 * - structure → template ID formatted as title case (e.g. "Campfire")
 */
export function resolveEntityName(hit: RaycastHit): string {
  const { entity, entityType } = hit;

  if (entityType === "tree") {
    const speciesId = entity.tree?.speciesId;
    if (speciesId) {
      const species = getSpeciesById(speciesId);
      if (species) return species.name;
    }
    return "Tree";
  }

  if (entityType === "npc") {
    return entity.npc?.name ?? "Stranger";
  }

  if (entityType === "structure") {
    const templateId = entity.structure?.templateId;
    if (templateId) {
      // Convert kebab-case to Title Case: "compost-bin" → "Compost Bin"
      return templateId
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    }
    return "Structure";
  }

  return "Object";
}

/** Tool-to-action mapping for trees. */
const TREE_TOOL_PROMPTS: Partial<Record<string, string>> = {
  axe: "E to Harvest",
  "watering-can": "E to Water",
  "pruning-shears": "E to Prune",
  "compost-bin": "E to Fertilize",
  shovel: "E to Dig",
};

/**
 * Derives the action prompt text for the given hit + selected tool.
 *
 * - tree  → tool-specific prompt (Harvest / Water / Prune / Fertilize / Interact)
 * - npc   → "E to Talk"
 * - structure → "E to Use"
 */
export function resolveActionPrompt(hit: RaycastHit, selectedTool: string): string {
  const { entityType } = hit;

  if (entityType === "tree") {
    return TREE_TOOL_PROMPTS[selectedTool] ?? "E to Interact";
  }

  if (entityType === "npc") {
    return "E to Talk";
  }

  if (entityType === "structure") {
    return "E to Use";
  }

  return "E to Interact";
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Renders the entity name and action prompt when the camera looks at
 * something interactable. Returns null when nothing is targeted.
 *
 * Place this inside the HUD overlay (outside the R3F Canvas).
 */
export function TargetInfo() {
  const hit = useTargetHit();
  const selectedTool = useGameStore((s) => s.selectedTool);

  if (!hit) return null;

  const name = resolveEntityName(hit);
  const prompt = resolveActionPrompt(hit, selectedTool);

  return (
    <View style={styles.container} pointerEvents="none">
      <Text style={styles.name}>{name}</Text>
      <Text style={styles.prompt}>{prompt}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: "40%",
    left: 0,
    right: 0,
    alignItems: "center",
    pointerEvents: "none",
  },
  name: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    marginBottom: 4,
  },
  prompt: {
    color: "#FFDD88",
    fontSize: 13,
    fontWeight: "500",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
});
