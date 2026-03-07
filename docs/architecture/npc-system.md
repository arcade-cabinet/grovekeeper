# NPC System

> **SUPERSEDED (2026-03-07):** This document described procedural box/sphere chibi NPCs. The design has been replaced by **3DPSX ChibiCharacter GLB models with anime.js Lego-style animation** documented in `docs/plans/2026-03-07-unified-game-design.md` Section 8. Key changes:
>
> - **GLB-based, not procedural geometry.** 7 base ChibiCharacter models + 33 mix-and-match items (6 hair, hat, 3 outfits, 5 armor, shoes, bags, etc.).
> - **"pr" emission variants** for night glow (matches Ghost Birch pattern).
> - **Seeded appearance:** `scopedRNG('npc-appearance', worldSeed, npcId)` picks base character + items + color tint.
> - **Lego-style animation via anime.js** (rigid body part rotation, no skeletal rigs):
>   - Idle: Y-axis breathing bob + head rotation sway
>   - Walk: arm swing +/-30 deg + leg swing +/-25 deg + vertical bounce
>   - Look-around: head yaw +/-45 deg on seeded interval
>   - Talk: head nod + slight arm gesture
> - **10 named NPCs** (Tutorial Village) + procedural NPCs at generated villages.
> - **Procedural NPCs** generated at feature points from seed (appearance, personality, quests).
> - **Relationship system:** 4 tiers (Stranger -> Acquaintance -> Friend -> Best Friend), no decay.
> - **NPC schedules:** dawn/day/dusk/night locations per NPC.
>
> The path-following AI pattern and ECS entity model remain valid. The mesh construction and appearance system are outdated.
>
> This file is retained for historical reference only. Do not implement from this spec.

---

## HISTORICAL CONTENT BELOW

## Principle

NPCs are ECS entities with path-following AI and **procedural chibi meshes** built from box/sphere primitives. No GLB models needed -- the PSX low-poly aesthetic means simple geometry IS the art style, not a placeholder. Each NPC gets a seeded-random appearance (skin tone, clothing color, scale, speed) that's deterministic per world seed.

Movement uses the same path graph that world generation produces -- NPCs walk between path nodes with randomized target selection.

## NPC Entity Components

```typescript
interface NpcEntity {
  npc: {
    id: string;           // unique NPC identifier
    name: string;         // display name
    role: string;         // merchant, elder, wanderer, etc.
    dialogueKey: string;  // key into dialogues.json
  };
  position: { x: number; y: number; z: number };
  movement: {
    target: { x: number; z: number } | null;
    speed: number;        // units per second (1.5 - 3.0)
    state: 'idle' | 'walking' | 'talking';
  };
  appearance: {
    skinTone: string;     // hex color from SKIN_TONES palette
    clothColor: string;   // hex color from CLOTH_COLORS palette
    scale: number;        // 0.8 - 1.1 (height variation)
  };
  renderable: {
    rotation: number;     // Y-axis rotation (faces movement direction)
  };
}
```

## Chibi Mesh Construction

Each NPC is built from 4 box primitives -- head, body, left leg, right leg. Total: ~72 vertices per NPC. At 10 NPCs per zone, that's 720 vertices -- negligible.

```typescript
// components/entities/ChibiNpc.tsx

export const ChibiNpc = ({ entity }: { entity: NpcEntity }) => {
  const groupRef = useRef<THREE.Group>(null);
  const legLRef = useRef<THREE.Mesh>(null);
  const legRRef = useRef<THREE.Mesh>(null);

  const { skinTone, clothColor, scale } = entity.appearance;

  useFrame((_, dt) => {
    if (!groupRef.current) return;
    const pos = entity.position;
    const mov = entity.movement;

    // Sync position from ECS
    groupRef.current.position.set(pos.x, pos.y, pos.z);
    groupRef.current.rotation.y = entity.renderable.rotation;

    // Walk animation
    const time = performance.now() / 1000;
    const anim = time * mov.speed * 4;

    if (mov.state === 'walking') {
      // Leg swing
      if (legLRef.current) legLRef.current.rotation.x = Math.sin(anim) * 0.6;
      if (legRRef.current) legRRef.current.rotation.x = Math.sin(anim + Math.PI) * 0.6;
      // Vertical bounce
      groupRef.current.position.y = Math.abs(Math.sin(anim * 2)) * 0.15 * scale;
    } else {
      // Idle -- reset legs
      if (legLRef.current) legLRef.current.rotation.x = 0;
      if (legRRef.current) legRRef.current.rotation.x = 0;
    }
  });

  return (
    <group ref={groupRef} scale={scale}>
      {/* Body */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[0.45, 0.5, 0.3]} />
        <meshStandardMaterial color={clothColor} roughness={0.8} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 0.9, 0]} castShadow>
        <boxGeometry args={[0.55, 0.55, 0.55]} />
        <meshStandardMaterial color={skinTone} roughness={0.6} />
      </mesh>

      {/* Left leg */}
      <mesh ref={legLRef} position={[-0.12, 0.15, 0]} castShadow>
        <boxGeometry args={[0.18, 0.3, 0.18]} />
        <meshStandardMaterial color={clothColor} />
      </mesh>

      {/* Right leg */}
      <mesh ref={legRRef} position={[0.12, 0.15, 0]} castShadow>
        <boxGeometry args={[0.18, 0.3, 0.18]} />
        <meshStandardMaterial color={clothColor} />
      </mesh>
    </group>
  );
};
```

### Chibi Proportions

| Part | Geometry | Size | Position (Y) | Notes |
|------|----------|------|---------------|-------|
| Head | Box | 0.55 x 0.55 x 0.55 | 0.9 | Oversized for chibi look |
| Body | Box | 0.45 x 0.5 x 0.3 | 0.4 | Stumpy torso |
| Leg L | Box | 0.18 x 0.3 x 0.18 | 0.15 | Pivot point at top for swing |
| Leg R | Box | 0.18 x 0.3 x 0.18 | 0.15 | Pivot point at top for swing |

Total height: ~1.2 units (at scale 1.0). Player eye height is 1.6 -- NPCs are shorter, looking up at the player.

## Appearance Palettes

Defined in `config/game/npcAppearance.json`. Colors are selected per-NPC via seeded RNG.

```json
{
  "skinTones": [
    "#FFDBB4", "#E8B88A", "#C68B59",
    "#8D5524", "#5C3A1E", "#D4A373"
  ],
  "clothColors": [
    "#8B4513", "#2E5731", "#4A3B6B",
    "#8B2500", "#2B4F6E", "#6B4423",
    "#3D5A3A", "#6E3B3B", "#4A6741"
  ],
  "scaleRange": [0.8, 1.1],
  "speedRange": [1.5, 3.0]
}
```

Colors are earth-toned and forest-appropriate -- no neon, no pastels.

### Seeded Appearance Generation

```typescript
function generateNpcAppearance(
  npcId: string,
  worldSeed: string,
  config: NpcAppearanceConfig,
): NpcAppearance {
  const rng = scopedRNG('npc-appearance', worldSeed, npcId);
  return {
    skinTone: config.skinTones[Math.floor(rng() * config.skinTones.length)],
    clothColor: config.clothColors[Math.floor(rng() * config.clothColors.length)],
    scale: config.scaleRange[0] + rng() * (config.scaleRange[1] - config.scaleRange[0]),
  };
}
```

Same seed + same NPC ID = same appearance every time. Deterministic.

## Role-Specific Visual Accents (Future)

Roles can add small visual markers without needing GLBs:

| Role | Accent | Implementation |
|------|--------|----------------|
| Merchant | Small box "hat" on head | Extra box mesh, amber color |
| Elder | Slightly larger scale (1.1+) | Scale multiplier |
| Wanderer | Walking stick (cylinder) | Cylinder child mesh |
| Guard | Box "shield" on arm | Extra box mesh, grey |

These are simple geometry additions -- no GLB sourcing needed.

## Walk Animation Details

### Leg Swing

Legs rotate around their X axis (forward/back swing). The sine wave creates alternating left-right motion:

```
Left leg:  rotation.x = sin(t * speed * 4) * 0.6
Right leg: rotation.x = sin(t * speed * 4 + PI) * 0.6
```

The `* 4` multiplier means legs cycle 4 times per unit of `time * speed`. The `0.6` radians (~34 degrees) is the maximum swing angle.

### Vertical Bounce

While walking, the whole group bounces:

```
y = |sin(t * speed * 8)| * 0.15 * scale
```

The bounce frequency is 2x the leg frequency (bounce peaks when legs cross midpoint). Amplitude scales with NPC size.

### Idle

All animation stops. Legs reset to `rotation.x = 0`. Position Y returns to 0.

## Path-Following AI

NPCs select random path nodes as destinations and walk toward them. When they arrive, they idle briefly, then pick a new target.

```typescript
// src/game/systems/npcMovement.ts

// Module-scope temps -- zero per-frame allocation
const _dir = { x: 0, z: 0 };

export function updateNpcMovement(
  entity: NpcEntity,
  paths: Array<{ x: number; z: number }>,
  dt: number,
  rng: () => number,
): void {
  const mov = entity.movement;
  const pos = entity.position;

  // Pick new target if none
  if (!mov.target) {
    if (paths.length === 0) return;
    const idx = Math.floor(rng() * paths.length);
    mov.target = { x: paths[idx].x, z: paths[idx].z };
    mov.state = 'walking';
  }

  // Move toward target
  _dir.x = mov.target.x - pos.x;
  _dir.z = mov.target.z - pos.z;
  const dist = Math.sqrt(_dir.x * _dir.x + _dir.z * _dir.z);

  if (dist < 1.0) {
    // Arrived
    mov.target = null;
    mov.state = 'idle';
    return;
  }

  // Normalize and apply
  const invDist = 1 / dist;
  _dir.x *= invDist;
  _dir.z *= invDist;

  pos.x += _dir.x * mov.speed * dt;
  pos.z += _dir.z * mov.speed * dt;

  // Face movement direction
  entity.renderable.rotation = Math.atan2(_dir.x, _dir.z);
}
```

## NPC Interaction

When the player is within interaction range (3 units) and presses INTERACT:

1. NPC enters `talking` state (stops moving, faces player)
2. Dialogue UI opens with NPC's `dialogueKey`
3. On dialogue close, NPC returns to `idle` -> picks new target

## NPC Spawning

NPCs are spawned as ECS entities during zone loading. Their spawn positions come from `WorldData.entities` (type: 'npc').

```json
{
  "npcs": [
    { "id": "elder-oak", "position": [8, 0, 8], "role": "elder" },
    { "id": "seed-merchant", "position": [12, 0, 4], "role": "merchant" }
  ]
}
```

Appearance is generated from `npcId + worldSeed` -- not stored in JSON.

## Rendering Approach

NPCs are NOT instanced. Each NPC is an individual `<ChibiNpc>` component because:

1. Each has unique animation state (leg positions, bounce phase)
2. Each has unique appearance (colors, scale)
3. Count is small (5-10 per zone) -- individual meshes are fine

```typescript
// components/entities/NpcMeshes.tsx

export const NpcMeshes = () => {
  const npcs = useEntities(npcQuery);

  return (
    <group>
      {npcs.map(npc => (
        <ChibiNpc key={npc.npc.id} entity={npc} />
      ))}
    </group>
  );
};
```

## File Structure

```
src/game/npcs/
  NpcManager.ts           -- NPC spawn/despawn lifecycle
  NpcManager.test.ts      -- Tests
  types.ts                -- NPC type definitions
  data/
    npcs.json             -- NPC catalog (name, role, dialogueKey)
    dialogues.json        -- Dialogue trees per NPC

src/game/systems/
  npcMovement.ts          -- Path-following movement system
  npcMovement.test.ts     -- Tests

config/game/
  npcAppearance.json      -- Skin tones, cloth colors, scale/speed ranges

components/entities/
  NpcMeshes.tsx           -- Orchestrator: renders all NPCs
  ChibiNpc.tsx            -- Individual chibi mesh + walk animation
```
