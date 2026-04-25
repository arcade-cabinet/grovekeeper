/**
 * eventBus tests — emit/clear basics for the UI signal bus.
 *
 * The bus is a singleton, so tests reset both signals to `null` after
 * each case to keep ordering independent.
 */
import { afterEach, describe, expect, it } from "vitest";
import { eventBus } from "./eventBus";

afterEach(() => {
  eventBus.emitNpcSpeech(null);
  eventBus.emitCraftingPanel(null);
});

describe("eventBus", () => {
  it("starts with null signals", () => {
    expect(eventBus.npcSpeech()).toBeNull();
    expect(eventBus.craftingPanel()).toBeNull();
  });

  it("emit sets the npc speech accessor", () => {
    eventBus.emitNpcSpeech({
      speakerId: "spirit-1",
      phrase: "hello",
      screenPosition: { x: 100, y: 200 },
      ttlMs: 4000,
    });
    const ev = eventBus.npcSpeech();
    expect(ev).not.toBeNull();
    expect(ev?.speakerId).toBe("spirit-1");
    expect(ev?.phrase).toBe("hello");
    expect(ev?.screenPosition).toEqual({ x: 100, y: 200 });
    expect(ev?.ttlMs).toBe(4000);
  });

  it("null clears the npc speech accessor", () => {
    eventBus.emitNpcSpeech({
      speakerId: "x",
      phrase: "y",
      screenPosition: { x: 0, y: 0 },
      ttlMs: 1,
    });
    expect(eventBus.npcSpeech()).not.toBeNull();
    eventBus.emitNpcSpeech(null);
    expect(eventBus.npcSpeech()).toBeNull();
  });

  it("emit sets the crafting panel accessor", () => {
    eventBus.emitCraftingPanel({
      stationId: "primitive-workbench",
      open: true,
    });
    const ev = eventBus.craftingPanel();
    expect(ev).not.toBeNull();
    expect(ev?.stationId).toBe("primitive-workbench");
    expect(ev?.open).toBe(true);
  });

  it("null clears the crafting panel accessor", () => {
    eventBus.emitCraftingPanel({
      stationId: "primitive-workbench",
      open: true,
    });
    expect(eventBus.craftingPanel()).not.toBeNull();
    eventBus.emitCraftingPanel(null);
    expect(eventBus.craftingPanel()).toBeNull();
  });

  it("supports independent open/close transitions", () => {
    eventBus.emitCraftingPanel({ stationId: "a", open: true });
    expect(eventBus.craftingPanel()?.open).toBe(true);
    eventBus.emitCraftingPanel({ stationId: "a", open: false });
    expect(eventBus.craftingPanel()?.open).toBe(false);
  });
});
