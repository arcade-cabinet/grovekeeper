import { describe, it, expect } from "vitest";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { screenToGroundPlane } from "./projection";

/**
 * Mock scene that returns a controllable picking ray.
 * screenToGroundPlane only uses scene.createPickingRay() and scene.activeCamera,
 * so we mock just those.
 */
function mockScene(origin: Vector3, direction: Vector3) {
  return {
    activeCamera: {},
    createPickingRay: () => ({ origin, direction }),
  } as unknown as Parameters<typeof screenToGroundPlane>[2];
}

describe("screenToGroundPlane", () => {
  it("returns ground intersection for a downward ray from above", () => {
    // Camera at (0, 10, 0), looking straight down
    const scene = mockScene(new Vector3(0, 10, 0), new Vector3(0, -1, 0));
    const result = screenToGroundPlane(0, 0, scene);

    expect(result).not.toBeNull();
    expect(result!.x).toBeCloseTo(0);
    expect(result!.z).toBeCloseTo(0);
  });

  it("returns correct x,z for angled ray", () => {
    // Camera at (0, 10, 0), ray angled toward (5, 0, 3)
    // direction = normalize(5, -10, 3)
    const dir = new Vector3(5, -10, 3).normalize();
    const scene = mockScene(new Vector3(0, 10, 0), dir);
    const result = screenToGroundPlane(0, 0, scene);

    expect(result).not.toBeNull();
    // t = -10 / dir.y, then x = 0 + t * dir.x, z = 0 + t * dir.z
    // Since dir is normalized (5,-10,3), t = 10/|dir.y|
    // The hit point should be at (5, 0, 3) — the direction scaled to reach y=0
    expect(result!.x).toBeCloseTo(5, 1);
    expect(result!.z).toBeCloseTo(3, 1);
  });

  it("returns null for ray parallel to ground", () => {
    // Horizontal ray — direction.y ≈ 0
    const scene = mockScene(new Vector3(0, 5, 0), new Vector3(1, 0, 0));
    const result = screenToGroundPlane(0, 0, scene);

    expect(result).toBeNull();
  });

  it("returns null for ray pointing away from ground (upward from above)", () => {
    // Camera above ground, ray pointing up — t < 0
    const scene = mockScene(new Vector3(0, 5, 0), new Vector3(0, 1, 0));
    const result = screenToGroundPlane(0, 0, scene);

    expect(result).toBeNull();
  });

  it("handles ray from ground level (origin.y = 0)", () => {
    // Origin on the ground, pointing down — t = 0
    const scene = mockScene(new Vector3(3, 0, 7), new Vector3(0, -1, 0));
    const result = screenToGroundPlane(0, 0, scene);

    expect(result).not.toBeNull();
    expect(result!.x).toBeCloseTo(3);
    expect(result!.z).toBeCloseTo(7);
  });

  it("handles nearly-parallel ray (very small direction.y)", () => {
    // direction.y = 1e-9 — effectively parallel
    const scene = mockScene(new Vector3(0, 5, 0), new Vector3(1, 1e-9, 0));
    const result = screenToGroundPlane(0, 0, scene);

    expect(result).toBeNull();
  });

  it("handles isometric camera angle", () => {
    // Typical isometric: camera at (10, 15, 10), looking toward origin
    const origin = new Vector3(10, 15, 10);
    const target = new Vector3(0, 0, 0);
    const direction = target.subtract(origin).normalize();
    const scene = mockScene(origin, direction);
    const result = screenToGroundPlane(0, 0, scene);

    expect(result).not.toBeNull();
    // Should hit near (0, 0, 0) since ray goes from (10,15,10) toward origin
    expect(result!.x).toBeCloseTo(0, 0);
    expect(result!.z).toBeCloseTo(0, 0);
  });

  it("handles ray from below ground pointing up (camera underground)", () => {
    // Origin below ground, ray pointing up — intersects ground from below
    const scene = mockScene(new Vector3(0, -5, 0), new Vector3(0, 1, 0));
    const result = screenToGroundPlane(0, 0, scene);

    expect(result).not.toBeNull();
    expect(result!.x).toBeCloseTo(0);
    expect(result!.z).toBeCloseTo(0);
  });
});
