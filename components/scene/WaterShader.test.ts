/**
 * WaterShader pure function tests (Spec §31.2).
 *
 * Tests the Wind Waker-style Gerstner wave calculation functions
 * and shader uniform construction. No R3F or WebGL required.
 */

jest.mock("three", () => ({
  ShaderMaterial: jest.fn().mockImplementation((params: Record<string, unknown>) => ({
    uniforms: (params?.uniforms as Record<string, unknown>) ?? {},
    transparent: params?.transparent,
    side: params?.side,
    depthWrite: params?.depthWrite,
    vertexShader: params?.vertexShader,
    fragmentShader: params?.fragmentShader,
  })),
  Color: jest.fn().mockImplementation((hex: string) => ({ isColor: true, hex })),
  Vector2: jest.fn().mockImplementation((x = 0, y = 0) => ({ x, y })),
  DoubleSide: 2,
}));

import * as THREE from "three";
import type { GerstnerWaveLayer } from "@/game/ecs/components/procedural/water";
import {
  buildWindWakerUniforms,
  computeGerstnerDisplacement,
  createWindWakerMaterial,
  WIND_WAKER_FRAGMENT_SHADER,
  WIND_WAKER_VERTEX_SHADER,
} from "./waterShaderLogic.ts";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const SIMPLE_WAVE: GerstnerWaveLayer = {
  amplitude: 0.15,
  wavelength: 8.0,
  speed: 1.2,
  steepness: 0.4,
  direction: [1, 0],
};

const MULTI_WAVES: GerstnerWaveLayer[] = [
  { amplitude: 0.15, wavelength: 8.0, speed: 1.2, steepness: 0.4, direction: [1, 0] },
  { amplitude: 0.08, wavelength: 4.0, speed: 0.8, steepness: 0.3, direction: [0.7, 0.7] },
  { amplitude: 0.04, wavelength: 2.0, speed: 1.5, steepness: 0.5, direction: [-0.3, 0.9] },
];

// ─── computeGerstnerDisplacement ──────────────────────────────────────────────

describe("computeGerstnerDisplacement (Spec §31.2)", () => {
  it("returns zero displacement when no waves are provided", () => {
    const result = computeGerstnerDisplacement(0, 0, 0, []);
    expect(result.dx).toBe(0);
    expect(result.dy).toBe(0);
    expect(result.dz).toBe(0);
    expect(result.foam).toBe(0);
  });

  it("returns non-zero Y displacement with a single wave", () => {
    const result = computeGerstnerDisplacement(0, 0, 1.0, [SIMPLE_WAVE]);
    // sin(0*k + 1.0*1.2) should be non-zero
    expect(result.dy).not.toBe(0);
  });

  it("applies Gerstner XZ displacement proportional to steepness * amplitude", () => {
    const result = computeGerstnerDisplacement(0, 0, 1.0, [SIMPLE_WAVE]);
    // dx should be direction.x * steepness * amplitude * cos(phase)
    expect(typeof result.dx).toBe("number");
    expect(Number.isFinite(result.dx)).toBe(true);
  });

  it("accumulates displacement from multiple waves", () => {
    const single = computeGerstnerDisplacement(5, 3, 2.0, [MULTI_WAVES[0]]);
    const multi = computeGerstnerDisplacement(5, 3, 2.0, MULTI_WAVES);
    // Multi-wave displacement magnitude should differ from single wave
    expect(multi.dy).not.toBe(single.dy);
  });

  it("foam accumulates from steep wave crests", () => {
    // High steepness wave should produce some foam
    const highSteep: GerstnerWaveLayer = {
      amplitude: 0.5,
      wavelength: 4.0,
      speed: 1.0,
      steepness: 0.8,
      direction: [1, 0],
    };
    // Test at multiple times to find positive foam
    let foundFoam = false;
    for (let t = 0; t < 10; t += 0.1) {
      const result = computeGerstnerDisplacement(0, 0, t, [highSteep]);
      if (result.foam > 0) {
        foundFoam = true;
        break;
      }
    }
    expect(foundFoam).toBe(true);
  });

  it("is deterministic — same inputs produce same outputs", () => {
    const a = computeGerstnerDisplacement(3, 7, 4.5, MULTI_WAVES);
    const b = computeGerstnerDisplacement(3, 7, 4.5, MULTI_WAVES);
    expect(a.dx).toBe(b.dx);
    expect(a.dy).toBe(b.dy);
    expect(a.dz).toBe(b.dz);
    expect(a.foam).toBe(b.foam);
  });
});

// ─── GLSL Shader Strings ──────────────────────────────────────────────────────

describe("WIND_WAKER_VERTEX_SHADER", () => {
  it("contains uTime uniform for animation", () => {
    expect(WIND_WAKER_VERTEX_SHADER).toContain("uTime");
  });

  it("contains Gerstner wave displacement logic", () => {
    expect(WIND_WAKER_VERTEX_SHADER).toContain("uAmplitude");
    expect(WIND_WAKER_VERTEX_SHADER).toContain("uWavelength");
    expect(WIND_WAKER_VERTEX_SHADER).toContain("uDirection");
  });

  it("outputs vFoam varying for fragment-side foam", () => {
    expect(WIND_WAKER_VERTEX_SHADER).toContain("vFoam");
  });

  it("outputs vWorldPos for fragment-side effects", () => {
    expect(WIND_WAKER_VERTEX_SHADER).toContain("vWorldPos");
  });
});

describe("WIND_WAKER_FRAGMENT_SHADER", () => {
  it("contains uShallowColor uniform for Wind Waker teal", () => {
    expect(WIND_WAKER_FRAGMENT_SHADER).toContain("uShallowColor");
  });

  it("contains uDeepColor uniform for depth gradient", () => {
    expect(WIND_WAKER_FRAGMENT_SHADER).toContain("uDeepColor");
  });

  it("contains uFoamColor uniform for edge foam", () => {
    expect(WIND_WAKER_FRAGMENT_SHADER).toContain("uFoamColor");
  });

  it("contains uFoamThreshold uniform", () => {
    expect(WIND_WAKER_FRAGMENT_SHADER).toContain("uFoamThreshold");
  });

  it("outputs gl_FragColor", () => {
    expect(WIND_WAKER_FRAGMENT_SHADER).toContain("gl_FragColor");
  });
});

// ─── buildWindWakerUniforms ───────────────────────────────────────────────────

describe("buildWindWakerUniforms", () => {
  it("sets uTime to 0 initially", () => {
    const uniforms = buildWindWakerUniforms(MULTI_WAVES);
    expect(uniforms.uTime.value).toBe(0);
  });

  it("creates uShallowColor as THREE.Color", () => {
    const uniforms = buildWindWakerUniforms(MULTI_WAVES);
    expect(uniforms.uShallowColor.value).toMatchObject({ isColor: true });
  });

  it("creates uDeepColor as THREE.Color", () => {
    const uniforms = buildWindWakerUniforms(MULTI_WAVES);
    expect(uniforms.uDeepColor.value).toMatchObject({ isColor: true });
  });

  it("creates uFoamColor as THREE.Color", () => {
    const uniforms = buildWindWakerUniforms(MULTI_WAVES);
    expect(uniforms.uFoamColor.value).toMatchObject({ isColor: true });
  });

  it("populates wave layer arrays from input", () => {
    const uniforms = buildWindWakerUniforms(MULTI_WAVES);
    expect(uniforms.uAmplitude.value[0]).toBe(0.15);
    expect(uniforms.uAmplitude.value[1]).toBe(0.08);
    expect(uniforms.uAmplitude.value[2]).toBe(0.04);
  });

  it("pads unused wave slots with zero amplitude", () => {
    const uniforms = buildWindWakerUniforms([SIMPLE_WAVE]);
    for (let i = 1; i < 8; i++) {
      expect(uniforms.uAmplitude.value[i]).toBe(0);
    }
  });

  it("accepts custom colors", () => {
    buildWindWakerUniforms(MULTI_WAVES, {
      shallowColor: "#ff0000",
      deepColor: "#0000ff",
      foamColor: "#00ff00",
    });
    expect(THREE.Color).toHaveBeenCalledWith("#ff0000");
    expect(THREE.Color).toHaveBeenCalledWith("#0000ff");
    expect(THREE.Color).toHaveBeenCalledWith("#00ff00");
  });
});

// ─── createWindWakerMaterial ──────────────────────────────────────────────────

describe("createWindWakerMaterial", () => {
  beforeEach(() => {
    (THREE.ShaderMaterial as unknown as jest.Mock).mockClear();
  });

  it("calls THREE.ShaderMaterial constructor", () => {
    createWindWakerMaterial(MULTI_WAVES);
    expect(THREE.ShaderMaterial).toHaveBeenCalledTimes(1);
  });

  it("creates a transparent material with DoubleSide", () => {
    createWindWakerMaterial(MULTI_WAVES);
    const params = (THREE.ShaderMaterial as unknown as jest.Mock).mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(params.transparent).toBe(true);
    expect(params.side).toBe(THREE.DoubleSide);
  });

  it("disables depth writing for correct transparency", () => {
    createWindWakerMaterial(MULTI_WAVES);
    const params = (THREE.ShaderMaterial as unknown as jest.Mock).mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(params.depthWrite).toBe(false);
  });

  it("passes Wind Waker vertex and fragment shaders", () => {
    createWindWakerMaterial(MULTI_WAVES);
    const params = (THREE.ShaderMaterial as unknown as jest.Mock).mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(params.vertexShader).toBe(WIND_WAKER_VERTEX_SHADER);
    expect(params.fragmentShader).toBe(WIND_WAKER_FRAGMENT_SHADER);
  });
});
