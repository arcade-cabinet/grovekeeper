/**
 * PlacementGhost -- Semi-transparent mesh preview during structure placement.
 *
 * Updated to use Rapier physics raycasts for snap detection (Spec §35.4).
 * Ghost follows camera center raycast, shows green/red validity feedback,
 * and rotates with Q/E keys (desktop) or overlay buttons (mobile/touch).
 */

import { useFrame, useThree } from "@react-three/fiber";
import { useRapier } from "@react-three/rapier";
import type React from "react";
import { useCallback, useEffect, useRef } from "react";
import { Pressable, View } from "react-native";
import { Color, DoubleSide, type Mesh, type MeshStandardMaterial, Vector3 } from "three";

import { Text } from "@/components/ui/text";
import type { ModularPieceComponent } from "@/game/ecs/components/building";
import { modularPiecesQuery } from "@/game/ecs/world";
import {
  type KitbashRapierModule,
  type KitbashRapierWorld,
  validatePlacementWithRapier,
} from "@/game/systems/kitbashing";
import { GRID_SIZE } from "@/game/systems/kitbashing/placement";
import { buildGhostPiece, rotateIncrement, snapToGrid } from "./PlacementGhostUtils.ts";

// Re-export pure helpers for consumers
export { buildGhostPiece, rotateIncrement, snapToGrid } from "./PlacementGhostUtils.ts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_COLOR = new Color(0.3, 0.8, 0.3);
const INVALID_COLOR = new Color(0.8, 0.2, 0.2);
const GHOST_OPACITY = 0.4;
const RAYCAST_MAX_DIST = 20;

// ---------------------------------------------------------------------------
// 3D Ghost Mesh (rendered inside R3F Canvas)
// ---------------------------------------------------------------------------

interface PlacementGhostMeshProps {
  template: ModularPieceComponent;
  /** Shared ref updated each frame with current grid position, validity, and rotation. */
  gridPosRef: React.MutableRefObject<{
    x: number;
    y: number;
    z: number;
    valid: boolean;
    rotation: 0 | 90 | 180 | 270;
  }>;
  /** Shared ref for current rotation, updated by Q/E keys or overlay buttons. */
  rotationRef: React.MutableRefObject<0 | 90 | 180 | 270>;
}

function PlacementGhostMesh({ template, gridPosRef, rotationRef }: PlacementGhostMeshProps) {
  const meshRef = useRef<Mesh>(null);
  const matRef = useRef<MeshStandardMaterial>(null);
  const { camera } = useThree();
  const { rapier, world: rapierWorld } = useRapier();

  // Reused each frame — avoids per-frame allocations
  const rayDir = useRef(new Vector3());

  // Q/E keyboard rotation (desktop)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "q" || e.key === "Q") {
        rotationRef.current = rotateIncrement(rotationRef.current, "ccw");
      } else if (e.key === "e" || e.key === "E") {
        rotationRef.current = rotateIncrement(rotationRef.current, "cw");
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [rotationRef]);

  useFrame(() => {
    const mesh = meshRef.current;
    const mat = matRef.current;
    if (!mesh || !mat) return;

    // Cast ray from camera center forward to find terrain hit point
    camera.getWorldDirection(rayDir.current);
    const origin = camera.position;
    const dir = rayDir.current;

    const rapierRay = new (rapier as KitbashRapierModule).Ray(
      { x: origin.x, y: origin.y, z: origin.z },
      { x: dir.x, y: dir.y, z: dir.z },
    );

    const hit = (rapierWorld as unknown as KitbashRapierWorld).castRay(
      rapierRay,
      RAYCAST_MAX_DIST,
      true,
    );

    if (!hit) {
      mesh.visible = false;
      return;
    }

    // Hit point in world space — snap X/Z to grid, keep Y at terrain height
    const hitX = origin.x + dir.x * hit.toi;
    const hitY = origin.y + dir.y * hit.toi;
    const hitZ = origin.z + dir.z * hit.toi;
    const snapped = snapToGrid({ x: hitX, y: hitY, z: hitZ });

    mesh.position.set(snapped.x, snapped.y, snapped.z);
    mesh.rotation.y = (rotationRef.current * Math.PI) / 180;
    mesh.visible = true;

    // Validate using Rapier-backed kitbashing system
    const ghostPiece = buildGhostPiece(
      template,
      snapped.x,
      snapped.y,
      snapped.z,
      rotationRef.current,
    );
    const valid = validatePlacementWithRapier(
      ghostPiece,
      modularPiecesQuery.entities,
      rapierWorld as unknown as KitbashRapierWorld,
      rapier as unknown as KitbashRapierModule,
    );

    mat.color.copy(valid ? VALID_COLOR : INVALID_COLOR);
    gridPosRef.current = {
      x: snapped.x,
      y: snapped.y,
      z: snapped.z,
      valid,
      rotation: rotationRef.current,
    };
  });

  return (
    <mesh ref={meshRef} castShadow={false} receiveShadow={false}>
      <boxGeometry args={[GRID_SIZE, GRID_SIZE, GRID_SIZE]} />
      <meshStandardMaterial
        ref={matRef}
        color={VALID_COLOR}
        transparent
        opacity={GHOST_OPACITY}
        side={DoubleSide}
        depthWrite={false}
        roughness={0.6}
        metalness={0}
      />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Overlay UI (rendered outside R3F Canvas, in React Native)
// ---------------------------------------------------------------------------

interface PlacementGhostUIProps {
  onConfirm: () => void;
  onCancel: () => void;
  onRotateCW: () => void;
  onRotateCCW: () => void;
}

function PlacementGhostUI({ onConfirm, onCancel, onRotateCW, onRotateCCW }: PlacementGhostUIProps) {
  return (
    <View className="absolute bottom-48 flex-row gap-2 self-center" pointerEvents="box-none">
      <Pressable
        className="rounded-lg px-3 py-2 active:scale-95"
        style={{ backgroundColor: "#607D8B" }}
        onPress={onRotateCCW}
        accessibilityLabel="Rotate piece counter-clockwise"
        accessibilityRole="button"
      >
        <Text className="text-sm font-semibold text-white">↺</Text>
      </Pressable>
      <Pressable
        className="rounded-lg px-4 py-2 active:scale-95"
        style={{ backgroundColor: "#4CAF50" }}
        onPress={onConfirm}
        accessibilityLabel="Place structure"
        accessibilityRole="button"
      >
        <Text className="text-sm font-semibold text-white">Place</Text>
      </Pressable>
      <Pressable
        className="rounded-lg px-4 py-2 active:scale-95"
        style={{ backgroundColor: "#F44336" }}
        onPress={onCancel}
        accessibilityLabel="Cancel placement"
        accessibilityRole="button"
      >
        <Text className="text-sm font-semibold text-white">Cancel</Text>
      </Pressable>
      <Pressable
        className="rounded-lg px-3 py-2 active:scale-95"
        style={{ backgroundColor: "#607D8B" }}
        onPress={onRotateCW}
        accessibilityLabel="Rotate piece clockwise"
        accessibilityRole="button"
      >
        <Text className="text-sm font-semibold text-white">↻</Text>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface PlacementGhostProps {
  /** The modular piece template to preview. Pass null to hide the ghost. */
  template: ModularPieceComponent | null;
  /** Called with the fully-positioned piece when the user confirms placement. */
  onConfirm: (piece: ModularPieceComponent) => void;
  /** Called when the user cancels placement. */
  onCancel: () => void;
}

/**
 * PlacementGhostMeshLayer -- The 3D portion. Mount inside <Canvas> within a
 * <Physics> provider (required for useRapier).
 *
 * Usage:
 * ```tsx
 * <Canvas>
 *   <Physics>
 *     <PlacementGhostMeshLayer
 *       template={template}
 *       gridPosRef={gridPosRef}
 *       rotationRef={rotationRef}
 *     />
 *   </Physics>
 * </Canvas>
 * ```
 */
export const PlacementGhostMeshLayer = ({
  template,
  gridPosRef,
  rotationRef,
}: {
  template: ModularPieceComponent | null;
  gridPosRef: React.MutableRefObject<{
    x: number;
    y: number;
    z: number;
    valid: boolean;
    rotation: 0 | 90 | 180 | 270;
  }>;
  rotationRef: React.MutableRefObject<0 | 90 | 180 | 270>;
}) => {
  if (!template) return null;
  return (
    <PlacementGhostMesh template={template} gridPosRef={gridPosRef} rotationRef={rotationRef} />
  );
};

/**
 * PlacementGhostUILayer -- The UI overlay portion. Mount outside <Canvas>
 * in the React Native view hierarchy.
 *
 * Usage:
 * ```tsx
 * <PlacementGhostUILayer
 *   template={template}
 *   gridPosRef={gridPosRef}
 *   rotationRef={rotationRef}
 *   onConfirm={(piece) => placeStructure(piece)}
 *   onCancel={() => setTemplate(null)}
 * />
 * ```
 */
export const PlacementGhostUILayer = ({
  template,
  gridPosRef,
  rotationRef,
  onConfirm,
  onCancel,
}: PlacementGhostProps & {
  gridPosRef: React.MutableRefObject<{
    x: number;
    y: number;
    z: number;
    valid: boolean;
    rotation: 0 | 90 | 180 | 270;
  }>;
  rotationRef: React.MutableRefObject<0 | 90 | 180 | 270>;
}) => {
  const handleConfirm = useCallback(() => {
    const { x, y, z, valid, rotation } = gridPosRef.current;
    if (valid && template) {
      onConfirm(buildGhostPiece(template, x, y, z, rotation));
    }
  }, [gridPosRef, template, onConfirm]);

  const handleRotateCW = useCallback(() => {
    rotationRef.current = rotateIncrement(rotationRef.current, "cw");
  }, [rotationRef]);

  const handleRotateCCW = useCallback(() => {
    rotationRef.current = rotateIncrement(rotationRef.current, "ccw");
  }, [rotationRef]);

  if (!template) return null;

  return (
    <PlacementGhostUI
      onConfirm={handleConfirm}
      onCancel={onCancel}
      onRotateCW={handleRotateCW}
      onRotateCCW={handleRotateCCW}
    />
  );
};

/**
 * usePlacementGhostRefs -- Hook that creates shared refs for communication
 * between the 3D mesh layer and the UI layer.
 */
export function usePlacementGhostRefs() {
  const gridPosRef = useRef({ x: 0, y: 0, z: 0, valid: false, rotation: 0 as 0 | 90 | 180 | 270 });
  const rotationRef = useRef<0 | 90 | 180 | 270>(0);
  return { gridPosRef, rotationRef };
}
