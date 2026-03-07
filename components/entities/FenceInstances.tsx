/**
 * FenceInstances — batches all ECS fence entities by modelPath into InstancedMesh.
 *
 * Fence segments placed along a fence line all use the same GLB (e.g., wooden_fence_closed).
 * Batching them reduces a 40-segment fence from 40 draw calls to 1 InstancedMesh cluster.
 *
 * Rotation is read from entity.rotationY (set at placement time, defaults to 0).
 * Invisible fence entities (renderable.visible === false) are excluded from batching.
 *
 * See GAME_SPEC.md §28 (draw calls < 50).
 */

import { useFrame } from "@react-three/fiber";
import type * as React from "react";
import { useRef, useState } from "react";

import { fencesQuery } from "@/game/ecs/world";
import { type StaticEntityInput, StaticModelInstances } from "./StaticInstances.tsx";

/**
 * Renders all ECS fence entities as batched InstancedMeshes grouped by modelPath.
 *
 * Invisible fences (renderable.visible === false) are excluded each frame.
 * Capacity is tracked per modelPath and only grows.
 *
 * See GAME_SPEC.md §28.
 */
export const FenceInstances = () => {
  const [modelCapacities, setModelCapacities] = useState<ReadonlyMap<string, number>>(new Map());
  const prevModelsRef = useRef<Set<string>>(new Set());
  const capacitiesRef = useRef<Map<string, number>>(new Map());
  const entityRefsMapRef = useRef<Map<string, React.MutableRefObject<StaticEntityInput[]>>>(
    new Map(),
  );

  useFrame(() => {
    const current = new Set<string>();
    let changed = false;

    // Clear entity lists for this frame
    for (const ref of entityRefsMapRef.current.values()) {
      ref.current = [];
    }

    // Populate per-modelPath entity lists (skip invisible fences)
    for (const entity of fencesQuery.entities) {
      if (!entity.renderable.visible) continue;
      const { fence, position } = entity;
      const modelPath = fence.modelPath;
      current.add(modelPath);

      if (!entityRefsMapRef.current.has(modelPath)) {
        entityRefsMapRef.current.set(modelPath, { current: [] });
      }
      // biome-ignore lint/style/noNonNullAssertion: just set above
      entityRefsMapRef.current.get(modelPath)!.current.push({
        id: entity.id,
        modelPath,
        position,
        rotationY: entity.rotationY ?? 0,
      });
    }

    // Detect new modelPaths
    const prev = prevModelsRef.current;
    if (current.size !== prev.size || [...current].some((m) => !prev.has(m))) {
      changed = true;
      prevModelsRef.current = current;
    }

    // Detect capacity growth (grows-only)
    for (const [modelPath, ref] of entityRefsMapRef.current) {
      const needed = ref.current.length;
      const allocated = capacitiesRef.current.get(modelPath) ?? 0;
      if (needed > allocated) {
        capacitiesRef.current.set(modelPath, needed);
        changed = true;
      }
    }

    if (changed) {
      setModelCapacities(new Map(capacitiesRef.current));
    }
  });

  return (
    <>
      {[...modelCapacities.entries()].map(([modelPath, capacity]) => {
        const entitiesRef = entityRefsMapRef.current.get(modelPath) ?? { current: [] };
        return (
          <StaticModelInstances
            key={modelPath}
            glbPath={modelPath}
            capacity={capacity}
            entitiesRef={entitiesRef}
          />
        );
      })}
    </>
  );
};
