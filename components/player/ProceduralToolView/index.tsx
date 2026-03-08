/**
 * ProceduralToolView — first-person held tool model, fixed to camera (Spec §11).
 *
 * Reads the selected tool from the game store, resolves visual config from
 * config/game/toolVisuals.json, and renders procedural geometry in camera space
 * via R3F createPortal. No GLB loading.
 *
 * Pure functions exported for testing (identical signatures to ToolViewModel.tsx):
 *   - computeSwayOffset
 *   - computeWalkBob
 *   - buildSwapDownParams
 *   - buildSwapUpParams
 *   - resolveToolVisual
 *   - buildSwingDownParams
 *   - buildSwingUpParams
 *
 * See GAME_SPEC.md §11, §34.4.5.
 */

import { createPortal, useFrame, useThree } from "@react-three/fiber";
import anime from "animejs";
import { useEffect, useRef, useState } from "react";
import type * as THREE from "three";

import toolVisualsData from "@/config/game/toolVisuals.json" with { type: "json" };
import { useGameStore } from "@/game/stores";
import { TOOL_SHAPES } from "./toolShapes.tsx";

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

interface SwapConfig {
  readonly lowerY: number;
  readonly duration: number;
}

interface SwingConfig {
  readonly downAngle: number;
  readonly downDuration: number;
  readonly upDuration: number;
}

type ToolVisualsConfig = {
  readonly [toolId: string]:
    | ToolVisualEntry
    | SwayConfig
    | BobConfig
    | SwapConfig
    | SwingConfig
    | undefined;
};

function isToolVisualEntry(
  v: ToolVisualEntry | SwayConfig | BobConfig | SwapConfig | SwingConfig,
): v is ToolVisualEntry {
  return "glbPath" in v;
}

// ---------------------------------------------------------------------------
// Pure functions (exported for testing — same signatures as ToolViewModel.tsx)
// ---------------------------------------------------------------------------

/**
 * Computes a new sway offset by lerping toward (velocity * swayAmount) (Spec §11).
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
 * Builds anime.js params for the tool-lower phase of a swap animation (Spec §11).
 */
export function buildSwapDownParams(
  target: { y: number },
  lowerY: number,
  duration: number,
  onComplete: () => void,
): { targets: { y: number }; y: number; duration: number; easing: string; complete: () => void } {
  return { targets: target, y: -lowerY, duration, easing: "easeInQuad", complete: onComplete };
}

/**
 * Builds anime.js params for the tool-raise phase of a swap animation (Spec §11).
 */
export function buildSwapUpParams(
  target: { y: number },
  duration: number,
): { targets: { y: number }; y: number; duration: number; easing: string } {
  return { targets: target, y: 0, duration, easing: "easeOutQuad" };
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

/**
 * Builds anime.js params for the swing-down phase of an attack animation (Spec §34.4.5).
 * Rotates tool to downAngle (degrees) on Z axis.
 */
export function buildSwingDownParams(
  target: { rotZ: number },
  downAngle: number,
  downDuration: number,
  onComplete: () => void,
): {
  targets: { rotZ: number };
  rotZ: number;
  duration: number;
  easing: string;
  complete: () => void;
} {
  return {
    targets: target,
    rotZ: (downAngle * Math.PI) / 180,
    duration: downDuration,
    easing: "easeInQuad",
    complete: onComplete,
  };
}

/**
 * Builds anime.js params for the swing-up (return) phase of an attack animation (Spec §34.4.5).
 * Returns tool rotation to 0.
 */
export function buildSwingUpParams(
  target: { rotZ: number },
  upDuration: number,
): { targets: { rotZ: number }; rotZ: number; duration: number; easing: string } {
  return { targets: target, rotZ: 0, duration: upDuration, easing: "easeOutQuad" };
}

// ---------------------------------------------------------------------------
// ProceduralToolModel — portaled into the camera, applies sway/bob/swap/swing
// ---------------------------------------------------------------------------

interface ProceduralToolModelProps {
  toolId: string;
  offset: readonly number[];
  scale: number;
  moveDirection: { x: number; z: number };
  swayAmount: number;
  lerpFactor: number;
  bobHeight: number;
  bobFrequency: number;
  swapAnimRef: React.MutableRefObject<{ y: number }>;
  swingAnimRef: React.MutableRefObject<{ rotZ: number }>;
}

/**
 * Renders one procedural tool model in camera space.
 *
 * Portals into the Three.js camera object so the tool always tracks the view.
 * Applies sway (lerped from moveDirection), walk bob, and attack swing
 * imperatively via useFrame.
 */
const ProceduralToolModel = ({
  toolId,
  offset,
  scale,
  moveDirection,
  swayAmount,
  lerpFactor,
  bobHeight,
  bobFrequency,
  swapAnimRef,
  swingAnimRef,
}: ProceduralToolModelProps) => {
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const swayRef = useRef({ x: 0, y: 0 });
  const bobTimeRef = useRef(0);

  useFrame((_state, delta) => {
    const group = groupRef.current;
    if (!group) return;
    swayRef.current = computeSwayOffset(
      moveDirection,
      swayRef.current,
      swayAmount,
      lerpFactor,
      delta,
    );
    bobTimeRef.current += delta;
    const speed = Math.min(1, Math.sqrt(moveDirection.x ** 2 + moveDirection.z ** 2));
    const bob = computeWalkBob(bobTimeRef.current, bobHeight, bobFrequency, speed);
    group.position.set(
      (offset[0] ?? 0) + swayRef.current.x,
      (offset[1] ?? 0) + swayRef.current.y + bob + swapAnimRef.current.y,
      offset[2] ?? 0,
    );
    // Apply swing Z rotation from attack animation (Spec §34.4.5)
    group.rotation.z = swingAnimRef.current.rotZ;
  });

  const ShapeBuilder = TOOL_SHAPES[toolId];
  if (!ShapeBuilder) return null;

  return createPortal(
    <group ref={groupRef} position={[offset[0] ?? 0, offset[1] ?? 0, offset[2] ?? 0]}>
      <ShapeBuilder scale={scale} />
    </group>,
    camera,
  );
};

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

interface ProceduralToolViewProps {
  /** Player movement direction { x, z } — passed from the input frame each render. */
  moveDirection?: { x: number; z: number };
  /**
   * Increments by 1 each time the player executes a melee attack.
   * A useEffect watching this value fires the swing animation (Spec §34.4.5).
   */
  attackTrigger?: number;
}

const ZERO_DIRECTION = { x: 0, z: 0 };

/**
 * ProceduralToolView renders the player's held tool in the lower-right of the
 * FPS view using procedural geometry (Spec §11).
 *
 * Replaces ToolViewModel.tsx. No GLB loading — tools are assembled from
 * cylinder, box, and cone primitives and portaled into the camera.
 *
 * - Reads `selectedTool` from the game store.
 * - Resolves offset and sway config from config/game/toolVisuals.json.
 * - Applies velocity-based sway via moveDirection prop (lerped each frame).
 * - Animates tool swap: lowers → swaps → raises (anime.js tween).
 * - Animates attack swing when attackTrigger increments (Spec §34.4.5).
 * - Returns null for tool IDs without a matching shape builder.
 *
 * See GAME_SPEC.md §11, §34.4.5.
 */
export const ProceduralToolView = ({
  moveDirection = ZERO_DIRECTION,
  attackTrigger = 0,
}: ProceduralToolViewProps) => {
  const selectedTool = useGameStore((s) => s.selectedTool);
  const [displayedToolId, setDisplayedToolId] = useState(selectedTool);
  const swapAnimRef = useRef({ y: 0 });
  const swingAnimRef = useRef({ rotZ: 0 });
  const activeAnimRef = useRef<anime.AnimeInstance | null>(null);
  const activeSwingRef = useRef<anime.AnimeInstance | null>(null);

  const config = toolVisualsData as ToolVisualsConfig;
  const swayConfig = (toolVisualsData as { sway?: SwayConfig }).sway;
  const bobConfig = (toolVisualsData as { bob?: BobConfig }).bob;
  const swapConfig = (toolVisualsData as { swap?: SwapConfig }).swap;
  const swingConfig = (toolVisualsData as { swing?: SwingConfig }).swing;

  // Animate tool swap: lower current → swap model at nadir → raise new (Spec §11).
  useEffect(() => {
    if (selectedTool === displayedToolId) return;
    if (!swapConfig) {
      setDisplayedToolId(selectedTool);
      return;
    }

    activeAnimRef.current?.pause();
    const capturedTool = selectedTool;

    activeAnimRef.current = anime(
      buildSwapDownParams(swapAnimRef.current, swapConfig.lowerY, swapConfig.duration, () => {
        setDisplayedToolId(capturedTool);
        activeAnimRef.current = anime(buildSwapUpParams(swapAnimRef.current, swapConfig.duration));
      }),
    );
  }, [selectedTool, displayedToolId]);

  // Animate attack swing: rotate -45° on Z then return (Spec §34.4.5).
  // attackTrigger is 0 on mount; only fire when it actually increments.
  const prevAttackTriggerRef = useRef(attackTrigger);
  useEffect(() => {
    if (attackTrigger === prevAttackTriggerRef.current) return;
    prevAttackTriggerRef.current = attackTrigger;

    if (!swingConfig) return;

    // Interrupt any in-progress swing
    activeSwingRef.current?.pause();
    swingAnimRef.current.rotZ = 0;

    activeSwingRef.current = anime(
      buildSwingDownParams(
        swingAnimRef.current,
        swingConfig.downAngle,
        swingConfig.downDuration,
        () => {
          activeSwingRef.current = anime(
            buildSwingUpParams(swingAnimRef.current, swingConfig.upDuration),
          );
        },
      ),
    );
  }, [attackTrigger, swingConfig]);

  const visual = resolveToolVisual(displayedToolId, config);

  if (!visual || !swayConfig || !bobConfig) return null;
  if (!TOOL_SHAPES[displayedToolId]) return null;

  return (
    <ProceduralToolModel
      toolId={displayedToolId}
      offset={visual.offset}
      scale={visual.scale}
      moveDirection={moveDirection}
      swayAmount={swayConfig.swayAmount}
      lerpFactor={swayConfig.lerpFactor}
      bobHeight={bobConfig.bobHeight}
      bobFrequency={bobConfig.bobFrequency}
      swapAnimRef={swapAnimRef}
      swingAnimRef={swingAnimRef}
    />
  );
};
