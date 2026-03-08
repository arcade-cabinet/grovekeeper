/**
 * Sky — Gradient background driven by time-of-day and season.
 *
 * Uses a large sphere with vertex-color gradient from zenith to horizon,
 * modulated by the time system\'s sky colors. Ported from BabylonJS
 * SkyManager.ts for R3F — uses procedural gradient instead of HDRI
 * to keep bundle size minimal.
 *
 * Fix W6-B: Added star cluster (200 instanced spheres) whose emissive intensity
 * is driven by starIntensity from ECS DayNightComponent (Spec §31.3, §5.3).
 */

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo } from "react-native";
import * as THREE from "three";
import theme from "@/config/theme.json" with { type: "json" };
import { createRNG } from "@/game/utils/seedRNG";

export interface SkyProps {
  /** Sky colors from the time system — zenith, horizon, sun, ambient as hex strings. */
  skyColors: {
    zenith: string;
    horizon: string;
    sun: string;
    ambient: string;
  };
  /** Current season for seasonal tint. */
  season: string;
  /** Normalized sun intensity from time system (0-1). */
  sunIntensity: number;
  /**
   * Star visibility from ECS DayNightComponent (0-1).
   * 0 = fully invisible (daytime), 1 = fully visible (night).
   * Stars are culled when starIntensity < 0.01.
   */
  starIntensity?: number;
}

/** Seasonal tint applied to the sky gradient. */
const SEASONAL_TINTS: Record<string, THREE.Color> = {
  spring: new THREE.Color(theme.colors.springGreen),
  summer: new THREE.Color(theme.colors.summerYellow),
  autumn: new THREE.Color(theme.colors.autumnOrange),
  winter: new THREE.Color(theme.colors.winterBlue),
};

/** Intensity range for day/night cycle. */
const DAY_INTENSITY = 1.0;
const NIGHT_INTENSITY = 0.15;

/** Number of star instances — one draw call via InstancedMesh. */
const STAR_COUNT = 200;

/** Radius of the star shell — just inside the sky sphere (radius 80). */
const STAR_SHELL_RADIUS = 75;

/** Fixed seed for deterministic star positions — stars don\'t change night to night. */
const STAR_SEED = 0xdeadbeef;

/**
 * Generate deterministic star positions on a sphere shell.
 * Uses Mulberry32 PRNG (createRNG) with a fixed constant seed so positions
 * are identical every session. Returns an array of world-space positions.
 */
function generateStarPositions(count: number, radius: number): THREE.Vector3[] {
  const rng = createRNG(STAR_SEED);
  const positions: THREE.Vector3[] = [];

  for (let i = 0; i < count; i++) {
    const u = rng();
    const v = rng();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);

    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);

    // Only place stars in upper hemisphere — ground hides lower half
    positions.push(new THREE.Vector3(x, Math.abs(y) * 0.8 + 5, z));
  }

  return positions;
}

/** Pre-computed star positions — constant across the lifetime of the module. */
const STAR_POSITIONS = generateStarPositions(STAR_COUNT, STAR_SHELL_RADIUS);

export const Sky = ({ skyColors, season, sunIntensity, starIntensity = 0 }: SkyProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const starMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const starMeshRef = useRef<THREE.InstancedMesh>(null);

  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => sub.remove();
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: create once, update in useFrame
  const uniforms = useMemo(
    () => ({
      uZenithColor: { value: new THREE.Color(skyColors.zenith) },
      uHorizonColor: { value: new THREE.Color(skyColors.horizon) },
      uSeasonTint: {
        value: SEASONAL_TINTS[season]?.clone() ?? new THREE.Color(1, 1, 1),
      },
      uIntensity: {
        value: NIGHT_INTENSITY + (DAY_INTENSITY - NIGHT_INTENSITY) * sunIntensity,
      },
    }),
    [],
  );

  // Set star instance transforms on mount — positions never change.
  // biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount
  useEffect(() => {
    const mesh = starMeshRef.current;
    if (!mesh) return;

    const matrix = new THREE.Matrix4();
    for (let i = 0; i < STAR_COUNT; i++) {
      const pos = STAR_POSITIONS[i];
      matrix.setPosition(pos.x, pos.y, pos.z);
      mesh.setMatrixAt(i, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, []);

  useFrame(() => {
    const mat = matRef.current;
    if (!mat) return;

    mat.uniforms.uZenithColor.value.set(skyColors.zenith);
    mat.uniforms.uHorizonColor.value.set(skyColors.horizon);

    if (reduceMotion) {
      mat.uniforms.uSeasonTint.value.set(1, 1, 1);
    } else {
      const tint = SEASONAL_TINTS[season];
      if (tint) {
        mat.uniforms.uSeasonTint.value.copy(tint);
      } else {
        mat.uniforms.uSeasonTint.value.set(1, 1, 1);
      }
    }

    mat.uniforms.uIntensity.value =
      NIGHT_INTENSITY + (DAY_INTENSITY - NIGHT_INTENSITY) * sunIntensity;

    // Drive star emissive intensity from ECS starIntensity.
    // Cull entirely when starIntensity < 0.01 (avoids rendering invisible geometry).
    const starMesh = starMeshRef.current;
    const starMat = starMatRef.current;
    if (starMesh && starMat) {
      const visible = starIntensity >= 0.01;
      starMesh.visible = visible;
      if (visible) {
        starMat.emissiveIntensity = starIntensity;
      }
    }
  });

  const vertexShader = `
    varying vec3 vWorldPosition;
    void main() {
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    uniform vec3 uZenithColor;
    uniform vec3 uHorizonColor;
    uniform vec3 uSeasonTint;
    uniform float uIntensity;
    varying vec3 vWorldPosition;

    void main() {
      // Normalized height: 0 at horizon, 1 at zenith
      float height = normalize(vWorldPosition).y;
      float t = clamp(height, 0.0, 1.0);

      // Smooth gradient from horizon to zenith
      float smoothT = t * t * (3.0 - 2.0 * t);

      vec3 color = mix(uHorizonColor, uZenithColor, smoothT);

      // Subtle seasonal tint (5% blend)
      color = mix(color, color * uSeasonTint, 0.05);

      // Apply intensity for day/night
      color *= uIntensity;

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  return (
    <>
      {/* Sky dome — inverted sphere with gradient shader */}
      <mesh ref={meshRef} scale={[-1, 1, 1]}>
        <sphereGeometry args={[80, 32, 16]} />
        <shaderMaterial
          ref={matRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* Star cluster — 200 instanced tiny spheres in a fixed-seed shell at radius 75.
          Emissive intensity driven by starIntensity from ECS DayNightComponent.
          Culled when starIntensity < 0.01 (daytime). */}
      <instancedMesh
        ref={starMeshRef}
        args={[undefined, undefined, STAR_COUNT]}
        visible={starIntensity >= 0.01}
        renderOrder={-1}
      >
        <sphereGeometry args={[0.04, 4, 4]} />
        <meshStandardMaterial
          ref={starMatRef}
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={starIntensity}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>
    </>
  );
};
