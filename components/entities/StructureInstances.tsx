/**
 * StructureInstances — batches all ECS structure entities by modelPath into InstancedMesh.
 *
 * Groups structures by structure.modelPath and mounts one StaticModelInstances
 * sub-component per distinct model. Draw calls = (unique structure modelPaths) ×
 * (sub-meshes per model), not (total structure count).
 *
 * Example: 20 barns + 5 windmills = 2 InstancedMesh clusters (not 25 draw calls).
 *
 * See GAME_SPEC.md §28 (draw calls < 50).
 */

import { useFrame } from "@react-three/fiber";
import type * as React from "react";
import { useRef, useState } from "react";

import { structuresQuery } from "@/game/ecs/world";
import { type StaticEntityInput, StaticModelInstances } from "./StaticInstances";

/**
 * Renders all ECS structure entities as batched InstancedMeshes grouped by modelPath.
 *
 * Capacity is tracked per modelPath and only grows — never shrinks — to avoid
 * GPU buffer re-uploads. Instance count is set each frame to the active count.
 *
 * See GAME_SPEC.md §28.
 */
export const StructureInstances = () => {
  const [modelCapacities, setModelCapacities] = useState<
    ReadonlyMap<string, number>
  >(new Map());
  const prevModelsRef = useRef<Set<string>>(new Set());
  const capacitiesRef = useRef<Map<string, number>>(new Map());
  const entityRefsMapRef = useRef<
    Map<string, React.MutableRefObject<StaticEntityInput[]>>
  >(new Map());

  useFrame(() => {
    const current = new Set<string>();
    let changed = false;

    // Clear entity lists for this frame
    for (const ref of entityRefsMapRef.current.values()) {
      ref.current = [];
    }

    // Populate per-modelPath entity lists
    for (const entity of structuresQuery.entities) {
      const { structure, position } = entity;
      const modelPath = structure.modelPath;
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
        const entitiesRef =
          entityRefsMapRef.current.get(modelPath) ?? { current: [] };
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
