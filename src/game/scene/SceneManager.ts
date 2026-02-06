/**
 * SceneManager — Engine + Scene creation and disposal.
 *
 * Owns the BabylonJS Engine and Scene lifecycle. Provides the game loop
 * registration point and handles window resize.
 */

import type { Engine } from "@babylonjs/core/Engines/engine";
import type { Scene } from "@babylonjs/core/scene";

export class SceneManager {
  engine: Engine | null = null;
  scene: Scene | null = null;

  private resizeHandler: (() => void) | null = null;

  async init(canvas: HTMLCanvasElement): Promise<{ engine: Engine; scene: Scene }> {
    const { Engine } = await import("@babylonjs/core/Engines/engine");
    const { Scene } = await import("@babylonjs/core/scene");

    const engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      antialias: true,
    });
    this.engine = engine;

    const scene = new Scene(engine);
    this.scene = scene;

    this.resizeHandler = () => engine.resize();
    window.addEventListener("resize", this.resizeHandler);

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
    this.engine?.dispose();
    this.engine = null;
    this.scene = null;
  }
}
