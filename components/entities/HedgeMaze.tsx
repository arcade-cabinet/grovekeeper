/**
 * HedgeMaze — renders all ECS hedge maze entities as 3D GLBs.
 *
 * Hedge wall pieces are batched by modelPath into InstancedMeshes (performance budget §28).
 * Decorations (fountain, benches, flowers, columns) are rendered as individual GLBs —
 * they are sparse (≤20 per maze) and each unique, so per-entity rendering is appropriate.
 *
 * Pure functions exported for testing:
 *   - resolveHedgeGLBPath(hedge)       — validates modelPath is set, returns it
 *   - resolveDecorationGLBPath(deco)   — validates modelPath is set, returns it
 *   - hedgeRotationToRadians(degrees)  — converts maze rotation degrees → radians
 *
 * See GAME_SPEC.md §18.
 */

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type * as React from "react";
import { useMemo, useRef, useState } from "react";
import type { HedgeComponent, HedgeDecorationComponent } from "@/game/ecs/components/terrain";
import { hedgeDecorationsQuery, hedgesQuery } from "@/game/ecs/world";
import { type StaticEntityInput, StaticModelInstances } from "./StaticInstances.tsx";

// ---------------------------------------------------------------------------
// Pure functions (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Resolve the GLB asset path from a HedgeComponent.
 *
 * The maze generator pre-computes modelPath on each HedgePlacement.
 * This validates the field is set and returns it unchanged.
 * Throws on missing path — no silent fallbacks (Spec §14 hard rule).
 */
export function resolveHedgeGLBPath(hedge: HedgeComponent): string {
  if (!hedge.modelPath) {
    throw new Error(
      `[HedgeMaze] HedgeComponent missing modelPath for pieceType="${hedge.pieceType}"`,
    );
  }
  return hedge.modelPath;
}

/**
 * Resolve the GLB asset path from a HedgeDecorationComponent.
 *
 * The maze generator pre-computes modelPath on each DecorationPlacement.
 * Throws on missing path — no silent fallbacks (Spec §14 hard rule).
 */
export function resolveDecorationGLBPath(decoration: HedgeDecorationComponent): string {
  if (!decoration.modelPath) {
    throw new Error(
      `[HedgeMaze] HedgeDecorationComponent missing modelPath for itemId="${decoration.itemId}"`,
    );
  }
  return decoration.modelPath;
}

/**
 * Convert hedge rotation from degrees (0, 90, 180, 270) to radians.
 *
 * HedgeComponent.rotation stores degrees (set by the maze generator).
 * Three.js rotation props expect radians.
 */
export function hedgeRotationToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

// ---------------------------------------------------------------------------
// DecorationGLBModel sub-component
// ---------------------------------------------------------------------------

interface DecorationGLBModelProps {
  glbPath: string;
  position: [number, number, number];
  rotationY: number;
}

/**
 * Renders a single decoration GLB (fountain, bench, flower, column).
 *
 * Separate sub-component so useGLTF is only called when mounted — Rules of Hooks.
 * Clones the scene to avoid mutating the shared GLTF cache.
 */
const DecorationGLBModel = ({ glbPath, position, rotationY }: DecorationGLBModelProps) => {
  const { scene } = useGLTF(glbPath);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <primitive object={cloned} castShadow receiveShadow />
    </group>
  );
};

// ---------------------------------------------------------------------------
// Internal type
// ---------------------------------------------------------------------------

interface DecorationEntry {
  id: string;
  glbPath: string;
  position: [number, number, number];
  rotationY: number;
}

// ---------------------------------------------------------------------------
// HedgeMaze — main export
// ---------------------------------------------------------------------------

/**
 * HedgeMaze renders all ECS hedge maze entities in the 3D scene.
 *
 * Hedge wall pieces are batched into InstancedMeshes grouped by modelPath —
 * a maze can have 100+ wall segments, batching keeps draw calls within budget.
 *
 * Decorations (fountain, benches, flowers, columns) are individual GLBs —
 * each is a unique model and the count is small (≤20 per maze).
 *
 * See GAME_SPEC.md §18.
 */
export const HedgeMaze = () => {
  // ── Hedge wall pieces (batched by modelPath) ────────────────────────────
  const [hedgeCapacities, setHedgeCapacities] = useState<ReadonlyMap<string, number>>(new Map());
  const prevHedgeModelsRef = useRef<Set<string>>(new Set());
  const hedgeCapacitiesRef = useRef<Map<string, number>>(new Map());
  const hedgeRefsMapRef = useRef<Map<string, React.MutableRefObject<StaticEntityInput[]>>>(
    new Map(),
  );

  // ── Decorations (individual GLBs) ──────────────────────────────────────
  const [decorations, setDecorations] = useState<DecorationEntry[]>([]);
  const prevDecorationCountRef = useRef<number>(-1);

  useFrame(() => {
    // ── Hedge walls ────────────────────────────────────────────────────────
    const currentModels = new Set<string>();
    let hedgeChanged = false;

    // Clear entity lists for this frame
    for (const ref of hedgeRefsMapRef.current.values()) {
      ref.current = [];
    }

    for (const entity of hedgesQuery.entities) {
      const { hedge, position } = entity;
      const modelPath = resolveHedgeGLBPath(hedge);
      currentModels.add(modelPath);

      if (!hedgeRefsMapRef.current.has(modelPath)) {
        hedgeRefsMapRef.current.set(modelPath, { current: [] });
      }
      // biome-ignore lint/style/noNonNullAssertion: just set above
      hedgeRefsMapRef.current.get(modelPath)!.current.push({
        id: entity.id,
        modelPath,
        position,
        rotationY: hedgeRotationToRadians(hedge.rotation),
      });
    }

    // Detect new modelPaths
    const prev = prevHedgeModelsRef.current;
    if (currentModels.size !== prev.size || [...currentModels].some((m) => !prev.has(m))) {
      hedgeChanged = true;
      prevHedgeModelsRef.current = currentModels;
    }

    // Detect capacity growth (grows-only)
    for (const [modelPath, ref] of hedgeRefsMapRef.current) {
      const needed = ref.current.length;
      const allocated = hedgeCapacitiesRef.current.get(modelPath) ?? 0;
      if (needed > allocated) {
        hedgeCapacitiesRef.current.set(modelPath, needed);
        hedgeChanged = true;
      }
    }

    if (hedgeChanged) {
      setHedgeCapacities(new Map(hedgeCapacitiesRef.current));
    }

    // ── Decorations ────────────────────────────────────────────────────────
    const decoCount = hedgeDecorationsQuery.entities.length;
    if (decoCount !== prevDecorationCountRef.current) {
      prevDecorationCountRef.current = decoCount;
      const newDecorations: DecorationEntry[] = [];
      for (const entity of hedgeDecorationsQuery.entities) {
        const { hedgeDecoration, position } = entity;
        newDecorations.push({
          id: entity.id,
          glbPath: resolveDecorationGLBPath(hedgeDecoration),
          position: [position.x, position.y, position.z],
          rotationY: 0,
        });
      }
      setDecorations(newDecorations);
    }
  });

  return (
    <>
      {/* Hedge wall pieces — batched InstancedMeshes, grouped by modelPath */}
      {[...hedgeCapacities.entries()].map(([modelPath, capacity]) => {
        const entitiesRef = hedgeRefsMapRef.current.get(modelPath) ?? { current: [] };
        return (
          <StaticModelInstances
            key={modelPath}
            glbPath={modelPath}
            capacity={capacity}
            entitiesRef={entitiesRef}
          />
        );
      })}
      {/* Decorations — individual GLBs: fountain, benches, flowers, columns */}
      {decorations.map(({ id, glbPath, position, rotationY }) => (
        <DecorationGLBModel key={id} glbPath={glbPath} position={position} rotationY={rotationY} />
      ))}
    </>
  );
};
