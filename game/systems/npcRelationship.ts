/**
 * NPC Relationship system (Spec §15, §33.4).
 *
 * Tracks trust/friendship levels per NPC. Relationships increase through:
 *  - Trading with the NPC
 *  - Completing quests assigned by the NPC
 *  - Giving gifts to the NPC
 *
 * Relationship levels gate dialogue options (see evaluateCondition in
 * dialogueBranch.ts, condition type "has_relationship").
 *
 * Relationships persist across sessions via gameStore.npcRelationships.
 *
 * Pure functions -- no ECS, R3F, or store imports.
 */

import relationshipsConfig from "@/config/game/relationships.json" with { type: "json" };

export type RelationshipLevel =
  | "stranger"
  | "acquaintance"
  | "friendly"
  | "trusted"
  | "beloved";

export interface RelationshipConfig {
  tradingXp: number;
  questCompletionXp: number;
  giftXp: number;
  maxRelationship: number;
  levelThresholds: Record<RelationshipLevel, number>;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const CONFIG = relationshipsConfig as RelationshipConfig;

function clampRelationship(value: number): number {
  return Math.min(Math.max(0, value), CONFIG.maxRelationship);
}

function applyXp(
  npcRelationships: Record<string, number>,
  npcId: string,
  xp: number,
): Record<string, number> {
  const current = npcRelationships[npcId] ?? 0;
  return {
    ...npcRelationships,
    [npcId]: clampRelationship(current + xp),
  };
}

// ---------------------------------------------------------------------------
// Read-only queries
// ---------------------------------------------------------------------------

/**
 * Get the raw relationship value (0-100) for an NPC.
 * Returns 0 if no relationship has been established yet.
 */
export function getRelationship(
  npcRelationships: Record<string, number>,
  npcId: string,
): number {
  return npcRelationships[npcId] ?? 0;
}

/**
 * Get the named relationship tier for a given raw value.
 *
 * Tiers (from relationships.json):
 *  - stranger:      0
 *  - acquaintance: 10
 *  - friendly:     25
 *  - trusted:      50
 *  - beloved:      75
 */
export function getRelationshipLevel(value: number): RelationshipLevel {
  const t = CONFIG.levelThresholds;
  if (value >= t.beloved) return "beloved";
  if (value >= t.trusted) return "trusted";
  if (value >= t.friendly) return "friendly";
  if (value >= t.acquaintance) return "acquaintance";
  return "stranger";
}

/**
 * Check if an NPC's relationship meets or exceeds a minimum value.
 * Used for dialogue condition gating.
 */
export function checkRelationshipCondition(
  npcRelationships: Record<string, number>,
  npcId: string,
  minValue: number,
): boolean {
  return getRelationship(npcRelationships, npcId) >= minValue;
}

// ---------------------------------------------------------------------------
// Relationship gains (immutable -- returns new state)
// ---------------------------------------------------------------------------

/**
 * Award trading XP to an NPC's relationship.
 * Called when the player completes a trade with this NPC.
 */
export function awardTradingXp(
  npcRelationships: Record<string, number>,
  npcId: string,
): Record<string, number> {
  return applyXp(npcRelationships, npcId, CONFIG.tradingXp);
}

/**
 * Award quest completion XP to an NPC's relationship.
 * Called when the player completes a quest given by this NPC.
 */
export function awardQuestCompletionXp(
  npcRelationships: Record<string, number>,
  npcId: string,
): Record<string, number> {
  return applyXp(npcRelationships, npcId, CONFIG.questCompletionXp);
}

/**
 * Award gift XP to an NPC's relationship.
 * Called when the player gives a gift to this NPC.
 *
 * @param giftMultiplier - Scale factor for special gifts (default 1.0).
 *   A rare gift might pass 2.0; a favourite item might pass 3.0.
 */
export function awardGiftXp(
  npcRelationships: Record<string, number>,
  npcId: string,
  giftMultiplier: number = 1.0,
): Record<string, number> {
  const xp = Math.round(CONFIG.giftXp * giftMultiplier);
  return applyXp(npcRelationships, npcId, xp);
}

/**
 * Set relationship to a specific value (used by "set_relationship" dialogue effect).
 * Value is clamped to [0, maxRelationship].
 */
export function setRelationship(
  npcRelationships: Record<string, number>,
  npcId: string,
  value: number,
): Record<string, number> {
  return { ...npcRelationships, [npcId]: clampRelationship(value) };
}

// ---------------------------------------------------------------------------
// Config export (for consumers that need raw thresholds)
// ---------------------------------------------------------------------------

export { CONFIG as RELATIONSHIP_CONFIG };
