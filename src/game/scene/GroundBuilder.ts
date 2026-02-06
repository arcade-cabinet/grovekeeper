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

export class GroundBuilder {
  private groundMesh: Mesh | null = null;
  private soilMesh: Mesh | null = null;
  private gridOverlay: Mesh | null = null;
  private grassMat: PBRMaterial | null = null;
  private soilMat: PBRMaterial | null = null;

  init(scene: Scene): void {
    const groundSize = GRID_SIZE + 4;
    const gridCenter = GRID_SIZE / 2 - 0.5;

    // --- Outer ground (forest floor) using PBR grass ---
    this.groundMesh = CreateGround("ground", {
      width: groundSize,
      height: groundSize,
      subdivisions: 32,
    }, scene);
    this.groundMesh.position = new Vector3(gridCenter, -0.05, gridCenter);

    this.grassMat = this.createGroundPBR(scene, "grassMat", GROUND_TEXTURES.grass);
    this.groundMesh.material = this.grassMat;

    // --- Planting area soil ---
    this.soilMesh = CreateGround("soilBase", {
      width: GRID_SIZE,
      height: GRID_SIZE,
    }, scene);
    this.soilMesh.position = new Vector3(gridCenter, 0.005, gridCenter);

    this.soilMat = this.createGroundPBR(scene, "soilMat", GROUND_TEXTURES.soil);
    this.soilMesh.material = this.soilMat;

    // --- Grid overlay (wireframe) ---
    this.gridOverlay = CreateGround("gridOverlay", {
      width: GRID_SIZE,
      height: GRID_SIZE,
      subdivisions: GRID_SIZE,
    }, scene);
    this.gridOverlay.position = new Vector3(gridCenter, 0.01, gridCenter);

    const gridMat = new StandardMaterial("gridMat", scene);
    gridMat.diffuseColor = new Color3(0.35, 0.28, 0.18);
    gridMat.specularColor = new Color3(0, 0, 0);
    gridMat.alpha = 0.3;
    gridMat.wireframe = true;
    this.gridOverlay.material = gridMat;
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
    this.soilMesh?.dispose();
    this.gridOverlay?.dispose();
    this.grassMat?.dispose();
    this.soilMat?.dispose();
    this.groundMesh = null;
    this.soilMesh = null;
    this.gridOverlay = null;
    this.grassMat = null;
    this.soilMat = null;
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
