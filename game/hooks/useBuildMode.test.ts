/**
 * @jest-environment jsdom
 */

/**
 * useBuildMode tests — Spec §46.
 *
 * Covers:
 * - openBuildPanel / closeBuildPanel callbacks
 * - Initial state is panel closed
 */

// Mock the stores before any imports
const mockSetActiveCraftingStation = jest.fn();
let mockActiveCraftingStation: { type: string; entityId: string } | null = null;

jest.mock("@/game/stores", () => ({
  useGameStore: jest.fn((selector?: (s: unknown) => unknown) => {
    const state = {
      activeCraftingStation: mockActiveCraftingStation,
    };
    if (selector) return selector(state);
    return state;
  }),
}));

// Patch useGameStore.getState
const { useGameStore } = jest.requireMock("@/game/stores") as {
  useGameStore: jest.Mock & {
    getState: () => { setActiveCraftingStation: jest.Mock };
  };
};
useGameStore.getState = () => ({
  setActiveCraftingStation: mockSetActiveCraftingStation,
});

import { createElement, type FunctionComponent } from "react";
import { Platform } from "react-native";
// biome-ignore lint/correctness/noUndeclaredDependencies: react-test-renderer ships with React
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { useBuildMode } from "./useBuildMode.ts";

/** Minimal renderHook using react-test-renderer (no @testing-library dependency). */
function renderHook<T>(hook: () => T): { result: { current: T }; unmount: () => void } {
  const result = { current: undefined as unknown as T };
  const TestComponent: FunctionComponent = () => {
    result.current = hook();
    return null;
  };
  let renderer: ReactTestRenderer;
  act(() => {
    renderer = create(createElement(TestComponent));
  });
  return {
    result,
    unmount: () => act(() => renderer.unmount()),
  };
}

// Save original platform
const originalPlatform = Platform.OS;

beforeEach(() => {
  jest.clearAllMocks();
  mockActiveCraftingStation = null;
  (Platform as { OS: string }).OS = "web";
});

afterAll(() => {
  (Platform as { OS: string }).OS = originalPlatform;
});

describe("useBuildMode (Spec §46)", () => {
  it("starts with build panel closed", () => {
    const { result } = renderHook(() => useBuildMode());
    expect(result.current.buildPanelOpen).toBe(false);
  });

  it("closeBuildPanel sets buildPanelOpen to false", () => {
    const { result } = renderHook(() => useBuildMode());

    act(() => {
      result.current.openBuildPanel();
    });
    expect(result.current.buildPanelOpen).toBe(true);

    act(() => {
      result.current.closeBuildPanel();
    });
    expect(result.current.buildPanelOpen).toBe(false);
  });

  it("openBuildPanel sets buildPanelOpen to true", () => {
    const { result } = renderHook(() => useBuildMode());

    act(() => {
      result.current.openBuildPanel();
    });
    expect(result.current.buildPanelOpen).toBe(true);
  });
});
