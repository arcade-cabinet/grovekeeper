# Tool Action System -- Complete Design Specification

> **NOTE (2026-03-07):** Core tool action mechanics remain accurate. Updates from `docs/plans/2026-03-07-unified-game-design.md` Section 6:
>
> - **Tool upgrade tiers:** Basic -> Iron -> Grovekeeper. Each tier improves damage (1.0x/1.5x/2.0x), speed (1.0x/1.25x/1.5x), and durability (50/150/500 uses).
> - **Tool durability system:** Tools degrade with use (1/use, 3 on wrong target, 2 while exhausted). Repair at Forge for half upgrade cost.
> - **New craftable tools:** Fishing Rod, Hammer, Needle, Pickaxe (not starting gear -- must be crafted).
> - **Starting gear:** Basic Axe + Basic Trowel + Watering Can + 3 White Oak seeds + Leather Satchel + Worn Compass.
> - **Grovekeeper-tier visual:** emissive vine pattern, species-colored based on Grove Essence source. Subtle particle trail on swing.
> - **Iron Ingot** required for Iron tier: 3 Ore + 1 Timber (fuel) at Forge.
> - **Grove Essence** required for Grovekeeper tier: drops from labyrinth enemies (1 per Skeleton Warrior, 10% per Bat).
> - **Non-degrading tools:** Watering Can, Almanac, Seed Pouch, Worn Compass.

Production-quality spec for first-person tool actions in Grovekeeper. Covers swing animations, impact effects, resource drops, stamina feedback, tool switching, view model juice, and raycast interaction for all 5 GLB tools.

---

## Table of Contents

1. [Tool View Model Positioning](#1-tool-view-model-positioning)
2. [Use Animations](#2-use-animations)
3. [Impact Effects](#3-impact-effects)
4. [Resource Drop Visuals](#4-resource-drop-visuals)
5. [Stamina Feedback](#5-stamina-feedback)
6. [Tool Switching](#6-tool-switching)
7. [View Model Juice](#7-view-model-juice)
8. [Raycast Interaction](#8-raycast-interaction)
9. [Config Schemas](#9-config-schemas)
10. [R3F Component Pseudocode](#10-r3f-component-pseudocode)
11. [Reduced Motion Matrix](#11-reduced-motion-matrix)

---

## 1. Tool View Model Positioning

The tool is a child of the camera, rendered in camera-local space. All positions are relative to the camera origin (eye position at Y=1.6 world units).

### Default Base Position

All tools share a common anchor. Per-tool adjustments shift from this base.

| Parameter | Value | Notes |
|-----------|-------|-------|
| Base position | `(0.35, -0.32, -0.50)` | Right-hand side, below center, in front of camera |
| Base rotation | `(0, 0, 0)` | Euler XYZ in radians |
| Render order | `999` | Always on top of scene geometry |
| Depth test | `false` | Never clipped by world geometry |
| Layer | `1` (camera-only layer) | Not affected by scene lighting/shadows |

### Per-Tool Offsets

Each tool model has unique proportions. These offsets are additive to the base position.

| Tool ID | GLB | Position Offset (x, y, z) | Rotation (pitch, yaw, roll) rad | Scale | Grip Description |
|---------|-----|--------------------------|-------------------------------|-------|------------------|
| trowel | Hoe.glb | `(0.0, 0.02, -0.05)` | `(-0.3, 0.2, 0.0)` | `0.40` | Angled forward, blade pointing down-left, ready to stab soil |
| axe | Axe.glb | `(0.05, -0.05, 0.0)` | `(-0.4, 0.3, -0.15)` | `0.45` | Head angled outward, handle resting against palm, cocked back slightly |
| pruning-shears | Hatchet.glb | `(-0.02, 0.03, -0.03)` | `(-0.2, 0.15, 0.1)` | `0.38` | Compact grip, blade forward, slight inward cant |
| shovel | Shovel.glb | `(0.03, -0.08, -0.05)` | `(-0.35, 0.25, -0.05)` | `0.42` | Long handle extends below frame, scoop forward |
| pickaxe | Pickaxe.glb | `(0.06, -0.06, 0.0)` | `(-0.45, 0.3, -0.1)` | `0.44` | Heavy head, handle angled back, two-hand grip implied |

### FOV Considerations

| State | FOV | Tool Scale Adjust | Notes |
|-------|-----|-------------------|-------|
| Normal | 65 | 1.0x | Default |
| Sprinting | 72 | 0.95x | Slight shrink prevents tool filling extra FOV space |

### Material Override

All tool meshes use a shared `MeshBasicMaterial` (unlit) sampling `Tools_Texture.png` at `magFilter: NearestFilter`, `minFilter: NearestFilter` for PSX pixel crunch. No scene lighting affects the tool -- it has its own flat shading baked into the texture.

---

## 2. Use Animations

Every animation is driven by a normalized progress value `t` (0.0 to 1.0) advanced each frame. The animation system reads `t`, looks up the current keyframe segment, and interpolates position/rotation using the specified easing.

### Animation State Machine

```
IDLE --> USE_WINDUP --> USE_IMPACT --> USE_RECOVERY --> IDLE
                                         |
                                         v (if another use queued)
                                      USE_WINDUP
```

Input buffering: one use action can be queued during an active animation. If `useTool` fires during `USE_RECOVERY` (after the impact frame), the queued action fires immediately when recovery completes.

### Easing Functions

| Name | Formula | Character |
|------|---------|-----------|
| `easeInQuad` | `t * t` | Slow start, accelerating |
| `easeOutQuad` | `t * (2 - t)` | Fast start, decelerating |
| `easeOutBack` | `t * t * (2.70158 * t - 1.70158)` | Overshoot then settle |
| `easeOutElastic` | `2^(-10t) * sin((t-0.075)*2PI/0.3) + 1` | Springy bounce |
| `easeInOutCubic` | `t<0.5 ? 4t^3 : 1-(-2t+2)^3/2` | Smooth S-curve |
| `linear` | `t` | Constant rate |

### 2.1 Trowel (Hoe.glb) -- "Stab"

A quick downward thrust into soil, slight twist, then spring back.

**Total duration: 400ms**
**Impact frame: 200ms (t = 0.50)**

| Phase | Time (ms) | t range | Position delta (x, y, z) | Rotation delta (pitch, yaw, roll) | Easing |
|-------|-----------|---------|--------------------------|----------------------------------|--------|
| Windup | 0-100 | 0.00-0.25 | `(0, +0.06, 0)` | `(+0.15, 0, 0)` | easeInQuad |
| Strike | 100-200 | 0.25-0.50 | `(0, -0.18, -0.12)` | `(-0.50, +0.05, +0.08)` | easeInQuad |
| **IMPACT** | 200 | 0.50 | -- | -- | -- |
| Bounce | 200-280 | 0.50-0.70 | `(0, +0.04, +0.03)` | `(+0.10, 0, -0.02)` | easeOutBack |
| Recovery | 280-400 | 0.70-1.00 | `(0, 0, 0)` | `(0, 0, 0)` | easeOutElastic |

**Motion character:** Gardening -- a controlled poke, not violent. The slight upward windup (lifting to aim) before the downward thrust gives weight. The bounce conveys soil resistance.

### 2.2 Axe (Axe.glb) -- "Chop"

Overhead arc: lift high, swing down hard, embed in wood, wrench free.

**Total duration: 600ms**
**Impact frame: 320ms (t = 0.533)**

| Phase | Time (ms) | t range | Position delta (x, y, z) | Rotation delta (pitch, yaw, roll) | Easing |
|-------|-----------|---------|--------------------------|----------------------------------|--------|
| Lift | 0-180 | 0.00-0.30 | `(-0.05, +0.22, +0.05)` | `(+0.70, -0.10, +0.05)` | easeInOutCubic |
| Swing down | 180-320 | 0.30-0.533 | `(+0.08, -0.30, -0.18)` | `(-1.20, +0.15, -0.10)` | easeInQuad |
| **IMPACT** | 320 | 0.533 | -- | -- | -- |
| Embed | 320-400 | 0.533-0.667 | `(0, -0.03, -0.02)` | `(-0.05, 0, 0)` | linear |
| Wrench | 400-480 | 0.667-0.80 | `(-0.04, +0.10, +0.08)` | `(+0.30, -0.08, +0.05)` | easeOutQuad |
| Recovery | 480-600 | 0.80-1.00 | `(0, 0, 0)` | `(0, 0, 0)` | easeOutElastic |

**Motion character:** Satisfying wood-chop. The long lift builds anticipation. The fast downswing accelerates (easeInQuad) for maximum impact. The brief "embed" phase (80ms of near-stillness) sells the blade biting into wood. The wrench-free motion gives a tactile pull.

### 2.3 Pruning Shears (Hatchet.glb) -- "Snip"

Quick lateral squeeze -- the hatchet rotates inward (simulating shear blades closing), then springs open.

**Total duration: 300ms**
**Impact frame: 140ms (t = 0.467)**

| Phase | Time (ms) | t range | Position delta (x, y, z) | Rotation delta (pitch, yaw, roll) | Easing |
|-------|-----------|---------|--------------------------|----------------------------------|--------|
| Reach | 0-80 | 0.00-0.267 | `(0, +0.02, -0.08)` | `(-0.10, +0.05, 0)` | easeOutQuad |
| Squeeze | 80-140 | 0.267-0.467 | `(+0.06, -0.04, -0.04)` | `(+0.05, -0.20, +0.35)` | easeInQuad |
| **IMPACT** | 140 | 0.467 | -- | -- | -- |
| Open | 140-200 | 0.467-0.667 | `(-0.03, +0.02, +0.02)` | `(-0.02, +0.10, -0.40)` | easeOutBack |
| Recovery | 200-300 | 0.667-1.00 | `(0, 0, 0)` | `(0, 0, 0)` | easeOutQuad |

**Motion character:** Precise, gardener-like. The roll rotation (0.35 rad) is the key motion -- it rotates the blade inward as if closing shears. Fast and crisp, reflecting the precision of pruning.

### 2.4 Shovel (Shovel.glb) -- "Dig"

Two-phase: push down into ground, then lever up (scooping motion).

**Total duration: 550ms**
**Impact frame: 250ms (t = 0.455)**

| Phase | Time (ms) | t range | Position delta (x, y, z) | Rotation delta (pitch, yaw, roll) | Easing |
|-------|-----------|---------|--------------------------|----------------------------------|--------|
| Lift | 0-120 | 0.00-0.218 | `(0, +0.10, +0.03)` | `(+0.25, 0, 0)` | easeInOutCubic |
| Plunge | 120-250 | 0.218-0.455 | `(0, -0.25, -0.15)` | `(-0.60, +0.05, 0)` | easeInQuad |
| **IMPACT** | 250 | 0.455 | -- | -- | -- |
| Resist | 250-320 | 0.455-0.582 | `(0, -0.03, -0.01)` | `(-0.05, 0, 0)` | linear |
| Lever up | 320-430 | 0.582-0.782 | `(-0.03, +0.18, +0.10)` | `(+0.45, -0.05, +0.05)` | easeOutQuad |
| Recovery | 430-550 | 0.782-1.00 | `(0, 0, 0)` | `(0, 0, 0)` | easeOutElastic |

**Motion character:** Heavy, earthy. The "resist" phase (70ms pause after plunge) conveys dense soil. The lever-up is satisfying -- you feel the scoop pulling dirt. Longest animation except axe, befitting the most strenuous tool.

### 2.5 Pickaxe (Pickaxe.glb) -- "Strike"

Overhead arc similar to axe but sharper -- a pointed impact, like cracking stone.

**Total duration: 520ms**
**Impact frame: 280ms (t = 0.538)**

| Phase | Time (ms) | t range | Position delta (x, y, z) | Rotation delta (pitch, yaw, roll) | Easing |
|-------|-----------|---------|--------------------------|----------------------------------|--------|
| Hoist | 0-160 | 0.00-0.308 | `(-0.03, +0.25, +0.04)` | `(+0.80, -0.05, +0.08)` | easeInOutCubic |
| Swing | 160-280 | 0.308-0.538 | `(+0.06, -0.35, -0.20)` | `(-1.40, +0.10, -0.12)` | easeInQuad |
| **IMPACT** | 280 | 0.538 | -- | -- | -- |
| Recoil | 280-360 | 0.538-0.692 | `(+0.02, +0.08, +0.06)` | `(+0.20, -0.03, +0.03)` | easeOutQuad |
| Settle | 360-420 | 0.692-0.808 | `(-0.01, +0.03, +0.02)` | `(+0.05, 0, 0)` | easeOutQuad |
| Recovery | 420-520 | 0.808-1.00 | `(0, 0, 0)` | `(0, 0, 0)` | easeOutElastic |

**Motion character:** Harder than axe. The swing has more pitch rotation (-1.40 vs -1.20 rad) for a steeper angle of attack. The recoil is more abrupt (stone doesn't give like wood). Two recovery phases (recoil then settle) create a "clang-and-vibrate" feel.

### Animation Timing Summary

| Tool | Total (ms) | Windup (ms) | Impact (ms) | Recovery (ms) | Windup % | Stamina Cost |
|------|-----------|-------------|-------------|---------------|----------|--------------|
| Trowel | 400 | 200 | 200 | 200 | 50% | 5 |
| Axe | 600 | 320 | 320 | 280 | 53% | 10 |
| Shears | 300 | 140 | 140 | 160 | 47% | 4 |
| Shovel | 550 | 250 | 250 | 300 | 45% | 8 |
| Pickaxe | 520 | 280 | 280 | 240 | 54% | 10 (equiv. to axe) |

**Design principle:** Heavier stamina cost = longer animation. This creates a natural rhythm where expensive tools feel weighty. Shears are fast because pruning is light work. Axe is slow because chopping is heavy.

---

## 3. Impact Effects

All impact effects fire at the exact impact frame of each tool animation.

### 3.1 Screen Shake

Camera rotation is perturbed, not position. This avoids physics desync issues.

| Tool | Amplitude (rad) | Frequency (Hz) | Duration (ms) | Decay | Character |
|------|-----------------|-----------------|---------------|-------|-----------|
| Trowel | 0.008 | 25 | 80 | exponential | Tiny thud -- soil is soft |
| Axe | 0.020 | 18 | 150 | exponential | Meaty chop -- heavy, lingering |
| Shears | 0.004 | 35 | 50 | linear | Crisp snap -- barely there |
| Shovel | 0.015 | 20 | 120 | exponential | Solid dig -- medium weight |
| Pickaxe | 0.025 | 15 | 180 | exponential | Hard crack -- strongest shake |

**Decay formula:**

```typescript
// Exponential decay (used for all except shears)
const shakeMag = amplitude * Math.exp(-elapsed / (duration * 0.3));

// Linear decay (shears only -- instant snap, clean stop)
const shakeMag = amplitude * Math.max(0, 1 - elapsed / duration);

// Apply as camera rotation perturbation
camera.rotation.x += Math.sin(elapsed * frequency * Math.PI * 2) * shakeMag * (Math.random() > 0.5 ? 1 : -1);
camera.rotation.z += Math.cos(elapsed * frequency * Math.PI * 2) * shakeMag * 0.5;
```

**Reduced motion:** Amplitude set to 0 (shake disabled entirely).

### 3.2 Camera Punch (FOV Bump)

A subtle FOV kick on impact that immediately recovers. Creates a micro-zoom feel.

| Tool | FOV bump | Recovery (ms) | Easing |
|------|----------|---------------|--------|
| Trowel | +1.0 | 120 | easeOutQuad |
| Axe | +2.5 | 200 | easeOutQuad |
| Shears | +0.5 | 80 | easeOutQuad |
| Shovel | +1.5 | 150 | easeOutQuad |
| Pickaxe | +3.0 | 220 | easeOutQuad |

```typescript
// At impact frame:
fovPunch = tool.fovBump;

// Every frame during punch recovery:
fovPunch = fovPunch * (1 - easeOutQuad(elapsed / recoveryDuration));
camera.fov = baseFov + fovPunch;
camera.updateProjectionMatrix();
```

**Reduced motion:** FOV punch disabled.

### 3.3 Particle Burst

Particles spawn at the raycast hit point in world space. Rendered as small unlit quads (PSX style -- no smooth particles).

| Tool | Count | Spread (units) | Speed (units/s) | Lifetime (ms) | Color | Shape |
|------|-------|----------------|-----------------|---------------|-------|-------|
| Trowel | 6-8 | 0.3 | 1.5-2.5 | 400-600 | `#8D6E63` (earth brown) | Upward arc + slight spread |
| Axe | 10-14 | 0.5 | 2.0-4.0 | 500-800 | `#A1887F` (wood chips) | Outward spray from impact normal |
| Shears | 4-6 | 0.2 | 1.0-2.0 | 300-500 | `#81C784` (leaf green) | Flutter downward |
| Shovel | 8-10 | 0.4 | 1.5-3.0 | 400-700 | `#8D6E63` (dirt) | Upward fountain |
| Pickaxe | 12-16 | 0.6 | 3.0-5.0 | 400-600 | `#90A4AE` (stone grey) | Sharp radial burst |

**Particle behavior:**

```typescript
interface ToolParticle {
  position: Vector3;        // World space
  velocity: Vector3;        // Initial direction + speed
  gravity: number;          // -4.0 units/s^2 (gentle fall)
  lifetime: number;         // Total ms
  elapsed: number;          // Current ms
  size: number;             // 0.03-0.06 units (small quads)
  color: Color;
  opacity: number;          // Fades from 1.0 to 0.0 over lifetime
}

// Per frame:
particle.position.addScaledVector(particle.velocity, dt);
particle.velocity.y += particle.gravity * dt;
particle.elapsed += dt * 1000;
particle.opacity = 1.0 - (particle.elapsed / particle.lifetime);
```

**Particle rendering:** Use a single `Points` geometry with `BufferAttribute` for positions and colors. Max 32 active particles at any time (pool and recycle). Material: `PointsMaterial` with `size: 0.05`, `sizeAttenuation: true`, `vertexColors: true`.

**Reduced motion:** Particle count reduced to 2. No velocity spread -- particles appear and fade in place.

### 3.4 Sound Trigger

Sounds fire at the impact frame, using the existing AudioManager synthesizer.

| Tool | Sound ID | AudioManager Call | Character |
|------|----------|-------------------|-----------|
| Trowel | `plant` | `playRisingTone(300, 550, 0.12, 'triangle', 0.2)` | Soft earth poke |
| Axe | `chop` | `playNoiseBurst(0.06, 200, 0.15)` | Heavy wood thunk |
| Shears | `toolSelect` | `playTone({freq:660, dur:0.03, type:'square', gain:0.08})` | Quick metallic snip |
| Shovel | `build` | `playTone({freq:220, dur:0.08, type:'triangle', gain:0.2})` + `playTone({freq:330...})` | Grinding earth |
| Pickaxe | *new: `mine`* | `playNoiseBurst(0.08, 350, 0.18)` + `playTone({freq:900, dur:0.02, type:'sine', gain:0.1})` | Sharp crack + high ring |

**New sound required:** Add `"mine"` to the `SoundId` type in `AudioManager.ts`:

```typescript
// In AudioManager switch:
case "mine":
  this.playNoiseBurst(ctx, 0.08, 350, 0.18);
  this.playTone(ctx, { freq: 900, duration: 0.02, type: "sine", gain: 0.1, delay: 0.04 });
  break;
```

### 3.5 Haptic Feedback

Via Capacitor Haptics API. Fires at impact frame.

| Tool | Pattern | Capacitor Call |
|------|---------|---------------|
| Trowel | Light | `Haptics.impact({ style: ImpactStyle.Light })` |
| Axe | Heavy | `Haptics.impact({ style: ImpactStyle.Heavy })` |
| Shears | Light | `Haptics.impact({ style: ImpactStyle.Light })` |
| Shovel | Medium | `Haptics.impact({ style: ImpactStyle.Medium })` |
| Pickaxe | Heavy | `Haptics.impact({ style: ImpactStyle.Heavy })` |

**Fallback:** If Capacitor is unavailable (web PWA without native bridge), haptics are silently skipped.

### 3.6 Target Reaction

The entity being acted upon also reacts at the impact frame.

| Target | Reaction | Duration | Details |
|--------|----------|----------|---------|
| Tree (chop) | Shake X | 300ms | `tree.rotation.z += sin(t * 30) * 0.08 * (1-t)` -- lateral wobble |
| Tree (prune) | Shake X (gentle) | 200ms | `tree.rotation.z += sin(t * 25) * 0.04 * (1-t)` -- subtle trim |
| Tree (harvest) | Shake Y | 400ms | `tree.position.y += sin(t * 20) * 0.03 * (1-t)` -- vertical bounce |
| Ground (dig) | None | -- | Particles carry the feedback |
| Rock (mine) | Scale pulse | 150ms | `rock.scale.setScalar(1.0 - sin(t * PI) * 0.05)` -- brief squeeze |
| Ground (plant) | Soil mound spawn | 500ms | Small brown hemisphere appears, fades |

**Reduced motion:** Tree shake amplitude halved. Rock pulse disabled.

---

## 4. Resource Drop Visuals

Resource drops occur after the impact frame, triggered by the game logic confirming a successful action (harvest, chop, etc.).

### 4.1 Floating Text

World-to-screen projected text that rises from the action target.

| Parameter | Value | Notes |
|-----------|-------|-------|
| Font | Fredoka, 16px, bold | Matches HUD heading font |
| Color | Resource-specific (see below) | High contrast against scene |
| Outline | 2px black stroke | Readability over any background |
| Rise speed | 40px/sec | Gentle upward drift |
| Duration | 1500ms | Total visible time |
| Fade-in | 0-100ms | Opacity 0 to 1 |
| Fade-out | 1000-1500ms | Opacity 1 to 0 |
| Offset | Randomize X by +/-20px | Prevents stacking when multiple drops |
| Max visible | 6 | Oldest dismissed first |

**Resource colors:**

| Resource | Text Color | Example |
|----------|-----------|---------|
| Timber | `#A1887F` (warm wood) | "+3 Timber" |
| Sap | `#4FC3F7` (amber-blue) | "+2 Sap" |
| Fruit | `#EF5350` (apple red) | "+2 Fruit" |
| Acorns | `#FFB74D` (golden) | "+1 Acorns" |
| XP | `#CE93D8` (purple) | "+15 XP" |

**Rendering:** CSS `position: absolute` elements inside the HUD overlay. Position computed by projecting the 3D hit point to screen coordinates each frame using `camera.project()`, offset by the accumulated rise.

```typescript
// Per frame for each floating text:
const screenPos = hitPoint3D.clone().project(camera);
const x = (screenPos.x * 0.5 + 0.5) * viewportWidth;
const y = (-screenPos.y * 0.5 + 0.5) * viewportHeight;

element.style.transform = `translate(${x + offsetX}px, ${y - risePixels}px)`;
element.style.opacity = String(opacity);
```

**Reduced motion:** Text appears at final position (no rise animation). Still fades out.

### 4.2 Resource Icon Particles

Tiny colored squares that burst from the tree and arc toward the HUD resource counter.

| Parameter | Value |
|-----------|-------|
| Count per resource unit | 1 (e.g., "+3 Timber" = 3 particles) |
| Max particles | 8 (excess resources grouped into larger particles) |
| Size | 6x6px CSS squares |
| Color | Matches resource color above |
| Initial position | 3D hit point projected to screen |
| Arc trajectory | Quadratic bezier: start -> apex (30px above midpoint) -> HUD counter |
| Arc duration | 600ms |
| Easing | easeInOutCubic |
| Stagger | 80ms between each particle |
| HUD counter flash | On particle arrival, counter text scales 1.0 -> 1.3 -> 1.0 (200ms) |

**Trajectory computation:**

```typescript
// Bezier control points (screen space)
const start = projectToScreen(hitPoint3D);
const end = getHudCounterPosition(resourceType); // e.g., timber icon in ResourceBar
const control = {
  x: (start.x + end.x) * 0.5,
  y: Math.min(start.y, end.y) - 30, // apex above midpoint
};

// Per frame:
const t = easeInOutCubic(elapsed / 600);
const x = (1-t)*(1-t)*start.x + 2*(1-t)*t*control.x + t*t*end.x;
const y = (1-t)*(1-t)*start.y + 2*(1-t)*t*control.y + t*t*end.y;
```

**On arrival:** The resource counter in `ResourceBar.tsx` plays a brief scale bounce (`transform: scale(1.3)` with 200ms ease-out transition).

**Reduced motion:** Particles teleport directly to HUD counter (no arc). Counter still flashes.

### 4.3 Drop Sequence Timeline

```
Impact frame (t=0)
  |
  +-- 0ms:   Particles burst from hit point
  +-- 0ms:   Screen shake + haptic
  +-- 0ms:   Sound trigger
  +-- 50ms:  Floating text appears (slight delay for readability)
  +-- 100ms: First resource particle launches toward HUD
  +-- 180ms: Second resource particle launches
  +-- 260ms: Third resource particle launches
  +-- 700ms: First particle arrives at HUD counter (counter flashes)
  +-- 780ms: Second arrives
  +-- 860ms: Third arrives
  +-- 1550ms: Floating text fully faded
```

---

## 5. Stamina Feedback

Stamina is the pacing mechanism. Feedback must clearly communicate current state without being annoying.

### 5.1 Stamina Bar Visual States

The `StaminaGauge.tsx` component transitions through four visual states.

| State | Stamina % | Bar Color | Border | Background | Extra |
|-------|-----------|-----------|--------|------------|-------|
| Full | 50-100% | `#2d6b1e` (green) | `#4a6b8c` (default) | Default | -- |
| Caution | 20-49% | `#c2a02e` (yellow) | `#c2a02e` (yellow pulse) | Default | -- |
| Danger | 5-19% | `#8a1c1c` (red) | `#8a1c1c` (red pulse) | Default | Bar pulses opacity (0.7-1.0, 1Hz) |
| Exhausted | 0-4% | `#5a0a0a` (dark red) | `#ff0000` | Dim overlay on view | "Exhausted" text overlay |

**Color transition:** Lerp between state colors over 300ms using CSS `transition: background-color 300ms ease`.

### 5.2 Drain Flash

When stamina is consumed by a tool action:

| Parameter | Value |
|-----------|-------|
| Flash color | White (`#ffffff`) |
| Flash duration | 150ms |
| Flash coverage | Entire stamina bar background |
| Sequence | White flash -> new fill level (300ms ease) |

```css
.stamina-bar--drain {
  animation: staminaDrain 150ms ease-out;
}

@keyframes staminaDrain {
  0% { background-color: rgba(255, 255, 255, 0.6); }
  100% { background-color: transparent; }
}
```

### 5.3 Insufficient Stamina Feedback

When the player tries to use a tool but lacks stamina:

| Feedback | Details |
|----------|---------|
| Stamina bar | Red flash (3 rapid pulses over 400ms) |
| Tool animation | Feeble half-windup: plays first 30% of normal animation at 0.5x speed, then reverses |
| Sound | `error` sound (`playTone({freq:200, dur:0.15, type:'sawtooth', gain:0.1})`) |
| Haptic | Double-tap: `Haptics.notification({ type: NotificationType.Error })` |
| Toast | "Not enough stamina!" (standard toast, 1.5s) |
| Crosshair | Flash red for 300ms |

### 5.4 Low Stamina Effects (Below 20%)

| Effect | Details |
|--------|---------|
| Audio | Ambient heavy breathing loop: filtered noise at 0.8Hz, 0.03 gain. Fades in below 20%, full volume below 10%. |
| Tool animation speed | `animSpeed = stamina < 10% ? 0.70 : (stamina < 20% ? 0.85 : 1.00)` |
| Walk bob amplitude | Reduced by 50% (character is tired) |
| Screen vignette | Subtle dark vignette: `box-shadow: inset 0 0 80px rgba(0,0,0,0.3)` below 20%, intensity increases to 0.5 at 0% |

### 5.5 Exhaustion State (0% Stamina)

| Behavior | Details |
|----------|---------|
| Tool use | Blocked. `drainStamina()` returns false. Feeble animation plays. |
| Movement speed | Reduced to 60% of normal walk speed. Sprint disabled. |
| Screen effect | Persistent vignette (`inset 0 0 100px rgba(0,0,0,0.5)`) |
| HUD text | "Exhausted -- Rest to recover" below stamina bar, amber text, pulses |
| Recovery | Normal regen continues (2.0/sec base). Tools re-enable at 5% stamina (hysteresis prevents flicker at boundary). |
| Audio | Heavy breathing at max volume + heartbeat low-freq pulse (2Hz, `playTone({freq:60, dur:0.1, type:'sine', gain:0.05})`) |

**Hysteresis:** Tools block at 0%, re-enable at 5%. This prevents rapid enable/disable if regen is exactly matching drain.

### 5.6 Stamina Regen Visual

| Parameter | Value |
|-----------|-------|
| Fill animation | Smooth CSS transition, 200ms ease |
| Regen glow | Subtle green pulse on bar edge during active regen: `box-shadow: 0 0 6px #4CAF50` |
| Structure bonus | When near a stamina-boosting structure, bar border glows gold |

**Reduced motion:** No pulsing. Colors change instantly. Vignette is static (no animation).

---

## 6. Tool Switching

### 6.1 Switch Animation

Two-phase: current tool drops below view, mesh swaps, new tool rises into view.

| Phase | Duration | Motion | Easing |
|-------|----------|--------|--------|
| Drop | 250ms | Position Y: `base.y` -> `base.y - 0.6` (below camera frame) | easeInQuad |
| *Mesh swap* | 0ms | Synchronous: old GLB hidden, new GLB shown | instant |
| Rise | 250ms | Position Y: `base.y - 0.6` -> `base.y` | easeOutBack |
| **Total** | **500ms** | | |

The `easeOutBack` on rise creates a slight overshoot -- the new tool bounces up past its resting position, then settles. This gives the switch a snappy, satisfying feel.

### 6.2 Fast Switch (Consecutive)

If the player switches tools again during an active switch animation:

- If during **drop phase**: immediately start rise with new tool (skip remaining drop)
- If during **rise phase**: reverse into drop (250ms), swap, rise with new tool
- Net effect: rapid switching feels responsive, not sluggish

### 6.3 Input During Switch

| Input | Behavior |
|-------|----------|
| Movement | Allowed (switch doesn't interrupt walking) |
| Look | Allowed |
| Use tool | **Queued**. If `useTool` fires during switch, the action executes on the first frame after rise completes |
| Another switch | See fast switch above |

### 6.4 Switch Controls

| Input | Action |
|-------|--------|
| Number keys 1-5 | Direct select tool in slot |
| Mouse scroll up | Next tool |
| Mouse scroll down | Previous tool |
| Mobile NEXT button | Cycle to next tool |
| Touch tool slot icon | Direct select (top-right tool grid) |

### 6.5 Switch Sound

Fire `toolSelect` sound at the start of the rise phase (when new tool becomes visible):

```typescript
audioManager.playSound("toolSelect");
// playTone({freq:660, dur:0.03, type:'square', gain:0.08})
```

### 6.6 Switch Haptic

Light tap at rise start:

```typescript
Haptics.impact({ style: ImpactStyle.Light });
```

**Reduced motion:** Instant swap, no drop/rise animation. Sound and haptic still fire.

---

## 7. View Model Juice (Ambient Movement)

These effects layer on top of the per-tool base offset. They are purely cosmetic and run every frame in `useFrame`.

### 7.1 Hand Sway (Camera Turn Response)

When the player turns, the tool lags behind, creating a natural weight feel.

| Parameter | Value | Notes |
|-----------|-------|-------|
| Sway multiplier | 1.5 | Maps camera rotation delta to offset |
| Sway clamp | +/- 0.20 units | Maximum lateral displacement |
| Recovery speed | 10 * dt | Lerp factor per second |
| Vertical sway | 0.8x of horizontal | Pitch response is subtler than yaw |

```typescript
// Track rotation deltas
let deltaYaw = camera.rotation.y - lastYaw;
if (deltaYaw > Math.PI) deltaYaw -= Math.PI * 2;
if (deltaYaw < -Math.PI) deltaYaw += Math.PI * 2;
const deltaPitch = camera.rotation.x - lastPitch;

// Smooth toward clamped target
const targetSwayX = clamp(deltaYaw * 1.5, -0.20, 0.20);
const targetSwayY = clamp(-deltaPitch * 1.5 * 0.8, -0.16, 0.16);

swayX = lerp(swayX, targetSwayX, 10 * dt);
swayY = lerp(swayY, targetSwayY, 10 * dt);

lastYaw = camera.rotation.y;
lastPitch = camera.rotation.x;
```

**Reduced motion:** Multiplier set to 0 (sway disabled).

### 7.2 Walk Bob

Vertical sinusoidal oscillation while moving. Adds horizontal component at half amplitude for natural sway.

| State | Vertical Freq (Hz) | Vertical Amp | Horizontal Freq (Hz) | Horizontal Amp |
|-------|--------------------|--------------|-----------------------|----------------|
| Idle | 2.0 | 0.005 | 1.0 | 0.002 |
| Walking | 10.0 | 0.020 | 5.0 | 0.008 |
| Sprinting | 15.0 | 0.050 | 7.5 | 0.020 |

```typescript
const isMoving = Math.abs(moveX) + Math.abs(moveZ) > 0.1;
const isSprinting = isMoving && sprintHeld;

let bobFreqY: number, bobAmpY: number, bobFreqX: number, bobAmpX: number;

if (!isMoving) {
  // Idle breathing
  bobFreqY = 2.0;
  bobAmpY = 0.005;
  bobFreqX = 1.0;
  bobAmpX = 0.002;
} else if (isSprinting) {
  bobFreqY = 15.0;
  bobAmpY = 0.050;
  bobFreqX = 7.5;
  bobAmpX = 0.020;
} else {
  bobFreqY = 10.0;
  bobAmpY = 0.020;
  bobFreqX = 5.0;
  bobAmpX = 0.008;
}

// Low stamina reduces bob (tired character)
if (staminaPct < 0.20) {
  bobAmpY *= 0.5;
  bobAmpX *= 0.5;
}

const bobY = Math.sin(elapsedTime * bobFreqY) * bobAmpY;
const bobX = Math.sin(elapsedTime * bobFreqX) * bobAmpX;
```

**Bob phase reset:** When the player stops moving, the bob phase does NOT reset to 0 -- it continues from the current sine position but with decaying amplitude (lerp amplitude toward idle over 200ms). This prevents a jarring snap when stopping.

**Reduced motion:** All bob amplitudes set to 0.

### 7.3 Sprint FOV Shift

| Parameter | Value |
|-----------|-------|
| Normal FOV | 65 |
| Sprint FOV | 72 |
| Lerp speed | 8 * dt |
| Tool scale during sprint | 0.95x (slight shrink compensates for wider FOV) |

```typescript
const targetFov = isSprinting ? 72 : 65;
camera.fov = lerp(camera.fov, targetFov, 8 * dt);
camera.updateProjectionMatrix();

// Compensate tool scale
const fovScaleComp = 65 / camera.fov; // ~0.95 at 72 FOV
toolGroup.scale.setScalar(baseScale * fovScaleComp);
```

**Reduced motion:** FOV stays at 65. No sprint widening.

### 7.4 Position Interpolation

All offsets (sway, bob, use animation, switch) are combined and applied via lerp, never snapped.

```typescript
// Module-scope temp vectors (avoid GC)
const _targetPos = new THREE.Vector3();
const _targetRot = new THREE.Euler();

// In useFrame:
_targetPos.set(
  baseOffset.x + swayX + bobX + useAnimOffset.x + switchOffset.x,
  baseOffset.y + swayY + bobY + useAnimOffset.y + switchOffset.y,
  baseOffset.z + useAnimOffset.z + switchOffset.z,
);

_targetRot.set(
  baseRot.x + useAnimRot.x,
  baseRot.y + useAnimRot.y,
  baseRot.z + useAnimRot.z,
);

// Soft follow -- creates springy, weighted feel
toolGroup.position.lerp(_targetPos, 0.3);
toolGroup.rotation.x = lerp(toolGroup.rotation.x, _targetRot.x, 0.3);
toolGroup.rotation.y = lerp(toolGroup.rotation.y, _targetRot.y, 0.3);
toolGroup.rotation.z = lerp(toolGroup.rotation.z, _targetRot.z, 0.3);
```

The `0.3` lerp factor (per frame at 60fps) creates a ~6-frame lag. The tool "follows" the target with a soft, rubbery delay that adds weight and life.

### 7.5 Offset Priority Stack

When multiple effects want to modify position/rotation, they are summed:

```
Final position = Base offset (from toolVisuals config)
               + Sway offset (from camera turn)
               + Bob offset (from movement)
               + Use animation offset (from tool action, active only during animation)
               + Switch animation offset (from tool change, active only during switch)

Final rotation = Base rotation (from toolVisuals config)
               + Use animation rotation (from tool action)
```

There is no priority or override system -- all effects are additive. This is correct because:
- Sway and bob are small ambient motions (max 0.05 units)
- Use animation is large but brief (up to 0.35 units, 300-600ms)
- Switch animation only affects Y (drop/rise)
- They rarely conflict in practice

---

## 8. Raycast Interaction

### 8.1 Ray Configuration

| Parameter | Value |
|-----------|-------|
| Origin | Camera position (eye height 1.6) |
| Direction | Camera forward vector (center of screen) |
| Cast method | `raycaster.setFromCamera(new Vector2(0, 0), camera)` |
| Frequency | Every frame in `useFrame` |
| Max intersections | 1 (nearest hit only) |

### 8.2 Range Per Tool Category

Different tools have different reach. The raycast always extends to max range (6.0), but validity is checked per-tool.

| Category | Range (units) | Tools |
|----------|---------------|-------|
| Hand tools | 3.0 | Trowel, Shears |
| Long tools | 4.0 | Axe, Shovel, Pickaxe |
| Inspection | 6.0 | Almanac (future) |

```typescript
function isInRange(hitDistance: number, toolId: string): boolean {
  const ranges: Record<string, number> = {
    trowel: 3.0,
    "pruning-shears": 3.0,
    axe: 4.0,
    shovel: 4.0,
    pickaxe: 4.0,
    almanac: 6.0,
  };
  return hitDistance <= (ranges[toolId] ?? 3.0);
}
```

### 8.3 Hit Detection Layers

Scene objects are assigned to collision layers for raycast filtering.

| Layer | Bit | Objects | Raycasts From |
|-------|-----|---------|---------------|
| Ground | 0 | Terrain mesh, soil tiles, path tiles | Trowel, Shovel |
| Trees | 1 | Tree instance meshes (all species) | Axe, Shears, Trowel (for planting adjacency) |
| Rocks | 2 | Rock tile meshes, stone formations | Pickaxe |
| Structures | 3 | Structure block meshes | Shovel (demolish), Almanac |
| Water | 4 | Water tile meshes | Trowel (no planting), Shovel (irrigation) |
| NPCs | 5 | NPC collision meshes | All tools (interaction, not attack) |

```typescript
// Layer assignment on mesh creation:
groundMesh.layers.set(0);
treeMesh.layers.set(1);
rockMesh.layers.set(2);

// Raycaster layer mask per tool:
const toolLayers: Record<string, number[]> = {
  trowel:           [0, 1, 4],      // ground, trees (adjacency check), water
  axe:              [1],             // trees only
  "pruning-shears": [1],             // trees only
  shovel:           [0, 2, 3, 4],    // ground, rocks, structures, water
  pickaxe:          [2],             // rocks only
};

// Before raycast:
raycaster.layers.disableAll();
for (const layer of toolLayers[currentTool] ?? [0]) {
  raycaster.layers.enable(layer);
}
```

### 8.4 Crosshair Feedback

The crosshair dot changes color based on raycast result.

| State | Color | Size | Extra |
|-------|-------|------|-------|
| No target | `rgba(255,255,255,0.4)` | 4px dot | Default |
| Valid target in range | `#4CAF50` (green) | 6px dot | Subtle pulse (scale 1.0-1.2 at 2Hz) |
| Valid target out of range | `#FFC107` (amber) | 5px dot | Static (no pulse) |
| Invalid target for tool | `#F44336` (red) | 4px dot + ~~strikethrough~~ | Brief flash, reverts to default |
| Exhausted (no stamina) | `#F44336` (red) | 4px dot | Slow pulse (1Hz) |

```tsx
// Crosshair.tsx
const crosshairColor = useMemo(() => {
  if (exhausted) return '#F44336';
  if (!target) return 'rgba(255,255,255,0.4)';
  if (!target.validForTool) return '#F44336';
  if (!target.inRange) return '#FFC107';
  return '#4CAF50';
}, [target, exhausted]);
```

**Reduced motion:** No pulse animation. Color changes are instant.

### 8.5 Target Info Display

Shown below the crosshair when a valid target is detected.

```
[Target Name]
[Action Label] -- [Stamina Cost] stamina
```

**Layout:**

| Parameter | Value |
|-----------|-------|
| Position | 16px below crosshair center |
| Font | Fredoka 13px bold (target name), Nunito 12px (action line) |
| Background | `rgba(42, 27, 21, 0.85)` pill shape |
| Padding | 6px 12px |
| Border radius | 8px |
| Max width | 200px |
| Fade in/out | 100ms opacity transition |

### 8.6 Action Labels

The action label changes based on the current tool AND the target type.

| Tool | + Ground | + Tree (any stage) | + Tree (mature/old) | + Rock | + Structure | + Water | + NPC |
|------|----------|-------------------|-------------------|--------|-------------|---------|-------|
| Trowel | "Plant" | "---" | "---" | "---" | "---" | "Can't plant here" | "Talk" |
| Axe | "---" | "Chop" | "Harvest" | "---" | "---" | "---" | "Talk" |
| Shears | "---" | "Prune" | "Prune" | "---" | "---" | "---" | "Talk" |
| Shovel | "Dig" | "---" | "---" | "Clear" | "Demolish" | "Irrigate" | "Talk" |
| Pickaxe | "---" | "---" | "---" | "Mine" | "---" | "---" | "Talk" |

"---" means no valid action. The crosshair shows default (no target highlight), and TargetInfo shows the target name only (no action line).

**Stamina cost in label:** Shows the effective cost after tool upgrade reductions.

```typescript
const effectiveCost = getStaminaCostWithUpgrade(tool.staminaCost, upgradeTier);
// Display: "Chop -- 7 stamina"  (axe base 10, tier 3 = 30% reduction = 7)
```

### 8.7 Tree-Specific Target Info

When looking at a tree, the target info shows species and stage:

```
White Oak -- Mature
Harvest -- 10 stamina
```

Stage names: `Seed`, `Sprout`, `Sapling`, `Mature`, `Old Growth`.

When looking at a tree with a ready harvest, add a visual indicator:

```
White Oak -- Old Growth [harvest ready icon]
Harvest -- 10 stamina
```

The harvest-ready icon is a small amber circle that pulses.

### 8.8 Interaction Validation

Before allowing a tool action, the system checks in order:

```
1. Is a tool animation already playing? -> Queue (if in recovery) or reject
2. Is tool switching in progress? -> Queue or reject
3. Does the raycast hit a valid target? -> Show "No target" feedback
4. Is the target in range for this tool? -> Show "Too far" toast
5. Is the tool compatible with this target? -> Show "Can't do that" feedback
6. Does the player have enough stamina? -> Show exhaustion feedback (sec 5.3)
7. Is the action valid for this target state? -> Show specific error
   (e.g., "Already pruned", "Not mature enough", "Harvest not ready")
8. All checks pass -> Play animation, execute action at impact frame
```

---

## 9. Config Schemas

All tunable parameters are defined in JSON config files for easy balancing without code changes.

### 9.1 `config/game/toolVisuals.json`

```json
{
  "trowel": {
    "modelKey": "Hoe",
    "glbPath": "assets/models/tools/Hoe.glb",
    "offset": [0.35, -0.30, -0.55],
    "rotation": [-0.3, 0.2, 0.0],
    "scale": 0.40,
    "useAnimation": "stab",
    "useDuration": 400,
    "impactTime": 200,
    "range": 3.0,
    "layers": [0, 1, 4]
  },
  "axe": {
    "modelKey": "Axe",
    "glbPath": "assets/models/tools/Axe.glb",
    "offset": [0.40, -0.37, -0.50],
    "rotation": [-0.4, 0.3, -0.15],
    "scale": 0.45,
    "useAnimation": "chop",
    "useDuration": 600,
    "impactTime": 320,
    "range": 4.0,
    "layers": [1]
  },
  "pruning-shears": {
    "modelKey": "Hatchet",
    "glbPath": "assets/models/tools/Hatchet.glb",
    "offset": [0.33, -0.29, -0.53],
    "rotation": [-0.2, 0.15, 0.1],
    "scale": 0.38,
    "useAnimation": "snip",
    "useDuration": 300,
    "impactTime": 140,
    "range": 3.0,
    "layers": [1]
  },
  "shovel": {
    "modelKey": "Shovel",
    "glbPath": "assets/models/tools/Shovel.glb",
    "offset": [0.38, -0.40, -0.55],
    "rotation": [-0.35, 0.25, -0.05],
    "scale": 0.42,
    "useAnimation": "dig",
    "useDuration": 550,
    "impactTime": 250,
    "range": 4.0,
    "layers": [0, 2, 3, 4]
  },
  "pickaxe": {
    "modelKey": "Pickaxe",
    "glbPath": "assets/models/tools/Pickaxe.glb",
    "offset": [0.41, -0.38, -0.50],
    "rotation": [-0.45, 0.3, -0.1],
    "scale": 0.44,
    "useAnimation": "strike",
    "useDuration": 520,
    "impactTime": 280,
    "range": 4.0,
    "layers": [2]
  }
}
```

### 9.2 `config/game/toolAnimations.json`

Each animation is an array of keyframes. Position and rotation are deltas from the tool's base pose.

```json
{
  "stab": {
    "duration": 400,
    "impactAt": 200,
    "keyframes": [
      { "t": 0.00, "pos": [0, 0, 0],         "rot": [0, 0, 0],           "easeToNext": "easeInQuad" },
      { "t": 0.25, "pos": [0, 0.06, 0],       "rot": [0.15, 0, 0],       "easeToNext": "easeInQuad" },
      { "t": 0.50, "pos": [0, -0.12, -0.12],  "rot": [-0.35, 0.05, 0.08],"easeToNext": "easeOutBack" },
      { "t": 0.70, "pos": [0, -0.08, -0.09],  "rot": [-0.25, 0.05, 0.06],"easeToNext": "easeOutElastic" },
      { "t": 1.00, "pos": [0, 0, 0],          "rot": [0, 0, 0],           "easeToNext": "linear" }
    ]
  },
  "chop": {
    "duration": 600,
    "impactAt": 320,
    "keyframes": [
      { "t": 0.00, "pos": [0, 0, 0],            "rot": [0, 0, 0],              "easeToNext": "easeInOutCubic" },
      { "t": 0.30, "pos": [-0.05, 0.22, 0.05],  "rot": [0.70, -0.10, 0.05],   "easeToNext": "easeInQuad" },
      { "t": 0.533,"pos": [0.03, -0.08, -0.13], "rot": [-0.50, 0.05, -0.05],  "easeToNext": "linear" },
      { "t": 0.667,"pos": [0.03, -0.11, -0.15], "rot": [-0.55, 0.05, -0.05],  "easeToNext": "easeOutQuad" },
      { "t": 0.80, "pos": [-0.01, 0.02, -0.07], "rot": [-0.25, -0.03, 0.00],  "easeToNext": "easeOutElastic" },
      { "t": 1.00, "pos": [0, 0, 0],            "rot": [0, 0, 0],              "easeToNext": "linear" }
    ]
  },
  "snip": {
    "duration": 300,
    "impactAt": 140,
    "keyframes": [
      { "t": 0.00,  "pos": [0, 0, 0],           "rot": [0, 0, 0],             "easeToNext": "easeOutQuad" },
      { "t": 0.267, "pos": [0, 0.02, -0.08],    "rot": [-0.10, 0.05, 0],      "easeToNext": "easeInQuad" },
      { "t": 0.467, "pos": [0.06, -0.02, -0.12],"rot": [-0.05, -0.15, 0.35],  "easeToNext": "easeOutBack" },
      { "t": 0.667, "pos": [0.03, 0.00, -0.10], "rot": [-0.07, -0.05, -0.05], "easeToNext": "easeOutQuad" },
      { "t": 1.00,  "pos": [0, 0, 0],           "rot": [0, 0, 0],             "easeToNext": "linear" }
    ]
  },
  "dig": {
    "duration": 550,
    "impactAt": 250,
    "keyframes": [
      { "t": 0.00,  "pos": [0, 0, 0],            "rot": [0, 0, 0],            "easeToNext": "easeInOutCubic" },
      { "t": 0.218, "pos": [0, 0.10, 0.03],      "rot": [0.25, 0, 0],         "easeToNext": "easeInQuad" },
      { "t": 0.455, "pos": [0, -0.15, -0.12],    "rot": [-0.35, 0.05, 0],     "easeToNext": "linear" },
      { "t": 0.582, "pos": [0, -0.18, -0.13],    "rot": [-0.40, 0.05, 0],     "easeToNext": "easeOutQuad" },
      { "t": 0.782, "pos": [-0.03, 0.03, -0.02], "rot": [0.05, -0.05, 0.05],  "easeToNext": "easeOutElastic" },
      { "t": 1.00,  "pos": [0, 0, 0],            "rot": [0, 0, 0],            "easeToNext": "linear" }
    ]
  },
  "strike": {
    "duration": 520,
    "impactAt": 280,
    "keyframes": [
      { "t": 0.00,  "pos": [0, 0, 0],             "rot": [0, 0, 0],             "easeToNext": "easeInOutCubic" },
      { "t": 0.308, "pos": [-0.03, 0.25, 0.04],   "rot": [0.80, -0.05, 0.08],  "easeToNext": "easeInQuad" },
      { "t": 0.538, "pos": [0.03, -0.10, -0.16],  "rot": [-0.60, 0.05, -0.04], "easeToNext": "easeOutQuad" },
      { "t": 0.692, "pos": [0.05, -0.02, -0.10],  "rot": [-0.40, 0.02, -0.01], "easeToNext": "easeOutQuad" },
      { "t": 0.808, "pos": [0.04, 0.01, -0.08],   "rot": [-0.35, 0.02, -0.01], "easeToNext": "easeOutElastic" },
      { "t": 1.00,  "pos": [0, 0, 0],             "rot": [0, 0, 0],            "easeToNext": "linear" }
    ]
  }
}
```

### 9.3 `config/game/toolImpacts.json`

```json
{
  "trowel": {
    "shake": { "amplitude": 0.008, "frequency": 25, "duration": 80, "decay": "exponential" },
    "fovPunch": { "amount": 1.0, "recovery": 120 },
    "particles": { "count": [6, 8], "spread": 0.3, "speed": [1.5, 2.5], "lifetime": [400, 600], "color": "#8D6E63", "gravity": -4.0 },
    "sound": "plant",
    "haptic": "light"
  },
  "axe": {
    "shake": { "amplitude": 0.020, "frequency": 18, "duration": 150, "decay": "exponential" },
    "fovPunch": { "amount": 2.5, "recovery": 200 },
    "particles": { "count": [10, 14], "spread": 0.5, "speed": [2.0, 4.0], "lifetime": [500, 800], "color": "#A1887F", "gravity": -4.0 },
    "sound": "chop",
    "haptic": "heavy"
  },
  "pruning-shears": {
    "shake": { "amplitude": 0.004, "frequency": 35, "duration": 50, "decay": "linear" },
    "fovPunch": { "amount": 0.5, "recovery": 80 },
    "particles": { "count": [4, 6], "spread": 0.2, "speed": [1.0, 2.0], "lifetime": [300, 500], "color": "#81C784", "gravity": -2.0 },
    "sound": "toolSelect",
    "haptic": "light"
  },
  "shovel": {
    "shake": { "amplitude": 0.015, "frequency": 20, "duration": 120, "decay": "exponential" },
    "fovPunch": { "amount": 1.5, "recovery": 150 },
    "particles": { "count": [8, 10], "spread": 0.4, "speed": [1.5, 3.0], "lifetime": [400, 700], "color": "#8D6E63", "gravity": -4.0 },
    "sound": "build",
    "haptic": "medium"
  },
  "pickaxe": {
    "shake": { "amplitude": 0.025, "frequency": 15, "duration": 180, "decay": "exponential" },
    "fovPunch": { "amount": 3.0, "recovery": 220 },
    "particles": { "count": [12, 16], "spread": 0.6, "speed": [3.0, 5.0], "lifetime": [400, 600], "color": "#90A4AE", "gravity": -4.0 },
    "sound": "mine",
    "haptic": "heavy"
  }
}
```

### 9.4 `config/game/viewModelJuice.json`

```json
{
  "sway": {
    "multiplier": 1.5,
    "clamp": 0.20,
    "recovery": 10,
    "verticalScale": 0.8
  },
  "walkBob": {
    "idle":   { "freqY": 2.0,  "ampY": 0.005, "freqX": 1.0, "ampX": 0.002 },
    "walk":   { "freqY": 10.0, "ampY": 0.020, "freqX": 5.0, "ampX": 0.008 },
    "sprint": { "freqY": 15.0, "ampY": 0.050, "freqX": 7.5, "ampX": 0.020 },
    "lowStaminaScale": 0.5,
    "transitionSpeed": 5.0
  },
  "sprintFov": {
    "normal": 65,
    "sprint": 72,
    "lerpSpeed": 8,
    "toolScaleCompensation": true
  },
  "positionLerp": 0.3,
  "toolSwitch": {
    "dropDuration": 250,
    "riseDuration": 250,
    "dropDistance": 0.6,
    "riseEasing": "easeOutBack",
    "dropEasing": "easeInQuad"
  },
  "staminaEffects": {
    "slowAnimThreshold": 0.10,
    "slowAnimSpeed": 0.70,
    "tiredAnimThreshold": 0.20,
    "tiredAnimSpeed": 0.85,
    "exhaustionMovementScale": 0.60,
    "reenableThreshold": 0.05
  }
}
```

### 9.5 `config/game/toolActions.json`

Maps tool + target combinations to action labels and validation rules.

```json
{
  "actions": {
    "trowel": {
      "ground":    { "label": "Plant",           "requiresEmpty": true },
      "tree":      null,
      "rock":      null,
      "structure": null,
      "water":     { "label": "Can't plant here", "blocked": true },
      "npc":       { "label": "Talk",             "action": "INTERACT" }
    },
    "axe": {
      "ground":    null,
      "tree":      { "label": "Chop",             "minStage": 0 },
      "treeMature":{ "label": "Harvest",          "minStage": 3, "requiresReady": true },
      "rock":      null,
      "structure": null,
      "water":     null,
      "npc":       { "label": "Talk",             "action": "INTERACT" }
    },
    "pruning-shears": {
      "ground":    null,
      "tree":      { "label": "Prune",            "minStage": 3, "requiresNotPruned": true },
      "rock":      null,
      "structure": null,
      "water":     null,
      "npc":       { "label": "Talk",             "action": "INTERACT" }
    },
    "shovel": {
      "ground":    { "label": "Dig",              "requiresDiggable": true },
      "tree":      null,
      "rock":      { "label": "Clear",            "action": "CLEAR" },
      "structure": { "label": "Demolish",         "action": "DEMOLISH" },
      "water":     { "label": "Irrigate",         "action": "IRRIGATE" },
      "npc":       { "label": "Talk",             "action": "INTERACT" }
    },
    "pickaxe": {
      "ground":    null,
      "tree":      null,
      "rock":      { "label": "Mine",             "action": "MINE" },
      "structure": null,
      "water":     null,
      "npc":       { "label": "Talk",             "action": "INTERACT" }
    }
  }
}
```

---

## 10. R3F Component Pseudocode

### 10.1 ToolViewModel.tsx

```tsx
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

// Config imports
import toolVisuals from "@/config/game/toolVisuals.json";
import toolAnimations from "@/config/game/toolAnimations.json";
import toolImpacts from "@/config/game/toolImpacts.json";
import juiceConfig from "@/config/game/viewModelJuice.json";

// Reusable temp objects (avoid GC pressure)
const _targetPos = new THREE.Vector3();
const _targetEuler = new THREE.Euler();
const _direction = new THREE.Vector3();

interface ToolViewModelProps {
  currentToolId: string;
  staminaPct: number;
  isMoving: boolean;
  isSprinting: boolean;
  onImpact: (hitPoint: THREE.Vector3, toolId: string) => void;
}

export const ToolViewModel = ({
  currentToolId,
  staminaPct,
  isMoving,
  isSprinting,
  onImpact,
}: ToolViewModelProps) => {
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null!);

  // Preload all 5 tool GLBs
  const hoe = useGLTF("assets/models/tools/Hoe.glb");
  const axe = useGLTF("assets/models/tools/Axe.glb");
  const hatchet = useGLTF("assets/models/tools/Hatchet.glb");
  const shovel = useGLTF("assets/models/tools/Shovel.glb");
  const pickaxe = useGLTF("assets/models/tools/Pickaxe.glb");

  // Animation state
  const animState = useRef({
    phase: "idle" as "idle" | "use" | "switch",
    progress: 0,           // 0..1 normalized
    totalDuration: 0,
    impactFired: false,
    queuedUse: false,
    // Switch state
    switchPhase: "none" as "none" | "drop" | "rise",
    switchProgress: 0,
    pendingToolId: null as string | null,
    // Juice state
    swayX: 0, swayY: 0,
    lastYaw: 0, lastPitch: 0,
    bobPhase: 0,
    // Shake state
    shakeElapsed: 0,
    shakeDuration: 0,
    shakeAmplitude: 0,
    shakeFrequency: 0,
    shakeDecay: "exponential" as "exponential" | "linear",
    // FOV punch
    fovPunch: 0,
    fovPunchRecovery: 0,
  });

  // Accessibility
  const reducedMotion = useRef(
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false
  );

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const dt = Math.min(delta, 0.05); // Cap at 50ms (20fps floor)
    const config = toolVisuals[currentToolId];
    const anim = animState.current;
    const rm = reducedMotion.current;

    // ---- 1. Sway ----
    if (!rm) {
      const deltaYaw = normalizeAngle(camera.rotation.y - anim.lastYaw);
      const deltaPitch = camera.rotation.x - anim.lastPitch;
      const targetSwayX = clamp(deltaYaw * juiceConfig.sway.multiplier, -juiceConfig.sway.clamp, juiceConfig.sway.clamp);
      const targetSwayY = clamp(-deltaPitch * juiceConfig.sway.multiplier * juiceConfig.sway.verticalScale,
                                -juiceConfig.sway.clamp * juiceConfig.sway.verticalScale,
                                 juiceConfig.sway.clamp * juiceConfig.sway.verticalScale);
      anim.swayX = lerp(anim.swayX, targetSwayX, juiceConfig.sway.recovery * dt);
      anim.swayY = lerp(anim.swayY, targetSwayY, juiceConfig.sway.recovery * dt);
    }
    anim.lastYaw = camera.rotation.y;
    anim.lastPitch = camera.rotation.x;

    // ---- 2. Walk Bob ----
    let bobX = 0, bobY = 0;
    if (!rm) {
      const bobConfig = isSprinting ? juiceConfig.walkBob.sprint
                      : isMoving    ? juiceConfig.walkBob.walk
                      :               juiceConfig.walkBob.idle;
      const staminaScale = staminaPct < 0.20 ? juiceConfig.walkBob.lowStaminaScale : 1.0;
      anim.bobPhase += dt;
      bobY = Math.sin(anim.bobPhase * bobConfig.freqY) * bobConfig.ampY * staminaScale;
      bobX = Math.sin(anim.bobPhase * bobConfig.freqX) * bobConfig.ampX * staminaScale;
    }

    // ---- 3. Use Animation ----
    let useOffsetX = 0, useOffsetY = 0, useOffsetZ = 0;
    let useRotX = 0, useRotY = 0, useRotZ = 0;
    if (anim.phase === "use") {
      const animDef = toolAnimations[config.useAnimation];
      const speedMult = staminaPct < juiceConfig.staminaEffects.slowAnimThreshold
        ? juiceConfig.staminaEffects.slowAnimSpeed
        : staminaPct < juiceConfig.staminaEffects.tiredAnimThreshold
        ? juiceConfig.staminaEffects.tiredAnimSpeed
        : 1.0;

      anim.progress += (dt * 1000 * speedMult) / anim.totalDuration;
      if (anim.progress >= 1.0) {
        anim.progress = 1.0;
        anim.phase = "idle";
        if (anim.queuedUse) {
          anim.queuedUse = false;
          startUseAnimation(anim, config);
        }
      }

      // Interpolate keyframes
      const frame = interpolateKeyframes(animDef.keyframes, anim.progress);
      useOffsetX = frame.pos[0];
      useOffsetY = frame.pos[1];
      useOffsetZ = frame.pos[2];
      useRotX = frame.rot[0];
      useRotY = frame.rot[1];
      useRotZ = frame.rot[2];

      // Fire impact
      if (!anim.impactFired && anim.progress >= animDef.impactAt / animDef.duration) {
        anim.impactFired = true;
        fireImpact(currentToolId, camera, anim, onImpact);
      }
    }

    // ---- 4. Switch Animation ----
    let switchOffsetY = 0;
    if (anim.switchPhase === "drop") {
      anim.switchProgress += (dt * 1000) / juiceConfig.toolSwitch.dropDuration;
      if (anim.switchProgress >= 1.0) {
        anim.switchProgress = 0;
        anim.switchPhase = "rise";
        // SWAP MESH HERE: hide old, show new
        swapToolMesh(anim.pendingToolId);
        audioManager.playSound("toolSelect");
      }
      switchOffsetY = -easeInQuad(anim.switchProgress) * juiceConfig.toolSwitch.dropDistance;
    } else if (anim.switchPhase === "rise") {
      anim.switchProgress += (dt * 1000) / juiceConfig.toolSwitch.riseDuration;
      if (anim.switchProgress >= 1.0) {
        anim.switchProgress = 0;
        anim.switchPhase = "none";
        anim.pendingToolId = null;
      }
      const riseT = rm ? 1.0 : easeOutBack(Math.min(1, anim.switchProgress));
      switchOffsetY = -(1 - riseT) * juiceConfig.toolSwitch.dropDistance;
    }

    // ---- 5. Screen Shake ----
    if (anim.shakeElapsed < anim.shakeDuration) {
      anim.shakeElapsed += dt * 1000;
      const shakeT = anim.shakeElapsed / anim.shakeDuration;
      const mag = anim.shakeDecay === "exponential"
        ? anim.shakeAmplitude * Math.exp(-anim.shakeElapsed / (anim.shakeDuration * 0.3))
        : anim.shakeAmplitude * Math.max(0, 1 - shakeT);
      if (!rm) {
        camera.rotation.x += Math.sin(anim.shakeElapsed * anim.shakeFrequency * 0.001 * Math.PI * 2) * mag;
        camera.rotation.z += Math.cos(anim.shakeElapsed * anim.shakeFrequency * 0.001 * Math.PI * 2) * mag * 0.5;
      }
    }

    // ---- 6. FOV Punch ----
    if (anim.fovPunch > 0.01) {
      anim.fovPunch *= Math.max(0, 1 - dt * 1000 / anim.fovPunchRecovery);
      if (!rm) {
        camera.fov = juiceConfig.sprintFov.normal + anim.fovPunch;
        camera.updateProjectionMatrix();
      }
    }

    // ---- 7. Sprint FOV ----
    if (!rm) {
      const targetFov = isSprinting ? juiceConfig.sprintFov.sprint : juiceConfig.sprintFov.normal;
      const baseFov = lerp(camera.fov, targetFov + anim.fovPunch, juiceConfig.sprintFov.lerpSpeed * dt);
      camera.fov = baseFov;
      camera.updateProjectionMatrix();
    }

    // ---- 8. Compose Final Transform ----
    _targetPos.set(
      config.offset[0] + (rm ? 0 : anim.swayX) + bobX + useOffsetX,
      config.offset[1] + (rm ? 0 : anim.swayY) + bobY + useOffsetY + switchOffsetY,
      config.offset[2] + useOffsetZ,
    );
    _targetEuler.set(
      config.rotation[0] + useRotX,
      config.rotation[1] + useRotY,
      config.rotation[2] + useRotZ,
    );

    group.position.lerp(_targetPos, juiceConfig.positionLerp);
    group.rotation.x = lerp(group.rotation.x, _targetEuler.x, juiceConfig.positionLerp);
    group.rotation.y = lerp(group.rotation.y, _targetEuler.y, juiceConfig.positionLerp);
    group.rotation.z = lerp(group.rotation.z, _targetEuler.z, juiceConfig.positionLerp);

    // Scale compensation for sprint FOV
    const fovComp = rm ? 1 : 65 / camera.fov;
    group.scale.setScalar(config.scale * fovComp);
  });

  return (
    <group ref={groupRef} renderOrder={999}>
      {/* Active tool mesh rendered here. Only one visible at a time. */}
      <primitive object={activeToolScene} />
    </group>
  );
};
```

### 10.2 Keyframe Interpolation Engine

```typescript
interface Keyframe {
  t: number;           // 0..1 normalized time
  pos: [number, number, number];
  rot: [number, number, number];
  easeToNext: string;  // easing function name
}

interface InterpolatedFrame {
  pos: [number, number, number];
  rot: [number, number, number];
}

function interpolateKeyframes(keyframes: Keyframe[], progress: number): InterpolatedFrame {
  // Find surrounding keyframes
  let prev = keyframes[0];
  let next = keyframes[keyframes.length - 1];

  for (let i = 0; i < keyframes.length - 1; i++) {
    if (progress >= keyframes[i].t && progress <= keyframes[i + 1].t) {
      prev = keyframes[i];
      next = keyframes[i + 1];
      break;
    }
  }

  // Normalize progress within this segment
  const segmentLength = next.t - prev.t;
  const localT = segmentLength > 0 ? (progress - prev.t) / segmentLength : 1;

  // Apply easing
  const easedT = applyEasing(localT, prev.easeToNext);

  // Interpolate position and rotation
  return {
    pos: [
      prev.pos[0] + (next.pos[0] - prev.pos[0]) * easedT,
      prev.pos[1] + (next.pos[1] - prev.pos[1]) * easedT,
      prev.pos[2] + (next.pos[2] - prev.pos[2]) * easedT,
    ],
    rot: [
      prev.rot[0] + (next.rot[0] - prev.rot[0]) * easedT,
      prev.rot[1] + (next.rot[1] - prev.rot[1]) * easedT,
      prev.rot[2] + (next.rot[2] - prev.rot[2]) * easedT,
    ],
  };
}

function applyEasing(t: number, name: string): number {
  switch (name) {
    case "easeInQuad":      return t * t;
    case "easeOutQuad":     return t * (2 - t);
    case "easeInOutCubic":  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    case "easeOutBack":     return 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2);
    case "easeOutElastic": {
      if (t === 0 || t === 1) return t;
      return Math.pow(2, -10 * t) * Math.sin((t - 0.075) * (2 * Math.PI) / 0.3) + 1;
    }
    case "linear":
    default:                return t;
  }
}
```

### 10.3 Impact Particle System

```tsx
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const MAX_PARTICLES = 32;

export const ImpactParticles = () => {
  const pointsRef = useRef<THREE.Points>(null!);
  const pool = useRef<ToolParticle[]>(
    Array.from({ length: MAX_PARTICLES }, () => ({
      active: false,
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      gravity: -4.0,
      lifetime: 0,
      elapsed: 0,
      size: 0.05,
      color: new THREE.Color(),
    }))
  );

  const positionAttr = useRef(new Float32Array(MAX_PARTICLES * 3));
  const colorAttr = useRef(new Float32Array(MAX_PARTICLES * 3));
  const sizeAttr = useRef(new Float32Array(MAX_PARTICLES));

  // Called externally when impact fires
  const spawn = (hitPoint: THREE.Vector3, config: ParticleConfig) => {
    const count = randomInt(config.count[0], config.count[1]);
    for (let i = 0; i < count; i++) {
      const p = pool.current.find((p) => !p.active);
      if (!p) break;

      p.active = true;
      p.position.copy(hitPoint);
      p.velocity.set(
        (Math.random() - 0.5) * config.spread,
        Math.random() * 0.5 + 0.3,
        (Math.random() - 0.5) * config.spread,
      );
      p.velocity.multiplyScalar(randomFloat(config.speed[0], config.speed[1]));
      p.lifetime = randomFloat(config.lifetime[0], config.lifetime[1]);
      p.elapsed = 0;
      p.gravity = config.gravity;
      p.color.set(config.color);
    }
  };

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const positions = positionAttr.current;
    const colors = colorAttr.current;
    const sizes = sizeAttr.current;
    let needsUpdate = false;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = pool.current[i];
      if (!p.active) {
        sizes[i] = 0;
        continue;
      }

      p.elapsed += dt * 1000;
      if (p.elapsed >= p.lifetime) {
        p.active = false;
        sizes[i] = 0;
        needsUpdate = true;
        continue;
      }

      // Physics
      p.position.addScaledVector(p.velocity, dt);
      p.velocity.y += p.gravity * dt;

      // Fade
      const lifeT = p.elapsed / p.lifetime;
      const opacity = 1.0 - lifeT;

      // Write to buffers
      const i3 = i * 3;
      positions[i3] = p.position.x;
      positions[i3 + 1] = p.position.y;
      positions[i3 + 2] = p.position.z;
      colors[i3] = p.color.r * opacity;
      colors[i3 + 1] = p.color.g * opacity;
      colors[i3 + 2] = p.color.b * opacity;
      sizes[i] = p.size * (1 - lifeT * 0.3); // Slight shrink over life

      needsUpdate = true;
    }

    if (needsUpdate && pointsRef.current) {
      const geo = pointsRef.current.geometry;
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
      geo.attributes.size.needsUpdate = true;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={MAX_PARTICLES} array={positionAttr.current} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={MAX_PARTICLES} array={colorAttr.current} itemSize={3} />
        <bufferAttribute attach="attributes-size" count={MAX_PARTICLES} array={sizeAttr.current} itemSize={1} />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        sizeAttenuation
        vertexColors
        transparent
        depthWrite={false}
      />
    </points>
  );
};
```

### 10.4 Raycast Interaction Hook

```typescript
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const _raycaster = new THREE.Raycaster();
const _screenCenter = new THREE.Vector2(0, 0);

interface RaycastTarget {
  entity: Entity | null;
  hitPoint: THREE.Vector3;
  distance: number;
  type: "ground" | "tree" | "rock" | "structure" | "water" | "npc";
  validForTool: boolean;
  inRange: boolean;
  actionLabel: string | null;
  staminaCost: number;
}

export function useToolRaycast(
  currentToolId: string,
  toolUpgradeTier: number,
): RaycastTarget | null {
  const { camera, scene } = useThree();
  const targetRef = useRef<RaycastTarget | null>(null);

  useFrame(() => {
    const config = toolVisuals[currentToolId];
    if (!config) {
      targetRef.current = null;
      return;
    }

    // Configure raycaster layers
    _raycaster.layers.disableAll();
    for (const layer of config.layers) {
      _raycaster.layers.enable(layer);
    }

    _raycaster.setFromCamera(_screenCenter, camera);
    const intersects = _raycaster.intersectObjects(scene.children, true);

    if (intersects.length === 0) {
      targetRef.current = null;
      return;
    }

    const hit = intersects[0];
    const hitType = resolveHitType(hit.object);
    const entity = resolveEntity(hit.object);
    const inRange = hit.distance <= config.range;
    const actionDef = resolveAction(currentToolId, hitType, entity);

    targetRef.current = {
      entity,
      hitPoint: hit.point.clone(),
      distance: hit.distance,
      type: hitType,
      validForTool: actionDef !== null && !actionDef.blocked,
      inRange,
      actionLabel: actionDef?.label ?? null,
      staminaCost: actionDef
        ? getStaminaCostWithUpgrade(getToolBaseCost(currentToolId), toolUpgradeTier)
        : 0,
    };
  });

  return targetRef.current;
}
```

---

## 11. Reduced Motion Matrix

Every visual effect has a defined behavior when `prefers-reduced-motion: reduce` is active. This is not optional.

| Effect | Normal Behavior | Reduced Motion Behavior |
|--------|----------------|------------------------|
| Hand sway | Offset lags camera turn | Disabled (multiplier = 0) |
| Walk bob | Sinusoidal oscillation | Disabled (amplitude = 0) |
| Idle breathing | Slow vertical sine | Disabled |
| Sprint FOV | Lerp to 72 | Stay at 65 |
| Tool switch drop/rise | 250ms + 250ms animation | Instant swap (0ms) |
| Tool use animation | Full keyframe playback | **Still plays** (essential feedback) |
| Screen shake | Camera rotation perturbation | Disabled (amplitude = 0) |
| FOV punch | Temporary FOV bump | Disabled |
| Impact particles | Burst with velocity | 2 particles, no velocity, fade in place |
| Floating text rise | Drifts upward 40px/s | Appears at final position, fades |
| Resource icon arc | Bezier arc to HUD | Teleport to HUD counter |
| Stamina bar pulse | Opacity oscillation | Static color change |
| Exhaustion vignette | Animated edges | Static vignette |
| Crosshair pulse | Scale oscillation on valid target | Static color change only |
| Tree shake on hit | Rotation oscillation | Amplitude halved |
| Rock pulse on mine | Scale oscillation | Disabled |
| HUD counter bounce | Scale 1.0 -> 1.3 -> 1.0 | No scale change, number updates instantly |
| Heavy breathing audio | Below 20% stamina | **Still plays** (non-visual, essential feedback) |
| Haptic feedback | Impact patterns | **Still fires** (non-visual) |
| Sound effects | All impact sounds | **Still plays** (non-visual) |

**Detection:**

```typescript
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Listen for changes (user can toggle during gameplay)
window.matchMedia("(prefers-reduced-motion: reduce)")
  .addEventListener("change", (e) => {
    reducedMotionRef.current = e.matches;
  });
```

**Rule:** Non-visual feedback (audio, haptics) always fires regardless of motion preference. Tool use animations always play because they are essential gameplay feedback ("did my action register?"). Everything else that is purely decorative motion is disabled.

---

## Appendix A: Timing Diagram -- Axe Chop Sequence

```
Time (ms)  0    100   180   200   280   320   400   480   600   700   860  1500
           |     |     |     |     |     |     |     |     |     |     |     |
ANIMATION  [== LIFT =========][======= SWING =====][EMB][WRENCH][= RECOV ==]
                                                    ^
                                                    IMPACT (320ms)
                                                    |
SHAKE      ·····································[########~~~~]
FOV PUNCH  ·····································[##~~~~~]
PARTICLES  ·····································[BURST ~~ ~~ ~~ fade]
SOUND      ·····································[THUNK]
HAPTIC     ·····································[BUZZ]
TREE SHAKE ·····································[~~ ~~ ~~ ~~fade]
                                                    |
                                                    +50ms: FLOATING TEXT appears
                                                    |
                                                    +100ms: particle 1 -> HUD
                                                    +180ms: particle 2 -> HUD
                                                    +260ms: particle 3 -> HUD
                                                               |
                                                               +700ms: counter flash 1
                                                               +780ms: counter flash 2
                                                               +860ms: counter flash 3
                                                                              |
                                                                              1500ms: text fades
```

## Appendix B: File Map

| File | Purpose |
|------|---------|
| `config/game/toolVisuals.json` | Per-tool model paths, offsets, scales, ranges, layers |
| `config/game/toolAnimations.json` | Keyframe data for all 5 tool use animations |
| `config/game/toolImpacts.json` | Shake, particles, FOV punch, sound, haptic per tool |
| `config/game/viewModelJuice.json` | Sway, bob, sprint FOV, switch timing, stamina thresholds |
| `config/game/toolActions.json` | Tool + target -> action label mapping and validation |
| `components/player/ToolViewModel.tsx` | R3F component: tool rendering, animation, juice |
| `components/player/ImpactParticles.tsx` | Pooled particle system for tool impacts |
| `components/player/Crosshair.tsx` | Crosshair dot with color feedback |
| `components/player/TargetInfo.tsx` | "Looking at X / action" HUD element |
| `game/systems/stamina.ts` | Stamina drain/regen (existing, unchanged) |
| `game/systems/harvest.ts` | Harvest yield calculation (existing, unchanged) |
| `game/systems/toolUpgrades.ts` | Upgrade tier cost/effect calculation (existing, unchanged) |
| `game/systems/AudioManager.ts` | Sound synthesis (add `mine` sound ID) |
| `game/ui/StaminaGauge.tsx` | Stamina bar with state-based colors and effects |
| `game/ui/FloatingParticles.tsx` | Resource drop floating text |
| `game/ui/ResourceBar.tsx` | Resource counter with arrival bounce |
