/**
 * ChibiNpc — procedural chibi NPC rendered entirely from THREE.js primitives.
 *
 * Generates a chibi body (head, torso, arms, legs) from sphere/cylinder/box
 * geometry with colors seeded from NpcFunction + scopedRNG. No GLB assets.
 *
 * Body part geometries are module-level singletons shared across all instances.
 * Materials are created per-NPC via useMemo keyed to skin/cloth/hair indices.
 *
 * Animation driven by animState + animProgress props — the parent orchestrator
 * advances animProgress and ChibiNpc applies rigid-body rotation each render.
 *
 * See GAME_SPEC.md §15.
 */

import { useMemo, useRef } from "react";
import { type Group, MeshStandardMaterial } from "three";
import type { NpcFunction } from "@/game/ecs/components/npc";
import { scopedRNG } from "@/game/utils/seedWords";

// ---------------------------------------------------------------------------
// Shared geometry singletons — created once, reused across all NPC instances
// (avoids GPU buffer duplication for identical shapes, Spec §28.1)
// ---------------------------------------------------------------------------

import { BoxGeometry, CylinderGeometry, SphereGeometry } from "three";

export const HEAD_GEO = new SphereGeometry(0.35, 6, 5);
export const TORSO_GEO = new CylinderGeometry(0.2, 0.15, 0.5, 7, 1);
export const UPPER_ARM_GEO = new CylinderGeometry(0.06, 0.06, 0.25, 5, 1);
export const LOWER_ARM_GEO = new CylinderGeometry(0.06, 0.12, 0.25, 5, 1);
export const HAND_GEO = new SphereGeometry(0.12, 5, 4);
export const LEG_GEO = new CylinderGeometry(0.1, 0.06, 0.35, 5, 1);
export const BOOT_GEO = new BoxGeometry(0.2, 0.15, 0.25);

// ---------------------------------------------------------------------------
// Color palettes (no Math.random — indices resolved via scopedRNG)
// ---------------------------------------------------------------------------

const SKIN_COLORS = ["#ffdbac", "#f1c27d", "#e0ac69", "#8d5524", "#4a3118"] as const;
const HAIR_COLORS = ["#111111", "#552211", "#ddaa33", "#aa3333", "#888899"] as const;
const BOOT_COLOR = "#222222";

const CLOTH_BY_FUNCTION: Record<NpcFunction, string> = {
  trading: "#DAA520",
  quests: "#4169E1",
  tips: "#2E8B57",
  seeds: "#8B4513",
  crafting: "#7B2D8B",
  lore: "#C0C0C0",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChibiNpcProps {
  npcId: string;
  worldSeed: string;
  npcFunction: NpcFunction;
  position: [number, number, number];
  animState: "idle" | "walk";
  animProgress: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ChibiNpc = ({
  npcId,
  worldSeed,
  npcFunction,
  position,
  animState,
  animProgress,
}: ChibiNpcProps) => {
  const visualGroupRef = useRef<Group>(null);
  const armLRef = useRef<Group>(null);
  const armRRef = useRef<Group>(null);
  const legLRef = useRef<Group>(null);
  const legRRef = useRef<Group>(null);

  // Deterministically pick skin + hair indices using scopedRNG (no Math.random).
  const { skinColor, hairColor, clothColor } = useMemo(() => {
    const rng = scopedRNG("chibi-appearance", worldSeed, npcId);
    const skinIdx = Math.floor(rng() * SKIN_COLORS.length);
    const hairIdx = Math.floor(rng() * HAIR_COLORS.length);
    return {
      skinColor: SKIN_COLORS[skinIdx],
      hairColor: HAIR_COLORS[hairIdx],
      clothColor: CLOTH_BY_FUNCTION[npcFunction],
    };
  }, [npcId, worldSeed, npcFunction]);

  // Per-NPC materials — PBR Standard for bright Wind Waker aesthetic.
  // MeshStandardMaterial with roughness=0.7, metalness=0.0 gives warm diffuse
  // lighting that responds well to both ambient and directional light.
  // Disposed when NPC unmounts via ref held by the scene orchestrator.
  const matSkin = useMemo(
    () => new MeshStandardMaterial({ color: skinColor, roughness: 0.7, metalness: 0.0 }),
    [skinColor],
  );
  const matCloth = useMemo(
    () => new MeshStandardMaterial({ color: clothColor, roughness: 0.7, metalness: 0.0 }),
    [clothColor],
  );
  const matHair = useMemo(
    () => new MeshStandardMaterial({ color: hairColor, roughness: 0.7, metalness: 0.0 }),
    [hairColor],
  );
  const matBoot = useMemo(
    () => new MeshStandardMaterial({ color: BOOT_COLOR, roughness: 0.7, metalness: 0.0 }),
    [],
  );

  // Apply animation each render using current prop values (no useFrame here —
  // the parent ChibiNpcScene calls setInterval/requestAnimationFrame externally,
  // and animProgress is passed as a prop that changes each frame).
  const swing = animState === "walk" ? Math.sin(animProgress) * 0.8 : 0;
  const bob = animState === "walk" ? Math.abs(Math.sin(animProgress * 1.5)) * 0.15 : 0;

  return (
    <group position={position}>
      {/* Visual group Y-bobs during walk */}
      <group ref={visualGroupRef} position={[0, bob, 0]}>
        {/* Head — sphere at y=1.15 */}
        <mesh geometry={HEAD_GEO} material={matSkin} position={[0, 1.15, 0]} castShadow />
        {/* Hair hint — tiny sphere offset back on head */}
        <mesh
          geometry={HAND_GEO}
          material={matHair}
          position={[0, 1.4, -0.12]}
          scale={[1.3, 0.7, 1]}
          castShadow
        />
        {/* Torso — cylinder at y=0.75 */}
        <mesh geometry={TORSO_GEO} material={matCloth} position={[0, 0.75, 0]} castShadow />

        {/* Left arm — pivot at y=0.95, x=-0.28 */}
        <group ref={armLRef} position={[-0.28, 0.95, 0]} rotation={[swing, 0, 0]}>
          <mesh geometry={UPPER_ARM_GEO} material={matCloth} position={[0, -0.125, 0]} castShadow />
          <mesh geometry={LOWER_ARM_GEO} material={matSkin} position={[0, -0.375, 0]} castShadow />
          <mesh geometry={HAND_GEO} material={matSkin} position={[0, -0.5, 0]} castShadow />
        </group>

        {/* Right arm — pivot at y=0.95, x=+0.28 — swings opposite phase */}
        <group ref={armRRef} position={[0.28, 0.95, 0]} rotation={[-swing, 0, 0]}>
          <mesh geometry={UPPER_ARM_GEO} material={matCloth} position={[0, -0.125, 0]} castShadow />
          <mesh geometry={LOWER_ARM_GEO} material={matSkin} position={[0, -0.375, 0]} castShadow />
          <mesh geometry={HAND_GEO} material={matSkin} position={[0, -0.5, 0]} castShadow />
        </group>

        {/* Left leg — pivot at y=0.5, x=-0.12 */}
        <group ref={legLRef} position={[-0.12, 0.5, 0]} rotation={[-swing, 0, 0]}>
          <mesh geometry={LEG_GEO} material={matCloth} position={[0, -0.175, 0]} castShadow />
          <mesh geometry={BOOT_GEO} material={matBoot} position={[0, -0.425, 0.05]} castShadow />
        </group>

        {/* Right leg — pivot at y=0.5, x=+0.12 — swings opposite phase */}
        <group ref={legRRef} position={[0.12, 0.5, 0]} rotation={[swing, 0, 0]}>
          <mesh geometry={LEG_GEO} material={matCloth} position={[0, -0.175, 0]} castShadow />
          <mesh geometry={BOOT_GEO} material={matBoot} position={[0, -0.425, 0.05]} castShadow />
        </group>
      </group>
    </group>
  );
};
