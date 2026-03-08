import { AxeIcon, DropletsIcon, ScissorsIcon, SproutIcon } from "lucide-react-native";
import { useMemo } from "react";
import { TREE_SPECIES } from "@/game/config/species";
import { TOOLS } from "@/game/config/tools";
import { useGameStore } from "@/game/stores";
import { ACHIEVEMENTS } from "@/game/systems/achievements";
import { getCosmeticById, getUnlockedCosmetics, PRESTIGE_COSMETICS } from "@/game/systems/prestige";
import { BASE_TRADE_RATES, getEffectiveTradeRates } from "@/game/systems/trading";
import { buildGridExpansionInfo, buildPrestigeInfo } from "./gameUILogic";

export function useGameUIData() {
  const activeBorderCosmetic = useGameStore((s) => s.activeBorderCosmetic);
  const resources = useGameStore((s) => s.resources);
  const level = useGameStore((s) => s.level);
  const xp = useGameStore((s) => s.xp);
  const selectedTool = useGameStore((s) => s.selectedTool);
  const unlockedTools = useGameStore((s) => s.unlockedTools);
  const unlockedSpecies = useGameStore((s) => s.unlockedSpecies);
  const seeds = useGameStore((s) => s.seeds);
  const selectedSpecies = useGameStore((s) => s.selectedSpecies);
  const prestigeCount = useGameStore((s) => s.prestigeCount);
  const achievements = useGameStore((s) => s.achievements);
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const hapticsEnabled = useGameStore((s) => s.hapticsEnabled);
  const gridSize = useGameStore((s) => s.gridSize);
  const treesPlanted = useGameStore((s) => s.treesPlanted);
  const treesMatured = useGameStore((s) => s.treesMatured);
  const coins = useGameStore((s) => s.coins);
  const marketState = useGameStore((s) => s.marketState);

  const seedSelectSpecies = useMemo(
    () =>
      TREE_SPECIES.map((sp) => ({
        id: sp.id,
        name: sp.name,
        difficulty: sp.difficulty,
        unlockLevel: sp.unlockLevel,
        biome: sp.biome,
        special: sp.special,
        seedCost: sp.seedCost,
        trunkColor: sp.meshParams?.color?.trunk ?? "#5D4037",
        canopyColor: sp.meshParams?.color?.canopy ?? "#81C784",
      })),
    [],
  );

  const tradeRates = useMemo(
    () => getEffectiveTradeRates(BASE_TRADE_RATES, marketState.priceMultipliers),
    [marketState.priceMultipliers],
  );

  const pauseStats = useMemo(
    () => ({
      level,
      xp,
      coins,
      treesPlanted,
      treesMatured,
      gridSize,
      unlockedSpeciesCount: unlockedSpecies.length,
      totalSpeciesCount: TREE_SPECIES.length,
      unlockedToolsCount: unlockedTools.length,
      totalToolsCount: TOOLS.length,
      prestigeCount,
    }),
    [
      level,
      xp,
      coins,
      treesPlanted,
      treesMatured,
      gridSize,
      unlockedSpecies.length,
      unlockedTools.length,
      prestigeCount,
    ],
  );

  const achievementDefs = useMemo(
    () => ACHIEVEMENTS.map((a) => ({ id: a.id, name: a.name, description: a.description })),
    [],
  );

  const gridExpansionInfo = useMemo(
    () => buildGridExpansionInfo(gridSize, resources, level),
    [gridSize, resources, level],
  );

  const prestigeInfo = useMemo(
    () => buildPrestigeInfo(prestigeCount, level),
    [prestigeCount, level],
  );

  const pauseUnlockedCosmetics = useMemo(
    () => getUnlockedCosmetics(prestigeCount),
    [prestigeCount],
  );

  const pauseLockedCosmetics = useMemo(
    () => PRESTIGE_COSMETICS.filter((c) => c.prestigeRequired > prestigeCount),
    [prestigeCount],
  );

  const mobileActions = useMemo(
    () => [
      { id: "plant", label: "Plant", icon: SproutIcon, toolId: "trowel", enabled: true },
      { id: "water", label: "Water", icon: DropletsIcon, toolId: "watering-can", enabled: true },
      { id: "harvest", label: "Harvest", icon: AxeIcon, toolId: "axe", enabled: true },
      {
        id: "prune",
        label: "Prune",
        icon: ScissorsIcon,
        toolId: "pruning-shears",
        enabled: unlockedTools.includes("pruning-shears"),
      },
    ],
    [unlockedTools],
  );

  const cosmetic = activeBorderCosmetic ? getCosmeticById(activeBorderCosmetic) : null;

  return {
    activeBorderCosmetic,
    resources,
    level,
    selectedTool,
    unlockedTools,
    unlockedSpecies,
    seeds,
    selectedSpecies,
    achievements,
    soundEnabled,
    hapticsEnabled,
    seedSelectSpecies,
    tradeRates,
    pauseStats,
    achievementDefs,
    gridExpansionInfo,
    prestigeInfo,
    pauseUnlockedCosmetics,
    pauseLockedCosmetics,
    mobileActions,
    cosmetic,
  };
}
