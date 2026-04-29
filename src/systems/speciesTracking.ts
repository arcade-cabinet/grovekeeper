/**
 * Species tracking — koota-coupled mutations for codex progress.
 *
 * Extracted from the legacy actions.ts facade so these functions can be
 * imported directly by callers without pulling in the full legacy bundle.
 */

import { getSpeciesById } from "@/config/trees";
import type { koota } from "@/koota";
import { SpeciesProgressTrait } from "@/traits";
import { showToast } from "@/ui/game/Toast";
import {
  computeDiscoveryTier,
  createEmptyProgress,
  type SpeciesProgress,
} from "./speciesDiscovery";

type World = typeof koota;

export function trackSpeciesPlanting(world: World, speciesId: string): void {
  const codex = world.get(SpeciesProgressTrait);
  if (!codex) return;
  const existing = codex.speciesProgress[speciesId] ?? createEmptyProgress();
  const updated: SpeciesProgress = {
    ...existing,
    timesPlanted: existing.timesPlanted + 1,
  };
  updated.discoveryTier = computeDiscoveryTier(updated);

  const tierChanged = updated.discoveryTier > existing.discoveryTier;
  const newPending = tierChanged
    ? [...codex.pendingCodexUnlocks, speciesId]
    : codex.pendingCodexUnlocks;

  if (tierChanged) {
    const sp = getSpeciesById(speciesId);
    queueMicrotask(() => {
      showToast(
        `Codex: ${sp?.name ?? speciesId} -- Discovered!`,
        "achievement",
      );
    });
  }

  world.set(SpeciesProgressTrait, {
    speciesProgress: { ...codex.speciesProgress, [speciesId]: updated },
    pendingCodexUnlocks: newPending,
  });
}

export function trackSpeciesGrowth(
  world: World,
  speciesId: string,
  newStage: number,
): void {
  const codex = world.get(SpeciesProgressTrait);
  if (!codex) return;
  const existing = codex.speciesProgress[speciesId] ?? createEmptyProgress();
  if (newStage <= existing.maxStageReached) return;

  const updated: SpeciesProgress = {
    ...existing,
    maxStageReached: newStage,
  };
  updated.discoveryTier = computeDiscoveryTier(updated);

  const tierChanged = updated.discoveryTier > existing.discoveryTier;
  const newPending = tierChanged
    ? [...codex.pendingCodexUnlocks, speciesId]
    : codex.pendingCodexUnlocks;

  if (tierChanged) {
    const sp = getSpeciesById(speciesId);
    const tierNames = ["", "Discovered", "Studied", "Mastered", "Legendary"];
    queueMicrotask(() => {
      showToast(
        `Codex: ${sp?.name ?? speciesId} -- ${tierNames[updated.discoveryTier]}!`,
        "achievement",
      );
    });
  }

  world.set(SpeciesProgressTrait, {
    speciesProgress: { ...codex.speciesProgress, [speciesId]: updated },
    pendingCodexUnlocks: newPending,
  });
}

export function trackSpeciesHarvest(
  world: World,
  speciesId: string,
  yieldAmount: number,
): void {
  const codex = world.get(SpeciesProgressTrait);
  if (!codex) return;
  const existing = codex.speciesProgress[speciesId] ?? createEmptyProgress();
  const updated: SpeciesProgress = {
    ...existing,
    timesHarvested: existing.timesHarvested + 1,
    totalYield: existing.totalYield + yieldAmount,
  };
  updated.discoveryTier = computeDiscoveryTier(updated);

  const tierChanged = updated.discoveryTier > existing.discoveryTier;
  const newPending = tierChanged
    ? [...codex.pendingCodexUnlocks, speciesId]
    : codex.pendingCodexUnlocks;

  if (tierChanged) {
    const sp = getSpeciesById(speciesId);
    queueMicrotask(() => {
      showToast(`Codex: ${sp?.name ?? speciesId} -- Legendary!`, "achievement");
    });
  }

  world.set(SpeciesProgressTrait, {
    speciesProgress: { ...codex.speciesProgress, [speciesId]: updated },
    pendingCodexUnlocks: newPending,
  });
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
