import { observable } from "@legendapp/state";
import { useSelector } from "@legendapp/state/react";
import type {
  AchievementPopupItem,
  AchievementPopupState,
  AchievementPopupStore,
} from "./types";
import { AUTO_DISMISS_MS } from "./types";

let popupCounter = 0;

const achievementPopupState$ = observable<AchievementPopupState>({ popup: null });

export function clearPopup() {
  achievementPopupState$.popup.set(null);
}

export function showAchievementAction(achievementId: string) {
  popupCounter += 1;
  const id = `achievement-popup-${Date.now()}-${popupCounter}`;
  const item: AchievementPopupItem = {
    id,
    achievementId,
    createdAt: Date.now(),
  };

  achievementPopupState$.popup.set(item);

  setTimeout(() => {
    const current = achievementPopupState$.popup.peek();
    if (current && current.id === id) {
      clearPopup();
    }
  }, AUTO_DISMISS_MS);
}

export function useAchievementPopupStore<T = AchievementPopupStore>(
  selector?: (state: AchievementPopupStore) => T,
): T {
  const popup = useSelector(() => achievementPopupState$.popup.get());
  const state: AchievementPopupStore = {
    popup,
    showAchievement: showAchievementAction,
    clearPopup,
  };
  if (selector) return selector(state);
  return state as unknown as T;
}
