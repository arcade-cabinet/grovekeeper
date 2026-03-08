/**
 * Tests for procedural building geometry generator.
 * Spec §42 — Procedural Architecture.
 * Spec §43.3 — Building Interior Furnishings.
 * Spec §43.4 — Door and Window Openings.
 */

// Load config values for assertions
import structuresConfig from "../../config/game/structures.json" with { type: "json" };
import {
  buildColliderArrays,
  floorSurfaceY,
  generateBlueprintInterior,
  generateBlueprintOpenings,
  generateBuildingBoxes,
} from "./buildingGeometry/index.ts";

const cfg = structuresConfig.proceduralBuilding;

describe("buildingGeometry (Spec §42)", () => {
  describe("floorSurfaceY", () => {
    it("returns 0 for ground level", () => {
      expect(floorSurfaceY(0)).toBe(0);
    });

    it("returns wallH for level 1", () => {
      expect(floorSurfaceY(1)).toBe(cfg.wallH);
    });

    it("returns n * wallH for level n", () => {
      expect(floorSurfaceY(3)).toBe(3 * cfg.wallH);
    });
  });

  describe("generateBuildingBoxes", () => {
    it("generates boxes for a 1-story building", () => {
      const boxes = generateBuildingBoxes(cfg.tileSize, cfg.tileSize, 1);
      expect(boxes.length).toBeGreaterThan(0);
      // 1-story: 4 walls + 1 ground floor + 1 roof = 6 minimum
      expect(boxes.length).toBeGreaterThanOrEqual(6);
    });

    it("generates more boxes for multi-story buildings", () => {
      const boxes1 = generateBuildingBoxes(cfg.tileSize, cfg.tileSize, 1);
      const boxes2 = generateBuildingBoxes(cfg.tileSize, cfg.tileSize, 2);
      const boxes3 = generateBuildingBoxes(cfg.tileSize, cfg.tileSize, 3);
      expect(boxes2.length).toBeGreaterThan(boxes1.length);
      expect(boxes3.length).toBeGreaterThan(boxes2.length);
    });

    it("includes wall, floor, stair, and roof material types", () => {
      const boxes = generateBuildingBoxes(cfg.tileSize, cfg.tileSize, 2);
      const types = new Set(boxes.map((b) => b.mat));
      expect(types.has("wall")).toBe(true);
      expect(types.has("floor")).toBe(true);
      expect(types.has("stair")).toBe(true);
      expect(types.has("roof")).toBe(true);
    });

    it("has no stairs in a 1-story building", () => {
      const boxes = generateBuildingBoxes(cfg.tileSize, cfg.tileSize, 1);
      const stairs = boxes.filter((b) => b.mat === "stair");
      expect(stairs.length).toBe(0);
    });

    it("produces stairs for multi-story buildings", () => {
      const boxes = generateBuildingBoxes(cfg.tileSize, cfg.tileSize, 2);
      const stairs = boxes.filter((b) => b.mat === "stair");
      expect(stairs.length).toBe(cfg.stairSteps);
    });

    // KEY STAIR CLIPPING FIX TEST
    it("stair top surface matches next floor surface exactly", () => {
      const boxes = generateBuildingBoxes(cfg.tileSize, cfg.tileSize, 2);
      const stairs = boxes.filter((b) => b.mat === "stair");
      // Top step (last stair) should have top surface = floorSurfaceY(1)
      const topStep = stairs[stairs.length - 1];
      const topStepSurface = topStep.cy + topStep.h / 2;
      expect(topStepSurface).toBeCloseTo(floorSurfaceY(1), 5);
    });

    it("floor slab top surface matches floorSurfaceY exactly", () => {
      const boxes = generateBuildingBoxes(cfg.tileSize, cfg.tileSize, 2);
      const floors = boxes.filter(
        (b) => b.mat === "floor" && b.cy > 0.5, // Skip ground floor
      );
      expect(floors.length).toBeGreaterThan(0);
      for (const floor of floors) {
        const topSurface = floor.cy + floor.h / 2;
        // Should be at an integer floor level
        const level = Math.round(topSurface / cfg.wallH);
        expect(topSurface).toBeCloseTo(floorSurfaceY(level), 5);
      }
    });

    it("all box dimensions are positive", () => {
      const boxes = generateBuildingBoxes(cfg.tileSize * 2, cfg.tileSize, 3);
      for (const box of boxes) {
        expect(box.w).toBeGreaterThan(0);
        expect(box.h).toBeGreaterThan(0);
        expect(box.d).toBeGreaterThan(0);
      }
    });

    it("all boxes are within building footprint bounds", () => {
      const fpW = cfg.tileSize * 2;
      const fpD = cfg.tileSize;
      const stories = 2;
      const boxes = generateBuildingBoxes(fpW, fpD, stories);

      for (const box of boxes) {
        // Box center +/- half-extent should be within footprint + small tolerance
        const tolerance = 0.5; // roof overhang
        expect(box.cx - box.w / 2).toBeGreaterThanOrEqual(-tolerance);
        expect(box.cx + box.w / 2).toBeLessThanOrEqual(fpW + tolerance);
        expect(box.cz - box.d / 2).toBeGreaterThanOrEqual(-tolerance);
        expect(box.cz + box.d / 2).toBeLessThanOrEqual(fpD + tolerance);
      }
    });

    it("roof sits at top of building", () => {
      const stories = 3;
      const boxes = generateBuildingBoxes(cfg.tileSize, cfg.tileSize, stories);
      const roof = boxes.find((b) => b.mat === "roof");
      expect(roof).toBeDefined();
      // Roof bottom should be at or near stories * wallH
      const roofBottom = roof!.cy - roof!.h / 2;
      expect(roofBottom).toBeCloseTo(floorSurfaceY(stories), 0.5);
    });
  });

  describe("buildColliderArrays", () => {
    it("returns typed arrays with correct sizes", () => {
      const boxes = generateBuildingBoxes(cfg.tileSize, cfg.tileSize, 1);
      const { vertices, indices } = buildColliderArrays(boxes);

      // Each box = 8 vertices * 3 floats = 24 floats
      expect(vertices.length).toBe(boxes.length * 24);
      // Each box = 12 triangles * 3 indices = 36 indices
      expect(indices.length).toBe(boxes.length * 36);
    });

    it("returns Float32Array and Uint32Array", () => {
      const boxes = generateBuildingBoxes(cfg.tileSize, cfg.tileSize, 1);
      const { vertices, indices } = buildColliderArrays(boxes);
      expect(vertices).toBeInstanceOf(Float32Array);
      expect(indices).toBeInstanceOf(Uint32Array);
    });

    it("indices reference valid vertex positions", () => {
      const boxes = generateBuildingBoxes(cfg.tileSize, cfg.tileSize, 2);
      const { vertices, indices } = buildColliderArrays(boxes);
      const vertexCount = vertices.length / 3;
      for (let i = 0; i < indices.length; i++) {
        expect(indices[i]).toBeLessThan(vertexCount);
        expect(indices[i]).toBeGreaterThanOrEqual(0);
      }
    });

    it("handles empty box array", () => {
      const { vertices, indices } = buildColliderArrays([]);
      expect(vertices.length).toBe(0);
      expect(indices.length).toBe(0);
    });
  });
});

// ---------------------------------------------------------------------------
// Blueprint dimensions used by §43.3 and §43.4 tests
// ---------------------------------------------------------------------------

/** Footprint configs matching structures.json blueprints. */
const BP = {
  cottage: { footprintW: 3, footprintD: 3, stories: 1 },
  townhouse: { footprintW: 3, footprintD: 4, stories: 2 },
  barn: { footprintW: 4, footprintD: 5, stories: 1 },
  inn: { footprintW: 4, footprintD: 4, stories: 2 },
  forge: { footprintW: 4, footprintD: 3, stories: 1 },
  kitchen: { footprintW: 3, footprintD: 3, stories: 1 },
  apothecary: { footprintW: 3, footprintD: 3, stories: 1 },
  watchtower: { footprintW: 2, footprintD: 2, stories: 3 },
  storehouse: { footprintW: 3, footprintD: 3, stories: 1 },
  chapel: { footprintW: 3, footprintD: 4, stories: 1 },
} as const;

// ---------------------------------------------------------------------------
// §43.3 — Blueprint Interior Furnishings
// ---------------------------------------------------------------------------

describe("Blueprint Interior (Spec §43.3)", () => {
  it("all blueprints return non-empty BoxSpec[]", () => {
    for (const [id, dims] of Object.entries(BP)) {
      const boxes = generateBlueprintInterior(
        id as keyof typeof BP,
        dims.footprintW,
        dims.footprintD,
        dims.stories,
        42,
      );
      expect(boxes.length).toBeGreaterThan(0);
    }
  });

  it("cottage has exactly 2 furnishing boxes (bed + chest)", () => {
    const { footprintW, footprintD, stories } = BP.cottage;
    const boxes = generateBlueprintInterior("cottage", footprintW, footprintD, stories, 0);
    expect(boxes.length).toBe(2);
    const mats = boxes.map((b) => b.mat);
    expect(mats.every((m) => m === "furniture")).toBe(true);
  });

  it("barn has 3 hay bales with 'hay' mat type", () => {
    const { footprintW, footprintD, stories } = BP.barn;
    const boxes = generateBlueprintInterior("barn", footprintW, footprintD, stories, 0);
    const hayBales = boxes.filter((b) => b.mat === "hay");
    expect(hayBales.length).toBe(3);
  });

  it("barn includes a trough with 'furniture' mat type", () => {
    const { footprintW, footprintD, stories } = BP.barn;
    const boxes = generateBlueprintInterior("barn", footprintW, footprintD, stories, 0);
    const furniture = boxes.filter((b) => b.mat === "furniture");
    expect(furniture.length).toBeGreaterThanOrEqual(1);
  });

  it("forge has at least one chimney box with 'chimney' mat type", () => {
    const { footprintW, footprintD, stories } = BP.forge;
    const boxes = generateBlueprintInterior("forge", footprintW, footprintD, stories, 0);
    const chimneys = boxes.filter((b) => b.mat === "chimney");
    expect(chimneys.length).toBeGreaterThanOrEqual(1);
  });

  it("forge chimney reaches above wallH (extends through roof)", () => {
    const { footprintW, footprintD, stories } = BP.forge;
    const boxes = generateBlueprintInterior("forge", footprintW, footprintD, stories, 0);
    const chimneyCol = boxes.find((b) => b.mat === "chimney" && b.h > cfg.wallH);
    expect(chimneyCol).toBeDefined();
    // Chimney top must be above the roof line
    expect(chimneyCol!.cy + chimneyCol!.h / 2).toBeGreaterThan(cfg.wallH * stories);
  });

  it("all furnishings inset from walls — no box extends past footprint", () => {
    for (const [id, dims] of Object.entries(BP)) {
      const boxes = generateBlueprintInterior(
        id as keyof typeof BP,
        dims.footprintW,
        dims.footprintD,
        dims.stories,
        99,
      );
      for (const box of boxes) {
        // Allow wall-mounted items (railing, shelf) to touch wall face; variation
        // jitter can push ±0.1 so tolerance is 0.15 to account for jitter + rounding.
        expect(box.cx - box.w / 2).toBeGreaterThanOrEqual(-0.15);
        expect(box.cx + box.w / 2).toBeLessThanOrEqual(dims.footprintW + 0.15);
        expect(box.cz - box.d / 2).toBeGreaterThanOrEqual(-0.15);
        expect(box.cz + box.d / 2).toBeLessThanOrEqual(dims.footprintD + 0.15);
      }
    }
  });

  it("watchtower has railing only on top floor — Y above second-to-last floor", () => {
    const { footprintW, footprintD, stories } = BP.watchtower;
    const boxes = generateBlueprintInterior("watchtower", footprintW, footprintD, stories, 0);
    const topFloorY = floorSurfaceY(stories - 1);
    for (const box of boxes) {
      // All railing centers must be at or above the top floor surface
      expect(box.cy).toBeGreaterThanOrEqual(topFloorY);
    }
  });

  it("chapel has exactly 4 pew boxes", () => {
    const { footprintW, footprintD, stories } = BP.chapel;
    const boxes = generateBlueprintInterior("chapel", footprintW, footprintD, stories, 0);
    expect(boxes.length).toBe(4);
    const mats = boxes.map((b) => b.mat);
    expect(mats.every((m) => m === "furniture")).toBe(true);
  });

  it("storehouse has 4 crates and 2 barrels", () => {
    const { footprintW, footprintD, stories } = BP.storehouse;
    const boxes = generateBlueprintInterior("storehouse", footprintW, footprintD, stories, 0);
    // All are "furniture"; distinguish by dimensions
    const crates = boxes.filter(
      (b) => b.mat === "furniture" && Math.abs(b.w - 0.6) < 0.01 && Math.abs(b.h - 0.6) < 0.01,
    );
    const barrels = boxes.filter(
      (b) => b.mat === "furniture" && Math.abs(b.w - 0.4) < 0.01 && Math.abs(b.h - 0.8) < 0.01,
    );
    expect(crates.length).toBe(4);
    expect(barrels.length).toBe(2);
  });

  it("inn has a counter and fireplace on ground floor, beds upstairs", () => {
    const { footprintW, footprintD, stories } = BP.inn;
    const boxes = generateBlueprintInterior("inn", footprintW, footprintD, stories, 0);
    // Fireplace (chimney) on ground floor
    const fireplace = boxes.find((b) => b.mat === "chimney" && b.cy < cfg.wallH);
    expect(fireplace).toBeDefined();
    // Counter (furniture) on ground floor
    const counter = boxes.find((b) => b.mat === "furniture" && b.cy < cfg.wallH && b.w > 1.5);
    expect(counter).toBeDefined();
    // 2 beds on upper floor
    const beds = boxes.filter((b) => b.mat === "furniture" && b.cy >= cfg.wallH);
    expect(beds.length).toBe(2);
  });

  it("variation parameter produces consistent jitter (deterministic)", () => {
    const { footprintW, footprintD, stories } = BP.cottage;
    const a = generateBlueprintInterior("cottage", footprintW, footprintD, stories, 7);
    const b = generateBlueprintInterior("cottage", footprintW, footprintD, stories, 7);
    expect(a[0].cx).toBe(b[0].cx);
    expect(a[0].cz).toBe(b[0].cz);
  });

  it("different variation values produce different positions", () => {
    const { footprintW, footprintD, stories } = BP.cottage;
    const a = generateBlueprintInterior("cottage", footprintW, footprintD, stories, 1);
    const b = generateBlueprintInterior("cottage", footprintW, footprintD, stories, 99);
    // At least one box should differ
    const differs = a.some((boxA, i) => boxA.cx !== b[i].cx || boxA.cz !== b[i].cz);
    expect(differs).toBe(true);
  });

  it("all box dimensions are positive for every blueprint", () => {
    for (const [id, dims] of Object.entries(BP)) {
      const boxes = generateBlueprintInterior(
        id as keyof typeof BP,
        dims.footprintW,
        dims.footprintD,
        dims.stories,
        42,
      );
      for (const box of boxes) {
        expect(box.w).toBeGreaterThan(0);
        expect(box.h).toBeGreaterThan(0);
        expect(box.d).toBeGreaterThan(0);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// §43.4 — Door and Window Openings
// ---------------------------------------------------------------------------

describe("Blueprint Openings (Spec §43.4)", () => {
  it("every non-watchtower blueprint gets at least 1 door", () => {
    const nonTower = Object.entries(BP).filter(([id]) => id !== "watchtower");
    for (const [id, dims] of nonTower) {
      const boxes = generateBlueprintOpenings(
        id as keyof typeof BP,
        dims.footprintW,
        dims.footprintD,
        dims.stories,
        0,
      );
      const doors = boxes.filter((b) => b.mat === "door");
      expect(doors.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("watchtower has no door", () => {
    const { footprintW, footprintD, stories } = BP.watchtower;
    const boxes = generateBlueprintOpenings("watchtower", footprintW, footprintD, stories, 0);
    const doors = boxes.filter((b) => b.mat === "door");
    expect(doors.length).toBe(0);
  });

  it("door is positioned on the facing wall — facing 0 (+Z)", () => {
    const { footprintW, footprintD, stories } = BP.cottage;
    const boxes = generateBlueprintOpenings("cottage", footprintW, footprintD, stories, 0);
    const door = boxes.find((b) => b.mat === "door")!;
    // facing 0 → front (+Z) wall, cz should equal footprintD − wallThickness/2
    expect(door.cz).toBeCloseTo(footprintD - cfg.wallThickness / 2, 3);
  });

  it("door is positioned on the facing wall — facing 90 (+X)", () => {
    const { footprintW, footprintD, stories } = BP.cottage;
    const boxes = generateBlueprintOpenings("cottage", footprintW, footprintD, stories, 90);
    const door = boxes.find((b) => b.mat === "door")!;
    // facing 90 → right (+X) wall, cx should equal footprintW − wallThickness/2
    expect(door.cx).toBeCloseTo(footprintW - cfg.wallThickness / 2, 3);
  });

  it("door is positioned on the facing wall — facing 180 (−Z)", () => {
    const { footprintW, footprintD, stories } = BP.cottage;
    const boxes = generateBlueprintOpenings("cottage", footprintW, footprintD, stories, 180);
    const door = boxes.find((b) => b.mat === "door")!;
    // facing 180 → back (−Z) wall, cz should equal wallThickness/2
    expect(door.cz).toBeCloseTo(cfg.wallThickness / 2, 3);
  });

  it("door is positioned on the facing wall — facing 270 (−X)", () => {
    const { footprintW, footprintD, stories } = BP.cottage;
    const boxes = generateBlueprintOpenings("cottage", footprintW, footprintD, stories, 270);
    const door = boxes.find((b) => b.mat === "door")!;
    // facing 270 → left (−X) wall, cx should equal wallThickness/2
    expect(door.cx).toBeCloseTo(cfg.wallThickness / 2, 3);
  });

  it("barn gets a double-wide door (2× doorWidth)", () => {
    const { footprintW, footprintD, stories } = BP.barn;
    const boxes = generateBlueprintOpenings("barn", footprintW, footprintD, stories, 0);
    const door = boxes.find((b) => b.mat === "door")!;
    // Door is on +Z wall so w = doorW; d = wallThickness
    expect(door.w).toBeCloseTo(cfg.doorWidth * 2, 3);
  });

  it("standard door has width = doorWidth from config", () => {
    const { footprintW, footprintD, stories } = BP.cottage;
    const boxes = generateBlueprintOpenings("cottage", footprintW, footprintD, stories, 0);
    const door = boxes.find((b) => b.mat === "door")!;
    expect(door.w).toBeCloseTo(cfg.doorWidth, 3);
  });

  it("door has 'door' mat type", () => {
    const { footprintW, footprintD, stories } = BP.cottage;
    const boxes = generateBlueprintOpenings("cottage", footprintW, footprintD, stories, 0);
    const door = boxes.find((b) => b.mat === "door")!;
    expect(door.mat).toBe("door");
  });

  it("door bottom is at floor level (Y = doorHeight/2)", () => {
    const { footprintW, footprintD, stories } = BP.cottage;
    const boxes = generateBlueprintOpenings("cottage", footprintW, footprintD, stories, 0);
    const door = boxes.find((b) => b.mat === "door")!;
    // Bottom of door = cy − h/2 should be at floorSurfaceY(0) = 0
    const doorBottom = door.cy - door.h / 2;
    expect(doorBottom).toBeCloseTo(floorSurfaceY(0), 3);
  });

  it("door has depth = wallThickness", () => {
    const { footprintW, footprintD, stories } = BP.cottage;
    const boxes = generateBlueprintOpenings("cottage", footprintW, footprintD, stories, 0);
    const door = boxes.find((b) => b.mat === "door")!;
    expect(door.d).toBeCloseTo(cfg.wallThickness, 3);
  });

  it("windows have 'window' mat type", () => {
    const { footprintW, footprintD, stories } = BP.cottage;
    const boxes = generateBlueprintOpenings("cottage", footprintW, footprintD, stories, 0);
    const windows = boxes.filter((b) => b.mat === "window");
    expect(windows.length).toBeGreaterThan(0);
    for (const win of windows) {
      expect(win.mat).toBe("window");
    }
  });

  it("window center Y = floorSurfaceY(story) + windowSillHeight + windowHeight/2", () => {
    const { footprintW, footprintD, stories } = BP.cottage;
    const boxes = generateBlueprintOpenings("cottage", footprintW, footprintD, stories, 0);
    const windows = boxes.filter((b) => b.mat === "window");
    const expectedY = floorSurfaceY(0) + cfg.windowSillHeight + cfg.windowHeight / 2;
    for (const win of windows) {
      expect(win.cy).toBeCloseTo(expectedY, 3);
    }
  });

  it("multi-story building has windows on each floor", () => {
    const { footprintW, footprintD, stories } = BP.townhouse; // 2 stories
    const boxes = generateBlueprintOpenings("townhouse", footprintW, footprintD, stories, 0);
    const windows = boxes.filter((b) => b.mat === "window");
    // 2 windows per story (left + right walls) × 2 stories = 4 windows minimum
    expect(windows.length).toBeGreaterThanOrEqual(stories * 2);
  });

  it("ground floor windows are below wallH", () => {
    const { footprintW, footprintD, stories } = BP.townhouse;
    const boxes = generateBlueprintOpenings("townhouse", footprintW, footprintD, stories, 0);
    const groundWindows = boxes.filter((b) => b.mat === "window" && b.cy < cfg.wallH);
    expect(groundWindows.length).toBeGreaterThan(0);
  });

  it("upper floor windows are at or above wallH", () => {
    const { footprintW, footprintD, stories } = BP.inn; // 2 stories
    const boxes = generateBlueprintOpenings("inn", footprintW, footprintD, stories, 0);
    const upperWindows = boxes.filter((b) => b.mat === "window" && b.cy >= cfg.wallH);
    expect(upperWindows.length).toBeGreaterThan(0);
  });

  it("window has depth = wallThickness", () => {
    const { footprintW, footprintD, stories } = BP.cottage;
    const boxes = generateBlueprintOpenings("cottage", footprintW, footprintD, stories, 0);
    const win = boxes.find((b) => b.mat === "window")!;
    // Windows are on X walls so depth is along Z: d = windowWidth
    // But thickness into the wall is w (along X) = wallThickness
    expect(win.w).toBeCloseTo(cfg.wallThickness, 3);
  });

  it("all boxes have positive dimensions for every blueprint", () => {
    for (const [id, dims] of Object.entries(BP)) {
      const boxes = generateBlueprintOpenings(
        id as keyof typeof BP,
        dims.footprintW,
        dims.footprintD,
        dims.stories,
        0,
      );
      for (const box of boxes) {
        expect(box.w).toBeGreaterThan(0);
        expect(box.h).toBeGreaterThan(0);
        expect(box.d).toBeGreaterThan(0);
      }
    }
  });
});
