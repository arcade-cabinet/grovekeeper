/**
 * villageLayout/lots.ts
 *
 * Lot geometry + blueprint selection for the village street-grid system.
 * Spec §43.1 (lot subdivision) and §43.2 (blueprint pool per village size).
 */

import structuresConfig from "@/config/game/structures.json" with { type: "json" };
import type { BlueprintId } from "@/game/ecs/components/structures";
import type { BuildingLot } from "./types.ts";

// ── Config refs ───────────────────────────────────────────────────────────────

const STREET_WIDTH: number = structuresConfig.villageLayout.streetWidth;
const LOT_MARGIN: number = structuresConfig.villageLayout.lotMargin;

// ── Blueprint pool ────────────────────────────────────────────────────────────

export interface BlueprintEntry {
  id: string;
  footprintW: number;
  footprintD: number;
  stories: number;
  materialType: string;
}

export const BLUEPRINT_POOL: BlueprintEntry[] = structuresConfig.blueprints as BlueprintEntry[];

export { LOT_MARGIN };

/**
 * Pick a BlueprintId from the pool using seeded RNG.
 *
 * Spec §43.2 village-size rules:
 *   - Small (≤3 buildings): anchor slots go to cottage / storehouse first.
 *   - Medium (4–5): also include inn / forge in anchor slots.
 *   - Large (6+): unrestricted full-pool selection.
 *
 * @param rng           Seeded RNG stream.
 * @param buildingCount Total number of building lots (drives size tier).
 * @param index         Slot index — anchor slots use limited pool.
 */
export function pickBlueprintId(
  rng: () => number,
  buildingCount: number,
  index: number,
): BlueprintId {
  let eligible: BlueprintEntry[];
  if (buildingCount <= 3) {
    const anchors = BLUEPRINT_POOL.filter((b) => b.id === "cottage" || b.id === "storehouse");
    eligible = index < anchors.length ? anchors : BLUEPRINT_POOL;
  } else if (buildingCount <= 5) {
    const anchors = BLUEPRINT_POOL.filter(
      (b) => b.id === "cottage" || b.id === "storehouse" || b.id === "inn" || b.id === "forge",
    );
    eligible = index < anchors.length ? anchors : BLUEPRINT_POOL;
  } else {
    eligible = BLUEPRINT_POOL;
  }
  return eligible[Math.floor(rng() * eligible.length)].id as BlueprintId;
}

/**
 * Divide the grid into rectangular lots separated by street axes.
 *
 * Returns lots in grid-local coordinates (origin at (0,0) of the grid).
 * The caller translates to chunk-local coords by adding gridOriginX / gridOriginZ.
 *
 * Spec §43.1 step 2: streets create 2–4 building lots depending on
 * whether a cross street is present.
 *
 * @param gridW          Grid width in tiles.
 * @param gridD          Grid depth in tiles.
 * @param hasCrossStreet Whether a perpendicular cross street is generated.
 */
export function buildLots(gridW: number, gridD: number, hasCrossStreet: boolean): BuildingLot[] {
  const halfW = gridW / 2;
  const halfD = gridD / 2;
  const lots: BuildingLot[] = [];
  const sw = STREET_WIDTH;

  // Main street runs along the longest axis through the grid center.
  const mainAlongX = gridW >= gridD;

  if (mainAlongX) {
    if (hasCrossStreet) {
      const lotW = halfW - sw / 2;
      const lotD = halfD - sw / 2;
      lots.push({ x: 0, z: 0, w: lotW, d: lotD, facing: 180 });
      lots.push({ x: halfW + sw / 2, z: 0, w: lotW, d: lotD, facing: 180 });
      lots.push({ x: 0, z: halfD + sw / 2, w: lotW, d: lotD, facing: 0 });
      lots.push({ x: halfW + sw / 2, z: halfD + sw / 2, w: lotW, d: lotD, facing: 0 });
    } else {
      lots.push({ x: 0, z: 0, w: gridW, d: halfD - sw / 2, facing: 180 });
      lots.push({ x: 0, z: halfD + sw / 2, w: gridW, d: halfD - sw / 2, facing: 0 });
    }
  } else {
    if (hasCrossStreet) {
      const lotW = halfW - sw / 2;
      const lotD = halfD - sw / 2;
      lots.push({ x: 0, z: 0, w: lotW, d: lotD, facing: 90 });
      lots.push({ x: halfW + sw / 2, z: 0, w: lotW, d: lotD, facing: 270 });
      lots.push({ x: 0, z: halfD + sw / 2, w: lotW, d: lotD, facing: 90 });
      lots.push({ x: halfW + sw / 2, z: halfD + sw / 2, w: lotW, d: lotD, facing: 270 });
    } else {
      lots.push({ x: 0, z: 0, w: halfW - sw / 2, d: gridD, facing: 90 });
      lots.push({ x: halfW + sw / 2, z: 0, w: halfW - sw / 2, d: gridD, facing: 270 });
    }
  }

  return lots;
}
