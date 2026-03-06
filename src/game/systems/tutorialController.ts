/**
 * Tutorial state machine that guides new players through their first actions.
 * Replaces the static 8-page RulesModal with interactive, NPC-driven guidance.
 */

export type TutorialStepId =
  | "approach"
  | "welcome"
  | "select_trowel"
  | "plant_tree"
  | "plant_congrats"
  | "select_water"
  | "water_tree"
  | "complete"
  | "done";

export interface TutorialHighlight {
  /** data-tutorial-id attribute on the target element */
  targetId: string;
  /** Instruction text shown near the highlight */
  label: string;
}

export interface TutorialCallbacks {
  /** Open NPC dialogue with the given dialogue node ID */
  openDialogue: (dialogueId: string) => void;
  /** Get current selected tool from store */
  getSelectedTool: () => string;
  /** Set hasSeenRules flag */
  setHasSeenRules: (seen: boolean) => void;
  /** Start NPC walking to player (tutorial override) */
  startNpcApproach: (
    targetX: number,
    targetZ: number,
    onArrival: () => void,
  ) => void;
  /** Clear NPC tutorial override */
  clearNpcOverride: () => void;
}

type CompletionType = "dialogue_close" | "tool_select" | "quest_event" | "auto";

interface StepDef {
  id: TutorialStepId;
  highlight: TutorialHighlight | null;
  dialogueId: string | null;
  completionType: CompletionType;
  completionValue: string | null;
  delayBeforeDialogue: number;
}

const STEPS: StepDef[] = [
  {
    id: "approach",
    highlight: null,
    dialogueId: null,
    completionType: "auto",
    completionValue: null,
    delayBeforeDialogue: 0,
  },
  {
    id: "welcome",
    highlight: null,
    dialogueId: "tutorial-welcome",
    completionType: "dialogue_close",
    completionValue: null,
    delayBeforeDialogue: 0.5,
  },
  {
    id: "select_trowel",
    highlight: { targetId: "tool-trowel", label: "Select the trowel" },
    dialogueId: null,
    completionType: "tool_select",
    completionValue: "trowel",
    delayBeforeDialogue: 0,
  },
  {
    id: "plant_tree",
    highlight: {
      targetId: "action-button",
      label: "Tap to plant a tree on this tile",
    },
    dialogueId: null,
    completionType: "quest_event",
    completionValue: "trees_planted",
    delayBeforeDialogue: 0,
  },
  {
    id: "plant_congrats",
    highlight: null,
    dialogueId: "tutorial-planted",
    completionType: "dialogue_close",
    completionValue: null,
    delayBeforeDialogue: 0.5,
  },
  {
    id: "select_water",
    highlight: {
      targetId: "tool-watering-can",
      label: "Select the watering can",
    },
    dialogueId: null,
    completionType: "tool_select",
    completionValue: "watering-can",
    delayBeforeDialogue: 0,
  },
  {
    id: "water_tree",
    highlight: {
      targetId: "action-button",
      label: "Tap to water the tree",
    },
    dialogueId: null,
    completionType: "quest_event",
    completionValue: "trees_watered",
    delayBeforeDialogue: 0,
  },
  {
    id: "complete",
    highlight: null,
    dialogueId: "tutorial-complete",
    completionType: "dialogue_close",
    completionValue: null,
    delayBeforeDialogue: 0.5,
  },
];

const STEP_TRANSITION_DELAY = 0.5;

export class TutorialController {
  private stepIndex = 0;
  private active = false;
  private waitingForDialogueClose = false;
  private dialogueOpened = false;
  private callbacks: TutorialCallbacks | null = null;
  private delayTimer = 0;
  private transitionTimer = 0;
  private transitioning = false;
  private skipRequested = false;

  /** Start the tutorial. Called when game scene is ready and hasSeenRules is false. */
  start(callbacks: TutorialCallbacks): void {
    this.callbacks = callbacks;
    this.active = true;
    this.stepIndex = 0;
    this.transitioning = false;
    this.transitionTimer = 0;
    this.skipRequested = false;
    this.enterStep();
  }

  /** Called each frame. Check step completion conditions. */
  update(dt: number): void {
    if (!this.active || !this.callbacks) return;

    // Handle transition delay between steps
    if (this.transitioning) {
      this.transitionTimer -= dt;
      if (this.transitionTimer <= 0) {
        this.transitioning = false;
        this.enterStep();
      }
      return;
    }

    // Handle delay before opening dialogue
    if (this.delayTimer > 0) {
      this.delayTimer -= dt;
      if (this.delayTimer <= 0) {
        this.openStepDialogue();
      }
      return;
    }

    const step = STEPS[this.stepIndex];
    if (!step) return;

    // Poll-based completion: tool selection
    if (step.completionType === "tool_select" && step.completionValue) {
      if (this.callbacks.getSelectedTool() === step.completionValue) {
        this.advanceStep();
      }
    }
  }

  /** Called when NPC dialogue is closed by the player. */
  onDialogueClosed(): void {
    if (!this.active || !this.waitingForDialogueClose) return;

    this.waitingForDialogueClose = false;
    this.dialogueOpened = false;

    if (this.skipRequested) {
      this.skip();
      return;
    }

    this.advanceStep();
  }

  /** Called when a dialogue choice action fires (e.g., skip_tutorial). */
  onDialogueAction(actionType: string): void {
    if (actionType === "skip_tutorial") {
      this.skipRequested = true;
    }
  }

  /** Called when a quest objective event fires (e.g., "trees_planted"). */
  onQuestEvent(eventType: string): void {
    if (!this.active) return;

    const step = STEPS[this.stepIndex];
    if (!step) return;

    if (
      step.completionType === "quest_event" &&
      step.completionValue === eventType
    ) {
      this.advanceStep();
    }
  }

  /** Get current highlight info, or null if no highlight active. */
  getHighlight(): TutorialHighlight | null {
    if (!this.active || this.transitioning || this.delayTimer > 0) return null;

    const step = STEPS[this.stepIndex];
    return step?.highlight ?? null;
  }

  /** Get current step ID. */
  getCurrentStep(): TutorialStepId {
    if (!this.active) return "done";
    const step = STEPS[this.stepIndex];
    return step?.id ?? "done";
  }

  /** Check if tutorial is active. */
  isActive(): boolean {
    return this.active;
  }

  /** Force-complete the tutorial (skip). */
  skip(): void {
    if (!this.callbacks) return;
    this.active = false;
    this.waitingForDialogueClose = false;
    this.dialogueOpened = false;
    this.transitioning = false;
    this.skipRequested = false;
    this.callbacks.setHasSeenRules(true);
    this.callbacks.clearNpcOverride();
  }

  dispose(): void {
    this.active = false;
    this.callbacks = null;
    this.waitingForDialogueClose = false;
    this.dialogueOpened = false;
    this.transitioning = false;
    this.skipRequested = false;
  }

  /** Called by the NPC brain's approach onArrival callback. */
  private advanceFromApproach(): void {
    if (!this.active) return;
    const step = STEPS[this.stepIndex];
    if (step?.id === "approach") {
      this.advanceStep();
    }
  }

  private advanceStep(): void {
    this.stepIndex++;

    if (this.stepIndex >= STEPS.length) {
      this.completeTutorial();
      return;
    }

    // Add a small transition delay between steps
    this.transitioning = true;
    this.transitionTimer = STEP_TRANSITION_DELAY;
  }

  private enterStep(): void {
    const step = STEPS[this.stepIndex];
    if (!step || !this.callbacks) return;

    this.waitingForDialogueClose = false;
    this.dialogueOpened = false;
    this.delayTimer = 0;

    if (step.id === "approach") {
      // Start NPC walking toward the player; onArrival advances to next step
      this.callbacks.startNpcApproach(0, 0, () => this.advanceFromApproach());
      return;
    }

    if (step.dialogueId) {
      if (step.delayBeforeDialogue > 0) {
        this.delayTimer = step.delayBeforeDialogue;
      } else {
        this.openStepDialogue();
      }
    }
  }

  private openStepDialogue(): void {
    const step = STEPS[this.stepIndex];
    if (!step?.dialogueId || !this.callbacks || this.dialogueOpened) return;

    this.dialogueOpened = true;
    this.waitingForDialogueClose = true;
    this.callbacks.openDialogue(step.dialogueId);
  }

  private completeTutorial(): void {
    if (!this.callbacks) return;
    this.active = false;
    this.callbacks.setHasSeenRules(true);
    this.callbacks.clearNpcOverride();
  }
}
