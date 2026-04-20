/**
 * TreeMeshManager — Tree mesh lifecycle, template caching, LOD, and frame sync.
 *
 * Manages the template cache (one template per species+season+night combo),
 * creates tree meshes via InstancedMesh (GPU instancing), handles smooth
 * scale interpolation (lerp), and freezes world matrices on fully-grown
 * (stage 4) trees for performance.
 *
 * GPU instancing: per docs/PERF_AUDIT.md, the old .clone() approach
 * produced one draw call per tree plus a full duplicate of every
 * submesh/material binding. createInstance() shares geometry + materials
 * with the template so Babylon batches them into a single draw call per
 * (species, season, night) combo — target: 50 trees → ~5-10 draw calls
 * instead of 100.
 */

import type { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Scene } from "@babylonjs/core/scene";
import { koota } from "@/koota";
import { buildSpeciesTreeMesh } from "@/shared/utils/treeMeshBuilder";
import type { Season } from "@/systems/time";
import { Position, Renderable, Tree } from "@/traits";

type TreeMesh = InstancedMesh | Mesh;

/** Lerp speed for smooth growth animations. */
const LERP_SPEED = 3.0;
/** Visual scale multiplier — shrinks trees for the close over-the-shoulder camera. */
const TREE_VISUAL_SCALE = 0.5;

export class TreeMeshManager {
  /** Live tree meshes keyed by entity numeric id. */
  readonly meshes = new Map<number, TreeMesh>();
  /** Template mesh cache keyed by `${speciesId}_${season}[_night]`. */
  private templates = new Map<string, Mesh>();
  /** Set of entity IDs whose world matrices are frozen (stage 4). */
  private frozen = new Set<number>();

  /** Create or retrieve a cached template, then create an instance. */
  createMesh(
    scene: Scene,
    entityId: number,
    speciesId: string,
    season: Season | undefined,
    _meshSeed: number | undefined,
    nightTime: boolean,
  ): TreeMesh {
    const nightSuffix =
      speciesId === "ghost-birch" && nightTime ? "_night" : "";
    const cacheKey = `${speciesId}_${season ?? "default"}${nightSuffix}`;
    let template = this.templates.get(cacheKey);

    if (!template) {
      template = buildSpeciesTreeMesh(
        scene,
        `template_${cacheKey}`,
        speciesId,
        season,
        0,
        nightTime,
      );
      // Hide the template off-world instead of disabling — disabled
      // meshes don't carry their instances in the render pass. Park it
      // below the ground plane so nothing sees it.
      template.position.y = -10000;
      template.isPickable = false;
      this.templates.set(cacheKey, template);
    }

    const mesh = template.createInstance(`tree_${entityId}`);
    mesh.isVisible = true;
    mesh.setEnabled(true);
    mesh.isPickable = true;
    mesh.metadata = {
      entityId,
      entityType: "tree",
      speciesId,
    };

    this.meshes.set(entityId, mesh);
    return mesh;
  }

  /** Sync all tree meshes: position, lerp scale, and freeze stage 4 matrices. */
  update(
    scene: Scene,
    dt: number,
    season: Season | undefined,
    isNight: boolean,
  ): void {
    const lerpFactor = Math.min(1, dt * LERP_SPEED);

    for (const entity of koota.query(Tree, Position, Renderable)) {
      const tree = entity.get(Tree);
      const position = entity.get(Position);
      const renderable = entity.get(Renderable);
      const eid = entity.id();

      let mesh = this.meshes.get(eid);
      if (!mesh) {
        mesh = this.createMesh(
          scene,
          eid,
          tree.speciesId,
          season,
          tree.meshSeed,
          isNight,
        );
      }

      mesh.position.x = position.x;
      mesh.position.z = position.z;

      const targetScale = renderable.scale * TREE_VISUAL_SCALE;
      const currentScale = mesh.scaling.x;
      const isScaling = Math.abs(targetScale - currentScale) > 0.001;

      if (isScaling) {
        // Unfreeze if it was frozen (tree is growing again)
        if (this.frozen.has(eid)) {
          mesh.unfreezeWorldMatrix();
          this.frozen.delete(eid);
        }
        const smoothed =
          currentScale + (targetScale - currentScale) * lerpFactor;
        mesh.scaling.setAll(smoothed);
        mesh.position.y = smoothed * 0.4;
      } else {
        // Freeze stage 4 trees for performance.
        // - freezeWorldMatrix: skip per-frame matrix recomputation.
        // - isPickable=false: remove from raycast scans (old-growth trees
        //   stop being harvest targets in the cozy game anyway).
        // - doNotSyncBoundingInfo: bounding info is only needed for
        //   picking/frustum; frozen trees don't need live bounds.
        // - freezeNormals on the template's geometry is a no-op for
        //   instances (they share the template's vertex buffer), but we
        //   make sure the mesh's own normals aren't recomputed by
        //   keeping the default frozen-matrix path.
        if (tree.stage === 4 && !this.frozen.has(eid)) {
          mesh.freezeWorldMatrix();
          mesh.isPickable = false;
          mesh.doNotSyncBoundingInfo = true;
          this.frozen.add(eid);
        }
        if (currentScale !== targetScale) {
          mesh.scaling.setAll(targetScale);
          mesh.position.y = targetScale * 0.4;
        }
      }
    }
  }

  /** Remove a single tree mesh (e.g. on harvest). */
  removeMesh(entityId: number): void {
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
    for (const entity of koota.query(Tree, Position, Renderable)) {
      const tree = entity.get(Tree);
      const renderable = entity.get(Renderable);
      const eid = entity.id();
      const oldMesh = this.meshes.get(eid);
      const savedScale =
        oldMesh?.scaling.x ?? renderable.scale * TREE_VISUAL_SCALE;
      if (oldMesh) oldMesh.dispose();

      const newMesh = this.createMesh(
        scene,
        eid,
        tree.speciesId,
        season,
        tree.meshSeed,
        isNight,
      );
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
