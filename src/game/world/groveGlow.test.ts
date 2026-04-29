/**
 * Grove glow tests — Wave 10.
 *
 * Verifies the emissive override + firefly point cloud:
 *   - applyGroveEmissivePulse mutates every emissive-capable material
 *     it finds in the subtree, leaves others alone.
 *   - updateGroveEmissivePulse oscillates intensity within
 *     [base - amp, base + amp].
 *   - createGroveFireflies builds a deterministic Points field with
 *     the configured count.
 *   - updateGroveFireflies bobs Y values without escaping the
 *     amplitude window.
 *   - disposeGroveGlow restores original emissive and frees buffers.
 */

import * as THREE from "three";
import { describe, expect, it } from "vitest";
import {
  applyGroveEmissivePulse,
  createGroveFireflies,
  disposeGroveGlow,
  GROVE_EMISSIVE_AMPLITUDE,
  GROVE_EMISSIVE_BASE,
  GROVE_EMISSIVE_COLOR,
  GROVE_FIREFLY_COUNT,
  updateGroveEmissivePulse,
  updateGroveFireflies,
} from "./groveGlow";

describe("groveGlow: emissive pulse", () => {
  it("patches every MeshLambert/MeshStandard material in the subtree", () => {
    const root = new THREE.Group();
    const lambert = new THREE.MeshLambertMaterial({ color: 0x88cc66 });
    const standard = new THREE.MeshStandardMaterial({ color: 0xffaa00 });
    const basic = new THREE.MeshBasicMaterial({ color: 0xff0000 });

    root.add(new THREE.Mesh(new THREE.BoxGeometry(), lambert));
    root.add(new THREE.Mesh(new THREE.BoxGeometry(), standard));
    root.add(new THREE.Mesh(new THREE.BoxGeometry(), basic));

    const { materials, originalEmissive } = applyGroveEmissivePulse(root);

    expect(materials).toHaveLength(2);
    expect(originalEmissive).toHaveLength(2);
    expect(lambert.emissive.equals(GROVE_EMISSIVE_COLOR)).toBe(true);
    expect(standard.emissive.equals(GROVE_EMISSIVE_COLOR)).toBe(true);
    expect(lambert.emissiveIntensity).toBeCloseTo(GROVE_EMISSIVE_BASE);
    // Basic material is untouched (no emissive property to set).
    expect("emissive" in basic).toBe(false);
  });

  it("oscillates emissive intensity within [base - amp, base + amp]", () => {
    const mat = new THREE.MeshLambertMaterial();
    const root = new THREE.Group();
    root.add(new THREE.Mesh(new THREE.BoxGeometry(), mat));
    const { materials } = applyGroveEmissivePulse(root);

    const min = GROVE_EMISSIVE_BASE - GROVE_EMISSIVE_AMPLITUDE - 1e-6;
    const max = GROVE_EMISSIVE_BASE + GROVE_EMISSIVE_AMPLITUDE + 1e-6;

    for (let t = 0; t < 6; t += 0.1) {
      updateGroveEmissivePulse(materials, t);
      expect(mat.emissiveIntensity).toBeGreaterThanOrEqual(min);
      expect(mat.emissiveIntensity).toBeLessThanOrEqual(max);
    }
  });

  it("emissiveBoost adds to pulse intensity", () => {
    const mat = new THREE.MeshLambertMaterial();
    const root = new THREE.Group();
    root.add(new THREE.Mesh(new THREE.BoxGeometry(), mat));
    const { materials } = applyGroveEmissivePulse(root);

    updateGroveEmissivePulse(materials, 0, 1.0);
    expect(mat.emissiveIntensity).toBeCloseTo(GROVE_EMISSIVE_BASE + 1.0, 5);
  });

  it("dedupes shared materials so we don't reset the same one twice", () => {
    const shared = new THREE.MeshLambertMaterial();
    const root = new THREE.Group();
    root.add(new THREE.Mesh(new THREE.BoxGeometry(), shared));
    root.add(new THREE.Mesh(new THREE.BoxGeometry(), shared));
    root.add(new THREE.Mesh(new THREE.BoxGeometry(), shared));
    const { materials } = applyGroveEmissivePulse(root);
    expect(materials).toHaveLength(1);
  });
});

describe("groveGlow: fireflies", () => {
  it("builds a Points field of the configured count", () => {
    const built = createGroveFireflies({
      chunkSize: 16,
      surfaceY: 6,
      worldSeed: 0,
      chunkX: 3,
      chunkZ: 0,
    });
    expect(built.points).toBeInstanceOf(THREE.Points);
    expect(built.baseY).toHaveLength(GROVE_FIREFLY_COUNT);
    expect(built.phase).toHaveLength(GROVE_FIREFLY_COUNT);
    const pos = built.points.geometry.getAttribute("position");
    expect(pos.count).toBe(GROVE_FIREFLY_COUNT);
  });

  it("is deterministic for the same seed/coords", () => {
    const a = createGroveFireflies({
      chunkSize: 16,
      surfaceY: 6,
      worldSeed: 42,
      chunkX: 5,
      chunkZ: -2,
    });
    const b = createGroveFireflies({
      chunkSize: 16,
      surfaceY: 6,
      worldSeed: 42,
      chunkX: 5,
      chunkZ: -2,
    });
    const aArr = a.points.geometry.getAttribute("position")
      .array as Float32Array;
    const bArr = b.points.geometry.getAttribute("position")
      .array as Float32Array;
    expect(Array.from(aArr)).toEqual(Array.from(bArr));
  });

  it("places fireflies inside the chunk XZ bounds and above the surface", () => {
    const built = createGroveFireflies({
      chunkSize: 16,
      surfaceY: 6,
      worldSeed: 0,
      chunkX: 0,
      chunkZ: 0,
    });
    const arr = built.points.geometry.getAttribute("position")
      .array as Float32Array;
    for (let i = 0; i < GROVE_FIREFLY_COUNT; i++) {
      const x = arr[i * 3 + 0] ?? 0;
      const y = arr[i * 3 + 1] ?? 0;
      const z = arr[i * 3 + 2] ?? 0;
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(16);
      expect(z).toBeGreaterThanOrEqual(0);
      expect(z).toBeLessThanOrEqual(16);
      expect(y).toBeGreaterThan(6);
    }
  });

  it("bob keeps Y within ±amplitude of the base", () => {
    const built = createGroveFireflies({
      chunkSize: 16,
      surfaceY: 6,
      worldSeed: 0,
      chunkX: 3,
      chunkZ: 0,
    });
    const arr = built.points.geometry.getAttribute("position")
      .array as Float32Array;
    for (let t = 0; t < 4; t += 0.13) {
      updateGroveFireflies(built.points, built.baseY, built.phase, t);
      for (let i = 0; i < GROVE_FIREFLY_COUNT; i++) {
        const y = arr[i * 3 + 1] ?? 0;
        const base = built.baseY[i] ?? 0;
        expect(Math.abs(y - base)).toBeLessThanOrEqual(0.151);
      }
    }
  });
});

describe("groveGlow: dispose", () => {
  it("restores original emissive and disposes geometry", () => {
    const mat = new THREE.MeshLambertMaterial();
    const originalCopy = mat.emissive.clone();
    const root = new THREE.Group();
    root.add(new THREE.Mesh(new THREE.BoxGeometry(), mat));
    const { materials, originalEmissive } = applyGroveEmissivePulse(root);
    const fireflies = createGroveFireflies({
      chunkSize: 16,
      surfaceY: 6,
      worldSeed: 0,
      chunkX: 3,
      chunkZ: 0,
    });
    root.add(fireflies.points);

    disposeGroveGlow({
      materials,
      originalEmissive,
      fireflies: fireflies.points,
      fireflyBaseY: fireflies.baseY,
      fireflyPhase: fireflies.phase,
      emissiveBoost: 0,
    });

    expect(mat.emissive.equals(originalCopy)).toBe(true);
    expect(fireflies.points.parent).toBeNull();
  });
});
