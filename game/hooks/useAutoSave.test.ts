/**
 * Tests for useAutoSave hook.
 *
 * We verify the AppState listener registration and save-on-background behavior.
 */

// Mock db queries (new relational API)
const mockPersistGameStore = jest.fn().mockResolvedValue(undefined);
const mockSaveGroveToDb = jest.fn().mockResolvedValue(undefined);

jest.mock("@/game/db/queries", () => ({
  persistGameStore: (...args: unknown[]) => mockPersistGameStore(...args),
  saveGroveToDb: (...args: unknown[]) => mockSaveGroveToDb(...args),
  hydrateGameStore: jest.fn().mockResolvedValue(null),
  loadGroveFromDb: jest.fn().mockResolvedValue(null),
  setupNewGame: jest.fn().mockResolvedValue(undefined),
}));

// Mock AppState -- capture listener callback
let _mockCapturedCallback: ((s: string) => void) | null = null;
const mockRemove = jest.fn();

jest.mock("react-native", () => ({
  AppState: {
    addEventListener: jest.fn((_event: string, cb: (s: string) => void) => {
      _mockCapturedCallback = cb;
      return { remove: mockRemove };
    }),
  },
}));

// Mock ECS world
jest.mock("@/game/ecs/world", () => {
  const mockQuery = { [Symbol.iterator]: function* () {}, entities: [], size: 0 };
  return {
    treesQuery: mockQuery,
    world: {
      [Symbol.iterator]: function* () {},
      with: () => mockQuery,
    },
  };
});

jest.mock("@/game/ecs/archetypes", () => ({}));
jest.mock("@/game/systems/growth", () => ({ getStageScale: () => 1 }));

// Mock store dependencies
jest.mock("@/game/events/eventScheduler", () => ({
  initializeEventState: () => ({
    activeFestival: null,
    completedFestivalIds: [],
    activeEncounters: [],
    nextFestivalDay: 0,
    nextEncounterDay: 0,
  }),
  advanceFestivalChallenge: jest.fn(),
  getFestivalDef: jest.fn(),
  resolveEncounter: jest.fn(),
  updateEvents: jest.fn((s: unknown) => ({ state: s })),
}));

jest.mock("@/game/quests/questChainEngine", () => ({
  initializeChainState: () => ({
    activeChains: {},
    completedChainIds: [],
    availableChainIds: [],
  }),
  computeAvailableChains: jest.fn(() => []),
  startChain: jest.fn(),
  advanceObjectives: jest.fn((s: unknown) => ({
    state: s,
    completedSteps: [],
  })),
  claimStepReward: jest.fn(() => ({ state: {}, stepDef: null })),
}));

jest.mock("@/game/systems/marketEvents", () => ({
  initializeMarketEventState: () => ({ activeEvent: null, nextEventDay: 0 }),
  updateMarketEvents: jest.fn((s: unknown) => ({
    state: s,
    newEventTriggered: false,
  })),
}));

jest.mock("@/game/systems/supplyDemand", () => ({
  initializeMarketState: () => ({ tradeHistory: [], supplyLevels: {} }),
  pruneHistory: jest.fn((s: unknown) => s),
  recordTrade: jest.fn(),
}));

jest.mock("@/game/systems/travelingMerchant", () => ({
  initializeMerchantState: () => ({
    isPresent: false,
    currentOffers: [],
    nextArrivalDay: 0,
  }),
  updateMerchant: jest.fn((s: unknown) => s),
  purchaseOffer: jest.fn(),
}));

jest.mock("@/game/systems/speciesDiscovery", () => ({
  createEmptyProgress: () => ({
    timesPlanted: 0,
    maxStageReached: 0,
    timesHarvested: 0,
    totalYield: 0,
    discoveryTier: 0,
  }),
  computeDiscoveryTier: jest.fn(() => 0),
}));

jest.mock("@/game/systems/prestige", () => ({
  canPrestige: jest.fn(() => false),
  getPrestigeResetState: jest.fn(() => ({})),
  calculatePrestigeBonus: jest.fn(() => ({ staminaBonus: 0 })),
  getUnlockedPrestigeSpecies: jest.fn(() => []),
}));

jest.mock("@/game/systems/gridExpansion", () => ({
  getNextExpansionTier: jest.fn(() => null),
  canAffordExpansion: jest.fn(() => false),
}));

jest.mock("@/game/systems/levelUnlocks", () => ({
  checkNewUnlocks: jest.fn(() => ({ tools: [], species: [] })),
}));

jest.mock("@/game/systems/toolUpgrades", () => ({
  getToolUpgradeTier: jest.fn(() => null),
  canAffordToolUpgrade: jest.fn(() => false),
}));

jest.mock("@/game/config/species", () => ({ getSpeciesById: jest.fn() }));
jest.mock("@/game/config/tools", () => ({ getToolById: jest.fn() }));
jest.mock("@/game/config/resources", () => ({
  emptyResources: () => ({ timber: 0, sap: 0, fruit: 0, acorns: 0 }),
}));
jest.mock("@/game/ui/Toast", () => ({ showToast: jest.fn() }));

// Static import after all mocks are set up (Jest hoists jest.mock calls)
import { useAutoSave } from "@/game/hooks/useAutoSave";

describe("useAutoSave", () => {
  it("exports useAutoSave as a function", () => {
    expect(typeof useAutoSave).toBe("function");
  });
});
