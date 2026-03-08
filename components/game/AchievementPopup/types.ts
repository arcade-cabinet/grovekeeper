export interface AchievementDef {
  id: string;
  name: string;
  description: string;
}

export interface AchievementPopupItem {
  id: string;
  achievementId: string;
  createdAt: number;
}

export interface AchievementPopupState {
  popup: AchievementPopupItem | null;
}

export interface AchievementPopupStore {
  popup: AchievementPopupItem | null;
  showAchievement: (achievementId: string) => void;
  clearPopup: () => void;
}

export const AUTO_DISMISS_MS = 4000;
export const SPARKLE_COUNT = 8;

// Category-based label text (no actual emoji -- using text symbols for RN)
export const ACHIEVEMENT_CATEGORY: Record<string, string> = {
  "first-seed": "planting",
  "seed-spreader": "planting",
  "forest-founder": "planting",
  "one-of-each": "diversity",
  "patient-gardener": "growth",
  "old-growth-guardian": "growth",
  "timber-baron": "resource",
  "sap-collector": "resource",
  "the-giving-tree": "resource",
  "canopy-complete": "grid",
  "full-grove": "grid",
  biodiversity: "diversity",
  "seasonal-veteran": "seasonal",
  "enchanted-grove": "growth",
  "new-beginnings": "prestige",
};
