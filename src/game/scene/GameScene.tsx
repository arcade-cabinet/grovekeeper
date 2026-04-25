/**
 * GameScene — Solid component that owns the Jolly Pixel runtime canvas.
 *
 * Responsibilities:
 *   - Mount a single full-viewport <canvas> the Three.js renderer
 *     attaches to.
 *   - Boot the JP runtime via `createRuntime` after onMount.
 *   - Dispose the runtime on cleanup so HMR / route changes don't leak
 *     a WebGL context.
 *
 * The Solid UI overlay (HUD, menus, dialogue) sits as a sibling DOM
 * tree above the canvas — it does not render through Three.js. JP's
 * `loadRuntime` injects its own `<jolly-loading>` custom element while
 * the GPU tier check + asset autoload completes; once the loop starts
 * the canvas fades in.
 */

import { onCleanup, onMount } from "solid-js";
import { createRuntime, type SceneHandle } from "./runtime";

export const GameScene = () => {
  let canvasRef: HTMLCanvasElement | undefined;
  let handle: SceneHandle | null = null;
  let disposed = false;

  onMount(() => {
    if (!canvasRef) return;
    void createRuntime(canvasRef)
      .then((h) => {
        if (disposed) {
          h.dispose();
          return;
        }
        handle = h;
      })
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.error("[grovekeeper] GameScene runtime boot failed", error);
      });
  });

  onCleanup(() => {
    disposed = true;
    handle?.dispose();
    handle = null;
  });

  return (
    <canvas
      ref={canvasRef}
      id="scene-canvas"
      style={{
        position: "fixed",
        inset: "0",
        width: "100vw",
        height: "100vh",
        display: "block",
        "touch-action": "none",
      }}
    />
  );
};
