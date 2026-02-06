/**
 * BorderTreeManager — Decorative border tree placement around the grove.
 *
 * Places frozen, non-interactive trees around the grid perimeter
 * for visual framing. Rebuilt on season change.
 */

import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Scene } from "@babylonjs/core/scene";
import { GRID_SIZE } from "../constants/config";
import { createRNG, hashString } from "../utils/seedRNG";
import { buildSpeciesTreeMesh } from "../utils/treeMeshBuilder";
import type { Season } from "../systems/time";

const BORDER_POSITIONS = [
  // Left side
  { x: -2, z: 2 }, { x: -2.5, z: 5 }, { x: -1.8, z: 8 }, { x: -2.2, z: 11 },
  // Right side
  { x: GRID_SIZE + 1, z: 1 }, { x: GRID_SIZE + 1.5, z: 4 },
  { x: GRID_SIZE + 1.2, z: 7 }, { x: GRID_SIZE + 2, z: 10 },
  // Back
  { x: 2, z: GRID_SIZE + 1.5 }, { x: 5, z: GRID_SIZE + 2 },
  { x: 8, z: GRID_SIZE + 1.8 }, { x: 11, z: GRID_SIZE + 1.5 },
  // Front corners
  { x: -1.5, z: -1 }, { x: GRID_SIZE + 1, z: -0.5 },
];

const BORDER_SPECIES = ["white-oak", "elder-pine", "weeping-willow", "ghost-birch"];

export class BorderTreeManager {
  private meshes: Mesh[] = [];

  /** Create border trees for the given season. */
  init(scene: Scene, season?: Season, isNight = false): void {
    this.meshes = this.createBorderTrees(scene, season, isNight);
  }

  /** Rebuild border trees (e.g. on season change). */
  rebuild(scene: Scene, season: Season, isNight: boolean): void {
    this.dispose();
    this.meshes = this.createBorderTrees(scene, season, isNight);
  }

  private createBorderTrees(scene: Scene, season?: Season, isNight = false): Mesh[] {
    const meshes: Mesh[] = [];
    const rng = createRNG(hashString("border-trees"));

    for (let i = 0; i < BORDER_POSITIONS.length; i++) {
      const pos = BORDER_POSITIONS[i];
      const scale = 0.8 + rng() * 0.5;
      const speciesId = BORDER_SPECIES[i % BORDER_SPECIES.length];
      const seed = hashString(`border-${i}`);

      const mesh = buildSpeciesTreeMesh(scene, `border_${i}`, speciesId, season, seed, isNight);
      mesh.scaling.setAll(scale);
      mesh.position = new Vector3(pos.x, scale * 0.4, pos.z);
      mesh.freezeWorldMatrix();
      mesh.isPickable = false;
      meshes.push(mesh);
    }

    return meshes;
  }

  dispose(): void {
    for (const mesh of this.meshes) {
      mesh.dispose();
    }
    this.meshes = [];
  }
}
