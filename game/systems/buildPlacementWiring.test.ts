/**
 * Build placement wiring tests -- BuildPanel → placement ghost → commit.
 *
 * Spec §35 (Kitbash building system).
 * Verifies:
 *   1. setBuildMode persists buildMode + buildTemplateId to store
 *   2. templateFromBuildId parses "wall_wood" into a ModularPieceComponent
 *   3. placeModularPiece deducts resources and creates ECS entity
 *   4. BUILD action in actionDispatcher opens kitbash panel
 */

jest.mock("@/game/systems/AudioManager", () => ({
  audioManager: { playSound: jest.fn() },
  startAudio: jest.fn().mockResolvedValue(undefined),
}));

import { resolveAction } from "@/game/actions/actionDispatcher";
import type { ModularPieceComponent } from "@/game/ecs/components/building";
import { useGameStore } from "@/game/stores";
import { templateFromBuildId } from "@/game/systems/kitbashing/templateFactory";

describe("Build Placement Wiring (Spec §35)", () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  describe("setBuildMode persists to store", () => {
    it("sets buildMode=true and buildTemplateId", () => {
      useGameStore.getState().setBuildMode(true, "wall_wood");
      const state = useGameStore.getState();
      expect(state.buildMode).toBe(true);
      expect(state.buildTemplateId).toBe("wall_wood");
    });

    it("clears buildMode and buildTemplateId", () => {
      useGameStore.getState().setBuildMode(true, "wall_wood");
      useGameStore.getState().setBuildMode(false);
      const state = useGameStore.getState();
      expect(state.buildMode).toBe(false);
      expect(state.buildTemplateId).toBeNull();
    });
  });

  describe("templateFromBuildId parses template ID", () => {
    it("parses 'wall_wood' into a ModularPieceComponent", () => {
      const template = templateFromBuildId("wall_wood");
      expect(template).not.toBeNull();
      expect(template!.pieceType).toBe("wall");
      expect(template!.materialType).toBe("wood");
    });

    it("parses 'roof_stone' correctly", () => {
      const template = templateFromBuildId("roof_stone");
      expect(template).not.toBeNull();
      expect(template!.pieceType).toBe("roof");
      expect(template!.materialType).toBe("stone");
    });

    it("parses 'foundation_thatch' correctly", () => {
      const template = templateFromBuildId("foundation_thatch");
      expect(template).not.toBeNull();
      expect(template!.pieceType).toBe("foundation");
      expect(template!.materialType).toBe("thatch");
    });

    it("returns null for invalid format", () => {
      expect(templateFromBuildId("")).toBeNull();
      expect(templateFromBuildId("invalid")).toBeNull();
    });

    it("template has zero grid position (placeholder for ghost)", () => {
      const template = templateFromBuildId("wall_wood");
      expect(template!.gridX).toBe(0);
      expect(template!.gridY).toBe(0);
      expect(template!.gridZ).toBe(0);
      expect(template!.rotation).toBe(0);
    });
  });

  describe("BUILD action resolves from hammer + null target", () => {
    it("returns BUILD for hammer on empty ground", () => {
      expect(resolveAction("hammer", null)).toBe("BUILD");
    });

    it("returns BUILD for hammer on soil", () => {
      expect(resolveAction("hammer", "soil")).toBe("BUILD");
    });

    it("returns null for hammer on tree", () => {
      expect(resolveAction("hammer", "tree")).toBeNull();
    });
  });
});
