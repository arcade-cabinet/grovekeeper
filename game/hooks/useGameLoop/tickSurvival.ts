/**
 * tickSurvival -- hunger, body temperature, hearts, and death detection.
 * Spec §12.2 (hunger), §12.3 (hearts/death), §12.5 (respawn).
 */
import type { DifficultyConfig } from "@/game/config/difficulty";
import { useGameStore } from "@/game/stores";
import { applyDeathPenalty } from "@/game/systems/deathRespawn";
import {
  isPlayerDead,
  tickHeartsFromExposure,
  tickHeartsFromStarvation,
  tickHunger,
} from "@/game/systems/survival";

export function tickSurvival(diffConfig: DifficultyConfig | undefined, dt: number): void {
  const store = useGameStore.getState();

  const hungerDrainMult = diffConfig?.hungerDrainRate ?? 0;
  const exposureDriftRate = diffConfig?.exposureDriftRate ?? 0;
  const exposureEnabled = diffConfig?.exposureEnabled ?? false;
  const affectsGameplay = diffConfig?.affectsGameplay ?? false;

  const newHunger = tickHunger(store.hunger, store.maxHunger, dt, hungerDrainMult, affectsGameplay);
  if (newHunger !== store.hunger) {
    store.setHunger(newHunger);
  }

  const healthBridge = {
    current: store.hearts,
    max: store.maxHearts,
    invulnFrames: 0,
    lastDamageSource: null,
  };
  tickHeartsFromStarvation(healthBridge, newHunger, dt, affectsGameplay);
  tickHeartsFromExposure(
    healthBridge,
    dt,
    exposureDriftRate,
    exposureEnabled,
    affectsGameplay,
    store.bodyTemp ?? 37,
  );
  if (healthBridge.current !== store.hearts) {
    store.setHearts(healthBridge.current);
  }

  // Death detection: when hearts reach 0, apply death penalty and transition
  // to the appropriate screen (death or permadeath). Spec §12.3.
  // Exploration mode (affectsGameplay=false) skips death entirely.
  // Guard: only trigger death if still on "playing" screen to prevent
  // re-applying the penalty if this function is called after screen transition.
  if (affectsGameplay && isPlayerDead(healthBridge) && store.screen === "playing") {
    applyDeathPenalty();
  }
}
