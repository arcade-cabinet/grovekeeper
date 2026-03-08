/**
 * ProceduralEnemies — renders all ECS enemy entities using procedural geometry.
 *
 * No GLB loading. Each enemy type is assembled from primitive geometries
 * via ProceduralEnemyBody (enemyShapes.tsx). A billboard health bar appears
 * above damaged enemies (HealthBar.tsx).
 *
 * Pure functions exported for testing:
 *   - resolveEnemyType
 *   - computeHealthBarColor (re-exported from HealthBar)
 *
 * See GAME_SPEC.md §20.
 */

import type { EnemyComponent, Entity } from "@/game/ecs/world";
import { enemiesQuery } from "@/game/ecs/world";
import { ProceduralEnemyBody } from "./enemyShapes.tsx";
import { HealthBar } from "./HealthBar.tsx";

export { computeHealthBarColor } from "./HealthBar.tsx";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HP_BAR_Y_OFFSET = 2.2;

// ---------------------------------------------------------------------------
// Pure utility (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Resolve the enemy type key from an EnemyComponent.
 * Returns the enemyType field used to key procedural body shapes.
 * A non-empty string is required — empty types indicate a data error.
 */
export function resolveEnemyType(enemy: EnemyComponent): string {
  if (!enemy.enemyType || enemy.enemyType.trim() === "") {
    return "MISSING_MODEL";
  }
  return enemy.enemyType;
}

// ---------------------------------------------------------------------------
// Single-enemy renderer
// ---------------------------------------------------------------------------

interface EnemyEntityRendererProps {
  entity: Entity & {
    enemy: EnemyComponent;
    position: NonNullable<Entity["position"]>;
    renderable: NonNullable<Entity["renderable"]>;
  };
}

const EnemyEntityRenderer = ({ entity }: EnemyEntityRendererProps) => {
  const { enemy, position, health } = entity;
  const worldPos: [number, number, number] = [position.x, position.y ?? 0, position.z];
  const rotationY = entity.rotationY ?? 0;
  const hp = health?.current ?? enemy.attackPower;
  const maxHp = health?.max ?? enemy.attackPower;

  return (
    <group position={worldPos} rotation={[0, rotationY, 0]}>
      <ProceduralEnemyBody enemyType={enemy.enemyType} />
      <HealthBar hp={hp} maxHp={maxHp} position={[0, HP_BAR_Y_OFFSET, 0]} />
    </group>
  );
};

// ---------------------------------------------------------------------------
// Public API — ProceduralEnemies
// ---------------------------------------------------------------------------

/**
 * ProceduralEnemies renders all active ECS enemy entities using procedural geometry.
 *
 * Iterates `enemiesQuery` on every render. Each enemy is rendered using its
 * `enemy.enemyType` to select a procedural body shape. A health bar billboard
 * appears above damaged enemies.
 *
 * Mount once inside the R3F Canvas.
 * See GAME_SPEC.md §20.
 */
export const ProceduralEnemies = () => {
  const entities = enemiesQuery.entities;

  return (
    <group name="procedural-enemies">
      {entities.map((entity) => (
        <EnemyEntityRenderer
          key={entity.id}
          entity={entity as EnemyEntityRendererProps["entity"]}
        />
      ))}
    </group>
  );
};
