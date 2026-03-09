/** Enemy entity component */
export interface EnemyComponent {
  enemyType: string;
  tier: number;
  behavior: "patrol" | "guard" | "swarm" | "ambush";
  aggroRange: number;
  deaggroRange: number;
  attackPower: number;
  attackCooldown: number;
  lootTableId: string;
}

/** Health for any damageable entity (player, enemies, structures) */
export interface HealthComponent {
  current: number;
  max: number;
  invulnFrames: number;
  lastDamageSource: string | null;
}

/** Combat capability for player and melee NPCs */
export interface CombatComponent {
  attackPower: number;
  defense: number;
  attackRange: number;
  attackCooldown: number;
  cooldownRemaining: number;
  blocking: boolean;
}

/** Dropped loot after enemy death */
export interface LootDropComponent {
  resources: { type: string; amount: number }[];
  despawnTimer: number;
  floatHeight: number;
}
