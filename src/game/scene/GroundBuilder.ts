/**
 * GroundBuilder — PBR ground mesh + material management.
 *
 * Replaces the old GrassProceduralTexture + StandardMaterial approach with
 * PBR materials using ambientCG texture sets (grass, soil, stone).
 */

import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Scene } from "@babylonjs/core/scene";
import { GRID_SIZE } from "../constants/config";
import type { Season } from "../systems/time";
import { getSeasonalColors } from "../systems/time";

/** PBR texture paths for ground materials. */
const GROUND_TEXTURES = {
  grass: {
    color: "/textures/ground/grass/color.jpg",
    normal: "/textures/ground/grass/normal.jpg",
    roughness: "/textures/ground/grass/roughness.jpg",
    ao: "/textures/ground/grass/ao.jpg",
  },
  soil: {
    color: "/textures/ground/soil/color.jpg",
    normal: "/textures/ground/soil/normal.jpg",
    roughness: "/textures/ground/soil/roughness.jpg",
    ao: "/textures/ground/soil/ao.jpg",
  },
  stone: {
    color: "/textures/ground/stone/color.jpg",
    normal: "/textures/ground/stone/normal.jpg",
    roughness: "/textures/ground/stone/roughness.jpg",
  },
} as const;

export interface WorldBounds {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
}

export class GroundBuilder {
  private groundMesh: Mesh | null = null;
  private zoneMeshes: Mesh[] = [];
  private gridOverlays: Mesh[] = [];
  private grassMat: PBRMaterial | null = null;
  private soilMat: PBRMaterial | null = null;
  private stoneMat: PBRMaterial | null = null;

  init(scene: Scene, worldBounds?: WorldBounds): void {
    const bounds = worldBounds ?? {
      minX: 0, minZ: 0, maxX: GRID_SIZE, maxZ: GRID_SIZE,
    };
    const worldW = bounds.maxX - bounds.minX;
    const worldH = bounds.maxZ - bounds.minZ;
    const centerX = bounds.minX + worldW / 2 - 0.5;
    const centerZ = bounds.minZ + worldH / 2 - 0.5;

    // --- Base ground (grass) covering the full world + padding ---
    const groundSize = Math.max(worldW, worldH) + 8;
    this.groundMesh = CreateGround("ground", {
      width: groundSize,
      height: groundSize,
      subdivisions: 32,
    }, scene);
    this.groundMesh.position = new Vector3(centerX, -0.05, centerZ);

    this.grassMat = this.createGroundPBR(scene, "grassMat", GROUND_TEXTURES.grass);
    this.groundMesh.material = this.grassMat;

    // Pre-create shared PBR materials for zone overlays
    this.soilMat = this.createGroundPBR(scene, "soilMat", GROUND_TEXTURES.soil);
    this.stoneMat = this.createGroundPBR(scene, "stoneMat", GROUND_TEXTURES.stone);
  }

  /**
   * Add a zone ground overlay (soil/stone/dirt) with an optional wireframe grid.
   * Call after init() for each zone that needs a non-grass ground material.
   */
  addZoneGround(
    scene: Scene,
    zoneId: string,
    origin: { x: number; z: number },
    size: { width: number; height: number },
    material: "grass" | "soil" | "dirt" | "stone",
    showGrid: boolean,
  ): void {
    const centerX = origin.x + size.width / 2 - 0.5;
    const centerZ = origin.z + size.height / 2 - 0.5;

    // Select material (grass zones skip overlay — base ground covers them)
    let mat: PBRMaterial | null = null;
    if (material === "soil" || material === "dirt") mat = this.soilMat;
    else if (material === "stone") mat = this.stoneMat;

    if (mat) {
      const mesh = CreateGround(`zone_ground_${zoneId}`, {
        width: size.width,
        height: size.height,
      }, scene);
      mesh.position = new Vector3(centerX, 0.005, centerZ);
      mesh.material = mat;
      this.zoneMeshes.push(mesh);
    }

    if (showGrid) {
      const gridSize = Math.max(size.width, size.height);
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
      gridMat.alpha = 0.25;
      gridMat.wireframe = true;
      overlay.material = gridMat;
      this.gridOverlays.push(overlay);
    }
  }

  /** Update ground visuals when the season changes. */
  updateSeason(season: Season, seasonProgress: number): void {
    const seasonalColors = getSeasonalColors(season, seasonProgress);

    if (this.grassMat) {
      const rgb = hexToRgb(seasonalColors.groundColor);
      this.grassMat.albedoColor = new Color3(rgb.r / 255, rgb.g / 255, rgb.b / 255);
    }
  }

  private createGroundPBR(
    scene: Scene,
    name: string,
    textures: { color: string; normal: string; roughness: string; ao?: string },
  ): PBRMaterial {
    const mat = new PBRMaterial(name, scene);
    mat.albedoTexture = new Texture(textures.color, scene);
    mat.bumpTexture = new Texture(textures.normal, scene);
    mat.metallicTexture = new Texture(textures.roughness, scene);
    mat.useRoughnessFromMetallicTextureAlpha = false;
    mat.useRoughnessFromMetallicTextureGreen = true;
    if (textures.ao) {
      mat.ambientTexture = new Texture(textures.ao, scene);
    }
    mat.metallic = 0;
    mat.roughness = 1;
    return mat;
  }

  dispose(): void {
    this.groundMesh?.dispose();
    for (const m of this.zoneMeshes) m.dispose();
    for (const m of this.gridOverlays) m.dispose();
    this.grassMat?.dispose();
    this.soilMat?.dispose();
    this.stoneMat?.dispose();
    this.groundMesh = null;
    this.zoneMeshes = [];
    this.gridOverlays = [];
    this.grassMat = null;
    this.soilMat = null;
    this.stoneMat = null;
  }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: Number.parseInt(result[1], 16),
        g: Number.parseInt(result[2], 16),
        b: Number.parseInt(result[3], 16),
      }
    : { r: 128, g: 128, b: 128 };
}
