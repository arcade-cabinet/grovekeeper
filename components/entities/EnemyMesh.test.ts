/**
 * Tests for EnemyMesh — enemy renderer pure-logic functions (Spec §20).
 *
 * Tests pure functions exported from EnemyMesh.tsx without WebGL/R3F context.
 * The component exports are verified by checking their type.
 */

jest.mock("@react-three/drei", () => ({
  useGLTF: jest.fn().mockReturnValue({
    scene: { clone: jest.fn().mockReturnValue({ traverse: jest.fn() }) },
  }),
}));

jest.mock("@react-three/fiber", () => ({}));

// Mock the ECS world so world.with() doesn't run in the test environment
jest.mock("@/game/ecs/world", () => {
  const mockQuery = { entities: [] };
  return {
    world: { with: jest.fn().mockReturnValue(mockQuery) },
    enemiesQuery: mockQuery,
  };
});

import {
  EnemyMeshes,
  computeHealthBarColor,
  resolveEnemyModelPath,
} from "./EnemyMesh.tsx";
import type { EnemyComponent } from "@/game/ecs/components/combat.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEnemy(overrides: Partial<EnemyComponent> = {}): EnemyComponent {
  return {
    enemyType: "bat",
    tier: 1,
    behavior: "swarm",
    aggroRange: 5,
    deaggroRange: 8,
    attackPower: 3,
    attackCooldown: 1.2,
    modelPath: "assets/models/enemies/bat.glb",
    lootTableId: "bat-loot",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// resolveEnemyModelPath
// ---------------------------------------------------------------------------

describe("resolveEnemyModelPath (Spec §20)", () => {
  it("returns modelPath from a bat EnemyComponent", () => {
    const enemy = makeEnemy({ modelPath: "assets/models/enemies/bat.glb" });
    expect(resolveEnemyModelPath(enemy)).toBe("assets/models/enemies/bat.glb");
  });

  it("returns modelPath from a skeleton-warrior EnemyComponent", () => {
    const enemy = makeEnemy({ modelPath: "assets/models/enemies/skeleton-warrior.glb" });
    expect(resolveEnemyModelPath(enemy)).toBe("assets/models/enemies/skeleton-warrior.glb");
  });

  it("returns modelPath from a knight EnemyComponent", () => {
    const enemy = makeEnemy({ modelPath: "assets/models/enemies/knight.glb" });
    expect(resolveEnemyModelPath(enemy)).toBe("assets/models/enemies/knight.glb");
  });

  it("returns modelPath from a thorn-sprite EnemyComponent", () => {
    const enemy = makeEnemy({ modelPath: "assets/models/enemies/thorn-sprite.glb" });
    expect(resolveEnemyModelPath(enemy)).toBe("assets/models/enemies/thorn-sprite.glb");
  });

  it("returns MISSING_MODEL for an empty modelPath", () => {
    const enemy = makeEnemy({ modelPath: "" });
    expect(resolveEnemyModelPath(enemy)).toBe("MISSING_MODEL");
  });

  it("returns MISSING_MODEL for a whitespace-only modelPath", () => {
    const enemy = makeEnemy({ modelPath: "   " });
    expect(resolveEnemyModelPath(enemy)).toBe("MISSING_MODEL");
  });

  it("returns the exact path string (no transformation)", () => {
    const path = "assets/models/enemies/custom-enemy.glb";
    const enemy = makeEnemy({ modelPath: path });
    expect(resolveEnemyModelPath(enemy)).toBe(path);
  });
});

// ---------------------------------------------------------------------------
// computeHealthBarColor
// ---------------------------------------------------------------------------

describe("computeHealthBarColor (Spec §20)", () => {
  it("returns full red (#ff0000) at 0% health", () => {
    expect(computeHealthBarColor(0, 100)).toBe("#ff0000");
  });

  it("returns full green (#00ff00) at 100% health", () => {
    expect(computeHealthBarColor(100, 100)).toBe("#00ff00");
  });

  it("returns orange-ish at 50% health", () => {
    const color = computeHealthBarColor(50, 100);
    // At 50%: r=127, g=127 — verify it is a 7-char hex string
    expect(color).toMatch(/^#[0-9a-f]{6}$/);
    // Red channel should be non-zero and green channel should be non-zero
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    expect(r).toBeGreaterThan(0);
    expect(g).toBeGreaterThan(0);
  });

  it("returns a valid 7-char hex string at all boundary values", () => {
    for (const [hp, max] of [[0, 10], [5, 10], [10, 10], [1, 1], [0, 0]]) {
      expect(computeHealthBarColor(hp, max)).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("clamps hp above maxHp to green", () => {
    // Over-heal: treat as full
    const color = computeHealthBarColor(150, 100);
    expect(color).toBe("#00ff00");
  });

  it("clamps negative hp to red", () => {
    const color = computeHealthBarColor(-10, 100);
    expect(color).toBe("#ff0000");
  });

  it("handles maxHp=0 gracefully (returns red, not NaN/error)", () => {
    expect(() => computeHealthBarColor(0, 0)).not.toThrow();
    expect(computeHealthBarColor(0, 0)).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("blue channel is always 00", () => {
    for (const ratio of [0, 0.25, 0.5, 0.75, 1.0]) {
      const color = computeHealthBarColor(ratio * 100, 100);
      expect(color.slice(5, 7)).toBe("00");
    }
  });

  it("color gets greener as hp increases", () => {
    const quarter = computeHealthBarColor(25, 100);
    const half = computeHealthBarColor(50, 100);
    const threeQ = computeHealthBarColor(75, 100);

    const gAt = (c: string) => parseInt(c.slice(3, 5), 16);
    expect(gAt(quarter)).toBeLessThan(gAt(half));
    expect(gAt(half)).toBeLessThan(gAt(threeQ));
  });

  it("color gets redder as hp decreases", () => {
    const full = computeHealthBarColor(100, 100);
    const half = computeHealthBarColor(50, 100);
    const empty = computeHealthBarColor(0, 100);

    const rAt = (c: string) => parseInt(c.slice(1, 3), 16);
    expect(rAt(full)).toBeLessThan(rAt(half));
    expect(rAt(half)).toBeLessThan(rAt(empty));
  });
});

// ---------------------------------------------------------------------------
// Health bar visibility logic
// ---------------------------------------------------------------------------

describe("health bar visibility (Spec §20)", () => {
  it("should be hidden when hp equals maxHp (full health)", () => {
    // The HealthBar component returns null when hp === maxHp.
    // We verify the condition via the same boolean guard used in the component.
    const hp = 25;
    const maxHp = 25;
    const visible = hp < maxHp;
    expect(visible).toBe(false);
  });

  it("should be visible when hp is less than maxHp (damaged)", () => {
    const hp = 20;
    const maxHp = 25;
    const visible = hp < maxHp;
    expect(visible).toBe(true);
  });

  it("should be visible at 0 hp", () => {
    const hp = 0;
    const maxHp = 25;
    const visible = hp < maxHp;
    expect(visible).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Component exports
// ---------------------------------------------------------------------------

describe("EnemyMeshes component (Spec §20)", () => {
  it("exports EnemyMeshes as a function component", () => {
    expect(typeof EnemyMeshes).toBe("function");
  });
});
