/**
 * enemyShapes — dispatcher that maps enemyType strings to procedural body builders.
 *
 * Shape implementations live in tier-specific files:
 *   enemyShapesTier1.tsx  — bat, killer-pig, abomination
 *   enemyShapesTier23.tsx — elk-demon, green-goliath, bigfoot,
 *                           plague-doctor, skeleton-warrior, knight, werewolf
 *   enemyShapesTier45.tsx — cyclops, blood-wraith, corrupted-hedge, devil
 *
 * See GAME_SPEC.md §20.
 */

import type { BodyProps } from "./enemyColors.ts";
import { ENEMY_COLORS, FALLBACK_COLORS } from "./enemyColors.ts";
import { AbominationBody, BatBody, KillerPigBody } from "./enemyShapesTier1.tsx";
import {
  BigfootBody,
  ElkDemonBody,
  GreenGoliathBody,
  KnightBody,
  PlagueDoctorBody,
  SkeletonWarriorBody,
  WerewolfBody,
} from "./enemyShapesTier23.tsx";
import {
  BloodWraithBody,
  CorruptedHedgeBody,
  CyclopsBody,
  DevilBody,
  FallbackEnemyBody,
} from "./enemyShapesTier45.tsx";

// ---------------------------------------------------------------------------
// Shape map (enemyType -> builder)
// ---------------------------------------------------------------------------

const BODY_MAP: Record<string, (props: BodyProps) => React.ReactElement> = {
  bat: (p) => <BatBody {...p} />,
  "killer-pig": (p) => <KillerPigBody {...p} />,
  abomination: (p) => <AbominationBody {...p} />,
  "elk-demon": (p) => <ElkDemonBody {...p} />,
  "green-goliath": (p) => <GreenGoliathBody {...p} />,
  bigfoot: (p) => <BigfootBody {...p} />,
  "plague-doctor": (p) => <PlagueDoctorBody {...p} />,
  "skeleton-warrior": (p) => <SkeletonWarriorBody {...p} />,
  knight: (p) => <KnightBody {...p} />,
  werewolf: (p) => <WerewolfBody {...p} />,
  cyclops: (p) => <CyclopsBody {...p} />,
  "blood-wraith": (p) => <BloodWraithBody {...p} />,
  "corrupted-hedge": (p) => <CorruptedHedgeBody {...p} />,
  devil: (p) => <DevilBody {...p} />,
};

// ---------------------------------------------------------------------------
// ProceduralEnemyBody dispatcher
// ---------------------------------------------------------------------------

/** Renders the correct procedural body shape for a given enemyType. */
export const ProceduralEnemyBody = ({ enemyType }: { enemyType: string }) => {
  const colors = ENEMY_COLORS[enemyType] ?? FALLBACK_COLORS;
  const builder = BODY_MAP[enemyType];
  if (builder) return builder({ colors });
  return <FallbackEnemyBody colors={colors} />;
};
