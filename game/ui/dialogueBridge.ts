/**
 * Dialogue session bridge (Spec §15, §33).
 *
 * Module-level observable store for the active NPC/spirit dialogue session.
 * Framework-free — importable from both game hooks and React Native components.
 *
 * Usage:
 *   // To open a dialogue (from useSpiritProximity, onNpcTap, etc.):
 *   openDialogueSession(entity.id, store.worldSeed);
 *
 *   // To close (from NpcDialogue or game system):
 *   closeDialogueSession();
 *
 *   // In React components — subscribe via useSyncExternalStore:
 *   const session = useSyncExternalStore(
 *     subscribeDialogueSession,
 *     getDialogueSession,
 *     getDialogueSession,
 *   );
 *
 * Follows the same pattern as game/ui/Toast.ts.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DialogueSession {
  /** ECS entity ID of the entity being talked to. */
  entityId: string;
  /** World seed (for deterministic auto-advance branch selection). */
  worldSeed: string;
}

// ---------------------------------------------------------------------------
// Module-level store
// ---------------------------------------------------------------------------

let _session: DialogueSession | null = null;
const _listeners = new Set<() => void>();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Open a dialogue session for the given entity.
 *
 * Called from game hooks (useSpiritProximity, useBirmotherEncounter, onNpcTap)
 * immediately after the ECS DialogueComponent is attached to the entity.
 *
 * @param entityId  ECS entity ID of the entity to talk to
 * @param worldSeed World seed for deterministic branch selection
 */
export function openDialogueSession(entityId: string, worldSeed: string): void {
  _session = { entityId, worldSeed };
  for (const l of _listeners) l();
}

/**
 * Close the active dialogue session.
 *
 * Called when the player dismisses the dialogue, the tree ends, or the
 * entity leaves the world.
 */
export function closeDialogueSession(): void {
  _session = null;
  for (const l of _listeners) l();
}

/**
 * Get the current session snapshot (non-reactive).
 * Pass as the snapshot getter to useSyncExternalStore.
 */
export function getDialogueSession(): DialogueSession | null {
  return _session;
}

/**
 * Subscribe to session changes. Returns an unsubscribe function.
 * Pass as the subscribe argument to useSyncExternalStore.
 */
export function subscribeDialogueSession(listener: () => void): () => void {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

/**
 * Reset session state. Only for use in test environments.
 */
export function _resetDialogueSessionForTesting(): void {
  _session = null;
  _listeners.clear();
}
