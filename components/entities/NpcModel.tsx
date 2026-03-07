/**
 * NpcModel — renders a 3DPSX ChibiCharacter NPC assembled from seeded GLBs.
 *
 * Uses scopedRNG('npc-appearance', worldSeed, npcId) via generateNpcAppearance
 * to deterministically select base model, item attachments, and color palette
 * from config/game/npcAssets.json. Same seed always produces the same NPC appearance.
 *
 * See GAME_SPEC.md §15.
 */

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { Mesh, MeshStandardMaterial } from "three";
import { generateNpcAppearance } from "@/game/systems/npcAppearance";
import npcAssets from "@/config/game/npcAssets.json" with { type: "json" };
import type { NpcItemSlot } from "@/game/ecs/components/npc";

// ---------------------------------------------------------------------------
// Asset lookup maps (built from npcAssets.json)
// ---------------------------------------------------------------------------

interface AssetEntry {
  id: string;
  path: string;
  emissionPath: string;
}

const BASE_ASSET_MAP = new Map<string, AssetEntry>(
  (npcAssets.base as AssetEntry[]).map((b) => [b.id, b]),
);

const ITEM_ASSET_MAP = new Map<string, AssetEntry>(
  (npcAssets.items as AssetEntry[]).map((i) => [i.id, i]),
);

// ---------------------------------------------------------------------------
// Pure mapping functions (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Resolve the GLB path for an NPC base model.
 * Throws if the baseModelId is unknown — no silent fallbacks (Spec §15).
 */
export function resolveBaseModelPath(baseModelId: string): string {
  const entry = BASE_ASSET_MAP.get(baseModelId);
  if (!entry) {
    throw new Error(
      `[NpcModel] Unknown baseModelId: "${baseModelId}". Check config/game/npcAssets.json.`,
    );
  }
  return entry.path;
}

/**
 * Resolve the emission GLB path for an NPC base model.
 * Used when useEmission=true for the night glow effect (Spec §15).
 * Throws if the baseModelId is unknown.
 */
export function resolveBaseModelEmissionPath(baseModelId: string): string {
  const entry = BASE_ASSET_MAP.get(baseModelId);
  if (!entry) {
    throw new Error(
      `[NpcModel] Unknown baseModelId: "${baseModelId}". Check config/game/npcAssets.json.`,
    );
  }
  return entry.emissionPath;
}

/**
 * Resolve the GLB path for an NPC item attachment.
 * Throws if the itemId is unknown — no silent fallbacks (Spec §15).
 */
export function resolveItemPath(itemId: string): string {
  const entry = ITEM_ASSET_MAP.get(itemId);
  if (!entry) {
    throw new Error(
      `[NpcModel] Unknown itemId: "${itemId}". Check config/game/npcAssets.json.`,
    );
  }
  return entry.path;
}

/** Resolved NPC appearance with GLB paths ready for rendering. */
export interface ResolvedNpcAppearance {
  baseModelPath: string;
  itemPaths: Partial<Record<NpcItemSlot, string>>;
  colorPalette: string;
  useEmission: boolean;
}

/**
 * Resolve the complete NPC appearance from seed parameters.
 *
 * Internally uses scopedRNG('npc-appearance', worldSeed, npcId, role) so the
 * same inputs always produce the same appearance (Spec §15).
 *
 * Exported as a pure function so it can be unit-tested without WebGL context.
 */
export function resolveNpcAppearance(
  npcId: string,
  worldSeed: string,
  role = "tips",
): ResolvedNpcAppearance {
  const appearance = generateNpcAppearance(npcId, worldSeed, role);
  const baseModelPath = appearance.useEmission
    ? resolveBaseModelEmissionPath(appearance.baseModel)
    : resolveBaseModelPath(appearance.baseModel);

  const itemPaths: Partial<Record<NpcItemSlot, string>> = {};
  for (const [slot, itemId] of Object.entries(appearance.items)) {
    if (itemId) {
      itemPaths[slot as NpcItemSlot] = resolveItemPath(itemId);
    }
  }

  return {
    baseModelPath,
    itemPaths,
    colorPalette: appearance.colorPalette,
    useEmission: appearance.useEmission,
  };
}

// ---------------------------------------------------------------------------
// Sub-components (useGLTF always called — conditionally mounted in NpcModel)
// ---------------------------------------------------------------------------

interface NpcGLBProps {
  glbPath: string;
  tintColor?: string;
}

/** Renders a single NPC GLB (base or item) with optional color tint. */
const NpcGLBPart = ({ glbPath, tintColor }: NpcGLBProps) => {
  const { scene } = useGLTF(glbPath);
  const cloned = useMemo(() => {
    const s = scene.clone(true);
    if (tintColor) {
      s.traverse((obj) => {
        if (!(obj instanceof Mesh)) return;
        if (Array.isArray(obj.material)) {
          obj.material = obj.material.map((m) => {
            if (m instanceof MeshStandardMaterial) {
              const c = m.clone();
              c.color.set(tintColor);
              return c;
            }
            return m;
          });
        } else if (obj.material instanceof MeshStandardMaterial) {
          const c = obj.material.clone();
          c.color.set(tintColor);
          obj.material = c;
        }
      });
    }
    return s;
  }, [scene, tintColor]);
  return <primitive object={cloned} castShadow />;
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface NpcModelProps {
  /** Unique NPC identifier — used as seed for appearance generation (Spec §15). */
  npcId: string;
  /** World seed — combined with npcId for deterministic appearance (Spec §15). */
  worldSeed: string;
  /** NPC function role — influences model + item selection (Spec §15). */
  role?: string;
  /** World-space position [x, y, z]. */
  position?: [number, number, number];
}

/**
 * NpcModel renders a deterministic NPC assembled from seeded GLBs.
 *
 * The same npcId + worldSeed always produces the same base model, items,
 * and color palette. Tint is applied via colorPalette to the base model only
 * (items retain their original textures for visual variety).
 *
 * See GAME_SPEC.md §15.
 */
export const NpcModel = ({
  npcId,
  worldSeed,
  role = "tips",
  position = [0, 0, 0],
}: NpcModelProps) => {
  const { baseModelPath, itemPaths, colorPalette } = resolveNpcAppearance(
    npcId,
    worldSeed,
    role,
  );

  return (
    <group position={position}>
      <NpcGLBPart glbPath={baseModelPath} tintColor={colorPalette} />
      {itemPaths.head && <NpcGLBPart glbPath={itemPaths.head} />}
      {itemPaths.torso && <NpcGLBPart glbPath={itemPaths.torso} />}
      {itemPaths.legs && <NpcGLBPart glbPath={itemPaths.legs} />}
      {itemPaths.feet && <NpcGLBPart glbPath={itemPaths.feet} />}
      {itemPaths.accessory && <NpcGLBPart glbPath={itemPaths.accessory} />}
    </group>
  );
};
