---
title: Grovekeeper — Post-RC Parking Lot
updated: 2026-04-24
status: current
domain: context
---

# Grovekeeper — Post-RC

Things explicitly **cut from RC** that may return as content additions or
follow-on engine work after RC ships. These are not commitments — they are
"if it earns it, it can come back."

## Cut from RC

- **Quests, fetch chains, escort missions.** RC's NPC model is the
  phrase-pool dialogue with no quest system. Post-RC could add a small
  number of opt-in quests if there's a clear design for them that doesn't
  break the "the reward is what you build" frame.
- **Player death / permadeath / difficulty tiers.** RC has no death
  state — out-of-stamina/HP forces retreat. Post-RC could explore harder
  modes if play data shows the cozy default leaves an audience asking for
  it.
- **Full 8-spirit collection meta arc.** RC has one Grove Spirit per
  grove and that's the unit of meaning. The "collect all 8" meta-arc
  from older specs is not part of RC. If post-RC adds it, it has to fit
  the frame ("each grove has its spirit") and not become a
  fetch-quest-with-extra-steps.
- **Multiplayer / networked anything.** Post-RC, if at all.
- **Cosmetics, skins, prestige.** Post-RC content.
- **Full Minecraft-scale tech tree.** RC ships a small, scope-locked
  recipe set sufficient to support the success-criterion playthrough.
  The tree expands post-RC as content additions, not engine work.

## Possible follow-on engine work (post-RC)

- **Built-in particle system** in Jolly Pixel. We mitigate during RC by
  building thin layers ourselves. Post-RC, contributing upstream is
  cleaner long-term.
- **Greedy meshing** in `voxel.renderer`. Perf optimization for dense
  chunks. Mitigation during RC is tunable chunk radius.
- **Shader plumbing** in Jolly Pixel. The grove glow needs custom shader
  passes; we own them locally for RC.
- **GLB animation blending** in `ModelRenderer`. Currently clip-by-clip
  switching only. Fine for chibi, but smooth walk→run blends would help.

## Possible content additions (post-RC)

- More creatures (peaceful and hostile) per biome.
- More crafting stations and recipes — biome-specific production lines.
- More structural prefabs for building.
- Seasonal events.
- Music expansion.

## Cut wilderness biomes (deferred from RC)

RC ships **three wilderness biomes (Meadow, Forest, Coast) plus the
special Grove biome.** The following biomes were considered for RC but
cut by the Wave 2 asset inventory (`docs/asset-inventory.md`). Each
notes what would have to land — assets, shaders, audio — to bring it back.

- **Wetland.** Cut: no water shader available, fauna coverage too thin
  in the existing itch.io library. To bring back: water-surface shader
  (refraction, ripple), wetland-specific fauna pack (frogs, herons,
  dragonflies, giant insects), reed/lily/willow voxel flora set, sinkhole
  hazard system, stilt-hut hearth prefab, wetland ambient + music beds.
- **Alpine.** Cut: no snow tileset and no snow-footstep SFX in the
  source library; without distinctive snow textures and audio it
  visually collapses into Forest. To bring back: snow + ice tilesets,
  snow-footstep SFX bank (per-surface), snow-fall particle layer,
  blizzard weather variant with reduced visibility, alpine fauna pack
  (mountain goats, hares, ice wolves), spruce / snow-flower voxel flora,
  stone-cabin hearth prefab.
- **Scrub.** Cut: no scrub-flora voxel set, the available "africa fauna"
  pack clashes with the cozy tone of the game, and there are no dust
  footstep SFX. To bring back: cozy-tone-aligned scrub fauna pack (no
  africa-pack reuse), cactus / sage / juniper voxel flora, dust-storm
  weather variant, dust-footstep SFX bank, scorpion threat actors,
  adobe hearth prefab, scrub ambient + music beds.

Each of these is a content + asset-pipeline addition rather than engine
work — the engine handles biomes generically; what gates them is the
asset pool. None are committed to; they return only if RC ships and a
post-RC content milestone justifies the asset cost.
