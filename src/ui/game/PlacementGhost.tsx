import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Scene } from "@babylonjs/core/scene";
import { createEffect, onCleanup, Show } from "solid-js";
import { koota } from "@/koota";
import { canPlace } from "@/structures/StructureManager";
import type { StructureTemplate } from "@/structures/types";
import { GridCell, IsPlayer, Position } from "@/traits";

function gridCellsSnapshot(): Iterable<{
  gridCell?: {
    gridX: number;
    gridZ: number;
    occupied: boolean;
    type: string;
  };
}> {
  const result: {
    gridCell: {
      gridX: number;
      gridZ: number;
      occupied: boolean;
      type: string;
    };
  }[] = [];
  for (const e of koota.query(GridCell, Position)) {
    const cell = e.get(GridCell);
    result.push({
      gridCell: {
        gridX: cell.gridX,
        gridZ: cell.gridZ,
        occupied: cell.occupied,
        type: cell.type,
      },
    });
  }
  return result;
}

interface PlacementGhostProps {
  scene: Scene | null;
  template: StructureTemplate | null;
  onConfirm: (worldX: number, worldZ: number) => void;
  onCancel: () => void;
}

export const PlacementGhost = (props: PlacementGhostProps) => {
  let ghost: Mesh | null = null;
  let validMat: StandardMaterial | null = null;
  let invalidMat: StandardMaterial | null = null;
  const lastGridPos = { x: 0, z: 0 };

  createEffect(() => {
    const scene = props.scene;
    const template = props.template;

    if (ghost) {
      ghost.dispose();
      ghost = null;
    }

    if (!scene || !template) return;

    if (!validMat) {
      validMat = new StandardMaterial("ghostValid", scene);
      validMat.diffuseColor = new Color3(0.3, 0.8, 0.3);
      validMat.alpha = 0.4;
      validMat.backFaceCulling = false;
    }
    if (!invalidMat) {
      invalidMat = new StandardMaterial("ghostInvalid", scene);
      invalidMat.diffuseColor = new Color3(0.8, 0.2, 0.2);
      invalidMat.alpha = 0.4;
      invalidMat.backFaceCulling = false;
    }

    ghost = CreateBox(
      "placementGhost",
      {
        width: template.footprint.width,
        height: 0.5,
        depth: template.footprint.depth,
      },
      scene,
    );
    ghost.position.y = 0.25;
    ghost.isPickable = false;

    const observer = scene.onBeforeRenderObservable.add(() => {
      if (!ghost || ghost.isDisposed()) return;

      const player = koota.queryFirst(IsPlayer, Position);
      if (!player) return;
      const playerPos = player.get(Position);
      if (!playerPos) return;

      const gridX = Math.round(playerPos.x);
      const gridZ = Math.round(playerPos.z);
      lastGridPos.x = gridX;
      lastGridPos.z = gridZ;

      ghost.position.x = gridX + (template.footprint.width - 1) / 2;
      ghost.position.z = gridZ + (template.footprint.depth - 1) / 2;

      const valid = canPlace(template.id, gridX, gridZ, gridCellsSnapshot());
      ghost.material = valid ? validMat : invalidMat;
    });

    onCleanup(() => {
      scene.onBeforeRenderObservable.remove(observer);
      if (ghost) ghost.dispose();
      ghost = null;
      validMat?.dispose();
      invalidMat?.dispose();
      validMat = null;
      invalidMat = null;
    });
  });

  return (
    <Show when={props.template}>
      {(t) => (
        <div class="absolute bottom-48 left-1/2 -translate-x-1/2 flex gap-2 pointer-events-auto">
          <button
            type="button"
            class="px-4 py-2 rounded-lg text-white font-semibold text-sm shadow-lg active:scale-95 transition-transform"
            style={{ background: "#4CAF50" }}
            onClick={() => {
              const { x, z } = lastGridPos;
              if (canPlace(t().id, x, z, gridCellsSnapshot())) {
                props.onConfirm(x, z);
              }
            }}
          >
            Place
          </button>
          <button
            type="button"
            class="px-4 py-2 rounded-lg text-white font-semibold text-sm shadow-lg active:scale-95 transition-transform"
            style={{ background: "#F44336" }}
            onClick={props.onCancel}
          >
            Cancel
          </button>
        </div>
      )}
    </Show>
  );
};
