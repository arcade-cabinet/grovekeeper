/**
 * MiniMap -- re-export barrel.
 * Implementation lives in ./minimap/ subpackage (Spec §17.6).
 */
export { MiniMap, MinimapSVG, readMinimapSnapshot } from "./minimap/index";
export type { MiniMapProps, MinimapSVGProps, MinimapSnapshot, MinimapLabyrinth, MinimapSpirit } from "./minimap/index";
