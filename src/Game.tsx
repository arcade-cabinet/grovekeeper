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
import { getDb, isDbInitialized } from "@/db/client";
import { initDatabase } from "@/db/init";
import { hydrateGameStore } from "@/db/queries";
import { useTrait } from "@/ecs/solid";
import { listClaimedGroves } from "@/game/scene/fastTravel";
import { koota } from "@/koota";
import { eventBus } from "@/runtime/eventBus";
import { initializePlatform } from "@/systems/platform";
import { GameScreen } from "@/traits";
import { CraftingPanel } from "@/ui/game/CraftingPanel";
import { GameErrorBoundary } from "@/ui/game/ErrorBoundary";
import { FastTravelFade } from "@/ui/game/FastTravelFade";
import { FastTravelMenu } from "@/ui/game/FastTravelMenu";
import { HearthPrompt } from "@/ui/game/HearthPrompt";
import { InteractCuePrompt } from "@/ui/game/InteractCuePrompt";
import { InventoryHUD } from "@/ui/game/InventoryHUD";
import { LoadingGrove } from "@/ui/game/LoadingGrove";
import { MainMenu } from "@/ui/game/MainMenu";
import { NewGameScreen } from "@/ui/game/NewGameScreen";
import { NpcSpeechBubble } from "@/ui/game/NpcSpeechBubble";
import { PauseMenu } from "@/ui/game/PauseMenu";
import { RetreatOverlay } from "@/ui/game/RetreatOverlay";
import { LowStaminaOverlay, StaminaGauge } from "@/ui/game/StaminaGauge";

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

  const [dbLoading, setDbLoading] = createSignal(true);
  const [pauseMenuOpen, setPauseMenuOpen] = createSignal(false);

  onMount(() => {
    initializePlatform();
  });

  onMount(() => {
    let cancelled = false;
    initDatabase()
      .then((result) => {
        if (cancelled) return;
        if (!result.isNewGame) {
          const state = hydrateGameStore();
          gameActions().hydrateFromDb(state);
        }
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

  const currentScreen = () => screen()?.value ?? "menu";

  // Esc while playing and no other overlay is open → open pause menu.
  createEffect(() => {
    if (currentScreen() !== "playing") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (pauseMenuOpen()) return; // Dialog handles close itself
      if (eventBus.craftingPanel()?.open) return;
      if (eventBus.fastTravelOpen()) return;
      if (eventBus.retreatOpacity() > 0) return;
      setPauseMenuOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

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
        <Show when={currentScreen() === "menu"}>
          <MainMenu />
        </Show>

        <Show when={currentScreen() === "new-game"}>
          <NewGameScreen />
        </Show>

        <Show when={currentScreen() === "playing"}>
          <GameErrorBoundary onReset={() => gameActions().setScreen("menu")}>
            <Suspense fallback={<LoadingGrove />}>
              <GameScene />
            </Suspense>
          </GameErrorBoundary>

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
                onPickBlueprint={(blueprintId) => {
                  gameActions().setBuildMode(true, blueprintId);
                  eventBus.emitCraftingPanel({
                    stationId: ev().stationId,
                    open: false,
                  });
                }}
              />
            )}
          </Show>

          {/* Sub-wave D — hearth proximity prompt (above canvas, below modals). */}
          <HearthPrompt />

          {/* Contextual interact cue — "Press E to craft / place / gather". */}
          <InteractCuePrompt />

          {/* Sub-wave D — fast-travel menu, opened by interacting with a lit hearth. */}
          <FastTravelMenuConnected />

          {/* Sub-wave D — fast-travel black-fade overlay (always mounted). */}
          <FastTravelFade />

          {/* Inventory counts (top-left corner). Hidden when empty. */}
          <div
            class="fixed top-4 left-4 pointer-events-none"
            style={{ "z-index": 50 }}
          >
            <InventoryHUD />
          </div>

          {/* Wave 14/15 — stamina gauge (top-right corner) + low-stamina vignette. */}
          <div
            class="fixed top-4 right-4 pointer-events-none"
            style={{ "z-index": 50 }}
          >
            <StaminaGauge />
          </div>
          <LowStaminaOverlay />

          <PauseMenu
            open={pauseMenuOpen()}
            onClose={() => setPauseMenuOpen(false)}
            onMainMenu={() => {
              setPauseMenuOpen(false);
              gameActions().setScreen("menu");
            }}
          />
        </Show>

        <RetreatOverlay />
      </div>
    </Show>
  );
};

/**
 * Solid bridge for `<FastTravelMenu>`. Reads the live claimed-grove
 * list from the DB the moment the menu opens (so the list reflects
 * any claim that happened mid-session), and emits the chosen target
 * back to the runtime via `eventBus.emitFastTravelStart(...)`.
 */
function FastTravelMenuConnected() {
  return (
    <Show when={eventBus.fastTravelOpen()}>
      <FastTravelMenuLive />
    </Show>
  );
}

function FastTravelMenuLive() {
  const groves = (() => {
    if (!isDbInitialized()) return [];
    try {
      const handle = getDb();
      return listClaimedGroves(handle.db, "rc-world-default");
    } catch {
      return [];
    }
  })();
  return (
    <FastTravelMenu
      open={true}
      groves={groves}
      onSelect={(node) => {
        eventBus.emitFastTravelStart({
          worldX: node.worldX,
          worldZ: node.worldZ,
          groveId: node.groveId,
        });
        eventBus.emitFastTravelOpen(false);
      }}
      onClose={() => eventBus.emitFastTravelOpen(false)}
    />
  );
}
