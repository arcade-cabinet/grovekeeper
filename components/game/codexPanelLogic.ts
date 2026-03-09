/**
 * codexPanelLogic.ts -- Pure functions for the Species Codex panel.
 *
 * Builds display rows from species config + discovery progress.
 * No store or React imports -- fully testable.
 *
 * Spec §8 (Species Codex), §25 (Discovery)
 */

import type { DiscoveryTier } from "@/game/constants/codex";
import type { SpeciesProgress } from "@/game/systems/speciesDiscovery";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CodexRow {
  speciesId: string;
  name: string;
  biome: string;
  difficulty: number;
  trunkColor: string;
  canopyColor: string;
  discoveryTier: DiscoveryTier;
  isDiscovered: boolean;
  isPrestige: boolean;
}

export interface SpeciesInput {
  id: string;
  name: string;
  biome: string;
  difficulty: number;
  meshParams: { color: { trunk: string; canopy: string } };
  requiredPrestiges?: number;
}

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Build sorted codex rows from all species and the player's discovery progress.
 * Discovered species sort first, then alphabetically by name.
 */
export function buildCodexRows(
  speciesProgress: Record<string, SpeciesProgress>,
  allSpecies: readonly SpeciesInput[],
): CodexRow[] {
  const rows: CodexRow[] = allSpecies.map((sp) => {
    const progress = speciesProgress[sp.id];
    const tier: DiscoveryTier = progress?.discoveryTier ?? 0;
    return {
      speciesId: sp.id,
      name: sp.name,
      biome: sp.biome,
      difficulty: sp.difficulty,
      trunkColor: sp.meshParams.color.trunk,
      canopyColor: sp.meshParams.color.canopy,
      discoveryTier: tier,
      isDiscovered: tier >= 1,
      isPrestige: (sp.requiredPrestiges ?? 0) > 0,
    };
  });

  rows.sort((a, b) => {
    // Discovered first
    if (a.isDiscovered !== b.isDiscovered) return a.isDiscovered ? -1 : 1;
    // Then alphabetical
    return a.name.localeCompare(b.name);
  });

  return rows;
}

/**
 * Format discovery progress as "X / Y Discovered".
 */
export function formatDiscoveryProgress(discovered: number, total: number): string {
  return `${discovered} / ${total} Discovered`;
}

/**
 * Return a tier label for display (e.g. "Studied", "Mastered").
 */
export function getTierLabel(tier: DiscoveryTier): string {
  switch (tier) {
    case 0:
      return "Unknown";
    case 1:
      return "Discovered";
    case 2:
      return "Studied";
    case 3:
      return "Mastered";
    case 4:
      return "Legendary";
    default:
      return "Unknown";
  }
}

/**
 * Return difficulty as a star string (e.g. difficulty 3 -> "★★★").
 */
export function formatDifficulty(difficulty: number): string {
  return "\u2605".repeat(Math.max(1, Math.min(5, difficulty)));
}
