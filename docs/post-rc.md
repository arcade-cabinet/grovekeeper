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

- More biomes (jungle, tundra, volcanic, etc.). RC ships six target
  biomes (final list adapts to inventory).
- More creatures (peaceful and hostile) per biome.
- More crafting stations and recipes — biome-specific production lines.
- More structural prefabs for building.
- Seasonal events.
- Music expansion.
