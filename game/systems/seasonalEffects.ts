/**
 * Seasonal Effects System (Spec §6.3)
 *
 * Orchestrates visual season changes:
 *  - Terrain vertex color palettes per season
 *  - 5-day transition blend factors
 *  - Tree seasonal tint + winter GLB swap
 *  - Bush seasonal GLB swap
 *
 * All tuning values loaded from config/game/seasons.json.
 * Per-entity colour lookups delegate to vegetationPlacement.ts.
 * Zero Three.js / ECS imports — fully unit-testable.
 */

import type { Season } from "./time";
import type { TreeComponent, BushComponent, VegetationSeason } from "@/game/ecs/components/vegetation";
import { getSeasonalTreeTint, updateBushSeason } from "./vegetationPlacement";
import seasonsConfig from "@/config/game/seasons.json" with { type: "json" };

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SeasonalTerrainColors {
  grass: string;
  dirt: string;
  rock: string;
  snow?: string;
}

// ── Config ────────────────────────────────────────────────────────────────────

const TRANSITION_DAYS: number = seasonsConfig.transitionDays;
const TERRAIN_COLORS = seasonsConfig.terrainColors as Record<string, SeasonalTerrainColors>;

// ── Terrain palette ───────────────────────────────────────────────────────────

/**
 * Returns the terrain vertex color palette for a given season.
 * Values come from config/game/seasons.json — no inline tuning.
 */
export function getSeasonalTerrainColors(season: Season): SeasonalTerrainColors {
  return TERRAIN_COLORS[season] ?? TERRAIN_COLORS.spring;
}

// ── Transition blend ──────────────────────────────────────────────────────────

/**
 * Returns a blend factor [0, 1] representing how far through the seasonal
 * transition period the current day is.
 *
 *   dayInSeason = 0           → 0  (transition starts at season boundary)
 *   dayInSeason = transitionDays → 1  (fully transitioned)
 *   dayInSeason > transitionDays → 1  (clamped)
 *
 * The spec calls for a 5-day transition blend (config: transitionDays=5).
 */
export function computeSeasonTransitionBlend(
  dayInSeason: number,
  transitionDays: number = TRANSITION_DAYS,
): number {
  if (dayInSeason <= 0) return 0;
  if (dayInSeason >= transitionDays) return 1;
  return dayInSeason / transitionDays;
}

// ── Hex color blending ────────────────────────────────────────────────────────

/**
 * Linearly interpolates between two hex colors (#RRGGBB) by factor t in [0, 1].
 * t=0 → fromColor, t=1 → toColor.
 */
export function blendHexColors(fromColor: string, toColor: string, t: number): string {
  const from = hexToRgb(fromColor);
  const to = hexToRgb(toColor);
  const r = Math.round(from.r + (to.r - from.r) * t);
  const g = Math.round(from.g + (to.g - from.g) * t);
  const b = Math.round(from.b + (to.b - from.b) * t);
  return rgbToHex(r, g, b);
}

// ── Season-change detection ───────────────────────────────────────────────────

/**
 * Returns true if the season has changed from the previous frame.
 * Also returns true when previousSeason is null (first frame after init).
 */
export function detectSeasonChange(
  previousSeason: Season | null,
  currentSeason: Season,
): boolean {
  return previousSeason !== currentSeason;
}

// ── Vegetation updates ────────────────────────────────────────────────────────

/**
 * Returns a new TreeComponent with the seasonal tint and winter model flag
 * set for the given season. Does not mutate the input.
 */
export function applySeasonToTree(
  tree: TreeComponent,
  season: VegetationSeason,
  isEvergreen: boolean,
): TreeComponent {
  const seasonTint = getSeasonalTreeTint(tree.speciesId, season, isEvergreen);
  const useWinterModel = season === "winter" && tree.winterModel !== "";
  return { ...tree, seasonTint, useWinterModel };
}

/**
 * Returns a new BushComponent with the season and modelKey updated for the
 * new season. Delegates to updateBushSeason from vegetationPlacement.ts.
 * Does not mutate the input.
 */
export function applySeasonToBush(
  bush: BushComponent,
  season: VegetationSeason,
): BushComponent {
  return updateBushSeason(bush, season);
}

// ── Blended terrain palette ───────────────────────────────────────────────────

/**
 * Returns a terrain palette that blends between two season palettes.
 * blend=0 → fromPalette, blend=1 → toPalette.
 * Used during the 5-day season transition window.
 */
export function getBlendedTerrainPalette(
  fromPalette: SeasonalTerrainColors,
  toPalette: SeasonalTerrainColors,
  blend: number,
): SeasonalTerrainColors {
  const grass = blendHexColors(fromPalette.grass, toPalette.grass, blend);
  const dirt = blendHexColors(fromPalette.dirt, toPalette.dirt, blend);
  const rock = blendHexColors(fromPalette.rock, toPalette.rock, blend);

  const result: SeasonalTerrainColors = { grass, dirt, rock };

  if (fromPalette.snow !== undefined || toPalette.snow !== undefined) {
    const fromSnow = fromPalette.snow ?? fromPalette.rock;
    const toSnow = toPalette.snow ?? toPalette.rock;
    result.snow = blendHexColors(fromSnow, toSnow, blend);
  }

  return result;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${byteToHex(r)}${byteToHex(g)}${byteToHex(b)}`;
}

function byteToHex(value: number): string {
  return Math.max(0, Math.min(255, value)).toString(16).padStart(2, "0");
}
