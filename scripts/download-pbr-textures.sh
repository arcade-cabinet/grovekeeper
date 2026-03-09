#!/bin/bash
# Download PBR texture sets from PolyHaven (CC0 license)
# Maps: Color (diffuse), NormalGL, Roughness, AO — all 1K JPG
set -euo pipefail

BASE="https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k"
OUT="assets/textures"

download_set() {
  local ph_id="$1"   # PolyHaven asset ID
  local dest="$2"    # Local destination dir under assets/textures/

  echo "Downloading $ph_id → $dest"

  curl -sL "$BASE/$ph_id/${ph_id}_diff_1k.jpg"    -o "$OUT/$dest/Color.jpg"
  curl -sL "$BASE/$ph_id/${ph_id}_nor_gl_1k.jpg"  -o "$OUT/$dest/NormalGL.jpg"
  curl -sL "$BASE/$ph_id/${ph_id}_rough_1k.jpg"   -o "$OUT/$dest/Roughness.jpg"
  curl -sL "$BASE/$ph_id/${ph_id}_ao_1k.jpg"      -o "$OUT/$dest/AO.jpg"

  echo "  ✓ $dest (4 maps)"
}

# Terrain
download_set "leafy_grass"          "terrain/grass_green"
download_set "forrest_ground_01"    "terrain/forest_floor"
download_set "brown_mud_dry"        "terrain/dirt_path"
download_set "cobblestone_floor_04" "terrain/cobblestone"
download_set "snow_field_aerial"    "terrain/snow_ground"
download_set "coast_sand_rocks_02"  "terrain/sand_beach"

# Bark
download_set "bark_brown_02"  "bark/oak"
download_set "bark_willow"    "bark/birch"
download_set "pine_bark"      "bark/pine"
download_set "sakura_bark"    "bark/sakura"

echo ""
echo "=== PolyHaven downloads complete ==="
echo ""
echo "Remaining (ambientCG — manual download):"
echo "  foliage/leaves_green  → ambientCG Leaves007"
echo "  foliage/leaves_autumn → ambientCG Leaves010"
echo "  building/stone_wall   → ambientCG Rock040 or PolyHaven rock_wall"
echo "  building/wood_planks  → ambientCG WoodFloor040"
echo "  building/plaster_white→ ambientCG Plaster003"
echo "  building/thatch_roof  → ambientCG Straw001"
