import { Platform } from "react-native";
import { triggerHaptic } from "./haptics";

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
