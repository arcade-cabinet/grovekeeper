/**
 * useInteraction -- R3F interaction hook for tile/tree/NPC selection and game actions.
 *
 * Bridges pointer events from R3F mesh components to headless GameActions.
 * Tracks which entity (tile, tree, NPC) is currently selected and determines
 * available actions based on selected entity + current tool.
 *
 * Used by the GameScreen to wire ActionButton and pointer handlers.
 */

import type { ThreeEvent } from "@react-three/fiber";
import { useCallback, useRef, useSyncExternalStore } from "react";
import type { TileState } from "@/components/game/ActionButton";
import { dispatchAction } from "@/game/actions/actionDispatcher";
import {
  clearRock,
  fertilizeTree,
  harvestTree,
  plantTree,
  pruneTree,
  spendToolStamina,
  waterTree,
} from "@/game/actions/GameActions";
import { getToolById } from "@/game/config/tools";
import type { Entity } from "@/game/ecs/world";
import {
  campfiresQuery,
  npcsQuery,
  playerQuery,
  rocksQuery,
  structuresQuery,
  trapsQuery,
  treesQuery,
  waterBodiesQuery,
} from "@/game/ecs/world";
import { useGameStore } from "@/game/stores/gameStore";
import { showToast } from "@/game/ui/Toast";

// ── Types ───────────────────────────────────────────────────────────────────

export type SelectionType =
  | "tile"
  | "tree"
  | "npc"
  | "campfire"
  | "forge"
  | "water"
  | "trap"
  | null;

export interface InteractionSelection {
  type: SelectionType;
  gridX: number;
  gridZ: number;
  entityId: string | null;
}

export interface InteractionState {
  selection: InteractionSelection | null;
  tileState: TileState | null;
  actionLabel: string;
  actionEnabled: boolean;
}

// ── Constants ───────────────────────────────────────────────────────────────

/** Max distance (in grid tiles) for NPC interaction. */
const NPC_INTERACT_RANGE = 2.5;

// ── Selection store (external store for sync across components) ─────────

let currentSelection: InteractionSelection | null = null;
const listeners = new Set<() => void>();

function getSelection(): InteractionSelection | null {
  return currentSelection;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setSelection(sel: InteractionSelection | null): void {
  currentSelection = sel;
  for (const listener of listeners) {
    listener();
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Convert world position to grid coords (round to nearest integer). */
export function worldToGrid(worldX: number, worldZ: number): { gridX: number; gridZ: number } {
  return {
    gridX: Math.round(worldX),
    gridZ: Math.round(worldZ),
  };
}

/** Find a rock entity at a given grid position (chunk-based replacement for gridCell type lookup). */
function findRockAtGrid(gridX: number, gridZ: number): Entity | null {
  for (const rock of rocksQuery) {
    if (
      rock.position &&
      Math.round(rock.position.x) === gridX &&
      Math.round(rock.position.z) === gridZ
    ) {
      return rock;
    }
  }
  return null;
}

/** Find a tree entity at a given grid position. */
function findTreeAtGrid(gridX: number, gridZ: number): Entity | null {
  for (const tree of treesQuery) {
    if (
      tree.position &&
      Math.round(tree.position.x) === gridX &&
      Math.round(tree.position.z) === gridZ
    ) {
      return tree;
    }
  }
  return null;
}

/** Find an NPC entity near a given grid position. */
function findNpcNear(gridX: number, gridZ: number): Entity | null {
  let closest: Entity | null = null;
  let closestDist = NPC_INTERACT_RANGE;

  for (const npc of npcsQuery) {
    if (!npc.position) continue;
    const dx = npc.position.x - gridX;
    const dz = npc.position.z - gridZ;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < closestDist) {
      closestDist = dist;
      closest = npc;
    }
  }
  return closest;
}

/** Find a campfire entity at a given grid position. */
function findCampfireAtGrid(gridX: number, gridZ: number): Entity | null {
  for (const e of campfiresQuery) {
    if (e.position && Math.round(e.position.x) === gridX && Math.round(e.position.z) === gridZ) {
      return e;
    }
  }
  return null;
}

/** Find a forge structure entity at a given grid position (effectType === "forging"). */
function findForgeAtGrid(gridX: number, gridZ: number): Entity | null {
  for (const e of structuresQuery) {
    if (
      e.structure?.effectType === "forging" &&
      e.position &&
      Math.round(e.position.x) === gridX &&
      Math.round(e.position.z) === gridZ
    ) {
      return e;
    }
  }
  return null;
}

/** Find a water body entity at a given grid position. */
function findWaterAtGrid(gridX: number, gridZ: number): Entity | null {
  for (const e of waterBodiesQuery) {
    if (e.position && Math.round(e.position.x) === gridX && Math.round(e.position.z) === gridZ) {
      return e;
    }
  }
  return null;
}

/** Find a trap entity at a given grid position. */
function findTrapAtGrid(gridX: number, gridZ: number): Entity | null {
  for (const e of trapsQuery) {
    if (e.position && Math.round(e.position.x) === gridX && Math.round(e.position.z) === gridZ) {
      return e;
    }
  }
  return null;
}

/** Check if the player is within interaction range of a position. */
function _isPlayerInRange(gridX: number, gridZ: number, range: number): boolean {
  const player = playerQuery.first;
  if (!player?.position) return true; // If no player entity, allow action
  const dx = player.position.x - gridX;
  const dz = player.position.z - gridZ;
  return Math.sqrt(dx * dx + dz * dz) <= range;
}

/** Build TileState from current selection using chunk-based entity lookups. */
function buildTileState(sel: InteractionSelection | null): TileState | null {
  if (!sel) return null;

  const tree = findTreeAtGrid(sel.gridX, sel.gridZ);
  const rock = findRockAtGrid(sel.gridX, sel.gridZ);

  return {
    occupied: !!tree || !!rock,
    treeStage: tree?.tree?.stage ?? -1,
    cellType: rock ? "rock" : "soil",
  };
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useInteraction() {
  const selection = useSyncExternalStore(subscribe, getSelection, getSelection);
  const _selectedTool = useGameStore((s) => s.selectedTool);
  const _selectedSpecies = useGameStore((s) => s.selectedSpecies);

  // Debounce ref to prevent rapid double-taps
  const lastActionTime = useRef(0);

  // ── Ground tap handler ──────────────────────────────────────────────────

  const onGroundTap = useCallback((event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    const point = event.point;
    const { gridX, gridZ } = worldToGrid(point.x, point.z);

    // Check if there's a tree at this position first
    const tree = findTreeAtGrid(gridX, gridZ);
    if (tree) {
      setSelection({ type: "tree", gridX, gridZ, entityId: tree.id });
      return;
    }

    // Check for campfire (cooking station)
    const campfire = findCampfireAtGrid(gridX, gridZ);
    if (campfire) {
      setSelection({ type: "campfire", gridX, gridZ, entityId: campfire.id });
      return;
    }

    // Check for forge structure
    const forge = findForgeAtGrid(gridX, gridZ);
    if (forge) {
      setSelection({ type: "forge", gridX, gridZ, entityId: forge.id });
      return;
    }

    // Check for water body (fishing)
    const water = findWaterAtGrid(gridX, gridZ);
    if (water) {
      setSelection({ type: "water", gridX, gridZ, entityId: water.id });
      return;
    }

    // Check for placed trap entity
    const trap = findTrapAtGrid(gridX, gridZ);
    if (trap) {
      setSelection({ type: "trap", gridX, gridZ, entityId: trap.id });
      return;
    }

    // Check for NPC nearby
    const npc = findNpcNear(gridX, gridZ);
    if (npc) {
      setSelection({
        type: "npc",
        gridX: Math.round(npc.position?.x ?? 0),
        gridZ: Math.round(npc.position?.z ?? 0),
        entityId: npc.id,
      });
      return;
    }

    // Otherwise select the tile
    setSelection({ type: "tile", gridX, gridZ, entityId: null });
  }, []);

  // ── Tree tap handler ────────────────────────────────────────────────────

  const onTreeTap = useCallback((entityId: string, worldX: number, worldZ: number) => {
    const { gridX, gridZ } = worldToGrid(worldX, worldZ);
    setSelection({
      type: "tree",
      gridX,
      gridZ,
      entityId,
    });
  }, []);

  // ── NPC tap handler ─────────────────────────────────────────────────────

  const onNpcTap = useCallback((entityId: string, worldX: number, worldZ: number) => {
    const { gridX, gridZ } = worldToGrid(worldX, worldZ);
    setSelection({
      type: "npc",
      gridX,
      gridZ,
      entityId,
    });
  }, []);

  // ── Execute action on selected entity ───────────────────────────────────

  const executeAction = useCallback(() => {
    if (!selection) return;

    // Debounce: 300ms between actions
    const now = Date.now();
    if (now - lastActionTime.current < 300) return;
    lastActionTime.current = now;

    const store = useGameStore.getState();
    const tool = store.selectedTool;
    const species = store.selectedSpecies;

    // Spend stamina for the tool action
    if (!spendToolStamina(tool)) {
      showToast("Not enough stamina!", "info");
      return;
    }

    switch (tool) {
      case "trowel": {
        if (selection.type === "tile") {
          const success = plantTree(species, selection.gridX, selection.gridZ);
          if (success) {
            showToast(`Planted ${species}!`, "success");
            store.incrementToolUse("trowel");
            store.incrementSeasonalPlanting(store.currentSeason);
            store.trackSpeciesPlanting(species);
            store.advanceQuestObjective("trees_planted", 1);
            store.advanceEventChallenge("plant", 1);
          } else {
            // Refund stamina since action failed
            const toolData = getToolById(tool);
            if (toolData) store.setStamina(store.stamina + toolData.staminaCost);
            showToast("Can't plant here", "info");
          }
        }
        break;
      }

      case "watering-can": {
        if (selection.type === "tree" && selection.entityId) {
          const success = waterTree(selection.entityId);
          if (success) {
            showToast("Watered!", "success");
            store.incrementToolUse("watering-can");
            store.advanceQuestObjective("trees_watered", 1);
            store.advanceEventChallenge("water", 1);
          } else {
            const toolData = getToolById(tool);
            if (toolData) store.setStamina(store.stamina + toolData.staminaCost);
            showToast("Already watered", "info");
          }
        }
        break;
      }

      case "axe": {
        if (selection.type === "tree" && selection.entityId) {
          const resources = harvestTree(selection.entityId);
          if (resources) {
            const summary = resources.map((r) => `+${r.amount} ${r.type}`).join(", ");
            showToast(`Harvested! ${summary}`, "success");
            store.incrementToolUse("axe");
            store.incrementSeasonalHarvest(store.currentSeason);

            // Track species harvest in codex
            const tree = findTreeAtGrid(selection.gridX, selection.gridZ);
            if (tree?.tree) {
              const totalYield = resources.reduce((s, r) => s + r.amount, 0);
              store.trackSpeciesHarvest(tree.tree.speciesId, totalYield);
            }

            store.advanceQuestObjective("trees_harvested", 1);
            store.advanceEventChallenge("harvest", 1);
            // Clear selection since tree is removed
            setSelection(null);
          } else {
            const toolData = getToolById(tool);
            if (toolData) store.setStamina(store.stamina + toolData.staminaCost);
            showToast("Not ready to harvest", "info");
          }
        }
        break;
      }

      case "pruning-shears": {
        if (selection.type === "tree" && selection.entityId) {
          const success = pruneTree(selection.entityId);
          if (success) {
            showToast("Pruned! Next harvest will yield more.", "success");
            store.incrementToolUse("pruning-shears");
          } else {
            const toolData = getToolById(tool);
            if (toolData) store.setStamina(store.stamina + toolData.staminaCost);
            showToast("Can't prune this tree", "info");
          }
        }
        break;
      }

      case "shovel": {
        if (selection.type === "tile") {
          const success = clearRock(selection.gridX, selection.gridZ);
          if (success) {
            showToast("Rock cleared!", "success");
            store.incrementToolUse("shovel");
          } else {
            const toolData = getToolById(tool);
            if (toolData) store.setStamina(store.stamina + toolData.staminaCost);
            showToast("Nothing to clear", "info");
          }
        }
        break;
      }

      case "compost-bin": {
        if (selection.type === "tree" && selection.entityId) {
          const success = fertilizeTree(selection.entityId);
          if (success) {
            showToast("Fertilized! 2x growth this stage.", "success");
            store.incrementToolUse("compost-bin");
          } else {
            const toolData = getToolById(tool);
            if (toolData) store.setStamina(store.stamina + toolData.staminaCost);
            showToast("Can't fertilize", "info");
          }
        }
        break;
      }

      // ── Crafting station interactions ──────────────────────────────────

      case "pick": {
        // Mining: pick on a rock entity → MINE verb
        if (selection.type === "tile" && selection.entityId === null) {
          const rockEntity = findRockAtGrid(selection.gridX, selection.gridZ);
          if (rockEntity) {
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
              const toolData = getToolById(tool);
              if (toolData) store.setStamina(store.stamina + toolData.staminaCost);
              showToast("Not enough stamina to mine", "info");
            }
          }
        }
        break;
      }

      case "fishing-rod": {
        // Fishing: fishing-rod on a water body entity
        if (selection.type === "water" && selection.entityId) {
          const waterEntity = (() => {
            for (const e of waterBodiesQuery) {
              if (e.id === selection.entityId) return e;
            }
            return null;
          })();
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
            const toolData = getToolById(tool);
            if (toolData) store.setStamina(store.stamina + toolData.staminaCost);
            showToast("Can't fish here", "info");
          }
        }
        break;
      }

      case "trap": {
        // Trap placement: trap item on empty ground
        if ((selection.type === "tile" || selection.type === null) && selection.entityId === null) {
          const selectedTrapType = store.selectedTool; // trap sub-type from tool selection
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
            const toolData = getToolById(tool);
            if (toolData) store.setStamina(store.stamina + toolData.staminaCost);
            showToast("Can't place trap here", "info");
          }
        }
        break;
      }

      case "hammer": {
        // Kitbash build mode: hammer on any ground target opens the build panel
        const success = dispatchAction({
          toolId: "hammer",
          targetType: selection.type === "tile" ? "soil" : null,
          gridX: selection.gridX,
          gridZ: selection.gridZ,
        });
        if (success) {
          showToast("Build mode opened", "info");
        }
        break;
      }

      default: {
        // Campfire and forge activate regardless of held tool
        if (selection.type === "campfire" && selection.entityId) {
          const campfireEnt = (() => {
            for (const e of campfiresQuery) {
              if (e.id === selection.entityId) return e;
            }
            return null;
          })();
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
          const forgeEnt = (() => {
            for (const e of structuresQuery) {
              if (e.id === selection.entityId) return e;
            }
            return null;
          })();
          // Wrap as ForgeEntity shape for the dispatcher
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
          const trapEnt = (() => {
            for (const e of trapsQuery) {
              if (e.id === selection.entityId) return e;
            }
            return null;
          })();
          const success = dispatchAction({
            toolId: tool,
            targetType: "trap",
            entity: trapEnt ?? undefined,
          });
          if (success) {
            showToast("Trap checked!", "success");
          }
        }
        break;
      }
    }
  }, [selection]);

  // ── Compute derived state ───────────────────────────────────────────────

  const tileState = buildTileState(selection);

  // Clear selection if nothing is tapped
  const clearSelection = useCallback(() => {
    setSelection(null);
  }, []);

  return {
    selection,
    tileState,
    onGroundTap,
    onTreeTap,
    onNpcTap,
    executeAction,
    clearSelection,
  };
}
