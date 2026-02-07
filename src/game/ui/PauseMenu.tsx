import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { COLORS } from "../constants/config";
import { useGameStore } from "../stores/gameStore";
import { ACHIEVEMENT_DEFS } from "../systems/achievements";
import {
  canAffordExpansion,
  getNextExpansionTier,
} from "../systems/gridExpansion";
import {
  calculatePrestigeBonus,
  canPrestige,
  PRESTIGE_MIN_LEVEL,
  getUnlockedCosmetics,
  PRESTIGE_COSMETICS,
} from "../systems/prestige";
import { getDifficultyById } from "../constants/difficulty";
import { exportSaveFile, importSaveFile } from "@/db/export";
import { isDbInitialized } from "@/db/client";
import { FarmerMascot } from "./FarmerMascot";
import { StatsDashboard } from "./StatsDashboard";
import { showToast } from "./Toast";

interface PauseMenuProps {
  open: boolean;
  onClose: () => void;
  onMainMenu: () => void;
}

/**
 * Format a resource cost record as a human-readable string.
 * e.g. { timber: 100, sap: 50 } -> "100 Timber, 50 Sap"
 */
function formatCost(cost: Record<string, number>): string {
  return Object.entries(cost)
    .filter(([, amount]) => amount > 0)
    .map(
      ([resource, amount]) =>
        `${amount} ${resource.charAt(0).toUpperCase() + resource.slice(1)}`,
    )
    .join(", ");
}

export const PauseMenu = ({ open, onClose, onMainMenu }: PauseMenuProps) => {
  const {
    coins,
    xp,
    level,
    treesPlanted,
    treesMatured,
    unlockedSpecies,
    unlockedTools,
    gridSize,
    prestigeCount,
    resources,
    achievements,
    activeBorderCosmetic,
    difficulty,
    expandGrid,
    performPrestige,
    setActiveBorderCosmetic,
  } = useGameStore();

  const [confirmingPrestige, setConfirmingPrestige] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const diffTier = getDifficultyById(difficulty);

  // Grid expansion
  const nextTier = getNextExpansionTier(gridSize);
  const canExpand = nextTier
    ? canAffordExpansion(nextTier, resources, level)
    : false;

  // Prestige
  const isPrestigeEligible = canPrestige(level);
  const unlockedCosmetics = getUnlockedCosmetics(prestigeCount);

  const handleExpandGrid = () => {
    expandGrid();
  };

  const handlePrestige = () => {
    if (!confirmingPrestige) {
      setConfirmingPrestige(true);
      return;
    }
    performPrestige();
    setConfirmingPrestige(false);
  };

  const handleCancelPrestige = () => {
    setConfirmingPrestige(false);
  };

  // Reset confirmation state when dialog closes
  const handleOpenChange = (o: boolean) => {
    if (!o) {
      setConfirmingPrestige(false);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-sm max-h-[85vh] overflow-y-auto"
        style={{ background: COLORS.skyMist }}
      >
        <DialogHeader>
          <DialogTitle
            className="flex items-center gap-3"
            style={{ color: COLORS.soilDark }}
          >
            <FarmerMascot size={40} animate={false} />
            Grove Stats
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Stats card */}
          <Card className="p-4" style={{ background: "white" }}>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Level</p>
                <p
                  className="text-xl font-bold"
                  style={{ color: COLORS.forestGreen }}
                >
                  {level}
                </p>
              </div>
              <div>
                <p className="text-gray-500">XP</p>
                <p
                  className="text-xl font-bold"
                  style={{ color: COLORS.forestGreen }}
                >
                  {xp}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Coins</p>
                <p
                  className="text-xl font-bold"
                  style={{ color: COLORS.autumnGold }}
                >
                  {coins}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Trees Planted</p>
                <p
                  className="text-xl font-bold"
                  style={{ color: COLORS.leafLight }}
                >
                  {treesPlanted}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Trees Matured</p>
                <p
                  className="text-xl font-bold"
                  style={{ color: COLORS.leafLight }}
                >
                  {treesMatured}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Grid Size</p>
                <p
                  className="text-xl font-bold"
                  style={{ color: COLORS.forestGreen }}
                >
                  {gridSize}x{gridSize}
                </p>
              </div>
            </div>
          </Card>

          <div className="text-sm text-gray-600">
            <p>Species unlocked: {unlockedSpecies.length}/8</p>
            <p>Tools unlocked: {unlockedTools.length}/8</p>
            {prestigeCount > 0 && (
              <p style={{ color: COLORS.autumnGold }}>
                Prestige: {prestigeCount}
              </p>
            )}
            {diffTier && (
              <p className="flex items-center gap-1.5 mt-1">
                <span
                  className="inline-block px-2 py-0.5 rounded-full text-xs font-bold text-white"
                  style={{ background: diffTier.color }}
                >
                  {diffTier.name}
                </span>
                <span className="text-xs text-gray-400">difficulty (locked)</span>
              </p>
            )}
          </div>

          <Separator />

          {/* Achievements section */}
          <Card className="p-3" style={{ background: "white" }}>
            <h4
              className="text-sm font-bold mb-2 flex items-center justify-between"
              style={{ color: COLORS.soilDark }}
            >
              <span>Achievements</span>
              <span
                className="text-xs font-normal"
                style={{ color: COLORS.autumnGold }}
              >
                {achievements.length}/{ACHIEVEMENT_DEFS.length} Unlocked
              </span>
            </h4>

            <div className="max-h-48 overflow-y-auto space-y-2">
              {ACHIEVEMENT_DEFS.map((achievement) => {
                const isUnlocked = achievements.includes(achievement.id);

                return (
                  <div
                    key={achievement.id}
                    className="flex items-start gap-2 p-2 rounded"
                    style={{
                      background: isUnlocked
                        ? "rgba(255, 215, 0, 0.1)"
                        : "rgba(0, 0, 0, 0.05)",
                      border: `1px solid ${isUnlocked ? "#FFD700" : "#E0E0E0"}`,
                    }}
                  >
                    <div
                      className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full"
                      style={{
                        background: isUnlocked ? "#FFD700" : "#9E9E9E",
                        color: "white",
                        fontSize: 12,
                      }}
                    >
                      {isUnlocked ? "\u2713" : "\u{1F512}"}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p
                        className="text-xs font-semibold"
                        style={{
                          color: isUnlocked ? COLORS.soilDark : "#9E9E9E",
                        }}
                      >
                        {achievement.name}
                      </p>
                      {isUnlocked ? (
                        <p className="text-[10px] text-gray-600 mt-0.5">
                          {achievement.description}
                        </p>
                      ) : (
                        <p className="text-[10px] text-gray-400 mt-0.5">???</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Grid Expansion section */}
          <Card className="p-3" style={{ background: "white" }}>
            <h4
              className="text-sm font-bold mb-2"
              style={{ color: COLORS.soilDark }}
            >
              Grid Expansion
            </h4>
            <p className="text-xs text-gray-500 mb-2">
              Current: {gridSize}x{gridSize}
            </p>
            {nextTier ? (
              <>
                <p className="text-xs text-gray-600 mb-1">
                  Next: {nextTier.size}x{nextTier.size} (Lv.
                  {nextTier.requiredLevel})
                </p>
                <p className="text-xs text-gray-500 mb-2">
                  Cost: {formatCost(nextTier.cost)}
                </p>
                <Button
                  size="sm"
                  className="w-full text-xs"
                  style={{
                    background: canExpand ? COLORS.forestGreen : "#9E9E9E",
                    color: "white",
                  }}
                  disabled={!canExpand}
                  onClick={handleExpandGrid}
                >
                  Expand to {nextTier.size}x{nextTier.size}
                </Button>
                {!canExpand && level < nextTier.requiredLevel && (
                  <p
                    className="text-[10px] text-center mt-1"
                    style={{ color: COLORS.earthRed }}
                  >
                    Requires Level {nextTier.requiredLevel}
                  </p>
                )}
              </>
            ) : (
              <p className="text-xs text-gray-500 italic">
                Maximum grid size reached.
              </p>
            )}
          </Card>

          {/* Prestige cosmetics section */}
          {unlockedCosmetics.length > 0 && (
            <Card className="p-3" style={{ background: "white" }}>
              <h4
                className="text-sm font-bold mb-2"
                style={{ color: COLORS.soilDark }}
              >
                Border Cosmetics
              </h4>
              <p className="text-xs text-gray-500 mb-2">
                Customize your grove border (unlocked by prestige)
              </p>
              <div className="space-y-2">
                {/* Default option */}
                <button
                  className="w-full text-left p-2 rounded text-xs transition-colors"
                  style={{
                    background: activeBorderCosmetic === null
                      ? `${COLORS.forestGreen}20`
                      : "rgba(0,0,0,0.05)",
                    border: `1px solid ${activeBorderCosmetic === null ? COLORS.forestGreen : "#E0E0E0"}`,
                  }}
                  onClick={() => setActiveBorderCosmetic(null)}
                >
                  <div className="font-semibold" style={{ color: COLORS.soilDark }}>
                    Default Wood Frame
                  </div>
                  <div className="text-gray-500 mt-0.5">
                    Classic wooden border
                  </div>
                </button>

                {/* Unlocked cosmetics */}
                {unlockedCosmetics.map((cosmetic) => (
                  <button
                    key={cosmetic.id}
                    className="w-full text-left p-2 rounded text-xs transition-colors"
                    style={{
                      background: activeBorderCosmetic === cosmetic.id
                        ? `${COLORS.forestGreen}20`
                        : "rgba(0,0,0,0.05)",
                      border: `1px solid ${activeBorderCosmetic === cosmetic.id ? COLORS.forestGreen : "#E0E0E0"}`,
                    }}
                    onClick={() => setActiveBorderCosmetic(cosmetic.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold" style={{ color: COLORS.soilDark }}>
                        {cosmetic.name}
                      </div>
                      {activeBorderCosmetic === cosmetic.id && (
                        <span style={{ color: COLORS.forestGreen }}>✓</span>
                      )}
                    </div>
                    <div className="text-gray-500 mt-0.5">
                      {cosmetic.description}
                    </div>
                    <div
                      className="mt-1 h-4 rounded"
                      style={{
                        border: cosmetic.borderStyle,
                        borderColor: cosmetic.borderColor,
                        boxShadow: cosmetic.glowColor
                          ? `0 0 8px ${cosmetic.glowColor}`
                          : undefined,
                      }}
                    />
                  </button>
                ))}

                {/* Locked cosmetics preview */}
                {PRESTIGE_COSMETICS.filter(c => c.prestigeRequired > prestigeCount).map((cosmetic) => (
                  <div
                    key={cosmetic.id}
                    className="w-full text-left p-2 rounded text-xs opacity-60"
                    style={{
                      background: "rgba(0,0,0,0.02)",
                      border: "1px dashed #E0E0E0",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-gray-400">
                        {cosmetic.name}
                      </div>
                      <span className="text-xs" style={{ color: COLORS.autumnGold }}>
                        Prestige {cosmetic.prestigeRequired}
                      </span>
                    </div>
                    <div className="text-gray-400 mt-0.5">
                      {cosmetic.description}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Prestige section */}
          <Card className="p-3" style={{ background: "white" }}>
            <h4
              className="text-sm font-bold mb-2"
              style={{ color: COLORS.soilDark }}
            >
              Prestige
            </h4>
            {prestigeCount > 0 && (
              <div className="text-xs text-gray-600 mb-2">
                <p>Current prestige: {prestigeCount}</p>
                <p>
                  Growth speed:{" "}
                  {Math.round(
                    (calculatePrestigeBonus(prestigeCount)
                      .growthSpeedMultiplier -
                      1) *
                      100,
                  )}
                  % bonus
                </p>
              </div>
            )}

            {isPrestigeEligible ? (
              confirmingPrestige ? (
                <div className="space-y-2">
                  <p className="text-xs text-gray-700">
                    Prestige will reset your level, resources, seeds, and grove
                    to start fresh. You keep achievements, lifetime stats, and
                    gain permanent bonuses. Are you sure?
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 text-xs"
                      style={{
                        background: COLORS.autumnGold,
                        color: "white",
                      }}
                      onClick={handlePrestige}
                    >
                      Confirm Prestige
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs"
                      onClick={handleCancelPrestige}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  size="sm"
                  className="w-full text-xs"
                  style={{
                    background: COLORS.autumnGold,
                    color: "white",
                  }}
                  onClick={handlePrestige}
                >
                  Prestige (Reset for Bonuses)
                </Button>
              )
            ) : (
              <p className="text-xs text-gray-500">
                Reach Level {PRESTIGE_MIN_LEVEL} to unlock Prestige.
                {level > 0 && (
                  <span
                    className="block mt-0.5"
                    style={{ color: COLORS.earthRed }}
                  >
                    Current: Lv.{level} / {PRESTIGE_MIN_LEVEL}
                  </span>
                )}
              </p>
            )}
          </Card>

          <Separator />

          {/* Save management */}
          {isDbInitialized() && (
            <Card className="p-3" style={{ background: "white" }}>
              <h4
                className="text-sm font-bold mb-2"
                style={{ color: COLORS.soilDark }}
              >
                Save Management
              </h4>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs"
                  style={{ borderColor: COLORS.barkBrown, color: COLORS.soilDark }}
                  onClick={() => {
                    exportSaveFile();
                    showToast("Save exported!", "success");
                  }}
                >
                  Export Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs"
                  style={{ borderColor: COLORS.barkBrown, color: COLORS.soilDark }}
                  onClick={() => importRef.current?.click()}
                >
                  Import Save
                </Button>
                <input
                  ref={importRef}
                  type="file"
                  accept=".sqlite,.db"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      await importSaveFile(file);
                    } catch {
                      showToast("Invalid save file", "warning");
                    }
                  }}
                />
              </div>
            </Card>
          )}

          <Separator />

          <div className="flex flex-col gap-2">
            <Button
              className="w-full"
              variant="outline"
              style={{
                borderColor: COLORS.barkBrown,
                color: COLORS.soilDark,
              }}
              onClick={() => setStatsOpen(true)}
            >
              Stats
            </Button>
            <Button
              className="w-full"
              style={{ background: COLORS.forestGreen, color: "white" }}
              onClick={onClose}
            >
              Continue Playing
            </Button>
            <Button
              variant="outline"
              className="w-full"
              style={{
                borderColor: COLORS.earthRed,
                color: COLORS.earthRed,
              }}
              onClick={onMainMenu}
            >
              Return to Menu
            </Button>
          </div>
        </div>

        <StatsDashboard open={statsOpen} onClose={() => setStatsOpen(false)} />
      </DialogContent>
    </Dialog>
  );
};
