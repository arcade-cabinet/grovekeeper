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

import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/text";
import { ACCENT, FONTS, LIGHT, RADIUS, SPACE } from "@/components/ui/tokens";
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
import { getIngredientEmoji, sharedStyles } from "./craftingPanelShared.ts";

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

  const inventory = resources as unknown as Record<string, number>;
  const recipeDisplays = buildAllRecipeDisplays(inventory);

  const handleCook = (recipeId: string) => {
    const recipe = getCookingRecipeById(recipeId);
    if (!recipe) return;
    if (!canCook(recipe, inventory)) {
      showToast("Missing ingredients!", "error");
      return;
    }

    deductIngredients(recipe, inventory);
    startCooking(recipe);

    const newHunger = Math.min(maxHunger, hunger + recipe.output.saturation);
    const newHearts = Math.min(maxHearts, hearts + recipe.output.healing);
    setHunger(newHunger);
    setHearts(newHearts);

    showToast(`Cooked ${recipe.name}!`, "success");
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={sharedStyles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={onClose}
          accessibilityLabel="Close cooking panel"
        />

        <View style={sharedStyles.panel} testID="cooking-panel">
          {/* Header */}
          <View style={sharedStyles.header}>
            <View style={styles.titleRow}>
              <Text style={sharedStyles.titleIcon}>{"\uD83C\uDF73"}</Text>
              <Text style={sharedStyles.title}>Campfire Cooking</Text>
            </View>
            <Pressable
              style={sharedStyles.closeButton}
              onPress={onClose}
              accessibilityLabel="Close"
            >
              <Text style={sharedStyles.closeText}>{"\u2715"}</Text>
            </Pressable>
          </View>

          {/* Recipe list */}
          <ScrollView
            style={sharedStyles.scrollArea}
            contentContainerStyle={sharedStyles.scrollContent}
          >
            {recipeDisplays.map((recipe) => (
              <RecipeRow key={recipe.id} recipe={recipe} onCook={handleCook} />
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
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
    <View style={[sharedStyles.card, !recipe.canCook && sharedStyles.cardDisabled]}>
      {/* Name + time */}
      <View style={sharedStyles.cardHeader}>
        <Text style={sharedStyles.cardName}>{recipe.name}</Text>
        <Text style={sharedStyles.cardTime}>{timeText}</Text>
      </View>

      {/* Ingredients as chips */}
      <View style={sharedStyles.ingredientRow}>
        {recipe.ingredients.map((ing) => (
          <View
            key={ing.cropId}
            style={[
              sharedStyles.ingredientChip,
              !ing.sufficient && sharedStyles.ingredientChipInsufficient,
            ]}
          >
            <Text style={sharedStyles.ingredientEmoji}>{getIngredientEmoji(ing.cropId)}</Text>
            <Text
              style={[
                sharedStyles.ingredientText,
                !ing.sufficient && sharedStyles.ingredientTextInsufficient,
              ]}
            >
              {ing.owned}/{ing.needed}
            </Text>
          </View>
        ))}
      </View>

      {/* Effect + Cook button */}
      <View style={styles.recipeFooter}>
        <Text style={sharedStyles.effectText}>{effectText}</Text>
        <Pressable
          style={[styles.cookButton, !recipe.canCook && sharedStyles.actionButtonDisabled]}
          onPress={() => onCook(recipe.id)}
          disabled={!recipe.canCook}
          accessibilityLabel={`Cook ${recipe.name}`}
        >
          <Text
            style={[
              sharedStyles.actionButtonText,
              !recipe.canCook && sharedStyles.actionButtonTextDisabled,
            ]}
          >
            Cook
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Local styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  recipeFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: SPACE[0],
  },
  cookButton: {
    ...sharedStyles.actionButton,
    backgroundColor: ACCENT.sap,
    paddingHorizontal: SPACE[3],
    minWidth: 72,
  },
});
