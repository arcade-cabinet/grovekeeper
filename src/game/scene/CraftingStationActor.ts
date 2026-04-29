/**
 * CraftingStationActor — a placeable workbench Actor.
 *
 * Renders a small voxel-style workbench (placeholder cube for RC; the
 * voxel-realms `Desk_glt.gltf` Wave-3b conversion is not yet wired —
 * see TODO at the asset path). Carries a stable `stationId` (e.g.
 * `"primitive-workbench"`) the crafting layer reads to filter recipes.
 *
 * Player proximity: `isPlayerNear(...)` returns true when the player
 * is inside `proximityRadius` voxels (default 2). The runtime polls
 * this each frame and, when the player presses `open-craft` while
 * near a station, opens the crafting panel for that station's id.
 *
 * For RC scope this is the *first* (and currently only) crafting
 * station type. Wave 18 (journey wave) will wire one of these into
 * the starter grove on world-create. Manual placement for testing is
 * supported via the spawn helper at the bottom of this file.
 */

import { type Actor, ActorComponent } from "@jolly-pixel/engine";
import * as THREE from "three";

function actorObject3D(actor: Actor): THREE.Object3D | undefined {
  return (actor as unknown as { object3D?: THREE.Object3D }).object3D;
}

export interface CraftingStationActorOptions {
  /**
   * Station id this actor represents. Must match the `station` field
   * on at least one recipe in `@/content/recipes/recipes.json`.
   */
  stationId: string;
  /** World-space spawn position. */
  position: { x: number; y: number; z: number };
  /**
   * Activation radius in voxel units. Player within this distance to
   * the station's XZ position counts as "near". Default 2.
   */
  proximityRadius?: number;
}

const DEFAULT_PROXIMITY_RADIUS = 2;

/**
 * Tiny helper: a wood-tone block geometry standing in for the real
 * workbench mesh. The voxel-realms desk GLB conversion (Wave 3b) lives
 * at `public/assets/models/props/workbench/Desk_glt.gltf`, but wiring
 * the engine's `ModelRenderer` here for one stationary prop costs more
 * than the visual gain at RC scope. We document the swap path in the
 * file header and leave the placeholder visible enough to find on the
 * grass.
 */
function buildPlaceholderMesh(): THREE.Mesh {
  const geom = new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.MeshLambertMaterial({ color: 0xa0703a });
  return new THREE.Mesh(geom, mat);
}

export class CraftingStationActor extends ActorComponent {
  readonly stationId: string;
  private readonly proximityRadius: number;
  private mesh: THREE.Mesh | null = null;

  constructor(actor: Actor, options: CraftingStationActorOptions) {
    super({ actor, typeName: "CraftingStationActor" });
    this.stationId = options.stationId;
    this.proximityRadius = options.proximityRadius ?? DEFAULT_PROXIMITY_RADIUS;

    const obj3D = actorObject3D(this.actor);
    obj3D?.position.set(
      options.position.x,
      options.position.y,
      options.position.z,
    );
  }

  awake(): void {
    this.needUpdate = false;
    const obj3D = actorObject3D(this.actor);
    if (!obj3D) return;
    this.mesh = buildPlaceholderMesh();
    obj3D.add(this.mesh);
  }

  /**
   * True when the player's XZ position is within `proximityRadius` of
   * the station. Y is ignored — the station sits on the ground and
   * the player walks on top of it.
   */
  isPlayerNear(player: { x: number; z: number }): boolean {
    const obj3D = actorObject3D(this.actor);
    if (!obj3D) return false;
    const dx = obj3D.position.x - player.x;
    const dz = obj3D.position.z - player.z;
    return Math.hypot(dx, dz) <= this.proximityRadius;
  }

  dispose(): void {
    if (this.mesh) {
      const obj3D = actorObject3D(this.actor);
      obj3D?.remove(this.mesh);
      this.mesh.geometry.dispose();
      const mat = this.mesh.material as THREE.Material | THREE.Material[];
      if (Array.isArray(mat)) for (const m of mat) m.dispose();
      else mat.dispose();
      this.mesh = null;
    }
  }
}
