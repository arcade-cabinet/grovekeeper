/**
 * enemyColors — color palette table and BodyProps interface for procedural enemies.
 *
 * Centralised here so all tier shape files import from a single source.
 * See GAME_SPEC.md §20.
 */

// ---------------------------------------------------------------------------
// Shared props interface (all shape builders receive this)
// ---------------------------------------------------------------------------

export interface BodyProps {
  colors: { body: string; accent?: string; emissive?: string };
}

// ---------------------------------------------------------------------------
// Per-type color table
// ---------------------------------------------------------------------------

export const ENEMY_COLORS: Record<string, { body: string; accent?: string; emissive?: string }> = {
  bat: { body: "#4a1a6e", accent: "#2d1045" },
  "killer-pig": { body: "#e87c8a", accent: "#7a4520" },
  abomination: { body: "#2d5a2d", accent: "#4a1a6e" },
  "elk-demon": { body: "#3d2010", accent: "#8b0000", emissive: "#cc2200" },
  "green-goliath": { body: "#3d7a3d", accent: "#1a4a1a" },
  bigfoot: { body: "#5c3a21", accent: "#3a2010" },
  "plague-doctor": { body: "#3a3a3a", accent: "#2a2a2a", emissive: "#00cc44" },
  "skeleton-warrior": { body: "#d4c8a8", accent: "#b0a888" },
  knight: { body: "#2a2a3a", accent: "#1a1a2a" },
  werewolf: { body: "#4a3520", accent: "#2a1a10" },
  cyclops: { body: "#7a7a6a", accent: "#5a5a4a", emissive: "#ffaa00" },
  "blood-wraith": { body: "#cc0011", accent: "#880011", emissive: "#ff0022" },
  "corrupted-hedge": { body: "#2a4a1a", accent: "#6a1010" },
  devil: { body: "#cc1111", accent: "#880000", emissive: "#ff2200" },
};

export const FALLBACK_COLORS = { body: "#888888", accent: "#555555" };
