import { vi } from "vitest";

// Mock localStorage so Solid + Koota tests run under happy-dom without
// needing a real Web Storage implementation.
//
// BabylonJS module mocks were removed alongside the engine purge
// (commit 8142d0d). The Jolly Pixel runtime owns its own Three.js
// context and is not loaded by node-mode tests; UI-only tests run
// without ever touching the renderer.
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, "localStorage", { value: localStorageMock });
