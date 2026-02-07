/**
 * BlockMeshFactory — Creates BabylonJS meshes for structure blocks.
 *
 * Uses procedural primitives (CreateBox) with StandardMaterial colors for each
 * block type. Structures are assembled by positioning individual block meshes
 * and then merging same-material groups for draw-call efficiency.
 */

import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Scene } from "@babylonjs/core/scene";

import type { BlockDefinition, StructureTemplate } from "./types";
import blocksData from "./data/blocks.json";

// ---------------------------------------------------------------------------
// Block definition lookup
// ---------------------------------------------------------------------------

const blockMap = new Map<string, BlockDefinition>();
for (const raw of blocksData) {
  blockMap.set(raw.id, raw as BlockDefinition);
}

// ---------------------------------------------------------------------------
// Material palette
// ---------------------------------------------------------------------------

const MATERIAL_COLORS: Record<string, { r: number; g: number; b: number; alpha?: number }> = {
  wood:  { r: 0.55, g: 0.35, b: 0.18 },
  straw: { r: 0.85, g: 0.75, b: 0.45 },
  stone: { r: 0.55, g: 0.52, b: 0.5 },
  glass: { r: 0.7, g: 0.85, b: 0.9, alpha: 0.5 },
};

/** Cache materials per scene to avoid re-creation. */
const materialCache = new Map<string, StandardMaterial>();

function getOrCreateMaterial(scene: Scene, materialKey: string): StandardMaterial {
  const cacheKey = `struct_${materialKey}_${scene.uid}`;
  const cached = materialCache.get(cacheKey);
  if (cached) return cached;

  const colorDef = MATERIAL_COLORS[materialKey];
  if (!colorDef) {
    // Fallback to wood if unknown key
    return getOrCreateMaterial(scene, "wood");
  }

  const mat = new StandardMaterial(cacheKey, scene);
  mat.diffuseColor = new Color3(colorDef.r, colorDef.g, colorDef.b);

  if (colorDef.alpha !== undefined) {
    mat.alpha = colorDef.alpha;
    mat.transparencyMode = StandardMaterial.MATERIAL_ALPHABLEND;
    mat.backFaceCulling = false;
  }

  materialCache.set(cacheKey, mat);
  return mat;
}

// ---------------------------------------------------------------------------
// Single block mesh creation
// ---------------------------------------------------------------------------

/**
 * Create a single BabylonJS mesh for a block definition.
 *
 * @param scene   — Active BabylonJS scene
 * @param blockId — Block definition ID (from blocks.json)
 * @param name    — Unique mesh name
 * @returns The mesh, or null if the blockId is unknown
 */
export function createBlockMesh(
  scene: Scene,
  blockId: string,
  name: string,
): Mesh | null {
  const def = blockMap.get(blockId);
  if (!def) return null;

  const material = getOrCreateMaterial(scene, def.materialKey);
  let mesh: Mesh;

  if (def.category === "post") {
    // Posts are cylindrical
    mesh = CreateCylinder(
      name,
      {
        height: def.footprint.depth,
        diameter: def.footprint.width,
        tessellation: 8,
      },
      scene,
    );
  } else {
    // Everything else is a box
    mesh = CreateBox(
      name,
      {
        width: def.footprint.width,
        height: def.footprint.depth,
        depth: def.footprint.height,
      },
      scene,
    );
  }

  mesh.material = material;
  return mesh;
}

// ---------------------------------------------------------------------------
// Full structure mesh assembly
// ---------------------------------------------------------------------------

/**
 * Create all block meshes for a structure template, position them, and merge
 * same-material groups into a single mesh for draw-call efficiency.
 *
 * The resulting root mesh is positioned at (worldX, 0, worldZ) in world space.
 *
 * @param scene    — Active BabylonJS scene
 * @param template — Structure template definition
 * @param worldX   — World X placement coordinate
 * @param worldZ   — World Z placement coordinate
 * @returns The merged mesh, or null if no blocks could be created
 */
export function createStructureMesh(
  scene: Scene,
  template: StructureTemplate,
  worldX: number,
  worldZ: number,
): Mesh | null {
  // Group blocks by material key for efficient merging
  const materialGroups = new Map<string, Mesh[]>();

  for (let i = 0; i < template.blocks.length; i++) {
    const block = template.blocks[i];
    const def = blockMap.get(block.blockId);
    if (!def) continue;

    const meshName = `${template.id}_${block.blockId}_${i}`;
    const mesh = createBlockMesh(scene, block.blockId, meshName);
    if (!mesh) continue;

    // Position the block within the structure
    mesh.position.x = block.localX;
    mesh.position.y = block.localY;
    mesh.position.z = block.localZ;

    // Apply rotation (Y axis, degrees to radians)
    mesh.rotation.y = (block.rotation * Math.PI) / 180;

    const group = materialGroups.get(def.materialKey);
    if (group) {
      group.push(mesh);
    } else {
      materialGroups.set(def.materialKey, [mesh]);
    }
  }

  // Collect all meshes for final merge
  const allMeshes: Mesh[] = [];
  for (const meshes of materialGroups.values()) {
    for (const m of meshes) {
      allMeshes.push(m);
    }
  }

  if (allMeshes.length === 0) return null;

  // If only one mesh, just reposition it directly
  if (allMeshes.length === 1) {
    const single = allMeshes[0];
    single.position.x += worldX;
    single.position.z += worldZ;
    single.name = `structure_${template.id}`;
    return single;
  }

  // Merge all meshes into a single mesh with multiMaterial to preserve per-block materials
  const merged = Mesh.MergeMeshes(
    allMeshes,
    true,   // disposeSource
    true,   // allow32BitsIndices
    undefined,
    true,   // multiMaterial — true to preserve different block type materials
    true,   // optimizeSharedMaterials
  );

  if (!merged) {
    // Cleanup if merge fails
    for (const m of allMeshes) {
      m.dispose();
    }
    return null;
  }

  merged.name = `structure_${template.id}`;
  merged.position.x = worldX;
  merged.position.z = worldZ;

  return merged;
}

// ---------------------------------------------------------------------------
// Disposal
// ---------------------------------------------------------------------------

/**
 * Dispose a structure mesh and free its resources.
 */
export function disposeStructureMesh(mesh: Mesh): void {
  mesh.dispose(false, false);
}

/**
 * Clear the cached materials. Call when disposing the scene.
 */
export function disposeStructureMaterialCache(): void {
  for (const mat of materialCache.values()) {
    mat.dispose();
  }
  materialCache.clear();
}
