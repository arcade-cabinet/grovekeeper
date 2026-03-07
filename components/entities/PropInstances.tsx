/**
 * PropInstances — batches all ECS prop entities that have a modelPath into InstancedMesh.
 *
 * World props (barrels, haybales, traps, weapons, misc) are batched by modelPath.
 * Props without a modelPath (PropComponent.modelPath is optional) are skipped.
 *
 * See GAME_SPEC.md §28 (draw calls < 50).
 */

import { useFrame } from "@react-three/fiber";
import type * as React from "react";
import { useRef, useState } from "react";

import { propsQuery } from "@/game/ecs/world";
import { type StaticEntityInput, StaticModelInstances } from "./StaticInstances.tsx";

/**
 * Renders all ECS prop entities with a modelPath as batched InstancedMeshes.
 *
 * Props without prop.modelPath are silently skipped (modelPath is optional in PropComponent).
 * Capacity is tracked per modelPath and only grows.
 *
 * See GAME_SPEC.md §28.
 */
export const PropInstances = () => {
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

    // Populate per-modelPath entity lists (skip props without modelPath)
    for (const entity of propsQuery.entities) {
      const modelPath = entity.prop.modelPath;
      if (!modelPath) continue;
      const { position } = entity;
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
