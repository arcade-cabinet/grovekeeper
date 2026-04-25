/**
 * Known-recipes repository — idempotent learn / list / check.
 *
 * Spec calls for recipes to be unlocked diegetically (e.g. via the
 * Grove Spirit's introduction at the workbench). Re-learning is a
 * no-op so the gameplay layer can fire `learnRecipe` defensively
 * without worrying about double-fires.
 */
import { and, eq } from "drizzle-orm";
import type { AppDatabase } from "@/db/client";
import { type KnownRecipe, knownRecipes } from "@/db/schema/rc";

export function learnRecipe(
  db: AppDatabase,
  worldId: string,
  recipeId: string,
  at: number = Date.now(),
): KnownRecipe {
  const existing = db
    .select()
    .from(knownRecipes)
    .where(
      and(
        eq(knownRecipes.worldId, worldId),
        eq(knownRecipes.recipeId, recipeId),
      ),
    )
    .all()[0];
  if (existing) return existing;

  db.insert(knownRecipes).values({ worldId, recipeId, learnedAt: at }).run();
  return { worldId, recipeId, learnedAt: at };
}

export function isKnown(
  db: AppDatabase,
  worldId: string,
  recipeId: string,
): boolean {
  const rows = db
    .select()
    .from(knownRecipes)
    .where(
      and(
        eq(knownRecipes.worldId, worldId),
        eq(knownRecipes.recipeId, recipeId),
      ),
    )
    .all();
  return rows.length > 0;
}

export function listKnownRecipes(
  db: AppDatabase,
  worldId: string,
): KnownRecipe[] {
  return db
    .select()
    .from(knownRecipes)
    .where(eq(knownRecipes.worldId, worldId))
    .all();
}

export function forgetRecipe(
  db: AppDatabase,
  worldId: string,
  recipeId: string,
): void {
  db.delete(knownRecipes)
    .where(
      and(
        eq(knownRecipes.worldId, worldId),
        eq(knownRecipes.recipeId, recipeId),
      ),
    )
    .run();
}
