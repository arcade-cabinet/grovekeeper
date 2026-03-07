import lootConfig from "@/config/game/loot.json" with { type: "json" };
import enemiesConfig from "@/config/game/enemies.json" with { type: "json" };
import type { LootDropComponent } from "@/game/ecs/components/combat";
import { scopedRNG } from "@/game/utils/seedWords";

const { tables, despawnTimerSeconds } = lootConfig;
const { tierScaling } = enemiesConfig;

export interface LootRoll {
  type: string;
  amount: number;
}

export function rollLoot(
  lootTableId: string,
  tier: number,
  rng: () => number,
): LootRoll[] {
  const table = tables[lootTableId as keyof typeof tables];
  if (!table) return [];

  const tierBonus = tierScaling.lootBonusPerTier ** (tier - 1);
  const results: LootRoll[] = [];

  for (const drop of table.drops) {
    if (rng() <= drop.chance) {
      const baseAmount =
        drop.min + Math.floor(rng() * (drop.max - drop.min + 1));
      results.push({
        type: drop.resource,
        amount: Math.round(baseAmount * tierBonus),
      });
    }
  }

  if (table.rareDrop && rng() <= table.rareDrop.chance) {
    const baseAmount =
      table.rareDrop.min +
      Math.floor(rng() * (table.rareDrop.max - table.rareDrop.min + 1));
    results.push({
      type: table.rareDrop.resource,
      amount: Math.round(baseAmount * tierBonus),
    });
  }

  return results;
}

export function createLootDrop(rolls: LootRoll[]): LootDropComponent {
  return {
    resources: rolls.map((r) => ({ type: r.type, amount: r.amount })),
    despawnTimer: despawnTimerSeconds,
    floatHeight: 0,
  };
}

export function updateLootDespawn(
  loot: LootDropComponent,
  dt: number,
): boolean {
  loot.despawnTimer -= dt;
  loot.floatHeight =
    Math.sin(loot.despawnTimer * lootConfig.floatBobSpeed) *
    lootConfig.floatBobAmplitude;
  return loot.despawnTimer <= 0;
}

/**
 * Roll loot for a defeated enemy using a deterministic scoped RNG.
 * Combines scopedRNG('loot', worldSeed, enemyId) with the enemy's
 * loot table and tier to produce a ready-to-spawn LootDropComponent.
 * Spec §34 — combat rewards.
 */
export function rollLootForEnemy(
  enemyId: string,
  lootTableId: string,
  tier: number,
  worldSeed: string,
): LootDropComponent {
  const rng = scopedRNG("loot", worldSeed, enemyId);
  const rolls = rollLoot(lootTableId, tier, rng);
  return createLootDrop(rolls);
}
