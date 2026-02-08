import { describe, expect, it } from "vitest";
import {
  getAllNpcTemplates,
  getDialogueNode,
  getNpcTemplate,
  isPlayerAdjacent,
} from "./NpcManager";

describe("NpcManager", () => {
  describe("getNpcTemplate", () => {
    it("returns a template for a known NPC", () => {
      const rowan = getNpcTemplate("elder-rowan");
      expect(rowan).toBeDefined();
      expect(rowan!.name).toBe("Elder Rowan");
      expect(rowan!.function).toBe("tips");
    });

    it("returns undefined for an unknown NPC", () => {
      expect(getNpcTemplate("nonexistent")).toBeUndefined();
    });

    it("returns the trading NPC with tradeConfig", () => {
      const hazel = getNpcTemplate("hazel");
      expect(hazel).toBeDefined();
      expect(hazel!.function).toBe("trading");
      expect(hazel!.tradeConfig).toBeDefined();
      expect(hazel!.tradeConfig!.bonusRates.length).toBeGreaterThan(0);
    });

    it("returns the seed merchant with seedConfig", () => {
      const blossom = getNpcTemplate("blossom");
      expect(blossom).toBeDefined();
      expect(blossom!.function).toBe("seeds");
      expect(blossom!.seedConfig).toBeDefined();
      expect(blossom!.seedConfig!.stock.length).toBeGreaterThan(0);
    });
  });

  describe("getAllNpcTemplates", () => {
    it("returns all 4 NPC templates", () => {
      const all = getAllNpcTemplates();
      expect(all.length).toBe(4);
    });
  });

  describe("getDialogueNode", () => {
    it("returns a dialogue node for a known ID", () => {
      const node = getDialogueNode("rowan-greeting");
      expect(node).toBeDefined();
      expect(node!.speaker).toBe("Elder Rowan");
      expect(node!.choices.length).toBeGreaterThan(0);
    });

    it("returns undefined for an unknown dialogue ID", () => {
      expect(getDialogueNode("fake-node")).toBeUndefined();
    });

    it("dialogue choices have valid next references or null", () => {
      const node = getDialogueNode("hazel-greeting");
      expect(node).toBeDefined();
      for (const choice of node!.choices) {
        if (choice.next !== null) {
          const nextNode = getDialogueNode(choice.next);
          expect(nextNode).toBeDefined();
        }
      }
    });
  });

  describe("isPlayerAdjacent", () => {
    it("returns true when player is on same tile as NPC", () => {
      expect(isPlayerAdjacent(5, 5, 5, 5)).toBe(true);
    });

    it("returns true when player is one tile away", () => {
      expect(isPlayerAdjacent(5, 5, 6, 5)).toBe(true);
      expect(isPlayerAdjacent(5, 5, 5, 6)).toBe(true);
      expect(isPlayerAdjacent(5, 5, 6, 6)).toBe(true);
    });

    it("returns true within 1.5 distance", () => {
      expect(isPlayerAdjacent(5, 5, 6.4, 5)).toBe(true);
    });

    it("returns false when player is too far", () => {
      expect(isPlayerAdjacent(5, 5, 7, 5)).toBe(false);
      expect(isPlayerAdjacent(5, 5, 5, 7)).toBe(false);
    });

    it("returns false when one axis exceeds 1.5", () => {
      expect(isPlayerAdjacent(5, 5, 6.6, 5)).toBe(false);
    });
  });
});
