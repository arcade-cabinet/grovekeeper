/**
 * BorderTreeManager — Decorative trees outside the playable grid.
 *
 * Renders a ring of trees in the wilderness surrounding the world bounds.
 * These trees are purely visual: no growth, no harvesting, no player
 * interaction. They are ideal thin-instance candidates because:
 *   - They never move or scale after placement.
 *   - Many share the same species mesh.
 *   - They can be frozen immediately after creation.
 *
 * Performance strategy:
 *   - One template Mesh per species (hidden below the ground plane).
 *   - One thinInstanceSetBuffer per template covering all instances of
 *     that species — one draw call per species, not one per tree.
 *   - All matrices are precomputed once during init / rebuildAll.
 *   - On season change, call rebuildAll() to rebuild with new leaf tints.
 */

// Side-effect import: augments Mesh prototype with thinInstance* methods.
import "@babylonjs/core/Meshes/thinInstanceMesh";
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Scene } from "@babylonjs/core/scene";
import { buildSpeciesTreeMesh } from "@/shared/utils/treeMeshBuilder";
import { scopedRNG } from "@/shared/utils/seedRNG";
import type { Season } from "@/systems/time";
import type { WorldBounds } from "./GroundBuilder";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** How many border trees to scatter around the wilderness ring. */
const BORDER_TREE_COUNT = 120;

/**
 * Minimum distance (world tiles) outside worldBounds.maxX/maxZ to begin
 * placing trees. Keeps them off the playable ground mesh edge.
 */
const RING_INNER_MARGIN = 2;

/**
 * Maximum distance (world tiles) outside worldBounds beyond which trees
 * are not placed. Keeps them within the visible camera frustum.
 */
const RING_OUTER_MARGIN = 14;

/** Visual scale applied to all border trees (match in-game mature trees). */
const BORDER_TREE_SCALE_MIN = 0.35;
const BORDER_TREE_SCALE_MAX = 0.65;

/**
 * Species used for border trees. These map to entries in SPECIES_PROFILES
 * inside treeMeshBuilder.ts — all are guaranteed to resolve.
 */
const BORDER_SPECIES: readonly string[] = [
  "white-oak",
  "elder-pine",
  "weeping-willow",
  "ghost-birch",
  "redwood",
  "flame-maple",
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BorderTreeEntry {
  x: number;
  z: number;
  yaw: number;
  scale: number;
  speciesId: string;
}

// Reusable scratch values to avoid per-instance allocations inside the loop.
const _scaleVec = new Vector3(1, 1, 1);
const _quat = new Quaternion();
const _transVec = new Vector3(0, 0, 0);
const _mat = Matrix.Identity();

// ---------------------------------------------------------------------------
// BorderTreeManager
// ---------------------------------------------------------------------------

export class BorderTreeManager {
  /** Template meshes keyed by species cache key (speciesId_season). */
  private templates = new Map<string, Mesh>();

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Place border trees around the world bounds.
   *
   * @param scene     - Active BabylonJS Scene.
   * @param bounds    - World extents returned by WorldManager.getWorldBounds().
   * @param season    - Current game season (affects leaf tints).
   * @param worldSeed - World seed string; ensures same layout for the same world.
   */
  init(
    scene: Scene,
    bounds: WorldBounds,
    season: Season | undefined,
    worldSeed: string,
  ): void {
    this._buildAll(scene, bounds, season, worldSeed);
  }

  /**
   * Rebuild all border trees (called on season change).
   *
   * Disposes all existing templates before creating new ones.
   */
  rebuildAll(
    scene: Scene,
    bounds: WorldBounds,
    season: Season,
    worldSeed: string,
  ): void {
    this._disposeTemplates();
    this._buildAll(scene, bounds, season, worldSeed);
  }

  /** Dispose all resources. Call when the scene is torn down. */
  dispose(): void {
    this._disposeTemplates();
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private _disposeTemplates(): void {
    for (const template of this.templates.values()) {
      template.dispose();
    }
    this.templates.clear();
  }

  private _buildAll(
    scene: Scene,
    bounds: WorldBounds,
    season: Season | undefined,
    worldSeed: string,
  ): void {
    const entries = this._generateEntries(bounds, worldSeed);

    // Group entries by species so we can build one template + one buffer per species.
    const bySpecies = new Map<string, BorderTreeEntry[]>();
    for (const entry of entries) {
      let group = bySpecies.get(entry.speciesId);
      if (!group) {
        group = [];
        bySpecies.set(entry.speciesId, group);
      }
      group.push(entry);
    }

    // Build thin-instanced mesh per species.
    for (const [speciesId, group] of bySpecies) {
      const cacheKey = `${speciesId}_${season ?? "default"}`;
      let template = this.templates.get(cacheKey);

      if (!template) {
        template = buildSpeciesTreeMesh(
          scene,
          `border_template_${cacheKey}`,
          speciesId,
          season,
          0,
          false,
        );

        // Park the template below the ground so it never renders directly.
        // Disable picking and bounding-info sync — the template is static.
        template.position.y = -10000;
        template.isPickable = false;
        template.doNotSyncBoundingInfo = true;
        template.alwaysSelectAsActiveMesh = false;
        template.isVisible = true; // must be true for instances to render
        template.freezeWorldMatrix();

        this.templates.set(cacheKey, template);
      }

      // Build one Float32Array of column-major 4×4 matrices.
      const count = group.length;
      const matrices = new Float32Array(16 * count);

      for (let i = 0; i < count; i++) {
        const entry = group[i];

        _scaleVec.set(entry.scale, entry.scale, entry.scale);
        Quaternion.RotationYawPitchRollToRef(entry.yaw, 0, 0, _quat);
        _transVec.set(entry.x, 0, entry.z);

        Matrix.ComposeToRef(_scaleVec, _quat, _transVec, _mat);
        _mat.copyToArray(matrices, i * 16);
      }

      // Upload all matrices as a single thinInstance buffer.
      // staticBuffer=true tells Babylon this buffer won't be updated — skip
      // per-frame dirty checks, squeeze a few more CPU cycles per draw call.
      template.thinInstanceSetBuffer("matrix", matrices, 16, true);
    }
  }

  /**
   * Generate placement entries for border trees using scopedRNG.
   *
   * Trees are scattered in the rectangular ring between RING_INNER_MARGIN and
   * RING_OUTER_MARGIN outside the world bounds on all four sides.
   */
  private _generateEntries(
    bounds: WorldBounds,
    worldSeed: string,
  ): BorderTreeEntry[] {
    const rng = scopedRNG("border-tree", worldSeed);
    const entries: BorderTreeEntry[] = [];

    const worldW = bounds.maxX - bounds.minX;
    const worldH = bounds.maxZ - bounds.minZ;

    // We scatter trees in a ring. For each tree we:
    //   1. Pick a random angle around the world centre.
    //   2. Pick a random radial distance in [RING_INNER_MARGIN, RING_OUTER_MARGIN].
    //   3. Project along that angle to a world-space (x, z).
    //
    // Using elliptical polar coordinates lets the ring scale with non-square worlds.

    const cx = (bounds.minX + bounds.maxX) / 2;
    const cz = (bounds.minZ + bounds.maxZ) / 2;
    const halfW = worldW / 2 + RING_INNER_MARGIN;
    const halfH = worldH / 2 + RING_INNER_MARGIN;
    const extraRange = RING_OUTER_MARGIN - RING_INNER_MARGIN;

    for (let i = 0; i < BORDER_TREE_COUNT; i++) {
      const angle = rng() * Math.PI * 2;
      const extra = rng() * extraRange;

      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      // Elliptical radius at this angle, then add the extra outward distance.
      // This places trees at least RING_INNER_MARGIN beyond the world boundary
      // on all sides regardless of the world's aspect ratio.
      const ellipseR =
        (halfW * halfH) /
        Math.sqrt(halfH * halfH * cosA * cosA + halfW * halfW * sinA * sinA);
      const r = ellipseR + extra;

      const x = cx + r * cosA;
      const z = cz + r * sinA;

      // Add a small position jitter so trees don't sit on a perfect ring.
      const jx = (rng() - 0.5) * 2.5;
      const jz = (rng() - 0.5) * 2.5;

      const yaw = rng() * Math.PI * 2;
      const scale =
        BORDER_TREE_SCALE_MIN +
        rng() * (BORDER_TREE_SCALE_MAX - BORDER_TREE_SCALE_MIN);

      const speciesIdx = Math.floor(rng() * BORDER_SPECIES.length);
      const speciesId = BORDER_SPECIES[speciesIdx] ?? "white-oak";

      entries.push({ x: x + jx, z: z + jz, yaw, scale, speciesId });
    }

    return entries;
  }
}
