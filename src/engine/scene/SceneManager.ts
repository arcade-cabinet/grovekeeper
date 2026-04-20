/**
 * SceneManager — Engine + Scene creation and disposal.
 *
 * Owns the BabylonJS Engine and Scene lifecycle. Provides the game loop
 * registration point and handles window resize.
 */

import type { Engine } from "@babylonjs/core/Engines/engine";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import type { Scene } from "@babylonjs/core/scene";

export class SceneManager {
  engine: Engine | null = null;
  scene: Scene | null = null;

  private resizeHandler: (() => void) | null = null;
  private resizeObserver: ResizeObserver | null = null;

  async init(
    canvas: HTMLCanvasElement,
  ): Promise<{ engine: Engine; scene: Scene }> {
    const { Engine } = await import("@babylonjs/core/Engines/engine");
    const { Scene } = await import("@babylonjs/core/scene");

    const engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      antialias: true,
    });
    this.engine = engine;

    // Hardware scaling — tradeoff between fidelity and fill rate.
    // Babylon defaults to 1 (render at full device pixel ratio). On
    // retina mobile that means drawing ~3× more pixels than desktop,
    // which is the single biggest fill-rate cost for this game.
    //
    // Strategy (matches docs/PERF_AUDIT.md recommendation):
    //   - Touch devices (mobile/tablet): 1 / min(2, DPR) — caps at 2,
    //     so a 3× retina phone renders at 1.5× (still sharp, ~55% fewer
    //     pixels). Desktop-class DPR=1 or 2 gets 1.0 (no change).
    //   - Non-touch: identity (1.0) — assume desktop GPU has headroom.
    //
    // Hardware scaling level is `1 / renderScale`, so higher = smaller
    // framebuffer. Engine.setHardwareScalingLevel(1.5) means render at
    // 2/3 size then upscale, ~45% fewer pixels than 1.0.
    const isTouch =
      "ontouchstart" in window ||
      (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0);
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio : 1;
    if (isTouch && dpr > 1) {
      engine.setHardwareScalingLevel(dpr / Math.min(2, dpr));
    }

    const scene = new Scene(engine);
    // Match clear color to fog/wilderness so any exposed background blends.
    scene.clearColor = new Color4(0.35, 0.48, 0.3, 1);
    this.scene = scene;

    this.resizeHandler = () => engine.resize();
    window.addEventListener("resize", this.resizeHandler);

    // Watch for canvas container resizes (layout shifts, DevTools toggle,
    // mobile address bar collapse) that don't fire window.resize.
    // Also handles the initial layout race — React's useEffect fires before
    // CSS resolves, so the Engine constructor may read stale canvas dimensions.
    // The first ResizeObserver callback corrects the WebGL viewport.
    this.resizeObserver = new ResizeObserver(() => engine.resize());
    this.resizeObserver.observe(canvas);

    return { engine, scene };
  }

  startRenderLoop(onFrame: () => void): void {
    if (!this.engine || !this.scene) return;
    const scene = this.scene;
    this.engine.runRenderLoop(() => {
      onFrame();
      scene.render();
    });
  }

  dispose(): void {
    if (this.resizeHandler) {
      window.removeEventListener("resize", this.resizeHandler);
      this.resizeHandler = null;
    }
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.engine?.dispose();
    this.engine = null;
    this.scene = null;
  }
}
