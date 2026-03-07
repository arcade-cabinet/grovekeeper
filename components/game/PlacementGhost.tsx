/**
 * PlacementGhost -- Semi-transparent mesh preview during structure placement.
 *
 * R3F component that renders a translucent box at the player's grid-aligned
 * position. Shows green (valid) or red (invalid) based on placement validation.
 * Includes confirm/cancel UI buttons overlaid on the game view.
 *
 * Ported from BabylonJS PlacementGhost.tsx to React Three Fiber.
 */

import { useFrame } from "@react-three/fiber";
import React, { useCallback, useMemo, useRef } from "react";
import { Pressable, View } from "react-native";
import * as THREE from "three";

import { Text } from "@/components/ui/text";
import { gridCellsQuery, playerQuery } from "@/game/ecs/world";
import { canPlace } from "@/game/structures/StructureManager";
import type { StructureTemplate } from "@/game/structures/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_COLOR = new THREE.Color(0.3, 0.8, 0.3);
const INVALID_COLOR = new THREE.Color(0.8, 0.2, 0.2);
const GHOST_OPACITY = 0.4;
const GHOST_Y = 0.25;

// ---------------------------------------------------------------------------
// 3D Ghost Mesh (rendered inside R3F Canvas)
// ---------------------------------------------------------------------------

interface PlacementGhostMeshProps {
  template: StructureTemplate;
  /** Ref updated each frame with the current grid position and validity. */
  gridPosRef: React.MutableRefObject<{ x: number; z: number; valid: boolean }>;
}

function PlacementGhostMesh({ template, gridPosRef }: PlacementGhostMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  const boxArgs = useMemo<[number, number, number]>(
    () => [template.footprint.width, 0.5, template.footprint.depth],
    [template.footprint.width, template.footprint.depth],
  );

  useFrame(() => {
    const mesh = meshRef.current;
    const mat = matRef.current;
    if (!mesh || !mat) return;

    const entities = playerQuery.entities;
    if (entities.length === 0) {
      mesh.visible = false;
      return;
    }

    const entity = entities[0];
    const pos = entity.position;

    const gridX = Math.round(pos.x);
    const gridZ = Math.round(pos.z);

    // Position ghost at center of footprint
    mesh.position.x = gridX + (template.footprint.width - 1) / 2;
    mesh.position.y = GHOST_Y;
    mesh.position.z = gridZ + (template.footprint.depth - 1) / 2;
    mesh.visible = true;

    // Check validity
    const valid = canPlace(template.id, gridX, gridZ, gridCellsQuery);
    mat.color.copy(valid ? VALID_COLOR : INVALID_COLOR);

    // Update the shared ref so the UI buttons can read current state
    gridPosRef.current = { x: gridX, z: gridZ, valid };
  });

  return (
    <mesh ref={meshRef} castShadow={false} receiveShadow={false}>
      <boxGeometry args={boxArgs} />
      <meshStandardMaterial
        ref={matRef}
        color={VALID_COLOR}
        transparent
        opacity={GHOST_OPACITY}
        side={THREE.DoubleSide}
        depthWrite={false}
        roughness={0.6}
        metalness={0}
      />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Overlay UI buttons (rendered outside R3F Canvas, in React Native)
// ---------------------------------------------------------------------------

interface PlacementGhostUIProps {
  onConfirm: () => void;
  onCancel: () => void;
}

function PlacementGhostUI({ onConfirm, onCancel }: PlacementGhostUIProps) {
  return (
    <View
      className="absolute bottom-48 flex-row gap-2 self-center"
      pointerEvents="box-none"
    >
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
    </View>
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface PlacementGhostProps {
  /** The structure template to preview. Pass null to hide the ghost. */
  template: StructureTemplate | null;
  /** Called with world grid coordinates when the user confirms placement. */
  onConfirm: (worldX: number, worldZ: number) => void;
  /** Called when the user cancels placement. */
  onCancel: () => void;
}

/**
 * PlacementGhostMeshLayer -- The 3D portion. Mount inside <Canvas>.
 *
 * Usage:
 * ```tsx
 * <Canvas>
 *   <PlacementGhostMeshLayer template={template} gridPosRef={gridPosRef} />
 * </Canvas>
 * ```
 */
export const PlacementGhostMeshLayer = ({
  template,
  gridPosRef,
}: {
  template: StructureTemplate | null;
  gridPosRef: React.MutableRefObject<{ x: number; z: number; valid: boolean }>;
}) => {
  if (!template) return null;
  return <PlacementGhostMesh template={template} gridPosRef={gridPosRef} />;
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
 *   onConfirm={(x, z) => placeStructure(x, z)}
 *   onCancel={() => setTemplate(null)}
 * />
 * ```
 */
export const PlacementGhostUILayer = ({
  template,
  gridPosRef,
  onConfirm,
  onCancel,
}: PlacementGhostProps & {
  gridPosRef: React.MutableRefObject<{ x: number; z: number; valid: boolean }>;
}) => {
  const handleConfirm = useCallback(() => {
    const { x, z, valid } = gridPosRef.current;
    if (valid) {
      onConfirm(x, z);
    }
  }, [gridPosRef, onConfirm]);

  if (!template) return null;

  return <PlacementGhostUI onConfirm={handleConfirm} onCancel={onCancel} />;
};

/**
 * usePlacementGhostRef -- Hook that creates the shared ref for communication
 * between the 3D mesh layer and the UI layer.
 */
export function usePlacementGhostRef() {
  return useRef({ x: 0, z: 0, valid: false });
}
