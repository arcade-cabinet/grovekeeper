/**
 * Zone Archetypes -- Templates for procedural zone generation.
 *
 * Each archetype defines the rules and constraints for generating
 * a particular type of zone: size ranges, tile distributions,
 * prop placement, and wild tree populations.
 */

import type { GroundMaterial, ZoneType } from "./types";

export interface ZoneArchetype {
  id: string;
  type: ZoneType;
  name: string;
  sizeRange: {
    minWidth: number;
    maxWidth: number;
    minHeight: number;
    maxHeight: number;
  };
  groundMaterial: GroundMaterial;
  tileRules: { waterPct: number; rockPct: number; pathPct: number };
  possibleProps: { value: string; weight: number }[];
  plantable: boolean;
  wildTrees?: { speciesId: string; weight: number }[];
  wildTreeDensity?: number;
  propDensity?: number;
}

export const ZONE_ARCHETYPES: ZoneArchetype[] = [
  {
    id: "grove",
    type: "grove",
    name: "Grove",
    sizeRange: { minWidth: 10, maxWidth: 14, minHeight: 10, maxHeight: 14 },
    groundMaterial: "soil",
    tileRules: { waterPct: 0.05, rockPct: 0.03, pathPct: 0.02 },
    possibleProps: [
      { value: "wild-flowers", weight: 3 },
      { value: "mushroom-cluster", weight: 1 },
      { value: "stump", weight: 1 },
    ],
    plantable: true,
    propDensity: 0.02,
  },
  {
    id: "wild-forest",
    type: "forest",
    name: "Wild Forest",
    sizeRange: { minWidth: 8, maxWidth: 12, minHeight: 8, maxHeight: 12 },
    groundMaterial: "grass",
    tileRules: { waterPct: 0.02, rockPct: 0.05, pathPct: 0.05 },
    possibleProps: [
      { value: "fallen-log", weight: 3 },
      { value: "mushroom-cluster", weight: 2 },
      { value: "boulder", weight: 2 },
      { value: "wild-flowers", weight: 1 },
      { value: "stump", weight: 2 },
    ],
    plantable: false,
    wildTrees: [
      { speciesId: "white-oak", weight: 3 },
      { speciesId: "flame-maple", weight: 2 },
      { speciesId: "elder-pine", weight: 2 },
      { speciesId: "baobab", weight: 1 },
    ],
    wildTreeDensity: 0.3,
    propDensity: 0.05,
  },
  {
    id: "clearing",
    type: "clearing",
    name: "Clearing",
    sizeRange: { minWidth: 6, maxWidth: 10, minHeight: 6, maxHeight: 10 },
    groundMaterial: "grass",
    tileRules: { waterPct: 0.08, rockPct: 0.01, pathPct: 0 },
    possibleProps: [
      { value: "wild-flowers", weight: 5 },
      { value: "boulder", weight: 1 },
      { value: "campfire", weight: 1 },
    ],
    plantable: true,
    propDensity: 0.03,
  },
  {
    id: "trail",
    type: "path",
    name: "Trail",
    sizeRange: { minWidth: 3, maxWidth: 4, minHeight: 6, maxHeight: 10 },
    groundMaterial: "dirt",
    tileRules: { waterPct: 0, rockPct: 0.02, pathPct: 0.6 },
    possibleProps: [
      { value: "fallen-log", weight: 2 },
      { value: "mushroom-cluster", weight: 1 },
      { value: "signpost", weight: 1 },
      { value: "lantern", weight: 2 },
    ],
    plantable: false,
    propDensity: 0.03,
  },
  {
    id: "settlement",
    type: "settlement",
    name: "Settlement",
    sizeRange: { minWidth: 6, maxWidth: 8, minHeight: 6, maxHeight: 8 },
    groundMaterial: "stone",
    tileRules: { waterPct: 0, rockPct: 0, pathPct: 0.3 },
    possibleProps: [
      { value: "boulder", weight: 1 },
      { value: "lantern", weight: 3 },
      { value: "fence-section", weight: 2 },
      { value: "birdbath", weight: 1 },
      { value: "campfire", weight: 1 },
      { value: "signpost", weight: 1 },
    ],
    plantable: false,
    propDensity: 0.04,
  },
];

/** Look up an archetype by its ID. */
export function getArchetype(id: string): ZoneArchetype | undefined {
  return ZONE_ARCHETYPES.find((a) => a.id === id);
}
