import { Platform } from "react-native";
import { triggerActionHaptic, triggerHaptic } from "./haptics.ts";

// Mock expo-haptics
const mockImpactAsync = jest.fn().mockResolvedValue(undefined);
const mockNotificationAsync = jest.fn().mockResolvedValue(undefined);

jest.mock("expo-haptics", () => ({
  impactAsync: (...args: unknown[]) => mockImpactAsync(...args),
  notificationAsync: (...args: unknown[]) => mockNotificationAsync(...args),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
  NotificationFeedbackType: {
    Success: "success",
    Warning: "warning",
    Error: "error",
  },
}));

describe("triggerHaptic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does nothing on web", async () => {
    const original = Platform.OS;
    Platform.OS = "web";
    await triggerHaptic("medium");
    expect(mockImpactAsync).not.toHaveBeenCalled();
    expect(mockNotificationAsync).not.toHaveBeenCalled();
    Platform.OS = original;
  });

  it("calls impactAsync for light/medium/heavy on native", async () => {
    const original = Platform.OS;
    Platform.OS = "ios";

    await triggerHaptic("light");
    expect(mockImpactAsync).toHaveBeenCalledWith("light");

    await triggerHaptic("medium");
    expect(mockImpactAsync).toHaveBeenCalledWith("medium");

    await triggerHaptic("heavy");
    expect(mockImpactAsync).toHaveBeenCalledWith("heavy");

    Platform.OS = original;
  });

  it("calls notificationAsync for success/warning/error on native", async () => {
    const original = Platform.OS;
    Platform.OS = "ios";

    await triggerHaptic("success");
    expect(mockNotificationAsync).toHaveBeenCalledWith("success");

    await triggerHaptic("warning");
    expect(mockNotificationAsync).toHaveBeenCalledWith("warning");

    await triggerHaptic("error");
    expect(mockNotificationAsync).toHaveBeenCalledWith("error");

    Platform.OS = original;
  });
});

describe("triggerActionHaptic (Spec §11)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = "ios";
  });

  afterEach(() => {
    Platform.OS = "web";
  });

  it("DIG -> heavy impact", async () => {
    await triggerActionHaptic("DIG");
    expect(mockImpactAsync).toHaveBeenCalledWith("heavy");
  });

  it("CHOP -> medium impact", async () => {
    await triggerActionHaptic("CHOP");
    expect(mockImpactAsync).toHaveBeenCalledWith("medium");
  });

  it("WATER -> light impact", async () => {
    await triggerActionHaptic("WATER");
    expect(mockImpactAsync).toHaveBeenCalledWith("light");
  });

  it("PLANT -> medium impact", async () => {
    await triggerActionHaptic("PLANT");
    expect(mockImpactAsync).toHaveBeenCalledWith("medium");
  });

  it("PRUNE -> light impact", async () => {
    await triggerActionHaptic("PRUNE");
    expect(mockImpactAsync).toHaveBeenCalledWith("light");
  });

  it("no-op on web platform", async () => {
    Platform.OS = "web";
    await triggerActionHaptic("DIG");
    expect(mockImpactAsync).not.toHaveBeenCalled();
  });
});
