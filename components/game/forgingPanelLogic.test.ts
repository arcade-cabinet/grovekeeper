/**
 * ForgingPanel logic tests (Spec §22.2)
 *
 * Covers:
 * - buildSmeltRows: recipe display data, affordability checks
 * - buildUpgradeRows: tool upgrade path display, cost checking
 * - tierNumToTier: numeric-to-union mapping
 * - formatSmeltTime: duration formatting
 */

import {
  buildSmeltRows,
  buildUpgradeRows,
  formatSmeltTime,
  tierNumToTier,
} from "./forgingPanelLogic.ts";

// ---------------------------------------------------------------------------
// buildSmeltRows
// ---------------------------------------------------------------------------

describe("buildSmeltRows (Spec §22.2)", () => {
  it("returns a row for every smelt recipe", () => {
    const rows = buildSmeltRows({});
    expect(rows.length).toBeGreaterThanOrEqual(3);
    const ids = rows.map((r) => r.recipe.id);
    expect(ids).toContain("iron-ingot");
    expect(ids).toContain("charcoal");
    expect(ids).toContain("cut-stone");
  });

  it("marks iron-ingot affordable when inventory has enough ore and timber", () => {
    const rows = buildSmeltRows({ ore: 5, timber: 3 });
    const ironRow = rows.find((r) => r.recipe.id === "iron-ingot")!;
    expect(ironRow.canAfford).toBe(true);
    expect(ironRow.inputRows.every((i) => i.enough)).toBe(true);
  });

  it("marks iron-ingot unaffordable when ore is insufficient", () => {
    const rows = buildSmeltRows({ ore: 1, timber: 3 });
    const ironRow = rows.find((r) => r.recipe.id === "iron-ingot")!;
    expect(ironRow.canAfford).toBe(false);
    const oreInput = ironRow.inputRows.find((i) => i.label === "Ore")!;
    expect(oreInput.enough).toBe(false);
    expect(oreInput.have).toBe(1);
    expect(oreInput.amount).toBe(3);
  });

  it("marks all recipes unaffordable with empty inventory", () => {
    const rows = buildSmeltRows({});
    expect(rows.every((r) => !r.canAfford)).toBe(true);
  });

  it("includes correct output label for charcoal", () => {
    const rows = buildSmeltRows({});
    const charcoalRow = rows.find((r) => r.recipe.id === "charcoal")!;
    expect(charcoalRow.outputLabel).toBe("2x Charcoal");
  });

  it("includes smelt time for each recipe", () => {
    const rows = buildSmeltRows({});
    for (const row of rows) {
      expect(row.timeSec).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// buildUpgradeRows
// ---------------------------------------------------------------------------

describe("buildUpgradeRows (Spec §22.2)", () => {
  it("returns a row for each upgradeable tool", () => {
    const rows = buildUpgradeRows({}, {});
    expect(rows.length).toBeGreaterThan(0);
    // Every tool with durability should be present
    const toolNames = rows.map((r) => r.toolName);
    expect(toolNames).toContain("Trowel");
    expect(toolNames).toContain("Axe");
  });

  it("shows basic tier for tools with no upgrades", () => {
    const rows = buildUpgradeRows({}, {});
    for (const row of rows) {
      expect(row.currentTier).toBe("basic");
      expect(row.currentTierLabel).toBe("Basic");
    }
  });

  it("shows iron tier when tool has 1 upgrade", () => {
    const rows = buildUpgradeRows({ axe: 1 }, {});
    const axeRow = rows.find((r) => r.toolId === "axe")!;
    expect(axeRow.currentTier).toBe("iron");
    expect(axeRow.currentTierLabel).toBe("Iron");
    expect(axeRow.nextTierLabel).toBe("Grovekeeper");
  });

  it("shows max tier with no further upgrade when at grovekeeper", () => {
    const rows = buildUpgradeRows({ axe: 2 }, {});
    const axeRow = rows.find((r) => r.toolId === "axe")!;
    expect(axeRow.currentTier).toBe("grovekeeper");
    expect(axeRow.upgrade).toBeNull();
    expect(axeRow.nextTierLabel).toBeNull();
    expect(axeRow.costRows).toHaveLength(0);
  });

  it("marks upgrade affordable when inventory has enough iron ingots", () => {
    const rows = buildUpgradeRows({}, { "iron-ingot": 5 });
    const trowelRow = rows.find((r) => r.toolId === "trowel")!;
    expect(trowelRow.canAfford).toBe(true);
  });

  it("marks upgrade unaffordable when inventory is short", () => {
    const rows = buildUpgradeRows({}, { "iron-ingot": 1 });
    const trowelRow = rows.find((r) => r.toolId === "trowel")!;
    expect(trowelRow.canAfford).toBe(false);
    expect(trowelRow.costRows.some((c) => !c.enough)).toBe(true);
  });

  it("provides cost rows with have/amount for each resource", () => {
    const rows = buildUpgradeRows({}, { "iron-ingot": 2 });
    const row = rows.find((r) => r.toolId === "axe")!;
    expect(row.costRows.length).toBeGreaterThan(0);
    const ingotCost = row.costRows.find((c) => c.label === "Iron ingot")!;
    expect(ingotCost.amount).toBe(3);
    expect(ingotCost.have).toBe(2);
    expect(ingotCost.enough).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// tierNumToTier
// ---------------------------------------------------------------------------

describe("tierNumToTier (Spec §22.2)", () => {
  it("maps 0 to basic", () => {
    expect(tierNumToTier(0)).toBe("basic");
  });

  it("maps negative to basic", () => {
    expect(tierNumToTier(-1)).toBe("basic");
  });

  it("maps 1 to iron", () => {
    expect(tierNumToTier(1)).toBe("iron");
  });

  it("maps 2 to grovekeeper", () => {
    expect(tierNumToTier(2)).toBe("grovekeeper");
  });

  it("maps 3+ to grovekeeper", () => {
    expect(tierNumToTier(5)).toBe("grovekeeper");
  });
});

// ---------------------------------------------------------------------------
// formatSmeltTime
// ---------------------------------------------------------------------------

describe("formatSmeltTime (Spec §22.2)", () => {
  it("formats seconds under 60 as Ns", () => {
    expect(formatSmeltTime(20)).toBe("20s");
  });

  it("formats exactly 60 seconds as 1m", () => {
    expect(formatSmeltTime(60)).toBe("1m");
  });

  it("formats 90 seconds as 1m 30s", () => {
    expect(formatSmeltTime(90)).toBe("1m 30s");
  });

  it("formats 0 seconds as 0s", () => {
    expect(formatSmeltTime(0)).toBe("0s");
  });
});
