/**
 * WaterShader — Wind Waker-style Gerstner wave water overlay (Spec §31.2).
 *
 * Enhances existing WaterBodies with a bright cel-shaded aesthetic:
 * bright teal/blue palette, quantized color bands, foam at wave crests,
 * and sparkle highlights. Styled after Wind Waker's ocean.
 *
 * Reads water body entities from ECS (same as WaterBody.tsx) but renders
 * them with the Wind Waker ShaderMaterial instead of the default Gerstner one.
 *
 * Mount inside <Canvas><Physics>...</Physics></Canvas> alongside WaterBodies,
 * or as a replacement for it.
 */

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { type Group, type Material, Mesh, PlaneGeometry, type ShaderMaterial } from "three";
import proceduralConfig from "@/config/game/procedural.json" with { type: "json" };
import type { WaterBodyComponent } from "@/game/ecs/components/procedural/water";
import { waterBodiesQuery } from "@/game/ecs/world";

import { createWindWakerMaterial, updateWindWakerTime } from "./waterShaderLogic.ts";

/** PlaneGeometry segments per axis. Higher = smoother waves. */
const WATER_SEGMENTS = 48;

/** Wind Waker color scheme loaded from config/game/procedural.json. */
const wwColors = proceduralConfig.water.windWakerColors;

/** Water body type → Wind Waker color scheme mapping. */
const WATER_TYPE_COLORS: Record<
  string,
  { shallowColor: string; deepColor: string; opacity: number }
> = {
  ocean: { shallowColor: wwColors.ocean.shallow, deepColor: wwColors.ocean.deep, opacity: 0.9 },
  river: { shallowColor: wwColors.river.shallow, deepColor: wwColors.river.deep, opacity: 0.82 },
  pond: { shallowColor: wwColors.pond.shallow, deepColor: wwColors.pond.deep, opacity: 0.75 },
  stream: {
    shallowColor: wwColors.stream.shallow,
    deepColor: wwColors.stream.deep,
    opacity: 0.7,
  },
  waterfall: {
    shallowColor: wwColors.waterfall.shallow,
    deepColor: wwColors.waterfall.deep,
    opacity: 0.85,
  },
};

const FALLBACK_COLORS = {
  shallowColor: wwColors.pond.shallow,
  deepColor: wwColors.pond.deep,
  opacity: 0.85,
};

function getWaterColors(waterType: string) {
  return WATER_TYPE_COLORS[waterType] ?? FALLBACK_COLORS;
}

function buildPlaneGeometry(size: WaterBodyComponent["size"]): PlaneGeometry {
  return new PlaneGeometry(size.width, size.depth, WATER_SEGMENTS, WATER_SEGMENTS);
}

/**
 * WaterShader — renders all ECS water body entities with Wind Waker styling.
 *
 * Imperatively manages Three.js meshes via useFrame (same pattern as
 * WaterBodies and TerrainChunks). Creates/destroys meshes as ECS entities
 * load/unload from chunk streaming.
 */
export const WaterShader = () => {
  const groupRef = useRef<Group>(null);
  const meshMapRef = useRef(new Map<string, Mesh>());
  const materialMapRef = useRef(new Map<string, ShaderMaterial>());

  useFrame(({ clock }) => {
    const group = groupRef.current;
    if (!group) return;

    const meshMap = meshMapRef.current;
    const materialMap = materialMapRef.current;
    const aliveIds = new Set<string>();
    const time = clock.elapsedTime;

    for (const entity of waterBodiesQuery.entities) {
      const { waterBody, position, id } = entity;
      aliveIds.add(id);

      if (!meshMap.has(id)) {
        const colors = getWaterColors(waterBody.waterType);
        const material = createWindWakerMaterial(waterBody.waveLayers, {
          shallowColor: colors.shallowColor,
          deepColor: colors.deepColor,
          foamColor: proceduralConfig.water.foamColor,
          foamThreshold: proceduralConfig.water.foamThreshold,
          opacity: colors.opacity,
        });

        const geometry = buildPlaneGeometry(waterBody.size);
        const mesh = new Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;

        materialMap.set(id, material);
        meshMap.set(id, mesh);
        group.add(mesh);
      }

      // biome-ignore lint/style/noNonNullAssertion: mesh guaranteed by meshMap.has guard
      const mesh = meshMap.get(id)!;
      mesh.position.set(position.x, position.y, position.z);

      // biome-ignore lint/style/noNonNullAssertion: material guaranteed by meshMap.has guard
      const material = materialMap.get(id)!;
      updateWindWakerTime(material, time);
    }

    // Clean up meshes for unloaded entities
    for (const [id, mesh] of meshMap) {
      if (!aliveIds.has(id)) {
        group.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as Material).dispose();
        meshMap.delete(id);
        materialMap.delete(id);
      }
    }
  });

  return <group ref={groupRef} />;
};
