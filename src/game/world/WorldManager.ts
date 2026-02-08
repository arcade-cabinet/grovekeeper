/**
 * WorldManager — Manages zone loading/unloading and world-space queries.
 *
 * Owns the WorldDefinition and tracks which zones are currently loaded.
 * Handles zone boundary detection, coordinate transforms, and zone transitions.
 */

import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Scene } from "@babylonjs/core/scene";
import type { Entity } from "../ecs/world";
import {
  createStructureMesh,
  disposeStructureMesh,
} from "../structures/BlockMeshFactory";
import { getTemplate } from "../structures/StructureManager";
import { createPropMesh, disposePropMeshes } from "./PropFactory";
import type { WorldDefinition, ZoneDefinition } from "./types";
import { loadZoneEntities, unloadZoneEntities } from "./ZoneLoader";

interface LoadedZone {
  definition: ZoneDefinition;
  entities: Entity[];
  propMeshes: Mesh[];
  structMeshes: Mesh[];
}

export class WorldManager {
  private worldDef: WorldDefinition | null = null;
  private loadedZones = new Map<string, LoadedZone>();
  private scene: Scene | null = null;

  get world(): WorldDefinition | null {
    return this.worldDef;
  }

  get currentZones(): string[] {
    return Array.from(this.loadedZones.keys());
  }

  /** Initialize with a world definition and a BabylonJS scene. */
  init(worldDef: WorldDefinition, scene: Scene): void {
    this.worldDef = worldDef;
    this.scene = scene;
  }

  /** Load a zone by ID — creates ECS entities and prop meshes. */
  loadZone(zoneId: string): void {
    if (!this.worldDef || !this.scene) return;
    if (this.loadedZones.has(zoneId)) return;

    const zoneDef = this.worldDef.zones.find((z) => z.id === zoneId);
    if (!zoneDef) return;

    const entities = loadZoneEntities(zoneDef);

    // Create prop meshes
    const propMeshes: Mesh[] = [];
    if (zoneDef.props) {
      for (const prop of zoneDef.props) {
        const worldX = zoneDef.origin.x + prop.localX;
        const worldZ = zoneDef.origin.z + prop.localZ;
        const mesh = createPropMesh(this.scene, prop, worldX, worldZ);
        if (mesh) propMeshes.push(mesh);
      }
    }

    // Create structure meshes (Daggerfall-style snapping from block definitions)
    const structMeshes: Mesh[] = [];
    if (zoneDef.structures) {
      for (const struct of zoneDef.structures) {
        const template = getTemplate(struct.templateId);
        if (!template) continue;
        const worldX = zoneDef.origin.x + struct.localX;
        const worldZ = zoneDef.origin.z + struct.localZ;
        const mesh = createStructureMesh(this.scene, template, worldX, worldZ);
        if (mesh) {
          mesh.rotation.y = (struct.rotation * Math.PI) / 180;
          mesh.freezeWorldMatrix();
          mesh.isPickable = false;
          structMeshes.push(mesh);
        }
      }
    }

    this.loadedZones.set(zoneId, {
      definition: zoneDef,
      entities,
      propMeshes,
      structMeshes,
    });
  }

  /** Unload a zone — removes ECS entities and disposes meshes. */
  unloadZone(zoneId: string): void {
    const loaded = this.loadedZones.get(zoneId);
    if (!loaded) return;

    unloadZoneEntities(loaded.entities);
    disposePropMeshes(loaded.propMeshes);
    for (const mesh of loaded.structMeshes) disposeStructureMesh(mesh);
    this.loadedZones.delete(zoneId);
  }

  /** Load all zones in the world (for small worlds). */
  loadAllZones(): void {
    if (!this.worldDef) return;
    for (const zone of this.worldDef.zones) {
      this.loadZone(zone.id);
    }
  }

  /** Unload all zones. */
  unloadAllZones(): void {
    for (const zoneId of Array.from(this.loadedZones.keys())) {
      this.unloadZone(zoneId);
    }
  }

  /** Convert world-space coords to zone-local coords. */
  worldToLocal(
    x: number,
    z: number,
  ): { zoneId: string; localX: number; localZ: number } | null {
    if (!this.worldDef) return null;

    for (const zone of this.worldDef.zones) {
      const localX = x - zone.origin.x;
      const localZ = z - zone.origin.z;
      if (
        localX >= 0 &&
        localX < zone.size.width &&
        localZ >= 0 &&
        localZ < zone.size.height
      ) {
        return { zoneId: zone.id, localX, localZ };
      }
    }
    return null;
  }

  /** Convert zone-local coords to world-space. */
  localToWorld(
    zoneId: string,
    localX: number,
    localZ: number,
  ): { x: number; z: number } | null {
    if (!this.worldDef) return null;
    const zone = this.worldDef.zones.find((z) => z.id === zoneId);
    if (!zone) return null;
    return { x: zone.origin.x + localX, z: zone.origin.z + localZ };
  }

  /** Get the zone definition for a given zone ID. */
  getZone(zoneId: string): ZoneDefinition | undefined {
    return this.worldDef?.zones.find((z) => z.id === zoneId);
  }

  /** Check if a world position is inside any loaded zone. */
  isInBounds(x: number, z: number): boolean {
    return this.worldToLocal(x, z) !== null;
  }

  /** Check if a world position is walkable (not a rock, not out of bounds). */
  isWalkable(x: number, z: number): boolean {
    const local = this.worldToLocal(x, z);
    if (!local) return false;

    const zone = this.getZone(local.zoneId);
    if (!zone) return false;

    // Check tile overrides for rocks
    if (zone.tiles) {
      for (const tile of zone.tiles) {
        if (
          tile.x === Math.floor(local.localX) &&
          tile.z === Math.floor(local.localZ)
        ) {
          return tile.type !== "rock";
        }
      }
    }

    return true;
  }

  /** Get the spawn position in world coordinates. */
  getSpawnPosition(): { x: number; z: number } | null {
    if (!this.worldDef) return null;
    const spawn = this.worldDef.playerSpawn;
    return this.localToWorld(spawn.zoneId, spawn.localX, spawn.localZ);
  }

  /** Get the zone at a given world position. */
  getZoneAt(x: number, z: number): ZoneDefinition | null {
    const local = this.worldToLocal(x, z);
    if (!local) return null;
    return this.getZone(local.zoneId) ?? null;
  }

  /** Get world bounds (bounding box of all zones). */
  getWorldBounds(): { minX: number; minZ: number; maxX: number; maxZ: number } {
    if (!this.worldDef || this.worldDef.zones.length === 0) {
      return { minX: 0, minZ: 0, maxX: 12, maxZ: 12 };
    }

    let minX = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxZ = -Infinity;

    for (const zone of this.worldDef.zones) {
      minX = Math.min(minX, zone.origin.x);
      minZ = Math.min(minZ, zone.origin.z);
      maxX = Math.max(maxX, zone.origin.x + zone.size.width);
      maxZ = Math.max(maxZ, zone.origin.z + zone.size.height);
    }

    return { minX, minZ, maxX, maxZ };
  }

  dispose(): void {
    this.unloadAllZones();
    this.worldDef = null;
    this.scene = null;
  }
}
