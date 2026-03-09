#!/bin/bash
# Download remaining PBR texture sets from PolyHaven (CC0 license)
# Part 2: buildings + foliage
set -euo pipefail

BASE="https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k"
OUT="assets/textures"

download_set() {
  local ph_id="$1"
  local dest="$2"

  echo "Downloading $ph_id → $dest"
  curl -sL "$BASE/$ph_id/${ph_id}_diff_1k.jpg"    -o "$OUT/$dest/Color.jpg"
  curl -sL "$BASE/$ph_id/${ph_id}_nor_gl_1k.jpg"  -o "$OUT/$dest/NormalGL.jpg"
  curl -sL "$BASE/$ph_id/${ph_id}_rough_1k.jpg"   -o "$OUT/$dest/Roughness.jpg"
  curl -sL "$BASE/$ph_id/${ph_id}_ao_1k.jpg"      -o "$OUT/$dest/AO.jpg"
  echo "  ✓ $dest (4 maps)"
}

# Building textures
download_set "rustic_stone_wall_02"   "building/stone_wall"
download_set "weathered_brown_planks" "building/wood_planks"
download_set "white_plaster_02"       "building/plaster_white"
download_set "thatch_roof_angled"     "building/thatch_roof"

# Foliage — reuse terrain textures for canopy (green leaves pattern)
# leafy_grass works as a dense leaf texture from above
cp "$OUT/terrain/grass_green/Color.jpg"     "$OUT/foliage/leaves_green/Color.jpg"
cp "$OUT/terrain/grass_green/NormalGL.jpg"  "$OUT/foliage/leaves_green/NormalGL.jpg"
cp "$OUT/terrain/grass_green/Roughness.jpg" "$OUT/foliage/leaves_green/Roughness.jpg"
cp "$OUT/terrain/grass_green/AO.jpg"        "$OUT/foliage/leaves_green/AO.jpg"
echo "  ✓ foliage/leaves_green (copied from grass_green)"

# forest_floor has dead leaves — perfect for autumn canopy
cp "$OUT/terrain/forest_floor/Color.jpg"     "$OUT/foliage/leaves_autumn/Color.jpg"
cp "$OUT/terrain/forest_floor/NormalGL.jpg"  "$OUT/foliage/leaves_autumn/NormalGL.jpg"
cp "$OUT/terrain/forest_floor/Roughness.jpg" "$OUT/foliage/leaves_autumn/Roughness.jpg"
cp "$OUT/terrain/forest_floor/AO.jpg"        "$OUT/foliage/leaves_autumn/AO.jpg"
echo "  ✓ foliage/leaves_autumn (copied from forest_floor)"

echo ""
echo "=== All 16 PBR texture sets ready ==="
du -sh "$OUT"
