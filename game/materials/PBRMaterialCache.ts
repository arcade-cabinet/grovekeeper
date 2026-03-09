/**
 * PBR Material Cache (Spec §47)
 *
 * Module-scope singleton that loads and caches MeshStandardMaterial instances
 * keyed by texture set name. Must run inside a Three.js context (R3F Canvas).
 *
 * Metro requires static require() calls — no dynamic string interpolation.
 * All 16 texture sets are registered at compile time via TEXTURE_REGISTRY.
 *
 * Color maps use SRGBColorSpace; normal/roughness/ao maps use LinearSRGBColorSpace.
 * Unknown keys throw an Error (Spec §47.3 — no silent fallbacks).
 */

import { Asset } from "expo-asset";
import type { Texture } from "three";
import {
  LinearSRGBColorSpace,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader,
} from "three";
import materialsConfig from "@/config/game/materials.json" with { type: "json" };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TextureEntry {
  color: number;
  normal: number;
  roughness: number;
  ao: number;
}

export interface PBRMaterialOptions {
  repeatX?: number;
  repeatY?: number;
}

// ---------------------------------------------------------------------------
// Static texture registry — Metro requires static require() calls (Spec §47.1)
// ---------------------------------------------------------------------------

const TEXTURE_REGISTRY: Record<string, TextureEntry> = {
  "terrain/grass_green": {
    color: require("@/assets/textures/terrain/grass_green/Color.jpg") as number,
    normal: require("@/assets/textures/terrain/grass_green/NormalGL.jpg") as number,
    roughness: require("@/assets/textures/terrain/grass_green/Roughness.jpg") as number,
    ao: require("@/assets/textures/terrain/grass_green/AO.jpg") as number,
  },
  "terrain/forest_floor": {
    color: require("@/assets/textures/terrain/forest_floor/Color.jpg") as number,
    normal: require("@/assets/textures/terrain/forest_floor/NormalGL.jpg") as number,
    roughness: require("@/assets/textures/terrain/forest_floor/Roughness.jpg") as number,
    ao: require("@/assets/textures/terrain/forest_floor/AO.jpg") as number,
  },
  "terrain/dirt_path": {
    color: require("@/assets/textures/terrain/dirt_path/Color.jpg") as number,
    normal: require("@/assets/textures/terrain/dirt_path/NormalGL.jpg") as number,
    roughness: require("@/assets/textures/terrain/dirt_path/Roughness.jpg") as number,
    ao: require("@/assets/textures/terrain/dirt_path/AO.jpg") as number,
  },
  "terrain/cobblestone": {
    color: require("@/assets/textures/terrain/cobblestone/Color.jpg") as number,
    normal: require("@/assets/textures/terrain/cobblestone/NormalGL.jpg") as number,
    roughness: require("@/assets/textures/terrain/cobblestone/Roughness.jpg") as number,
    ao: require("@/assets/textures/terrain/cobblestone/AO.jpg") as number,
  },
  "terrain/snow_ground": {
    color: require("@/assets/textures/terrain/snow_ground/Color.jpg") as number,
    normal: require("@/assets/textures/terrain/snow_ground/NormalGL.jpg") as number,
    roughness: require("@/assets/textures/terrain/snow_ground/Roughness.jpg") as number,
    ao: require("@/assets/textures/terrain/snow_ground/AO.jpg") as number,
  },
  "terrain/sand_beach": {
    color: require("@/assets/textures/terrain/sand_beach/Color.jpg") as number,
    normal: require("@/assets/textures/terrain/sand_beach/NormalGL.jpg") as number,
    roughness: require("@/assets/textures/terrain/sand_beach/Roughness.jpg") as number,
    ao: require("@/assets/textures/terrain/sand_beach/AO.jpg") as number,
  },
  "bark/oak": {
    color: require("@/assets/textures/bark/oak/Color.jpg") as number,
    normal: require("@/assets/textures/bark/oak/NormalGL.jpg") as number,
    roughness: require("@/assets/textures/bark/oak/Roughness.jpg") as number,
    ao: require("@/assets/textures/bark/oak/AO.jpg") as number,
  },
  "bark/birch": {
    color: require("@/assets/textures/bark/birch/Color.jpg") as number,
    normal: require("@/assets/textures/bark/birch/NormalGL.jpg") as number,
    roughness: require("@/assets/textures/bark/birch/Roughness.jpg") as number,
    ao: require("@/assets/textures/bark/birch/AO.jpg") as number,
  },
  "bark/pine": {
    color: require("@/assets/textures/bark/pine/Color.jpg") as number,
    normal: require("@/assets/textures/bark/pine/NormalGL.jpg") as number,
    roughness: require("@/assets/textures/bark/pine/Roughness.jpg") as number,
    ao: require("@/assets/textures/bark/pine/AO.jpg") as number,
  },
  "bark/sakura": {
    color: require("@/assets/textures/bark/sakura/Color.jpg") as number,
    normal: require("@/assets/textures/bark/sakura/NormalGL.jpg") as number,
    roughness: require("@/assets/textures/bark/sakura/Roughness.jpg") as number,
    ao: require("@/assets/textures/bark/sakura/AO.jpg") as number,
  },
  "building/stone_wall": {
    color: require("@/assets/textures/building/stone_wall/Color.jpg") as number,
    normal: require("@/assets/textures/building/stone_wall/NormalGL.jpg") as number,
    roughness: require("@/assets/textures/building/stone_wall/Roughness.jpg") as number,
    ao: require("@/assets/textures/building/stone_wall/AO.jpg") as number,
  },
  "building/wood_planks": {
    color: require("@/assets/textures/building/wood_planks/Color.jpg") as number,
    normal: require("@/assets/textures/building/wood_planks/NormalGL.jpg") as number,
    roughness: require("@/assets/textures/building/wood_planks/Roughness.jpg") as number,
    ao: require("@/assets/textures/building/wood_planks/AO.jpg") as number,
  },
  "building/plaster_white": {
    color: require("@/assets/textures/building/plaster_white/Color.jpg") as number,
    normal: require("@/assets/textures/building/plaster_white/NormalGL.jpg") as number,
    roughness: require("@/assets/textures/building/plaster_white/Roughness.jpg") as number,
    ao: require("@/assets/textures/building/plaster_white/AO.jpg") as number,
  },
  "building/thatch_roof": {
    color: require("@/assets/textures/building/thatch_roof/Color.jpg") as number,
    normal: require("@/assets/textures/building/thatch_roof/NormalGL.jpg") as number,
    roughness: require("@/assets/textures/building/thatch_roof/Roughness.jpg") as number,
    ao: require("@/assets/textures/building/thatch_roof/AO.jpg") as number,
  },
  "foliage/leaves_green": {
    color: require("@/assets/textures/foliage/leaves_green/Color.jpg") as number,
    normal: require("@/assets/textures/foliage/leaves_green/NormalGL.jpg") as number,
    roughness: require("@/assets/textures/foliage/leaves_green/Roughness.jpg") as number,
    ao: require("@/assets/textures/foliage/leaves_green/AO.jpg") as number,
  },
  "foliage/leaves_autumn": {
    color: require("@/assets/textures/foliage/leaves_autumn/Color.jpg") as number,
    normal: require("@/assets/textures/foliage/leaves_autumn/NormalGL.jpg") as number,
    roughness: require("@/assets/textures/foliage/leaves_autumn/Roughness.jpg") as number,
    ao: require("@/assets/textures/foliage/leaves_autumn/AO.jpg") as number,
  },
};

// ---------------------------------------------------------------------------
// Module-scope cache (singleton state)
// ---------------------------------------------------------------------------

const materialCache = new Map<string, MeshStandardMaterial>();
const loaderInstance = new TextureLoader();

// Default UV repeat loaded from config/game/materials.json (Spec §47.3)
const DEFAULT_REPEAT_X: number = materialsConfig.pbr.defaultRepeatX;
const DEFAULT_REPEAT_Y: number = materialsConfig.pbr.defaultRepeatY;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Resolves a Metro asset number to a URI using expo-asset.
 * Handles both localUri (downloaded) and uri (remote/bundled fallback).
 */
async function resolveUri(assetId: number): Promise<string> {
  const asset = Asset.fromModule(assetId);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  if (!uri) {
    throw new Error(`PBRMaterialCache: failed to resolve URI for asset ${assetId}`);
  }
  return uri;
}

/**
 * Loads a single texture from a Metro asset ID and applies the given settings.
 */
async function loadTexture(
  assetId: number,
  colorSpace: string,
  repeatX: number,
  repeatY: number,
): Promise<Texture> {
  const uri = await resolveUri(assetId);
  return new Promise<Texture>((resolve, reject) => {
    loaderInstance.load(
      uri,
      (texture) => {
        texture.colorSpace = colorSpace;
        texture.wrapS = RepeatWrapping;
        texture.wrapT = RepeatWrapping;
        texture.repeat.set(repeatX, repeatY);
        texture.needsUpdate = true;
        resolve(texture);
      },
      undefined,
      (err) => {
        reject(new Error(`PBRMaterialCache: TextureLoader failed for ${uri} — ${String(err)}`));
      },
    );
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns a cached MeshStandardMaterial for the given PBR texture key.
 * On first access the material is loaded asynchronously and cached.
 * Unknown keys throw immediately (Spec §47.3 — no silent fallbacks).
 *
 * Must be called inside an R3F Canvas (Three.js WebGL context available).
 */
export async function getPBRMaterial(
  key: string,
  options: PBRMaterialOptions = {},
): Promise<MeshStandardMaterial> {
  const cacheKey = `${key}:${options.repeatX ?? DEFAULT_REPEAT_X}x${options.repeatY ?? DEFAULT_REPEAT_Y}`;

  const cached = materialCache.get(cacheKey);
  if (cached) return cached;

  const entry = TEXTURE_REGISTRY[key];
  if (!entry) {
    throw new Error(`PBRMaterialCache: unknown key '${key}'`);
  }

  const repeatX = options.repeatX ?? DEFAULT_REPEAT_X;
  const repeatY = options.repeatY ?? DEFAULT_REPEAT_Y;

  const [colorMap, normalMap, roughnessMap, aoMap] = await Promise.all([
    loadTexture(entry.color, SRGBColorSpace, repeatX, repeatY),
    loadTexture(entry.normal, LinearSRGBColorSpace, repeatX, repeatY),
    loadTexture(entry.roughness, LinearSRGBColorSpace, repeatX, repeatY),
    loadTexture(entry.ao, LinearSRGBColorSpace, repeatX, repeatY),
  ]);

  const material = new MeshStandardMaterial({
    map: colorMap,
    normalMap,
    roughnessMap,
    aoMap,
  });

  materialCache.set(cacheKey, material);
  return material;
}

/**
 * Disposes all cached textures and materials and clears the cache.
 * Call on scene teardown to prevent memory leaks (Spec §47.3).
 */
export function disposePBRMaterials(): void {
  for (const material of materialCache.values()) {
    material.map?.dispose();
    material.normalMap?.dispose();
    material.roughnessMap?.dispose();
    material.aoMap?.dispose();
    material.dispose();
  }
  materialCache.clear();
}

/**
 * Returns the set of all registered texture keys.
 * Useful for validation and tooling — not intended for hot paths.
 */
export function getRegisteredKeys(): string[] {
  return Object.keys(TEXTURE_REGISTRY);
}

/** Reset for testing — clears the cache without disposing Three.js objects. */
export function resetPBRMaterialCache(): void {
  materialCache.clear();
}
