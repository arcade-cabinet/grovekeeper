/**
 * craftingActions.test.ts
 *
 * Tests for SMELT, UPGRADE_TOOL, TRADE_BUY, and TRADE_SELL actions (Spec §22.4).
 *
 * Each test references the spec section that governs it.
 * All tests are pure logic — no R3F, Rapier, or 3D scene.
 */

import {
  dispatchSmelt,
  dispatchTradeBuy,
  dispatchTradeSell,
  dispatchUpgradeTool,
  type SmeltContext,
  type TradeBuyContext,
  type TradeSellContext,
  type UpgradeToolContext,
} from "@/game/actions/craftingActions";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("@/game/systems/AudioManager", () => ({
  audioManager: { playSound: jest.fn() },
}));

jest.mock("@/game/ui/Toast", () => ({
  showToast: jest.fn(),
}));

// Mock forgingPanelLogic for tierNumToTier (no React, no RN deps)
jest.mock("@/components/game/forgingPanelLogic", () => ({
  tierNumToTier: jest.fn((n: number) => {
    if (n <= 0) return "basic";
    if (n === 1) return "iron";
    return "grovekeeper";
  }),
}));

const mockSpendResource = jest.fn(() => true);
const mockAddResource = jest.fn();
const mockAddCoins = jest.fn();
const mockUpgradeToolTier = jest.fn(() => true);
const mockRecordMarketTrade = jest.fn();

// Default store state — overridden per test group as needed.
const makeDefaultState = () => ({
  coins: 1000,
  resources: {
    timber: 10,
    sap: 5,
    fruit: 0,
    acorns: 0,
    wood: 0,
    stone: 10,
    metal_scrap: 0,
    fiber: 0,
    ore: 10,
    berries: 0,
    herbs: 0,
    meat: 0,
    hide: 0,
    fish: 0,
    seeds: 0,
    charcoal: 5,
    "iron-ingot": 0,
    "cut-stone": 0,
    "grove-essence": 0,
  },
  toolUpgrades: { axe: 0 } as Record<string, number>,
  currentDay: 5,
  marketState: {
    tradeHistory: [],
    priceMultipliers: {
      timber: 1.0,
      sap: 1.0,
      fruit: 1.0,
      acorns: 1.0,
      wood: 1.0,
      stone: 1.0,
      metal_scrap: 1.0,
      fiber: 1.0,
      ore: 1.0,
      berries: 1.0,
      herbs: 1.0,
      meat: 1.0,
      hide: 1.0,
      fish: 1.0,
      seeds: 1.0,
    },
    lastUpdateDay: 0,
  },
  spendResource: mockSpendResource,
  addResource: mockAddResource,
  addCoins: mockAddCoins,
  upgradeToolTier: mockUpgradeToolTier,
  recordMarketTrade: mockRecordMarketTrade,
});

jest.mock("@/game/stores", () => ({
  useGameStore: {
    getState: jest.fn(),
    setState: jest.fn(),
  },
}));

import { useGameStore } from "@/game/stores";
import { audioManager } from "@/game/systems/AudioManager";
import { showToast } from "@/game/ui/Toast";

const mockGetState = useGameStore.getState as jest.Mock;
const mockPlaySound = audioManager.playSound as jest.Mock;
const mockShowToast = showToast as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetState.mockReturnValue(makeDefaultState());
  mockSpendResource.mockReturnValue(true);
  mockUpgradeToolTier.mockReturnValue(true);
});

// ---------------------------------------------------------------------------
// dispatchSmelt (Spec §22.4)
// ---------------------------------------------------------------------------

describe("dispatchSmelt (Spec §22.4)", () => {
  it("deducts inputs and adds output on success -- iron-ingot recipe", () => {
    // iron-ingot requires ore:3 + timber:1 -> 1 iron-ingot
    const ctx: SmeltContext = { recipeId: "iron-ingot" };
    const result = dispatchSmelt(ctx);

    expect(result).toBe(true);
    expect(mockSpendResource).toHaveBeenCalledWith("ore", 3);
    expect(mockSpendResource).toHaveBeenCalledWith("timber", 1);
    expect(mockAddResource).toHaveBeenCalledWith("iron-ingot", 1);
  });

  it("plays forge SFX on success", () => {
    dispatchSmelt({ recipeId: "iron-ingot" });
    expect(mockPlaySound).toHaveBeenCalledWith("forge");
  });

  it("shows a success toast with recipe name on success", () => {
    dispatchSmelt({ recipeId: "iron-ingot" });
    expect(mockShowToast).toHaveBeenCalledWith("Smelted Iron Ingot!", "success");
  });

  it("returns false and does nothing when recipe id is unknown", () => {
    const result = dispatchSmelt({ recipeId: "unknown-recipe" });
    expect(result).toBe(false);
    expect(mockSpendResource).not.toHaveBeenCalled();
    expect(mockAddResource).not.toHaveBeenCalled();
    expect(mockPlaySound).not.toHaveBeenCalled();
  });

  it("returns false when spendResource fails (insufficient inventory)", () => {
    // Simulate first spendResource call failing (insufficient ore)
    mockSpendResource.mockReturnValue(false);
    const result = dispatchSmelt({ recipeId: "iron-ingot" });
    expect(result).toBe(false);
    // No output should be credited
    expect(mockAddResource).not.toHaveBeenCalled();
    expect(mockPlaySound).not.toHaveBeenCalled();
  });

  it("handles charcoal recipe (5 timber -> 2 charcoal)", () => {
    const result = dispatchSmelt({ recipeId: "charcoal" });
    expect(result).toBe(true);
    expect(mockSpendResource).toHaveBeenCalledWith("timber", 5);
    expect(mockAddResource).toHaveBeenCalledWith("charcoal", 2);
    expect(mockShowToast).toHaveBeenCalledWith("Smelted Charcoal!", "success");
  });

  it("handles cut-stone recipe (stone:4 + charcoal:1 -> 2 cut-stone)", () => {
    const result = dispatchSmelt({ recipeId: "cut-stone" });
    expect(result).toBe(true);
    expect(mockSpendResource).toHaveBeenCalledWith("stone", 4);
    expect(mockSpendResource).toHaveBeenCalledWith("charcoal", 1);
    expect(mockAddResource).toHaveBeenCalledWith("cut-stone", 2);
  });

  it("does not play SFX or toast when recipe not found", () => {
    dispatchSmelt({ recipeId: "nonexistent" });
    expect(mockPlaySound).not.toHaveBeenCalled();
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it("performs canSmelt check before any mutation", () => {
    // inventory has no ore and no timber — canSmelt should return false
    mockGetState.mockReturnValue({
      ...makeDefaultState(),
      resources: {
        ...makeDefaultState().resources,
        ore: 0,
        timber: 0,
      },
    });
    const result = dispatchSmelt({ recipeId: "iron-ingot" });
    expect(result).toBe(false);
    expect(mockSpendResource).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// dispatchUpgradeTool (Spec §22.4)
// ---------------------------------------------------------------------------

describe("dispatchUpgradeTool (Spec §22.4)", () => {
  it("calls upgradeToolTier and returns true on success", () => {
    const ctx: UpgradeToolContext = { toolId: "axe" };
    const result = dispatchUpgradeTool(ctx);
    expect(result).toBe(true);
    expect(mockUpgradeToolTier).toHaveBeenCalledWith("axe");
  });

  it("plays forge SFX on success", () => {
    dispatchUpgradeTool({ toolId: "axe" });
    expect(mockPlaySound).toHaveBeenCalledWith("forge");
  });

  it("shows toast with 'upgraded to' on success (basic -> iron)", () => {
    // axe is at tier 0 (basic) -> upgrading to iron
    dispatchUpgradeTool({ toolId: "axe" });
    expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining("upgraded to"), "success");
  });

  it("toast includes the new tier label (Iron)", () => {
    // toolUpgrades.axe = 0 means basic tier, upgrade target = iron
    dispatchUpgradeTool({ toolId: "axe" });
    expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining("Iron"), "success");
  });

  it("returns false and does not play SFX when upgradeToolTier fails", () => {
    mockUpgradeToolTier.mockReturnValueOnce(false);
    const result = dispatchUpgradeTool({ toolId: "axe" });
    expect(result).toBe(false);
    expect(mockPlaySound).not.toHaveBeenCalled();
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it("returns false for an unknown tool id (upgradeToolTier returns false)", () => {
    mockUpgradeToolTier.mockReturnValueOnce(false);
    const result = dispatchUpgradeTool({ toolId: "unknown-tool" });
    expect(result).toBe(false);
  });

  it("returns false immediately when toolId is empty string", () => {
    const result = dispatchUpgradeTool({ toolId: "" });
    expect(result).toBe(false);
    expect(mockUpgradeToolTier).not.toHaveBeenCalled();
  });

  it("returns false when tool is already at max tier (no upgrade config)", () => {
    // axe at tier 2 (grovekeeper) — no further upgrade config
    mockGetState.mockReturnValue({
      ...makeDefaultState(),
      toolUpgrades: { axe: 2 },
    });
    const result = dispatchUpgradeTool({ toolId: "axe" });
    expect(result).toBe(false);
    expect(mockUpgradeToolTier).not.toHaveBeenCalled();
  });

  it("shows Grovekeeper tier label for iron -> grovekeeper upgrade", () => {
    mockGetState.mockReturnValue({
      ...makeDefaultState(),
      toolUpgrades: { axe: 1 }, // iron tier
    });
    dispatchUpgradeTool({ toolId: "axe" });
    expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining("Grovekeeper"), "success");
  });
});

// ---------------------------------------------------------------------------
// dispatchTradeBuy (Spec §22.4)
// ---------------------------------------------------------------------------

describe("dispatchTradeBuy (Spec §22.4)", () => {
  it("deducts coins and adds resource on success", () => {
    // basePrice=10, seasonal=1.0, supplyDemand=1.0, quantity=2
    // totalCost = ceil(10 * 1.0 * 1.0 * 2) = 20
    const ctx: TradeBuyContext = {
      resourceType: "timber",
      quantity: 2,
      basePrice: 10,
      seasonalMultiplier: 1.0,
    };
    const result = dispatchTradeBuy(ctx);

    expect(result).toBe(true);
    expect(mockAddCoins).toHaveBeenCalledWith(-20);
    expect(mockAddResource).toHaveBeenCalledWith("timber", 2);
  });

  it("shows success toast with resource name and quantity", () => {
    const ctx: TradeBuyContext = {
      resourceType: "timber",
      quantity: 3,
      basePrice: 10,
      seasonalMultiplier: 1.0,
    };
    dispatchTradeBuy(ctx);
    expect(mockShowToast).toHaveBeenCalledWith("Bought 3x Timber", "success");
  });

  it("returns false when player has insufficient coins", () => {
    const ctx: TradeBuyContext = {
      resourceType: "timber",
      quantity: 10,
      basePrice: 50,
      seasonalMultiplier: 1.0,
    };
    mockGetState.mockReturnValue({
      ...makeDefaultState(),
      coins: 10, // only 10 coins, needs ceil(50*1.0*1.0*10)=500
    });

    const result = dispatchTradeBuy(ctx);
    expect(result).toBe(false);
    expect(mockAddCoins).not.toHaveBeenCalled();
    expect(mockAddResource).not.toHaveBeenCalled();
  });

  it("returns false when quantity is zero", () => {
    const ctx: TradeBuyContext = {
      resourceType: "timber",
      quantity: 0,
      basePrice: 10,
      seasonalMultiplier: 1.0,
    };
    const result = dispatchTradeBuy(ctx);
    expect(result).toBe(false);
    expect(mockAddCoins).not.toHaveBeenCalled();
    expect(mockAddResource).not.toHaveBeenCalled();
  });

  it("returns false when quantity is negative", () => {
    const ctx: TradeBuyContext = {
      resourceType: "timber",
      quantity: -1,
      basePrice: 10,
      seasonalMultiplier: 1.0,
    };
    const result = dispatchTradeBuy(ctx);
    expect(result).toBe(false);
  });

  it("applies seasonal modifier to total cost", () => {
    // basePrice=10, seasonal=1.5, supplyDemand=1.0, qty=1 -> cost=ceil(15)=15
    const ctx: TradeBuyContext = {
      resourceType: "fruit",
      quantity: 1,
      basePrice: 10,
      seasonalMultiplier: 1.5,
    };
    dispatchTradeBuy(ctx);
    expect(mockAddCoins).toHaveBeenCalledWith(-15);
  });

  it("applies supply/demand multiplier from market state", () => {
    // supplyDemand=2.0 for timber, basePrice=10, qty=1 -> cost=ceil(20)=20
    const ctx: TradeBuyContext = {
      resourceType: "timber",
      quantity: 1,
      basePrice: 10,
      seasonalMultiplier: 1.0,
    };
    mockGetState.mockReturnValue({
      ...makeDefaultState(),
      coins: 100,
      marketState: {
        ...makeDefaultState().marketState,
        priceMultipliers: { ...makeDefaultState().marketState.priceMultipliers, timber: 2.0 },
      },
    });
    const result = dispatchTradeBuy(ctx);
    expect(result).toBe(true);
    expect(mockAddCoins).toHaveBeenCalledWith(-20);
  });

  it("ceil rounds fractional total cost up", () => {
    // basePrice=3.5, seasonal=1.0, qty=1 -> ceil(3.5)=4
    const ctx: TradeBuyContext = {
      resourceType: "acorns",
      quantity: 1,
      basePrice: 3.5,
      seasonalMultiplier: 1.0,
    };
    dispatchTradeBuy(ctx);
    expect(mockAddCoins).toHaveBeenCalledWith(-4);
  });

  it("records market trade on success", () => {
    const ctx: TradeBuyContext = {
      resourceType: "ore",
      quantity: 2,
      basePrice: 5,
      seasonalMultiplier: 1.0,
    };
    dispatchTradeBuy(ctx);
    expect(mockRecordMarketTrade).toHaveBeenCalledWith("ore", "buy", 2);
  });

  it("does not record market trade when coins are insufficient", () => {
    mockGetState.mockReturnValue({ ...makeDefaultState(), coins: 0 });
    dispatchTradeBuy({ resourceType: "ore", quantity: 1, basePrice: 50, seasonalMultiplier: 1.0 });
    expect(mockRecordMarketTrade).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// dispatchTradeSell (Spec §22.4)
// ---------------------------------------------------------------------------

describe("dispatchTradeSell (Spec §22.4)", () => {
  it("deducts resource and adds coins on success", () => {
    // basePrice=10, seasonal=1.0, supplyDemand=1.0, quantity=2
    // totalGain = floor(10 * 1.0 * 1.0 * 2) = 20
    const ctx: TradeSellContext = {
      resourceType: "timber",
      quantity: 2,
      basePrice: 10,
      seasonalMultiplier: 1.0,
    };
    const result = dispatchTradeSell(ctx);

    expect(result).toBe(true);
    expect(mockSpendResource).toHaveBeenCalledWith("timber", 2);
    expect(mockAddCoins).toHaveBeenCalledWith(20);
  });

  it("shows success toast with resource name and quantity", () => {
    const ctx: TradeSellContext = {
      resourceType: "timber",
      quantity: 5,
      basePrice: 10,
      seasonalMultiplier: 1.0,
    };
    dispatchTradeSell(ctx);
    expect(mockShowToast).toHaveBeenCalledWith("Sold 5x Timber", "success");
  });

  it("returns false when spendResource fails (insufficient resource)", () => {
    mockSpendResource.mockReturnValueOnce(false);
    const ctx: TradeSellContext = {
      resourceType: "timber",
      quantity: 99,
      basePrice: 10,
      seasonalMultiplier: 1.0,
    };
    const result = dispatchTradeSell(ctx);
    expect(result).toBe(false);
    expect(mockAddCoins).not.toHaveBeenCalled();
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it("returns false when quantity is zero", () => {
    const ctx: TradeSellContext = {
      resourceType: "timber",
      quantity: 0,
      basePrice: 10,
      seasonalMultiplier: 1.0,
    };
    const result = dispatchTradeSell(ctx);
    expect(result).toBe(false);
    expect(mockSpendResource).not.toHaveBeenCalled();
  });

  it("returns false when quantity is negative", () => {
    const ctx: TradeSellContext = {
      resourceType: "timber",
      quantity: -5,
      basePrice: 10,
      seasonalMultiplier: 1.0,
    };
    const result = dispatchTradeSell(ctx);
    expect(result).toBe(false);
  });

  it("applies seasonal modifier to total gain", () => {
    // basePrice=10, seasonal=0.8 (winter timber modifier), qty=2
    // totalGain = floor(10 * 0.8 * 1.0 * 2) = floor(16) = 16
    const ctx: TradeSellContext = {
      resourceType: "timber",
      quantity: 2,
      basePrice: 10,
      seasonalMultiplier: 0.8,
    };
    dispatchTradeSell(ctx);
    expect(mockAddCoins).toHaveBeenCalledWith(16);
  });

  it("applies supply/demand multiplier (low supply = higher sell price)", () => {
    // supplyDemand=0.5 for timber, basePrice=10, qty=1 -> floor(10*1.0*0.5*1)=5
    const ctx: TradeSellContext = {
      resourceType: "timber",
      quantity: 1,
      basePrice: 10,
      seasonalMultiplier: 1.0,
    };
    mockGetState.mockReturnValue({
      ...makeDefaultState(),
      marketState: {
        ...makeDefaultState().marketState,
        priceMultipliers: { ...makeDefaultState().marketState.priceMultipliers, timber: 0.5 },
      },
    });
    dispatchTradeSell(ctx);
    expect(mockAddCoins).toHaveBeenCalledWith(5);
  });

  it("floor rounds fractional total gain down", () => {
    // basePrice=3, seasonal=1.0, qty=3 -> floor(9.0)=9
    const ctx: TradeSellContext = {
      resourceType: "sap",
      quantity: 3,
      basePrice: 3,
      seasonalMultiplier: 1.0,
    };
    dispatchTradeSell(ctx);
    expect(mockAddCoins).toHaveBeenCalledWith(9);
  });

  it("records market trade on success", () => {
    const ctx: TradeSellContext = {
      resourceType: "ore",
      quantity: 3,
      basePrice: 5,
      seasonalMultiplier: 1.0,
    };
    dispatchTradeSell(ctx);
    expect(mockRecordMarketTrade).toHaveBeenCalledWith("ore", "sell", 3);
  });

  it("does not record market trade when sell fails", () => {
    mockSpendResource.mockReturnValueOnce(false);
    dispatchTradeSell({
      resourceType: "timber",
      quantity: 999,
      basePrice: 10,
      seasonalMultiplier: 1.0,
    });
    expect(mockRecordMarketTrade).not.toHaveBeenCalled();
  });

  it("does not show toast when sell fails", () => {
    mockSpendResource.mockReturnValueOnce(false);
    dispatchTradeSell({
      resourceType: "timber",
      quantity: 999,
      basePrice: 10,
      seasonalMultiplier: 1.0,
    });
    expect(mockShowToast).not.toHaveBeenCalled();
  });
});
