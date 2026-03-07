/**
 * Tool action handlers for executeAction switch cases.
 * Each handler receives the current selection and store state.
 */
import {
  clearRock,
  fertilizeTree,
  harvestTree,
  plantTree,
  pruneTree,
  waterTree,
} from "@/game/actions/GameActions";
import { dispatchAction } from "@/game/actions/actionDispatcher";
import { getToolById } from "@/game/config/tools";
import type { Entity } from "@/game/ecs/world";
import {
  campfiresQuery,
  structuresQuery,
  trapsQuery,
  waterBodiesQuery,
} from "@/game/ecs/world";
import { useGameStore } from "@/game/stores/gameStore";
import { showToast } from "@/game/ui/Toast";
import { findRockAtGrid, findTreeAtGrid } from "./entityFinders";
import { setSelection } from "./selectionStore";
import type { InteractionSelection } from "./types";

type Store = ReturnType<typeof useGameStore.getState>;

function refundStamina(store: Store, tool: string): void {
  const toolData = getToolById(tool);
  if (toolData) store.setStamina(store.stamina + toolData.staminaCost);
}

export function handleTrowelAction(
  selection: InteractionSelection,
  store: Store,
  species: string,
  tool: string,
): void {
  if (selection.type !== "tile") return;
  const success = plantTree(species, selection.gridX, selection.gridZ);
  if (success) {
    showToast(`Planted ${species}!`, "success");
    store.incrementToolUse("trowel");
    store.incrementSeasonalPlanting(store.currentSeason);
    store.trackSpeciesPlanting(species);
    store.advanceQuestObjective("trees_planted", 1);
    store.advanceEventChallenge("plant", 1);
  } else {
    refundStamina(store, tool);
    showToast("Can't plant here", "info");
  }
}

export function handleWateringCanAction(
  selection: InteractionSelection,
  store: Store,
  tool: string,
): void {
  if (selection.type !== "tree" || !selection.entityId) return;
  const success = waterTree(selection.entityId);
  if (success) {
    showToast("Watered!", "success");
    store.incrementToolUse("watering-can");
    store.advanceQuestObjective("trees_watered", 1);
    store.advanceEventChallenge("water", 1);
  } else {
    refundStamina(store, tool);
    showToast("Already watered", "info");
  }
}

export function handleAxeAction(
  selection: InteractionSelection,
  store: Store,
  tool: string,
): void {
  if (selection.type !== "tree" || !selection.entityId) return;
  const resources = harvestTree(selection.entityId);
  if (resources) {
    const summary = resources.map((r) => `+${r.amount} ${r.type}`).join(", ");
    showToast(`Harvested! ${summary}`, "success");
    store.incrementToolUse("axe");
    store.incrementSeasonalHarvest(store.currentSeason);

    const tree = findTreeAtGrid(selection.gridX, selection.gridZ);
    if (tree?.tree) {
      const totalYield = resources.reduce((s, r) => s + r.amount, 0);
      store.trackSpeciesHarvest(tree.tree.speciesId, totalYield);
    }

    store.advanceQuestObjective("trees_harvested", 1);
    store.advanceEventChallenge("harvest", 1);
    setSelection(null);
  } else {
    refundStamina(store, tool);
    showToast("Not ready to harvest", "info");
  }
}

export function handlePruningShears(
  selection: InteractionSelection,
  store: Store,
  tool: string,
): void {
  if (selection.type !== "tree" || !selection.entityId) return;
  const success = pruneTree(selection.entityId);
  if (success) {
    showToast("Pruned! Next harvest will yield more.", "success");
    store.incrementToolUse("pruning-shears");
  } else {
    refundStamina(store, tool);
    showToast("Can't prune this tree", "info");
  }
}

export function handleShovelAction(
  selection: InteractionSelection,
  store: Store,
  tool: string,
): void {
  if (selection.type !== "tile") return;
  const success = clearRock(selection.gridX, selection.gridZ);
  if (success) {
    showToast("Rock cleared!", "success");
    store.incrementToolUse("shovel");
  } else {
    refundStamina(store, tool);
    showToast("Nothing to clear", "info");
  }
}

export function handleCompostBinAction(
  selection: InteractionSelection,
  store: Store,
  tool: string,
): void {
  if (selection.type !== "tree" || !selection.entityId) return;
  const success = fertilizeTree(selection.entityId);
  if (success) {
    showToast("Fertilized! 2x growth this stage.", "success");
    store.incrementToolUse("compost-bin");
  } else {
    refundStamina(store, tool);
    showToast("Can't fertilize", "info");
  }
}

export function handlePickAction(
  selection: InteractionSelection,
  store: Store,
  tool: string,
): void {
  if (selection.type !== "tile" || selection.entityId !== null) return;
  const rockEntity = findRockAtGrid(selection.gridX, selection.gridZ);
  if (!rockEntity) return;
  const success = dispatchAction({
    toolId: "pick",
    targetType: "rock",
    entity: rockEntity,
    gridX: selection.gridX,
    gridZ: selection.gridZ,
    biome: store.currentZoneId,
  });
  if (success) {
    showToast("Mined rock!", "success");
  } else {
    refundStamina(store, tool);
    showToast("Not enough stamina to mine", "info");
  }
}

export function handleFishingRodAction(
  selection: InteractionSelection,
  store: Store,
  tool: string,
): void {
  if (selection.type !== "water" || !selection.entityId) return;
  let waterEntity: Entity | null = null;
  for (const e of waterBodiesQuery) {
    if (e.id === selection.entityId) {
      waterEntity = e;
      break;
    }
  }
  const waterBodyType = waterEntity?.waterBody?.waterType ?? "pond";
  const success = dispatchAction({
    toolId: "fishing-rod",
    targetType: "water",
    entity: waterEntity ?? undefined,
    waterBodyType,
  });
  if (success) {
    showToast("Fishing...", "info");
  } else {
    refundStamina(store, tool);
    showToast("Can't fish here", "info");
  }
}

export function handleTrapPlacementAction(
  selection: InteractionSelection,
  store: Store,
  tool: string,
): void {
  if ((selection.type !== "tile" && selection.type !== null) || selection.entityId !== null) return;
  const selectedTrapType = store.selectedTool;
  const success = dispatchAction({
    toolId: "trap",
    targetType: "soil",
    gridX: selection.gridX,
    gridZ: selection.gridZ,
    trapType: selectedTrapType,
  });
  if (success) {
    showToast("Trap placed!", "success");
  } else {
    refundStamina(store, tool);
    showToast("Can't place trap here", "info");
  }
}

export function handleHammerAction(selection: InteractionSelection): void {
  const success = dispatchAction({
    toolId: "hammer",
    targetType: selection.type === "tile" ? "soil" : null,
    gridX: selection.gridX,
    gridZ: selection.gridZ,
  });
  if (success) {
    showToast("Build mode opened", "info");
  }
}

export function handleDefaultAction(selection: InteractionSelection, tool: string): void {
  if (selection.type === "campfire" && selection.entityId) {
    let campfireEnt: Entity | null = null;
    for (const e of campfiresQuery) {
      if (e.id === selection.entityId) {
        campfireEnt = e;
        break;
      }
    }
    const success = dispatchAction({
      toolId: tool,
      targetType: "campfire",
      entity: campfireEnt ?? undefined,
    });
    if (success) {
      showToast("Cooking station opened", "info");
    } else {
      showToast("Light the campfire first", "info");
    }
  } else if (selection.type === "forge" && selection.entityId) {
    let forgeEnt: Entity | null = null;
    for (const e of structuresQuery) {
      if (e.id === selection.entityId) {
        forgeEnt = e;
        break;
      }
    }
    const forgeWrapped = forgeEnt
      ? { ...forgeEnt, forge: { active: forgeEnt.structure !== undefined } }
      : undefined;
    const success = dispatchAction({
      toolId: tool,
      targetType: "forge",
      entity: forgeWrapped as unknown as Entity,
    });
    if (success) {
      showToast("Forge opened", "info");
    } else {
      showToast("Light the forge first", "info");
    }
  } else if (selection.type === "trap" && selection.entityId) {
    let trapEnt: Entity | null = null;
    for (const e of trapsQuery) {
      if (e.id === selection.entityId) {
        trapEnt = e;
        break;
      }
    }
    const success = dispatchAction({
      toolId: tool,
      targetType: "trap",
      entity: trapEnt ?? undefined,
    });
    if (success) {
      showToast("Trap checked!", "success");
    }
  }
}
