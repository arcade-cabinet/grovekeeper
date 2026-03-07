/**
 * Minimap subpackage barrel (Spec §17.6).
 *
 * Public surface for all minimap functionality. Consumers import from
 * "@/components/game/minimap" or "@/components/game/MiniMap" (re-export).
 */

export type { MiniMapProps } from "./MiniMap.tsx";
export { MiniMap } from "./MiniMap.tsx";
export type { MinimapSVGProps } from "./MinimapSVG.tsx";
export { MinimapSVG } from "./MinimapSVG.tsx";
export type { MiniMapOverlayProps } from "./Overlay.tsx";
export { MiniMapOverlay } from "./Overlay.tsx";

export { PulsingPlayerDot } from "./PulsingPlayerDot.tsx";
export type { BuildSnapshotParams } from "./snapshot.ts";
export { buildMinimapSnapshot, readMinimapSnapshot, VIEW_RADIUS } from "./snapshot.ts";

export type {
  MinimapCampfire,
  MinimapChunk,
  MinimapLabyrinth,
  MinimapNpc,
  MinimapPlayer,
  MinimapSnapshot,
  MinimapSpirit,
} from "./types.ts";
