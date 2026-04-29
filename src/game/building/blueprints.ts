/**
 * Blueprint registry — declarative voxel layouts for every blueprint
 * the crafting system can produce.
 *
 * Keep these tiny and grounded: blueprints are scope-locked to actual
 * voxel ids in the biome registries. The Hearth is the only multi-
 * block shape for RC; the rest are single-cube placements that still
 * exercise the placement loop end-to-end.
 *
 * Block ids reference biome blocks — the placement layer will fall
 * back to the surrounding chunk's biome at place time so a hearth
 * dropped in a forest grove uses forest stone rather than meadow
 * stone. For RC scope the layout offsets are biome-agnostic.
 */

import type { Blueprint } from "./types";

/**
 * Hearth — the spec's signature first build. 4 stones in a 2x2 base
 * footprint, capped with a "coals" voxel at the centre. We use
 * meadow's `meadow.stone` for the base and `meadow.dirt` for the coals
 * placeholder — RC's biome atlases don't yet expose a `hearth-coals`
 * tile, and the spec's "scope-locked to RC's actual asset inventory"
 * rule explicitly forbids inventing tiles we can't render. The claim
 * ritual swaps the placeholder for a fire shader / lit-coals material.
 */
const HEARTH: Blueprint = {
  id: "blueprint.hearth",
  name: "Hearth",
  structureType: "hearth",
  blocks: [
    { dx: 0, dy: 0, dz: 0, blockId: "meadow.stone" },
    { dx: 1, dy: 0, dz: 0, blockId: "meadow.stone" },
    { dx: 0, dy: 0, dz: 1, blockId: "meadow.stone" },
    { dx: 1, dy: 0, dz: 1, blockId: "meadow.stone" },
    // Centre coals — sits on top of the 2x2 base.
    { dx: 0, dy: 1, dz: 0, blockId: "meadow.dirt" },
  ],
};

const FENCE_SECTION: Blueprint = {
  id: "blueprint.fence-section",
  name: "Fence Section",
  structureType: "fence",
  blocks: [
    { dx: 0, dy: 0, dz: 0, blockId: "meadow.dirt" },
    { dx: 1, dy: 0, dz: 0, blockId: "meadow.dirt" },
  ],
};

const COOKING_FIRE: Blueprint = {
  id: "blueprint.cooking-fire",
  name: "Cooking Fire",
  structureType: "cooking-fire",
  blocks: [{ dx: 0, dy: 0, dz: 0, blockId: "meadow.stone" }],
};

const STONE_BLOCK: Blueprint = {
  id: "blueprint.stone-block",
  name: "Stone Block",
  structureType: "stone-block",
  blocks: [{ dx: 0, dy: 0, dz: 0, blockId: "meadow.stone" }],
};

const PLANK_WALL: Blueprint = {
  id: "blueprint.plank-wall",
  name: "Plank Wall",
  structureType: "plank-wall",
  blocks: [
    { dx: 0, dy: 0, dz: 0, blockId: "meadow.dirt" },
    { dx: 0, dy: 1, dz: 0, blockId: "meadow.dirt" },
  ],
};

const WORKBENCH: Blueprint = {
  id: "blueprint.workbench",
  name: "Primitive Workbench",
  structureType: "primitive-workbench",
  blocks: [{ dx: 0, dy: 0, dz: 0, blockId: "meadow.dirt" }],
};

const BLUEPRINTS: Readonly<Record<string, Blueprint>> = {
  [HEARTH.id]: HEARTH,
  [FENCE_SECTION.id]: FENCE_SECTION,
  [COOKING_FIRE.id]: COOKING_FIRE,
  [STONE_BLOCK.id]: STONE_BLOCK,
  [PLANK_WALL.id]: PLANK_WALL,
  [WORKBENCH.id]: WORKBENCH,
};

/** Look up a blueprint by id. Returns null if unknown. */
export function getBlueprint(id: string): Blueprint | null {
  return BLUEPRINTS[id] ?? null;
}

/** All blueprints, in registration order. */
export function listBlueprints(): readonly Blueprint[] {
  return Object.values(BLUEPRINTS);
}
