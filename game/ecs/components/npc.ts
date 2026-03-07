/**
 * NPC ECS components for 3DPSX ChibiCharacter GLB models.
 *
 * NPCs are assembled from a base character model + optional item attachments.
 * Appearance is seeded deterministically via scopedRNG.
 * Animation uses anime.js rigid-body rotation (Lego-style, no skeletal rigs).
 */

export type NpcFunction =
  | "trading"
  | "quests"
  | "tips"
  | "seeds"
  | "crafting"
  | "lore";

export type NpcItemSlot = "head" | "torso" | "legs" | "feet" | "accessory";

export type NpcPersonalityType =
  | "cheerful"
  | "grumpy"
  | "wise"
  | "shy"
  | "bold"
  | "curious"
  | "stoic"
  | "playful"
  | "stern"
  | "gentle";

export type NpcAnimState = "idle" | "walk" | "talk" | "work" | "sleep";

/** NPC schedule entry for daily routines. */
export interface NpcScheduleEntry {
  hour: number;
  activity: string;
  position: { x: number; z: number };
}

/** NPC component — function, appearance, personality, animation all in one. */
export interface NpcComponent {
  templateId: string;
  function: NpcFunction;
  interactable: boolean;
  requiredLevel: number;

  // Appearance (ChibiCharacter GLB assembly)
  baseModel: string;
  useEmission: boolean;
  items: Partial<Record<NpcItemSlot, string>>;
  colorPalette: string;

  // Personality
  name: string;
  personality: NpcPersonalityType;
  dialogue: string;
  schedule: NpcScheduleEntry[];

  // Animation state (anime.js rigid-body rotation)
  currentAnim: NpcAnimState;
  animProgress: number;
  animSpeed: number;
}
