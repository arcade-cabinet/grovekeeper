import type { PropPlacement, TileOverrideDef } from "../types.ts";
import { pickWeighted } from "./helpers";

export function generateTileOverrides(
  rng: () => number,
  width: number,
  height: number,
  tileRules: { waterPct: number; rockPct: number; pathPct: number },
): TileOverrideDef[] {
  const tiles: TileOverrideDef[] = [];
  const totalTiles = width * height;

  const waterCount = Math.round(totalTiles * tileRules.waterPct);
  const rockCount = Math.round(totalTiles * tileRules.rockPct);
  const pathCount = Math.round(totalTiles * tileRules.pathPct);

  const positions: { x: number; z: number }[] = [];
  for (let z = 0; z < height; z++) {
    for (let x = 0; x < width; x++) {
      positions.push({ x, z });
    }
  }

  // Fisher-Yates shuffle with the seeded RNG
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  let idx = 0;

  for (let i = 0; i < waterCount && idx < positions.length; i++, idx++) {
    tiles.push({ x: positions[idx].x, z: positions[idx].z, type: "water" });
  }
  for (let i = 0; i < rockCount && idx < positions.length; i++, idx++) {
    tiles.push({ x: positions[idx].x, z: positions[idx].z, type: "rock" });
  }
  for (let i = 0; i < pathCount && idx < positions.length; i++, idx++) {
    tiles.push({ x: positions[idx].x, z: positions[idx].z, type: "path" });
  }

  return tiles;
}

export function generateProps(
  rng: () => number,
  width: number,
  height: number,
  propDensity: number,
  possibleProps: { value: string; weight: number }[],
  occupiedTiles: Set<string>,
): PropPlacement[] {
  if (possibleProps.length === 0 || propDensity <= 0) return [];

  const props: PropPlacement[] = [];
  const totalTiles = width * height;
  const propCount = Math.round(totalTiles * propDensity);

  for (let i = 0; i < propCount; i++) {
    const x = Math.floor(rng() * width);
    const z = Math.floor(rng() * height);
    const key = `${x},${z}`;

    if (occupiedTiles.has(key)) continue;

    const propId = pickWeighted(rng, possibleProps);
    props.push({ propId, localX: x, localZ: z });
    occupiedTiles.add(key);
  }

  return props;
}
