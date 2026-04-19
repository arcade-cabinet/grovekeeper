import { relation, trait } from "koota";
import type { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { NpcFunction } from "@/npcs/types";
import type { ActiveQuest } from "@/systems/quests";
import type { Season } from "@/systems/time";
import type { QuestChainState } from "@/quests/types";
import type { EventState } from "@/events/types";
import type { MarketState } from "@/systems/supplyDemand";
import type { MerchantState } from "@/systems/travelingMerchant";
import type { MarketEventState } from "@/systems/marketEvents";
import type { SpeciesProgress } from "@/systems/speciesDiscovery";
import type { ResourceType } from "@/config/resources";

// ─── Spatial traits ───────────────────────────────────────────

export const Position = trait({ x: 0, y: 0, z: 0 });

export const Renderable = trait({
  meshId: null as string | null,
  visible: true,
  scale: 0,
});

export const MeshRef = trait(() => null! as Mesh);

// ─── Tree traits ──────────────────────────────────────────────

export const Tree = trait({
  speciesId: "white-oak",
  stage: 0 as 0 | 1 | 2 | 3 | 4,
  progress: 0,
  watered: false,
  totalGrowthTime: 0,
  plantedAt: 0,
  meshSeed: 0,
  wild: false,
  pruned: false,
  fertilized: false,
});

export const Harvestable = trait({
  resources: () => [] as { type: string; amount: number }[],
  cooldownElapsed: 0,
  cooldownTotal: 0,
  ready: false,
});

// ─── Grid / world traits ──────────────────────────────────────

export const GridCell = trait({
  gridX: 0,
  gridZ: 0,
  type: "soil" as "soil" | "water" | "rock" | "path",
  occupied: false,
  treeEntityId: null as string | null,
});

export const Zone = trait({
  zoneId: "",
  localX: 0,
  localZ: 0,
});

export const Prop = trait({ propId: "", meshId: "" });

export const Structure = trait({
  templateId: "",
  effectType: undefined as
    | "growth_boost"
    | "harvest_boost"
    | "stamina_regen"
    | "storage"
    | undefined,
  effectRadius: 0,
  effectMagnitude: 0,
});

export const RainCatcher = trait({ radius: 0 });
export const Scarecrow = trait({ radius: 0 });

// ─── Actors ───────────────────────────────────────────────────

export const IsPlayer = trait();

export const FarmerState = trait({ stamina: 100, maxStamina: 100 });

export const Npc = trait({
  templateId: "",
  function: "merchant" as NpcFunction,
  interactable: false,
  requiredLevel: 1,
});

// ─── World-level (singleton) traits — set on world itself ─────

export const Time = trait({
  gameTimeMicroseconds: 0,
  last: 0,
  delta: 0,
});

export const CurrentSeason = trait({ value: "spring" as Season });

export const CurrentDay = trait({ value: 1 });

// Player persistent progression
export const PlayerProgress = trait({
  level: 1,
  xp: 0,
  coins: 100,
  selectedTool: "trowel",
  selectedSpecies: "white-oak",
  currentTool: "trowel",
  unlockedTools: () => ["trowel", "watering-can"],
  unlockedSpecies: () => ["white-oak"],
  activeBorderCosmetic: null as string | null,
  prestigeCount: 0,
});

export const Resources = trait({
  timber: 0,
  sap: 0,
  fruit: 0,
  acorns: 0,
});

export const LifetimeResources = trait({
  timber: 0,
  sap: 0,
  fruit: 0,
  acorns: 0,
});

export const Seeds = trait(() => ({}) as Record<string, number>);

export const Tracking = trait({
  treesPlanted: 0,
  treesMatured: 0,
  treesHarvested: 0,
  treesWatered: 0,
  wildTreesHarvested: 0,
  wildTreesRegrown: 0,
  treesPlantedInSpring: 0,
  treesHarvestedInAutumn: 0,
  toolUseCounts: () => ({}) as Record<string, number>,
  visitedZoneTypes: () => [] as string[],
  wildSpeciesHarvested: () => [] as string[],
  speciesPlanted: () => [] as string[],
  seasonsExperienced: () => [] as string[],
});

export const Achievements = trait(() => [] as string[]);

export const Quests = trait({
  activeQuests: () => [] as ActiveQuest[],
  completedQuestIds: () => [] as string[],
  completedGoalIds: () => [] as string[],
  lastQuestRefresh: 0,
});

export const QuestChains = trait(
  () =>
    ({
      activeChains: {},
      completedChainIds: [],
      availableChainIds: [],
    }) as QuestChainState,
);

export const MarketStateTrait = trait(() => null as MarketState | null);
export const MerchantStateTrait = trait(() => null as MerchantState | null);
export const MarketEventStateTrait = trait(
  () => null as MarketEventState | null,
);
export const EventStateTrait = trait(() => null as EventState | null);

export const SpeciesProgressTrait = trait({
  speciesProgress: () => ({}) as Record<string, SpeciesProgress>,
  pendingCodexUnlocks: () => [] as string[],
});

export const Grid = trait({
  gridSize: 12,
});

export const Build = trait({
  mode: false,
  templateId: null as string | null,
  placedStructures: () =>
    [] as { templateId: string; worldX: number; worldZ: number }[],
});

export const ToolUpgrades = trait(
  () => ({}) as Record<string, number>,
);

export const WorldMeta = trait({
  currentZoneId: "starting-grove",
  worldSeed: "",
  discoveredZones: () => ["starting-grove"] as string[],
});

export const Settings = trait({
  hasSeenRules: false,
  hapticsEnabled: true,
  soundEnabled: true,
});

export const GameScreen = trait({
  value: "menu" as "menu" | "playing" | "paused" | "seedSelect" | "rules",
});

export const Difficulty = trait({
  id: "normal",
  permadeath: false,
});

// ─── Relations ────────────────────────────────────────────────

export const InZone = relation({ exclusive: true });
export const OccupiedBy = relation({ exclusive: true });

// ─── Trait type helpers ───────────────────────────────────────

export type ResourceKey = ResourceType;
export type { Vector3 };
