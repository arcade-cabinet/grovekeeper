declare module "yuka" {
  export class GameEntity {
    uuid: string;
    name: string;
    active: boolean;
    position: { x: number; y: number; z: number };
    update(delta: number): this;
  }

  export class EntityManager {
    add(entity: GameEntity): this;
    remove(entity: GameEntity): this;
    update(delta: number): this;
    clear(): this;
  }

  export class Vector3 {
    x: number;
    y: number;
    z: number;
    constructor(x?: number, y?: number, z?: number);
  }

  export class Path {
    add(waypoint: Vector3): this;
    advance(): this;
    current(): Vector3;
    finished(): boolean;
    clear(): this;
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
