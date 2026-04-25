/**
 * eventBus UI mounting tests — UI Glue wave.
 *
 * Verifies the conditional-mount pattern used in `Game.tsx`:
 *   - given `eventBus.npcSpeech()` is non-null, `<NpcSpeechBubble>`
 *     renders;
 *   - given `eventBus.craftingPanel()?.open === true`, `<CraftingPanel>`
 *     renders;
 *   - given the bus is null/closed, neither renders.
 *
 * Uses a happy-dom render — we don't mount the full `<Game>` because
 * it bootstraps the database, runtime, and screen router. The pattern
 * under test is just the `<Show when={…}>` block.
 */
import { render } from "@solidjs/testing-library";
import { Show } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NpcSpeechBubble } from "@/ui/game/NpcSpeechBubble";
import { eventBus } from "./eventBus";

// CraftingPanel hits the DB on open — stub it for this test.
vi.mock("@/db/client", () => ({
  getDb: () => {
    throw new Error("test stub: no db");
  },
  isDbInitialized: () => false,
}));

afterEach(() => {
  eventBus.emitNpcSpeech(null);
  eventBus.emitCraftingPanel(null);
});

describe("eventBus → UI mount pattern", () => {
  it("renders NpcSpeechBubble when bus has a value", () => {
    eventBus.emitNpcSpeech({
      speakerId: "v",
      phrase: "Welcome to the grove.",
      screenPosition: { x: 100, y: 200 },
      ttlMs: 4000,
    });
    const { container } = render(() => (
      <Show when={eventBus.npcSpeech()}>
        {(ev) => (
          <NpcSpeechBubble
            phrase={ev().phrase}
            screenX={ev().screenPosition.x}
            screenY={ev().screenPosition.y}
            holdSeconds={ev().ttlMs / 1000}
            onDismiss={() => eventBus.emitNpcSpeech(null)}
          />
        )}
      </Show>
    ));
    const bubble = container.querySelector("[data-npc-speech-bubble]");
    expect(bubble).not.toBeNull();
    expect(bubble?.textContent).toContain("Welcome to the grove.");
  });

  it("does not render NpcSpeechBubble when bus is null", () => {
    eventBus.emitNpcSpeech(null);
    const { container } = render(() => (
      <Show when={eventBus.npcSpeech()}>
        {(ev) => (
          <NpcSpeechBubble
            phrase={ev().phrase}
            screenX={ev().screenPosition.x}
            screenY={ev().screenPosition.y}
            holdSeconds={ev().ttlMs / 1000}
            onDismiss={() => eventBus.emitNpcSpeech(null)}
          />
        )}
      </Show>
    ));
    expect(container.querySelector("[data-npc-speech-bubble]")).toBeNull();
  });

  it("does not render the crafting panel when closed", () => {
    eventBus.emitCraftingPanel({
      stationId: "primitive-workbench",
      open: false,
    });
    const { container } = render(() => (
      <Show
        when={eventBus.craftingPanel()?.open ? eventBus.craftingPanel() : null}
      >
        {(ev) => <div data-crafting-stub>open: {ev().stationId}</div>}
      </Show>
    ));
    expect(container.querySelector("[data-crafting-stub]")).toBeNull();
  });

  it("renders the crafting panel surface when open=true", () => {
    eventBus.emitCraftingPanel({
      stationId: "primitive-workbench",
      open: true,
    });
    const { container } = render(() => (
      <Show
        when={eventBus.craftingPanel()?.open ? eventBus.craftingPanel() : null}
      >
        {(ev) => <div data-crafting-stub>open: {ev().stationId}</div>}
      </Show>
    ));
    const stub = container.querySelector("[data-crafting-stub]");
    expect(stub).not.toBeNull();
    expect(stub?.textContent).toContain("primitive-workbench");
  });
});
