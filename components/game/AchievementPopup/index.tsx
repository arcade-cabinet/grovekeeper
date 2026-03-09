import { Modal } from "react-native";
import { PopupContent } from "./PopupContent.tsx";
import { showAchievementAction, useAchievementPopupStore } from "./store.ts";
import type { AchievementDef, AchievementPopupItem } from "./types.ts";

export type { AchievementDef };
export type { AchievementPopupItem };
export { useAchievementPopupStore };

export function showAchievement(achievementId: string) {
  showAchievementAction(achievementId);
}

export interface AchievementPopupContainerProps {
  achievementDefs: AchievementDef[];
}

export function AchievementPopupContainer({ achievementDefs }: AchievementPopupContainerProps) {
  const popup = useAchievementPopupStore((s) => s.popup);
  const clearPopupFn = useAchievementPopupStore((s) => s.clearPopup);

  if (!popup) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={clearPopupFn}>
      <PopupContent item={popup} achievementDefs={achievementDefs} onDismiss={clearPopupFn} />
    </Modal>
  );
}
