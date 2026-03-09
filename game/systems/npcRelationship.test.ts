/**
 * NPC Relationship system tests (Spec §15).
 *
 * Tests cover all pure functions: querying relationship values,
 * tier classification, and immutable XP award operations.
 */

import {
  awardGiftXp,
  awardQuestCompletionXp,
  awardTradingXp,
  checkRelationshipCondition,
  getRelationship,
  getRelationshipLevel,
  RELATIONSHIP_CONFIG,
  setRelationship,
} from "./npcRelationship.ts";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const empty: Record<string, number> = {};
const withRowan = { "elder-rowan": 30 };
const withMultiple = { "elder-rowan": 30, hazel: 60, "npc-unknown": 0 };

// ---------------------------------------------------------------------------
// getRelationship
// ---------------------------------------------------------------------------

describe("getRelationship (Spec §15)", () => {
  it("returns 0 for an NPC with no relationship entry", () => {
    expect(getRelationship(empty, "elder-rowan")).toBe(0);
  });

  it("returns the stored value for a known NPC", () => {
    expect(getRelationship(withRowan, "elder-rowan")).toBe(30);
  });

  it("returns 0 when value is explicitly 0", () => {
    expect(getRelationship(withMultiple, "npc-unknown")).toBe(0);
  });

  it("does not mutate the input map", () => {
    const map = { "elder-rowan": 10 };
    getRelationship(map, "elder-rowan");
    expect(map).toEqual({ "elder-rowan": 10 });
  });
});

// ---------------------------------------------------------------------------
// getRelationshipLevel
// ---------------------------------------------------------------------------

describe("getRelationshipLevel (Spec §15)", () => {
  it("returns 'stranger' for values below acquaintance threshold", () => {
    expect(getRelationshipLevel(0)).toBe("stranger");
    expect(getRelationshipLevel(9)).toBe("stranger");
  });

  it("returns 'acquaintance' at the threshold", () => {
    expect(getRelationshipLevel(10)).toBe("acquaintance");
    expect(getRelationshipLevel(24)).toBe("acquaintance");
  });

  it("returns 'friendly' at the threshold", () => {
    expect(getRelationshipLevel(25)).toBe("friendly");
    expect(getRelationshipLevel(49)).toBe("friendly");
  });

  it("returns 'trusted' at the threshold", () => {
    expect(getRelationshipLevel(50)).toBe("trusted");
    expect(getRelationshipLevel(74)).toBe("trusted");
  });

  it("returns 'beloved' at the threshold", () => {
    expect(getRelationshipLevel(75)).toBe("beloved");
    expect(getRelationshipLevel(100)).toBe("beloved");
  });

  it("uses thresholds from the config (not hardcoded)", () => {
    const { levelThresholds } = RELATIONSHIP_CONFIG;
    expect(getRelationshipLevel(levelThresholds.acquaintance)).toBe("acquaintance");
    expect(getRelationshipLevel(levelThresholds.friendly)).toBe("friendly");
    expect(getRelationshipLevel(levelThresholds.trusted)).toBe("trusted");
    expect(getRelationshipLevel(levelThresholds.beloved)).toBe("beloved");
  });
});

// ---------------------------------------------------------------------------
// checkRelationshipCondition
// ---------------------------------------------------------------------------

describe("checkRelationshipCondition (Spec §15)", () => {
  it("returns true when NPC relationship meets the minimum", () => {
    expect(checkRelationshipCondition(withRowan, "elder-rowan", 30)).toBe(true);
  });

  it("returns true when NPC relationship exceeds the minimum", () => {
    expect(checkRelationshipCondition(withRowan, "elder-rowan", 10)).toBe(true);
  });

  it("returns false when NPC relationship is below the minimum", () => {
    expect(checkRelationshipCondition(withRowan, "elder-rowan", 31)).toBe(false);
  });

  it("returns false for unknown NPC (defaults to 0) with non-zero threshold", () => {
    expect(checkRelationshipCondition(empty, "stranger-npc", 1)).toBe(false);
  });

  it("returns true for threshold of 0 even for unknown NPC", () => {
    expect(checkRelationshipCondition(empty, "stranger-npc", 0)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// awardTradingXp (immutability + gain)
// ---------------------------------------------------------------------------

describe("awardTradingXp (Spec §15)", () => {
  it("increases relationship by tradingXp amount", () => {
    const result = awardTradingXp(empty, "elder-rowan");
    expect(result["elder-rowan"]).toBe(RELATIONSHIP_CONFIG.tradingXp);
  });

  it("accumulates on existing relationship", () => {
    const result = awardTradingXp(withRowan, "elder-rowan");
    expect(result["elder-rowan"]).toBe(30 + RELATIONSHIP_CONFIG.tradingXp);
  });

  it("does not mutate the original map", () => {
    const map = { "elder-rowan": 30 };
    awardTradingXp(map, "elder-rowan");
    expect(map["elder-rowan"]).toBe(30);
  });

  it("does not affect other NPCs in the map", () => {
    const result = awardTradingXp(withMultiple, "elder-rowan");
    expect(result.hazel).toBe(60);
  });

  it("clamps at maxRelationship", () => {
    const nearMax = { npc: 99 };
    const result = awardTradingXp(nearMax, "npc");
    expect(result.npc).toBe(RELATIONSHIP_CONFIG.maxRelationship);
  });
});

// ---------------------------------------------------------------------------
// awardQuestCompletionXp
// ---------------------------------------------------------------------------

describe("awardQuestCompletionXp (Spec §15)", () => {
  it("increases relationship by questCompletionXp amount", () => {
    const result = awardQuestCompletionXp(empty, "hazel");
    expect(result.hazel).toBe(RELATIONSHIP_CONFIG.questCompletionXp);
  });

  it("gives more XP than a single trade (quest > trade)", () => {
    expect(RELATIONSHIP_CONFIG.questCompletionXp).toBeGreaterThan(RELATIONSHIP_CONFIG.tradingXp);
  });

  it("clamps at maxRelationship", () => {
    const nearMax = { npc: 95 };
    const result = awardQuestCompletionXp(nearMax, "npc");
    expect(result.npc).toBe(RELATIONSHIP_CONFIG.maxRelationship);
  });

  it("does not mutate the original map", () => {
    const map = { hazel: 15 };
    awardQuestCompletionXp(map, "hazel");
    expect(map.hazel).toBe(15);
  });
});

// ---------------------------------------------------------------------------
// awardGiftXp
// ---------------------------------------------------------------------------

describe("awardGiftXp (Spec §15)", () => {
  it("increases relationship by giftXp with default multiplier 1.0", () => {
    const result = awardGiftXp(empty, "hazel");
    expect(result.hazel).toBe(RELATIONSHIP_CONFIG.giftXp);
  });

  it("scales XP by the giftMultiplier", () => {
    const result = awardGiftXp(empty, "hazel", 2.0);
    expect(result.hazel).toBe(RELATIONSHIP_CONFIG.giftXp * 2);
  });

  it("rounds the scaled XP to a whole number", () => {
    const result = awardGiftXp(empty, "hazel", 1.5);
    expect(Number.isInteger(result.hazel)).toBe(true);
  });

  it("clamps at maxRelationship", () => {
    const nearMax = { npc: 98 };
    const result = awardGiftXp(nearMax, "npc", 3.0);
    expect(result.npc).toBe(RELATIONSHIP_CONFIG.maxRelationship);
  });

  it("does not mutate the original map", () => {
    const map = { hazel: 10 };
    awardGiftXp(map, "hazel", 1.0);
    expect(map.hazel).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// setRelationship
// ---------------------------------------------------------------------------

describe("setRelationship (Spec §15)", () => {
  it("sets the relationship to the given value", () => {
    const result = setRelationship(empty, "elder-rowan", 50);
    expect(result["elder-rowan"]).toBe(50);
  });

  it("overwrites an existing value", () => {
    const result = setRelationship(withRowan, "elder-rowan", 5);
    expect(result["elder-rowan"]).toBe(5);
  });

  it("clamps above maxRelationship", () => {
    const result = setRelationship(empty, "npc", 999);
    expect(result.npc).toBe(RELATIONSHIP_CONFIG.maxRelationship);
  });

  it("clamps below 0", () => {
    const result = setRelationship(empty, "npc", -10);
    expect(result.npc).toBe(0);
  });

  it("does not mutate the original map", () => {
    const map = { "elder-rowan": 30 };
    setRelationship(map, "elder-rowan", 5);
    expect(map["elder-rowan"]).toBe(30);
  });
});
