/**
 * MainMenu — unit tests for the post-landing surface.
 */
import { fireEvent, render, screen } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";
import type { World } from "@/db/schema/rc";
import { MainMenu } from "./MainMenu";

function makeWorld(overrides: Partial<World> = {}): World {
  return {
    id: "world-1",
    name: "Grovekeeper",
    gardenerName: "Wren",
    worldSeed: "ABCD1234",
    difficulty: "sapling",
    createdAt: 1_700_000_000_000,
    lastPlayedAt: 1_700_000_000_000,
    ...overrides,
  };
}

describe("MainMenu", () => {
  it("renders the wordmark and inscription", () => {
    render(() => <MainMenu worldsProvider={() => []} />);
    expect(screen.getByText("Grovekeeper")).toBeDefined();
    expect(screen.getByText("Every forest begins with a single seed.")).toBeDefined();
  });

  it("hides Continue when no worlds are persisted", () => {
    render(() => <MainMenu worldsProvider={() => []} />);
    expect(screen.queryByRole("button", { name: /continue/i })).toBeNull();
  });

  it("shows Continue when at least one world is persisted", () => {
    render(() => <MainMenu worldsProvider={() => [makeWorld()]} />);
    expect(screen.getByRole("button", { name: /continue/i })).toBeDefined();
  });

  it("invokes onBegin when Begin is clicked", () => {
    const onBegin = vi.fn();
    render(() => <MainMenu worldsProvider={() => []} onBegin={onBegin} />);
    fireEvent.click(screen.getByRole("button", { name: /begin a new grove/i }));
    expect(onBegin).toHaveBeenCalledTimes(1);
  });

  it("invokes onContinue with the most-recent worldId", () => {
    const onContinue = vi.fn();
    const recent = makeWorld({ id: "world-recent", lastPlayedAt: 2_000 });
    const older = makeWorld({ id: "world-older", lastPlayedAt: 1_000 });
    render(() => (
      <MainMenu
        worldsProvider={() => [recent, older]}
        onContinue={onContinue}
      />
    ));
    fireEvent.click(
      screen.getByRole("button", { name: /continue the most recent/i }),
    );
    expect(onContinue).toHaveBeenCalledWith("world-recent");
  });

  it("Begin button has accessible name and ≥44px target class", () => {
    render(() => <MainMenu worldsProvider={() => []} />);
    const begin = screen.getByRole("button", { name: /begin a new grove/i });
    expect(begin).toBeDefined();
    expect(begin.className).toMatch(/min-h-\[52px\]/);
  });
});
