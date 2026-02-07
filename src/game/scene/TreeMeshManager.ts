/**
 * TreeMeshManager — Tree mesh lifecycle, template caching, LOD, and frame sync.
 *
 * Manages the template cache (one template per species+season+night combo),
 * creates tree meshes via clone, handles smooth scale interpolation (lerp),
 * and freezes world matrices on fully-grown (stage 4) trees for performance.
 */

import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Scene } from "@babylonjs/core/scene";
import { treesQuery } from "../ecs/world";
import { buildSpeciesTreeMesh } from "../utils/treeMeshBuilder";
import type { Season } from "../systems/time";

/** Lerp speed for smooth growth animations. */
const LERP_SPEED = 3.0;

export class TreeMeshManager {
  /** Live tree meshes keyed by entity ID. */
  readonly meshes = new Map<string, Mesh>();
  /** Template mesh cache keyed by `${speciesId}_${season}[_night]`. */
  private templates = new Map<string, Mesh>();
  /** Set of entity IDs whose world matrices are frozen (stage 4). */
  private frozen = new Set<string>();

  /** Create or retrieve a cached template, then clone it. */
  createMesh(
    scene: Scene,
    entityId: string,
    speciesId: string,
    season: Season | undefined,
    _meshSeed: number | undefined,
    nightTime: boolean,
  ): Mesh {
    const nightSuffix = speciesId === "ghost-birch" && nightTime ? "_night" : "";
    const cacheKey = `${speciesId}_${season ?? "default"}${nightSuffix}`;
    let template = this.templates.get(cacheKey);

    if (!template) {
      template = buildSpeciesTreeMesh(scene, `template_${cacheKey}`, speciesId, season, 0, nightTime);
      template.isVisible = false;
      template.setEnabled(false);
      this.templates.set(cacheKey, template);
    }

    const mesh = template.clone(`tree_${entityId}`, null);
    if (!mesh) {
      throw new Error(`Failed to clone tree template "${cacheKey}" for entity "${entityId}"`);
    }
    mesh.isVisible = true;
    mesh.setEnabled(true);

    this.meshes.set(entityId, mesh);
    return mesh;
  }

  /** Sync all tree meshes: position, lerp scale, and freeze stage 4 matrices. */
  update(scene: Scene, dt: number, season: Season | undefined, isNight: boolean): void {
    const lerpFactor = Math.min(1, dt * LERP_SPEED);

    for (const entity of treesQuery) {
      if (!entity.position || !entity.tree || !entity.renderable) continue;

      let mesh = this.meshes.get(entity.id);
      if (!mesh) {
        mesh = this.createMesh(scene, entity.id, entity.tree.speciesId, season, entity.tree.meshSeed, isNight);
      }

      mesh.position.x = entity.position.x;
      mesh.position.z = entity.position.z;

      const targetScale = entity.renderable.scale;
      const currentScale = mesh.scaling.x;
      const isScaling = Math.abs(targetScale - currentScale) > 0.001;

      if (isScaling) {
        // Unfreeze if it was frozen (tree is growing again)
        if (this.frozen.has(entity.id)) {
          mesh.unfreezeWorldMatrix();
          this.frozen.delete(entity.id);
        }
        const smoothed = currentScale + (targetScale - currentScale) * lerpFactor;
        mesh.scaling.setAll(smoothed);
        mesh.position.y = smoothed * 0.4;
      } else {
        // Freeze stage 4 trees for performance
        if (entity.tree.stage === 4 && !this.frozen.has(entity.id)) {
          mesh.freezeWorldMatrix();
          mesh.isPickable = false;
          this.frozen.add(entity.id);
        }
        if (currentScale !== targetScale) {
          mesh.scaling.setAll(targetScale);
          mesh.position.y = targetScale * 0.4;
        }
      }
    }
  }

  /** Remove a single tree mesh (e.g. on harvest). */
  removeMesh(entityId: string): void {
    const mesh = this.meshes.get(entityId);
    if (mesh) {
      mesh.dispose();
      this.meshes.delete(entityId);
    }
    this.frozen.delete(entityId);
  }

  /** Rebuild all tree meshes (e.g. on season change). */
  rebuildAll(scene: Scene, season: Season, isNight: boolean): void {
    // Clear templates
    for (const template of this.templates.values()) {
      template.dispose();
    }
    this.templates.clear();
    this.frozen.clear();

    // Rebuild each tree entity's mesh
    for (const entity of treesQuery) {
      if (!entity.tree) continue;
      const oldMesh = this.meshes.get(entity.id);
      const savedScale = oldMesh?.scaling.x ?? entity.renderable?.scale ?? 1;
      if (oldMesh) oldMesh.dispose();

      const newMesh = this.createMesh(scene, entity.id, entity.tree.speciesId, season, entity.tree.meshSeed, isNight);
      newMesh.scaling.setAll(savedScale);
    }
  }

  /** Clear templates only (e.g. before a full rebuild). */
  clearTemplates(): void {
    // Unfreeze and dispose frozen meshes before clearing the set
    for (const entityId of this.frozen) {
      const mesh = this.meshes.get(entityId);
      if (mesh) {
        mesh.unfreezeWorldMatrix();
      }
    }
    this.frozen.clear();
    for (const template of this.templates.values()) {
      template.dispose();
    }
    this.templates.clear();
  }

  dispose(): void {
    for (const mesh of this.meshes.values()) {
      mesh.dispose();
    }
    this.meshes.clear();
    for (const template of this.templates.values()) {
      template.dispose();
    }
    this.templates.clear();
    this.frozen.clear();
  }
}
