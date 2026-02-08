/**
 * NPC + Dialogue type definitions.
 *
 * NPCs are data-driven: templates define appearance and function,
 * dialogue trees define conversation flow with branching choices.
 */

import type { ResourceType } from "../constants/resources";

export type NpcFunction = "trading" | "quests" | "tips" | "seeds";
export type HatStyle = "pointed" | "flat" | "wide" | "round" | "none";

export interface NpcAppearance {
  bodyColor: string;
  headColor: string;
  hatColor: string;
  hatStyle: HatStyle;
  scale: number;
}

export interface NpcTradeRate {
  from: ResourceType;
  to: ResourceType;
  fromAmount: number;
  toAmount: number;
}

export interface NpcSeedStock {
  speciesId: string;
  cost: Partial<Record<ResourceType, number>>;
  quantity: number;
}

export interface NpcTemplate {
  id: string;
  name: string;
  title: string;
  icon: string;
  function: NpcFunction;
  appearance: NpcAppearance;
  requiredLevel: number;
  dialogue: { greeting: string; idle: string[] };
  tradeConfig?: { bonusRates: NpcTradeRate[] };
  seedConfig?: { stock: NpcSeedStock[] };
  questConfig?: { specialQuestIds: string[] };
}

export interface DialogueAction {
  type:
    | "xp"
    | "open_trade"
    | "open_quests"
    | "open_seeds"
    | "give_resource"
    | "give_seed";
  amount?: number;
  resource?: ResourceType;
  speciesId?: string;
}

export interface DialogueChoice {
  label: string;
  /** ID of next dialogue node, or null to end conversation. */
  next: string | null;
  action?: DialogueAction;
}

export interface DialogueNode {
  id: string;
  speaker: string;
  text: string;
  choices: DialogueChoice[];
}
