/**
 * Building / voxel-placement types.
 *
 * Building is the "consumption" half of the production/consumption
 * loop: a blueprint produced by crafting (e.g. `blueprint.hearth`) is
 * placed by the player as one or more voxels into the live chunk
 * grid. Each blueprint maps to a small set of `(dx, dy, dz, blockId)`
 * offsets relative to the placement anchor — multi-block shapes (like
 * the Hearth) are stamped as a unit.
 */

/** A single voxel a blueprint stamps relative to its anchor. */
export interface BlueprintBlock {
  /** Offset from the anchor in voxel units. */
  dx: number;
  dy: number;
  dz: number;
  /** Block id name from a biome definition (e.g. "meadow.stone"). */
  blockId: string;
}

/** A blueprint definition — what a blueprint item turns into when placed. */
export interface Blueprint {
  /** Item id, e.g. "blueprint.hearth". */
  id: string;
  /** Display label for the place-mode HUD ("Hearth", "Fence Section"). */
  name: string;
  /** Block layout, anchored at (0,0,0). */
  blocks: BlueprintBlock[];
  /**
   * Structure type label written to `placedStructures.type`. Lets the
   * persistence row carry semantic identity even if the voxel blocks
   * are biome-flavored / re-themed.
   */
  structureType: string;
}

/** A world-space voxel coordinate. */
export interface VoxelCoord {
  x: number;
  y: number;
  z: number;
}

/** State of the place-mode state machine. */
export type PlaceModeState =
  | { kind: "idle" }
  | {
      kind: "placing";
      blueprintId: string;
      /** Anchor voxel the ghost preview is hovering over. */
      anchor: VoxelCoord;
    };
