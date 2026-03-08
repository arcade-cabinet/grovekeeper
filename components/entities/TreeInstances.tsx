/**
 * TreeInstances — R3F component that renders all ECS tree entities.
 *
 * Rendering split by growth stage (Spec §8.1):
 *   - Stage 0 (Seed)   → procedural mound geometry (tiny)
 *   - Stage 1 (Sprout) → procedural stem geometry (small)
 *   - Stage 2-4        → species GLB via StaticModelInstances (batched InstancedMesh)
 *
 * GLB trees are grouped by resolved model path (baseModel or winterModel when
 * isWinter + useWinterModel=true) so each unique model gets exactly one
 * InstancedMesh cluster (Spec §28, draw calls < 50).
 *
 * Season is read from gameState$.currentSeason to resolve winter variants.
 *
 * See GAME_SPEC.md §8.1, §6.3, §28.
 */

import { useFrame } from "@react-three/fiber";
import type * as React from "react";
import { useRef, useState } from "react";
import { CylinderGeometry, Group, Material, Mesh, MeshStandardMaterial, Object3D, SphereGeometry, Vector3 } from "three";

import { treesQuery } from "@/game/ecs/world";
import { gameState$ } from "@/game/stores/core";
import { type StaticEntityInput, StaticModelInstances } from "./StaticInstances.tsx";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Growth stage boundary — stages <= this value use procedural geometry. */
export const PROCEDURAL_STAGE_MAX = 1;

/** Scale multipliers per growth stage (Spec §8.1). */
export const STAGE_SCALES: Readonly<Record<number, number>> = {
  0: 0.05,
  1: 0.15,
  2: 0.5,
  3: 1.0,
  4: 1.3,
};

// ---------------------------------------------------------------------------
// Pure helpers (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Resolve the model path for a GLB tree given the current season.
 *
 * Returns winterModel when isWinter=true AND useWinterModel=true AND winterModel is
 * a non-empty string. Otherwise returns baseModel (Spec §6.3, §8.1).
 *
 * Throws if baseModel is empty — no silent fallbacks.
 */
export function resolveTreeModelPath(
  baseModel: string,
  winterModel: string,
  useWinterModel: boolean,
  isWinter: boolean,
): string {
  if (!baseModel) {
    throw new Error(
      "[TreeInstances] Tree entity has empty baseModel. Check vegetationPlacement.ts.",
    );
  }
  if (isWinter && useWinterModel && winterModel) {
    return winterModel;
  }
  return baseModel;
}

/**
 * Partition tree entities from the query into two buckets:
 *   - procedural: stage <= PROCEDURAL_STAGE_MAX (stage 0 or 1)
 *   - glb: stage >= 2 (Sapling, Mature, Old Growth)
 *
 * Returns the GLB entities as StaticEntityInput records grouped by resolved
 * model path. The procedural entity data is returned as-is for separate rendering.
 *
 * Exported as a pure function for unit testing without WebGL context (Spec §8.1).
 */
export interface ProceduralTreeInput {
  id: string;
  stage: 0 | 1;
  position: { x: number; y: number; z: number };
  scale: number;
  visible: boolean;
}

export function partitionTreeEntities(
  entities: Array<{
    id: string;
    tree: {
      stage: 0 | 1 | 2 | 3 | 4;
      baseModel: string;
      winterModel: string;
      useWinterModel: boolean;
    };
    position: { x: number; y: number; z: number };
    renderable: { visible: boolean; scale: number };
    rotationY?: number;
  }>,
  isWinter: boolean,
): {
  procedural: ProceduralTreeInput[];
  glbByModel: Map<string, StaticEntityInput[]>;
} {
  const procedural: ProceduralTreeInput[] = [];
  const glbByModel = new Map<string, StaticEntityInput[]>();

  for (const entity of entities) {
    const { tree, position, renderable } = entity;
    if (tree.stage <= PROCEDURAL_STAGE_MAX) {
      procedural.push({
        id: entity.id,
        stage: tree.stage as 0 | 1,
        position,
        scale: STAGE_SCALES[tree.stage] ?? STAGE_SCALES[0],
        visible: renderable.visible,
      });
    } else {
      const modelPath = resolveTreeModelPath(
        tree.baseModel,
        tree.winterModel,
        tree.useWinterModel,
        isWinter,
      );
      const input: StaticEntityInput = {
        id: entity.id,
        modelPath,
        position,
        rotationY: entity.rotationY ?? 0,
      };
      const group = glbByModel.get(modelPath);
      if (group) {
        group.push(input);
      } else {
        glbByModel.set(modelPath, [input]);
      }
    }
  }

  return { procedural, glbByModel };
}

// ---------------------------------------------------------------------------
// Procedural geometry renderers (Stage 0 + Stage 1)
// ---------------------------------------------------------------------------

/** Reusable scale vector — avoids per-frame allocations. */
const _scaleVec = new Vector3();

/** Lerp speed for smooth scale transitions on procedural meshes. */
const SCALE_LERP_SPEED = 4;

interface ProceduralTreeMesh {
  mesh: Mesh;
  stage: 0 | 1;
}

/**
 * ProceduralTreeRenderer — manages per-entity Three.js Meshes for stages 0 and 1.
 *
 * Rendered as an imperative group inside useFrame — zero JSX overhead per frame.
 * Meshes are created/destroyed as entities appear/despawn.
 *
 * Stage 0: brown sphere mound (same geometry as TreeModel Spec §8.1 Seed)
 * Stage 1: green cylinder stem (same geometry as TreeModel Spec §8.1 Sprout)
 */
const ProceduralTreeRenderer = ({
  groupRef,
}: {
  groupRef: React.RefObject<Group | null>;
}) => {
  const meshMapRef = useRef(new Map<string, ProceduralTreeMesh>());

  useFrame((_state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const meshMap = meshMapRef.current;
    const lerpFactor = Math.min(1, SCALE_LERP_SPEED * delta);
    const aliveIds = new Set<string>();

    for (const entity of treesQuery.entities) {
      const { tree, position, renderable } = entity;
      if (tree.stage > PROCEDURAL_STAGE_MAX) continue;

      const id = entity.id;
      aliveIds.add(id);

      let entry = meshMap.get(id);
      if (!entry || entry.stage !== tree.stage) {
        // Remove old mesh if stage changed
        if (entry) {
          group.remove(entry.mesh);
          entry.mesh.geometry.dispose();
          (entry.mesh.material as Material).dispose();
        }
        const mesh = _makeProceduralMesh(tree.stage as 0 | 1);
        mesh.userData = { entityId: id };
        group.add(mesh);
        entry = { mesh, stage: tree.stage as 0 | 1 };
        meshMap.set(id, entry);
      }

      const { mesh } = entry;
      mesh.position.set(position.x, position.y, position.z);
      mesh.visible = renderable.visible;
      const targetScale = STAGE_SCALES[tree.stage] ?? STAGE_SCALES[0];
      mesh.scale.lerp(_scaleVec.set(targetScale, targetScale, targetScale), lerpFactor);
    }

    // Despawn removed entities
    for (const [id, entry] of meshMap) {
      if (!aliveIds.has(id)) {
        group.remove(entry.mesh);
        entry.mesh.geometry.dispose();
        (entry.mesh.material as Material).dispose();
        meshMap.delete(id);
      }
    }
  });

  return null;
};

/** Create a raw Three.js Mesh for a procedural stage (0 or 1). */
function _makeProceduralMesh(stage: 0 | 1): Mesh {
  if (stage === 0) {
    const geo = new SphereGeometry(0.15, 8, 6);
    const mat = new MeshStandardMaterial({ color: "#795548", roughness: 0.9 });
    const mesh = new Mesh(geo, mat);
    mesh.castShadow = true;
    return mesh;
  }
  // Stage 1: Sprout
  const geo = new CylinderGeometry(0.04, 0.06, 0.3, 8);
  const mat = new MeshStandardMaterial({ color: "#4CAF50", roughness: 0.8 });
  const mesh = new Mesh(geo, mat);
  mesh.castShadow = true;
  return mesh;
}

// ---------------------------------------------------------------------------
// GLB batch renderer — stages 2-4
// ---------------------------------------------------------------------------

/**
 * GlbTreeBatcher — collects stage 2-4 tree entities each frame, groups them
 * by resolved model path, and manages StaticModelInstances sub-components.
 *
 * Capacity grows-only (never shrinks) to avoid GPU buffer re-uploads.
 * A React state update fires only when the set of model paths or capacity grows —
 * position updates flow through refs with zero re-renders (Spec §28).
 */
const GlbTreeBatcher = () => {
  const [modelCapacities, setModelCapacities] = useState<ReadonlyMap<string, number>>(new Map());
  const prevModelsRef = useRef<Set<string>>(new Set());
  const capacitiesRef = useRef<Map<string, number>>(new Map());
  const entityRefsMapRef = useRef<Map<string, React.MutableRefObject<StaticEntityInput[]>>>(
    new Map(),
  );

  useFrame(() => {
    const isWinter = gameState$.currentSeason.get() === "winter";
    const current = new Set<string>();
    let changed = false;

    // Clear entity lists for this frame
    for (const ref of entityRefsMapRef.current.values()) {
      ref.current = [];
    }

    // Populate per-modelPath entity lists from ECS
    for (const entity of treesQuery.entities) {
      const { tree, position } = entity;
      if (tree.stage <= PROCEDURAL_STAGE_MAX) continue; // handled by ProceduralTreeRenderer

      const modelPath = resolveTreeModelPath(
        tree.baseModel,
        tree.winterModel,
        tree.useWinterModel,
        isWinter,
      );
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

    // Detect new model paths
    const prev = prevModelsRef.current;
    if (current.size !== prev.size || [...current].some((m) => !prev.has(m))) {
      changed = true;
      prevModelsRef.current = current;
    }

    // Grow capacity as needed (grows-only)
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

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface TreeInstancesProps {
  /** Called when a procedural tree mesh (stage 0-1) is tapped (entityId). */
  onTreeTap?: (entityId: string, worldX: number, worldZ: number) => void;
}

/**
 * TreeInstances renders all ECS tree entities:
 *
 *   Stages 0-1 -> procedural Three.js meshes (Seed mound + Sprout stem)
 *   Stages 2-4 -> GLB InstancedMesh via StaticModelInstances, grouped by model path
 *
 * Season-aware: winter variant GLBs are swapped in when currentSeason === "winter"
 * and the species has useWinterModel=true (Spec §6.3).
 *
 * See GAME_SPEC.md §8.1, §6.3, §28.
 */
export const TreeInstances = ({ onTreeTap }: TreeInstancesProps = {}) => {
  const proceduralGroupRef = useRef<Group>(null);

  const handlePointerDown = (event: {
    stopPropagation: () => void;
    object: Object3D;
    point: { x: number; z: number };
  }) => {
    if (!onTreeTap) return;
    event.stopPropagation();
    const entityId = event.object.userData?.entityId as string | undefined;
    if (entityId) {
      onTreeTap(entityId, event.point.x, event.point.z);
    }
  };

  return (
    <>
      {/* Stages 0-1: procedural geometry group */}
      <group ref={proceduralGroupRef} onPointerDown={handlePointerDown as never}>
        <ProceduralTreeRenderer groupRef={proceduralGroupRef} />
      </group>

      {/* Stages 2-4: GLB InstancedMesh batching */}
      <GlbTreeBatcher />
    </>
  );
};
