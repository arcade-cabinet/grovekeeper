/**
 * Creature catalog tests — Wave 14/15.
 *
 * Static checks: every entry parses into a `CreatureDef`, GLB paths
 * exist on disk (caught during dev — production-build tests run with
 * `public/` in scope so this is a real assertion), and per-hostility
 * required fields are present.
 */

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getCreatureDef, listCreatureSpecies } from "./index";

const PROJECT_ROOT = resolve(__dirname, "../../..");
const PUBLIC_DIR = resolve(PROJECT_ROOT, "public");

describe("creatures catalog", () => {
  it("lists at least rabbit, deer, and wolf-pup", () => {
    const species = listCreatureSpecies();
    expect(species).toContain("rabbit");
    expect(species).toContain("deer");
    expect(species).toContain("wolf-pup");
  });

  it("each entry has a valid CreatureDef shape", () => {
    for (const id of listCreatureSpecies()) {
      const def = getCreatureDef(id);
      expect(def).toBeDefined();
      if (!def) continue;
      expect(def.species).toBe(id);
      expect(def.glb.length).toBeGreaterThan(0);
      expect(def.idleClip.length).toBeGreaterThan(0);
      expect(def.walkClip.length).toBeGreaterThan(0);
      expect(def.hpMax).toBeGreaterThan(0);
      expect(def.walkSpeed).toBeGreaterThan(0);
      expect(def.fleeSpeed).toBeGreaterThan(0);
      expect(def.wanderRadius).toBeGreaterThan(0);
      expect(def.wanderPauseSeconds).toBeGreaterThan(0);
      expect(["peaceful", "hostile"]).toContain(def.hostility);
    }
  });

  it("peaceful creatures have a panicRadius", () => {
    for (const id of listCreatureSpecies()) {
      const def = getCreatureDef(id);
      if (def?.hostility !== "peaceful") continue;
      expect(def.panicRadius).toBeGreaterThan(0);
    }
  });

  it("hostile creatures have aggroRadius, attackClip, and damagePerHit", () => {
    for (const id of listCreatureSpecies()) {
      const def = getCreatureDef(id);
      if (def?.hostility !== "hostile") continue;
      expect(def.aggroRadius).toBeGreaterThan(0);
      expect(def.attackClip).toBeDefined();
      expect(def.damagePerHit).toBeGreaterThan(0);
    }
  });

  it("each GLB path resolves to an existing file under public/", () => {
    for (const id of listCreatureSpecies()) {
      const def = getCreatureDef(id);
      if (!def) continue;
      const filePath = resolve(PUBLIC_DIR, def.glb);
      expect(existsSync(filePath), `missing creature asset: ${def.glb}`).toBe(
        true,
      );
    }
  });

  it("returns undefined for unknown species (no throw)", () => {
    expect(getCreatureDef("dragon")).toBeUndefined();
  });

  it("wolf-pup is winnable in 3 axe hits with default damage", () => {
    const wolf = getCreatureDef("wolf-pup");
    expect(wolf).toBeDefined();
    if (!wolf) return;
    // 1 damage per swing × 3 swings ≥ wolf hpMax.
    expect(wolf.hpMax).toBeLessThanOrEqual(3);
    // And one wolf hit doesn't one-shot 100hp player.
    expect(wolf.damagePerHit ?? 0).toBeLessThan(100);
  });
});
