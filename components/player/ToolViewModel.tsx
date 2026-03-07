/**
 * ToolViewModel — first-person held tool model, fixed to camera (Spec §11).
 *
 * Reads the selected tool from the game store, resolves the GLB path from
 * config/game/toolVisuals.json, and renders the model in camera space via
 * R3F createPortal so it moves with the camera automatically.
 *
 * Only tools that have a GLB mapping in toolVisuals.json are rendered.
 * Tools with no model are silently hidden (no placeholder boxes — Spec §11).
 */

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { createPortal, useThree } from "@react-three/fiber";

import toolVisualsData from "@/config/game/toolVisuals.json" with { type: "json" };
import { useGameStore } from "@/game/stores/gameStore";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ToolVisualEntry {
  readonly glbPath: string;
  readonly offset: readonly number[];
  readonly scale: number;
  readonly useAnimation: string;
  readonly useDuration: number;
}

/** Index-signature type so functions can look up arbitrary tool IDs at runtime. */
type ToolVisualsConfig = { readonly [toolId: string]: ToolVisualEntry | undefined };

// ---------------------------------------------------------------------------
// Pure mapping functions (exported for testing — no R3F context needed)
// ---------------------------------------------------------------------------

/**
 * Returns the GLB path for a tool, or null if no model exists in the config (Spec §11).
 * Tools without a GLB mapping are not rendered — no placeholder fallbacks.
 */
export function resolveToolGLBPath(
  toolId: string,
  config: ToolVisualsConfig,
): string | null {
  return config[toolId]?.glbPath ?? null;
}

/**
 * Returns the full visual config entry for a tool, or null if not configured (Spec §11).
 */
export function resolveToolVisual(
  toolId: string,
  config: ToolVisualsConfig,
): ToolVisualEntry | null {
  return config[toolId] ?? null;
}

// ---------------------------------------------------------------------------
// Sub-component
// ---------------------------------------------------------------------------

interface ToolGLBModelProps {
  glbPath: string;
  offset: readonly number[];
  scale: number;
}

/**
 * Renders a tool GLB in camera space via R3F createPortal.
 *
 * This is a separate component so useGLTF is only called when a valid GLB path
 * is known (satisfies Rules of Hooks — parent conditionally mounts this).
 *
 * The scene is cloned via useMemo so the cached useGLTF object is never
 * stolen from another render location in the scene graph.
 */
const ToolGLBModel = ({ glbPath, offset, scale }: ToolGLBModelProps) => {
  const { scene } = useGLTF(glbPath);
  const { camera } = useThree();
  const clonedScene = useMemo(() => scene.clone(true), [scene]);

  return createPortal(
    <group
      position={[offset[0] ?? 0, offset[1] ?? 0, offset[2] ?? 0]}
      scale={[scale, scale, scale]}
    >
      <primitive object={clonedScene} />
    </group>,
    camera,
  );
};

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

/**
 * ToolViewModel renders the player's held tool in the lower-right of the FPS view (Spec §11).
 *
 * - Reads `selectedTool` from the game store.
 * - Resolves the GLB path and offset from config/game/toolVisuals.json.
 * - Portals the GLB group into the camera so it is fixed to the player's view.
 * - Returns null for tools with no GLB mapping (watering-can, almanac, etc.).
 */
export const ToolViewModel = () => {
  const selectedTool = useGameStore((s) => s.selectedTool);
  const config = toolVisualsData as ToolVisualsConfig;
  const glbPath = resolveToolGLBPath(selectedTool, config);
  const visual = resolveToolVisual(selectedTool, config);

  if (!glbPath || !visual) return null;

  return <ToolGLBModel glbPath={glbPath} offset={visual.offset} scale={visual.scale} />;
};
