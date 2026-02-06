/**
 * PlacementGhost — Shows a translucent preview mesh during structure placement.
 *
 * Renders directly into the BabylonJS scene (not React DOM). The ghost mesh
 * follows the player's grid-aligned position and shows green (valid) or
 * red (invalid) based on placement validation.
 */

import { useEffect, useRef } from "react";
import type { Scene } from "@babylonjs/core/scene";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { playerQuery, gridCellsQuery } from "../ecs/world";
import { canPlace } from "../structures/StructureManager";
import type { StructureTemplate } from "../structures/types";

interface PlacementGhostProps {
  scene: Scene | null;
  template: StructureTemplate | null;
  onConfirm: (worldX: number, worldZ: number) => void;
  onCancel: () => void;
}

export const PlacementGhost = ({ scene, template, onConfirm, onCancel }: PlacementGhostProps) => {
  const ghostRef = useRef<Mesh | null>(null);
  const validMatRef = useRef<StandardMaterial | null>(null);
  const invalidMatRef = useRef<StandardMaterial | null>(null);
  const lastGridPos = useRef<{ x: number; z: number }>({ x: 0, z: 0 });

  useEffect(() => {
    if (!scene || !template) {
      // Cleanup ghost if template is cleared
      if (ghostRef.current) {
        ghostRef.current.dispose();
        ghostRef.current = null;
      }
      return;
    }

    // Create materials
    if (!validMatRef.current) {
      const validMat = new StandardMaterial("ghostValid", scene);
      validMat.diffuseColor = new Color3(0.3, 0.8, 0.3);
      validMat.alpha = 0.4;
      validMat.backFaceCulling = false;
      validMatRef.current = validMat;
    }
    if (!invalidMatRef.current) {
      const invalidMat = new StandardMaterial("ghostInvalid", scene);
      invalidMat.diffuseColor = new Color3(0.8, 0.2, 0.2);
      invalidMat.alpha = 0.4;
      invalidMat.backFaceCulling = false;
      invalidMatRef.current = invalidMat;
    }

    // Create ghost mesh
    const ghost = CreateBox("placementGhost", {
      width: template.footprint.width,
      height: 0.5,
      depth: template.footprint.depth,
    }, scene);
    ghost.position.y = 0.25;
    ghost.isPickable = false;
    ghostRef.current = ghost;

    // Update loop — register a scene observer
    const observer = scene.onBeforeRenderObservable.add(() => {
      if (!ghost || ghost.isDisposed()) return;

      const player = playerQuery.first;
      if (!player?.position) return;

      const gridX = Math.round(player.position.x);
      const gridZ = Math.round(player.position.z);
      lastGridPos.current = { x: gridX, z: gridZ };

      // Position ghost at center of footprint
      ghost.position.x = gridX + (template.footprint.width - 1) / 2;
      ghost.position.z = gridZ + (template.footprint.depth - 1) / 2;

      // Check validity
      const valid = canPlace(template.id, gridX, gridZ, gridCellsQuery);
      ghost.material = valid ? validMatRef.current : invalidMatRef.current;
    });

    return () => {
      scene.onBeforeRenderObservable.remove(observer);
      ghost.dispose();
      ghostRef.current = null;
    };
  }, [scene, template]);

  // Cleanup materials on unmount
  useEffect(() => {
    return () => {
      validMatRef.current?.dispose();
      invalidMatRef.current?.dispose();
      validMatRef.current = null;
      invalidMatRef.current = null;
    };
  }, []);

  if (!template) return null;

  return (
    <div className="absolute bottom-48 left-1/2 -translate-x-1/2 flex gap-2 pointer-events-auto">
      <button
        className="px-4 py-2 rounded-lg text-white font-semibold text-sm shadow-lg active:scale-95 transition-transform"
        style={{ background: "#4CAF50" }}
        onClick={() => {
          const { x, z } = lastGridPos.current;
          if (canPlace(template.id, x, z, gridCellsQuery)) {
            onConfirm(x, z);
          }
        }}
      >
        Place
      </button>
      <button
        className="px-4 py-2 rounded-lg text-white font-semibold text-sm shadow-lg active:scale-95 transition-transform"
        style={{ background: "#F44336" }}
        onClick={onCancel}
      >
        Cancel
      </button>
    </div>
  );
};
