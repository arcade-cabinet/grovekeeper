/**
 * HedgeZoneMesh — one InstancedMesh for a single hedge depth zone.
 *
 * Depth zones (outer / mid / deep) have distinct material colours that
 * telegraph the player's distance from the maze center:
 *   outer — standard green  rgb(15, 60, 20)
 *   mid   — autumn brown-green  rgb(50, 45, 20)
 *   deep  — ominous dark red-green  rgb(60, 15, 20)
 *
 * SphereGeometry gives hedges an organic shape. Instance matrices are
 * updated imperatively in useFrame — no React re-renders per frame.
 * Capacity grows-only to avoid GPU re-upload when the maze is stable.
 *
 * Spec §42 — Procedural Architecture (hedge maze subsystem).
 */

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  CanvasTexture,
  Euler,
  type InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  RepeatWrapping,
  SphereGeometry,
  Vector3,
} from "three";

import hedgeMazeConfig from "@/config/game/hedgeMaze.json" with { type: "json" };
import type { HedgeDepthZone, HedgeInstance } from "@/game/systems/hedgeGeometry";
import { createTextureCanvas } from "@/game/utils/proceduralTextures";
import { createRNG, hashString } from "@/game/utils/seedRNG";

// ---------------------------------------------------------------------------
// Config constants
// ---------------------------------------------------------------------------

const CELL_SCALE: number = hedgeMazeConfig.cellScale;

/** Sphere radius as a fraction of cell scale (from POC). */
const SPHERE_RADIUS_FACTOR = 0.7;
const SPHERE_W_SEGS = 12;
const SPHERE_H_SEGS = 12;

// ---------------------------------------------------------------------------
// Zone colour palette (matching POC HTML source)
// ---------------------------------------------------------------------------

const ZONE_COLORS: Record<HedgeDepthZone, number> = {
  outer: 0x0f3c14,
  mid: 0x322d14,
  deep: 0x3c0f14,
};

// ---------------------------------------------------------------------------
// Module-scope temp objects (no per-frame allocation)
// ---------------------------------------------------------------------------

const _pos = new Vector3();
const _quat = new Quaternion();
const _scale = new Vector3();
const _euler = new Euler();
const _matrix = new Matrix4();

// ---------------------------------------------------------------------------
// Material factory
// ---------------------------------------------------------------------------

function buildZoneMaterial(zone: HedgeDepthZone): MeshStandardMaterial {
  const rng = createRNG(hashString(`hedge-tex-${zone}`));
  const canvas = createTextureCanvas("hedge", 256, rng);
  const tex = new CanvasTexture(canvas);
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  return new MeshStandardMaterial({
    color: ZONE_COLORS[zone],
    map: tex,
    roughness: 0.9,
    metalness: 0.0,
  });
}

// ---------------------------------------------------------------------------
// HedgeZoneMesh
// ---------------------------------------------------------------------------

export interface HedgeZoneMeshProps {
  zone: HedgeDepthZone;
  /** Pre-allocated InstancedMesh capacity (grows-only). */
  capacity: number;
  /** Current frame's HedgeInstance list for this zone. */
  instances: HedgeInstance[];
}

/**
 * Renders all hedge sphere instances for one depth zone.
 *
 * Geometry and material are created once at mount (useMemo).
 * Instance matrices are set imperatively each frame via useFrame.
 */
export const HedgeZoneMesh = ({ zone, capacity, instances }: HedgeZoneMeshProps) => {
  const meshRef = useRef<InstancedMesh>(null);

  const geometry = useMemo(
    () => new SphereGeometry(CELL_SCALE * SPHERE_RADIUS_FACTOR, SPHERE_W_SEGS, SPHERE_H_SEGS),
    [],
  );

  const material = useMemo(() => buildZoneMaterial(zone), [zone]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    let idx = 0;
    for (const inst of instances) {
      if (idx >= capacity) break;
      _pos.set(inst.x, inst.y, inst.z);
      _euler.set(inst.rotX, inst.rotY, inst.rotZ);
      _quat.setFromEuler(_euler);
      _scale.set(inst.scale, inst.scale * inst.scaleY, inst.scale);
      _matrix.compose(_pos, _quat, _scale);
      mesh.setMatrixAt(idx, _matrix);
      idx++;
    }

    mesh.count = idx;
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (capacity === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, capacity]}
      frustumCulled={false}
      castShadow
      receiveShadow
    />
  );
};
