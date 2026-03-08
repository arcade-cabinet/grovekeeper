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

/** Minimal TouchProvider interface required by MobileActionButtons handlers. */
export interface MobileActionProvider {
  onInteractStart(): void;
  onToolCycleStart(): void;
}

/**
 * Handle an action button press:
 *   - If the button's tool is already active: fire interact on the provider + onAction()
 *   - Otherwise: switch to the tool via onSelectTool()
 *
 * Exported as a pure function (no React/RN imports) so tests can verify
 * provider call logic without rendering the component.
 */
export function handleActionButtonPress(
  isActive: boolean,
  provider: MobileActionProvider,
  onAction: () => void,
  onSelectTool: (toolId: string) => void,
  toolId: string,
): void {
  if (isActive) {
    provider.onInteractStart();
    onAction();
  } else {
    onSelectTool(toolId);
  }
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
