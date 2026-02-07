/**
 * GroundBuilder — Unified terrain with smooth ecological biome blending.
 *
 * Creates a single ground mesh with a DynamicTexture whose pixels are
 * painted using distance-field blending from zone boundaries. Zone
 * transitions are smooth gradients — no hard edges.
 */

import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Scene } from "@babylonjs/core/scene";
import type { Season } from "../systems/time";
import type { ZoneDefinition } from "../world/types";

/** Biome base colors (R, G, B in 0-1 range) — vibrant and distinct. */
const BIOME_COLORS: Record<string, { r: number; g: number; b: number }> = {
  grass: { r: 0.40, g: 0.62, b: 0.25 },   // bright meadow green
  soil:  { r: 0.52, g: 0.38, b: 0.22 },   // warm earth brown
  dirt:  { r: 0.58, g: 0.48, b: 0.32 },   // sandy clay path
  stone: { r: 0.56, g: 0.54, b: 0.50 },   // cool hewn stone
};

/** Wilderness color (areas outside all zones) — deep forest green. */
const WILDERNESS_COLOR = { r: 0.18, g: 0.32, b: 0.12 };

/** Width of ecological transition zone (world tiles). */
const TRANSITION_WIDTH = 3;

/** DynamicTexture resolution. 512 is ample for a terrain colormap. */
const TEX_RESOLUTION = 512;

/** Padding around world bounds for the ground mesh.
 * Must be large enough to cover viewport corners when camera is rotated 45°.
 * For an ortho view of ~24 tiles at 45° rotation, corners extend ~17 tiles from center. */
const WORLD_PADDING = 24;

export interface WorldBounds {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
}

export class GroundBuilder {
  private groundMesh: Mesh | null = null;
  private gridOverlays: Mesh[] = [];
  private groundMat: StandardMaterial | null = null;
  private biomeTexture: DynamicTexture | null = null;
  private zones: ZoneDefinition[] = [];

  /**
   * Initialize the ground with smooth biome blending.
   * @param zones — All zone definitions (needed to paint the biome map).
   */
  init(scene: Scene, worldBounds: WorldBounds, zones: ZoneDefinition[]): void {
    this.zones = zones;

    const padMinX = worldBounds.minX - WORLD_PADDING;
    const padMinZ = worldBounds.minZ - WORLD_PADDING;
    const padMaxX = worldBounds.maxX + WORLD_PADDING;
    const padMaxZ = worldBounds.maxZ + WORLD_PADDING;
    const worldW = padMaxX - padMinX;
    const worldH = padMaxZ - padMinZ;
    const groundSize = Math.max(worldW, worldH);
    const centerX = (padMinX + padMaxX) / 2 - 0.5;
    const centerZ = (padMinZ + padMaxZ) / 2 - 0.5;

    // Single ground mesh — no per-zone overlays
    this.groundMesh = CreateGround("ground", {
      width: groundSize,
      height: groundSize,
      subdivisions: 1,
    }, scene);
    this.groundMesh.position = new Vector3(centerX, -0.05, centerZ);

    // Standard material — biome blend DynamicTexture as diffuse
    this.groundMat = new StandardMaterial("groundMat", scene);
    this.groundMat.specularColor = new Color3(0, 0, 0);
    // Enable ambient lighting on the ground — without this, scene.ambientColor
    // has zero effect (BabylonJS multiplies scene.ambient × material.ambient).
    this.groundMat.ambientColor = new Color3(1, 1, 1);

    // Paint biome blend texture
    this.biomeTexture = new DynamicTexture("biomeTex", TEX_RESOLUTION, scene, false);
    this.paintBiomeTexture(padMinX, padMinZ, padMaxX, padMaxZ);
    this.groundMat.diffuseTexture = this.biomeTexture;

    this.groundMesh.material = this.groundMat;
  }

  /**
   * Add a subtle wireframe grid overlay for plantable zones.
   * Call after init() for zones where players can plant trees.
   */
  addPlantableGrid(
    scene: Scene,
    zoneId: string,
    origin: { x: number; z: number },
    size: { width: number; height: number },
  ): void {
    const centerX = origin.x + size.width / 2 - 0.5;
    const centerZ = origin.z + size.height / 2 - 0.5;

    const overlay = CreateGround(`zone_grid_${zoneId}`, {
      width: size.width,
      height: size.height,
      subdivisionsX: size.width,
      subdivisionsY: size.height,
    }, scene);
    overlay.position = new Vector3(centerX, 0.01, centerZ);

    const gridMat = new StandardMaterial(`gridMat_${zoneId}`, scene);
    gridMat.diffuseColor = new Color3(0.35, 0.28, 0.18);
    gridMat.specularColor = new Color3(0, 0, 0);
    gridMat.alpha = 0.15;
    gridMat.wireframe = true;
    overlay.material = gridMat;

    this.gridOverlays.push(overlay);
  }

  /** Update ground visuals when the season changes. */
  updateSeason(season: Season, _seasonProgress: number): void {
    if (!this.groundMat) return;

    // Gentle seasonal color tint on the entire terrain
    const seasonTints: Record<string, { r: number; g: number; b: number }> = {
      spring: { r: 1.0, g: 1.05, b: 0.95 },
      summer: { r: 1.05, g: 1.0, b: 0.9 },
      autumn: { r: 1.1, g: 0.95, b: 0.8 },
      winter: { r: 0.9, g: 0.95, b: 1.05 },
    };
    const tint = seasonTints[season] ?? { r: 1, g: 1, b: 1 };
    this.groundMat.diffuseColor = new Color3(tint.r, tint.g, tint.b);
  }

  // ---------------------------------------------------------------------------
  // Biome texture painting
  // ---------------------------------------------------------------------------

  /** Paint the DynamicTexture with smooth ecological biome blending. */
  private paintBiomeTexture(
    worldMinX: number, worldMinZ: number,
    worldMaxX: number, worldMaxZ: number,
  ): void {
    if (!this.biomeTexture) return;

    const ctx = this.biomeTexture.getContext();
    const size = TEX_RESOLUTION;
    const worldW = worldMaxX - worldMinX;
    const worldH = worldMaxZ - worldMinZ;

    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const worldX = worldMinX + (px / size) * worldW;
        const worldZ = worldMinZ + (py / size) * worldH;

        const color = this.sampleBiomeColor(worldX, worldZ);
        const r = Math.round(color.r * 255);
        const g = Math.round(color.g * 255);
        const b = Math.round(color.b * 255);

        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(px, py, 1, 1);
      }
    }

    this.biomeTexture.update();
  }

  /** Sample blended biome color at a world position using distance-field weights. */
  private sampleBiomeColor(worldX: number, worldZ: number): { r: number; g: number; b: number } {
    let totalWeight = 0;
    let r = 0;
    let g = 0;
    let b = 0;

    for (const zone of this.zones) {
      const dist = this.distanceToZone(worldX, worldZ, zone);
      const weight = this.smoothWeight(dist);
      if (weight <= 0) continue;

      const biomeColor = BIOME_COLORS[zone.groundMaterial] ?? WILDERNESS_COLOR;
      r += biomeColor.r * weight;
      g += biomeColor.g * weight;
      b += biomeColor.b * weight;
      totalWeight += weight;
    }

    if (totalWeight > 0) {
      // Blend zone colors with wilderness for the remainder
      const wildWeight = Math.max(0, 1 - totalWeight);
      const denom = totalWeight + wildWeight;
      r = (r + WILDERNESS_COLOR.r * wildWeight) / denom;
      g = (g + WILDERNESS_COLOR.g * wildWeight) / denom;
      b = (b + WILDERNESS_COLOR.b * wildWeight) / denom;
    } else {
      r = WILDERNESS_COLOR.r;
      g = WILDERNESS_COLOR.g;
      b = WILDERNESS_COLOR.b;
    }

    return { r, g, b };
  }

  /**
   * Compute signed distance from a point to a zone boundary.
   * Returns negative if inside the zone, positive if outside.
   */
  private distanceToZone(worldX: number, worldZ: number, zone: ZoneDefinition): number {
    const ox = zone.origin.x;
    const oz = zone.origin.z;
    const w = zone.size.width;
    const h = zone.size.height;

    const dLeft   = ox - worldX;
    const dRight  = worldX - (ox + w);
    const dTop    = oz - worldZ;
    const dBottom = worldZ - (oz + h);

    // Inside: all four are negative; distance is the max (closest to edge)
    if (dLeft <= 0 && dRight <= 0 && dTop <= 0 && dBottom <= 0) {
      return Math.max(dLeft, dRight, dTop, dBottom);
    }

    // Outside: Euclidean distance to the nearest point on the zone rect
    const dx = Math.max(dLeft, 0, dRight);
    const dz = Math.max(dTop, 0, dBottom);
    return Math.sqrt(dx * dx + dz * dz);
  }

  /**
   * Weight function: 1 inside zone, smooth falloff to 0 at TRANSITION_WIDTH.
   * Uses inverse smoothstep for natural ecological gradient.
   */
  private smoothWeight(dist: number): number {
    if (dist <= 0) return 1;
    if (dist >= TRANSITION_WIDTH) return 0;
    const t = dist / TRANSITION_WIDTH;
    // Inverse smoothstep: 1 at t=0, 0 at t=1
    return 1 - t * t * (3 - 2 * t);
  }

  dispose(): void {
    this.groundMesh?.dispose();
    for (const m of this.gridOverlays) m.dispose();
    this.groundMat?.dispose();
    this.biomeTexture?.dispose();
    this.groundMesh = null;
    this.gridOverlays = [];
    this.groundMat = null;
    this.biomeTexture = null;
  }
}
