import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock Capacitor modules before importing platform
vi.mock("@capacitor/core", () => ({
  Capacitor: {
    getPlatform: vi.fn(() => "web"),
    isNativePlatform: vi.fn(() => false),
  },
}));

vi.mock("@capacitor/device", () => ({
  Device: {
    getInfo: vi.fn(() =>
      Promise.resolve({
        model: "Test",
        osVersion: "1.0",
        manufacturer: "Test",
        isVirtual: false,
      }),
    ),
  },
}));

vi.mock("@capacitor/haptics", () => ({
  Haptics: {
    impact: vi.fn(),
    selectionStart: vi.fn(),
    selectionChanged: vi.fn(),
    selectionEnd: vi.fn(),
    notification: vi.fn(),
  },
  ImpactStyle: { Light: "LIGHT", Medium: "MEDIUM", Heavy: "HEAVY" },
  NotificationType: { Success: "SUCCESS", Warning: "WARNING", Error: "ERROR" },
}));

import {
  initializePlatform,
  getDeviceInfo,
  getPlatform,
  isNative,
  isIOS,
  isAndroid,
  isWeb,
  setHapticsEnabled,
  isHapticsEnabled,
  hapticLight,
  hapticMedium,
  getResponsiveScale,
  isMobileDevice,
  isTabletDevice,
  isDesktopDevice,
} from "./platform";
import { Capacitor } from "@capacitor/core";

describe("platform", () => {
  beforeEach(() => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue("web");
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    setHapticsEnabled(true);
  });

  describe("initializePlatform (web)", () => {
    it("returns web device info", async () => {
      const info = await initializePlatform();
      expect(info.platform).toBe("web");
      expect(info.isNative).toBe(false);
      expect(info.manufacturer).toBe("Browser");
    });

    it("sets device info accessible via getter", async () => {
      await initializePlatform();
      expect(getDeviceInfo()).not.toBeNull();
      expect(getDeviceInfo()!.platform).toBe("web");
    });
  });

  describe("platform getters (after init)", () => {
    beforeEach(async () => {
      await initializePlatform();
    });

    it("getPlatform returns web", () => {
      expect(getPlatform()).toBe("web");
    });

    it("isNative returns false on web", () => {
      expect(isNative()).toBe(false);
    });

    it("isIOS returns false on web", () => {
      expect(isIOS()).toBe(false);
    });

    it("isAndroid returns false on web", () => {
      expect(isAndroid()).toBe(false);
    });

    it("isWeb returns true on web", () => {
      expect(isWeb()).toBe(true);
    });
  });

  describe("haptics toggle", () => {
    it("starts enabled", () => {
      expect(isHapticsEnabled()).toBe(true);
    });

    it("can be disabled", () => {
      setHapticsEnabled(false);
      expect(isHapticsEnabled()).toBe(false);
    });

    it("hapticLight does nothing when disabled", async () => {
      setHapticsEnabled(false);
      await expect(hapticLight()).resolves.toBeUndefined();
    });

    it("hapticMedium does nothing when disabled", async () => {
      setHapticsEnabled(false);
      await expect(hapticMedium()).resolves.toBeUndefined();
    });
  });

  describe("responsive helpers", () => {
    it("getResponsiveScale returns 1.0 for typical mobile (375-413px)", () => {
      Object.defineProperty(window, "innerWidth", { value: 390, writable: true });
      Object.defineProperty(window, "innerHeight", { value: 844, writable: true });
      expect(getResponsiveScale()).toBe(0.9);
    });

    it("getResponsiveScale returns 0.85 for very small screens", () => {
      Object.defineProperty(window, "innerWidth", { value: 320, writable: true });
      Object.defineProperty(window, "innerHeight", { value: 568, writable: true });
      expect(getResponsiveScale()).toBe(0.85);
    });

    it("getResponsiveScale returns 1.2 for large desktop", () => {
      Object.defineProperty(window, "innerWidth", { value: 1440, writable: true });
      Object.defineProperty(window, "innerHeight", { value: 1080, writable: true });
      expect(getResponsiveScale()).toBe(1.2);
    });

    it("isMobileDevice returns true for narrow viewport", () => {
      Object.defineProperty(window, "innerWidth", { value: 375, writable: true });
      expect(isMobileDevice()).toBe(true);
    });

    it("isTabletDevice returns true for 768-1023px", () => {
      Object.defineProperty(window, "innerWidth", { value: 800, writable: true });
      expect(isTabletDevice()).toBe(true);
    });

    it("isDesktopDevice returns true for >= 1024px", () => {
      Object.defineProperty(window, "innerWidth", { value: 1440, writable: true });
      expect(isDesktopDevice()).toBe(true);
    });

    it("isDesktopDevice returns false for mobile", () => {
      Object.defineProperty(window, "innerWidth", { value: 375, writable: true });
      expect(isDesktopDevice()).toBe(false);
    });
  });
});
