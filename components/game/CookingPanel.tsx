/**
 * CookingPanel -- FPS HUD overlay for cooking food at a campfire.
 *
 * Shows all cooking recipes (from config/game/cooking.json) with ingredient
 * availability, effect previews, and a Cook button per recipe. Disabled
 * recipes are shown dimmed when the player lacks ingredients.
 *
 * Opened by the COOK action dispatcher when the player interacts with a lit
 * campfire (store.activeCraftingStation.type === "cooking").
 *
 * Spec §7.3 (Campfire Cooking), §22 (Crafting)
 */

import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/text";
import { ACCENT, DARK, FONTS, HUD_PANEL, RADIUS, SPACE, TYPE } from "@/components/ui/tokens";
import { useGameStore } from "@/game/stores";
import {
  canCook,
  deductIngredients,
  getCookingRecipeById,
  startCooking,
} from "@/game/systems/cooking";
import { showToast } from "@/game/ui/Toast";
import {
  buildAllRecipeDisplays,
  formatCookingTime,
  formatRecipeEffect,
  type RecipeDisplay,
} from "./cookingPanelLogic.ts";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CookingPanelProps {
  open: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CookingPanel({ open, onClose }: CookingPanelProps) {
  const resources = useGameStore((s) => s.resources);
  const hunger = useGameStore((s) => s.hunger);
  const maxHunger = useGameStore((s) => s.maxHunger);
  const hearts = useGameStore((s) => s.hearts);
  const maxHearts = useGameStore((s) => s.maxHearts);
  const setHunger = useGameStore((s) => s.setHunger);
  const setHearts = useGameStore((s) => s.setHearts);

  if (!open) return null;

  // Build inventory map from resources (cast to Record<string, number> for
  // compatibility with CookingRecipe cropId keys).
  const inventory = resources as unknown as Record<string, number>;
  const recipeDisplays = buildAllRecipeDisplays(inventory);

  const handleCook = (recipeId: string) => {
    const recipe = getCookingRecipeById(recipeId);
    if (!recipe) return;
    if (!canCook(recipe, inventory)) {
      showToast("Missing ingredients!", "error");
      return;
    }

    // Deduct ingredients (for now we apply immediately rather than waiting
    // for the cooking timer -- timer-based cooking will be wired via the
    // game loop's advanceCooking tick once ECS campfire cooking slots are
    // connected to the CookingPanel).
    deductIngredients(recipe, inventory);

    // Start the cooking state (creates a CookingSlotState for future use)
    startCooking(recipe);

    // Apply food effects immediately (instant campfire cooking MVP)
    const newHunger = Math.min(maxHunger, hunger + recipe.output.saturation);
    const newHearts = Math.min(maxHearts, hearts + recipe.output.healing);
    setHunger(newHunger);
    setHearts(newHearts);

    showToast(`Cooked ${recipe.name}!`, "success");
  };

  return (
    <View style={StyleSheet.absoluteFillObject} className="items-center justify-center px-4">
      {/* Backdrop */}
      <Pressable
        style={StyleSheet.absoluteFillObject}
        className="bg-black/50"
        onPress={onClose}
        accessibilityLabel="Close cooking panel"
      />

      {/* Panel */}
      <View style={styles.panel} testID="cooking-panel">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Campfire Cooking</Text>
          <Pressable style={styles.closeButton} onPress={onClose} accessibilityLabel="Close">
            <Text style={styles.closeText}>X</Text>
          </Pressable>
        </View>

        {/* Recipe list */}
        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
          {recipeDisplays.map((recipe) => (
            <RecipeRow key={recipe.id} recipe={recipe} onCook={handleCook} />
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// RecipeRow sub-component
// ---------------------------------------------------------------------------

function RecipeRow({
  recipe,
  onCook,
}: {
  recipe: RecipeDisplay;
  onCook: (recipeId: string) => void;
}) {
  const effectText = formatRecipeEffect(recipe.saturation, recipe.healing);
  const timeText = formatCookingTime(recipe.cookingTimeSec);

  return (
    <View style={[styles.recipeRow, !recipe.canCook && styles.recipeRowDisabled]}>
      {/* Name + time */}
      <View style={styles.recipeHeader}>
        <Text style={styles.recipeName}>{recipe.name}</Text>
        <Text style={styles.recipeTime}>{timeText}</Text>
      </View>

      {/* Ingredients */}
      <View style={styles.ingredientRow}>
        {recipe.ingredients.map((ing) => (
          <Text
            key={ing.cropId}
            style={[styles.ingredientText, !ing.sufficient && styles.ingredientInsufficient]}
          >
            {ing.name} {ing.owned}/{ing.needed}
          </Text>
        ))}
      </View>

      {/* Effect + Cook button */}
      <View style={styles.recipeFooter}>
        <Text style={styles.effectText}>{effectText}</Text>
        <Pressable
          style={[styles.cookButton, !recipe.canCook && styles.cookButtonDisabled]}
          onPress={() => onCook(recipe.id)}
          disabled={!recipe.canCook}
          accessibilityLabel={`Cook ${recipe.name}`}
        >
          <Text style={[styles.cookButtonText, !recipe.canCook && styles.cookButtonTextDisabled]}>
            Cook
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  panel: {
    ...HUD_PANEL,
    backgroundColor: "rgba(26, 58, 30, 0.92)",
    borderColor: DARK.borderBranch,
    borderWidth: 1,
    borderRadius: RADIUS.organic,
    width: "100%",
    maxWidth: 380,
    maxHeight: "80%",
    zIndex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACE[3],
    paddingVertical: SPACE[2],
    borderBottomWidth: 1,
    borderBottomColor: DARK.borderBranch,
  },
  title: {
    ...TYPE.display,
    fontFamily: FONTS.heading,
    color: DARK.textPrimary,
  },
  closeButton: {
    minHeight: 44,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    ...TYPE.heading,
    color: DARK.textSecondary,
  },
  scrollArea: {
    flexGrow: 0,
  },
  scrollContent: {
    padding: SPACE[2],
    gap: SPACE[2],
  },
  recipeRow: {
    backgroundColor: "rgba(13, 31, 15, 0.6)",
    borderWidth: 1,
    borderColor: DARK.borderBranch,
    borderRadius: RADIUS.organic,
    padding: SPACE[2],
  },
  recipeRowDisabled: {
    opacity: 0.5,
  },
  recipeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACE[1],
  },
  recipeName: {
    ...TYPE.heading,
    color: DARK.textPrimary,
  },
  recipeTime: {
    ...TYPE.caption,
    color: DARK.textMuted,
  },
  ingredientRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACE[2],
    marginBottom: SPACE[1],
  },
  ingredientText: {
    ...TYPE.label,
    color: ACCENT.sap,
  },
  ingredientInsufficient: {
    color: ACCENT.ember,
  },
  recipeFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  effectText: {
    ...TYPE.caption,
    color: ACCENT.amber,
    flex: 1,
  },
  cookButton: {
    backgroundColor: ACCENT.sap,
    borderRadius: RADIUS.organic,
    paddingHorizontal: SPACE[3],
    paddingVertical: SPACE[1],
    minHeight: 44,
    minWidth: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  cookButtonDisabled: {
    backgroundColor: DARK.surfaceStone,
  },
  cookButtonText: {
    ...TYPE.label,
    fontWeight: "700",
    color: DARK.bgDeep,
  },
  cookButtonTextDisabled: {
    color: DARK.textMuted,
  },
});
