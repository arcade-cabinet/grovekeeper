/**
 * SkyManager — HDRI skybox + IBL environment lighting.
 *
 * Loads an equirectangular .hdr file (Radiance format, converted from
 * ambientCG's EXR) as an HDRCubeTexture for image-based lighting.
 * Day/night cycle modulates environmentIntensity.
 *
 * HDRCubeTexture and sceneHelpers are lazy-loaded on first `init()` call so
 * they land in a separate bundle chunk and don't block the initial parse.
 */

import type { BaseTexture } from "@babylonjs/core/Materials/Textures/baseTexture";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Scene } from "@babylonjs/core/scene";

const HDRI_PATH = `${import.meta.env.BASE_URL ?? "/"}textures/sky/environment.hdr`;
const HDRI_RESOLUTION = 256; // cubemap face resolution for IBL

/** Intensity range for day/night cycle. */
const DAY_INTENSITY = 1.0;
const NIGHT_INTENSITY = 0.15;

export class SkyManager {
  private skyboxMesh: Mesh | null = null;
  private envTexture: BaseTexture | null = null;

  async init(scene: Scene): Promise<void> {
    // Lazy-load HDRCubeTexture + the sceneHelpers side-effect (createDefaultSkybox
    // augmentation) so they are excluded from the initial Babylon bundle.
    const [{ HDRCubeTexture }] = await Promise.all([
      import("@babylonjs/core/Materials/Textures/hdrCubeTexture"),
      // Side-effect import: adds createDefaultSkybox to Scene prototype
      import("@babylonjs/core/Helpers/sceneHelpers"),
    ]);

    const hdrTexture = new HDRCubeTexture(HDRI_PATH, scene, HDRI_RESOLUTION);
    this.envTexture = hdrTexture;
    scene.environmentTexture = hdrTexture;

    // createDefaultSkybox: (environmentTexture, pbr, scale, blur, dedicatedMaterial)
    this.skyboxMesh = scene.createDefaultSkybox(
      hdrTexture,
      true,
      1000,
      0.3,
    ) as Mesh | null;
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
