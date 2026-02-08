/**
 * SkyManager — HDRI skybox + IBL environment lighting.
 *
 * Loads an equirectangular .hdr file (Radiance format, converted from
 * ambientCG's EXR) as an HDRCubeTexture for image-based lighting.
 * Day/night cycle modulates environmentIntensity.
 */

import { HDRCubeTexture } from "@babylonjs/core/Materials/Textures/hdrCubeTexture";
import type { BaseTexture } from "@babylonjs/core/Materials/Textures/baseTexture";
import type { Scene } from "@babylonjs/core/scene";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
// Side-effect import: adds createDefaultSkybox to Scene prototype
import "@babylonjs/core/Helpers/sceneHelpers";

const HDRI_PATH = `${import.meta.env.BASE_URL ?? "/"}textures/sky/environment.hdr`;
const HDRI_RESOLUTION = 256; // cubemap face resolution for IBL

/** Intensity range for day/night cycle. */
const DAY_INTENSITY = 1.0;
const NIGHT_INTENSITY = 0.15;

export class SkyManager {
  private skyboxMesh: Mesh | null = null;
  private envTexture: BaseTexture | null = null;

  init(scene: Scene): void {
    const hdrTexture = new HDRCubeTexture(HDRI_PATH, scene, HDRI_RESOLUTION);
    this.envTexture = hdrTexture;
    scene.environmentTexture = hdrTexture;

    // createDefaultSkybox: (environmentTexture, pbr, scale, blur, dedicatedMaterial)
    this.skyboxMesh = scene.createDefaultSkybox(hdrTexture, true, 1000, 0.3) as Mesh | null;
  }

  /**
   * Modulate environment intensity based on time-of-day.
   * @param sunIntensity - Normalized sun intensity from time system (0-1).
   */
  update(scene: Scene, sunIntensity: number): void {
    scene.environmentIntensity =
      NIGHT_INTENSITY + (DAY_INTENSITY - NIGHT_INTENSITY) * sunIntensity;
  }

  dispose(): void {
    this.skyboxMesh?.dispose();
    this.envTexture?.dispose();
    this.skyboxMesh = null;
    this.envTexture = null;
  }
}
