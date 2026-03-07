/**
 * MiniMap -- re-export barrel.
 * Implementation lives in ./minimap/ subpackage (Spec §17.6).
 */

export type {
  MiniMapProps,
  MinimapLabyrinth,
  MinimapSnapshot,
  MinimapSpirit,
  MinimapSVGProps,
} from "./minimap/index.ts";
export { MiniMap, MinimapSVG, readMinimapSnapshot } from "./minimap/index.ts";
