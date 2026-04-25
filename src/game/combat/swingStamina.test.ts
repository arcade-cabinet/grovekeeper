/**
 * swingStamina tests — Wave 14/15.
 *
 * Verifies the swing stamina cost gate works end-to-end against the
 * shared `koota` world: canSwing returns true only when stamina ≥
 * cost, spendSwingStamina deducts the cost, and the gating is
 * idempotent under repeated low-stamina swings.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { koota, spawnPlayer } from "@/koota";
import { FarmerState, IsPlayer } from "@/traits";
import {
  canSwing,
  SWING_STAMINA_COST,
  spendSwingStamina,
} from "./swingStamina";

function setStamina(value: number) {
  const player = koota.queryFirst(IsPlayer, FarmerState);
  if (player) {
    player.set(FarmerState, {
      ...player.get(FarmerState),
      stamina: value,
      maxStamina: 100,
    });
  }
}

function ensurePlayer() {
  if (!koota.queryFirst(IsPlayer, FarmerState)) spawnPlayer();
}

function getStamina(): number | undefined {
  return koota.queryFirst(IsPlayer, FarmerState)?.get(FarmerState)?.stamina;
}

describe("swing stamina gate", () => {
  beforeEach(() => {
    ensurePlayer();
    setStamina(100);
  });

  it("canSwing returns true when stamina is full", () => {
    expect(canSwing(koota)).toBe(true);
  });

  it("canSwing returns false when stamina is below cost", () => {
    setStamina(SWING_STAMINA_COST - 1);
    expect(canSwing(koota)).toBe(false);
  });

  it("spendSwingStamina deducts the cost when sufficient", () => {
    expect(spendSwingStamina(koota)).toBe(true);
    expect(getStamina()).toBe(100 - SWING_STAMINA_COST);
  });

  it("spendSwingStamina returns false when insufficient", () => {
    setStamina(2);
    expect(spendSwingStamina(koota)).toBe(false);
    expect(getStamina()).toBe(2);
  });

  it("repeated swings drain stamina until depletion", () => {
    setStamina(SWING_STAMINA_COST * 3);
    expect(spendSwingStamina(koota)).toBe(true);
    expect(spendSwingStamina(koota)).toBe(true);
    expect(spendSwingStamina(koota)).toBe(true);
    expect(spendSwingStamina(koota)).toBe(false);
    expect(getStamina()).toBe(0);
  });
});
