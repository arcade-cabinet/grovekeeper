/**
 * applyNearestFilter — PSX texture sampling utility (Spec §28.1).
 *
 * GLB models loaded via useGLTF carry embedded textures that default to
 * LinearMipmapLinearFilter (trilinear). PSX aesthetic requires NearestFilter
 * on both minification and magnification — this gives the chunky pixel look.
 *
 * Call after cloning a scene from useGLTF:
 *   const cloned = scene.clone(true);
 *   applyNearestFilter(cloned);
 *
 * The function traverses all Mesh children, iterates over their materials,
 * and sets NearestFilter on every texture map.
 */

import { Mesh, NearestFilter, Texture } from "three";
import type { Object3D } from "three";

/** All Material map fields that may hold a Texture reference. */
const TEXTURE_MAP_KEYS = [
  "map",
  "normalMap",
  "roughnessMap",
  "metalnessMap",
  "aoMap",
  "emissiveMap",
  "alphaMap",
  "lightMap",
] as const;

type TextureMapKey = (typeof TEXTURE_MAP_KEYS)[number];

/**
 * Apply NearestFilter to every texture in an Object3D's material tree.
 *
 * Mutates the object in-place (safe because callers should pass a cloned scene,
 * not the cached scene from useGLTF directly).
 *
 * Pure enough to be tested without a WebGL context — the only Three.js
 * values used are the NearestFilter constant and the Mesh/Texture instanceof checks.
 *
 * @param root  The root Object3D to traverse (typically `scene.clone(true)`)
 */
export function applyNearestFilter(root: Object3D): void {
  root.traverse((obj) => {
    if (!(obj instanceof Mesh)) return;
    const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of materials) {
      if (!mat) continue;
      for (const key of TEXTURE_MAP_KEYS) {
        const tex: Texture | null | undefined = (mat as Record<TextureMapKey, Texture | null | undefined>)[key];
        if (tex instanceof Texture) {
          tex.minFilter = NearestFilter;
          tex.magFilter = NearestFilter;
          tex.needsUpdate = true;
        }
      }
    }
  });
}

/**
 * Count the number of textures that have NearestFilter applied.
 * Exported as a testing seam — pure traversal, no WebGL calls.
 */
export function countNearestFilterTextures(root: Object3D): number {
  let count = 0;
  root.traverse((obj) => {
    if (!(obj instanceof Mesh)) return;
    const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of materials) {
      if (!mat) continue;
      for (const key of TEXTURE_MAP_KEYS) {
        const tex: Texture | null | undefined = (mat as Record<TextureMapKey, Texture | null | undefined>)[key];
        if (tex instanceof Texture && tex.magFilter === NearestFilter) {
          count++;
        }
      }
    }
  });
  return count;
}
