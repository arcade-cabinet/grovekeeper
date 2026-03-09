/**
 * Dialogue and quest branching ECS components.
 *
 * Dialogue displays above NPCs and Grovekeeper spirits as floating
 * speech bubbles. Quest branches use A/B-style choices with seed-biased
 * selection to create unique but narratively coherent quest chains per
 * world seed.
 *
 * Branching math: With N dialogue nodes, each having B branch options,
 * and D depth levels, total unique paths = B^D per quest chain.
 * By seeding branch selection from worldSeed + questId + nodeIndex,
 * each seed produces a deterministic unique path through the tree.
 */

/** A single dialogue node in a tree. */
export interface DialogueNode {
  /** Unique node ID within this tree. */
  nodeId: string;
  /** Speaker name (NPC name or spirit ID). */
  speaker: string;
  /** Dialogue text to display. */
  text: string;
  /** Branch options (A/B/C choices). Empty = terminal node. */
  branches: DialogueBranch[];
  /** Conditions that must be met to reach this node. */
  conditions?: DialogueCondition[];
  /** Effects triggered when this node is displayed. */
  effects?: DialogueEffect[];
}

/** A branch choice the player can select. */
export interface DialogueBranch {
  /** Display label for the choice. */
  label: string;
  /** Target node ID to navigate to. */
  targetNodeId: string;
  /** Seed bias weight (0-1). Higher = more likely selected by seed. */
  seedBias: number;
  /** Whether this branch is only available under certain conditions. */
  conditions?: DialogueCondition[];
}

export type DialogueConditionType =
  | "has_item"
  | "has_level"
  | "has_discovered"
  | "quest_complete"
  | "season"
  | "time_of_day"
  | "spirit_discovered"
  | "has_relationship";

/** Condition for gating dialogue branches. */
export interface DialogueCondition {
  type: DialogueConditionType;
  value: string | number;
  /** Whether condition is negated (NOT has_item, etc.). */
  negate?: boolean;
}

export type DialogueEffectType =
  | "give_item"
  | "give_xp"
  | "start_quest"
  | "advance_quest"
  | "unlock_species"
  | "unlock_recipe"
  | "set_relationship"
  | "reveal_location";

/** Side effect triggered by a dialogue node. */
export interface DialogueEffect {
  type: DialogueEffectType;
  value: string | number;
  amount?: number;
}

/** A complete dialogue tree (stored in config, referenced by ID). */
export interface DialogueTree {
  /** Unique tree ID. */
  treeId: string;
  /** Entry node ID. */
  entryNodeId: string;
  /** All nodes in this tree. */
  nodes: DialogueNode[];
  /** Total branch depth (for path counting). */
  maxDepth: number;
}

/** Active dialogue state on an entity (NPC or spirit). */
export interface DialogueComponent {
  /** Current dialogue tree ID (from config). */
  activeTreeId: string | null;
  /** Current node within the active tree. */
  currentNodeId: string | null;
  /** Whether dialogue bubble is visible. */
  bubbleVisible: boolean;
  /** History of visited node IDs (for backtracking prevention). */
  visitedNodes: string[];
  /** Seed-selected path through the tree (pre-computed from worldSeed). */
  seedPath: string[];
  /** Whether player is actively in dialogue with this entity. */
  inConversation: boolean;
}

/**
 * Player context injected into condition evaluation.
 * Pure value object — no game store imports needed for testing.
 */
export interface DialogueContext {
  /** Current player level. */
  playerLevel: number;
  /** Item IDs the player currently holds. */
  inventory: string[];
  /** Quest IDs the player has completed. */
  completedQuests: string[];
  /** Location IDs the player has discovered. */
  discoveredLocations: string[];
  /** Spirit IDs the player has discovered. */
  discoveredSpirits: string[];
  /** Current season: "spring" | "summer" | "autumn" | "winter". */
  currentSeason: string;
  /** Current time of day: "dawn" | "morning" | "afternoon" | "evening" | "night". */
  timeOfDay: string;
  /** NPC relationship values (npcId -> 0-100). Used by "has_relationship" conditions. */
  npcRelationships: Record<string, number>;
}

/** Quest state driven by dialogue branching. */
export interface QuestBranchComponent {
  /** Quest chain ID. */
  questChainId: string;
  /** Current branch path taken (sequence of branch labels). */
  branchPath: string[];
  /** Current step index within the quest. */
  currentStep: number;
  /** Total steps in this branch path. */
  totalSteps: number;
  /** Whether quest is active, completed, or failed. */
  status: "available" | "active" | "completed" | "failed";
  /** Objective text for current step. */
  currentObjective: string;
  /** Reward tier (affected by branch path — harder paths = better rewards). */
  rewardTier: number;
}
