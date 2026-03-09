/**
 * Lighting — Ambient + directional light, synced to day/night cycle.
 *
 * Accepts timeOfDay (0-1 normalized) and season props to drive
 * dynamic light colors and intensities. Ported from BabylonJS
 * LightingManager.ts for R3F.
 *
 * Fix W6-B: Now accepts shadowOpacity from ECS DayNightComponent to scale
 * directional light intensity — 0 at night, 1 at noon (Spec §31.3).
 */

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { type AmbientLight, Color, type DirectionalLight, Fog } from "three";

export interface LightingProps {
  /** Normalized time of day, 0 = midnight, 0.5 = noon, 1 = midnight. */
  timeOfDay: number;
  /** Current season string. */
  season: string;
  /** Sun intensity from time system (0-1). */
  sunIntensity: number;
  /** Ambient intensity from time system (0.15-0.8). */
  ambientIntensity: number;
  /**
   * Shadow opacity from ECS DayNightComponent (0-1).
   * 0 at night (no shadows), 0.3 at dawn/dusk, 1.0 at noon.
   * Scales the directional light intensity so shadows fade naturally.
   * Defaults to sunIntensity when not provided (fallback path).
   */
  shadowOpacity?: number;
  /** Sky colors — zenith, horizon, sun, ambient as hex strings. */
  skyColors: {
    zenith: string;
    horizon: string;
    sun: string;
    ambient: string;
  };
}

/** Bright green-tinted fog base — Wind Waker haze, never muddy/dark. */
const FOG_BASE = { r: 0.45, g: 0.58, b: 0.38 };

function hexToColor3(hex: string): Color {
  return new Color(hex);
}

export const Lighting = ({
  timeOfDay,
  sunIntensity,
  ambientIntensity,
  shadowOpacity,
  skyColors,
}: LightingProps) => {
  const sunRef = useRef<DirectionalLight>(null);
  const ambientRef = useRef<AmbientLight>(null);

  useFrame((state) => {
    const sun = sunRef.current;
    const ambient = ambientRef.current;
    if (!sun || !ambient) return;

    // shadowOpacity (from ECS) scales the directional light intensity.
    // When absent (fallback path), use sunIntensity directly.
    const effectiveShadowOpacity = shadowOpacity ?? sunIntensity;

    // Update sun color from sky colors
    const sunColor = hexToColor3(skyColors.sun);
    sun.color.copy(sunColor);
    // Base intensity scaled by shadow opacity so shadows fade at night/dusk/dawn.
    sun.intensity = sunIntensity * 0.8 * Math.max(0.05, effectiveShadowOpacity);

    // Rotate sun direction based on timeOfDay prop (0=midnight, 0.5=noon, 1=midnight).
    // Derive game hours (0-24) from the normalized dayProgress value.
    const scene = state.scene;
    const hours = timeOfDay * 24;
    scene.userData.gameHours = hours;
    const sunAngle = (hours / 24) * Math.PI * 2 - Math.PI / 2;
    sun.position.set(-Math.cos(sunAngle) * 10, 10, -Math.sin(sunAngle) * 6);

    // Ambient light — soft fill from all directions.
    // Minimum 0.3 to prevent terrain from going too dark at any time of day.
    const ambientColor = hexToColor3(skyColors.ambient);
    ambient.color.copy(ambientColor);
    ambient.intensity = Math.max(0.3, ambientIntensity);

    // Update fog to earthy green with slight sky tint for time-of-day coherence
    const zenithColor = hexToColor3(skyColors.zenith);
    const fogR = Math.min(1, FOG_BASE.r + zenithColor.r * 0.12);
    const fogG = Math.min(1, FOG_BASE.g + zenithColor.g * 0.1);
    const fogB = Math.min(1, FOG_BASE.b + zenithColor.b * 0.08);

    if (scene.fog instanceof Fog) {
      scene.fog.color.setRGB(fogR, fogG, fogB);
    } else {
      scene.fog = new Fog(new Color(fogR, fogG, fogB), 100, 200);
    }

    // Match scene background to fog for seamless horizon blend
    if (scene.background instanceof Color) {
      scene.background.setRGB(fogR, fogG, fogB);
    } else {
      scene.background = new Color(fogR, fogG, fogB);
    }
  });

  return (
    <>
      <ambientLight ref={ambientRef} intensity={ambientIntensity} color="#6090b0" />
      <directionalLight
        ref={sunRef}
        intensity={sunIntensity * 0.8}
        color="#fff5e6"
        position={[-5, 10, -3]}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.5}
        shadow-camera-far={50}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />
    </>
  );
};
