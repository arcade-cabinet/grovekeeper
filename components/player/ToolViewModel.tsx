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

import { useMemo, useRef } from "react";
import type * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { createPortal, useFrame, useThree } from "@react-three/fiber";

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

interface SwayConfig {
  readonly swayAmount: number;
  readonly lerpFactor: number;
}

interface BobConfig {
  readonly bobHeight: number;
  readonly bobFrequency: number;
}

/**
 * Index-signature type covering tool entries and the top-level "sway"/"bob" config keys.
 * The union value type lets TypeScript accept toolVisuals.json directly.
 */
type ToolVisualsConfig = { readonly [toolId: string]: ToolVisualEntry | SwayConfig | BobConfig | undefined };

/** Narrows a config value to ToolVisualEntry (excludes SwayConfig, BobConfig, and undefined). */
function isToolVisualEntry(v: ToolVisualEntry | SwayConfig | BobConfig): v is ToolVisualEntry {
  return "glbPath" in v;
}

// ---------------------------------------------------------------------------
// Pure functions (exported for testing — no R3F context needed)
// ---------------------------------------------------------------------------

/**
 * Computes a new sway offset by lerping toward (velocity * swayAmount) (Spec §11).
 *
 * @param velocity      Player movement direction { x, z } (e.g. from input frame)
 * @param currentSway   Current accumulated sway { x, y } in camera space
 * @param swayAmount    Scale factor from config (toolVisuals.json sway.swayAmount)
 * @param lerpFactor    Smoothing speed from config (toolVisuals.json sway.lerpFactor)
 * @param deltaTime     Frame delta time in seconds
 * @returns             New sway { x, y } to apply as position offset
 */
export function computeSwayOffset(
  velocity: { x: number; z: number },
  currentSway: { x: number; y: number },
  swayAmount: number,
  lerpFactor: number,
  deltaTime: number,
): { x: number; y: number } {
  const targetX = velocity.x * swayAmount;
  const targetY = velocity.z * swayAmount;
  const t = Math.min(1, lerpFactor * deltaTime);
  return {
    x: currentSway.x + (targetX - currentSway.x) * t,
    y: currentSway.y + (targetY - currentSway.y) * t,
  };
}

/**
 * Computes vertical walk bob for the held tool (Spec §11).
 *
 * Returns bobHeight * sin(bobTime * bobFrequency) * speed.
 * The speed factor gates the amplitude so bob is zero when standing still.
 *
 * @param bobTime       Accumulated time in seconds (advances every frame)
 * @param bobHeight     Amplitude from config (toolVisuals.json bob.bobHeight)
 * @param bobFrequency  Frequency in rad/s from config (toolVisuals.json bob.bobFrequency)
 * @param speed         Movement speed factor 0..1 (derived from input moveDirection)
 * @returns             Vertical Y offset to add to tool position
 */
export function computeWalkBob(
  bobTime: number,
  bobHeight: number,
  bobFrequency: number,
  speed: number,
): number {
  return bobHeight * Math.sin(bobTime * bobFrequency) * speed;
}

/**
 * Returns the GLB path for a tool, or null if no model exists in the config (Spec §11).
 * Tools without a GLB mapping are not rendered — no placeholder fallbacks.
 */
export function resolveToolGLBPath(
  toolId: string,
  config: ToolVisualsConfig,
): string | null {
  const entry = config[toolId];
  if (!entry || !isToolVisualEntry(entry)) return null;
  return entry.glbPath;
}

/**
 * Returns the full visual config entry for a tool, or null if not configured (Spec §11).
 */
export function resolveToolVisual(
  toolId: string,
  config: ToolVisualsConfig,
): ToolVisualEntry | null {
  const entry = config[toolId];
  if (!entry || !isToolVisualEntry(entry)) return null;
  return entry;
}

// ---------------------------------------------------------------------------
// Sub-component
// ---------------------------------------------------------------------------

interface ToolGLBModelProps {
  glbPath: string;
  offset: readonly number[];
  scale: number;
  moveDirection: { x: number; z: number };
  swayAmount: number;
  lerpFactor: number;
  bobHeight: number;
  bobFrequency: number;
}

/**
 * Renders a tool GLB in camera space via R3F createPortal.
 *
 * Uses useFrame to apply velocity-based sway (Spec §11):
 * - Each frame lerps swayRef toward moveDirection * swayAmount
 * - Group position is set imperatively on the Three.js object (no React state)
 *
 * This is a separate component so useGLTF is only called when a valid GLB path
 * is known (satisfies Rules of Hooks — parent conditionally mounts this).
 */
const ToolGLBModel = ({ glbPath, offset, scale, moveDirection, swayAmount, lerpFactor, bobHeight, bobFrequency }: ToolGLBModelProps) => {
  const { scene } = useGLTF(glbPath);
  const { camera } = useThree();
  const clonedScene = useMemo(() => scene.clone(true), [scene]);
  const groupRef = useRef<THREE.Group>(null);
  const swayRef = useRef({ x: 0, y: 0 });
  const bobTimeRef = useRef(0);

  useFrame((_state, delta) => {
    const group = groupRef.current;
    if (!group) return;
    swayRef.current = computeSwayOffset(moveDirection, swayRef.current, swayAmount, lerpFactor, delta);
    bobTimeRef.current += delta;
    const speed = Math.min(1, Math.sqrt(moveDirection.x ** 2 + moveDirection.z ** 2));
    const bob = computeWalkBob(bobTimeRef.current, bobHeight, bobFrequency, speed);
    group.position.set(
      (offset[0] ?? 0) + swayRef.current.x,
      (offset[1] ?? 0) + swayRef.current.y + bob,
      offset[2] ?? 0,
    );
  });

  return createPortal(
    <group
      ref={groupRef}
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

interface ToolViewModelProps {
  /** Player movement direction { x, z } — passed from the input frame each render. */
  moveDirection?: { x: number; z: number };
}

const ZERO_DIRECTION = { x: 0, z: 0 };

/**
 * ToolViewModel renders the player's held tool in the lower-right of the FPS view (Spec §11).
 *
 * - Reads `selectedTool` from the game store.
 * - Resolves the GLB path, offset, and sway config from config/game/toolVisuals.json.
 * - Portals the GLB group into the camera so it is fixed to the player's view.
 * - Applies velocity-based sway via moveDirection prop (lerped each frame).
 * - Returns null for tools with no GLB mapping (watering-can, almanac, etc.).
 */
export const ToolViewModel = ({ moveDirection = ZERO_DIRECTION }: ToolViewModelProps) => {
  const selectedTool = useGameStore((s) => s.selectedTool);
  const config = toolVisualsData as ToolVisualsConfig;
  const glbPath = resolveToolGLBPath(selectedTool, config);
  const visual = resolveToolVisual(selectedTool, config);
  const swayConfig = (toolVisualsData as { sway?: SwayConfig }).sway;
  const bobConfig = (toolVisualsData as { bob?: BobConfig }).bob;

  if (!glbPath || !visual || !swayConfig || !bobConfig) return null;

  return (
    <ToolGLBModel
      glbPath={glbPath}
      offset={visual.offset}
      scale={visual.scale}
      moveDirection={moveDirection}
      swayAmount={swayConfig.swayAmount}
      lerpFactor={swayConfig.lerpFactor}
      bobHeight={bobConfig.bobHeight}
      bobFrequency={bobConfig.bobFrequency}
    />
  );
};
