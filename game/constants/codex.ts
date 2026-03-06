/**
 * Species Codex -- encyclopedic data for each tree species.
 *
 * Discovery progresses through 5 tiers based on player interaction:
 * Tier 0: Unknown (silhouette only)
 * Tier 1: Discovered (planted at least once -- reveals name, icon, basic info)
 * Tier 2: Studied (grown to Mature -- reveals growth traits, habitat)
 * Tier 3: Mastered (grown to Old Growth -- reveals full lore, tips)
 * Tier 4: Legendary (harvested 10+ times -- reveals secret lore, milestone reward)
 */

// ---------------------------------------------------------------------------
// Discovery tier definitions
// ---------------------------------------------------------------------------

export interface DiscoveryTierDef {
  tier: number;
  name: string;
  description: string;
}

export const DISCOVERY_TIERS: Record<number, DiscoveryTierDef> = {
  0: { tier: 0, name: "Unknown", description: "A mysterious species..." },
  1: {
    tier: 1,
    name: "Discovered",
    description: "Plant this species to begin learning about it.",
  },
  2: {
    tier: 2,
    name: "Studied",
    description: "Grow to Mature stage to unlock habitat info.",
  },
  3: {
    tier: 3,
    name: "Mastered",
    description: "Reach Old Growth to reveal full lore.",
  },
  4: {
    tier: 4,
    name: "Legendary",
    description: "Harvest 10+ times to unlock secret lore.",
  },
};

export type DiscoveryTier = 0 | 1 | 2 | 3 | 4;

// ---------------------------------------------------------------------------
// Species codex entries
// ---------------------------------------------------------------------------

export interface SpeciesCodexEntry {
  speciesId: string;
  lore: {
    tier1: string;
    tier2: string;
    tier3: string;
    tier4: string;
  };
  habitat: string;
  growthTip: string;
  funFact: string;
}

const SPECIES_CODEX: SpeciesCodexEntry[] = [
  {
    speciesId: "white-oak",
    lore: {
      tier1:
        "The White Oak is the backbone of any young grove. Sturdy and dependable, it provides a reliable supply of timber for aspiring grovekeepers.",
      tier2:
        "White Oaks thrive in temperate soil with moderate sunlight. Their root systems stabilize the earth, making them ideal first plantings.",
      tier3:
        "Ancient grovekeepers believed the first White Oak planted in a new forest would become its guardian spirit, watching over all who tended the land.",
      tier4:
        "A grove with a hundred harvested White Oaks is said to hum with quiet energy. The timber from such a grove never warps or splinters.",
    },
    habitat: "Temperate meadows and lowland valleys",
    growthTip:
      "A forgiving species. Water regularly for a steady growth boost.",
    funFact:
      "White Oaks can live for centuries, their trunks growing wider than a grove keeper's hut.",
  },
  {
    speciesId: "weeping-willow",
    lore: {
      tier1:
        "The Weeping Willow drapes its long branches toward the water, producing rich golden sap prized by crafters and healers alike.",
      tier2:
        "Willows flourish near water sources. Planting one beside a pond or stream boosts its sap yield by nearly a third.",
      tier3:
        "In old folklore, the Weeping Willow weeps not from sadness but from joy -- its tears are drops of liquid amber that nourish the soil beneath.",
      tier4:
        "A legendary grove of willows once produced sap so pure it glowed faintly at dusk. Traders traveled from distant lands to acquire even a single vial.",
    },
    habitat: "Wetlands, riverbanks, and pond shores",
    growthTip:
      "Plant near water tiles for a 30% yield bonus. Keep the soil moist.",
    funFact:
      "Willow bark was once steeped into a bitter tea used to soothe aching joints.",
  },
  {
    speciesId: "elder-pine",
    lore: {
      tier1:
        "The Elder Pine stands tall against mountain winds, its needle-laden boughs shielding the grove from harsh weather.",
      tier2:
        "Native to highland crags, the Elder Pine is one of few species that continues growing through winter, albeit at a reduced pace.",
      tier3:
        "Mountain hermits carve symbols into Elder Pine trunks to mark safe paths through blizzards. The resin seals the cuts, preserving the markings for decades.",
      tier4:
        "The oldest Elder Pine on record grew for twelve generations. Its trunk held a natural hollow large enough to shelter a family during storms.",
    },
    habitat: "Mountain slopes and highland ridges",
    growthTip:
      "One of the few species that grows at 30% rate in Winter. Excellent for year-round timber.",
    funFact:
      "Elder Pine needles release a sharp, refreshing scent when crushed -- a natural air freshener for the grove.",
  },
  {
    speciesId: "cherry-blossom",
    lore: {
      tier1:
        "The Cherry Blossom paints the grove in soft pink hues. Its delicate fruit is a rare treat, and its beauty inspires all who walk beneath it.",
      tier2:
        "Cherry Blossoms prefer sheltered temperate groves. Their Beauty Aura radiates gentle energy that enhances XP gain for nearby activities.",
      tier3:
        "Legend says the first Cherry Blossom tree sprouted where a grove keeper shed a tear of pure happiness. Its petals carried the memory of that joy forever.",
      tier4:
        "A grove where Cherry Blossoms have been harvested beyond measure is bathed in a perpetual gentle glow. The petals never fully fall -- they drift endlessly.",
    },
    habitat: "Sheltered temperate groves and garden clearings",
    growthTip:
      "Beauty Aura grants +10% XP within 1 tile. Plant near your work area for passive XP gains.",
    funFact:
      "Cherry Blossom petals are edible and slightly sweet, often scattered over festive cakes.",
  },
  {
    speciesId: "ghost-birch",
    lore: {
      tier1:
        "The Ghost Birch glows faintly in the dark, its pale bark shimmering like moonlight on snow. It yields both sap and acorns.",
      tier2:
        "Found at the edge of tundra regions, the Ghost Birch thrives in cold soil. It grows at half speed during winter when most other species are dormant.",
      tier3:
        "Wanderers tell of Ghost Birch groves that light up frozen valleys, guiding lost travelers to safety. The trees seem to pulse brighter when someone is near.",
      tier4:
        "A masterfully tended Ghost Birch is said to remember every hand that touched its bark. Its glow shifts in color for those the tree has known the longest.",
    },
    habitat: "Tundra edges and frost-touched woodlands",
    growthTip:
      "Grows at 50% speed in Winter while most species stall. Night glow makes it easy to spot after dark.",
    funFact:
      "Ghost Birch bark peels in thin, translucent sheets that can be used as natural lantern shades.",
  },
  {
    speciesId: "redwood",
    lore: {
      tier1:
        "The Redwood towers above all others, a monument to patience. Its massive trunk yields more timber than any other species.",
      tier2:
        "Redwoods favor the coastal mist, drawing moisture from fog. They grow slowly but reward the patient keeper with enormous harvests.",
      tier3:
        "The heartwood of a Redwood is nearly impervious to rot. Ancient builders prized it for bridges and longhouses that would outlast generations.",
      tier4:
        "The tallest Redwood ever recorded reached so high that clouds would snag on its crown. Birds nested at the top reported seeing the curvature of the world.",
    },
    habitat: "Coastal fog belts and temperate rainforests",
    growthTip:
      "Slow to mature but yields 5 timber per harvest. At Old Growth stage, gains a bonus Acorn per cycle.",
    funFact:
      "A single Redwood can contain enough timber to build an entire village.",
  },
  {
    speciesId: "flame-maple",
    lore: {
      tier1:
        "The Flame Maple blazes with fiery orange and crimson leaves. Its fruit is as vibrant as its canopy, prized for autumn celebrations.",
      tier2:
        "Highland clearings suit the Flame Maple best. Its Beauty Aura extends two tiles, and autumn doubles its fruit yield.",
      tier3:
        "Artists and poets have long sought groves of Flame Maples in autumn. The falling leaves are said to write fleeting poetry in the wind before they touch the ground.",
      tier4:
        "A legendary Flame Maple once burned so brightly in autumn that travelers mistook it for a bonfire. Its fruit tasted of warm spices and distant memories.",
    },
    habitat: "Highland clearings and mountain meadows",
    growthTip:
      "2-tile Beauty Aura and 2x fruit yield in Autumn. Plan your planting around the seasonal calendar.",
    funFact:
      "Flame Maple syrup is dark amber with a smoky sweetness found nowhere else.",
  },
  {
    speciesId: "baobab",
    lore: {
      tier1:
        "The Baobab is a titan of the savanna -- thick-trunked and broad-crowned. It yields timber, sap, and fruit in equal measure.",
      tier2:
        "Baobabs are built for drought. Their swollen trunks store vast reserves of water, allowing them to endure the harshest dry seasons.",
      tier3:
        "Savanna elders gather beneath the Baobab for council. Its wide canopy shelters entire communities, and its roots are said to tap into the memory of the earth.",
      tier4:
        "A Baobab tended beyond legend becomes a living landmark. Its hollow trunk can house a small library of grove keeper journals spanning centuries.",
    },
    habitat: "Savanna grasslands and arid plains",
    growthTip:
      "Drought-resistant and yields all three resources. Occupies a 2-tile footprint -- plan your grid accordingly.",
    funFact:
      "Baobab fruit pulp, when dried, tastes like tart sherbet and is packed with nutrients.",
  },
  {
    speciesId: "silver-birch",
    lore: {
      tier1:
        "The Silver Birch is graceful and quick-growing, its papery white bark peeling to reveal warm copper beneath. It yields both sap and timber.",
      tier2:
        "Silver Birches love temperate soil near gentle streams. Proximity to water accelerates their already brisk growth rate.",
      tier3:
        "Crafters prize Silver Birch bark for making lightweight containers and writing scrolls. The inner bark is naturally waterproof when layered.",
      tier4:
        "A grove of legendary Silver Birches catches the wind in such a way that the rustling leaves form a natural melody. Visitors sometimes fall asleep listening.",
    },
    habitat: "Temperate woodlands near streams",
    growthTip:
      "Grows 20% faster near water tiles. Quick cycle times make it efficient for early sap production.",
    funFact:
      "Silver Birch sap can be tapped in spring and fermented into a mildly sweet wine.",
  },
  {
    speciesId: "ironbark",
    lore: {
      tier1:
        "The Ironbark is a fortress wrapped in bark. Its timber is so dense it dulls ordinary axes, but the yield per harvest is immense.",
      tier2:
        "Mountain strongholds are Ironbark's natural domain. It shrugs off windstorms entirely and only grows hardier over time.",
      tier3:
        "Smiths once used Ironbark charcoal to fuel their hottest forges. The resulting metal was lighter and stronger than anything made with common fuel.",
      tier4:
        "An Ironbark that has survived a hundred harvests develops a metallic sheen in its bark. Some claim you can see your reflection in it on clear days.",
    },
    habitat: "Mountain strongholds and rocky ridgelines",
    growthTip:
      "Completely immune to windstorm damage. At Old Growth, timber yield triples to 12 per harvest.",
    funFact:
      "Ironbark heartwood is so dense it sinks in water -- one of the few woods that does.",
  },
  {
    speciesId: "golden-apple",
    lore: {
      tier1:
        "The Golden Apple tree bears luminous golden fruit that tastes of honey and sunshine. It is the pride of any orchard.",
      tier2:
        "Orchards with rich soil and long summers suit the Golden Apple best. Autumn triples its already generous fruit yield.",
      tier3:
        "There is an old saying among grovekeepers: plant a Golden Apple where the sun sets, and you will never go hungry through winter.",
      tier4:
        "The juice of a legendary Golden Apple is said to restore vigor to the weary and clarity to the confused. Some even claim it can reverse a bad hair day.",
    },
    habitat: "Orchards and sun-drenched clearings",
    growthTip:
      "3x fruit yield in Autumn. Time your harvests with the seasonal calendar for maximum output.",
    funFact:
      "Golden Apple blossoms attract rare honeybees that produce an unusually fragrant honey.",
  },
  {
    speciesId: "mystic-fern",
    lore: {
      tier1:
        "The Mystic Fern is not a tree at all, but a colossal fern that grows with uncanny speed when surrounded by other plants.",
      tier2:
        "Enchanted groves are the Mystic Fern's home. Each adjacent tree boosts its growth by 15%, stacking up to 60%.",
      tier3:
        "Scholars debate whether the Mystic Fern is truly a plant or something older. Its fronds unfurl in spiral patterns that match no known botanical family.",
      tier4:
        "A Mystic Fern at the heart of a dense grove begins to hum at a frequency just below hearing. Animals gather near it, and the soil turns unusually fertile.",
    },
    habitat: "Enchanted groves and ancient forest floors",
    growthTip:
      "Growth stacks +15% per adjacent tree (max +60%). Surround it with other plantings for maximum speed.",
    funFact:
      "Mystic Fern spores glow faintly green on moonless nights, creating tiny constellations on the forest floor.",
  },
  {
    speciesId: "crystal-oak",
    lore: {
      tier1:
        "The Crystalline Oak shimmers with prismatic light. Its bark has a mineral sheen, and it drops acorns of extraordinary purity.",
      tier2:
        "Found only in enchanted groves after a prestige awakening, the Crystal Oak requires patience and rare acorns to cultivate.",
      tier3:
        "Each Crystal Oak acorn contains a tiny prismatic crystal at its core. When planted, the crystal dissolves into the soil, imbuing the next tree with light.",
      tier4:
        "A legendary Crystal Oak refracts sunlight into permanent rainbows. Grove visitors report that standing beneath one fills them with an inexplicable sense of wonder.",
    },
    habitat: "Enchanted groves (prestige only)",
    growthTip:
      "Requires prestige to unlock. Yields 5 acorns per harvest -- the highest acorn yield of any species.",
    funFact:
      "Crystal Oak wood, when polished, is naturally transparent along the grain.",
  },
  {
    speciesId: "moonwood-ash",
    lore: {
      tier1:
        "The Moonwood Ash only grows under starlight. Its silvery bark and lavender canopy mark it as a truly otherworldly species.",
      tier2:
        "This rare ash requires darkness to photosynthesize. It enters dormancy at dawn and resumes growth only after nightfall.",
      tier3:
        "Moonwood Ash leaves absorb moonlight and release it slowly, creating a soft glow that persists for hours after the moon has set.",
      tier4:
        "A fully legendary Moonwood Ash is said to bloom once per decade. Those who witness the blooming receive a blessing of restful sleep for a year and a day.",
    },
    habitat: "Enchanted groves (prestige only, nocturnal)",
    growthTip:
      "Grows only at night. Plan your tending schedule around the day/night cycle for optimal progress.",
    funFact:
      "Moonwood Ash timber glows faintly silver for weeks after being cut, slowly fading as the stored moonlight dissipates.",
  },
  {
    speciesId: "worldtree",
    lore: {
      tier1:
        "The Worldtree is the rarest and mightiest of all species. Its roots reach deep, its crown touches the sky, and it yields every resource known.",
      tier2:
        "Only the most experienced grovekeepers can cultivate a Worldtree. It demands vast resources to plant and an enormous 2x2 footprint.",
      tier3:
        "Ancient texts speak of a single Worldtree whose roots connected every grove in existence. Tending it was said to tend the world itself.",
      tier4:
        "A legendary Worldtree becomes the axis of its grove. Seasons are kinder, storms are gentler, and every tree in its shadow grows a little faster.",
    },
    habitat: "Enchanted groves (prestige only, requires 3 prestiges)",
    growthTip:
      "2x2 footprint and longest growth cycle. Boosts the entire grove. Place it centrally for maximum effect.",
    funFact:
      "No two Worldtrees have ever been observed growing in the same grove. They seem to know.",
  },
];

/**
 * Look up a codex entry by species ID.
 */
export function getCodexEntry(
  speciesId: string,
): SpeciesCodexEntry | undefined {
  return SPECIES_CODEX.find((entry) => entry.speciesId === speciesId);
}

/**
 * Return all species codex entries.
 */
export function getAllCodexEntries(): readonly SpeciesCodexEntry[] {
  return SPECIES_CODEX;
}

// ---------------------------------------------------------------------------
// Biome codex entries
// ---------------------------------------------------------------------------

export interface BiomeCodexEntry {
  id: string;
  name: string;
  description: string;
  climate: string;
  nativeSpecies: string[];
}

export const BIOME_CODEX: BiomeCodexEntry[] = [
  {
    id: "temperate",
    name: "Temperate",
    description:
      "Rolling meadows and gentle woodlands with mild seasons. The most common biome for new grovekeepers.",
    climate: "Mild, four distinct seasons",
    nativeSpecies: ["white-oak", "cherry-blossom", "silver-birch"],
  },
  {
    id: "wetland",
    name: "Wetland",
    description:
      "Marshy hollows and pond-dotted clearings where water-loving species thrive.",
    climate: "Humid, frequent rainfall",
    nativeSpecies: ["weeping-willow"],
  },
  {
    id: "mountain",
    name: "Mountain",
    description:
      "Rocky slopes and wind-swept ridges where only the hardiest trees take root.",
    climate: "Cold, high altitude, strong winds",
    nativeSpecies: ["elder-pine", "ironbark"],
  },
  {
    id: "tundra-edge",
    name: "Tundra Edge",
    description:
      "The frozen borderlands where permafrost meets forest. Trees here must endure long, dark winters.",
    climate: "Frigid, extended winters",
    nativeSpecies: ["ghost-birch"],
  },
  {
    id: "coastal",
    name: "Coastal",
    description:
      "Fog-drenched shores and sea-salt air. Massive trees grow slowly here but reach staggering heights.",
    climate: "Cool, perpetual mist",
    nativeSpecies: ["redwood"],
  },
  {
    id: "highland",
    name: "Highland",
    description:
      "Elevated meadows above the treeline, ablaze with color in autumn.",
    climate: "Cool, dramatic seasonal shifts",
    nativeSpecies: ["flame-maple"],
  },
  {
    id: "savanna",
    name: "Savanna",
    description:
      "Wide-open grasslands baked by sun, where drought-resistant giants stand sentinel.",
    climate: "Hot, dry with seasonal rains",
    nativeSpecies: ["baobab"],
  },
  {
    id: "orchard",
    name: "Orchard",
    description:
      "Cultivated clearings rich with fruit-bearing trees, tended by generations of grovekeepers.",
    climate: "Warm, sunny with gentle rains",
    nativeSpecies: ["golden-apple"],
  },
  {
    id: "enchanted",
    name: "Enchanted",
    description:
      "Groves touched by ancient magic. Unusual species grow here that cannot survive elsewhere.",
    climate: "Mysterious, variable",
    nativeSpecies: ["mystic-fern", "crystal-oak", "moonwood-ash", "worldtree"],
  },
];

/**
 * Look up a biome codex entry by biome ID.
 */
export function getBiomeEntry(biomeId: string): BiomeCodexEntry | undefined {
  return BIOME_CODEX.find(
    (entry) => entry.id === biomeId.toLowerCase().replace(/\s+/g, "-"),
  );
}
