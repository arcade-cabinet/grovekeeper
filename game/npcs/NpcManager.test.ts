import {
  getAllNpcTemplates,
  getDialogueNode,
  getNpcTemplate,
  isPlayerAdjacent,
} from "@/game/npcs/NpcManager";

describe("NpcManager", () => {
  describe("getNpcTemplate", () => {
    it("returns a template for a valid NPC ID", () => {
      const template = getNpcTemplate("elder-rowan");
      expect(template).toBeDefined();
      expect(template!.id).toBe("elder-rowan");
      expect(template!.name).toBe("Elder Rowan");
    });

    it("returns undefined for an invalid NPC ID", () => {
      const template = getNpcTemplate("nonexistent-npc");
      expect(template).toBeUndefined();
    });

    it("returns correct function for trading NPC", () => {
      const template = getNpcTemplate("hazel");
      expect(template).toBeDefined();
      expect(template!.function).toBe("trading");
    });

    it("returns tradeConfig for trading NPC", () => {
      const template = getNpcTemplate("hazel");
      expect(template).toBeDefined();
      expect(template!.tradeConfig).toBeDefined();
      expect(template!.tradeConfig!.bonusRates.length).toBeGreaterThan(0);
    });

    it("returns seedConfig for seed merchant NPC", () => {
      const template = getNpcTemplate("blossom");
      expect(template).toBeDefined();
      expect(template!.seedConfig).toBeDefined();
      expect(template!.seedConfig!.stock.length).toBeGreaterThan(0);
    });

    it("returns questConfig for quest NPC", () => {
      const template = getNpcTemplate("botanist-fern");
      expect(template).toBeDefined();
      expect(template!.questConfig).toBeDefined();
      expect(template!.questConfig!.specialQuestIds).toContain("plant-5-species");
    });
  });

  describe("getAllNpcTemplates", () => {
    it("returns a non-empty array", () => {
      const templates = getAllNpcTemplates();
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
    });

    it("returns 10 NPC templates", () => {
      const templates = getAllNpcTemplates();
      expect(templates.length).toBe(10);
    });

    it("all templates have required fields", () => {
      const templates = getAllNpcTemplates();
      for (const t of templates) {
        expect(t.id).toBeDefined();
        expect(t.name).toBeDefined();
        expect(t.title).toBeDefined();
        expect(t.icon).toBeDefined();
        expect(t.function).toBeDefined();
        expect(t.appearance).toBeDefined();
        expect(typeof t.requiredLevel).toBe("number");
        expect(t.dialogue).toBeDefined();
        expect(t.dialogue.greeting).toBeDefined();
        expect(Array.isArray(t.dialogue.idle)).toBe(true);
      }
    });
  });

  describe("getDialogueNode", () => {
    it("returns a dialogue node for a valid ID", () => {
      const node = getDialogueNode("rowan-greeting");
      expect(node).toBeDefined();
      expect(node!.id).toBe("rowan-greeting");
      expect(node!.speaker).toBe("Elder Rowan");
    });

    it("returns undefined for an invalid dialogue ID", () => {
      const node = getDialogueNode("nonexistent-dialogue");
      expect(node).toBeUndefined();
    });

    it("dialogue node has text and choices", () => {
      const node = getDialogueNode("rowan-greeting");
      expect(node).toBeDefined();
      expect(typeof node!.text).toBe("string");
      expect(node!.text.length).toBeGreaterThan(0);
      expect(Array.isArray(node!.choices)).toBe(true);
      expect(node!.choices.length).toBeGreaterThan(0);
    });

    it("dialogue choices have labels", () => {
      const node = getDialogueNode("rowan-greeting");
      expect(node).toBeDefined();
      for (const choice of node!.choices) {
        expect(typeof choice.label).toBe("string");
        expect(choice.label.length).toBeGreaterThan(0);
      }
    });

    it("goodbye choices can have actions", () => {
      const node = getDialogueNode("rowan-greeting");
      expect(node).toBeDefined();
      const goodbyeChoice = node!.choices.find((c) => c.next === null);
      expect(goodbyeChoice).toBeDefined();
      expect(goodbyeChoice!.action).toBeDefined();
      expect(goodbyeChoice!.action!.type).toBe("xp");
    });
  });

  describe("isPlayerAdjacent", () => {
    it("returns true when player is directly adjacent (1 tile away)", () => {
      expect(isPlayerAdjacent(5, 5, 6, 5)).toBe(true);
      expect(isPlayerAdjacent(5, 5, 4, 5)).toBe(true);
      expect(isPlayerAdjacent(5, 5, 5, 6)).toBe(true);
      expect(isPlayerAdjacent(5, 5, 5, 4)).toBe(true);
    });

    it("returns true for diagonal adjacency", () => {
      expect(isPlayerAdjacent(5, 5, 6, 6)).toBe(true);
      expect(isPlayerAdjacent(5, 5, 4, 4)).toBe(true);
      expect(isPlayerAdjacent(5, 5, 6, 4)).toBe(true);
      expect(isPlayerAdjacent(5, 5, 4, 6)).toBe(true);
    });

    it("returns true when player is at exact same position", () => {
      expect(isPlayerAdjacent(5, 5, 5, 5)).toBe(true);
    });

    it("returns false when player is far away", () => {
      expect(isPlayerAdjacent(0, 0, 10, 10)).toBe(false);
      expect(isPlayerAdjacent(0, 0, 3, 0)).toBe(false);
    });

    it("returns false when exactly 2 tiles away on one axis", () => {
      expect(isPlayerAdjacent(5, 5, 7, 5)).toBe(false);
      expect(isPlayerAdjacent(5, 5, 5, 7)).toBe(false);
    });

    it("returns true at boundary distance of 1.5", () => {
      expect(isPlayerAdjacent(0, 0, 1.5, 0)).toBe(true);
      expect(isPlayerAdjacent(0, 0, 0, 1.5)).toBe(true);
      expect(isPlayerAdjacent(0, 0, 1.5, 1.5)).toBe(true);
    });

    it("returns false just beyond 1.5 distance", () => {
      expect(isPlayerAdjacent(0, 0, 1.6, 0)).toBe(false);
      expect(isPlayerAdjacent(0, 0, 0, 1.6)).toBe(false);
    });
  });
});
