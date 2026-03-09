/**
 * Item ECS components: food, tools with durability, and traps.
 */

/** Food item — raw or cooked, provides saturation/healing. */
export interface FoodComponent {
  foodId: string;
  name: string;
  raw: boolean;
  saturation: number;
  healing: number;
  modelPath: string;
}

export type ToolTier = "basic" | "iron" | "grovekeeper";

/** Tool with durability and upgrade tiers. */
export interface ToolComponent {
  toolId: string;
  tier: ToolTier;
  durability: number;
  maxDurability: number;
  staminaCost: number;
  effectPower: number;
  modelPath: string;
}

/** Trap for base defense (survival mode). */
export interface TrapComponent {
  trapType: string;
  damage: number;
  triggerRadius: number;
  armed: boolean;
  cooldown: number;
  modelPath: string;
}
