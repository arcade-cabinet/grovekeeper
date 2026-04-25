/**
 * E2E ambient type declarations.
 *
 * Mirrors the shape installed at runtime by `src/shared/utils/debugState.ts`
 * so Playwright specs that read `window.__grove` typecheck without
 * pulling the whole `@/...` path-alias graph into the e2e tsconfig.
 *
 * The runtime declaration in debugState.ts is the source of truth; this
 * file just re-states the publicly-observable shape for the e2e layer.
 * Keep them in sync — if the snapshot fields or actions surface change,
 * update both.
 */

declare global {
  interface GroveActionsDebugSurface {
    /** Switch the top-level screen ("menu" | "playing" | etc.). */
    setScreen?: (screen: string) => void;
    /** Trigger the Grove Spirit's greeting line on demand. */
    triggerSpiritGreeting?: () => void;
    /** Increment a chop swing without facing a tree. */
    simulateChop?: () => void;
    /** Add resources to inventory: ("logs", n) etc. */
    addResource?: (kind: string, count: number) => void;
    /** Open / close crafting panels. */
    openCraftingPanel?: (kind: string) => void;
    closeAllPanels?: () => void;
    /** Begin / commit structure-placement preview. */
    beginPlacement?: (structureId: string) => void;
    commitPlacement?: () => void;
    /** Skip the cinematic and just light the hearth. */
    lightHearth?: () => void;
    /** Open / close the fast-travel UI. */
    openFastTravel?: () => void;
    closeFastTravel?: () => void;
    /** Re-populate the starter grove with villagers. */
    spawnVillagers?: () => void;
    /** Teleport the player Actor directly to world coords (no fade/anim). */
    teleportPlayer?: (x: number, z: number) => void;
    /** Teleport the player to the named biome's anchor coord. */
    teleportToBiome?: (biome: string) => void;
    teleportToGroveThreshold?: () => void;
    /** Discover a grove by id (records the node on the world map). */
    discoverGrove?: (groveId: string) => void;
    /** Open the world map UI. */
    openMap?: () => void;
    /** Spawn a hostile encounter (Wolf). */
    spawnFirstEncounter?: () => void;
    spawnTestEncounter?: () => void;
    /** Switch the in-world season for biome/palette variety. */
    setSeason?: (season: "spring" | "summer" | "autumn" | "winter") => void;
    /** Override the active zone id directly. */
    setZone?: (zoneId: string) => void;
    /** Free-form: any other debug action the runtime exposes. */
    // biome-ignore lint/suspicious/noExplicitAny: open-ended debug surface
    [key: string]: any;
  }

  interface GroveSnapshotPlayer {
    position: { x: number; z?: number; y?: number };
    stamina?: number;
    maxStamina?: number;
  }

  interface GroveSnapshot {
    screen: string;
    player: GroveSnapshotPlayer | null;
    // biome-ignore lint/suspicious/noExplicitAny: snapshot has many more fields, only those used here are listed
    [key: string]: any;
  }

  interface GroveDebugGlobals {
    snapshot: () => GroveSnapshot;
    actions: GroveActionsDebugSurface;
  }

  interface Window {
    __grove?: GroveDebugGlobals;
  }
}

export {};
