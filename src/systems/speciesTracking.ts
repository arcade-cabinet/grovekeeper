/**
 * Species tracking — koota-coupled mutations for codex progress.
 *
 * Each function returns a `CodexEvent` when a discovery tier increases, or
 * `null` otherwise. Callers are responsible for dispatching UI notifications
 * (e.g. showToast) from the returned event so that tracking remains free of
 * direct UI dependencies.
 */

import { getSpeciesById } from "@/config/trees";
import type { koota } from "@/koota";
import { SpeciesProgressTrait } from "@/traits";
import {
  computeDiscoveryTier,
  createEmptyProgress,
  type SpeciesProgress,
} from "./speciesDiscovery";

type World = typeof koota;

const TIER_NAMES = [
  "",
  "Discovered",
  "Studied",
  "Mastered",
  "Legendary",
] as const;

/** Emitted when a species advances to a new discovery tier. */
export interface CodexEvent {
  speciesId: string;
  speciesName: string;
  tier: number;
  tierName: string;
}

function enqueuePendingUnlock(pending: string[], speciesId: string): string[] {
  return pending.includes(speciesId) ? pending : [...pending, speciesId];
}

function buildCodexEvent(speciesId: string, tier: number): CodexEvent {
  const sp = getSpeciesById(speciesId);
  return {
    speciesId,
    speciesName: sp?.name ?? speciesId,
    tier,
    tierName: TIER_NAMES[tier] ?? "",
  };
}

export function trackSpeciesPlanting(
  world: World,
  speciesId: string,
): CodexEvent | null {
  const codex = world.get(SpeciesProgressTrait);
  if (!codex) return null;
  const existing = codex.speciesProgress[speciesId] ?? createEmptyProgress();
  const updated: SpeciesProgress = {
    ...existing,
    timesPlanted: existing.timesPlanted + 1,
  };
  updated.discoveryTier = computeDiscoveryTier(updated);

  const tierChanged = updated.discoveryTier > existing.discoveryTier;
  const newPending = tierChanged
    ? enqueuePendingUnlock(codex.pendingCodexUnlocks, speciesId)
    : codex.pendingCodexUnlocks;

  world.set(SpeciesProgressTrait, {
    speciesProgress: { ...codex.speciesProgress, [speciesId]: updated },
    pendingCodexUnlocks: newPending,
  });

  return tierChanged ? buildCodexEvent(speciesId, updated.discoveryTier) : null;
}

export function trackSpeciesGrowth(
  world: World,
  speciesId: string,
  newStage: number,
): CodexEvent | null {
  const codex = world.get(SpeciesProgressTrait);
  if (!codex) return null;
  const existing = codex.speciesProgress[speciesId] ?? createEmptyProgress();
  if (newStage <= existing.maxStageReached) return null;

  const updated: SpeciesProgress = {
    ...existing,
    maxStageReached: newStage,
  };
  updated.discoveryTier = computeDiscoveryTier(updated);

  const tierChanged = updated.discoveryTier > existing.discoveryTier;
  const newPending = tierChanged
    ? enqueuePendingUnlock(codex.pendingCodexUnlocks, speciesId)
    : codex.pendingCodexUnlocks;

  world.set(SpeciesProgressTrait, {
    speciesProgress: { ...codex.speciesProgress, [speciesId]: updated },
    pendingCodexUnlocks: newPending,
  });

  return tierChanged ? buildCodexEvent(speciesId, updated.discoveryTier) : null;
}

export function trackSpeciesHarvest(
  world: World,
  speciesId: string,
  yieldAmount: number,
): CodexEvent | null {
  const codex = world.get(SpeciesProgressTrait);
  if (!codex) return null;
  const existing = codex.speciesProgress[speciesId] ?? createEmptyProgress();
  const updated: SpeciesProgress = {
    ...existing,
    timesHarvested: existing.timesHarvested + 1,
    totalYield: existing.totalYield + yieldAmount,
  };
  updated.discoveryTier = computeDiscoveryTier(updated);

  const tierChanged = updated.discoveryTier > existing.discoveryTier;
  const newPending = tierChanged
    ? enqueuePendingUnlock(codex.pendingCodexUnlocks, speciesId)
    : codex.pendingCodexUnlocks;

  world.set(SpeciesProgressTrait, {
    speciesProgress: { ...codex.speciesProgress, [speciesId]: updated },
    pendingCodexUnlocks: newPending,
  });

  return tierChanged ? buildCodexEvent(speciesId, updated.discoveryTier) : null;
}

export function consumePendingCodexUnlock(world: World): string | null {
  const codex = world.get(SpeciesProgressTrait);
  if (!codex || codex.pendingCodexUnlocks.length === 0) return null;
  const [first, ...rest] = codex.pendingCodexUnlocks;
  world.set(SpeciesProgressTrait, {
    ...codex,
    pendingCodexUnlocks: rest,
  });
  return first;
}
