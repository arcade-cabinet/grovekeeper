/**
 * useRaycast — Per-frame center-screen raycast for entity targeting (Spec §11).
 *
 * Casts a ray from the camera position along the camera forward direction
 * (screen center). Uses Three.js Raycaster to detect tree, NPC, and structure
 * entities by mesh userData.entityId (set by TreeInstances and NpcMeshes) or
 * by spatial proximity (fallback for InstancedMesh structures without per-instance userData).
 *
 * Returns a ref containing the closest RaycastHit within MAX_RAYCAST_DISTANCE, or null.
 */

import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

import type { Entity } from "@/game/ecs/world";
import { npcsQuery, structuresQuery, treesQuery } from "@/game/ecs/world";

/** Maximum reach of any tool in meters (Spec §11, tool-action-system §8.2). */
export const MAX_RAYCAST_DISTANCE = 6.0;

/** Proximity radius for spatial structure lookup (InstancedMesh fallback). */
export const STRUCTURE_SNAP_RADIUS = 2.0;

export type RaycastEntityType = "tree" | "npc" | "structure";

export interface RaycastHit {
  /** The ECS entity that was hit. */
  entity: Entity;
  /** Category of the hit entity. */
  entityType: RaycastEntityType;
  /** Distance from camera to hit in meters. */
  distance: number;
  /** World-space hit point. */
  point: THREE.Vector3;
}

// Module-level objects reused each frame to avoid per-frame allocation.
const _raycaster = new THREE.Raycaster();
const _screenCenter = new THREE.Vector2(0, 0);

/**
 * Resolves an ECS entity by ID, searching trees → NPCs → structures in priority order.
 * Exported for unit testing — takes iterables so tests inject mock data directly.
 *
 * @param entityId   The entity ID from mesh.userData.entityId
 * @param trees      Iterable of tree entities
 * @param npcs       Iterable of npc entities
 * @param structures Iterable of structure entities
 */
export function resolveEntityById(
  entityId: string,
  trees: Iterable<Entity>,
  npcs: Iterable<Entity>,
  structures: Iterable<Entity>,
): { entity: Entity; entityType: RaycastEntityType } | null {
  for (const e of trees) {
    if (e.id === entityId) return { entity: e, entityType: "tree" };
  }
  for (const e of npcs) {
    if (e.id === entityId) return { entity: e, entityType: "npc" };
  }
  for (const e of structures) {
    if (e.id === entityId) return { entity: e, entityType: "structure" };
  }
  return null;
}

/**
 * Finds the nearest structure entity within maxDist of a world point.
 * Fallback for InstancedMesh structures that lack per-instance userData.
 * Exported for unit testing.
 *
 * @param point      World-space point to search near
 * @param structures Iterable of structure+position entities
 * @param maxDist    Maximum search radius in world units
 */
export function findNearestStructure(
  point: { x: number; y: number; z: number },
  structures: Iterable<Entity>,
  maxDist: number,
): Entity | null {
  let closest: Entity | null = null;
  let closestDist = maxDist;
  for (const e of structures) {
    if (!e.position) continue;
    const dx = e.position.x - point.x;
    const dy = e.position.y - point.y;
    const dz = e.position.z - point.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist < closestDist) {
      closestDist = dist;
      closest = e;
    }
  }
  return closest;
}

/**
 * Per-frame center-screen raycast hook.
 *
 * Must be called inside an R3F Canvas (requires useThree + useFrame context).
 * Returns a ref that updates each frame with the closest hit entity, or null.
 *
 * Resolution order for a mesh hit:
 *   1. mesh.userData.entityId → look up in trees/npcs/structures
 *   2. Spatial proximity to structuresQuery (InstancedMesh fallback)
 */
export function useRaycast(): ReturnType<typeof useRef<RaycastHit | null>> {
  const { camera, scene } = useThree();
  const hitRef = useRef<RaycastHit | null>(null);

  useFrame(() => {
    _raycaster.far = MAX_RAYCAST_DISTANCE;
    _raycaster.setFromCamera(_screenCenter, camera);
    const intersects = _raycaster.intersectObjects(scene.children, true);

    hitRef.current = null;

    for (const intersect of intersects) {
      // Primary: mesh has entityId tagged in userData (TreeInstances, NpcMeshes)
      const entityId = intersect.object.userData?.entityId as string | undefined;
      if (entityId) {
        const resolved = resolveEntityById(entityId, treesQuery, npcsQuery, structuresQuery);
        if (resolved) {
          hitRef.current = {
            entity: resolved.entity,
            entityType: resolved.entityType,
            distance: intersect.distance,
            point: intersect.point.clone(),
          };
          return;
        }
      }

      // Fallback: spatial lookup for InstancedMesh structures without per-instance userData
      const structure = findNearestStructure(
        intersect.point,
        structuresQuery,
        STRUCTURE_SNAP_RADIUS,
      );
      if (structure) {
        hitRef.current = {
          entity: structure,
          entityType: "structure",
          distance: intersect.distance,
          point: intersect.point.clone(),
        };
        return;
      }
    }
  });

  return hitRef;
}
