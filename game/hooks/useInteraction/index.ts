/**
 * useInteraction -- R3F interaction hook for tile/tree/NPC selection and game actions.
 *
 * Bridges pointer events from R3F mesh components to headless GameActions.
 * Tracks which entity (tile, tree, NPC) is currently selected and determines
 * available actions based on selected entity + current tool.
 */

import type { ThreeEvent } from "@react-three/fiber";
import { useCallback, useRef, useSyncExternalStore } from "react";
import { spendToolStamina } from "@/game/actions";
import { useGameStore } from "@/game/stores";
import { showToast } from "@/game/ui/Toast";
import {
  handleAxeAction,
  handleCompostBinAction,
  handleDefaultAction,
  handleFishingRodAction,
  handleHammerAction,
  handlePickAction,
  handlePruningShears,
  handleShovelAction,
  handleTrapPlacementAction,
  handleTrowelAction,
  handleWateringCanAction,
} from "./actionHandlers.ts";
import {
  buildTileState,
  findCampfireAtGrid,
  findForgeAtGrid,
  findNpcNear,
  findTrapAtGrid,
  findTreeAtGrid,
  findWaterAtGrid,
  worldToGrid,
} from "./entityFinders.ts";
import { getSelection, setSelection, subscribe } from "./selectionStore.ts";

export { worldToGrid } from "./entityFinders.ts";
export type { InteractionSelection, InteractionState, SelectionType } from "./types.ts";

export function useInteraction() {
  const selection = useSyncExternalStore(subscribe, getSelection, getSelection);
  const _selectedTool = useGameStore((s) => s.selectedTool);
  const _selectedSpecies = useGameStore((s) => s.selectedSpecies);

  const lastActionTime = useRef(0);

  // ── Ground tap handler ──────────────────────────────────────────────────

  const onGroundTap = useCallback((event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    const point = event.point;
    const { gridX, gridZ } = worldToGrid(point.x, point.z);

    const tree = findTreeAtGrid(gridX, gridZ);
    if (tree) {
      setSelection({ type: "tree", gridX, gridZ, entityId: tree.id });
      return;
    }

    const campfire = findCampfireAtGrid(gridX, gridZ);
    if (campfire) {
      setSelection({ type: "campfire", gridX, gridZ, entityId: campfire.id });
      return;
    }

    const forge = findForgeAtGrid(gridX, gridZ);
    if (forge) {
      setSelection({ type: "forge", gridX, gridZ, entityId: forge.id });
      return;
    }

    const water = findWaterAtGrid(gridX, gridZ);
    if (water) {
      setSelection({ type: "water", gridX, gridZ, entityId: water.id });
      return;
    }

    const trap = findTrapAtGrid(gridX, gridZ);
    if (trap) {
      setSelection({ type: "trap", gridX, gridZ, entityId: trap.id });
      return;
    }

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

    setSelection({ type: "tile", gridX, gridZ, entityId: null });
  }, []);

  // ── Tree tap handler ────────────────────────────────────────────────────

  const onTreeTap = useCallback((entityId: string, worldX: number, worldZ: number) => {
    const { gridX, gridZ } = worldToGrid(worldX, worldZ);
    setSelection({ type: "tree", gridX, gridZ, entityId });
  }, []);

  // ── NPC tap handler ─────────────────────────────────────────────────────

  const onNpcTap = useCallback((entityId: string, worldX: number, worldZ: number) => {
    const { gridX, gridZ } = worldToGrid(worldX, worldZ);
    setSelection({ type: "npc", gridX, gridZ, entityId });
  }, []);

  // ── Execute action on selected entity ───────────────────────────────────

  const executeAction = useCallback(() => {
    if (!selection) return;

    const now = Date.now();
    if (now - lastActionTime.current < 300) return;
    lastActionTime.current = now;

    const store = useGameStore.getState();
    const tool = store.selectedTool;
    const species = store.selectedSpecies;

    if (!spendToolStamina(tool)) {
      showToast("Not enough stamina!", "info");
      return;
    }

    switch (tool) {
      case "trowel":
        handleTrowelAction(selection, store, species, tool);
        break;
      case "watering-can":
        handleWateringCanAction(selection, store, tool);
        break;
      case "axe":
        handleAxeAction(selection, store, tool);
        break;
      case "pruning-shears":
        handlePruningShears(selection, store, tool);
        break;
      case "shovel":
        handleShovelAction(selection, store, tool);
        break;
      case "compost-bin":
        handleCompostBinAction(selection, store, tool);
        break;
      case "pick":
        handlePickAction(selection, store, tool);
        break;
      case "fishing-rod":
        handleFishingRodAction(selection, store, tool);
        break;
      case "trap":
        handleTrapPlacementAction(selection, store, tool);
        break;
      case "hammer":
        handleHammerAction(selection);
        break;
      default:
        handleDefaultAction(selection, tool);
        break;
    }
  }, [selection]);

  // ── Derived state ───────────────────────────────────────────────────────

  const tileState = buildTileState(selection);

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
