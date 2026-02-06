import { useEffect, useState } from "react";
import { useGameStore } from "./stores/gameStore";
import { MainMenu } from "./ui/MainMenu";
import { GameScene } from "./scenes/GameScene";
import { RulesModal } from "./ui/RulesModal";
import { initializePlatform } from "./systems/platform";
import { generateDailyQuests } from "./systems/quests";

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
  } = useGameStore();
  
  const [showRules, setShowRules] = useState(false);
  const [platformInitialized, setPlatformInitialized] = useState(false);
  
  // Initialize platform on mount
  useEffect(() => {
    initializePlatform().then(() => {
      setPlatformInitialized(true);
    });
  }, []);
  
  // Generate daily quests if needed
  useEffect(() => {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    
    // Refresh quests once per day or if none exist
    if (activeQuests.length === 0 || (now - lastQuestRefresh) > oneDayMs) {
      const completedSet = new Set(completedGoalIds);
      const newQuests = generateDailyQuests(currentSeason, level, completedSet);
      setActiveQuests(newQuests);
      setLastQuestRefresh(now);
    }
  }, [currentSeason, level, completedGoalIds, activeQuests.length, lastQuestRefresh, setActiveQuests, setLastQuestRefresh]);
  
  // Show rules when starting game for first time
  const handleStartGame = () => {
    if (!hasSeenRules) {
      setShowRules(true);
    } else {
      setScreen("playing");
    }
  };
  
  const handleRulesClose = () => {
    setShowRules(false);
  };
  
  const handleRulesStart = () => {
    setHasSeenRules(true);
    setShowRules(false);
    setScreen("playing");
  };

  return (
    <div className="w-full h-full">
      {screen === "menu" ? (
        <MainMenu onStartGame={handleStartGame} />
      ) : (
        <GameScene />
      )}
      
      {/* Rules modal */}
      <RulesModal 
        open={showRules} 
        onClose={handleRulesClose} 
        onStart={handleRulesStart} 
      />
    </div>
  );
};
