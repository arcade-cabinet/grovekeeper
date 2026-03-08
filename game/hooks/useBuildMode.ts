/**
 * useBuildMode -- Keyboard shortcut + build mode state for B key (Spec §46).
 *
 * Listens for B key on desktop to toggle build mode. Also watches the store's
 * activeCraftingStation for "kitbash" type (dispatched by hammer tool action).
 * Returns boolean indicating if build panel should be open.
 */

import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import { useGameStore } from "@/game/stores";

export function useBuildMode() {
  const [buildPanelOpen, setBuildPanelOpen] = useState(false);
  const activeCraftingStation = useGameStore((s) => s.activeCraftingStation);

  // Open BuildPanel when BUILD action dispatches via hammer (Spec §46.2)
  useEffect(() => {
    if (activeCraftingStation?.type === "kitbash") {
      setBuildPanelOpen(true);
      useGameStore.getState().setActiveCraftingStation(null);
    }
  }, [activeCraftingStation]);

  // B key shortcut (desktop only, Spec §46.2)
  useEffect(() => {
    if (Platform.OS !== "web") return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key.toLowerCase() === "b") {
        e.preventDefault();
        setBuildPanelOpen((prev) => !prev);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const openBuildPanel = useCallback(() => setBuildPanelOpen(true), []);
  const closeBuildPanel = useCallback(() => setBuildPanelOpen(false), []);

  return { buildPanelOpen, openBuildPanel, closeBuildPanel };
}
