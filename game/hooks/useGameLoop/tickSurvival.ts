/**
 * tickSurvival -- hunger, body temperature, hearts, and death detection.
 */
import type { DifficultyConfig } from "@/game/config/difficulty";
import { useGameStore } from "@/game/stores/gameStore";
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

  const newHunger = tickHunger(
    store.hunger,
    store.maxHunger,
    dt,
    hungerDrainMult,
    affectsGameplay,
  );
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
  tickHeartsFromExposure(healthBridge, dt, exposureDriftRate, exposureEnabled, affectsGameplay);
  if (healthBridge.current !== store.hearts) {
    store.setHearts(healthBridge.current);
  }

  if (isPlayerDead(healthBridge)) {
    const storeAny = store as Record<string, unknown>;
    if (typeof storeAny.handleDeath === "function") {
      (storeAny.handleDeath as () => void)();
    } else {
      console.warn("[useGameLoop] Player died but store.handleDeath is not implemented");
    }
  }
}
