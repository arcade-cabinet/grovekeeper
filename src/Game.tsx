import {
  createEffect,
  createSignal,
  lazy,
  onMount,
  Show,
  Suspense,
} from "solid-js";
import { actions as gameActions } from "@/actions";
import { COLORS } from "@/config/config";
import { getDifficultyById } from "@/config/difficulty";
import { getDb, isDbInitialized } from "@/db/client";
import { initDatabase } from "@/db/init";
import { saveDatabaseToIndexedDB } from "@/db/persist";
import { hydrateGameStore, setupNewGame } from "@/db/queries";
import { useTrait } from "@/ecs/solid";
import { koota } from "@/koota";
import { eventBus } from "@/runtime/eventBus";
import { initializePlatform } from "@/systems/platform";
import { generateDailyQuests } from "@/systems/quests";
import { CurrentSeason, GameScreen, PlayerProgress, Quests } from "@/traits";
import { CraftingPanel } from "@/ui/game/CraftingPanel";
import { GameErrorBoundary } from "@/ui/game/ErrorBoundary";
import { MainMenu } from "@/ui/game/MainMenu";
import { NewGameModal } from "@/ui/game/NewGameModal";
import { NpcSpeechBubble } from "@/ui/game/NpcSpeechBubble";
import { RetreatOverlay } from "@/ui/game/RetreatOverlay";

const GameScene = lazy(() =>
  import("@/game/scene/GameScene")
    .then((m) => ({ default: m.GameScene }))
    .catch(() => {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          for (const r of regs) r.unregister();
        });
        caches.keys().then((names) => {
          for (const n of names) caches.delete(n);
        });
      }
      return import("@/game/scene/GameScene").then((m) => ({
        default: m.GameScene,
      }));
    }),
);

export const Game = () => {
  const screen = useTrait(koota, GameScreen);
  const currentSeason = useTrait(koota, CurrentSeason);
  const progress = useTrait(koota, PlayerProgress);
  const quests = useTrait(koota, Quests);

  const [dbLoading, setDbLoading] = createSignal(true);
  const [showNewGame, setShowNewGame] = createSignal(false);

  // Initialize platform
  onMount(() => {
    initializePlatform();
  });

  // Initialize database
  onMount(() => {
    let cancelled = false;
    initDatabase()
      .then((result) => {
        if (cancelled) return;
        if (!result.isNewGame) {
          const state = hydrateGameStore();
          gameActions().hydrateFromDb(state);
        }
        // Used by e2e playthrough determinism. Safe to leave in production —
        // user-invisible. If grove-seed-override is set (by e2e tests or dev
        // tooling), override the world seed so RNG is reproducible.
        const seedOverride =
          typeof localStorage !== "undefined"
            ? localStorage.getItem("grove-seed-override")
            : null;
        if (seedOverride) {
          gameActions().setWorldSeed(seedOverride);
        }
        setDbLoading(false);
      })
      .catch((err) => {
        console.error("Database init failed:", err);
        if (!cancelled) setDbLoading(false);
      });
    return () => {
      cancelled = true;
    };
  });

  // Generate daily quests if needed
  createEffect(() => {
    if (dbLoading()) return;
    const season = currentSeason()?.value ?? "spring";
    const level = progress()?.level ?? 1;
    const activeQuests = quests()?.activeQuests ?? [];
    const completedGoalIds = quests()?.completedGoalIds ?? [];
    const lastQuestRefresh = quests()?.lastQuestRefresh ?? 0;
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    if (activeQuests.length === 0 || now - lastQuestRefresh > oneDayMs) {
      const completedSet = new Set<string>(completedGoalIds as string[]);
      const newQuests = generateDailyQuests(season, level, completedSet);
      gameActions().setActiveQuests(newQuests);
      gameActions().setLastQuestRefresh(now);
    }
  });

  const handleStartGame = () => {
    gameActions().setScreen("playing");
  };

  const handleNewGame = () => {
    setShowNewGame(true);
  };

  const handleDifficultySelected = async (
    difficulty: string,
    permadeath: boolean,
  ) => {
    const tier = getDifficultyById(difficulty);
    if (!tier) return;

    try {
      const actions = gameActions();
      actions.resetGame();

      setupNewGame(
        difficulty,
        permadeath,
        tier.startingResources,
        tier.startingSeeds,
      );

      const state = hydrateGameStore();
      actions.hydrateFromDb(state);

      if (isDbInitialized()) {
        const { sqlDb } = getDb();
        const data = sqlDb.export();
        await saveDatabaseToIndexedDB(data);
      }

      setShowNewGame(false);
      actions.setScreen("playing");
    } catch (error) {
      console.error("Failed to create new game:", error);
      setShowNewGame(false);
    }
  };

  return (
    <Show
      when={!dbLoading()}
      fallback={
        <div
          class="w-full h-full flex flex-col items-center justify-center gap-3"
          style={{
            background: `linear-gradient(180deg, ${COLORS.skyMist} 0%, ${COLORS.leafLight}40 100%)`,
          }}
        >
          <div
            class="w-8 h-8 border-3 border-t-transparent rounded-full motion-safe:animate-spin motion-reduce:animate-pulse"
            style={{
              "border-color": `${COLORS.forestGreen} transparent ${COLORS.forestGreen} ${COLORS.forestGreen}`,
            }}
          />
          <p class="text-sm" style={{ color: COLORS.barkBrown }}>
            Loading grove...
          </p>
        </div>
      }
    >
      <div class="w-full h-full">
        <Show
          when={(screen()?.value ?? "menu") === "playing"}
          fallback={
            <MainMenu onStartGame={handleStartGame} onNewGame={handleNewGame} />
          }
        >
          <GameErrorBoundary onReset={() => gameActions().setScreen("menu")}>
            <Suspense
              fallback={
                <div class="w-full h-full flex items-center justify-center bg-green-900 text-white">
                  Loading grove...
                </div>
              }
            >
              <GameScene />
            </Suspense>
          </GameErrorBoundary>

          {/* UI Glue overlays — driven by the runtime via `eventBus`.
              Only mounted while the player is on the playing screen so
              menus/pause don't accidentally consume engine events. */}
          <Show when={eventBus.npcSpeech()}>
            {(ev) => (
              <NpcSpeechBubble
                phrase={ev().phrase}
                screenX={ev().screenPosition.x}
                screenY={ev().screenPosition.y}
                holdSeconds={ev().ttlMs / 1000}
                onDismiss={() => eventBus.emitNpcSpeech(null)}
              />
            )}
          </Show>
          <Show
            when={
              eventBus.craftingPanel()?.open ? eventBus.craftingPanel() : null
            }
          >
            {(ev) => (
              <CraftingPanel
                open={true}
                stationId={ev().stationId}
                worldId="rc-world-default"
                onClose={() =>
                  eventBus.emitCraftingPanel({
                    stationId: ev().stationId,
                    open: false,
                  })
                }
              />
            )}
          </Show>
        </Show>

        {/* Wave 14/15: retreat fade overlay — always mounted, opacity 0
            on idle. Sits above all gameplay UI so the fade-to-black is
            unbroken by HUD elements. */}
        <RetreatOverlay />

        <NewGameModal
          open={showNewGame()}
          onClose={() => setShowNewGame(false)}
          onStart={handleDifficultySelected}
        />
      </div>
    </Show>
  );
};
