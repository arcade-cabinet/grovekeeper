/**
 * Quest chain types stub.
 */

export interface QuestChainStepProgress {
  objectiveProgress: Record<string, number>;
  completed: boolean;
  rewardClaimed: boolean;
}

export interface ActiveChain {
  chainId: string;
  currentStepIndex: number;
  stepProgress: QuestChainStepProgress[];
  startedDay: number;
  completed: boolean;
}

export interface QuestChainState {
  activeChains: ActiveChain[];
  completedChainIds: string[];
  availableChainIds: string[];
}
