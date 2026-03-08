/**
 * SpeechBubble — world-space billboarded speech bubble above entities.
 *
 * Renders a floating text bubble above NPCs and Grovekeeper spirits during
 * dialogue. The bubble always faces the camera via Billboard, uses Fredoka
 * font for text, and fades in/out over 0.3 seconds.
 *
 * Pure functions exported for testing:
 *   - computeOpacity(visible, currentOpacity, dt, fadeDuration)
 *   - computeBubbleY(entityY, offset)
 *
 * See GAME_SPEC.md §33.5.
 */

import { Billboard, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type * as THREE from "three";

// Font file resolved by Metro/webpack bundler to a URL at runtime.
// In Jest tests, @react-three/drei is mocked so the font value is never used.
const FREDOKA_FONT =
  require("@expo-google-fonts/fredoka/400Regular/Fredoka_400Regular.ttf") as string;

// ---------------------------------------------------------------------------
// Visual constants
// ---------------------------------------------------------------------------

/** Fade in/out duration in seconds (Spec §33.5). */
export const FADE_DURATION = 0.3;

/** Height above entity base position where the bubble renders (world units). */
export const BUBBLE_OFFSET = 2.2;

/** Width of the background quad (world units). */
const BUBBLE_WIDTH = 1.6;

/** Height of the background quad (world units). */
const BUBBLE_HEIGHT = 0.5;

// ---------------------------------------------------------------------------
// Pure functions (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Compute the next opacity for the speech bubble fade animation.
 *
 * When visible=true, opacity ramps toward 1 at rate dt/fadeDuration per step.
 * When visible=false, opacity ramps toward 0 at the same rate.
 * Result is clamped to [0, 1].
 *
 * @param visible        Target visibility state
 * @param currentOpacity Current opacity in [0, 1]
 * @param dt             Delta time in seconds
 * @param fadeDuration   Seconds to complete a full fade in or out
 * @returns              Next opacity, clamped to [0, 1]
 */
export function computeOpacity(
  visible: boolean,
  currentOpacity: number,
  dt: number,
  fadeDuration: number,
): number {
  const rate = dt / fadeDuration;
  return visible ? Math.min(1, currentOpacity + rate) : Math.max(0, currentOpacity - rate);
}

/**
 * Compute the world Y position for the speech bubble.
 *
 * @param entityY  World Y of the entity's base position
 * @param offset   Height above entity (world units)
 * @returns        World Y for the bubble center
 */
export function computeBubbleY(entityY: number, offset: number): number {
  return entityY + offset;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface SpeechBubbleProps {
  /** World X position of the entity. */
  x: number;
  /** World Y position of the entity base (bubble renders above this). */
  y: number;
  /** World Z position of the entity. */
  z: number;
  /** Text to display in the bubble. */
  text: string;
  /** Whether the bubble should be shown (drives fade in/out). */
  visible: boolean;
}

// ---------------------------------------------------------------------------
// SpeechBubble component
// ---------------------------------------------------------------------------

/**
 * Renders a world-space billboarded speech bubble above an entity.
 *
 * Uses drei's Billboard to always face the camera. A dark background quad
 * sits behind the Fredoka-font text. Both fade in/out over FADE_DURATION
 * seconds using computeOpacity.
 *
 * Opacity is tracked in a ref and applied imperatively each frame to avoid
 * React state updates at 60fps. This follows the same pattern as SpiritOrb.
 *
 * See GAME_SPEC.md §33.5.
 */
export const SpeechBubble = ({ x, y, z, text, visible }: SpeechBubbleProps) => {
  const opacityRef = useRef(0);
  const bgMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  // biome-ignore lint/suspicious/noExplicitAny: troika TextMesh — fillOpacity is a troika property
  const textRef = useRef<any>(null);

  useFrame((_, dt) => {
    opacityRef.current = computeOpacity(visible, opacityRef.current, dt, FADE_DURATION);
    const opacity = opacityRef.current;

    if (bgMaterialRef.current) {
      bgMaterialRef.current.opacity = opacity;
    }
    if (textRef.current) {
      textRef.current.fillOpacity = opacity;
    }
  });

  const bubbleY = computeBubbleY(y, BUBBLE_OFFSET);

  return (
    <Billboard position={[x, bubbleY, z]}>
      {/* Background quad */}
      <mesh>
        <planeGeometry args={[BUBBLE_WIDTH, BUBBLE_HEIGHT]} />
        <meshBasicMaterial
          ref={bgMaterialRef}
          color="#1a1a1a"
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
      {/* Fredoka font dialogue text */}
      <Text
        ref={textRef}
        font={FREDOKA_FONT}
        fontSize={0.18}
        color="#f5f0e8"
        fillOpacity={0}
        maxWidth={BUBBLE_WIDTH - 0.2}
        textAlign="center"
        anchorX="center"
        anchorY="middle"
      >
        {text}
      </Text>
    </Billboard>
  );
};
