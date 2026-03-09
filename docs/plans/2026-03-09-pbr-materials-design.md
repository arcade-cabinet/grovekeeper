# PBR Materials Design

**Date:** 2026-03-09
**Status:** Approved
**Spec Section:** §45 (to be added)

## Summary

Replace flat-color `MeshStandardMaterial` across all procedural geometry (terrain, trees, buildings, fences, props) with PBR texture-mapped materials sourced from PolyHaven and ambientCG. Keep all procedural geometry — only swap materials.

## Approach

**Build-time bundled textures.** Download ~16 PBR texture sets at 1K resolution into `assets/textures/`. Bundle with the app (~6-8MB). Load via drei `useTexture` hook. Zero runtime downloads, works offline.

## Texture Catalog (16 sets)

### Terrain (6)

| Key | Source | Use |
|-----|--------|-----|
| `grass_green` | PolyHaven `leafy_grass` | Default biome ground |
| `forest_floor` | PolyHaven `forrest_ground_01` | Forest biome, under trees |
| `dirt_path` | PolyHaven `brown_mud_dry` | Paths, village roads |
| `cobblestone` | PolyHaven `cobblestone_floor_04` | Village center |
| `snow_ground` | PolyHaven `snow_field_aerial` | Winter overlay |
| `sand_beach` | PolyHaven `coast_sand_rocks_02` | Near water |

### Trees (6)

| Key | Source | Use |
|-----|--------|-----|
| `bark_oak` | PolyHaven `bark_brown_02` | Oak, default bark |
| `bark_birch` | PolyHaven `bark_willow` | Birch, willow |
| `bark_pine` | PolyHaven `pine_bark` | Pine, conifers |
| `bark_sakura` | PolyHaven `sakura_bark` | Cherry blossom |
| `leaves_green` | ambientCG `Leaves007` | Default canopy |
| `leaves_autumn` | ambientCG `Leaves010` | Autumn canopy |

### Buildings (4)

| Key | Source | Use |
|-----|--------|-----|
| `stone_wall` | PolyHaven `rock_wall_08` | Walls, fences |
| `wood_planks` | ambientCG `WoodFloor040` | Floors, doors |
| `plaster_white` | ambientCG `Plaster003` | Building walls |
| `thatch_roof` | ambientCG `Straw001` | Roofs |

### Per-Set Maps (4 each, JPEG, 1024x1024)

- `{name}_Color.jpg` — diffuse/albedo (sRGB)
- `{name}_NormalGL.jpg` — OpenGL normal map
- `{name}_Roughness.jpg` — roughness (linear)
- `{name}_AO.jpg` — ambient occlusion (linear)

No displacement maps — procedural geometry already has shape.

## Architecture

### File Structure

```
assets/textures/
├── terrain/{key}/        6 dirs × 4 maps = 24 files
├── bark/{key}/           4 dirs × 4 maps = 16 files
├── foliage/{key}/        2 dirs × 4 maps = 8 files
└── building/{key}/       4 dirs × 4 maps = 16 files

game/materials/
├── PBRMaterialCache.ts   # Load + cache MeshStandardMaterial by texture key
├── terrainMaterials.ts   # Biome → texture key mapping
├── treeMaterials.ts      # Species → bark/foliage texture key mapping
├── buildingMaterials.ts  # Structure type → texture key mapping
└── index.ts              # Barrel
```

### PBRMaterialCache

Singleton module. Preloads all texture sets on first call. Returns cached
`MeshStandardMaterial` instances by key.

```typescript
// game/materials/PBRMaterialCache.ts
const cache = new Map<string, MeshStandardMaterial>();

export function getPBRMaterial(key: string): MeshStandardMaterial {
  if (cache.has(key)) return cache.get(key)!;
  const textures = loadTextureSet(key); // sync from bundled assets
  const mat = new MeshStandardMaterial({
    map: textures.color,
    normalMap: textures.normal,
    roughnessMap: textures.roughness,
    aoMap: textures.ao,
  });
  cache.set(key, mat);
  return mat;
}
```

### Integration Points

1. **TerrainChunk.tsx** — `biomeToMaterialKey(biome)` replaces vertex colors
   with tiled PBR texture. UV coords generated from world position.

2. **ProceduralTrees.tsx** — `speciesBarkKey(species)` returns bark texture.
   Trunk cylinder gets bark material; canopy sphere gets foliage material.
   Season system swaps `leaves_green` ↔ `leaves_autumn` ↔ null (bare).

3. **ProceduralTown.tsx / ProceduralBuilding.tsx** — Wall/floor/roof materials
   from `buildingMaterialKey(structureType, surface)`.

4. **ProceduralFences.tsx** — Fence material from wood_planks or stone_wall
   depending on fence type.

5. **ProceduralProps.tsx** — Props get contextual material (barrel → wood_planks,
   crate → wood_planks, well → stone_wall).

### UV Mapping Strategy

Procedural geometry needs UVs for textures to work:

- **Terrain**: Planar XZ projection. UV = worldPos / tileSize. Texture tiles seamlessly.
- **Tree trunks**: Cylindrical UV. U = angle/2π, V = height/trunkHeight.
- **Tree canopies**: Spherical UV from normals. Texture wraps around sphere.
- **Building faces**: Planar projection per face normal axis. Scale = 1 texture per 2m.
- **Fences/props**: Box projection (UV from largest face normal).

### Species Config Extension

Add to `config/game/species.json`:

```json
{
  "id": "oak",
  "barkTexture": "bark_oak",
  "foliageTexture": "leaves_green",
  ...
}
```

### Season Texture Swapping

`treeMaterials.ts` exports `getFoliageTextureForSeason(species, season)`:

- spring/summer → species.foliageTexture (default `leaves_green`)
- autumn → `leaves_autumn`
- winter → null (no canopy for deciduous; conifers keep `leaves_green`)

### Performance

- **Material count**: 16 materials total (shared across all instances)
- **Texture memory**: 16 × 4 maps × 1K × 1K × 3 bytes ≈ 192MB uncompressed.
  GPU compressed (JPEG decode → GPU format): ~48MB VRAM.
- **Draw calls**: Unchanged — instanced meshes still batch by material.
- **Bundle size**: ~6-8MB (JPEG compressed).

### Fallback

If a texture fails to load (corrupted file), fall back to the existing hex color
material. `getPBRMaterial` catches load errors and returns a flat-color material.

## Implementation Order

1. Download texture assets into `assets/textures/`
2. Build `PBRMaterialCache.ts` + material mapping modules
3. Add UV generation to terrain geometry builder
4. Swap TerrainChunk material (biggest visual impact)
5. Add UV generation to tree geometry (trunk + canopy)
6. Swap ProceduralTrees materials
7. Add UV generation to building geometry
8. Swap ProceduralTown/Building/Fences/Props materials
9. Add species.json barkTexture/foliageTexture fields
10. Wire season texture swapping
11. Update GAME_SPEC.md §45
12. Performance test on mobile (must stay >= 55 FPS)

## Testing

- Unit tests for material mapping functions (biome→key, species→key)
- Unit tests for UV generation (planar, cylindrical, spherical)
- Visual smoke test: terrain + trees + buildings all show textures
- Performance: FPS >= 55 on mobile, draw calls < 50
