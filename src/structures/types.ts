/**
 * Structure System — Block and structure type definitions.
 */

export interface BlockDefinition {
  id: string;
  name: string;
  category: "wall" | "floor" | "roof" | "door" | "fence" | "post" | "special";
  footprint: { width: number; depth: number; height: number };
  meshSource: "procedural";
  materialKey: string;
  passable: boolean;
}

export interface StructureTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  blocks: {
    blockId: string;
    localX: number;
    localY: number;
    localZ: number;
    rotation: 0 | 90 | 180 | 270;
  }[];
  footprint: { width: number; depth: number };
  cost: Record<string, number>;
  requiredLevel: number;
  effect?: {
    type: "growth_boost" | "harvest_boost" | "stamina_regen" | "storage";
    radius: number;
    magnitude: number;
  };
  upgradeTo?: string;
}
