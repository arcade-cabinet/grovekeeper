import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ActiveQuest } from "../systems/quests";
import type { Season } from "../systems/time";
import { type ResourceType, emptyResources } from "../constants/resources";

export type GameScreen = "menu" | "playing" | "paused" | "seedSelect" | "rules";

interface GameState {
  screen: GameScreen;
  selectedTool: string;
  selectedSpecies: string;
  coins: number;
  xp: number;
  level: number;
  unlockedTools: string[];
  unlockedSpecies: string[];
  treesPlanted: number;
  treesMatured: number;
  treesHarvested: number;
  treesWatered: number;
  
  // Time state (persisted)
  gameTimeMicroseconds: number;
  currentSeason: Season;
  currentDay: number;
  
  // Quest state
  activeQuests: ActiveQuest[];
  completedQuestIds: string[];
  completedGoalIds: string[];
  lastQuestRefresh: number;
  
  // Resources
  resources: Record<ResourceType, number>;
  seeds: Record<string, number>;

  // Stamina (persisted for session recovery)
  stamina: number;
  maxStamina: number;

  // Settings
  hasSeenRules: boolean;
  hapticsEnabled: boolean;
  soundEnabled: boolean;

  // Actions
  setScreen: (screen: GameScreen) => void;
  setSelectedTool: (tool: string) => void;
  setSelectedSpecies: (species: string) => void;
  addCoins: (amount: number) => void;
  addXp: (amount: number) => void;
  unlockTool: (toolId: string) => void;
  unlockSpecies: (speciesId: string) => void;
  incrementTreesPlanted: () => void;
  incrementTreesMatured: () => void;
  incrementTreesHarvested: () => void;
  incrementTreesWatered: () => void;
  addResource: (type: ResourceType, amount: number) => void;
  spendResource: (type: ResourceType, amount: number) => boolean;
  addSeed: (speciesId: string, amount: number) => void;
  spendSeed: (speciesId: string, amount: number) => boolean;
  setStamina: (value: number) => void;
  resetGame: () => void;

  // Time actions
  setGameTime: (microseconds: number) => void;
  setCurrentSeason: (season: Season) => void;
  setCurrentDay: (day: number) => void;
  
  // Quest actions
  setActiveQuests: (quests: ActiveQuest[]) => void;
  updateQuest: (questId: string, quest: ActiveQuest) => void;
  completeQuest: (questId: string) => void;
  setLastQuestRefresh: (time: number) => void;
  
  // Settings actions
  setHasSeenRules: (seen: boolean) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
}

const XP_PER_LEVEL = 500;

// Initial game time: Spring, Day 1, 8:00 AM
const INITIAL_GAME_TIME = (() => {
  const hours = 8;
  const day = 1;
  const month = 3; // March (Spring)
  const year = 1;
  const microsecondsPerSecond = 1_000_000;
  const secondsPerMinute = 60;
  const minutesPerHour = 60;
  const hoursPerDay = 24;
  const daysPerMonth = 30;
  const monthsPerYear = 12;
  
  const totalDays = ((year - 1) * monthsPerYear * daysPerMonth) +
                   ((month - 1) * daysPerMonth) +
                   (day - 1);
  const totalHours = totalDays * hoursPerDay + hours;
  const totalMinutes = totalHours * minutesPerHour;
  const totalSeconds = totalMinutes * secondsPerMinute;
  return totalSeconds * microsecondsPerSecond;
})();

const initialState = {
  screen: "menu" as GameScreen,
  selectedTool: "trowel",
  selectedSpecies: "white-oak",
  coins: 100,
  xp: 0,
  level: 1,
  unlockedTools: ["trowel", "watering-can"],
  unlockedSpecies: ["white-oak"],
  treesPlanted: 0,
  treesMatured: 0,
  treesHarvested: 0,
  treesWatered: 0,
  
  // Resources
  resources: emptyResources(),
  seeds: { "white-oak": 10 } as Record<string, number>,

  // Stamina
  stamina: 100,
  maxStamina: 100,

  // Time state
  gameTimeMicroseconds: INITIAL_GAME_TIME,
  currentSeason: "spring" as Season,
  currentDay: 1,
  
  // Quest state
  activeQuests: [] as ActiveQuest[],
  completedQuestIds: [] as string[],
  completedGoalIds: [] as string[],
  lastQuestRefresh: 0,
  
  // Settings
  hasSeenRules: false,
  hapticsEnabled: true,
  soundEnabled: true,
};

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setScreen: (screen) => set({ screen }),
      setSelectedTool: (selectedTool) => set({ selectedTool }),
      setSelectedSpecies: (selectedSpecies) => set({ selectedSpecies }),

      addCoins: (amount) =>
        set((state) => ({ coins: state.coins + amount })),

      addXp: (amount) =>
        set((state) => {
          const newXp = state.xp + amount;
          const newLevel = Math.floor(newXp / XP_PER_LEVEL) + 1;
          return { xp: newXp, level: newLevel };
        }),

      unlockTool: (toolId) =>
        set((state) => ({
          unlockedTools: state.unlockedTools.includes(toolId)
            ? state.unlockedTools
            : [...state.unlockedTools, toolId],
        })),

      unlockSpecies: (speciesId) =>
        set((state) => ({
          unlockedSpecies: state.unlockedSpecies.includes(speciesId)
            ? state.unlockedSpecies
            : [...state.unlockedSpecies, speciesId],
        })),

      incrementTreesPlanted: () =>
        set((state) => ({ treesPlanted: state.treesPlanted + 1 })),

      incrementTreesMatured: () =>
        set((state) => ({ treesMatured: state.treesMatured + 1 })),

      incrementTreesHarvested: () =>
        set((state) => ({ treesHarvested: state.treesHarvested + 1 })),

      incrementTreesWatered: () =>
        set((state) => ({ treesWatered: state.treesWatered + 1 })),

      addResource: (type, amount) =>
        set((state) => ({
          resources: { ...state.resources, [type]: state.resources[type] + amount },
        })),

      spendResource: (type, amount) => {
        const current = get().resources[type];
        if (current < amount) return false;
        set((state) => ({
          resources: { ...state.resources, [type]: state.resources[type] - amount },
        }));
        return true;
      },

      addSeed: (speciesId, amount) =>
        set((state) => ({
          seeds: { ...state.seeds, [speciesId]: (state.seeds[speciesId] ?? 0) + amount },
        })),

      spendSeed: (speciesId, amount) => {
        const current = get().seeds[speciesId] ?? 0;
        if (current < amount) return false;
        set((state) => ({
          seeds: { ...state.seeds, [speciesId]: (state.seeds[speciesId] ?? 0) - amount },
        }));
        return true;
      },

      setStamina: (value) => set({ stamina: value }),

      resetGame: () => set(initialState),
      
      // Time actions
      setGameTime: (microseconds) => set({ gameTimeMicroseconds: microseconds }),
      setCurrentSeason: (season) => set({ currentSeason: season }),
      setCurrentDay: (day) => set({ currentDay: day }),
      
      // Quest actions
      setActiveQuests: (quests) => set({ activeQuests: quests }),
      updateQuest: (questId, quest) =>
        set((state) => ({
          activeQuests: state.activeQuests.map((q) =>
            q.id === questId ? quest : q
          ),
        })),
      completeQuest: (questId) =>
        set((state) => ({
          activeQuests: state.activeQuests.filter((q) => q.id !== questId),
          completedQuestIds: [...state.completedQuestIds, questId],
        })),
      setLastQuestRefresh: (time) => set({ lastQuestRefresh: time }),
      
      // Settings actions
      setHasSeenRules: (seen) => set({ hasSeenRules: seen }),
      setHapticsEnabled: (enabled) => set({ hapticsEnabled: enabled }),
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
    }),
    { name: "grove-keeper-save" }
  )
);
