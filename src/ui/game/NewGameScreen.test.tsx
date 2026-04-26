/**
 * NewGameScreen — unit tests for the new-world setup surface.
 */
import { fireEvent, render, screen } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";
import type { AppDatabase } from "@/db/client";
import type { NewWorld, World } from "@/db/schema/rc";
import { NewGameScreen } from "./NewGameScreen";

function makeWorld(overrides: Partial<World> = {}): World {
  return {
    id: "world-1",
    name: "Grovekeeper",
    gardenerName: "Gardener",
    worldSeed: "SEEDXXXX",
    difficulty: "sapling",
    createdAt: 1_700_000_000_000,
    lastPlayedAt: 1_700_000_000_000,
    ...overrides,
  };
}

describe("NewGameScreen", () => {
  it("renders title, name input, seed input, and Begin", () => {
    render(() => (
      <NewGameScreen createWorldFn={() => makeWorld()} onCreated={() => {}} />
    ));
    expect(screen.getByText("A New Grove")).toBeDefined();
    expect(screen.getByLabelText("Gardener")).toBeDefined();
    expect(screen.getByLabelText("World Seed")).toBeDefined();
    expect(screen.getByRole("button", { name: /plant the seed/i })).toBeDefined();
  });

  it("seed defaults to a non-empty randomly-generated string", () => {
    render(() => <NewGameScreen createWorldFn={() => makeWorld()} />);
    const seedInput = screen.getByLabelText("World Seed") as HTMLInputElement;
    expect(seedInput.value).toBeTruthy();
    expect(seedInput.value.length).toBeGreaterThan(0);
  });

  it("Reroll button changes the seed", () => {
    render(() => <NewGameScreen createWorldFn={() => makeWorld()} />);
    const seedInput = screen.getByLabelText("World Seed") as HTMLInputElement;
    const before = seedInput.value;
    const reroll = screen.getByRole("button", { name: /reroll seed/i });
    let after = before;
    for (let i = 0; i < 5 && after === before; i++) {
      fireEvent.click(reroll);
      after = (screen.getByLabelText("World Seed") as HTMLInputElement).value;
    }
    expect(after).not.toBe(before);
  });

  it("disables Begin when name is empty", () => {
    render(() => <NewGameScreen createWorldFn={() => makeWorld()} />);
    const nameInput = screen.getByLabelText("Gardener") as HTMLInputElement;
    fireEvent.input(nameInput, { target: { value: "" } });
    const begin = screen.getByRole("button", { name: /plant the seed/i });
    expect((begin as HTMLButtonElement).disabled).toBe(true);
  });

  it("disables Begin when name is only whitespace", () => {
    render(() => <NewGameScreen createWorldFn={() => makeWorld()} />);
    const nameInput = screen.getByLabelText("Gardener") as HTMLInputElement;
    fireEvent.input(nameInput, { target: { value: "   " } });
    const begin = screen.getByRole("button", { name: /plant the seed/i });
    expect((begin as HTMLButtonElement).disabled).toBe(true);
  });

  it("calls createWorldFn with seed + gardener name + sane defaults on submit", () => {
    const createFn = vi.fn(
      (_db: AppDatabase, w: NewWorld): World => makeWorld({ ...w } as World),
    );
    const onCreated = vi.fn();
    render(() => (
      <NewGameScreen createWorldFn={createFn} onCreated={onCreated} />
    ));

    fireEvent.input(screen.getByLabelText("Gardener"), {
      target: { value: "Wren" },
    });
    fireEvent.input(screen.getByLabelText("World Seed"), {
      target: { value: "MYSEED" },
    });
    fireEvent.click(screen.getByRole("button", { name: /plant the seed/i }));

    expect(createFn).toHaveBeenCalledTimes(1);
    const arg = createFn.mock.calls[0][1];
    expect(arg.gardenerName).toBe("Wren");
    expect(arg.worldSeed).toBe("MYSEED");
    expect(arg.name).toBe("Grovekeeper");
    expect(arg.difficulty).toBe("sapling");
    expect(typeof arg.id).toBe("string");
    expect(arg.id).toBeTruthy();
    expect(onCreated).toHaveBeenCalledTimes(1);
  });

  it("does not call createWorldFn when Begin is clicked with empty name", () => {
    const createFn = vi.fn(() => makeWorld());
    render(() => <NewGameScreen createWorldFn={createFn} />);
    fireEvent.input(screen.getByLabelText("Gardener"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: /plant the seed/i }));
    expect(createFn).not.toHaveBeenCalled();
  });

  it("Back button calls onCancel", () => {
    const onCancel = vi.fn();
    render(() => (
      <NewGameScreen createWorldFn={() => makeWorld()} onCancel={onCancel} />
    ));
    fireEvent.click(screen.getByRole("button", { name: /^back$/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
