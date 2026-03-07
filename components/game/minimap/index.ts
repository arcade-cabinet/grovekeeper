/**
 * Minimap subpackage barrel (Spec §17.6).
 *
 * Public surface for all minimap functionality. Consumers import from
 * "@/components/game/minimap" or "@/components/game/MiniMap" (re-export).
 */

export { MiniMap } from "./MiniMap";
export type { MiniMapProps } from "./MiniMap";

export { MiniMapOverlay } from "./Overlay";
export type { MiniMapOverlayProps } from "./Overlay";

export { MinimapSVG } from "./MinimapSVG";
export type { MinimapSVGProps } from "./MinimapSVG";

export { PulsingPlayerDot } from "./PulsingPlayerDot";

export { buildMinimapSnapshot, readMinimapSnapshot, VIEW_RADIUS } from "./snapshot";
export type { BuildSnapshotParams } from "./snapshot";

export type {
  MinimapChunk,
  MinimapCampfire,
  MinimapNpc,
  MinimapPlayer,
  MinimapSnapshot,
} from "./types";
