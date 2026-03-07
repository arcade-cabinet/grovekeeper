/**
 * Tests for useMouseLook — pointer lock + mouse delta camera rotation (Spec §23).
 *
 * clampPitch is tested as a pure function with no R3F context required.
 * useMouseLook is smoke-tested only (requires R3F context for frame execution).
 */

jest.mock("@react-three/fiber", () => ({
  useFrame: jest.fn(),
  useThree: jest.fn().mockReturnValue({
    camera: {
      rotation: { order: "XYZ", x: 0, y: 0, z: 0 },
    },
    gl: {
      domElement: {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        requestPointerLock: jest.fn(),
      },
    },
  }),
}));

import { clampPitch, PITCH_CLAMP_RAD, useMouseLook } from "./useMouseLook";

describe("clampPitch (Spec §23)", () => {
  it("returns pitch unchanged when within ±85°", () => {
    const within = 0.5; // ~28.6°, well inside ±85°
    expect(clampPitch(within)).toBeCloseTo(within);
  });

  it("clamps positive pitch to +PITCH_CLAMP_RAD at the upper bound", () => {
    const overMax = PITCH_CLAMP_RAD + 0.5;
    expect(clampPitch(overMax)).toBeCloseTo(PITCH_CLAMP_RAD);
  });

  it("clamps negative pitch to -PITCH_CLAMP_RAD at the lower bound", () => {
    const underMin = -(PITCH_CLAMP_RAD + 0.5);
    expect(clampPitch(underMin)).toBeCloseTo(-PITCH_CLAMP_RAD);
  });

  it("returns 0 for zero input (looking straight ahead)", () => {
    expect(clampPitch(0)).toBe(0);
  });
});

describe("PITCH_CLAMP_RAD (Spec §23)", () => {
  it("is approximately 85 degrees in radians", () => {
    expect(PITCH_CLAMP_RAD).toBeCloseTo((85 * Math.PI) / 180, 5);
  });
});

describe("useMouseLook (Spec §23)", () => {
  it("exports useMouseLook as a function", () => {
    expect(typeof useMouseLook).toBe("function");
  });
});
