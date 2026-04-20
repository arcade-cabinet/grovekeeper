/**
 * LightingManager — Hemisphere + directional light, synced to time-of-day.
 *
 * Updates light intensities, colors, and sun direction based on the
 * current GameTime each frame.
 */

import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Scene } from "@babylonjs/core/scene";
import type { GameTime } from "@/systems/time";
import { getSkyColors } from "@/systems/time";

export class LightingManager {
  hemiLight: HemisphericLight | null = null;
  sunLight: DirectionalLight | null = null;

  // Reusable allocation-free buffers for update() — mutated in place
  // each frame instead of allocating fresh Color3/Vector3/Color4. Prior
  // code allocated 6 objects per frame; see docs/PERF_AUDIT.md.
  private readonly _ambient = new Color3(0.3, 0.3, 0.35);
  private readonly _hemiGround = new Color3(0.4, 0.35, 0.3);
  private readonly _sunDiffuse = new Color3(1, 0.95, 0.8);
  private readonly _sunDir = new Vector3(-0.5, -1, -0.3);
  private readonly _fog = new Color3(0.35, 0.48, 0.3);
  private readonly _clear = new Color4(0.35, 0.48, 0.3, 1);

  init(scene: Scene): void {
    // Soft ambient light
    const hemi = new HemisphericLight("hemi", new Vector3(0, 1, 0), scene);
    hemi.intensity = 0.6;
    hemi.groundColor = new Color3(0.4, 0.35, 0.3);
    hemi.diffuse = new Color3(1, 0.95, 0.85);
    this.hemiLight = hemi;

    // Directional sun light
    const sun = new DirectionalLight("sun", new Vector3(-0.5, -1, -0.3), scene);
    sun.intensity = 0.8;
    sun.diffuse = new Color3(1, 0.95, 0.8);
    this.sunLight = sun;

    // Initial colors — clearColor matches fog so background is seamless
    scene.clearColor = new Color4(0.35, 0.48, 0.3, 1);
    scene.ambientColor = new Color3(0.3, 0.3, 0.35);

    // Atmospheric fog — blends the horizon into the sky.
    // fogMode 3 = LINEAR: ground is clear near the player, fades to fog at distance.
    scene.fogMode = 3;
    scene.fogStart = 20; // player area is clear
    scene.fogEnd = 40; // fully fogged at the horizon edges
    scene.fogColor = new Color3(0.35, 0.48, 0.3); // earthy green mist
  }

  /** Update scene lighting and sky based on current game time. */
  update(scene: Scene, time: GameTime): void {
    const skyColors = getSkyColors(time);
    const zenithRgb = hexToRgb(skyColors.zenith);
    const ambientRgb = hexToRgb(skyColors.ambient);

    // Ambient — mutate reusable buffer in place.
    this._ambient.r = ambientRgb.r / 255;
    this._ambient.g = ambientRgb.g / 255;
    this._ambient.b = ambientRgb.b / 255;
    scene.ambientColor = this._ambient;

    // Hemisphere light
    if (this.hemiLight) {
      this.hemiLight.intensity = time.ambientIntensity;
      const horizonRgb = hexToRgb(skyColors.horizon);
      this._hemiGround.r = (horizonRgb.r / 255) * 0.5;
      this._hemiGround.g = (horizonRgb.g / 255) * 0.5;
      this._hemiGround.b = (horizonRgb.b / 255) * 0.5;
      this.hemiLight.groundColor = this._hemiGround;
    }

    // Directional sun
    if (this.sunLight) {
      this.sunLight.intensity = time.sunIntensity;
      const sunRgb = hexToRgb(skyColors.sun);
      this._sunDiffuse.r = sunRgb.r / 255;
      this._sunDiffuse.g = sunRgb.g / 255;
      this._sunDiffuse.b = sunRgb.b / 255;
      this.sunLight.diffuse = this._sunDiffuse;
      // Rotate sun direction based on time of day
      const sunAngle = (time.hours / 24) * Math.PI * 2 - Math.PI / 2;
      this._sunDir.x = Math.cos(sunAngle) * 0.5;
      this._sunDir.y = -1;
      this._sunDir.z = Math.sin(sunAngle) * 0.3;
      this.sunLight.direction = this._sunDir;
    }

    // Fog = earthy green haze with slight sky tint for time-of-day coherence.
    // Ground-dominated so the horizon fades into misty forest, not blue sky.
    const fogR = Math.min(1, 0.3 + (zenithRgb.r / 255) * 0.12);
    const fogG = Math.min(1, 0.42 + (zenithRgb.g / 255) * 0.1);
    const fogB = Math.min(1, 0.25 + (zenithRgb.b / 255) * 0.08);
    this._fog.r = fogR;
    this._fog.g = fogG;
    this._fog.b = fogB;
    scene.fogColor = this._fog;
    // clearColor matches fog so any background beyond the ground mesh is invisible.
    this._clear.r = fogR;
    this._clear.g = fogG;
    this._clear.b = fogB;
    // _clear.a stays 1 — set once at construction
    scene.clearColor = this._clear;
  }

  dispose(): void {
    this.hemiLight?.dispose();
    this.sunLight?.dispose();
    this.hemiLight = null;
    this.sunLight = null;
  }
}

/** Convert hex string to RGB values. */
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
