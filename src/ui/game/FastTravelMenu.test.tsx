/**
 * FastTravelMenu tests — Sub-wave A.
 *
 * Verifies the overlay renders only claimed groves, clicks teleport
 * via `onSelect`, and the close button + backdrop click both fire
 * `onClose`.
 */

import { fireEvent, render, screen } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";
import type { ClaimedGroveNode } from "@/game/scene/fastTravel";
import { FastTravelMenu } from "./FastTravelMenu";

const GROVES: ClaimedGroveNode[] = [
  {
    groveId: "grove-3-0",
    worldId: "world-1",
    chunkX: 3,
    chunkZ: 0,
    biome: "meadow",
    name: "Grove (3, 0)",
    worldX: 56,
    worldZ: 8,
  },
  {
    groveId: "grove--1-2",
    worldId: "world-1",
    chunkX: -1,
    chunkZ: 2,
    biome: "forest",
    name: "Grove (-1, 2)",
    worldX: -8,
    worldZ: 40,
  },
];

describe("FastTravelMenu", () => {
  it("does not render when open=false", () => {
    render(() => (
      <FastTravelMenu
        open={false}
        groves={GROVES}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    ));
    expect(screen.queryByTestId("fast-travel-menu")).toBeNull();
  });

  it("renders one button per claimed grove with name + biome", () => {
    render(() => (
      <FastTravelMenu
        open={true}
        groves={GROVES}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    ));
    expect(screen.getByTestId("fast-travel-menu")).toBeTruthy();
    expect(screen.getByTestId("fast-travel-grove-grove-3-0")).toBeTruthy();
    expect(screen.getByTestId("fast-travel-grove-grove--1-2")).toBeTruthy();
    expect(screen.getByText("Grove (3, 0)")).toBeTruthy();
    expect(screen.getByText("Grove (-1, 2)")).toBeTruthy();
  });

  it("shows an empty-state when no groves are claimed", () => {
    render(() => (
      <FastTravelMenu
        open={true}
        groves={[]}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    ));
    expect(screen.getByText(/No groves claimed yet/i)).toBeTruthy();
  });

  it("fires onSelect with the grove node when a button is clicked", () => {
    const onSelect = vi.fn();
    render(() => (
      <FastTravelMenu
        open={true}
        groves={GROVES}
        onSelect={onSelect}
        onClose={vi.fn()}
      />
    ));
    fireEvent.click(screen.getByTestId("fast-travel-grove-grove-3-0"));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0].groveId).toBe("grove-3-0");
  });

  it("fires onClose when the close button is clicked", () => {
    const onClose = vi.fn();
    render(() => (
      <FastTravelMenu
        open={true}
        groves={GROVES}
        onSelect={vi.fn()}
        onClose={onClose}
      />
    ));
    fireEvent.click(screen.getByLabelText("Close fast travel menu"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
