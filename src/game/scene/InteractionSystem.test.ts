/**
 * InteractionSystem tests — Wave 11b.
 *
 * Verifies:
 *   - tick() with no interact rising edge → noop,
 *   - tick() with interact rising edge → finds nearest NPC and calls
 *     `interact()` on it,
 *   - NPCs outside `rangeMeters` are ignored,
 *   - the phrase pick is forwarded to `onPhrase` with the NPC id and
 *     world position so the caller can persist + render.
 */

import { describe, expect, it, vi } from "vitest";
import {
  type InteractableNpc,
  InteractionSystem,
} from "./InteractionSystem";
import type { PhrasePick } from "@/game/dialogue/dialogueSystem";

function makeNpc(
  id: string,
  x: number,
  z: number,
  text = "hello",
): InteractableNpc & { calls: number } {
  let calls = 0;
  return {
    getId: () => id,
    position: { x, y: 0, z },
    interact(): PhrasePick {
      calls++;
      return { id: `${id}:phrase:${calls}`, text, tag: "general" };
    },
    get calls() {
      return calls;
    },
  } as InteractableNpc & { calls: number };
}

function makeInput(justPressed: boolean) {
  return {
    getActionState: vi.fn(() => ({ pressed: justPressed, justPressed })),
  };
}

describe("InteractionSystem", () => {
  it("noop when interact is not on its rising edge", () => {
    const player = { position: { x: 0, y: 0, z: 0 } };
    const npc = makeNpc("a", 0, 0);
    const onPhrase = vi.fn();
    const sys = new InteractionSystem({
      player,
      input: makeInput(false),
      getNpcs: () => [npc],
      onPhrase,
    });
    sys.tick();
    expect(onPhrase).not.toHaveBeenCalled();
    expect(npc.calls).toBe(0);
  });

  it("picks the nearest NPC within range and forwards the phrase", () => {
    const player = { position: { x: 0, y: 0, z: 0 } };
    // two NPCs in range; "near" should win
    const near = makeNpc("near", 1.0, 0, "near-line");
    const far = makeNpc("far", 1.5, 0, "far-line");
    const onPhrase = vi.fn();
    const sys = new InteractionSystem({
      player,
      input: makeInput(true),
      getNpcs: () => [far, near],
      onPhrase,
    });
    sys.tick();
    expect(onPhrase).toHaveBeenCalledTimes(1);
    const event = onPhrase.mock.calls[0][0];
    expect(event.npcId).toBe("near");
    expect(event.pick.text).toBe("near-line");
    expect(event.position).toEqual({ x: 1.0, y: 0, z: 0 });
    expect(near.calls).toBe(1);
    expect(far.calls).toBe(0);
  });

  it("ignores NPCs outside rangeMeters", () => {
    const player = { position: { x: 0, y: 0, z: 0 } };
    const out = makeNpc("out", 10, 0);
    const onPhrase = vi.fn();
    const sys = new InteractionSystem({
      player,
      input: makeInput(true),
      getNpcs: () => [out],
      onPhrase,
      rangeMeters: 2,
    });
    sys.tick();
    expect(onPhrase).not.toHaveBeenCalled();
    expect(out.calls).toBe(0);
  });

  it("uses XZ distance only — high Y NPCs are still reachable", () => {
    const player = { position: { x: 0, y: 0, z: 0 } };
    const tall: InteractableNpc = {
      getId: () => "tall",
      position: { x: 0.5, y: 100, z: 0.5 },
      interact: () => ({ id: "tall:1", text: "hi", tag: "general" }),
    };
    const onPhrase = vi.fn();
    const sys = new InteractionSystem({
      player,
      input: makeInput(true),
      getNpcs: () => [tall],
      onPhrase,
      rangeMeters: 2,
    });
    sys.tick();
    expect(onPhrase).toHaveBeenCalledTimes(1);
  });

  it("passes context from getContext through to interact()", () => {
    const player = { position: { x: 0, y: 0, z: 0 } };
    let captured: unknown = null;
    const npc: InteractableNpc = {
      getId: () => "c",
      position: { x: 0, y: 0, z: 0 },
      interact(ctx) {
        captured = ctx;
        return { id: "c:1", text: "ok", tag: "general" };
      },
    };
    const sys = new InteractionSystem({
      player,
      input: makeInput(true),
      getNpcs: () => [npc],
      getContext: () => ({ timeOfDay: "morning" }),
      onPhrase: () => {},
    });
    sys.tick();
    expect(captured).toEqual({ timeOfDay: "morning" });
  });

  it("returns null from findNearestInRange when no NPC is in range", () => {
    const player = { position: { x: 0, y: 0, z: 0 } };
    const sys = new InteractionSystem({
      player,
      input: makeInput(false),
      getNpcs: () => [],
      onPhrase: () => {},
    });
    expect(sys.findNearestInRange()).toBeNull();
  });
});
