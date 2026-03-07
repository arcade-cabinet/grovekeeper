/**
 * Gerstner water shader tests (Spec §31.2).
 *
 * Tests the pure buildGerstnerUniforms function, GLSL string content,
 * and material factory. THREE.js constructors are mocked to avoid WebGL.
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
  Color: jest
    .fn()
    .mockImplementation((hex: string) => ({ isColor: true, hex, set: jest.fn() })),
  Vector2: jest
    .fn()
    .mockImplementation((x = 0, y = 0) => ({ x, y, isVector2: true })),
  DoubleSide: 2,
  IUniform: undefined,
}));

import * as THREE from "three";
import type { WaterBodyComponent } from "@/game/ecs/components/procedural/water";
import {
  MAX_WAVE_LAYERS,
  GERSTNER_VERTEX_SHADER,
  GERSTNER_FRAGMENT_SHADER,
  buildGerstnerUniforms,
  createGerstnerMaterial,
  updateGerstnerTime,
} from "@/game/shaders/gerstnerWater";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const pondWaterBody: WaterBodyComponent = {
  waterType: "pond",
  waveLayers: [
    { amplitude: 0.02, wavelength: 3, speed: 0.3, steepness: 0.1, direction: [1, 0] },
  ],
  color: "#3d9ea0",
  opacity: 0.7,
  size: { width: 5, depth: 5 },
  foamEnabled: false,
  foamThreshold: 0.6,
  causticsEnabled: true,
  flowDirection: [0, 0],
  flowSpeed: 0,
};

const oceanWaterBody: WaterBodyComponent = {
  waterType: "ocean",
  waveLayers: [
    { amplitude: 0.8, wavelength: 12, speed: 1.2, steepness: 0.5, direction: [1, 0] },
    { amplitude: 0.5, wavelength: 8, speed: 1.5, steepness: 0.4, direction: [0.7, 0.7] },
    { amplitude: 0.3, wavelength: 5, speed: 2.0, steepness: 0.3, direction: [-1, 0] },
    { amplitude: 0.2, wavelength: 3, speed: 2.5, steepness: 0.2, direction: [0, 1] },
  ],
  color: "#1a5276",
  opacity: 0.9,
  size: { width: 64, depth: 64 },
  foamEnabled: true,
  foamThreshold: 0.6,
  causticsEnabled: false,
  flowDirection: [0, 0],
  flowSpeed: 0,
};

// ─── Constants ────────────────────────────────────────────────────────────────

describe("MAX_WAVE_LAYERS", () => {
  it("equals 8", () => {
    expect(MAX_WAVE_LAYERS).toBe(8);
  });
});

// ─── GLSL strings ─────────────────────────────────────────────────────────────

describe("GERSTNER_VERTEX_SHADER", () => {
  it("contains uAmplitude uniform declaration", () => {
    expect(GERSTNER_VERTEX_SHADER).toContain("uAmplitude");
  });

  it("contains uWavelength uniform declaration", () => {
    expect(GERSTNER_VERTEX_SHADER).toContain("uWavelength");
  });

  it("contains uDirection uniform declaration", () => {
    expect(GERSTNER_VERTEX_SHADER).toContain("uDirection");
  });

  it("contains TWO_PI constant for wave frequency computation", () => {
    expect(GERSTNER_VERTEX_SHADER).toContain("TWO_PI");
  });

  it("contains uTime uniform for animation", () => {
    expect(GERSTNER_VERTEX_SHADER).toContain("uTime");
  });

  it("contains vFoam varying for fragment-side foam", () => {
    expect(GERSTNER_VERTEX_SHADER).toContain("vFoam");
  });

  it("contains loop up to MAX_WAVE_LAYERS", () => {
    expect(GERSTNER_VERTEX_SHADER).toContain(`${MAX_WAVE_LAYERS}`);
  });
});

describe("GERSTNER_FRAGMENT_SHADER", () => {
  it("contains uWaterColor uniform", () => {
    expect(GERSTNER_FRAGMENT_SHADER).toContain("uWaterColor");
  });

  it("contains uOpacity uniform", () => {
    expect(GERSTNER_FRAGMENT_SHADER).toContain("uOpacity");
  });

  it("contains uFoamEnabled uniform", () => {
    expect(GERSTNER_FRAGMENT_SHADER).toContain("uFoamEnabled");
  });

  it("contains uFoamThreshold uniform", () => {
    expect(GERSTNER_FRAGMENT_SHADER).toContain("uFoamThreshold");
  });

  it("outputs gl_FragColor", () => {
    expect(GERSTNER_FRAGMENT_SHADER).toContain("gl_FragColor");
  });
});

// ─── buildGerstnerUniforms ─────────────────────────────────────────────────────

describe("buildGerstnerUniforms — pond (1 layer)", () => {
  let uniforms: ReturnType<typeof buildGerstnerUniforms>;

  beforeEach(() => {
    uniforms = buildGerstnerUniforms(pondWaterBody);
  });

  it("sets uWaveCount to the number of wave layers", () => {
    expect(uniforms.uWaveCount.value).toBe(1);
  });

  it("sets uTime to 0 initially", () => {
    expect(uniforms.uTime.value).toBe(0);
  });

  it("sets uOpacity from waterBody.opacity", () => {
    expect(uniforms.uOpacity.value).toBe(0.7);
  });

  it("sets uFoamEnabled from waterBody.foamEnabled", () => {
    expect(uniforms.uFoamEnabled.value).toBe(false);
  });

  it("sets uFoamThreshold from waterBody.foamThreshold", () => {
    expect(uniforms.uFoamThreshold.value).toBe(0.6);
  });

  it("constructs uWaterColor as a THREE.Color from waterBody.color", () => {
    const MockColor = THREE.Color as unknown as jest.Mock;
    expect(MockColor).toHaveBeenCalledWith(pondWaterBody.color);
    expect(uniforms.uWaterColor.value).toMatchObject({ isColor: true });
  });

  it("populates amplitude[0] from layer", () => {
    expect(uniforms.uAmplitude.value[0]).toBe(0.02);
  });

  it("pads amplitude[1..7] with zeros", () => {
    for (let i = 1; i < MAX_WAVE_LAYERS; i++) {
      expect(uniforms.uAmplitude.value[i]).toBe(0);
    }
  });

  it("populates wavelength[0] from layer", () => {
    expect(uniforms.uWavelength.value[0]).toBe(3);
  });

  it("pads wavelength[1..7] with 1 (avoids div-by-zero)", () => {
    for (let i = 1; i < MAX_WAVE_LAYERS; i++) {
      expect(uniforms.uWavelength.value[i]).toBe(1);
    }
  });

  it("populates speed[0] from layer", () => {
    expect(uniforms.uSpeed.value[0]).toBe(0.3);
  });

  it("populates steepness[0] from layer", () => {
    expect(uniforms.uSteepness.value[0]).toBe(0.1);
  });

  it("populates direction[0] with Vector2(1, 0)", () => {
    expect(uniforms.uDirection.value[0]).toMatchObject({ x: 1, y: 0 });
  });

  it("produces arrays of length MAX_WAVE_LAYERS", () => {
    expect(uniforms.uAmplitude.value).toHaveLength(MAX_WAVE_LAYERS);
    expect(uniforms.uWavelength.value).toHaveLength(MAX_WAVE_LAYERS);
    expect(uniforms.uSpeed.value).toHaveLength(MAX_WAVE_LAYERS);
    expect(uniforms.uSteepness.value).toHaveLength(MAX_WAVE_LAYERS);
    expect(uniforms.uDirection.value).toHaveLength(MAX_WAVE_LAYERS);
  });
});

describe("buildGerstnerUniforms — ocean (4 layers)", () => {
  let uniforms: ReturnType<typeof buildGerstnerUniforms>;

  beforeEach(() => {
    uniforms = buildGerstnerUniforms(oceanWaterBody);
  });

  it("sets uWaveCount to 4", () => {
    expect(uniforms.uWaveCount.value).toBe(4);
  });

  it("sets uFoamEnabled to true", () => {
    expect(uniforms.uFoamEnabled.value).toBe(true);
  });

  it("populates all 4 amplitude values", () => {
    expect(uniforms.uAmplitude.value[0]).toBe(0.8);
    expect(uniforms.uAmplitude.value[1]).toBe(0.5);
    expect(uniforms.uAmplitude.value[2]).toBe(0.3);
    expect(uniforms.uAmplitude.value[3]).toBe(0.2);
  });

  it("populates all 4 direction vectors correctly", () => {
    expect(uniforms.uDirection.value[0]).toMatchObject({ x: 1, y: 0 });
    expect(uniforms.uDirection.value[1]).toMatchObject({ x: 0.7, y: 0.7 });
    expect(uniforms.uDirection.value[2]).toMatchObject({ x: -1, y: 0 });
    expect(uniforms.uDirection.value[3]).toMatchObject({ x: 0, y: 1 });
  });

  it("pads amplitude[4..7] with zeros", () => {
    for (let i = 4; i < MAX_WAVE_LAYERS; i++) {
      expect(uniforms.uAmplitude.value[i]).toBe(0);
    }
  });
});

describe("buildGerstnerUniforms — clamping to MAX_WAVE_LAYERS", () => {
  it("clamps wave count when more than MAX_WAVE_LAYERS layers are provided", () => {
    const manyLayers: WaterBodyComponent = {
      ...pondWaterBody,
      waveLayers: Array.from({ length: 10 }, (_, i) => ({
        amplitude: 0.1 * (i + 1),
        wavelength: 4,
        speed: 0.5,
        steepness: 0.2,
        direction: [1, 0] as [number, number],
      })),
    };

    const uniforms = buildGerstnerUniforms(manyLayers);
    expect(uniforms.uWaveCount.value).toBe(MAX_WAVE_LAYERS);
    expect(uniforms.uAmplitude.value).toHaveLength(MAX_WAVE_LAYERS);
    // Only first MAX_WAVE_LAYERS layers should be used
    expect(uniforms.uAmplitude.value[MAX_WAVE_LAYERS - 1]).toBe(
      0.1 * MAX_WAVE_LAYERS,
    );
  });
});

// ─── createGerstnerMaterial ────────────────────────────────────────────────────

describe("createGerstnerMaterial", () => {
  it("calls THREE.ShaderMaterial constructor", () => {
    const MockShaderMaterial = THREE.ShaderMaterial as unknown as jest.Mock;
    MockShaderMaterial.mockClear();

    createGerstnerMaterial(pondWaterBody);

    expect(MockShaderMaterial).toHaveBeenCalledTimes(1);
  });

  it("passes vertexShader and fragmentShader", () => {
    const MockShaderMaterial = THREE.ShaderMaterial as unknown as jest.Mock;
    MockShaderMaterial.mockClear();

    createGerstnerMaterial(pondWaterBody);

    const params = MockShaderMaterial.mock.calls[0][0] as Record<string, unknown>;
    expect(params.vertexShader).toBe(GERSTNER_VERTEX_SHADER);
    expect(params.fragmentShader).toBe(GERSTNER_FRAGMENT_SHADER);
  });

  it("creates a transparent material with DoubleSide", () => {
    const MockShaderMaterial = THREE.ShaderMaterial as unknown as jest.Mock;
    MockShaderMaterial.mockClear();

    createGerstnerMaterial(pondWaterBody);

    const params = MockShaderMaterial.mock.calls[0][0] as Record<string, unknown>;
    expect(params.transparent).toBe(true);
    expect(params.side).toBe(THREE.DoubleSide);
  });

  it("disables depth writing (required for transparent water)", () => {
    const MockShaderMaterial = THREE.ShaderMaterial as unknown as jest.Mock;
    MockShaderMaterial.mockClear();

    createGerstnerMaterial(pondWaterBody);

    const params = MockShaderMaterial.mock.calls[0][0] as Record<string, unknown>;
    expect(params.depthWrite).toBe(false);
  });
});

// ─── updateGerstnerTime ────────────────────────────────────────────────────────

describe("updateGerstnerTime", () => {
  it("updates uTime.value on the material", () => {
    const mockMaterial = {
      uniforms: { uTime: { value: 0 } },
    } as unknown as THREE.ShaderMaterial;

    updateGerstnerTime(mockMaterial, 3.14);

    expect(mockMaterial.uniforms.uTime.value).toBe(3.14);
  });

  it("advances time correctly across multiple calls", () => {
    const mockMaterial = {
      uniforms: { uTime: { value: 0 } },
    } as unknown as THREE.ShaderMaterial;

    updateGerstnerTime(mockMaterial, 1.0);
    expect(mockMaterial.uniforms.uTime.value).toBe(1.0);

    updateGerstnerTime(mockMaterial, 2.5);
    expect(mockMaterial.uniforms.uTime.value).toBe(2.5);
  });
});
