declare module "yuka" {
  export class GameEntity {
    uuid: string;
    name: string;
    active: boolean;
    position: { x: number; y: number; z: number };
    update(delta: number): this;
  }

  export class Think<T extends GameEntity> {
    constructor(owner: T);
    addEvaluator(evaluator: GoalEvaluator<T>): this;
    evaluate(owner: T): void;
  }

  export class GoalEvaluator<T extends GameEntity> {
    characterBias: number;
    constructor(characterBias?: number);
    calculateDesirability(owner: T): number;
    setGoal(owner: T): void;
  }
}
