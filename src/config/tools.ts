export interface ToolData {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockLevel: number;
  staminaCost: number;
  action: string;
}

export const TOOLS: ToolData[] = [
  {
    id: "trowel",
    name: "Trowel",
    description: "Plant seed on empty tile",
    icon: "hammer",
    unlockLevel: 1,
    staminaCost: 5,
    action: "PLANT",
  },
  {
    id: "watering-can",
    name: "Watering Can",
    description: "Water sprout/sapling for growth boost",
    icon: "droplet",
    unlockLevel: 1,
    staminaCost: 3,
    action: "WATER",
  },
  {
    id: "almanac",
    name: "Almanac",
    description: "View tree stats and species info",
    icon: "book-open",
    unlockLevel: 2,
    staminaCost: 0,
    action: "INSPECT",
  },
  {
    id: "pruning-shears",
    name: "Pruning Shears",
    description: "Prune mature tree for yield bonus",
    icon: "scissors",
    unlockLevel: 3,
    staminaCost: 4,
    action: "PRUNE",
  },
  {
    id: "seed-pouch",
    name: "Seed Pouch",
    description: "Open seed inventory",
    icon: "leaf",
    unlockLevel: 4,
    staminaCost: 0,
    action: "SEEDS",
  },
  {
    id: "shovel",
    name: "Shovel",
    description: "Clear blocked tiles, dig irrigation",
    icon: "shovel",
    unlockLevel: 5,
    staminaCost: 8,
    action: "CLEAR",
  },
  {
    id: "axe",
    name: "Axe",
    description: "Chop old growth for big timber, clear old trees",
    icon: "axe",
    unlockLevel: 7,
    staminaCost: 10,
    action: "CHOP",
  },
  {
    id: "compost-bin",
    name: "Compost Bin",
    description: "Convert waste to fertilizer (2x growth for 1 cycle)",
    icon: "recycle",
    unlockLevel: 10,
    staminaCost: 6,
    action: "COMPOST",
  },
  {
    id: "rain-catcher",
    name: "Rain Catcher",
    description:
      "Place on tile: auto-waters trees in 2-tile radius during rain",
    icon: "cloud-rain",
    unlockLevel: 11,
    staminaCost: 4,
    action: "RAIN_CATCH",
  },
  {
    id: "fertilizer-spreader",
    name: "Fertilizer Spreader",
    description:
      "Area fertilize: 2x growth for all trees in 2-tile radius (costs 3 acorns)",
    icon: "sparkles",
    unlockLevel: 13,
    staminaCost: 8,
    action: "AREA_FERTILIZE",
  },
  {
    id: "scarecrow",
    name: "Scarecrow",
    description:
      "Place on tile: protects trees in 3-tile radius from windstorm damage",
    icon: "shield",
    unlockLevel: 16,
    staminaCost: 6,
    action: "SCARECROW",
  },
  {
    id: "grafting-tool",
    name: "Grafting Tool",
    description:
      "Graft a Mature+ tree to combine yields from 2 nearest species",
    icon: "git-merge",
    unlockLevel: 20,
    staminaCost: 15,
    action: "GRAFT",
  },
];

export const getToolById = (id: string): ToolData | undefined =>
  TOOLS.find((t) => t.id === id);
