/**
 * ModelLoader — Cached .glb model loading utility.
 *
 * Loads character models from public/models/characters/, caches
 * the root mesh as a template, and returns clones for subsequent
 * requests. Falls back gracefully if models aren't available.
 */

import "@babylonjs/loaders/glTF"; // side-effect: registers glTF loader plugin
import type { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Scene } from "@babylonjs/core/scene";

const BASE_URL = import.meta.env.BASE_URL ?? "/";

/** Cached template data: root mesh + animation groups. */
interface ModelTemplate {
  root: Mesh;
  animations: AnimationGroup[];
}

const cache = new Map<string, ModelTemplate>();

/** Result from loading a model. */
export interface LoadedModel {
  mesh: Mesh;
  animations: AnimationGroup[];
}

/**
 * Load a .glb model, returning a clone if already cached.
 * Returns null if the model file is missing or fails to load.
 */
export async function loadModel(
  scene: Scene,
  modelPath: string,
  instanceName: string,
): Promise<LoadedModel | null> {
  try {
    // Return clone from cache
    const cached = cache.get(modelPath);
    if (cached) {
      const clone = cached.root.clone(instanceName);
      if (!clone) return null;
      clone.setEnabled(true);
      // Clone animation groups targeting the new mesh hierarchy
      const clonedAnimations = cached.animations.map((ag) =>
        ag.clone(`${instanceName}_${ag.name}`, (oldTarget: unknown) => {
          // Map animation targets from template mesh to cloned mesh
          if (!oldTarget || typeof oldTarget !== "object") return oldTarget;
          const oldMesh = oldTarget as AbstractMesh;
          const name = oldMesh.name;
          // Find corresponding mesh in clone hierarchy
          return findChildByName(clone, name) ?? clone;
        }),
      );
      return { mesh: clone as Mesh, animations: clonedAnimations };
    }

    // Load fresh
    const result = await SceneLoader.ImportMeshAsync(
      "",
      `${BASE_URL}models/characters/`,
      modelPath,
      scene,
    );

    if (!result.meshes || result.meshes.length === 0) return null;

    const root = result.meshes[0] as Mesh;
    root.name = `template_${modelPath}`;
    root.setEnabled(false); // Template is invisible

    // Cache the template
    const template: ModelTemplate = {
      root,
      animations: result.animationGroups ?? [],
    };
    cache.set(modelPath, template);

    // Stop template animations
    for (const ag of template.animations) {
      ag.stop();
    }

    // Return a clone for actual use
    const clone = root.clone(instanceName);
    if (!clone) return null;
    clone.setEnabled(true);
    const clonedAnimations = template.animations.map((ag) =>
      ag.clone(`${instanceName}_${ag.name}`, (oldTarget: unknown) => {
        if (!oldTarget || typeof oldTarget !== "object") return oldTarget;
        const oldMesh = oldTarget as AbstractMesh;
        const name = oldMesh.name;
        return findChildByName(clone, name) ?? clone;
      }),
    );
    return { mesh: clone as Mesh, animations: clonedAnimations };
  } catch (err) {
    // Model not found or load failed — caller will use primitive fallback
    console.warn(`[ModelLoader] Failed to load ${modelPath}:`, err);
    return null;
  }
}

/** Dispose all cached templates. Call on scene teardown. */
export function disposeModelCache(): void {
  for (const template of cache.values()) {
    template.root.dispose(false, true);
    for (const ag of template.animations) {
      ag.dispose();
    }
  }
  cache.clear();
}

/** Find a child mesh by name in a hierarchy. */
function findChildByName(
  root: AbstractMesh,
  name: string,
): AbstractMesh | null {
  if (root.name === name) return root;
  for (const child of root.getChildMeshes()) {
    if (child.name === name) return child;
  }
  return null;
}
