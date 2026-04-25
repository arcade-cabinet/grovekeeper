import { createSignal, For, Show } from "solid-js";
import { actions as gameActions } from "@/actions";
import { COLORS } from "@/config/config";
import { getDifficultyById } from "@/config/difficulty";
import { TOOLS } from "@/config/tools";
import { TREE_SPECIES } from "@/config/trees";
import { isDbInitialized } from "@/db/client";
import { exportSaveFile, importSaveFile } from "@/db/export";
import { useTrait } from "@/ecs/solid";
import { koota } from "@/koota";
import { ACHIEVEMENT_DEFS } from "@/systems/achievements";
import {
  canAffordExpansion,
  getNextExpansionTier,
} from "@/systems/gridExpansion";
import {
  calculatePrestigeBonus,
  canPrestige,
  getUnlockedCosmetics,
  PRESTIGE_COSMETICS,
  PRESTIGE_MIN_LEVEL,
} from "@/systems/prestige";
import {
  Achievements,
  Difficulty,
  Grid,
  PlayerProgress,
  Resources,
  Settings,
  Tracking,
} from "@/traits";
import { Button } from "@/ui/primitives/button";
import { Card } from "@/ui/primitives/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/ui/primitives/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/primitives/tabs";
import { RulesModal } from "./RulesModal";

// FarmerMascot deleted; journey wave replaces this UI.
const FarmerMascot = (_: { size?: number; animate?: boolean }) => null;
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

export const PauseMenu = (props: PauseMenuProps) => {
  const progress = useTrait(koota, PlayerProgress);
  const resourcesTrait = useTrait(koota, Resources);
  const achievementsTrait = useTrait(koota, Achievements);
  const gridTrait = useTrait(koota, Grid);
  const settings = useTrait(koota, Settings);
  const difficultyTrait = useTrait(koota, Difficulty);
  const tracking = useTrait(koota, Tracking);

  const resources = () =>
    resourcesTrait() ?? { timber: 0, sap: 0, fruit: 0, acorns: 0 };
  const achievements = (): string[] => achievementsTrait()?.items ?? [];
  const gridSize = () => gridTrait()?.gridSize ?? 12;
  const difficulty = () => difficultyTrait()?.id ?? "normal";
  const coins = () => progress()?.coins ?? 0;
  const xp = () => progress()?.xp ?? 0;
  const level = () => progress()?.level ?? 1;
  const unlockedSpecies = () => progress()?.unlockedSpecies ?? ["white-oak"];
  const unlockedTools = () =>
    progress()?.unlockedTools ?? ["trowel", "watering-can"];
  const prestigeCount = () => progress()?.prestigeCount ?? 0;
  const activeBorderCosmetic = () => progress()?.activeBorderCosmetic ?? null;
  const soundEnabled = () => settings()?.soundEnabled ?? true;
  const treesPlanted = () => tracking()?.treesPlanted ?? 0;
  const treesMatured = () => tracking()?.treesMatured ?? 0;

  const [confirmingPrestige, setConfirmingPrestige] = createSignal(false);
  const [statsOpen, setStatsOpen] = createSignal(false);
  const [rulesOpen, setRulesOpen] = createSignal(false);
  let importRef: HTMLInputElement | undefined;

  const diffTier = () => getDifficultyById(difficulty());

  const expandGrid = () => gameActions().expandGrid();
  const performPrestige = () => gameActions().performPrestige();
  const setActiveBorderCosmetic = (id: string | null) =>
    gameActions().setActiveBorderCosmetic(id);
  const setSoundEnabled = (v: boolean) => gameActions().setSoundEnabled(v);

  // Grid expansion
  const nextTier = () => getNextExpansionTier(gridSize());
  const canExpand = () => {
    const tier = nextTier();
    return tier ? canAffordExpansion(tier, resources(), level()) : false;
  };

  // Prestige
  const isPrestigeEligible = () => canPrestige(level());
  const unlockedCosmetics = () => getUnlockedCosmetics(prestigeCount());
  const lockedCosmetics = () =>
    PRESTIGE_COSMETICS.filter((c) => c.prestigeRequired > prestigeCount());

  const handleExpandGrid = () => {
    expandGrid();
  };

  const handlePrestige = () => {
    if (!confirmingPrestige()) {
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
      props.onClose();
    }
  };

  return (
    <Dialog open={props.open} onOpenChange={handleOpenChange}>
      <DialogContent
        class="max-w-sm max-h-[85vh] overflow-y-auto"
        style={{
          background: COLORS.skyMist,
          border: `3px solid ${COLORS.barkBrown}`,
          "border-radius": "16px",
          "box-shadow": "0 8px 32px rgba(0,0,0,0.15)",
        }}
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle
            class="flex items-center gap-3"
            style={{ color: COLORS.soilDark }}
          >
            <span aria-hidden="true"><FarmerMascot size={40} animate={false} /></span>
            Grove Stats
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="stats" class="mt-2">
          <TabsList
            class="w-full"
            style={{
              background: `${COLORS.parchment}`,
              border: `1px solid ${COLORS.barkBrown}30`,
            }}
          >
            <TabsTrigger value="stats" class="flex-1 text-xs min-h-[36px]">
              Stats
            </TabsTrigger>
            <TabsTrigger value="progress" class="flex-1 text-xs min-h-[36px]">
              Progress
            </TabsTrigger>
            <TabsTrigger value="settings" class="flex-1 text-xs min-h-[36px]">
              Settings
            </TabsTrigger>
          </TabsList>

          {/* ── Stats tab ── */}
          <TabsContent value="stats" class="space-y-3 mt-2">
            <Card class="p-4" style={{ background: "white" }}>
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p class="text-gray-500">Level</p>
                  <p
                    class="text-xl font-bold"
                    style={{ color: COLORS.forestGreen }}
                  >
                    {level()}
                  </p>
                </div>
                <div>
                  <p class="text-gray-500">XP</p>
                  <p
                    class="text-xl font-bold"
                    style={{ color: COLORS.forestGreen }}
                  >
                    {xp()}
                  </p>
                </div>
                <div>
                  <p class="text-gray-500">Coins</p>
                  <p
                    class="text-xl font-bold"
                    style={{ color: COLORS.autumnGold }}
                  >
                    {coins()}
                  </p>
                </div>
                <div>
                  <p class="text-gray-500">Trees Planted</p>
                  <p
                    class="text-xl font-bold"
                    style={{ color: COLORS.leafLight }}
                  >
                    {treesPlanted()}
                  </p>
                </div>
                <div>
                  <p class="text-gray-500">Trees Matured</p>
                  <p
                    class="text-xl font-bold"
                    style={{ color: COLORS.leafLight }}
                  >
                    {treesMatured()}
                  </p>
                </div>
                <div>
                  <p class="text-gray-500">Grid Size</p>
                  <p
                    class="text-xl font-bold"
                    style={{ color: COLORS.forestGreen }}
                  >
                    {gridSize()}x{gridSize()}
                  </p>
                </div>
              </div>
            </Card>

            <div class="text-sm text-gray-600">
              <p>
                Species unlocked: {unlockedSpecies().length}/
                {TREE_SPECIES.length}
              </p>
              <p>
                Tools unlocked: {unlockedTools().length}/{TOOLS.length}
              </p>
              <Show when={prestigeCount() > 0}>
                <p style={{ color: COLORS.autumnGold }}>
                  Prestige: {prestigeCount()}
                </p>
              </Show>
              <Show when={diffTier()}>
                {(tier) => (
                  <p class="flex items-center gap-1.5 mt-1">
                    <span
                      class="inline-block px-2 py-0.5 rounded-full text-xs font-bold text-white"
                      style={{ background: tier().color }}
                    >
                      {tier().name}
                    </span>
                    <span class="text-xs text-gray-400">
                      difficulty (locked)
                    </span>
                  </p>
                )}
              </Show>
            </div>

            <Button
              class="w-full"
              variant="outline"
              size="sm"
              style={{
                "border-color": COLORS.barkBrown,
                color: COLORS.soilDark,
              }}
              onClick={() => setStatsOpen(true)}
            >
              Full Stats Dashboard
            </Button>
          </TabsContent>

          {/* ── Progress tab (Achievements, Grid, Prestige) ── */}
          <TabsContent value="progress" class="space-y-3 mt-2">
            {/* Achievements */}
            <Card class="p-3" style={{ background: "white" }}>
              <h4
                class="text-sm font-bold mb-2 flex items-center justify-between"
                style={{ color: COLORS.soilDark }}
              >
                <span>Achievements</span>
                <span
                  class="text-xs font-normal"
                  style={{ color: COLORS.autumnGold }}
                >
                  {achievements().length}/{ACHIEVEMENT_DEFS.length}
                </span>
              </h4>
              <div class="max-h-48 overflow-y-auto space-y-2">
                <For each={ACHIEVEMENT_DEFS}>
                  {(achievement) => {
                    const isUnlocked = () =>
                      achievements().includes(achievement.id);
                    return (
                      <div
                        class="flex items-start gap-2 p-2 rounded"
                        style={{
                          background: isUnlocked()
                            ? `${COLORS.gold}1a`
                            : "rgba(0, 0, 0, 0.05)",
                          border: `1px solid ${isUnlocked() ? COLORS.gold : "#E0E0E0"}`,
                        }}
                      >
                        <div
                          class="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full"
                          style={{
                            background: isUnlocked()
                              ? COLORS.gold
                              : COLORS.silver,
                            color: "white",
                            "font-size": "12px",
                          }}
                        >
                          {isUnlocked() ? "\u2713" : "\u{1F512}"}
                        </div>
                        <div class="flex-1 min-w-0">
                          <p
                            class="text-xs font-semibold"
                            style={{
                              color: isUnlocked()
                                ? COLORS.soilDark
                                : COLORS.silver,
                            }}
                          >
                            {achievement.name}
                          </p>
                          <Show
                            when={isUnlocked()}
                            fallback={
                              <p class="text-[10px] text-gray-400 mt-0.5">
                                ???
                              </p>
                            }
                          >
                            <p class="text-[10px] text-gray-600 mt-0.5">
                              {achievement.description}
                            </p>
                          </Show>
                        </div>
                      </div>
                    );
                  }}
                </For>
              </div>
            </Card>

            {/* Grid Expansion */}
            <Card class="p-3" style={{ background: "white" }}>
              <h4
                class="text-sm font-bold mb-2"
                style={{ color: COLORS.soilDark }}
              >
                Grid Expansion
              </h4>
              <p class="text-xs text-gray-500 mb-2">
                Current: {gridSize()}x{gridSize()}
              </p>
              <Show
                when={nextTier()}
                fallback={
                  <p class="text-xs text-gray-500 italic">
                    Maximum grid size reached.
                  </p>
                }
              >
                {(tier) => (
                  <>
                    <p class="text-xs text-gray-600 mb-1">
                      Next: {tier().size}x{tier().size} (Lv.
                      {tier().requiredLevel})
                    </p>
                    <p class="text-xs text-gray-500 mb-2">
                      Cost: {formatCost(tier().cost)}
                    </p>
                    <Button
                      size="sm"
                      class="w-full text-xs"
                      style={{
                        background: canExpand()
                          ? COLORS.forestGreen
                          : COLORS.silver,
                        color: "white",
                      }}
                      disabled={!canExpand()}
                      onClick={handleExpandGrid}
                    >
                      Expand to {tier().size}x{tier().size}
                    </Button>
                    <Show when={!canExpand() && level() < tier().requiredLevel}>
                      <p
                        class="text-[10px] text-center mt-1"
                        style={{ color: COLORS.earthRed }}
                      >
                        Requires Level {tier().requiredLevel}
                      </p>
                    </Show>
                  </>
                )}
              </Show>
            </Card>

            {/* Prestige cosmetics */}
            <Show when={unlockedCosmetics().length > 0}>
              <Card class="p-3" style={{ background: "white" }}>
                <h4
                  class="text-sm font-bold mb-2"
                  style={{ color: COLORS.soilDark }}
                >
                  Border Cosmetics
                </h4>
                <p class="text-xs text-gray-500 mb-2">
                  Customize your grove border (unlocked by prestige)
                </p>
                <div class="space-y-2">
                  <button
                    type="button"
                    class="w-full text-left p-2 rounded text-xs transition-colors"
                    style={{
                      background:
                        activeBorderCosmetic() === null
                          ? `${COLORS.forestGreen}20`
                          : "rgba(0,0,0,0.05)",
                      border: `1px solid ${activeBorderCosmetic() === null ? COLORS.forestGreen : "#E0E0E0"}`,
                    }}
                    onClick={() => setActiveBorderCosmetic(null)}
                  >
                    <div
                      class="font-semibold"
                      style={{ color: COLORS.soilDark }}
                    >
                      Default Wood Frame
                    </div>
                    <div class="text-gray-500 mt-0.5">
                      Classic wooden border
                    </div>
                  </button>
                  <For each={unlockedCosmetics()}>
                    {(cosmetic) => (
                      <button
                        type="button"
                        class="w-full text-left p-2 rounded text-xs transition-colors"
                        style={{
                          background:
                            activeBorderCosmetic() === cosmetic.id
                              ? `${COLORS.forestGreen}20`
                              : "rgba(0,0,0,0.05)",
                          border: `1px solid ${activeBorderCosmetic() === cosmetic.id ? COLORS.forestGreen : "#E0E0E0"}`,
                        }}
                        onClick={() => setActiveBorderCosmetic(cosmetic.id)}
                      >
                        <div class="flex items-center justify-between">
                          <div
                            class="font-semibold"
                            style={{ color: COLORS.soilDark }}
                          >
                            {cosmetic.name}
                          </div>
                          <Show when={activeBorderCosmetic() === cosmetic.id}>
                            <span style={{ color: COLORS.forestGreen }}>
                              {"\u2713"}
                            </span>
                          </Show>
                        </div>
                        <div class="text-gray-500 mt-0.5">
                          {cosmetic.description}
                        </div>
                        <div
                          class="mt-1 h-4 rounded"
                          style={{
                            border: cosmetic.borderStyle,
                            "border-color": cosmetic.borderColor,
                            "box-shadow": cosmetic.glowColor
                              ? `0 0 8px ${cosmetic.glowColor}`
                              : undefined,
                          }}
                        />
                      </button>
                    )}
                  </For>
                  <For each={lockedCosmetics()}>
                    {(cosmetic) => (
                      <div
                        class="w-full text-left p-2 rounded text-xs opacity-60"
                        style={{
                          background: "rgba(0,0,0,0.02)",
                          border: "1px dashed #E0E0E0",
                        }}
                      >
                        <div class="flex items-center justify-between">
                          <div class="font-semibold text-gray-400">
                            {cosmetic.name}
                          </div>
                          <span
                            class="text-xs"
                            style={{ color: COLORS.autumnGold }}
                          >
                            Prestige {cosmetic.prestigeRequired}
                          </span>
                        </div>
                        <div class="text-gray-400 mt-0.5">
                          {cosmetic.description}
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </Card>
            </Show>

            {/* Prestige */}
            <Card class="p-3" style={{ background: "white" }}>
              <h4
                class="text-sm font-bold mb-2"
                style={{ color: COLORS.soilDark }}
              >
                Prestige
              </h4>
              <Show when={prestigeCount() > 0}>
                <div class="text-xs text-gray-600 mb-2">
                  <p>Current prestige: {prestigeCount()}</p>
                  <p>
                    Growth speed:{" "}
                    {Math.round(
                      (calculatePrestigeBonus(prestigeCount())
                        .growthSpeedMultiplier -
                        1) *
                        100,
                    )}
                    % bonus
                  </p>
                </div>
              </Show>
              <Show
                when={isPrestigeEligible()}
                fallback={
                  <p class="text-xs text-gray-500">
                    Reach Level {PRESTIGE_MIN_LEVEL} to unlock Prestige.
                    <Show when={level() > 0}>
                      <span
                        class="block mt-0.5"
                        style={{ color: COLORS.earthRed }}
                      >
                        Current: Lv.{level()} / {PRESTIGE_MIN_LEVEL}
                      </span>
                    </Show>
                  </p>
                }
              >
                <Show
                  when={confirmingPrestige()}
                  fallback={
                    <Button
                      size="sm"
                      class="w-full text-xs"
                      style={{
                        background: COLORS.autumnGold,
                        color: "white",
                      }}
                      onClick={handlePrestige}
                    >
                      Prestige (Reset for Bonuses)
                    </Button>
                  }
                >
                  <div class="space-y-2">
                    <p class="text-xs text-gray-700">
                      Prestige will reset your level, resources, seeds, and
                      grove to start fresh. You keep achievements, lifetime
                      stats, and gain permanent bonuses. Are you sure?
                    </p>
                    <div class="flex gap-2">
                      <Button
                        size="sm"
                        class="flex-1 text-xs"
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
                        class="flex-1 text-xs"
                        onClick={handleCancelPrestige}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </Show>
              </Show>
            </Card>
          </TabsContent>

          {/* ── Settings tab ── */}
          <TabsContent value="settings" class="space-y-3 mt-2">
            {/* Sound */}
            <Card class="p-3" style={{ background: "white" }}>
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-700">Sound Effects</span>
                <button
                  type="button"
                  class="w-14 h-8 rounded-full relative p-2 min-h-[44px] min-w-[44px] motion-safe:transition-colors"
                  style={{
                    background: soundEnabled()
                      ? COLORS.forestGreen
                      : "#D1D5DB",
                  }}
                  onClick={() => setSoundEnabled(!soundEnabled())}
                  role="switch"
                  aria-checked={soundEnabled()}
                  aria-label="Toggle sound"
                >
                  <span
                    class="absolute top-1 w-6 h-6 bg-white rounded-full shadow motion-safe:transition-transform"
                    style={{
                      left: soundEnabled()
                        ? "calc(100% - 1.75rem)"
                        : "0.25rem",
                    }}
                  />
                </button>
              </div>
            </Card>

            {/* Save management */}
            <Show when={isDbInitialized()}>
              <Card class="p-3" style={{ background: "white" }}>
                <h4
                  class="text-sm font-bold mb-2"
                  style={{ color: COLORS.soilDark }}
                >
                  Save Management
                </h4>
                <div class="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    class="flex-1 text-xs min-h-[44px]"
                    style={{
                      "border-color": COLORS.barkBrown,
                      color: COLORS.soilDark,
                    }}
                    onClick={() => {
                      try {
                        exportSaveFile();
                        showToast("Save exported!", "success");
                      } catch (err) {
                        console.error("Export failed:", err);
                        showToast("Export failed", "warning");
                      }
                    }}
                  >
                    Export Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    class="flex-1 text-xs min-h-[44px]"
                    style={{
                      "border-color": COLORS.barkBrown,
                      color: COLORS.soilDark,
                    }}
                    onClick={() => importRef?.click()}
                  >
                    Import Save
                  </Button>
                  <input
                    ref={importRef}
                    type="file"
                    accept=".sqlite,.db"
                    class="hidden"
                    onChange={async (e) => {
                      const file = e.currentTarget.files?.[0];
                      if (!file) return;
                      try {
                        await importSaveFile(file);
                      } catch {
                        showToast("Invalid save file", "warning");
                      } finally {
                        e.currentTarget.value = "";
                      }
                    }}
                  />
                </div>
              </Card>
            </Show>

            {/* How to Play */}
            <Button
              class="w-full"
              variant="outline"
              style={{
                "border-color": COLORS.forestGreen,
                color: COLORS.forestGreen,
              }}
              onClick={() => setRulesOpen(true)}
            >
              How to Play
            </Button>
          </TabsContent>
        </Tabs>

        {/* Action buttons (always visible below tabs) */}
        <div class="flex flex-col gap-2 mt-2">
          <Button
            class="w-full"
            style={{ background: COLORS.forestGreen, color: "white" }}
            onClick={props.onClose}
          >
            Continue Playing
          </Button>
          <Button
            variant="outline"
            class="w-full"
            style={{
              "border-color": COLORS.earthRed,
              color: COLORS.earthRed,
            }}
            onClick={props.onMainMenu}
          >
            Return to Menu
          </Button>
        </div>

        <StatsDashboard
          open={statsOpen()}
          onClose={() => setStatsOpen(false)}
        />
        <RulesModal
          open={rulesOpen()}
          onClose={() => setRulesOpen(false)}
          onStart={() => setRulesOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
};
