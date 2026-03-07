/**
 * Pure helper for MobileActionButtons -- no RN dependencies.
 *
 * Extracted so it can be tested without mocking React Native.
 */

export interface MobileActionDef {
  id: string;
  label: string;
  toolId: string;
  enabled: boolean;
}

/**
 * Compute which mobile actions are available based on tile state.
 */
export function getDefaultMobileActions(
  _selectedTool: string,
  hasEmptyTile: boolean,
  hasYoungTree: boolean,
  hasMatureTree: boolean,
): MobileActionDef[] {
  return [
    {
      id: "plant",
      label: "Plant",
      toolId: "trowel",
      enabled: hasEmptyTile,
    },
    {
      id: "water",
      label: "Water",
      toolId: "watering-can",
      enabled: hasYoungTree,
    },
    {
      id: "prune",
      label: "Prune",
      toolId: "pruning-shears",
      enabled: hasMatureTree,
    },
    {
      id: "harvest",
      label: "Harvest",
      toolId: "axe",
      enabled: hasMatureTree,
    },
  ];
}
