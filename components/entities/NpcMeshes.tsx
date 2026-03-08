/**
 * NpcMeshes — R3F component that renders all ECS NPC entities.
 *
 * Each NPC is rendered as a simple capsule mesh colored by their
 * function type (trading, quests, tips, seeds, crafting, lore).
 */

import { type ThreeEvent, useFrame } from "@react-three/fiber";
import { useCallback, useEffect, useRef } from "react";
import { CapsuleGeometry, Color, Group, Mesh, MeshStandardMaterial } from "three";

import type { NpcFunction } from "@/game/ecs/world";
import { npcsQuery } from "@/game/ecs/world";

/** NPC function type to color mapping. */
const NPC_COLORS: Record<NpcFunction, Color> = {
  trading: new Color("#DAA520"), // gold
  quests: new Color("#4169E1"), // royal blue
  tips: new Color("#2E8B57"), // sea green
  seeds: new Color("#8B4513"), // saddle brown
  crafting: new Color("#7B2D8B"), // purple
  lore: new Color("#C0C0C0"), // silver
};

/** Capsule dimensions for NPC mesh. */
const CAPSULE_RADIUS = 0.22;
const CAPSULE_LENGTH = 0.5;
const CAP_SEGMENTS = 6;
const RADIAL_SEGMENTS = 10;

/** Y offset so the capsule sits on the ground. */
const Y_OFFSET = CAPSULE_LENGTH / 2 + CAPSULE_RADIUS;

/** Shared capsule geometry for all NPCs. */
const sharedGeometry = new CapsuleGeometry(
  CAPSULE_RADIUS,
  CAPSULE_LENGTH,
  CAP_SEGMENTS,
  RADIAL_SEGMENTS,
);

export interface NpcMeshesProps {
  /** Called when an NPC mesh is tapped (entityId, worldX, worldZ). */
  onNpcTap?: (entityId: string, worldX: number, worldZ: number) => void;
}

export const NpcMeshes = ({ onNpcTap }: NpcMeshesProps = {}) => {
  const groupRef = useRef<Group>(null);
  const meshMapRef = useRef(new Map<string, Mesh>());
  const materialCacheRef = useRef(new Map<NpcFunction, MeshStandardMaterial>());

  // Dispose cached materials on unmount to prevent GPU memory leaks
  useEffect(() => {
    const cache = materialCacheRef.current;
    return () => {
      for (const material of cache.values()) {
        material.dispose();
      }
      cache.clear();
    };
  }, []);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;

    const entities = npcsQuery.entities;
    const meshMap = meshMapRef.current;
    const materialCache = materialCacheRef.current;

    const aliveIds = new Set<string>();

    for (const entity of entities) {
      const { npc, position, renderable } = entity;
      const id = entity.id;
      aliveIds.add(id);

      // Get or create material for this function type
      if (!materialCache.has(npc.function)) {
        const color = NPC_COLORS[npc.function] ?? new Color("#888888");
        materialCache.set(
          npc.function,
          new MeshStandardMaterial({
            color,
            roughness: 0.6,
            metalness: 0.15,
          }),
        );
      }

      // Get or create mesh for this entity
      let mesh = meshMap.get(id);
      if (!mesh) {
        // biome-ignore lint/style/noNonNullAssertion: just set above
        mesh = new Mesh(sharedGeometry, materialCache.get(npc.function)!);
        mesh.castShadow = true;
        mesh.userData = { entityId: id };
        meshMap.set(id, mesh);
        group.add(mesh);
      }

      // Update position and visibility
      mesh.position.set(position.x, Y_OFFSET * renderable.scale, position.z);
      mesh.visible = renderable.visible;
      mesh.scale.setScalar(renderable.scale);
    }

    // Remove meshes for despawned NPCs
    for (const [id, mesh] of meshMap) {
      if (!aliveIds.has(id)) {
        group.remove(mesh);
        meshMap.delete(id);
      }
    }
  });

  const handlePointerDown = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (!onNpcTap) return;
      event.stopPropagation();
      const obj = event.object;
      const entityId = obj.userData?.entityId as string | undefined;
      if (entityId) {
        onNpcTap(entityId, event.point.x, event.point.z);
      }
    },
    [onNpcTap],
  );

  return <group ref={groupRef} onPointerDown={handlePointerDown} />;
};
