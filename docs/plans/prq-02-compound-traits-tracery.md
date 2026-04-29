---
title: PRQ-02 — Compound Trait System + Tracery Narrator
priority: P0
status: pending
updated: 2026-04-29
blocks: []
blocked_by: [prq-01]
---

# PRQ-02: Compound Trait System + Tracery Narrator

## Goal

Replace the "unlock-gated recipe list" crafting model with a compound
trait discovery system. Replace the Grove Spirit's scripted lines and
the NPC phrase-pool dialogue with a Tracery-grammar narrator that
generates first-person discovery text and journal entries.

## Spec reference

`docs/superpowers/specs/2026-04-29-grovekeeper-voxel-pivot-design.md`
— sections "Compound trait + crafting system", "Tracery narrator and
journal".

## Success criteria

1. Materials carry trait sets. Combining two materials with the right
   combined traits resolves to a named compound.
2. The narrator generates grammatically varied first-person text for
   each discovery event (first pick-up, compound naming, encounter
   trigger, journal entries).
3. The journal is persisted and renders in the PauseMenu Stats tab.
4. Encounter gate includes `hasCraftedNamedWeapon` (in addition to
   biome + time).
5. The old `known_recipes` unlock model is retired; discovered compounds
   persist in `known_compounds` table.
6. All tests pass. TypeScript clean.

## Task breakdown

### T1: Trait type system
- `src/systems/traits.ts`:
  - `Trait` enum: `hard | long | pointy | sharp | soft | short | tied |
    throwable | burning | wet | dry | hollow`
  - `TraitSet = Set<Trait>` or `number` (bitmask — prefer bitmask for
    perf)
  - `traitOf(material: string): TraitSet` — lookup table from material
    id to bitmask
  - `combinedTraits(a: TraitSet, b: TraitSet): TraitSet` — union
- Unit test: trait lookup + combination.

### T2: Compound resolution engine
- `src/systems/compounds.ts`:
  - `CompoundRule`: `{ requires: Trait[], yields: string, name: string,
    minCount?: number }`
  - `COMPOUNDS: CompoundRule[]` — the declarative table (all RC recipes
    converted to trait-based rules)
  - `resolveCompound(traits: TraitSet): CompoundRule | null`
  - Trait mask subset check: rule fires if all required traits present
    in combined set
- Unit test: each compound rule resolves correctly; no false positives.

### T3: Crafting interaction wiring
- Remove `known_recipes` filter from `CraftingPanel`.
- New `CombineAction`: player triggers combine on two held/selected items.
  Compute combined traits, call `resolveCompound`, emit event.
- `CompoundDiscoveryEvent`: `{ rule: CompoundRule, inputs: Material[],
  narratorRegister: "neutral" | "impressed" | "baffled" }`
- On discovery: add to Koota `KnownCompounds` component; write to
  `known_compounds` DB table; fire narrator event.
- Subsequent crafts: player can craft a known compound directly from
  name (shows in a "known compounds" list, same surface as before).
- Unit test: combine + discovery + re-craft.

### T4: Durability system
- `ItemInstance`: `{ id: string, compoundId: string, uses: number,
  maxUses: number }`
- `DURABILITY: Record<string, number>` table (pointy-rock: 3, knife: 8,
  spear: 12, axe: 20, etc.)
- On swing/use: decrement uses. At 0: remove from inventory, narrator
  comment ("Your #item# is gone.").
- Unit test: durability countdown + removal.

### T5: Time-based transforms
- `TimeTransform`: `{ materialId: string, condition: "wet" | "heat",
  afterMs: number, yields: string }`
- Tracked in a Koota component `PendingTransforms`:
  `{ id, materialId, startedAt, condition }`
- Checked each game tick. On completion: replace material in inventory,
  fire narrator event.
- Example: wet-stick after 60s game-time → soft-stick.
- Unit test: transform fires after simulated time.

### T6: Tracery grammar
- Install `tracery` or vendor a minimal grammar engine into
  `src/systems/tracery.ts`.
- Grammar file: `src/content/narrator-grammar.json`.
- Keys: `discovery.neutral`, `discovery.impressed`, `discovery.baffled`,
  `compound.named`, `encounter.first`, `hint.partial`, `journal.*`.
- `narrator.generate(key: string, context: Record<string, string>): string`
  — substitutes context vars into Tracery output.
- Unit test: each grammar key produces non-empty varied output across
  3+ calls (probabilistic variety test).

### T7: Journal system
- `src/systems/journal.ts`:
  - `appendJournalEntry(worldId, text, context)` — writes to DB.
  - `getJournalEntries(worldId): JournalEntry[]` — reads newest-first.
- DB table: `journal_entries(id, world_id, text, context_json, created_at)`.
- Drizzle migration: add table.
- Events that append: first pick-up of each material, first compound
  discovery, first grove discovery, first claim, first encounter.
- Unit test: append + read.

### T8: PauseMenu journal tab
- Replace the Stats tab placeholder in `PauseMenu.tsx` with a "Journal"
  tab that renders `getJournalEntries` as a scrollable list.
- Entries are prose text — no checkboxes, no quest pointers.
- Newest first. Truncated at 100 entries displayed.
- Accessible: `role="log"`, `aria-live="polite"`.

### T9: Partial-discovery hints
- `src/systems/hints.ts`:
  - `checkPartialHints(inventory: Inventory, known: KnownCompounds):
    PartialHint[]`
  - For each `CompoundRule` where player has some but not all required
    trait-carrying materials, emit a hint.
- Narrator key `hint.partial` with `{hand: "left"|"right", item, 
  missing_trait}` context.
- Hints surface in journal (narrator register "baffled") and optionally
  as a brief HUD toast (dismissible).
- Unit test: hint fires for partially-satisfied compound.

### T10: Encounter gate update
- `src/systems/encounters.ts`:
  - Add third gate: `hasCraftedNamedWeapon(worldId): boolean`
  - Checks `known_compounds` for any compound where `yields` is in
    WEAPON_IDS set.
  - On first weapon crafted: audio sting, narrator entry, gate flips.
- Unit test: encounters blocked before weapon; enabled after.

## Migration notes

The old `known_recipes` table is not dropped — it is kept for save
compatibility but no longer written to for new discoveries. New code
reads `known_compounds`. A migration function converts existing
`known_recipes` rows to `known_compounds` at first load.
