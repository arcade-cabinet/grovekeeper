export interface PauseMenuStats {
  level: number;
  xp: number;
  coins: number;
  treesPlanted: number;
  treesMatured: number;
  gridSize: number;
  unlockedSpeciesCount: number;
  totalSpeciesCount: number;
  unlockedToolsCount: number;
  totalToolsCount: number;
  prestigeCount: number;
  difficultyName?: string;
  difficultyColor?: string;
}

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
}

export interface GridExpansionInfo {
  nextSize: number;
  nextRequiredLevel: number;
  costLabel: string;
  canAfford: boolean;
  meetsLevel: boolean;
}

export interface BorderCosmetic {
  id: string;
  name: string;
  description: string;
  prestigeRequired: number;
  borderColor: string;
  borderStyle: string;
  glowColor?: string;
}

export interface PrestigeInfo {
  count: number;
  growthBonusPct: number;
  isEligible: boolean;
  minLevel: number;
}

export interface PauseMenuProps {
  open: boolean;
  stats: PauseMenuStats;
  achievements: string[];
  achievementDefs: AchievementDef[];
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  // Grid expansion
  gridExpansion: GridExpansionInfo | null;
  // Prestige
  prestige: PrestigeInfo;
  // Border cosmetics
  activeBorderCosmetic: string | null;
  unlockedCosmetics: BorderCosmetic[];
  lockedCosmetics: BorderCosmetic[];
  // Callbacks
  onClose: () => void;
  onMainMenu: () => void;
  onToggleSound: () => void;
  onToggleHaptics: () => void;
  onExpandGrid: () => void;
  onPrestige: () => void;
  onResetGame: () => void;
  onSetBorderCosmetic: (id: string | null) => void;
  onHowToPlay?: () => void;
  onOpenStats?: () => void;
  onExportSave?: () => void;
  onImportSave?: () => void;
  /** Open the full Audio/Graphics/Controls settings screen. */
  onSettings?: () => void;
}

export type Tab = "stats" | "progress" | "settings";
