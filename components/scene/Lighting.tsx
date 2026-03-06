/**
 * Lighting — Ambient + directional light, synced to day/night cycle.
 *
 * Accepts timeOfDay (0-1 normalized) and season props to drive
 * dynamic light colors and intensities. Ported from BabylonJS
 * LightingManager.ts for R3F.
 */

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

export interface LightingProps {
  /** Normalized time of day, 0 = midnight, 0.5 = noon, 1 = midnight. */
  timeOfDay: number;
  /** Current season string. */
  season: string;
  /** Sun intensity from time system (0-1). */
  sunIntensity: number;
  /** Ambient intensity from time system (0.15-0.8). */
  ambientIntensity: number;
  /** Sky colors — zenith, horizon, sun, ambient as hex strings. */
  skyColors: {
    zenith: string;
    horizon: string;
    sun: string;
    ambient: string;
  };
}

/** Earthy green fog base — blends the horizon into misty forest. */
const FOG_BASE = { r: 0.3, g: 0.42, b: 0.25 };

function hexToColor3(hex: string): THREE.Color {
  return new THREE.Color(hex);
}

export const Lighting = ({
  sunIntensity,
  ambientIntensity,
  skyColors,
}: LightingProps) => {
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);

  useFrame((state) => {
    const sun = sunRef.current;
    const ambient = ambientRef.current;
    if (!sun || !ambient) return;

    // Update sun color from sky colors
    const sunColor = hexToColor3(skyColors.sun);
    sun.color.copy(sunColor);
    sun.intensity = sunIntensity * 0.8;

    // Rotate sun direction based on time (hours derived from timeOfDay prop)
    const scene = state.scene;
    const hours = scene.userData.gameHours ?? 12;
    const sunAngle = (hours / 24) * Math.PI * 2 - Math.PI / 2;
    sun.position.set(-Math.cos(sunAngle) * 10, 10, -Math.sin(sunAngle) * 6);

    // Ambient light — soft fill from all directions
    const ambientColor = hexToColor3(skyColors.ambient);
    ambient.color.copy(ambientColor);
    ambient.intensity = ambientIntensity;

    // Update fog to earthy green with slight sky tint for time-of-day coherence
    const zenithColor = hexToColor3(skyColors.zenith);
    const fogR = Math.min(1, FOG_BASE.r + zenithColor.r * 0.12);
    const fogG = Math.min(1, FOG_BASE.g + zenithColor.g * 0.1);
    const fogB = Math.min(1, FOG_BASE.b + zenithColor.b * 0.08);

    if (scene.fog instanceof THREE.Fog) {
      scene.fog.color.setRGB(fogR, fogG, fogB);
    } else {
      scene.fog = new THREE.Fog(new THREE.Color(fogR, fogG, fogB), 20, 40);
    }

    // Match scene background to fog for seamless horizon blend
    if (scene.background instanceof THREE.Color) {
      scene.background.setRGB(fogR, fogG, fogB);
    } else {
      scene.background = new THREE.Color(fogR, fogG, fogB);
    }
  });

  return (
    <>
      <ambientLight
        ref={ambientRef}
        intensity={ambientIntensity}
        color="#6090b0"
      />
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
