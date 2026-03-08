/**
 * playerState.ts -- Core player state mutations: identity, tools, stamina, achievements,
 * tracking, time, zones. See progression.ts for grid/prestige/tool upgrades,
 * survivalState.ts for survival actions. Spec §3 (XP), §11 (tools)
 */

import { batch } from "@legendapp/state";
import { getSpeciesById } from "@/game/config/species";
import { getToolById } from "@/game/config/tools";
import { checkNewUnlocks } from "@/game/systems/levelUnlocks";
import type { Season } from "@/game/systems/time";
import { getZoneBonusMagnitude, type ZoneType } from "@/game/systems/zoneBonuses";
import { showToast } from "@/game/ui/Toast";
import type { GameScreen, SerializedTree } from "./core.ts";
import { gameState$, getState, initialState, levelFromXp } from "./core.ts";

export function saveGrove(trees: SerializedTree[], playerPos: { x: number; z: number }): void {
  gameState$.groveData.set({ trees, playerPosition: playerPos });
}

export function setScreen(screen: GameScreen): void {
  gameState$.screen.set(screen);
}

export function setDifficulty(difficultyId: string): void {
  gameState$.difficulty.set(difficultyId);
}

export function setSelectedTool(selectedTool: string): void {
  gameState$.selectedTool.set(selectedTool);
}

export function setSelectedSpecies(selectedSpecies: string): void {
  gameState$.selectedSpecies.set(selectedSpecies);
}

export function addCoins(amount: number): void {
  gameState$.coins.set((prev) => prev + amount);
}

export function addXp(amount: number): void {
  const state = getState();
  // Apply zone-based xp_boost (Spec §18). Settlement +10%, Clearing +15%.
  const xpBoost = getZoneBonusMagnitude((state.currentZoneId ?? "grove") as ZoneType, "xp_boost");
  const boostedAmount = Math.round(amount * (1 + xpBoost));
  const newXp = state.xp + boostedAmount;
  const newLevel = levelFromXp(newXp);

  if (newLevel > state.level) {
    const unlocks = checkNewUnlocks(state.level, newLevel);
    const newUnlockedTools = [...state.unlockedTools];
    const newUnlockedSpecies = [...state.unlockedSpecies];

    for (const toolId of unlocks.tools) {
      if (!newUnlockedTools.includes(toolId)) newUnlockedTools.push(toolId);
    }
    for (const speciesId of unlocks.species) {
      if (!newUnlockedSpecies.includes(speciesId)) newUnlockedSpecies.push(speciesId);
    }

    batch(() => {
      gameState$.xp.set(newXp);
      gameState$.level.set(newLevel);
      gameState$.unlockedTools.set(newUnlockedTools);
      gameState$.unlockedSpecies.set(newUnlockedSpecies);
    });

    queueMicrotask(() => {
      showToast(`Level ${newLevel}!`, "success");
      for (const speciesId of unlocks.species) {
        const sp = getSpeciesById(speciesId);
        showToast(`Unlocked: ${sp?.name ?? speciesId}`, "achievement");
      }
      for (const toolId of unlocks.tools) {
        const tool = getToolById(toolId);
        showToast(`Unlocked: ${tool?.name ?? toolId}`, "achievement");
      }
    });
  } else {
    batch(() => {
      gameState$.xp.set(newXp);
      gameState$.level.set(newLevel);
    });
  }
}

export function unlockTool(toolId: string): void {
  const current = getState().unlockedTools;
  if (!current.includes(toolId)) gameState$.unlockedTools.set([...current, toolId]);
}

export function unlockSpecies(speciesId: string): void {
  const current = getState().unlockedSpecies;
  if (!current.includes(speciesId)) gameState$.unlockedSpecies.set([...current, speciesId]);
}

export function incrementTreesPlanted(): void {
  gameState$.treesPlanted.set((prev) => prev + 1);
}

export function incrementTreesMatured(): void {
  gameState$.treesMatured.set((prev) => prev + 1);
}

export function incrementTreesHarvested(): void {
  gameState$.treesHarvested.set((prev) => prev + 1);
}

export function incrementTreesWatered(): void {
  gameState$.treesWatered.set((prev) => prev + 1);
}

export function setStamina(value: number): void {
  gameState$.stamina.set(value);
}

export function spendStamina(amount: number): boolean {
  const current = getState().stamina;
  if (current < amount) return false;
  gameState$.stamina.set(current - amount);
  return true;
}

/** Drain durability from a tool. Returns false if already broken. Spec §11.3 */
export function drainToolDurability(toolId: string, maxDurability: number, amount = 1): boolean {
  const state = getState();
  const current = state.toolDurabilities[toolId] ?? maxDurability;
  if (current <= 0) return false;
  gameState$.toolDurabilities.set({
    ...state.toolDurabilities,
    [toolId]: Math.max(0, current - amount),
  });
  return true;
}

export function setToolDurability(toolId: string, value: number): void {
  const state = getState();
  gameState$.toolDurabilities.set({ ...state.toolDurabilities, [toolId]: value });
}

export function unlockAchievement(id: string): void {
  const current = getState().achievements;
  if (!current.includes(id)) gameState$.achievements.set([...current, id]);
}

export function trackSpeciesPlanted(speciesId: string): void {
  const current = getState().speciesPlanted;
  if (!current.includes(speciesId)) gameState$.speciesPlanted.set([...current, speciesId]);
}

export function trackSeason(season: string): void {
  const current = getState().seasonsExperienced;
  if (!current.includes(season)) gameState$.seasonsExperienced.set([...current, season]);
}

// expandGrid, performPrestige, upgradeToolTier moved to progression.ts

export function setActiveBorderCosmetic(id: string | null): void {
  gameState$.activeBorderCosmetic.set(id);
}

export function setBuildMode(enabled: boolean, templateId?: string): void {
  batch(() => {
    gameState$.buildMode.set(enabled);
    gameState$.buildTemplateId.set(enabled ? (templateId ?? null) : null);
  });
}

export function addPlacedStructure(templateId: string, worldX: number, worldZ: number): void {
  const current = getState().placedStructures;
  gameState$.placedStructures.set([...current, { templateId, worldX, worldZ }]);
}

export function removePlacedStructure(worldX: number, worldZ: number): void {
  const current = getState().placedStructures;
  gameState$.placedStructures.set(
    current.filter((s) => s.worldX !== worldX || s.worldZ !== worldZ),
  );
}

export function resetGame(worldSeed?: string): void {
  const newState = structuredClone(initialState);
  if (worldSeed) newState.worldSeed = worldSeed;
  gameState$.set(newState);
}

export function setGameTime(microseconds: number): void {
  gameState$.gameTimeMicroseconds.set(microseconds);
}

export function setCurrentSeason(season: Season): void {
  gameState$.currentSeason.set(season);
}

export function setCurrentDay(day: number): void {
  gameState$.currentDay.set(day);
}

export function incrementToolUse(toolId: string): void {
  const state = getState();
  gameState$.toolUseCounts.set({
    ...state.toolUseCounts,
    [toolId]: (state.toolUseCounts[toolId] ?? 0) + 1,
  });
}

export function incrementWildTreesHarvested(speciesId?: string): void {
  const state = getState();
  gameState$.wildTreesHarvested.set(state.wildTreesHarvested + 1);
  if (speciesId && !state.wildSpeciesHarvested.includes(speciesId)) {
    gameState$.wildSpeciesHarvested.set([...state.wildSpeciesHarvested, speciesId]);
  }
}

export function incrementWildTreesRegrown(): void {
  gameState$.wildTreesRegrown.set((prev) => prev + 1);
}

export function trackVisitedZoneType(zoneType: string): void {
  const current = getState().visitedZoneTypes;
  if (!current.includes(zoneType)) gameState$.visitedZoneTypes.set([...current, zoneType]);
}

export function incrementSeasonalPlanting(season: string): void {
  if (season === "spring") gameState$.treesPlantedInSpring.set((prev) => prev + 1);
}

export function incrementSeasonalHarvest(season: string): void {
  if (season === "autumn") gameState$.treesHarvestedInAutumn.set((prev) => prev + 1);
}

export function discoverZone(zoneId: string): boolean {
  const state = getState();
  if (state.discoveredZones.includes(zoneId)) return false;
  gameState$.discoveredZones.set([...state.discoveredZones, zoneId]);
  queueMicrotask(() => {
    showToast(`Discovered new area!`, "success");
  });
  addXp(50);
  return true;
}

export function setCurrentZoneId(zoneId: string): void {
  gameState$.currentZoneId.set(zoneId);
}

export function setWorldSeed(seed: string): void {
  gameState$.worldSeed.set(seed);
}

// startNewGame, setHunger, setHearts, setMaxHearts, setBodyTemp, setLastCampfire,
// handleDeath, setActiveCraftingStation, hydrateFromDb moved to survivalState.ts
