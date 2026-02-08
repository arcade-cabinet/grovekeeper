/**
 * Species-specific tree mesh builder using the SPS Tree Generator + PBR materials.
 *
 * Each species maps to:
 *   - SPS generation parameters (trunk height, forks, taper, leaf density)
 *   - PBR bark texture set (color + normal + roughness from AmbientCG)
 *   - PBR leaf texture set (color + opacity + normal from AmbientCG)
 *
 * Trees are created once per species as templates, then cloned for each entity.
 * PBR materials use textures from /textures/trees/ (copied from AmbientCG).
 */

import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Scene } from "@babylonjs/core/scene";

import { getSpeciesById } from "../constants/trees";
import { createRNG, hashString } from "./seedRNG";
import { createSPSTree, type SPSTreeParams } from "./spsTreeGenerator";

// ---------------------------------------------------------------------------
// Texture paths — mapped from AmbientCG 1K-JPG sets
// Prefixed with Vite's BASE_URL so paths resolve on subdirectory deploys.
// ---------------------------------------------------------------------------

interface TextureSet {
  color: string;
  normal: string;
  roughness?: string;
  opacity?: string;
}

const BASE = import.meta.env.BASE_URL ?? "/";

function texPath(relative: string): string {
  return `${BASE}textures/trees/${relative}`;
}

const BARK_TEXTURES: Record<string, TextureSet> = {
  oak: {
    color: texPath("bark001/color.jpg"),
    normal: texPath("bark001/normal.jpg"),
    roughness: texPath("bark001/roughness.jpg"),
  },
  smooth: {
    color: texPath("bark003/color.jpg"),
    normal: texPath("bark003/normal.jpg"),
    roughness: texPath("bark003/roughness.jpg"),
  },
  twisted: {
    color: texPath("bark004/color.jpg"),
    normal: texPath("bark004/normal.jpg"),
    roughness: texPath("bark004/roughness.jpg"),
  },
  rugged: {
    color: texPath("bark006/color.jpg"),
    normal: texPath("bark006/normal.jpg"),
    roughness: texPath("bark006/roughness.jpg"),
  },
  mossy: {
    color: texPath("bark007/color.jpg"),
    normal: texPath("bark007/normal.jpg"),
    roughness: texPath("bark007/roughness.jpg"),
  },
  birch: {
    color: texPath("bark009/color.jpg"),
    normal: texPath("bark009/normal.jpg"),
    roughness: texPath("bark009/roughness.jpg"),
  },
  scaled: {
    color: texPath("bark010/color.jpg"),
    normal: texPath("bark010/normal.jpg"),
    roughness: texPath("bark010/roughness.jpg"),
  },
  thick: {
    color: texPath("bark012/color.jpg"),
    normal: texPath("bark012/normal.jpg"),
    roughness: texPath("bark012/roughness.jpg"),
  },
};

const LEAF_TEXTURES: Record<string, TextureSet> = {
  broad: {
    color: texPath("leaf001/color.jpg"),
    normal: texPath("leaf001/normal.jpg"),
    opacity: texPath("leaf001/opacity.jpg"),
  },
  maple: {
    color: texPath("leaf002/color.jpg"),
    normal: texPath("leaf002/normal.jpg"),
    opacity: texPath("leaf002/opacity.jpg"),
  },
  feathery: {
    color: texPath("leaf003/color.jpg"),
    normal: texPath("leaf003/normal.jpg"),
    opacity: texPath("leaf003/opacity.jpg"),
  },
};

// ---------------------------------------------------------------------------
// Species → SPS parameter profiles
// ---------------------------------------------------------------------------

interface SpeciesProfile {
  bark: string; // key into BARK_TEXTURES
  leaf: string; // key into LEAF_TEXTURES
  /** Tint multiplied onto the bark albedo (for species variation). */
  barkTint: [number, number, number];
  /** Tint multiplied onto the leaf albedo. */
  leafTint: [number, number, number];
  /** Override SPS params (merged with defaults). */
  sps: Partial<Omit<SPSTreeParams, "trunkMaterial" | "leafMaterial">>;
}

const SPECIES_PROFILES: Record<string, SpeciesProfile> = {
  "white-oak": {
    bark: "oak",
    leaf: "broad",
    barkTint: [0.75, 0.6, 0.45],
    leafTint: [0.22, 0.55, 0.24],
    sps: {
      trunkHeight: 1.8,
      forks: 3,
      boughs: 2,
      branches: 8,
      leavesOnBranch: 5,
      forkAngle: 1.0,
      forkRatio: 0.7,
      bowHeight: 2,
    },
  },
  "weeping-willow": {
    bark: "smooth",
    leaf: "broad",
    barkTint: [0.65, 0.55, 0.42],
    leafTint: [0.4, 0.73, 0.41],
    sps: {
      trunkHeight: 2.0,
      forks: 4,
      boughs: 2,
      branches: 15,
      leavesOnBranch: 10,
      forkAngle: 1.3,
      forkRatio: 0.65,
      bowHeight: 5.2,
    },
  },
  "elder-pine": {
    bark: "rugged",
    leaf: "feathery",
    barkTint: [0.5, 0.35, 0.25],
    leafTint: [0.1, 0.37, 0.13],
    sps: {
      trunkHeight: 2.6,
      forks: 2,
      boughs: 1,
      branches: 6,
      leavesOnBranch: 4,
      forkAngle: 0.4,
      forkRatio: 0.55,
      bowHeight: 1.5,
    },
  },
  "cherry-blossom": {
    bark: "twisted",
    leaf: "broad",
    barkTint: [0.5, 0.35, 0.3],
    leafTint: [0.91, 0.63, 0.75], // pink tint
    sps: {
      trunkHeight: 1.6,
      forks: 3,
      boughs: 2,
      branches: 10,
      leavesOnBranch: 9,
      forkAngle: 1.1,
      forkRatio: 0.65,
      bowHeight: 2.5,
    },
  },
  "ghost-birch": {
    bark: "birch",
    leaf: "broad",
    barkTint: [0.88, 0.88, 0.85],
    leafTint: [0.69, 0.74, 0.77],
    sps: {
      trunkHeight: 2.0,
      forks: 3,
      boughs: 2,
      branches: 6,
      leavesOnBranch: 4,
      forkAngle: 0.9,
      forkRatio: 0.6,
      bowHeight: 2,
    },
  },
  redwood: {
    bark: "scaled",
    leaf: "feathery",
    barkTint: [0.55, 0.3, 0.2],
    leafTint: [0.18, 0.49, 0.2],
    sps: {
      trunkHeight: 3.5,
      forks: 3,
      boughs: 2,
      branches: 10,
      leavesOnBranch: 5,
      forkAngle: 0.8,
      forkRatio: 0.6,
      bowHeight: 2,
    },
  },
  "flame-maple": {
    bark: "rugged",
    leaf: "maple",
    barkTint: [0.6, 0.45, 0.35],
    leafTint: [0.91, 0.38, 0.0], // fiery orange
    sps: {
      trunkHeight: 2.0,
      forks: 4,
      boughs: 2,
      branches: 10,
      leavesOnBranch: 6,
      forkAngle: 1.0,
      forkRatio: 0.65,
      bowHeight: 2.5,
    },
  },
  baobab: {
    bark: "thick",
    leaf: "feathery",
    barkTint: [0.58, 0.45, 0.32],
    leafTint: [0.33, 0.54, 0.18],
    sps: {
      trunkHeight: 2.5,
      forks: 4,
      boughs: 1,
      branches: 4,
      leavesOnBranch: 3,
      forkAngle: 1.6,
      forkRatio: 0.5,
      trunkTaper: 0.3,
      bowHeight: 1,
    },
  },
  // Prestige species
  "crystal-oak": {
    bark: "birch",
    leaf: "broad",
    barkTint: [0.69, 0.74, 0.77],
    leafTint: [0.5, 0.8, 0.77], // teal crystal
    sps: {
      trunkHeight: 2.2,
      forks: 3,
      boughs: 2,
      branches: 8,
      leavesOnBranch: 6,
      forkAngle: 1.0,
      forkRatio: 0.7,
      bowHeight: 2,
    },
  },
  "moonwood-ash": {
    bark: "mossy",
    leaf: "broad",
    barkTint: [0.81, 0.85, 0.86],
    leafTint: [0.7, 0.62, 0.86], // purple shimmer
    sps: {
      trunkHeight: 2.4,
      forks: 3,
      boughs: 2,
      branches: 8,
      leavesOnBranch: 5,
      forkAngle: 1.0,
      forkRatio: 0.65,
      bowHeight: 2.5,
    },
  },
  worldtree: {
    bark: "mossy",
    leaf: "maple",
    barkTint: [0.45, 0.3, 0.2],
    leafTint: [0.1, 0.37, 0.13],
    sps: {
      trunkHeight: 3.5,
      forks: 5,
      boughs: 2,
      branches: 15,
      leavesOnBranch: 8,
      forkAngle: 0.9,
      forkRatio: 0.6,
      bowHeight: 2,
    },
  },
};

// ---------------------------------------------------------------------------
// Seasonal leaf tint adjustments
// ---------------------------------------------------------------------------

const AUTUMN_TINTS: [number, number, number][] = [
  [1.0, 0.39, 0.28], // tomato
  [1.0, 0.27, 0.0], // orange-red
  [1.0, 0.84, 0.0], // gold
  [1.0, 0.65, 0.0], // orange
];
const WINTER_TINT: [number, number, number] = [0.29, 0.35, 0.29];

function resolveLeafTint(
  profile: SpeciesProfile,
  speciesId: string,
  season: string | undefined,
  evergreen: boolean,
  rng: () => number,
  nightTime = false,
): [number, number, number] {
  // Ghost Birch: luminous blue-white tint (slightly brighter at night)
  if (speciesId === "ghost-birch" && nightTime) {
    return [0.85, 0.92, 1.0];
  }

  // Crystal Oak: prismatic seasonal tints
  if (speciesId === "crystal-oak") {
    if (season === "spring") return [0.5, 0.85, 0.8]; // teal
    if (season === "summer") return [0.4, 0.8, 0.65]; // emerald
    if (season === "autumn") return [0.85, 0.7, 0.5]; // amber-crystal
    if (season === "winter") return [0.7, 0.85, 0.95]; // ice-blue
    return profile.leafTint; // fallback
  }

  if (speciesId === "cherry-blossom") {
    if (season === "autumn") return [0.63, 0.53, 0.5];
    if (season === "winter") return WINTER_TINT;
    return profile.leafTint;
  }
  if (evergreen) return profile.leafTint;
  if (season === "autumn") {
    return AUTUMN_TINTS[Math.floor(rng() * AUTUMN_TINTS.length)];
  }
  if (season === "winter") return WINTER_TINT;
  return profile.leafTint;
}

// ---------------------------------------------------------------------------
// PBR material factory (cached per scene)
// ---------------------------------------------------------------------------

const materialCache = new Map<string, PBRMaterial>();

function getOrCreateBarkMaterial(
  scene: Scene,
  key: string,
  texSet: TextureSet,
  tint: [number, number, number],
): PBRMaterial {
  const cacheKey = `bark_${key}_${tint.join(",")}`;
  const cached = materialCache.get(cacheKey);
  if (cached) return cached;

  const mat = new PBRMaterial(cacheKey, scene);
  mat.albedoTexture = new Texture(texSet.color, scene);
  mat.albedoColor = new Color3(tint[0], tint[1], tint[2]);
  mat.bumpTexture = new Texture(texSet.normal, scene);
  if (texSet.roughness) {
    mat.metallicTexture = new Texture(texSet.roughness, scene);
    mat.useRoughnessFromMetallicTextureAlpha = false;
    mat.useRoughnessFromMetallicTextureGreen = true;
  }
  mat.metallic = 0;
  mat.roughness = 0.9;

  materialCache.set(cacheKey, mat);
  return mat;
}

function getOrCreateLeafMaterial(
  scene: Scene,
  key: string,
  texSet: TextureSet,
  tint: [number, number, number],
): PBRMaterial {
  const cacheKey = `leaf_${key}_${tint.join(",")}`;
  const cached = materialCache.get(cacheKey);
  if (cached) return cached;

  const mat = new PBRMaterial(cacheKey, scene);
  mat.albedoTexture = new Texture(texSet.color, scene);
  mat.albedoColor = new Color3(tint[0], tint[1], tint[2]);
  if (texSet.opacity) {
    mat.opacityTexture = new Texture(texSet.opacity, scene);
  }
  mat.metallic = 0;
  mat.roughness = 0.85;
  mat.backFaceCulling = false;
  // Alpha for leaf transparency
  mat.transparencyMode = PBRMaterial.PBRMATERIAL_ALPHATEST;
  mat.alphaCutOff = 0.4;

  materialCache.set(cacheKey, mat);
  return mat;
}

// ---------------------------------------------------------------------------
// Default SPS params (merged with per-species overrides)
// ---------------------------------------------------------------------------

const DEFAULT_SPS: Omit<SPSTreeParams, "trunkMaterial" | "leafMaterial"> = {
  trunkHeight: 2.0,
  trunkTaper: 0.6,
  trunkSlices: 10,
  boughs: 2,
  forks: 3,
  forkAngle: 1.0,
  forkRatio: 0.65,
  branches: 8,
  branchAngle: 1.2,
  bowFreq: 2,
  bowHeight: 2.0,
  leavesOnBranch: 5,
  leafWHRatio: 0.6,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build a species-specific tree mesh using the SPS Tree Generator + PBR materials.
 *
 * Each call creates a fresh tree. For performance, callers should cache/clone
 * templates when placing many trees of the same species.
 *
 * @param scene     — Active BabylonJS Scene
 * @param id        — Unique entity ID (used for RNG seed)
 * @param speciesId — Tree species identifier
 * @param season    — Current game season (affects leaf tint)
 * @param meshSeed  — Optional seed for deterministic RNG
 * @param nightTime — Optional flag for night-time special effects (Ghost Birch glow)
 * @returns Root mesh (invisible, children are trunk/branches/leaves)
 */
export function buildSpeciesTreeMesh(
  scene: Scene,
  id: string,
  speciesId: string,
  season: string | undefined,
  meshSeed: number | undefined,
  nightTime = false,
): Mesh {
  const species = getSpeciesById(speciesId);
  const profile = SPECIES_PROFILES[speciesId] ?? SPECIES_PROFILES["white-oak"];
  const rng = createRNG(meshSeed ?? hashString(id));

  // Resolve bark texture + tint
  const barkTex = BARK_TEXTURES[profile.bark] ?? BARK_TEXTURES.oak;
  const barkMat = getOrCreateBarkMaterial(
    scene,
    profile.bark,
    barkTex,
    profile.barkTint,
  );

  // Resolve leaf texture + seasonal tint
  const leafTex = LEAF_TEXTURES[profile.leaf] ?? LEAF_TEXTURES.broad;
  const leafTint = resolveLeafTint(
    profile,
    speciesId,
    season,
    species?.evergreen ?? false,
    rng,
    nightTime,
  );
  const leafMat = getOrCreateLeafMaterial(
    scene,
    `${profile.leaf}_${season ?? "default"}`,
    leafTex,
    leafTint,
  );

  // Merge defaults + species overrides
  const spsParams: SPSTreeParams = {
    ...DEFAULT_SPS,
    ...profile.sps,
    trunkMaterial: barkMat,
    leafMaterial: leafMat,
  };

  const root = createSPSTree(spsParams, scene, rng);
  root.name = `tree_${id}`;

  return root;
}

/** Clear the PBR material cache. Call when disposing the scene. */
export function disposeTreeMaterialCache(): void {
  for (const mat of materialCache.values()) {
    mat.dispose();
  }
  materialCache.clear();
}
