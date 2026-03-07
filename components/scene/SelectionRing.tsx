/**
 * SelectionRing — Glowing torus on the ground at a tapped/selected tile.
 *
 * Displays a breathing pulse animation (scale + opacity oscillation)
 * to highlight the current selection. Ported from BabylonJS
 * SelectionRingManager.ts for R3F.
 */

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

export interface SelectionRingProps {
  /** World position of the ring [x, y, z]. */
  position: [number, number, number];
  /** Whether the ring is visible. */
  visible: boolean;
}

/** Torus geometry sized to frame a 1-unit tile. */
const TORUS_DIAMETER = 0.9;
const TORUS_THICKNESS = 0.06;
const TORUS_SEGMENTS = 24;
/** Y offset above ground to prevent z-fighting. */
const GROUND_Y = 0.02;

/** Pulse animation parameters. */
const PULSE_SPEED = 3;
const SCALE_MIN = 0.92;
const SCALE_MAX = 1.08;
const ALPHA_MIN = 0.55;
const ALPHA_MAX = 0.85;

/** Green-gold glow color. */
const GLOW_COLOR = new THREE.Color("#A5D6A7");

export const SelectionRing = ({ position, visible }: SelectionRingProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const phaseRef = useRef(0);

  useFrame((_state, delta) => {
    if (!visible) {
      phaseRef.current = 0;
      return;
    }

    const mesh = meshRef.current;
    const mat = matRef.current;
    if (!mesh || !mat) return;

    phaseRef.current += PULSE_SPEED * delta;
    const t = (Math.sin(phaseRef.current) + 1) / 2; // 0..1

    // Scale oscillation
    const scale = SCALE_MIN + (SCALE_MAX - SCALE_MIN) * t;
    mesh.scale.setScalar(scale);

    // Alpha oscillation
    mat.opacity = ALPHA_MIN + (ALPHA_MAX - ALPHA_MIN) * t;
  });

  if (!visible) return null;

  return (
    <mesh
      ref={meshRef}
      position={[position[0], GROUND_Y, position[2]]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <torusGeometry args={[TORUS_DIAMETER / 2, TORUS_THICKNESS, 8, TORUS_SEGMENTS]} />
      <meshBasicMaterial
        ref={matRef}
        color={GLOW_COLOR}
        transparent
        opacity={ALPHA_MAX}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
};
