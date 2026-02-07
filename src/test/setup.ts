import { vi } from "vitest";

// Mock BabylonJS for testing
vi.mock("@babylonjs/core/Engines/engine", () => ({
  Engine: vi.fn().mockImplementation(() => ({
    runRenderLoop: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
  })),
}));

vi.mock("@babylonjs/core/scene", () => ({
  Scene: vi.fn().mockImplementation(() => ({
    clearColor: null,
    render: vi.fn(),
  })),
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, "localStorage", { value: localStorageMock });
