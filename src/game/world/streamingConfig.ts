/**
 * streamingConfig — resolves the right `ChunkManagerStreamingConfig`
 * for the runtime (desktop vs mobile) by reading
 * `world.config.json#streaming` and combining the per-density radii
 * with the shared per-frame caps.
 *
 * Mobile detection is intentionally cheap and feature-driven (touch
 * events present, or coarse pointer media query) — no UA sniffing.
 */

import type { ChunkManagerStreamingConfig } from "./ChunkManager";
import worldConfig from "./world.config.json";

/** True if the host appears to be a touch / mobile device. */
export function isMobileLikeDevice(): boolean {
  if (typeof window === "undefined") return false;
  if ("ontouchstart" in window) return true;
  if (typeof window.matchMedia === "function") {
    try {
      return window.matchMedia("(pointer: coarse)").matches;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Build the full streaming config the manager wants.
 *
 * @param overrideMobile - explicit override for tests / forced mobile
 *   QA. Pass `true` to force the mobile profile, `false` to force
 *   desktop, omit to auto-detect via `isMobileLikeDevice()`.
 */
export function resolveStreamingConfig(
  overrideMobile?: boolean,
): ChunkManagerStreamingConfig {
  const mobile = overrideMobile ?? isMobileLikeDevice();
  const tier = mobile
    ? worldConfig.streaming.mobile
    : worldConfig.streaming.desktop;
  return {
    activeRadius: tier.activeRadius,
    bufferRadius: tier.bufferRadius,
    spawnsPerFrame: worldConfig.streaming.spawnsPerFrame,
    despawnsPerFrame: worldConfig.streaming.despawnsPerFrame,
  };
}
