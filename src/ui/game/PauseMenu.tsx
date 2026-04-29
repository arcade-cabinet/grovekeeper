import { createMemo, createSignal, For, Show } from "solid-js";
import { actions as gameActions } from "@/actions";
import { COLORS } from "@/config/config";
import { getDb, isDbInitialized } from "@/db/client";
import { exportSaveFile, importSaveFile } from "@/db/export";
import { grovesRepo, inventoryRepo } from "@/db/repos";
import { useTrait } from "@/ecs/solid";
import { koota } from "@/koota";
import { eventBus } from "@/runtime/eventBus";
import { ACHIEVEMENT_DEFS } from "@/systems/achievements";
import { Achievements, Settings } from "@/traits";
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

import { showToast } from "./Toast";

interface PauseMenuProps {
  open: boolean;
  onClose: () => void;
  onMainMenu: () => void;
}

export const PauseMenu = (props: PauseMenuProps) => {
  const achievementsTrait = useTrait(koota, Achievements);
  const settings = useTrait(koota, Settings);
  const achievements = (): string[] => achievementsTrait()?.items ?? [];

  const RC_WORLD_ID = "rc-world-default";
  const rcInventory = createMemo(() => {
    eventBus.inventoryVersion();
    if (!isDbInitialized()) return [];
    try {
      return inventoryRepo
        .listItems(getDb().db, RC_WORLD_ID)
        .filter((r) => r.count > 0);
    } catch {
      return [];
    }
  });
  const rcGroves = createMemo(() => {
    eventBus.inventoryVersion();
    if (!isDbInitialized()) return { discovered: 0, claimed: 0 };
    try {
      const all = grovesRepo.listGrovesByWorld(getDb().db, RC_WORLD_ID);
      return {
        discovered: all.length,
        claimed: all.filter((g) => g.state === "claimed").length,
      };
    } catch {
      return { discovered: 0, claimed: 0 };
    }
  });
  const soundEnabled = () => settings()?.soundEnabled ?? true;

  const [rulesOpen, setRulesOpen] = createSignal(false);
  let importRef: HTMLInputElement | undefined;

  const setSoundEnabled = (v: boolean) => gameActions().setSoundEnabled(v);

  const handleOpenChange = (o: boolean) => {
    if (!o) props.onClose();
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
            {/* Grove progress */}
            <Card class="p-4" style={{ background: "white" }}>
              <h4
                class="text-sm font-bold mb-3"
                style={{ color: COLORS.soilDark }}
              >
                Groves
              </h4>
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p class="text-gray-500">Discovered</p>
                  <p
                    class="text-xl font-bold"
                    style={{ color: COLORS.forestGreen }}
                  >
                    {rcGroves().discovered}
                  </p>
                </div>
                <div>
                  <p class="text-gray-500">Claimed</p>
                  <p
                    class="text-xl font-bold"
                    style={{ color: COLORS.leafLight }}
                  >
                    {rcGroves().claimed}
                  </p>
                </div>
              </div>
            </Card>

            {/* Inventory */}
            <Card class="p-4" style={{ background: "white" }}>
              <h4
                class="text-sm font-bold mb-3"
                style={{ color: COLORS.soilDark }}
              >
                Inventory
              </h4>
              <Show
                when={rcInventory().length > 0}
                fallback={
                  <p class="text-xs text-gray-400 italic">
                    Nothing gathered yet.
                  </p>
                }
              >
                <div class="space-y-1">
                  <For each={rcInventory()}>
                    {(row) => (
                      <div class="flex justify-between text-sm">
                        <span class="text-gray-600">{row.itemId}</span>
                        <span
                          class="font-bold tabular-nums"
                          style={{ color: COLORS.soilDark }}
                        >
                          {row.count}
                        </span>
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </Card>
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
                    background: soundEnabled() ? COLORS.forestGreen : "#D1D5DB",
                  }}
                  onClick={() => setSoundEnabled(!soundEnabled())}
                  role="switch"
                  aria-checked={soundEnabled()}
                  aria-label="Toggle sound"
                >
                  <span
                    class="absolute top-1 w-6 h-6 bg-white rounded-full shadow motion-safe:transition-transform"
                    style={{
                      left: soundEnabled() ? "calc(100% - 1.75rem)" : "0.25rem",
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
            class="w-full motion-safe:transition-all hover:brightness-110"
            style={{
              background: `linear-gradient(180deg, ${COLORS.leafLight} 0%, ${COLORS.forestGreen} 100%)`,
              color: COLORS.parchment,
              border: `2px solid ${COLORS.soilDark}`,
              "box-shadow": `0 4px 12px ${COLORS.forestGreen}60`,
            }}
            onClick={props.onClose}
          >
            Continue Playing
          </Button>
          <Button
            variant="outline"
            class="w-full motion-safe:transition-all hover:brightness-110"
            style={{
              background: `${COLORS.parchment}e6`,
              "border-color": COLORS.earthRed,
              "border-width": "2px",
              color: COLORS.earthRed,
            }}
            onClick={props.onMainMenu}
          >
            Return to Menu
          </Button>
        </div>

        <RulesModal
          open={rulesOpen()}
          onClose={() => setRulesOpen(false)}
          onStart={() => setRulesOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
};
