---
title: Asset Inventory
updated: 2026-04-24
status: current
domain: technical
---

# Asset Inventory

Wave 2 of the Grovekeeper RC redesign. A faithful catalog of every asset that already exists in the sibling repo's itch.io asset library
(`/Users/jbogaty/src/arcade-cabinet/voxel-realms/raw-assets/extracted/`) plus the curated runtime copies under `voxel-realms/public/assets/`.
The purpose of this document is to ground subsequent waves (asset pipeline, world architecture, biome design) in **what we actually have on disk**,
not in the aspirational biome list from the spec.

## Methodology

- Source paths inspected: `voxel-realms/raw-assets/archives/`, `voxel-realms/raw-assets/extracted/`, `voxel-realms/public/assets/`,
  `voxel-realms/scripts/fetch-itch-audio.mjs`, `voxel-realms/src/world/asset-budget.ts`.
- All counts pulled from filesystem. No assets were copied or moved (Wave 3 owns that).
- Animation cycle detection: DAE filename naming convention. Packs from the same itch.io vendor (Chaos-Slice voxel) consistently use
  per-clip files named `<Character>_Idle.dae`, `<Character>_Walk.dae`, `<Character>_Attack.dae`, `<Character>_Death.dae`, etc. Confirmed by inspection
  of `voxel-baby-dragons-pack`, `farm-animals-pack-upload-v2`, and per-pack samples.

## Critical findings up front

1. **Almost no GLB. Lots of DAE/GLTF/OBJ/VOX.** The extracted library contains only **41 GLB files total**. The animation cycles live in
   **1062 DAE files** and **492 GLTF files** spread across 25+ Chaos-Slice voxel character/creature/prop packs. The asset pipeline wave
   (Wave 3) MUST include a DAE→GLB conversion step (or GLTF→GLB) preserving animation tracks. The `voxel-realms/public/assets/models/chaos-slice/`
   directory contains only ~30 individual GLBs — these are one-per-pack samples, not the full library.
2. **Zero PNG block tilesets.** The voxel.renderer requires PNG tilesets via `loadTileset({id, src, tileSize})`. None exist in
   `raw-assets/extracted/`. The 25,000+ PNGs found are character/creature **diffuse and emissive texture maps** for animated meshes,
   not tileable terrain blocks. A tileset-generation wave will need to author or commission per-biome PNG atlases (grass, dirt, stone,
   sand, snow, water, leaves, planks, path, gravel, etc.).
3. **No terrain-block GLB or VOX.** The `vox-modular-houses-pack` (370 .vox files) is for modular structures, not terrain cubes.
   `modular-house-pack` is OBJ-only architectural pieces. There is no "voxel grass cube" or "voxel dirt cube" asset anywhere.
4. **Animation richness varies per pack.** Creature packs have full cycles (Idle/Walk/Run/Attack/Eat/Death/Falling/Glide/Flying/Get_Hit/DeathPose).
   Character packs (Steampunk, Mermaid, Dwarf, Viking) appear to ship one DAE per character — likely a static T-pose; needs second-pass verification
   when DAEs are imported. The Steampunk pack does ship 10 GLBs but with no per-clip suffixes, suggesting all-in-one rigs or static.
5. **Audio coverage is excellent.** 11 audio packs spanning music loops (lofi-chill, dark-ambient, retro-combat), UI SFX, footsteps,
   inventory/item, impact/hit, explosions, magic spells, cinematic whooshes, and a music-box pack. ~900 individual audio files.

## 1. Source packs

All packs live under `voxel-realms/raw-assets/extracted/<pack>/`. Audio packs were pulled by `scripts/fetch-itch-audio.mjs` against the
user's owned itch.io library (filter: `type=audio_assets`). Voxel/model packs come from the Chaos-Slice itch.io vendor.

| Pack | Category | Asset count (rough) | Notes |
|------|----------|---------------------|-------|
| `all-trees-uploads` | Voxel models — flora | 117 DAE, 1755 PNG, 325 MB | 16 distinct tree species (Tree 01–16), each with multiple LOD variants |
| `beekeeer-upload` | Voxel models — character + props | 18 DAE, 164 PNG, 156 MB | Beekeeper character + Beehive + Honeycomb + Bee creature |
| `farm-animals-pack-upload-v2` | Voxel models — creatures | 71 DAE + 1 GLB, 2846 PNG, 763 MB | Bull, Chicken, Cow, Dog, Donkey, etc. with full anim cycles |
| `goblin-characters-pack-upload` | Voxel models — characters | 5 DAE, 158 PNG, 697 MB | Goblin + Orc characters |
| `gltf-files` | Voxel models — misc GLTF | 0 DAE/GLB at top, 2.1 GB | Bulky GLTF dump; loose textures, needs targeted extraction |
| `jungle-animals-pack` | Voxel models — creatures | 91 DAE, 2736 PNG, 87 MB | Capybara, Cassowary, Python, etc. |
| `modular-house-pack` | OBJ structural pieces | 110 PNG, 110 MB | OBJ + MTL only, no DAE/GLB |
| `new-plants` | Voxel models — flora | 17 DAE, 1064 PNG, 37 MB | Plant_01–13, Flower_08–10 |
| `plant-pack` | Voxel models — flora (older) | 0 DAE, 49 PNG, 9 MB | GLTF only |
| `trap-pack-upload` | Voxel models — props | 51 DAE, 349 PNG, 62 MB | Traps numbered 1–18+ with variants |
| `vox-modular-houses-pack` | Voxel structures (.vox) | 370 .vox, 19 MB | MagicaVoxel format; needs vox→glb conversion |
| `voxel-african-animals-pack` | Voxel models — creatures | 74 DAE, 2802 PNG, 124 MB | Antelope, Cheetah, Elephant, Flamingo, etc. |
| `voxel-arctic-animals-pack` | Voxel models — creatures | 75 DAE, 1986 PNG, 80 MB | Bear, Beluga, Emperor (penguin), etc. |
| `voxel-baby-dragons-pack` | Voxel models — fantasy creatures | 70 DAE + 10 GLB, 1820 PNG, 80 MB | 10 dragon variants (Black, Green, Lava, Mecha, Red, Skull, Steampunk, White, Wood, Zombie) — full anim suites |
| `voxel-birds-pack` | Voxel models — creatures | 84 DAE, 2758 PNG, 112 MB | Eagle, Falcon, Kite, Osprey, etc. with Flying/Glide cycles |
| `voxel-dinosaurs-pack` | Voxel models — fantasy creatures | 77 DAE, 2944 PNG, 127 MB | Ankylosaurus, Brachiosaurus, Carnotaurus, etc. |
| `voxel-dwarf-characters-pack` | Voxel models — characters | 10 DAE + 10 GLB, 300 PNG, 558 MB | Dwarf 01–10; rigs unverified for full cycles |
| `voxel-forest-animals-pack` | Voxel models — creatures | 74 DAE, 2734 PNG, 105 MB | Bear, Boar, Deer, Fox, Squirrel, etc. — **most aligned with Grovekeeper tone** |
| `voxel-mermaid-characters-pack-upload` | Voxel models — characters | 25 DAE + 10 GLB, 650 PNG, 694 MB | MermaidFemale01–04, MermaidMale01–04, MermaidWarrior02–05 |
| `voxel-mythical-creatures-pack` | Voxel models — fantasy creatures | 102 DAE, 5660 PNG, 295 MB | Centaur, Cerberus, Griffin (per asset-budget). Heavy anim cycles |
| `voxel-neanderthal-characters-pack` | Voxel models — characters | 5 DAE, 158 PNG, 238 MB | Boy, Father, Girl, Kid, Mother |
| `voxel-ocean-animals-pack` | Voxel models — creatures | 45 DAE, 726 PNG, 39 MB | Crab, Dolphin, Hammerhead, etc. |
| `voxel-props-pack` | Voxel models — interior props | 25 DAE, 210 PNG, 11 MB | Cabinets, bedside tables, drawers (with open/close animations) |
| `voxel-ronin-samurai-pack` | Voxel models — characters | 4 DAE, 189 PNG, 243 MB | Samurai variants |
| `voxel-steampunk-characters-pack` | Voxel models — characters | 10 DAE + 10 GLB, 476 PNG, 1.0 GB | Male/Female/Woman variants 6–10, A1, B1, C1 |
| `voxel-viking-characters-upload` | Voxel models — characters | 5 DAE, 322 PNG, 438 MB | Female/Male A1, B1, B3, D1 |
| `voxel-viking-characters-upload-1` | Voxel models — characters | 5 DAE, 322 PNG, 438 MB | Apparent duplicate of viking-upload — verify before pipeline ingest |
| `voxel-weapons-pack-1` | Voxel models — props (weapons) | 2 DAE, 337 PNG, 13 MB | Swords and similar |
| `cinematic-whoosh-sfx-pack-40-fast-transition-sounds` | Audio — SFX | 85 files, 19 MB | UI/transition whooshes |
| `fantasy-magic-spell-sound-effects-pack` | Audio — SFX | 81 files, 23 MB | Magic buffs, casts, hits |
| `freedemo` | Audio — footsteps | 11 files, 21 MB | Boots-on-solid demo loops with reverb variants |
| `game-explosion-sound-effects-pack` | Audio — SFX | 61 files, 28 MB | Big/boom explosion variants |
| `gameloops-vol1-lofichill-pixelloops` | Audio — music | 30 files, 398 MB | Lofi-chill bgm: Calm_Respawn, Chill_Checkpoint, Idle_Screen, Late_Compile etc. |
| `gameloops-vol4-darkambient` | Audio — music | 31 files, 517 MB | Dark ambient: ColdLight, DarkEcho, DeepPuzzle, FinalClue, etc. |
| `impact-hit-sound-effects-pack` | Audio — SFX | 102 files, 15 MB | Body/wood/metal impact variants |
| `inventory-and-item-sound-effects-pack` | Audio — SFX | 277 files, 40 MB | Inventory open/close, item pickup, place, etc. |
| `pixelloops-retro-combat-pack` | Audio — music | 25 files, 389 MB | Combat/dungeon/arena loops |
| `pixelloops-ui-sound-effects-pack` | Audio — SFX | 81 files, 21 MB | Achievement, Cancel, Confirm UI sounds |
| `psx-footsteps-sfx-foley-pack` | Audio — footsteps | 38 files, 65 MB | Boots/barefoot on grass/wood/solid surfaces |
| `toys-in-the-attic-a-music-box-music-pack` | Audio — music | 80 files, 351 MB | Music-box bgm — strong Grove ambient candidate |

**Universe of source packs (per `scripts/fetch-itch-audio.mjs`)**: the script downloads everything in the user's owned itch.io library
classified `audio_assets` based on `.itch-cache/audio-packs.json`. The 11 audio directories above match what's currently extracted.

## 2. Voxel models — characters & creatures

All animation status entries are inferred from DAE filename suffixes. The DAE→GLB conversion in Wave 3 must verify that
animation tracks actually export. Polycounts are not measured — they will be discovered during conversion.

### Gardener candidates (humanoid characters with neutral lore)

| File | Pack | Anim cycles? | Notes |
|------|------|--------------|-------|
| `Beekeeer Upload/Dae Files/Beekeeper.dae` | beekeeer-upload | Likely full | Closest match to "the gardener" tonally — already has hat, working pose |
| `Voxel Neanderthal Characters Pack/Boy.dae`, `Father.dae`, `Mother.dae`, `Girl.dae`, `Kid.dae` | voxel-neanderthal | Static T-pose suspected | Tonally neutral, could re-skin |
| `voxel-dwarf-characters-pack/Glb/Dwarf 01–10.glb` | voxel-dwarf | Unverified — single-file | Already GLB. Dwarves work for gardener if styled cozy |
| `voxel-steampunk-characters-pack/Glb/Male_A1.glb`, `Female_A1.glb`, `Woman_6.glb`, etc. | voxel-steampunk | Unverified — single-file | 10 GLBs available. Steampunk tone risks clashing with cozy aesthetic |

### NPC / villager candidates

| Pack | Files | Suitability |
|------|-------|-------------|
| voxel-dwarf-characters-pack | Dwarf 01–10 (10 GLB + 10 DAE) | High — diverse villager set |
| voxel-neanderthal-characters-pack | Boy/Girl/Kid/Mother/Father (5 DAE) | High — family unit, child-friendly |
| voxel-steampunk-characters-pack | Male/Female/Woman variants (10 GLB + 10 DAE) | Medium — re-skin needed for cozy tone |
| voxel-viking-characters-upload | Female_A1, Male_A1/B1/B3/D1 (5 DAE) | Medium |
| voxel-mermaid-characters-pack-upload | MermaidFemale01–04, MermaidMale01–04, MermaidWarrior02–05 (25 DAE + 10 GLB) | Coast/wetland-only |
| voxel-ronin-samurai-pack | Samurai (4 DAE) | Low — too thematic |
| goblin-characters-pack-upload | Goblin/Orc 1–5 (5 DAE) | Hostile NPC role only |

### Peaceful creatures (ambient wildlife)

| Pack | Notable species | Anim status |
|------|----------------|-------------|
| voxel-forest-animals-pack | Bear, Boar, Deer, Fox, Squirrel | DAE files include Idle, Eat, Falling, Get, Glide, Death, Attack |
| voxel-arctic-animals-pack | Bear, Beluga, Emperor (penguin) | Idle, Eat, Crawl, Death, Fast, Falling |
| voxel-african-animals-pack | Antelope, Cheetah, Elephant, Flamingo | Death, Eat, Attack |
| voxel-birds-pack | Eagle, Falcon, Kite, Osprey | Idle, Flying, Glide, Falling, Eat, Death |
| voxel-ocean-animals-pack | Crab, Dolphin, Hammerhead | Idle, Hit, Death, Attack |
| jungle-animals-pack | Capybara, Cassowary, Python | Alert, Climb, Combat, Death, Detection, Dodge |
| farm-animals-pack-upload-v2 | Bull, Chicken, Cow, Dog, Donkey | Bull_Walk, Bull_Run, Bull_Eat, Bull_Death, Bull_Get_Hit, Chiken_Idle |
| beekeeer-upload | Bee | DAE present |

### Hostile creatures

| Pack | Species | Suitability |
|------|---------|-------------|
| goblin-characters-pack-upload | Goblin, Orc | Direct fit for hostile NPCs |
| voxel-mythical-creatures-pack | Centaur, Cerberus, Griffin (and many more — 102 DAE) | Mid-tier mythic threats |
| voxel-baby-dragons-pack | 10 dragon variants — Black, Green, Lava, Mecha, Red, Skull, Steampunk, White, Wood, Zombie | High-tier threat or lore creature; full anim suites verified |
| voxel-dinosaurs-pack | Ankylosaurus, Brachiosaurus, Carnotaurus, etc. | Setting-clash risk; better skipped for cozy tone |
| jungle-animals-pack | Python | Stealth threat |
| voxel-ocean-animals-pack | Hammerhead | Coast threat |
| voxel-african-animals-pack | Cheetah | Predator |

### Grove Spirit candidates

| Asset | Why it could work | Concerns |
|-------|------------------|----------|
| `voxel-mythical-creatures-pack/*` | Otherworldly creatures (Centaur, Griffin) | Need to verify a glowing-or-ethereal entity exists — ride out by emissive shader |
| `voxel-baby-dragons-pack/Skull_B_Dragon.glb` | Skull dragon = ghostly | Probably too aggressive |
| Any dwarf/mermaid with custom emissive shader | Treat as base mesh, apply glow | Cheap path — add emissive layer to any base humanoid |

**Recommendation**: Build the Grove Spirit by applying a custom emissive/dissolve shader to a Beekeeper or Mermaid base mesh. There is no
"obvious spirit asset" in the library; emissive overlay is the practical path.

## 3. Voxel models — props & structures

| Asset / Pack | Type | Anim status | Notes |
|--------------|------|-------------|-------|
| `voxel-props-pack/*.dae` (25 DAE) | Furniture | Has Open/Close anims (Cabinet1_Drawer1_Open.dae, Bedside1_All_Close.dae) | Good for grove interiors |
| `trap-pack-upload/*.dae` (51 DAE) | Trap mechanisms | Numbered variants 1–18 with sub-variants | Could re-skin as gardening contraptions |
| `modular-house-pack/*.obj` | Architectural OBJ pieces | Static | OBJ-only; needs OBJ→GLB conversion |
| `vox-modular-houses-pack/*.vox` (370 .vox) | MagicaVoxel modular | Static | .vox format; needs vox→glb conversion |
| `beekeeer-upload/*.dae` (Beehive, Honeycomb, etc.) | Beekeeping props | Static | Direct fit |
| `voxel-weapons-pack-1/*.dae` (2 DAE, +PNG) | Swords | Static | Marginal use |
| `all-trees-uploads/*.dae` (117 DAE) | 16 tree species, multiple LODs | Static | Used as flora props, not animated |
| `new-plants/*.dae` (17 DAE) | Plant_01–13, Flower_08–10 | Static | Direct fit — meadow/grove flora |
| `plant-pack` | Plant GLTF, older format | Static | Older variant of new-plants |

## 4. Voxel models — terrain blocks

**None found.** The library has zero tile-able terrain block GLBs and zero MagicaVoxel-based terrain primitives. The 370 `.vox` files
in `vox-modular-houses-pack` are all building pieces (walls, roofs, doors), not 1x1x1 ground tiles.

This is a gap. Wave 3 (asset pipeline) and Wave 4 (world architecture) must address it. See "Gaps and recommendations" below.

## 5. PNG tilesets / texture atlases

**None exist.** All ~25,000 PNG files in the extracted library are per-mesh diffuse/emissive texture maps tied to specific DAE/GLTF rigs
(typical pattern: `Tree 01_1_res/Tree 01_1_Leaf_1_1_diffuse.png`, `Tree 01_1_Wood_1_emissive.png`). They are not tileable terrain atlases
in the format `loadTileset({id, src, tileSize})` expects.

This is the largest gap in the project. The voxel.renderer's terrain pipeline is unfunded by current assets. Wave 3 (or a dedicated
tileset-generation wave) must author per-biome PNG atlases.

## 6. Audio — music

| Pack | Files | Notes / biome affinity |
|------|-------|-----------------------|
| `gameloops-vol1-lofichill-pixelloops` | 30 (Calm_Respawn, Chill_Checkpoint, Idle_Screen, Late_Compile, etc.) | **Grove + Meadow primary candidate** — cozy, calm |
| `gameloops-vol4-darkambient` | 31 (GLV4_ColdLight, GLV4_DarkEcho, GLV4_DeepPuzzle, GLV4_FinalClue, etc.) | Wetland/Alpine night, grove-mystery layer |
| `pixelloops-retro-combat-pack` | 25 (Arcade_Combat, Battle_Encounter, Combat_Arena, Danger_Zone, Dungeon_Combat) | Hostile-creature encounter music |
| `toys-in-the-attic-a-music-box-music-pack` | 80 | **Grove ambient** primary candidate — music-box magical tone |

## 7. Audio — SFX

| Category | Pack | Sample filenames | Files |
|----------|------|------------------|-------|
| UI | `pixelloops-ui-sound-effects-pack` | pl_Achievement_01.wav, pl_Cancel_01–04.wav | 81 |
| Inventory / item | `inventory-and-item-sound-effects-pack` | inventory_open_01–04.{wav,mp3,ogg} | 277 |
| Impact / hit | `impact-hit-sound-effects-pack` | pl_impact_body_01–04 (wav+mp3+ogg) | 102 |
| Magic / spell | `fantasy-magic-spell-sound-effects-pack` | pl_magic_buff_01–04, pl_magic_cast_01 | 81 |
| Explosion | `game-explosion-sound-effects-pack` | pl_explosion_big_01–04, pl_explosion_boom_01 | 61 |
| Cinematic whoosh | `cinematic-whoosh-sfx-pack-40-fast-transition-sounds` | pl_whoosh_cinematic_01–05, pl_whoosh_fast_01–04, pl_whoosh_hard_01 | 85 |
| Footsteps | `psx-footsteps-sfx-foley-pack` | Bootswalksolid.wav, Bootsrunhighgrass.wav, Bootsrunwoodfloor.wav, Barefootwalkgrass.wav | 38 |
| Footsteps (demo) | `freedemo` | Bootswalksolid + RVB1–10 reverb variants | 11 |

**Footstep coverage** breaks down to: solid (path/stone), grass low, grass high, wood floor, scurry. **Missing**: snow, sand, water/wet,
gravel. These four are mandatory for the spec's biome list — see Gaps below.

**Tool action SFX** (chop, dig, water, plant, prune): not present as labeled. The `impact-hit-sound-effects-pack` body-impact sounds plus
`fantasy-magic-spell-sound-effects-pack` buff sounds plus inventory item pickup can be repurposed, but no axe/shovel/watering-can named
files exist.

## 8. Audio — ambient

There is **no dedicated ambient/wildlife pack** (no labeled birdsong, wind, rain, water-stream, cricket, owl, frog files).
Music-box and dark-ambient packs partially fill the role but they are loops, not field recordings.

This is a meaningful gap: the spec calls for biome-themed ambient layers and Grove "soft light, ambient" audio. Either acquire an
ambient pack, synthesize ambient via Tone.js (the spec says Tone.js is dropped — but it could come back for ambient only), or generate
ambient procedurally from existing musical loops.

## 9. Biome capacity assessment

For each biome from the spec's provisional list (meadow / forest / wetland / alpine / coast / scrub / grove), here is the honest coverage:

| Biome | Coverage | Flora | Fauna | Tileset | Music | Verdict |
|-------|----------|-------|-------|---------|-------|---------|
| **Meadow** | Partial | new-plants (Plant_01–13, Flower_08–10), all-trees (subset) | farm-animals (Cow, Donkey, Chicken), voxel-forest-animals (Deer, Fox, Squirrel) | **MISSING** (no grass tileset) | gameloops-vol1-lofichill | **Supported once tileset exists** |
| **Forest** | Strong | all-trees-uploads (16 species, full LODs) | voxel-forest-animals-pack (Bear, Boar, Deer, Fox, Squirrel) | **MISSING** (no dirt/leaf-litter tileset) | gameloops-vol1-lofichill + dark-ambient | **Strongest biome candidate after tileset wave** |
| **Wetland** | Thin | Some plants from new-plants reusable | voxel-ocean-animals (Crab, Dolphin), Python from jungle, beekeeper bees | **MISSING** (no water/mud tileset) | gameloops-vol4-darkambient | Marginal — needs custom water shader and acquired wetland fauna |
| **Alpine** | Thin | No alpine-specific tree variants identified | voxel-arctic-animals-pack (Bear, Beluga, Emperor) | **MISSING** (no snow tileset) | gameloops-vol4-darkambient cold loops (GLV4_ColdLight) | Cut or merge with forest |
| **Coast** | Partial | No palm/coast flora | voxel-ocean-animals-pack (Crab, Dolphin, Hammerhead), voxel-mermaid-characters-pack | **MISSING** (no sand/water tileset) | toys-in-the-attic for shoreline | Doable but secondary |
| **Scrub** | Not supported | No scrub/desert flora | voxel-african-animals (Cheetah, Antelope, Elephant) | **MISSING** | None directly thematic | **Cut for RC** |
| **Grove** (special) | Partial | new-plants flowers + best all-trees + custom emissive shader | beekeeper + bees + custom Grove Spirit (emissive overlay on base humanoid) | **MISSING** (custom glowy tileset needed) | toys-in-the-attic-a-music-box-music-pack | **Supported with custom shader work** |

### Recommended biome list to ship at RC

**Meadow, Forest, Coast, Grove (4 biomes).**

Rationale: meadow + forest are the two best-supported biomes once tilesets are authored, both have full flora, full fauna, fitting music.
Coast adds variety, leans on existing ocean fauna and Mermaid characters for NPCs. Grove is the narrative spine — non-negotiable.
Wetland can be added in a v1.1 patch once water shader and wetland fauna are acquired. Alpine collapses naturally into forest's snowy zones
via shader variation. Scrub is cut: no flora, no thematic music, africa-fauna doesn't fit cozy tone.

This 4-biome list is honestly defensible by current asset coverage. Six biomes pretends to coverage we don't have.

## 10. Gaps and recommendations

Top gaps, ordered by criticality for hitting RC:

1. **PNG terrain tilesets — mandatory.** No biome can render terrain without these. Three options: (a) author hand-painted 16-tile-per-biome
   atlases (4 biomes × ~256 tiles each); (b) procedurally generate atlases from the per-mesh PNG textures using Node + sharp; (c) commission
   from itch.io. Option (b) is fastest if the existing tree/leaf/wood diffuse PNGs can be sliced/repurposed. **Wave 3 must own this.**

2. **DAE→GLB conversion pipeline — mandatory.** 1062 DAE files need to convert to GLB with animation tracks intact, or the engine's
   `ModelRenderer` cannot use them. Tooling: `gltf-pipeline`, `assimp`, or a custom Blender CLI script. Need to spot-check that animation
   tracks survive the round-trip — Collada animation export is notorious for losing keyframes.

3. **Missing footstep surfaces — moderate.** No snow/sand/water/gravel footstep SFX. Mitigations: (a) reuse `psx-footsteps-sfx-foley-pack`
   wood-floor as gravel proxy, generate snow by pitch-shifting solid; (b) acquire the next tier itch.io footstep pack. If we cut alpine and
   wetland (per recommendation), this need shrinks to sand only — solvable by pitching grass-foley darker.

4. **No tool action SFX — moderate.** No labeled chop/dig/water/plant/prune. Mitigation: combine `impact-hit` body-impact + tail of
   `cinematic-whoosh` for tool swings; reuse `inventory-and-item` for plant/place. This is a Wave 5 sound-design pass, not a hard
   acquisition gap.

5. **No ambient/wildlife audio pack.** Spec wants biome ambient layers (birdsong, frogs, wind). Mitigation: acquire one itch.io ambient
   pack OR keep Tone.js around exclusively for procedural ambient generation despite the spec saying "Tone.js dropped." Recommend acquiring;
   it is a single ~$10 pack on itch.io.

6. **No Grove Spirit asset.** Build via emissive shader on a base humanoid (Beekeeper or Mermaid). Engineering-only fix.

7. **No terrain block voxel models.** Blocks live in PNG tilesets, not GLB — gap (1) above resolves this.

8. **Duplicate `voxel-viking-characters-upload` and `voxel-viking-characters-upload-1`.** Same byte-count, same 5 DAE files. De-duplicate
   before pipeline ingest.

9. **Character packs may be static-only.** Steampunk/Mermaid/Dwarf/Viking each ship one DAE per character — likely T-pose only, while the
   creature packs ship per-clip DAEs. Wave 3 must spot-check imports; if static, characters need rigging in Blender or animation borrowed
   from Mixamo. This affects Gardener/NPC believability heavily.

10. **`gltf-files` directory is 2.1 GB and uncategorized.** Likely contains uncurated GLTFs from many packs. Worth a deeper pass during Wave
    3 to extract anything pre-converted to GLTF that we can just transcode straight to GLB.

## Source-of-truth file paths cited

- `voxel-realms/raw-assets/extracted/` — all source packs
- `voxel-realms/raw-assets/archives/` — original itch.io zip archives
- `voxel-realms/public/assets/models/chaos-slice/<pack>/` — curated runtime GLBs (one per pack)
- `voxel-realms/scripts/fetch-itch-audio.mjs` — audio pack download script + allow-list
- `voxel-realms/src/world/asset-budget.ts` — runtime-loaded asset paths and byte budgets (REALM_ASSET_SIZE_BYTES_BY_ID, REALM_RENDER_OVERRIDE_BY_ID, REALM_STATIC_VARIANT_BY_ID)
- `voxel-realms/.itch-cache/audio-packs.json` — cached owned-keys list (audio packs)

End of inventory.

## Curated for RC (generated)

_Last regenerated: 2026-04-25 by `pnpm assets:manifest`._

This section reflects what currently lives under `public/assets/` and ships with the game,
as opposed to the source-side inventory above which catalogues raw `voxel-realms/raw-assets/extracted/` packs.

**Total assets:** 348
**Total size:** 760.0 MB

**By category:**

- ambient: 40
- model: 61
- music: 10
- sfx: 237

**Manifest file:** `src/assets/manifest.generated.ts`

## Tileset Atlases

_Last regenerated: 2026-04-24 by `pnpm assets:tilesets`._

Procedurally generated PNG atlases for `@jolly-pixel/voxel.renderer`, produced by
`scripts/generate-tilesets.mjs` from `scripts/tileset-config.json`. Deterministic
(seeded RNG, identical bytes on re-run). See `scripts/generate-tilesets.README.md`.

**Tile size:** 32 px. **Atlas dimensions:** 256x256 (8x8 grid). **Total bytes:** ~70 KB.

### Biome atlases

| Biome  | Path                                       | Tiles | Bytes  |
| ------ | ------------------------------------------ | ----- | ------ |
| Meadow | `public/assets/tilesets/biomes/meadow.png` | 10    | 11,649 |
| Forest | `public/assets/tilesets/biomes/forest.png` | 10    | 12,487 |
| Coast  | `public/assets/tilesets/biomes/coast.png`  | 10    | 11,729 |
| Grove  | `public/assets/tilesets/biomes/grove.png`  | 10    | 11,620 |

Each biome ships ground variants (grass/dirt/stone/etc.), foliage (leaves), and structural
tiles (wood/log/fence). Per-biome JSON sidecar (e.g. `meadow.json`) maps tile id -> `{col, row}`.

### Structures atlases

| Group  | Path                                            | Tiles | Bytes  |
| ------ | ----------------------------------------------- | ----- | ------ |
| Common | `public/assets/tilesets/structures/common.png`  | 8     | 11,457 |
| Hearth | `public/assets/tilesets/structures/hearth.png`  | 8     | 11,031 |

`common` covers shared crafted blocks (plank, stone-block, glass, thatch, log, metal,
stone-rough, plank-vertical). `hearth` covers fire-stained stone, ember-glow coals, ash,
iron, log, flame, soot, and tile — for the hearth structure that anchors the player's grove.

### Approach decision

**Option 4 (programmatic procedural generator)** from the wave plan. Hand-authored pixel
art is the eventual target but blocks RC by requiring an artist pass. Voxel-realms'
existing block textures were not consistently tile-able. Procedural generation gives us
deterministic, tunable, scriptable atlases now; specific tiles can be replaced with
hand-authored PNGs in a polish pass post-RC (see `scripts/generate-tilesets.README.md`).

## Animation Verification (Wave 3b)

Wave 3b spot-checked candidate DAE source files for animation cycles before
committing to convert them, then ran the full DAE→GLB conversion pipeline.
Pipeline scripts live at `scripts/convert-dae-to-glb.mjs`,
`scripts/sample-animations.mjs`, `scripts/blender/dae-to-glb.py`,
`scripts/blender/sample-animations.py`. Curation list at
`scripts/conversion-config.json`.

### Converter chosen

**Assimp 6.0.4** (Homebrew). Blender 5.1.1 is installed locally but **no longer
ships the `collada_import` operator** — the Blender 5.x release dropped COLLADA
support and provides no replacement addon. The converter probes
`'collada_import' in dir(bpy.ops.wm)` at startup; on Blender 5.x this is empty
and the script automatically falls back to assimp.

Animation preservation verified by inspecting GLB JSON chunks via
`scripts/sample-animations.mjs`:

| Source | Source anim nodes | Output animations | Output channels |
|---|---|---|---|
| `Beekeeper.dae` | 34 | 1 | 99 |
| `Wolf Idle.dae` | 48 | 1 | 135 |
| `Rabbit Run.dae` | 40 | 1 | 111 |

Per-clip DAEs (the Chaos-Slice voxel pack convention — one cycle per file:
`Wolf Idle.dae`, `Wolf Walk.dae`, etc.) become single-animation GLBs with all
bone tracks intact. ModelRenderer plays them via per-node TRS animation rather
than a glTF `skin` block; this works because the bone hierarchy is preserved as
nodes during the COLLADA → glTF translation.

### Conversion results

37 entries in `conversion-config.json`. After fixing 5 filename mismatches
(Owl `Idle 1` not `Idle`, Sea Turtle / Dolphin base files have no `Idle` suffix,
Wild Boar files use `Boar` prefix not `Wild Boar`):

- **37 ok, 0 failed, 0 missing** on the second pass.
- Total time: ~0.4 s (assimp is dramatically faster than Blender CLI).
- Outputs land at `raw-assets/converted/{pack-id}/.../{name}.glb`.

### Which character pack wins the gardener slot

All three character pack candidates ship with rigged DAEs (animation node count
in COLLADA source is the proxy):

| Pack | Per-character cycles | Notes |
|---|---|---|
| Beekeeer (`Beekeeper.dae`) | 1 file per character; 34 anim nodes | Single cycle baked into rig — likely an idle pose with finger/limb micro-animation. Cozy aesthetic fits "tend the grove". |
| Mermaid (`MermaidWarrior01.dae` + `MermaidWarrior01 Eat.dae`) | 2 cycles per warrior; 34 anim nodes each | Better cycle coverage but sea-themed. Reserved for **Grove Spirit** (already wired in `asset-curation.json`). |
| Neanderthal (`Father.dae` etc.) | 1 file per character | Static or near-static — used for villager NPCs. |

**Wave 3 already wired Beekeeper as gardener** (`asset-curation.json` →
`gardener.gltf`). The DAE conversion gives an alternate `.glb` with the rig
animation; if the GLTF source turns out to be T-pose only, swap the curation
entry's `source` to point at the converted GLB at
`raw-assets/converted/beekeeer-upload/Beekeeer Upload/Dae Files/Beekeeper.glb`.

### Risks remaining for downstream waves

- **No `skin` block** in converted GLBs. ModelRenderer must drive animation via
  per-node transforms. Three.js' `AnimationMixer` handles this natively, but
  any logic that calls `mesh.skeleton` directly will get null — guard with
  `if (mesh.skeleton)` checks where present.
- **Single animation per file**, named after the COLLADA root anim id
  (`Controller-global-anim`, `Orient-global-anim`, etc.) rather than human
  labels like `idle`/`walk`. The asset manifest builder should map filename
  stem (e.g. `Wolf Idle`) to a clip name in the manifest, not the raw
  animation track name.
- **Texture/material fidelity** untested in this pass. Assimp emits glTF PBR
  materials but the COLLADA source only provides diffuse + emissive PNGs. The
  curation step copies these PNGs alongside the GLB; the final visual check
  belongs to the engine port wave.

