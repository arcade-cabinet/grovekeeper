/**
 * Kitbashing commit -- place a building piece and deduct resources. Spec §35.4.
 *
 * Pure function with minimal interfaces so it can be tested without React,
 * WebGL, or native modules. Production callers inject the real ECS world,
 * Rapier world, and game store; tests inject jest.fn() mocks.
 */

import buildingConfig from "../../../config/game/building.json" with { type: "json" };
import type { ResourceType } from "../../config/resources.ts";
import type { ModularPieceComponent } from "../../ecs/components/building.ts";
import type { Entity } from "../../ecs/world.ts";
import { GRID_SIZE } from "./placement.ts";
import type { KitbashRapierModule, KitbashRapierWorld } from "./rapier.ts";
import { validatePlacementWithRapier } from "./rapier.ts";

// ---------------------------------------------------------------------------
// Minimal interfaces (Spec §35.4)
// ---------------------------------------------------------------------------

/**
 * Minimal ECS world interface for piece placement.
 * Production: `world as unknown as KitbashPlacementWorld`
 * Tests: `{ add: jest.fn() }`
 */
export interface KitbashPlacementWorld {
  add(entity: {
    id: string;
    modularPiece: ModularPieceComponent;
    position: { x: number; y: number; z: number };
  }): unknown;
}

/**
 * Minimal store interface for resource deduction.
 * Production: `useGameStore.getState()`
 * Tests: inline mock object with spendResource jest.fn()
 */
export interface KitbashCommitStore {
  /** Current resource counts keyed by resource type string. */
  resources: Record<string, number>;
  /** Deduct `amount` of `type` from inventory. Returns false if insufficient. */
  spendResource(type: ResourceType, amount: number): boolean;
  /** Game difficulty — "explore" skips resource cost (Spec §37). */
  difficulty: string;
}

// ---------------------------------------------------------------------------
// Build cost lookup (mirrors buildPanelUtils.getBuildCost without the
// components/ import that would violate the game/ → components/ rule)
// ---------------------------------------------------------------------------

const _buildCosts = buildingConfig.buildCosts as Record<
  string,
  Record<string, Record<string, number>>
>;

function getBuildCostForPiece(pieceType: string, material: string): Record<string, number> {
  return (_buildCosts[pieceType]?.[material] ?? {}) as Record<string, number>;
}

// ---------------------------------------------------------------------------
// placeModularPiece (Spec §35.4)
// ---------------------------------------------------------------------------

/**
 * Commit placement of a building piece.
 *
 * Steps:
 * 1. Re-validate via Rapier (ghost may have gone stale between preview and confirm).
 * 2. Pre-check all resource costs atomically (all-or-nothing).
 * 3. Spend each resource.
 * 4. Create the ECS entity at the computed world position.
 *
 * Returns `true` on success, `false` on rejection (invalid snap or insufficient
 * resources). In "explore" difficulty, resource cost is skipped (Spec §37).
 */
export function placeModularPiece(
  piece: ModularPieceComponent,
  existingPieces: Entity[],
  rapierWorld: KitbashRapierWorld,
  rapier: KitbashRapierModule,
  ecsWorld: KitbashPlacementWorld,
  genId: () => string,
  store: KitbashCommitStore,
): boolean {
  // Step 1: Re-validate snap + clearance + ground via Rapier
  if (!validatePlacementWithRapier(piece, existingPieces, rapierWorld, rapier)) {
    return false;
  }

  // Step 2 & 3: Resource check + deduction (skipped in Exploration mode)
  if (store.difficulty !== "seedling") {
    const cost = getBuildCostForPiece(piece.pieceType, piece.materialType);
    const entries = Object.entries(cost);

    // Pre-check all resources before spending any (atomic)
    for (const [res, amount] of entries) {
      if ((store.resources[res] ?? 0) < amount) return false;
    }

    // All resources confirmed — spend them
    for (const [res, amount] of entries) {
      store.spendResource(res as ResourceType, amount);
    }
  }

  // Step 4: Create the ECS entity at grid → world position
  ecsWorld.add({
    id: genId(),
    modularPiece: piece,
    position: {
      x: piece.gridX * GRID_SIZE,
      y: piece.gridY * GRID_SIZE,
      z: piece.gridZ * GRID_SIZE,
    },
  });

  return true;
}
