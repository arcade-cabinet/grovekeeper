import type { TileState } from "../ActionButton.tsx";
import type { RadialAction } from "../radialActions.ts";
import type { GameTime } from "../TimeDisplay.tsx";
import type { TutorialTargetRect } from "../TutorialOverlay.tsx";
import type { WeatherType } from "@/game/systems/weather";

export type { TileState, RadialAction, GameTime, TutorialTargetRect, WeatherType };

export interface GameUIProps {
  onAction: () => void;
  onPlant: () => void;
  onOpenMenu: () => void;
  onOpenTools: () => void;
  onPlaceStructure?: (templateId: string, worldX: number, worldZ: number) => void;
  onBatchHarvest?: () => void;
  batchHarvestReadyCount?: number;
  currentWeather?: WeatherType;
  weatherTimeRemaining?: number;
  seedSelectOpen: boolean;
  setSeedSelectOpen: (open: boolean) => void;
  toolWheelOpen: boolean;
  setToolWheelOpen: (open: boolean) => void;
  pauseMenuOpen: boolean;
  setPauseMenuOpen: (open: boolean) => void;
  onMainMenu: () => void;
  gameTime: GameTime | null;
  playerTileInfo?: TileState | null;
  nearbyNpcTemplateId?: string | null;
  npcDialogueOpen?: boolean;
  setNpcDialogueOpen?: (open: boolean) => void;
  radialActions?: RadialAction[];
  radialOpen?: boolean;
  radialScreenPos?: { x: number; y: number } | null;
  onRadialAction?: (actionId: string) => void;
  onDismissRadial?: () => void;
  movementRef?: React.RefObject<{ x: number; z: number }>;
  onJoystickActiveChange?: (active: boolean) => void;
  tutorialTargetRect?: TutorialTargetRect | null;
  tutorialLabel?: string | null;
  tutorialDialogueId?: string | null;
  onTutorialDialogueAction?: (actionType: string) => void;
}
