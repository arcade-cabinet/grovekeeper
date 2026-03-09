/**
 * Tests for procedural texture factory.
 * Spec §42 — Procedural Architecture (texture subsystem).
 */
import { type CanvasFactory, createTextureCanvas, TEXTURE_TYPES } from "./proceduralTextures.ts";

/**
 * Minimal canvas stub for testing without jsdom/browser.
 * Records draw operations and provides getImageData for pixel checks.
 */
function createTestCanvasFactory(): {
  factory: CanvasFactory;
  lastFillStyle: () => string;
} {
  let storedFillStyle = "";

  const factory: CanvasFactory = (w, h) => {
    // Create a minimal object that satisfies HTMLCanvasElement interface
    // enough for our drawing code to execute without errors.
    const pixels = new Uint8ClampedArray(w * h * 4);

    const ctx = {
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 1,
      fillRect(x: number, y: number, fw: number, fh: number) {
        // Parse fill color and write to pixels array (simplified)
        storedFillStyle = String(this.fillStyle);
        const color = parseCSSColor(storedFillStyle);
        const x0 = Math.max(0, Math.floor(x));
        const y0 = Math.max(0, Math.floor(y));
        const x1 = Math.min(w, Math.floor(x + fw));
        const y1 = Math.min(h, Math.floor(y + fh));
        for (let py = y0; py < y1; py++) {
          for (let px = x0; px < x1; px++) {
            const i = (py * w + px) * 4;
            pixels[i] = color[0];
            pixels[i + 1] = color[1];
            pixels[i + 2] = color[2];
            pixels[i + 3] = 255;
          }
        }
      },
      beginPath() {},
      arc() {},
      fill() {},
      moveTo() {},
      lineTo() {},
      stroke() {},
      createLinearGradient() {
        return {
          addColorStop() {},
        };
      },
      createRadialGradient() {
        return {
          addColorStop() {},
        };
      },
      getImageData(gx: number, gy: number, gw: number, gh: number) {
        const data = new Uint8ClampedArray(gw * gh * 4);
        for (let dy = 0; dy < gh; dy++) {
          for (let dx = 0; dx < gw; dx++) {
            const si = ((gy + dy) * w + (gx + dx)) * 4;
            const di = (dy * gw + dx) * 4;
            data[di] = pixels[si];
            data[di + 1] = pixels[si + 1];
            data[di + 2] = pixels[si + 2];
            data[di + 3] = pixels[si + 3];
          }
        }
        return { data, width: gw, height: gh };
      },
    };

    return {
      width: w,
      height: h,
      getContext: () => ctx,
    } as unknown as HTMLCanvasElement;
  };

  return { factory, lastFillStyle: () => storedFillStyle };
}

/** Parse a subset of CSS colors to [r,g,b]. */
function parseCSSColor(s: string): [number, number, number] {
  if (s.startsWith("#")) {
    const hex = s.slice(1);
    if (hex.length === 6) {
      return [
        Number.parseInt(hex.slice(0, 2), 16),
        Number.parseInt(hex.slice(2, 4), 16),
        Number.parseInt(hex.slice(4, 6), 16),
      ];
    }
  }
  if (s.startsWith("rgb")) {
    const m = s.match(/(\d+)/g);
    if (m && m.length >= 3) {
      return [Number(m[0]), Number(m[1]), Number(m[2])];
    }
  }
  return [128, 128, 128]; // fallback gray
}

describe("proceduralTextures (Spec §42)", () => {
  it("generates a canvas for each texture type", () => {
    const { factory } = createTestCanvasFactory();
    for (const type of TEXTURE_TYPES) {
      const canvas = createTextureCanvas(type, 256, Math.random, factory);
      expect(canvas).toBeDefined();
      expect(canvas.width).toBe(256);
      expect(canvas.height).toBe(256);
    }
  });

  it("generates different base fill for different types", () => {
    const { factory } = createTestCanvasFactory();
    // Brick base = #6b4034, plaster base = #e0d8cc
    const brickCanvas = createTextureCanvas("brick", 64, Math.random, factory);
    const plasterCanvas = createTextureCanvas("plaster", 64, Math.random, factory);

    const brickCtx = brickCanvas.getContext("2d")!;
    const plasterCtx = plasterCanvas.getContext("2d")!;

    // Check pixel at (0,0) — base fill color differs
    const brickData = brickCtx.getImageData(0, 0, 1, 1).data;
    const plasterData = plasterCtx.getImageData(0, 0, 1, 1).data;

    expect(brickData[0]).not.toBe(plasterData[0]);
  });

  it("uses seeded RNG when provided", () => {
    const { factory } = createTestCanvasFactory();
    const rng1 = () => 0.5;
    const rng2 = () => 0.5;

    const c1 = createTextureCanvas("plaster", 64, rng1, factory);
    const c2 = createTextureCanvas("plaster", 64, rng2, factory);

    const d1 = c1.getContext("2d")!.getImageData(32, 32, 1, 1).data;
    const d2 = c2.getContext("2d")!.getImageData(32, 32, 1, 1).data;

    // Same RNG → same output
    expect(d1[0]).toBe(d2[0]);
    expect(d1[1]).toBe(d2[1]);
    expect(d1[2]).toBe(d2[2]);
  });

  it("TEXTURE_TYPES array is complete", () => {
    expect(TEXTURE_TYPES).toContain("brick");
    expect(TEXTURE_TYPES).toContain("plaster");
    expect(TEXTURE_TYPES).toContain("wood");
    expect(TEXTURE_TYPES).toContain("stone");
    expect(TEXTURE_TYPES).toContain("roof");
    expect(TEXTURE_TYPES).toContain("road");
    expect(TEXTURE_TYPES).toContain("grass");
    expect(TEXTURE_TYPES).toContain("leaves");
    expect(TEXTURE_TYPES).toContain("hedge");
    expect(TEXTURE_TYPES).toContain("door");
  });
});
