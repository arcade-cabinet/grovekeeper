/**
 * tickCombatDeaths -- detects defeated enemies and spawns loot drops.
 * Runs every frame as part of the combat pipeline. Spec ss34.
 */
import type { ResourceType } from "@/game/config/resources";
import { enemiesQuery, world } from "@/game/ecs/world";
import { useGameStore } from "@/game/stores";
import { isDefeated } from "@/game/systems/combat";
import { rollLootForEnemy } from "@/game/systems/lootSystem";

/** Entities pending removal (collected after iteration to avoid mutation during loop). */
const pendingRemoval: string[] = [];

/**
 * Scan all enemy entities for defeated enemies, roll loot, credit resources,
 * and remove the entity from ECS.
 */
export function tickCombatDeaths(_dt: number): void {
  pendingRemoval.length = 0;

  for (const entity of enemiesQuery) {
    if (!entity.health || !entity.enemy) continue;

    if (!isDefeated(entity.health)) continue;

    // Roll loot for the defeated enemy
    const store = useGameStore.getState();
    const lootDrop = rollLootForEnemy(
      entity.id,
      entity.enemy.lootTableId ?? "default",
      entity.enemy.tier ?? 1,
      store.worldSeed || "default",
    );

    // Credit loot directly to the player's inventory
    for (const resource of lootDrop.resources) {
      store.addResource(resource.type as ResourceType, resource.amount);
    }

    // Grant XP for the kill (base 25 XP, scaled by tier)
    const xpReward = 25 * (entity.enemy.tier ?? 1);
    store.addXp(xpReward);

    pendingRemoval.push(entity.id);
  }

  // Remove defeated enemies outside the query iteration
  for (const id of pendingRemoval) {
    const entity = [...enemiesQuery].find((e) => e.id === id);
    if (entity) {
      world.remove(entity);
    }
  }
}
