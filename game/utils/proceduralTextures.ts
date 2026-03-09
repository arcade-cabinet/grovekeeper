/**
 * Procedural canvas texture factory.
 * Spec §42 — Procedural Architecture (texture subsystem).
 *
 * Generates CanvasTexture data for PBR materials entirely from code.
 * No external image assets required — infinite seed-based variation.
 *
 * Platform note: Canvas2D works on both web and React Native (via
 * expo-gl offscreen canvas). On native, if Canvas2D is unavailable,
 * callers should fall back to solid-color MeshStandardMaterial.
 *
 * Each function returns a raw HTMLCanvasElement / OffscreenCanvas.
 * The caller wraps it in THREE.CanvasTexture with RepeatWrapping.
 */

import {
  drawBrick,
  drawDoor,
  drawGrass,
  drawHedge,
  drawLeaves,
  drawPlaster,
  drawRoad,
  drawRoof,
  drawStone,
  drawWood,
} from "./proceduralTextureDrawers.ts";

export const TEXTURE_TYPES = [
  "brick",
  "plaster",
  "stone",
  "wood",
  "roof",
  "road",
  "grass",
  "leaves",
  "hedge",
  "door",
] as const;

export type TextureType = (typeof TEXTURE_TYPES)[number];

/** Canvas factory function — injectable for testing and platform abstraction. */
export type CanvasFactory = (width: number, height: number) => HTMLCanvasElement;

/** Default factory: uses document.createElement (browser/web). */
const defaultCanvasFactory: CanvasFactory = (w, h) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
};

/**
 * Create a procedural texture canvas.
 *
 * @param type — which texture to generate
 * @param size — texture resolution (default 256, POCs used 512 but 256 is
 *               plenty for stylized low-poly and saves GPU memory on mobile)
 * @param rng — optional seeded RNG function (defaults to Math.random for
 *              textures, which is acceptable since texture noise is purely visual)
 * @param canvasFactory — optional canvas creation function (for tests/native)
 */
export function createTextureCanvas(
  type: TextureType,
  size = 256,
  rng: () => number = Math.random,
  canvasFactory: CanvasFactory = defaultCanvasFactory,
): HTMLCanvasElement {
  const canvas = canvasFactory(size, size);
  // biome-ignore lint/style/noNonNullAssertion: 2d context always available on canvas
  const ctx = canvas.getContext("2d")!;

  switch (type) {
    case "brick":
      drawBrick(ctx, size, rng);
      break;
    case "plaster":
      drawPlaster(ctx, size, rng);
      break;
    case "stone":
      drawStone(ctx, size, rng);
      break;
    case "wood":
      drawWood(ctx, size, rng);
      break;
    case "roof":
      drawRoof(ctx, size, rng);
      break;
    case "road":
      drawRoad(ctx, size, rng);
      break;
    case "grass":
      drawGrass(ctx, size, rng);
      break;
    case "leaves":
      drawLeaves(ctx, size, rng);
      break;
    case "hedge":
      drawHedge(ctx, size, rng);
      break;
    case "door":
      drawDoor(ctx, size, rng);
      break;
  }

  return canvas;
}
