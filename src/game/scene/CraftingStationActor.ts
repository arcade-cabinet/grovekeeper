/**
 * CraftingStationActor — a placeable workbench Actor.
 *
 * Renders the workbench GLTF (`assets/models/props/workbench/Desk_glt.gltf`).
 * Carries a stable `stationId` (e.g. `"primitive-workbench"`) the crafting
 * layer reads to filter recipes.
 *
 * Player proximity: `isPlayerNear(...)` returns true when the player
 * is inside `proximityRadius` voxels (default 2). The runtime polls
 * this each frame and, when the player presses `open-craft` while
 * near a station, opens the crafting panel for that station's id.
 */

import { type Actor, ActorComponent, ModelRenderer } from "@jolly-pixel/engine";
import { actorObject3D } from "@/shared/utils/actorUtils";

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

function workbenchModelPath(): string {
  const base =
    typeof import.meta !== "undefined" && import.meta.env?.BASE_URL
      ? import.meta.env.BASE_URL
      : "/";
  const baseTrimmed = base.endsWith("/") ? base.slice(0, -1) : base;
  return `${baseTrimmed}/assets/models/props/workbench/Desk_glt.gltf`;
}

export class CraftingStationActor extends ActorComponent {
  readonly stationId: string;
  private readonly proximityRadius: number;

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

    this.actor.addComponent(ModelRenderer, {
      path: workbenchModelPath(),
    });
  }

  awake(): void {
    this.needUpdate = false;
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
}
