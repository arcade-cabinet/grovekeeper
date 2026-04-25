/**
 * Typed wrapper around @capacitor/preferences.
 *
 * The spec routes small key/value settings (audio volumes, graphics tier,
 * last-played-world pointer) through Preferences rather than SQLite. This
 * is per-app keystore (NSUserDefaults / SharedPreferences / web localStorage)
 * with a tiny Capacitor JS API.
 *
 * Strongly typed: callers refer to `Prefs` keys, not raw strings, so a typo
 * is a compile error. Values round-trip through JSON so we can store numbers
 * and booleans natively even though the underlying API stores strings.
 *
 * Test/SSR safety: when the Preferences plugin is unavailable (Node tests,
 * or before the Capacitor runtime has finished bootstrap) we fall back to
 * an in-memory store so the rest of the codebase doesn't need null checks.
 */

import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

export type GraphicsTier = "low" | "medium" | "high" | "auto";

export interface Prefs {
  "audio.master": number; // 0..1
  "audio.music": number;
  "audio.sfx": number;
  "audio.ambient": number;
  "graphics.tier": GraphicsTier;
  "graphics.chunkRadius": number;
  lastPlayedWorldId: string;
  lastPlayedAt: number; // epoch ms
}

const DEFAULTS: Prefs = {
  "audio.master": 1,
  "audio.music": 0.7,
  "audio.sfx": 0.9,
  "audio.ambient": 0.6,
  "graphics.tier": "auto",
  "graphics.chunkRadius": 3,
  lastPlayedWorldId: "",
  lastPlayedAt: 0,
};

const memoryStore = new Map<string, string>();

function shouldUseMemory(): boolean {
  // Pure Node (no DOM): memory.
  if (typeof window === "undefined") return true;
  // Vitest / Node test runners (process.env.VITEST or NODE_ENV=test): memory,
  // because the localStorage shim in src/test/setup.ts is a vi.fn() noop and
  // Capacitor's web fallback would silently swallow writes.
  if (
    typeof process !== "undefined" &&
    (process.env?.VITEST === "true" || process.env?.NODE_ENV === "test")
  ) {
    return true;
  }
  // Native platforms always use the real plugin.
  if (Capacitor.isNativePlatform()) return false;
  // Web with the plugin available: real plugin (localStorage-backed).
  if (Capacitor.isPluginAvailable("Preferences")) return false;
  return true;
}

async function rawGet(key: string): Promise<string | null> {
  if (shouldUseMemory()) return memoryStore.get(key) ?? null;
  try {
    const result = await Preferences.get({ key });
    return result.value ?? null;
  } catch {
    return memoryStore.get(key) ?? null;
  }
}

async function rawSet(key: string, value: string): Promise<void> {
  if (shouldUseMemory()) {
    memoryStore.set(key, value);
    return;
  }
  try {
    await Preferences.set({ key, value });
  } catch {
    memoryStore.set(key, value);
  }
}

async function rawRemove(key: string): Promise<void> {
  if (shouldUseMemory()) {
    memoryStore.delete(key);
    return;
  }
  try {
    await Preferences.remove({ key });
  } catch {
    memoryStore.delete(key);
  }
}

/**
 * Read a typed preference. Returns the default when no value is stored
 * or stored JSON is malformed.
 */
export async function getPref<K extends keyof Prefs>(
  key: K,
): Promise<Prefs[K]> {
  const raw = await rawGet(key);
  if (raw == null) return DEFAULTS[key];
  try {
    return JSON.parse(raw) as Prefs[K];
  } catch {
    return DEFAULTS[key];
  }
}

/** Write a typed preference. */
export async function setPref<K extends keyof Prefs>(
  key: K,
  value: Prefs[K],
): Promise<void> {
  await rawSet(key, JSON.stringify(value));
}

/** Delete a single preference key (resets it to its default on next read). */
export async function removePref<K extends keyof Prefs>(key: K): Promise<void> {
  await rawRemove(key);
}

/** Bulk read — returns the full Prefs object with defaults filled in. */
export async function getAllPrefs(): Promise<Prefs> {
  const out = { ...DEFAULTS };
  const keys = Object.keys(DEFAULTS) as (keyof Prefs)[];
  await Promise.all(
    keys.map(async (k) => {
      const v = await getPref(k);
      (out as Record<string, unknown>)[k] = v;
    }),
  );
  return out;
}

/** Test-only: clear the in-memory fallback store. */
export function __resetPrefsForTests(): void {
  memoryStore.clear();
}
