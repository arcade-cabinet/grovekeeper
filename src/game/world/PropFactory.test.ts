import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// Unmock BabylonJS so NullEngine + Scene work (global setup.ts mocks these)
vi.unmock("@babylonjs/core/Engines/engine");
vi.unmock("@babylonjs/core/scene");

import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { createPropMesh, disposePropMeshes } from "./PropFactory";
import type { PropPlacement } from "./types";

describe("PropFactory", () => {
  let engine: NullEngine;
  let scene: Scene;

  beforeEach(() => {
    engine = new NullEngine({
      renderHeight: 256,
      renderWidth: 256,
      textureSize: 256,
      deterministicLockstep: false,
      lockstepMaxSteps: 4,
    });
    scene = new Scene(engine);
  });

  afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  const makeProp = (propId: string, scale?: number): PropPlacement => ({
    propId,
    localX: 0,
    localZ: 0,
    scale,
  });

  it("creates a fallen-log mesh", () => {
    const mesh = createPropMesh(scene, makeProp("fallen-log"), 5, 3);
    expect(mesh).not.toBeNull();
    expect(mesh!.position.x).toBeCloseTo(5);
    expect(mesh!.position.z).toBeCloseTo(3);
  });

  it("creates a mushroom-cluster mesh with child meshes", () => {
    const mesh = createPropMesh(scene, makeProp("mushroom-cluster"), 0, 0);
    expect(mesh).not.toBeNull();
    // Root is invisible container, stems and caps are children
    expect(mesh!.isVisible).toBe(false);
    expect(mesh!.getChildMeshes().length).toBeGreaterThan(0);
  });

  it("creates a wild-flowers mesh", () => {
    const mesh = createPropMesh(scene, makeProp("wild-flowers"), 2, 4);
    expect(mesh).not.toBeNull();
    expect(mesh!.isVisible).toBe(false); // root is invisible
    expect(mesh!.getChildMeshes().length).toBeGreaterThan(0);
  });

  it("creates a boulder mesh", () => {
    const mesh = createPropMesh(scene, makeProp("boulder"), 1, 1);
    expect(mesh).not.toBeNull();
    expect(mesh!.isVisible).toBe(true); // boulder is a single visible mesh
  });

  it("returns null for unknown prop type", () => {
    const mesh = createPropMesh(scene, makeProp("unicorn"), 0, 0);
    expect(mesh).toBeNull();
  });

  it("sets mesh as non-pickable", () => {
    const mesh = createPropMesh(scene, makeProp("boulder"), 0, 0);
    expect(mesh!.isPickable).toBe(false);
  });

  it("applies scale when provided", () => {
    const mesh = createPropMesh(scene, makeProp("boulder", 2.0), 0, 0);
    expect(mesh).not.toBeNull();
    // Scale should be affected by the scaleInPlace(2.0) call
    // Boulder default scaling is (1.2, 0.7, 1.0), after scaleInPlace(2) = (2.4, 1.4, 2.0)
    expect(mesh!.scaling.x).toBeCloseTo(2.4);
    expect(mesh!.scaling.y).toBeCloseTo(1.4);
  });

  it("disposePropMeshes disposes all meshes", () => {
    const mesh1 = createPropMesh(scene, makeProp("boulder"), 0, 0)!;
    const mesh2 = createPropMesh(scene, makeProp("fallen-log"), 1, 1)!;

    expect(mesh1.isDisposed()).toBe(false);
    expect(mesh2.isDisposed()).toBe(false);

    disposePropMeshes([mesh1, mesh2]);

    expect(mesh1.isDisposed()).toBe(true);
    expect(mesh2.isDisposed()).toBe(true);
  });
});
