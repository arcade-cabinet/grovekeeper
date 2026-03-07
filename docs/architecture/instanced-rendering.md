# Instanced Rendering

> **NOTE (2026-03-07):** Core instancing principles remain accurate. Updates:
> - **Trees now use GLB models** (not procedural geometry). Instance key is `${speciesId}_${stage}_${season}[_night]`.
> - **GLB-based props** (bushes, fences, structures) also use InstancedMesh for same-model repetitions.
> - **Static world geometry = InstancedMesh** (zero per-frame cost for same-model repetitions).
> - **Interactive entities = individual ECS-managed meshes** (unchanged).
> - The `InstancedBatch` component concept for box/cylinder/sphere batches is less relevant now that most visual elements are GLB models. GLB instancing uses `useGLTF` + `<Instances>` from drei instead.

## Principle

Every visual element that doesn't need individual game logic is rendered via `InstancedMesh`. One draw call per material type, regardless of how many objects share that material. This is non-negotiable for mobile performance.

## The Problem It Solves

Naive rendering: 200 ground tiles + 80 border trees + 40 rocks = 320 draw calls. Mobile GPUs stall above ~50.

Instanced rendering: group by material (soil, path, bark, leaf, rock, water) = 6 draw calls. Same 320 objects.

## InstancedBatch Component

The core reusable component that renders any array of instance data as a single `<instancedMesh>`:

```typescript
// components/scene/InstancedBatch.tsx

import { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import type { InstanceData } from '@/game/world/types';

interface Props {
  data: InstanceData[];
  color: string;
  roughness?: number;
  metalness?: number;
  transparent?: boolean;
  opacity?: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
  emissive?: string;
  emissiveIntensity?: number;
}

// Module-scope temp object -- reused every update, zero allocation
const _dummy = new THREE.Object3D();

export const InstancedBatch = ({
  data,
  color,
  roughness = 0.9,
  metalness = 0.05,
  transparent = false,
  opacity = 1,
  castShadow = true,
  receiveShadow = true,
  emissive,
  emissiveIntensity,
}: Props) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  // Separate geometries by type within the data
  const { boxes, cylinders, spheres } = useMemo(() => {
    const boxes: InstanceData[] = [];
    const cylinders: InstanceData[] = [];
    const spheres: InstanceData[] = [];
    for (const inst of data) {
      const geo = inst.geometry ?? 'box';
      if (geo === 'cylinder') cylinders.push(inst);
      else if (geo === 'sphere') spheres.push(inst);
      else boxes.push(inst);
    }
    return { boxes, cylinders, spheres };
  }, [data]);

  // ... render one <instancedMesh> per geometry type
  // See "Geometry Separation" below
};
```

### Update Pattern

Instance matrices are set once on mount (or when data changes), not every frame. For static world geometry, this means zero per-frame cost.

```typescript
useEffect(() => {
  if (!meshRef.current || data.length === 0) return;

  for (let i = 0; i < data.length; i++) {
    const inst = data[i];
    _dummy.position.set(inst.pos[0], inst.pos[1], inst.pos[2]);

    if (inst.rot) {
      _dummy.rotation.set(inst.rot[0], inst.rot[1], inst.rot[2]);
    } else {
      _dummy.rotation.set(0, 0, 0);
    }

    _dummy.scale.set(inst.scale[0], inst.scale[1], inst.scale[2]);
    _dummy.updateMatrix();
    meshRef.current.setMatrixAt(i, _dummy.matrix);
  }

  meshRef.current.instanceMatrix.needsUpdate = true;
}, [data]);
```

### Critical Rules

1. **Module-scope `_dummy`** -- Never `new THREE.Object3D()` inside useEffect or useFrame.
2. **`needsUpdate = true`** -- Must be set after writing matrices or nothing renders.
3. **`args={[geometry, null, count]}`** -- Pass `null` for material (use child `<meshStandardMaterial>`), pass exact `data.length` for count.
4. **Dispose on unmount** -- Geometry and material must be disposed to prevent WebGL leaks.

## Geometry Separation

Since `InstancedMesh` can only use ONE geometry, data arrays that mix geometry types (box + cylinder + sphere) must be split into separate `<instancedMesh>` elements per geometry type. The `InstancedBatch` component handles this internally.

```jsx
return (
  <group>
    {boxes.length > 0 && (
      <instancedMesh ref={boxRef} args={[boxGeo, null, boxes.length]}
        castShadow={castShadow} receiveShadow={receiveShadow}>
        <meshStandardMaterial color={color} roughness={roughness} metalness={metalness}
          transparent={transparent} opacity={opacity} />
      </instancedMesh>
    )}
    {cylinders.length > 0 && (
      <instancedMesh ref={cylRef} args={[cylGeo, null, cylinders.length]}
        castShadow={castShadow} receiveShadow={receiveShadow}>
        <meshStandardMaterial color={color} roughness={roughness} metalness={metalness}
          transparent={transparent} opacity={opacity} />
      </instancedMesh>
    )}
    {spheres.length > 0 && (
      <instancedMesh ref={sphRef} args={[sphGeo, null, spheres.length]}
        castShadow={castShadow} receiveShadow={receiveShadow}>
        <meshStandardMaterial color={color} roughness={roughness} metalness={metalness}
          transparent={transparent} opacity={opacity} />
      </instancedMesh>
    )}
  </group>
);
```

## Shared Geometries

Geometries are created once and shared across all `InstancedBatch` components that need them:

```typescript
// components/scene/SharedGeometries.tsx

export const useSharedGeometries = () => {
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const cylinder = useMemo(() => new THREE.CylinderGeometry(0.5, 0.5, 1, 6), []);
  const sphere = useMemo(() => new THREE.IcosahedronGeometry(0.5, 1), []);

  useEffect(() => {
    return () => {
      box.dispose();
      cylinder.dispose();
      sphere.dispose();
    };
  }, [box, cylinder, sphere]);

  return { box, cylinder, sphere };
};
```

Note: Cylinder uses 6 segments (not 32) for PSX aesthetic. Sphere uses icosahedron subdivision 1 (42 verts) for low-poly look.

## Material Batching Strategy

Group objects by material, NOT by object type. A wooden floor plank and a wooden fence post share the same material batch -- they differ only in position/scale.

| Batch | Color Source | Geometry Types | Example Objects |
|-------|-------------|----------------|-----------------|
| soil | biomes.json | box | Ground tiles |
| path | biomes.json | box | Walkable paths |
| rock | biomes.json | box, sphere | Rock obstacles, boulders |
| water | biomes.json | box | Water tiles |
| bark | trees.json | cylinder | Decorative tree trunks |
| leaf | seasonal palette | sphere | Decorative tree canopies |
| stone | structures.json | box | Structure walls (base) |
| wood | structures.json | box, cylinder | Structure frames, fences |

## Dynamic Instances (Trees)

Interactive trees (ECS entities) use a SEPARATE instancing strategy from static world geometry:

- Instance key: `${speciesId}_${stage}_${season}[_night]` -- one InstancedMesh per template key
- GLB models loaded via `useGLTF` (3DPSX tree models, 100-400 verts each)
- Start capacity 20, double on overflow
- Instance matrices updated every frame in `useFrame` for growth animation (scale lerp)
- Stage 4 static trees: `matrixAutoUpdate = false` for zero per-frame cost
- When a tree is harvested/planted, the instance count changes -- the mesh is rebuilt
- Draw call target: <35 for all trees combined

This is handled by `<TreeInstances />`, NOT by `InstancedBatch`. `InstancedBatch` is for static-only geometry.

## Performance Budget

| Metric | Budget | Notes |
|--------|--------|-------|
| Static instance batches | <= 8 | One per material type |
| Dynamic instance groups | <= 15 | One per tree species |
| Total draw calls | <= 30 | Includes UI, shadows, post-fx |
| Max instances per batch | 1000 | InstancedMesh handles this fine |
| Matrix update frequency | On change | Static = once; trees = per frame |

## File Structure

```
components/scene/
  InstancedBatch.tsx      -- Reusable instanced mesh renderer
  SharedGeometries.tsx    -- Shared geometry hook (box, cylinder, sphere)
  Terrain.tsx             -- Ground plane with vertex displacement
  WorldInstances.tsx      -- Orchestrator: maps WorldData.instances to InstancedBatch components
```

## Anti-Patterns

| Don't | Do Instead |
|-------|-----------|
| Individual `<mesh>` per ground tile | `InstancedBatch` with soil data |
| `new THREE.Object3D()` in useFrame | Module-scope `_dummy` object |
| Recreate geometry every render | `useMemo` + dispose on unmount |
| Mix interactive + decorative in same batch | ECS entities get their own meshes |
| `castShadow` on ground tiles | `castShadow={false}` -- ground doesn't cast |
| 32-segment cylinders | 6 segments -- PSX aesthetic + performance |
