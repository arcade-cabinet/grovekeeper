/**
 * Sky — Gradient background driven by time-of-day and season.
 *
 * Uses a large sphere with vertex-color gradient from zenith to horizon,
 * modulated by the time system's sky colors. Ported from BabylonJS
 * SkyManager.ts for R3F — uses procedural gradient instead of HDRI
 * to keep bundle size minimal.
 */

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo } from "react-native";
import * as THREE from "three";
import theme from "@/config/theme.json" with { type: "json" };

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

export const Sky = ({ skyColors, season, sunIntensity }: SkyProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);

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

  useFrame(() => {
    const mat = matRef.current;
    if (!mat) return;

    mat.uniforms.uZenithColor.value.set(skyColors.zenith);
    mat.uniforms.uHorizonColor.value.set(skyColors.horizon);

    if (reduceMotion) {
      // Skip seasonal tint blend — snap to neutral
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
  );
};
