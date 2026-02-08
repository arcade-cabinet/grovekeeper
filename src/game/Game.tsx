import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { getDb, isDbInitialized } from "@/db/client";
import { initDatabase } from "@/db/init";
import { saveDatabaseToIndexedDB } from "@/db/persist";
import { hydrateGameStore, setupNewGame } from "@/db/queries";
import { COLORS } from "./constants/config";
import { getDifficultyById } from "./constants/difficulty";
import { useGameStore } from "./stores/gameStore";
import { initializePlatform } from "./systems/platform";
import { generateDailyQuests } from "./systems/quests";
import { GameErrorBoundary } from "./ui/ErrorBoundary";
import { MainMenu } from "./ui/MainMenu";
import { NewGameModal } from "./ui/NewGameModal";
import { RulesModal } from "./ui/RulesModal";

const GameScene = lazy(() =>
  import("./scenes/GameScene").then((m) => ({ default: m.GameScene })),
);

export const Game = () => {
  const {
    screen,
    setScreen,
    hasSeenRules,
    setHasSeenRules,
    currentSeason,
    level,
    completedGoalIds,
    activeQuests,
    setActiveQuests,
    lastQuestRefresh,
    setLastQuestRefresh,
    hydrateFromDb,
  } = useGameStore();

  const [dbLoading, setDbLoading] = useState(true);
  const [showNewGame, setShowNewGame] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [, setPlatformInitialized] = useState(false);

  // Initialize platform on mount
  useEffect(() => {
    initializePlatform().then(() => {
      setPlatformInitialized(true);
    });
  }, []);

  // Initialize database on mount
  useEffect(() => {
    let cancelled = false;
    initDatabase()
      .then((result) => {
        if (cancelled) return;
        if (!result.isNewGame) {
          // Hydrate game store from SQLite
          const state = hydrateGameStore();
          hydrateFromDb(state);
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
  }, [hydrateFromDb]);

  // Generate daily quests if needed
  useEffect(() => {
    if (dbLoading) return;
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    // Refresh quests once per day or if none exist
    if (activeQuests.length === 0 || now - lastQuestRefresh > oneDayMs) {
      const completedSet = new Set(completedGoalIds);
      const newQuests = generateDailyQuests(currentSeason, level, completedSet);
      setActiveQuests(newQuests);
      setLastQuestRefresh(now);
    }
  }, [
    dbLoading,
    currentSeason,
    level,
    completedGoalIds,
    activeQuests.length,
    lastQuestRefresh,
    setActiveQuests,
    setLastQuestRefresh,
  ]);

  // Show rules when starting game for first time
  const handleStartGame = () => {
    if (!hasSeenRules) {
      setShowRules(true);
    } else {
      setScreen("playing");
    }
  };

  // Handle "New Grove" button — show difficulty selection
  const handleNewGame = () => {
    setShowNewGame(true);
  };

  // Handle difficulty selection → create new game in DB
  const handleDifficultySelected = useCallback(
    async (difficulty: string, permadeath: boolean) => {
      const tier = getDifficultyById(difficulty);
      if (!tier) return;

      try {
        // Reset Zustand to initial state first
        useGameStore.getState().resetGame();

        // Set up the new game in the database
        setupNewGame(
          difficulty,
          permadeath,
          tier.startingResources,
          tier.startingSeeds,
        );

        // Hydrate the store from the fresh database
        const state = hydrateGameStore();
        hydrateFromDb(state);

        // Persist to IndexedDB
        if (isDbInitialized()) {
          const { sqlDb } = getDb();
          const data = sqlDb.export();
          await saveDatabaseToIndexedDB(data);
        }

        setShowNewGame(false);
        // Inline handleStartGame logic to avoid stale closure over hasSeenRules
        if (!useGameStore.getState().hasSeenRules) {
          setShowRules(true);
        } else {
          setScreen("playing");
        }
      } catch (error) {
        console.error("Failed to create new game:", error);
        setShowNewGame(false);
      }
    },
    [hydrateFromDb, setScreen],
  );

  const handleRulesClose = () => {
    setShowRules(false);
  };

  const handleRulesStart = () => {
    setHasSeenRules(true);
    setShowRules(false);
    setScreen("playing");
  };

  // Loading state while database initializes
  if (dbLoading) {
    return (
      <div
        className="w-full h-full flex flex-col items-center justify-center gap-3"
        style={{
          background: `linear-gradient(180deg, ${COLORS.skyMist} 0%, ${COLORS.leafLight}40 100%)`,
        }}
      >
        <div
          className="w-8 h-8 border-3 border-t-transparent rounded-full motion-safe:animate-spin motion-reduce:animate-pulse"
          style={{
            borderColor: `${COLORS.forestGreen} transparent ${COLORS.forestGreen} ${COLORS.forestGreen}`,
          }}
        />
        <p className="text-sm" style={{ color: COLORS.barkBrown }}>
          Loading grove...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      {screen === "menu" ? (
        <MainMenu onStartGame={handleStartGame} onNewGame={handleNewGame} />
      ) : (
        <GameErrorBoundary onReset={() => setScreen("menu")}>
          <Suspense
            fallback={
              <div className="w-full h-full flex items-center justify-center bg-green-900 text-white">
                Loading grove...
              </div>
            }
          >
            <GameScene />
          </Suspense>
        </GameErrorBoundary>
      )}

      {/* Rules modal */}
      <RulesModal
        open={showRules}
        onClose={handleRulesClose}
        onStart={handleRulesStart}
      />

      {/* New game difficulty selection */}
      <NewGameModal
        open={showNewGame}
        onClose={() => setShowNewGame(false)}
        onStart={handleDifficultySelected}
      />
    </div>
  );
};
