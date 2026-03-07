/**
 * questState.ts -- Quest, quest chain, economy, and event actions.
 * Spec §14 (quests), §16 (quest chains), §20 (economy), §21 (events)
 */

import { batch } from "@legendapp/state";
import type { ResourceType } from "@/game/config/resources";
import type { DialogueEffect } from "@/game/ecs/components/dialogue";
import {
  advanceFestivalChallenge,
  type EventContext,
  getFestivalDef,
  resolveEncounter as resolveEncounterPure,
  updateEvents,
} from "@/game/events/eventScheduler";
import {
  advanceObjectives,
  claimStepReward,
  computeAvailableChains,
  startChain,
} from "@/game/quests/questChainEngine";
import { applyDialogueEffects } from "@/game/systems/dialogueEffects";
import { updateMarketEvents } from "@/game/systems/marketEvents";
import type { ActiveQuest } from "@/game/systems/quests";
import { pruneHistory, recordTrade } from "@/game/systems/supplyDemand";
import { purchaseOffer, spawnMerchantAtVillage as spawnMerchantAtVillagePure, updateMerchant } from "@/game/systems/travelingMerchant";
import { showToast } from "@/game/ui/Toast";
import { gameState$, getState } from "./core";
// Cross-domain imports -- safe circular ES module bindings (called at runtime, not init)
import { addXp, unlockSpecies } from "./playerState";
import { addResource, addSeed } from "./inventory";

export function setActiveQuests(quests: ActiveQuest[]): void {
  gameState$.activeQuests.set(quests);
}

export function updateQuest(questId: string, quest: ActiveQuest): void {
  const current = getState().activeQuests;
  gameState$.activeQuests.set(current.map((q) => (q.id === questId ? quest : q)));
}

export function completeQuest(questId: string): void {
  const state = getState();
  batch(() => {
    gameState$.activeQuests.set(state.activeQuests.filter((q) => q.id !== questId));
    gameState$.completedQuestIds.set([...state.completedQuestIds, questId]);
  });
}

export function setLastQuestRefresh(time: number): void {
  gameState$.lastQuestRefresh.set(time);
}

export function refreshAvailableChains(): void {
  const state = getState();
  const available = computeAvailableChains(state.questChainState, state.level);
  gameState$.questChainState.set({ ...state.questChainState, availableChainIds: available });
}

export function startQuestChain(chainId: string): void {
  const state = getState();
  gameState$.questChainState.set(startChain(state.questChainState, chainId, state.currentDay));
}

export function advanceQuestObjective(
  eventType: string,
  amount: number,
): { chainId: string; stepId: string }[] {
  const state = getState();
  const result = advanceObjectives(state.questChainState, eventType, amount);
  if (result.state !== state.questChainState) {
    gameState$.questChainState.set(result.state);
  }
  return result.completedSteps;
}

export function claimQuestStepReward(chainId: string): void {
  const state = getState();
  const result = claimStepReward(state.questChainState, chainId);
  if (!result.stepDef) return;

  gameState$.questChainState.set(result.state);

  const reward = result.stepDef.reward;
  if (reward.xp) addXp(reward.xp);
  if (reward.resources) {
    for (const [resource, amount] of Object.entries(reward.resources)) {
      if (amount) addResource(resource as ResourceType, amount);
    }
  }
  if (reward.seeds) {
    for (const seed of reward.seeds) {
      addSeed(seed.speciesId, seed.amount);
    }
  }
  if (reward.unlockSpecies) unlockSpecies(reward.unlockSpecies);

  queueMicrotask(() => {
    showToast(`Quest step complete: ${result.stepDef?.name}`, "success");
  });
}

export function applyDialogueNodeEffects(
  effects: DialogueEffect[],
): { chainId: string; stepId: string }[] {
  const state = getState();
  const result = applyDialogueEffects(effects, state.questChainState, state.currentDay);
  if (result.state !== state.questChainState) {
    gameState$.questChainState.set(result.state);
  }
  for (const speciesId of result.unlockedSpecies) {
    unlockSpecies(speciesId);
    queueMicrotask(() => {
      showToast(`Unlocked ${speciesId}!`, "reward");
    });
  }
  return result.completedSteps;
}

export function recordMarketTrade(
  resource: ResourceType,
  direction: "buy" | "sell",
  amount: number,
): void {
  const state = getState();
  gameState$.marketState.set(
    recordTrade(state.marketState, resource, direction, amount, state.currentDay),
  );
}

export function updateEconomy(currentDay: number): void {
  const state = getState();
  const rngSeed = state.worldSeed || "default";

  const prunedMarket = pruneHistory(state.marketState, currentDay);
  const newMerchantState = updateMerchant(state.merchantState, currentDay, rngSeed);
  const eventResult = updateMarketEvents(state.marketEventState, currentDay, rngSeed);

  batch(() => {
    if (prunedMarket !== state.marketState) {
      gameState$.marketState.set(prunedMarket);
    }
    if (newMerchantState !== state.merchantState) {
      gameState$.merchantState.set(newMerchantState);
      if (newMerchantState.isPresent && !state.merchantState.isPresent) {
        queueMicrotask(() => {
          showToast("A traveling merchant has arrived!", "success");
        });
      }
    }
    if (eventResult.state !== state.marketEventState) {
      gameState$.marketEventState.set(eventResult.state);
      if (eventResult.newEventTriggered && eventResult.state.activeEvent) {
        queueMicrotask(() => {
          showToast("Market event started!", "success");
        });
      }
    }
  });
}

export function purchaseMerchantOffer(offerId: string): boolean {
  const state = getState();
  if (!state.merchantState.isPresent) return false;

  const offer = state.merchantState.currentOffers.find((o) => o.id === offerId);
  if (!offer || offer.quantity <= 0) return false;

  for (const [resource, amount] of Object.entries(offer.cost)) {
    if ((state.resources[resource as ResourceType] ?? 0) < (amount as number)) return false;
  }

  const newResources = { ...state.resources };
  for (const [resource, amount] of Object.entries(offer.cost)) {
    newResources[resource as ResourceType] -= amount as number;
  }

  const result = purchaseOffer(state.merchantState, offerId);
  if (!result.offer) return false;

  batch(() => {
    gameState$.resources.set(newResources);
    gameState$.merchantState.set(result.state);
  });

  const reward = result.offer.reward;
  if (reward.type === "resource" && reward.resource && reward.amount) {
    const resourceType = reward.resource as ResourceType;
    if (resourceType in state.resources) addResource(resourceType, reward.amount);
  } else if (reward.type === "seed" && reward.speciesId && reward.amount) {
    addSeed(reward.speciesId, reward.amount);
  } else if (reward.type === "xp" && reward.amount) {
    addXp(reward.amount);
  }

  queueMicrotask(() => {
    showToast(`Purchased: ${result.offer?.name}`, "success");
  });

  return true;
}

export function spawnMerchantAtVillage(villageId: string): void {
  const state = getState();
  const newMerchantState = spawnMerchantAtVillagePure(
    state.merchantState,
    villageId,
    state.currentDay,
    state.worldSeed || "default",
  );
  if (newMerchantState !== state.merchantState) {
    gameState$.merchantState.set(newMerchantState);
    queueMicrotask(() => {
      showToast("A merchant has arrived at the village!", "success");
    });
  }
}

export function tickEvents(context: EventContext): void {
  const state = getState();
  const result = updateEvents(state.eventState, context);
  if (result.state !== state.eventState) {
    gameState$.eventState.set(result.state);
  }
  if (result.festivalStarted) {
    queueMicrotask(() => {
      const festDef = result.festivalStarted;
      if (festDef) showToast(`${festDef.name} has begun!`, "achievement");
    });
  }
  if (result.festivalEnded) {
    const def = getFestivalDef(result.festivalEnded);
    const completed = state.eventState.activeFestival?.completed;
    queueMicrotask(() => {
      if (completed && def) {
        showToast(`${def.name} complete!`, "success");
        const reward = def.completionReward;
        if (reward.xp) addXp(reward.xp);
        if (reward.resources) {
          for (const [resource, amount] of Object.entries(reward.resources)) {
            if (amount) addResource(resource as ResourceType, amount);
          }
        }
        if (reward.seeds) {
          for (const seed of reward.seeds) addSeed(seed.speciesId, seed.amount);
        }
      } else if (def) {
        showToast(`${def.name} has ended.`, "info");
      }
    });
  }
  if (result.encounterTriggered) {
    queueMicrotask(() => {
      const encDef = result.encounterTriggered;
      if (encDef) showToast(`${encDef.name}!`, "info");
    });
  }
}

export function advanceEventChallenge(challengeType: string, amount = 1): void {
  const state = getState();
  if (!state.eventState.activeFestival) return;
  const newEventState = advanceFestivalChallenge(state.eventState, challengeType, amount);
  if (newEventState !== state.eventState) {
    gameState$.eventState.set(newEventState);
  }
}

export function resolveEncounter(definitionId: string): void {
  const state = getState();
  const newEventState = resolveEncounterPure(state.eventState, definitionId);
  if (newEventState !== state.eventState) {
    gameState$.eventState.set(newEventState);
  }
}
