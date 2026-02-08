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
