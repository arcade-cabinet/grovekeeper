/**
 * ClaimRitualSystem tests — Sub-wave A.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CLAIM_RITUAL_TIMING,
  ClaimRitualSystem,
  SCRIPTED_SPIRIT_LINES,
} from "./ClaimRitualSystem";

function makeHooks() {
  return {
    setInputLocked: vi.fn(),
    playSound: vi.fn(),
    playStinger: vi.fn(),
    restoreBiomeMusic: vi.fn(),
    setHearthEmissive: vi.fn(),
    setVillagerAlpha: vi.fn(),
    persistClaim: vi.fn(),
    spawnVillagers: vi.fn(),
    emitSpiritLine: vi.fn(),
  };
}

describe("ClaimRitualSystem", () => {
  let hooks: ReturnType<typeof makeHooks>;
  let sys: ClaimRitualSystem;

  beforeEach(() => {
    hooks = makeHooks();
    sys = new ClaimRitualSystem({ hooks });
  });

  it("starts idle with no beats fired", () => {
    expect(sys.currentPhase).toBe("idle");
    expect(sys.isActive).toBe(false);
    expect(hooks.setInputLocked).not.toHaveBeenCalled();
  });

  it("locks input + plays ignite SFX immediately at t=0", () => {
    sys.start(0);
    expect(hooks.setInputLocked).toHaveBeenCalledWith(true);
    expect(hooks.playSound).toHaveBeenCalledWith("hearth.ignite");
    expect(sys.currentPhase).toBe("ignite");
    expect(sys.isActive).toBe(true);
  });

  it("fires the music stinger at t=0.5s", () => {
    sys.start(0);
    sys.tick(499);
    expect(hooks.playStinger).not.toHaveBeenCalled();
    sys.tick(500);
    expect(hooks.playStinger).toHaveBeenCalledWith(
      "music.moments.spiritDiscovered",
    );
    sys.tick(700);
    expect(hooks.playStinger).toHaveBeenCalledTimes(1);
  });

  it("ramps emissive 0 → 1.5 across the ignite phase", () => {
    sys.start(0);
    sys.tick(0);
    expect(hooks.setHearthEmissive).toHaveBeenLastCalledWith(0);
    sys.tick(1000);
    const half = hooks.setHearthEmissive.mock.calls.at(-1)?.[0] as number;
    expect(half).toBeCloseTo(0.75, 5);
    sys.tick(2000);
    const full = hooks.setHearthEmissive.mock.calls.at(-1)?.[0] as number;
    expect(full).toBeCloseTo(CLAIM_RITUAL_TIMING.emissivePeak, 5);
  });

  it("persists + spawns villagers at t=2s, exactly once", () => {
    sys.start(0);
    sys.tick(1999);
    expect(hooks.persistClaim).not.toHaveBeenCalled();
    expect(hooks.spawnVillagers).not.toHaveBeenCalled();
    sys.tick(2000);
    expect(hooks.persistClaim).toHaveBeenCalledTimes(1);
    expect(hooks.spawnVillagers).toHaveBeenCalledTimes(1);
    expect(sys.currentPhase).toBe("claim");
    sys.tick(2500);
    sys.tick(2999);
    expect(hooks.persistClaim).toHaveBeenCalledTimes(1);
    expect(hooks.spawnVillagers).toHaveBeenCalledTimes(1);
  });

  it("ramps villager alpha 0 → 1 across the claim phase", () => {
    sys.start(0);
    sys.tick(2000);
    sys.tick(2500);
    const half = hooks.setVillagerAlpha.mock.calls.at(-1)?.[0] as number;
    expect(half).toBeCloseTo(0.5, 5);
    sys.tick(3000);
    const full = hooks.setVillagerAlpha.mock.calls.at(-1)?.[0] as number;
    expect(full).toBe(1);
  });

  it("emits spirit line 2 + restores music at t=3s", () => {
    sys.start(0);
    sys.tick(2999);
    expect(hooks.emitSpiritLine).not.toHaveBeenCalled();
    expect(hooks.restoreBiomeMusic).not.toHaveBeenCalled();
    sys.tick(3000);
    expect(hooks.emitSpiritLine).toHaveBeenCalledWith(
      SCRIPTED_SPIRIT_LINES.line2,
    );
    expect(hooks.restoreBiomeMusic).toHaveBeenCalledTimes(1);
    expect(sys.currentPhase).toBe("settle");
  });

  it("unlocks input at t=4s and transitions to complete", () => {
    sys.start(0);
    sys.tick(3999);
    expect(hooks.setInputLocked).toHaveBeenCalledTimes(1);
    sys.tick(4000);
    expect(hooks.setInputLocked).toHaveBeenLastCalledWith(false);
    expect(sys.currentPhase).toBe("complete");
    expect(sys.isActive).toBe(false);
  });

  it("is idempotent under re-start while running", () => {
    sys.start(0);
    sys.tick(1000);
    sys.start(500);
    expect(hooks.setInputLocked).toHaveBeenCalledTimes(1);
    expect(hooks.playSound).toHaveBeenCalledTimes(1);
    sys.tick(2000);
    expect(hooks.persistClaim).toHaveBeenCalledTimes(1);
  });

  it("is idempotent under re-tick after completion", () => {
    sys.start(0);
    sys.tick(4000);
    expect(sys.currentPhase).toBe("complete");
    sys.tick(5000);
    sys.tick(10000);
    expect(hooks.persistClaim).toHaveBeenCalledTimes(1);
    expect(hooks.spawnVillagers).toHaveBeenCalledTimes(1);
    expect(hooks.emitSpiritLine).toHaveBeenCalledTimes(1);
    expect(hooks.setInputLocked).toHaveBeenCalledTimes(2);
  });

  it("fires every beat exactly once across a full cinematic", () => {
    sys.start(0);
    for (let t = 16; t <= 4500; t += 16) sys.tick(t);
    expect(hooks.setInputLocked).toHaveBeenCalledTimes(2);
    expect(hooks.playSound).toHaveBeenCalledTimes(1);
    expect(hooks.playStinger).toHaveBeenCalledTimes(1);
    expect(hooks.persistClaim).toHaveBeenCalledTimes(1);
    expect(hooks.spawnVillagers).toHaveBeenCalledTimes(1);
    expect(hooks.emitSpiritLine).toHaveBeenCalledTimes(1);
    expect(hooks.restoreBiomeMusic).toHaveBeenCalledTimes(1);
  });

  it("handles being started a second time after completing", () => {
    sys.start(0);
    for (let t = 16; t <= 4500; t += 16) sys.tick(t);
    expect(sys.currentPhase).toBe("complete");

    sys.start(10_000);
    expect(sys.currentPhase).toBe("ignite");
    expect(hooks.setInputLocked).toHaveBeenCalledTimes(3);
    sys.tick(12_000);
    expect(hooks.persistClaim).toHaveBeenCalledTimes(2);
  });

  it("reset() clears state without firing any hooks", () => {
    sys.start(0);
    sys.tick(1000);
    sys.reset();
    expect(sys.currentPhase).toBe("idle");
    expect(sys.isActive).toBe(false);
    sys.tick(5000);
    expect(hooks.persistClaim).not.toHaveBeenCalled();
  });
});
