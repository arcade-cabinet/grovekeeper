import type { Scene } from "@babylonjs/core/scene";
import { keysToIsometric } from "../hooks/useKeyboardInput";
import { isMobileDevice } from "./platform";
import { screenToGroundPlane } from "../utils/projection";
import {
  buildWalkabilityGrid,
  findPath,
  type TileCoord,
} from "./pathfinding";
import {
  createPathFollow,
  advancePathFollow,
  type PathFollowState,
} from "./pathFollowing";
import type { GridCellComponent } from "../ecs/world";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InputMode = "idle" | "keyboard" | "drag" | "pathfollow";

export interface InputManagerCallbacks {
  onAction: () => void;
  onOpenSeeds: () => void;
  onPause: () => void;
  onSelectTool: (index: number) => void;
}

export interface InputManagerConfig {
  canvas: HTMLCanvasElement;
  movementRef: { current: { x: number; z: number } };
  callbacks: InputManagerCallbacks;
  getScene: () => Scene | null;
  getGridCells: () => Iterable<{ gridCell?: GridCellComponent }>;
  getWorldBounds: () => {
    minX: number;
    minZ: number;
    maxX: number;
    maxZ: number;
  };
  getPlayerWorldPos: () => { x: number; z: number };
  getPlayerTile: () => TileCoord;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TAP_MAX_MS = 300;
const DRAG_THRESHOLD_MOBILE = 6;
const DRAG_THRESHOLD_DESKTOP = 10;
const ISO_ANGLE = Math.PI / 4; // 45° to match camera

// ---------------------------------------------------------------------------
// InputManager
// ---------------------------------------------------------------------------

export class InputManager {
  private config: InputManagerConfig | null = null;
  private mode: InputMode = "idle";
  private disabled = false;
  private pathState: PathFollowState | null = null;

  // Pointer tracking
  private pointerStartX = 0;
  private pointerStartY = 0;
  private pointerStartTime = 0;
  private pointerId = -1;
  private isDragging = false;
  private dragThreshold = DRAG_THRESHOLD_DESKTOP;

  // Keyboard tracking
  private keysDown = new Set<string>();

  // Bound handlers (for removeEventListener)
  private boundPointerDown: ((e: PointerEvent) => void) | null = null;
  private boundPointerMove: ((e: PointerEvent) => void) | null = null;
  private boundPointerUp: ((e: PointerEvent) => void) | null = null;
  private boundKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private boundKeyUp: ((e: KeyboardEvent) => void) | null = null;
  private boundBlur: (() => void) | null = null;

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  init(config: InputManagerConfig): void {
    this.config = config;
    this.dragThreshold = isMobileDevice()
      ? DRAG_THRESHOLD_MOBILE
      : DRAG_THRESHOLD_DESKTOP;

    // Bind event handlers
    this.boundPointerDown = this.onPointerDown.bind(this);
    this.boundPointerMove = this.onPointerMove.bind(this);
    this.boundPointerUp = this.onPointerUp.bind(this);
    this.boundKeyDown = this.onKeyDown.bind(this);
    this.boundKeyUp = this.onKeyUp.bind(this);
    this.boundBlur = this.onBlur.bind(this);

    config.canvas.addEventListener("pointerdown", this.boundPointerDown, { passive: true });
    config.canvas.addEventListener("pointermove", this.boundPointerMove, { passive: true });
    config.canvas.addEventListener("pointerup", this.boundPointerUp, { passive: true });
    config.canvas.addEventListener("pointercancel", this.boundPointerUp, { passive: true });

    window.addEventListener("keydown", this.boundKeyDown);
    window.addEventListener("keyup", this.boundKeyUp);
    window.addEventListener("blur", this.boundBlur);
  }

  /** Called every frame before movementSystem. Drives path following. */
  update(): void {
    if (this.mode !== "pathfollow" || !this.pathState || !this.config) return;

    const playerPos = this.config.getPlayerWorldPos();
    const vec = advancePathFollow(this.pathState, playerPos);
    this.config.movementRef.current = vec;

    if (this.pathState.done) {
      this.pathState = null;
      this.setMode("idle");
      this.config.movementRef.current = { x: 0, z: 0 };
    }
  }

  setDisabled(disabled: boolean): void {
    this.disabled = disabled;
    if (disabled) {
      this.cancelPath();
      this.keysDown.clear();
      if (this.config) this.config.movementRef.current = { x: 0, z: 0 };
      this.setMode("idle");
    }
  }

  cancelPath(): void {
    this.pathState = null;
    if (this.mode === "pathfollow") {
      this.setMode("idle");
      if (this.config) this.config.movementRef.current = { x: 0, z: 0 };
    }
  }

  getMode(): InputMode {
    return this.mode;
  }

  dispose(): void {
    if (this.config) {
      const { canvas } = this.config;
      if (this.boundPointerDown)
        canvas.removeEventListener("pointerdown", this.boundPointerDown);
      if (this.boundPointerMove)
        canvas.removeEventListener("pointermove", this.boundPointerMove);
      if (this.boundPointerUp) {
        canvas.removeEventListener("pointerup", this.boundPointerUp);
        canvas.removeEventListener("pointercancel", this.boundPointerUp);
      }
    }
    if (this.boundKeyDown)
      window.removeEventListener("keydown", this.boundKeyDown);
    if (this.boundKeyUp)
      window.removeEventListener("keyup", this.boundKeyUp);
    if (this.boundBlur) window.removeEventListener("blur", this.boundBlur);

    this.config = null;
    this.pathState = null;
    this.keysDown.clear();
  }

  // -----------------------------------------------------------------------
  // Pointer Events (drag-to-move + tap-to-move)
  // -----------------------------------------------------------------------

  private onPointerDown(e: PointerEvent): void {
    if (this.disabled) return;
    // Only track one pointer at a time
    if (this.pointerId !== -1) return;
    this.pointerId = e.pointerId;
    this.pointerStartX = e.clientX;
    this.pointerStartY = e.clientY;
    this.pointerStartTime = performance.now();
    this.isDragging = false;

    try {
      (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    } catch {
      // setPointerCapture may fail in some environments
    }
  }

  private onPointerMove(e: PointerEvent): void {
    if (this.disabled || e.pointerId !== this.pointerId || !this.config) return;

    const dx = e.clientX - this.pointerStartX;
    const dy = e.clientY - this.pointerStartY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (!this.isDragging && dist > this.dragThreshold) {
      this.isDragging = true;
      // Cancel any active pathfinding when starting a drag
      this.cancelPath();
      this.setMode("drag");
    }

    if (this.isDragging) {
      // Normalize to magnitude 1, then rotate 45° for isometric camera
      const mag = Math.max(dist, 1);
      const nx = dx / mag;
      const ny = -dy / mag; // screen Y is inverted

      // Rotate by ISO_ANGLE to match camera orientation
      const rx = nx * Math.cos(ISO_ANGLE) - ny * Math.sin(ISO_ANGLE);
      const rz = -(nx * Math.sin(ISO_ANGLE) + ny * Math.cos(ISO_ANGLE));

      // Clamp magnitude to 1
      const rmag = Math.sqrt(rx * rx + rz * rz);
      if (rmag > 1) {
        this.config.movementRef.current = { x: rx / rmag, z: rz / rmag };
      } else {
        this.config.movementRef.current = { x: rx, z: rz };
      }
    }
  }

  private onPointerUp(e: PointerEvent): void {
    if (e.pointerId !== this.pointerId || !this.config) return;
    this.pointerId = -1;

    if (this.isDragging) {
      // End drag
      this.isDragging = false;
      this.config.movementRef.current = { x: 0, z: 0 };
      this.setMode("idle");
      return;
    }

    // Not a drag — check if it qualifies as a tap
    if (this.disabled) return;
    const elapsed = performance.now() - this.pointerStartTime;
    if (elapsed > TAP_MAX_MS) return;

    this.handleTap(e.clientX, e.clientY);
  }

  private handleTap(screenX: number, screenY: number): void {
    if (!this.config) return;
    const scene = this.config.getScene();
    if (!scene) return;

    const worldPos = screenToGroundPlane(screenX, screenY, scene);
    if (!worldPos) return;

    // Convert to grid tile
    const targetTile: TileCoord = {
      x: Math.round(worldPos.x),
      z: Math.round(worldPos.z),
    };

    const playerTile = this.config.getPlayerTile();
    const bounds = this.config.getWorldBounds();
    const grid = buildWalkabilityGrid(this.config.getGridCells(), bounds);
    const path = findPath(grid, playerTile, targetTile);

    if (!path || path.length === 0) return;

    this.pathState = createPathFollow(path);
    this.setMode("pathfollow");
  }

  // -----------------------------------------------------------------------
  // Keyboard Events (absorbs useKeyboardInput logic)
  // -----------------------------------------------------------------------

  private onKeyDown(e: KeyboardEvent): void {
    // Ignore if typing in an input field
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    ) {
      return;
    }

    const key = e.key.toLowerCase();
    const cb = this.config?.callbacks;
    if (!cb) return;

    // Escape/P always pass through (to unpause)
    if (this.disabled && key !== "escape" && key !== "p") return;

    // Movement keys
    if (
      [
        "w",
        "a",
        "s",
        "d",
        "arrowup",
        "arrowdown",
        "arrowleft",
        "arrowright",
      ].includes(key)
    ) {
      e.preventDefault();
      // Cancel pathfinding on any manual input
      this.cancelPath();
      this.keysDown.add(key);
      this.updateKeyboardMovement();
      return;
    }

    // Action: Space or Enter
    if (key === " " || key === "enter") {
      e.preventDefault();
      cb.onAction();
      return;
    }

    // Seed selector: E
    if (key === "e") {
      e.preventDefault();
      cb.onOpenSeeds();
      return;
    }

    // Pause: Escape or P
    if (key === "escape" || key === "p") {
      e.preventDefault();
      cb.onPause();
      return;
    }

    // Tool selection: 1-8
    const num = Number.parseInt(key, 10);
    if (num >= 1 && num <= 8) {
      e.preventDefault();
      cb.onSelectTool(num - 1);
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    this.keysDown.delete(key);
    if (
      [
        "w",
        "a",
        "s",
        "d",
        "arrowup",
        "arrowdown",
        "arrowleft",
        "arrowright",
      ].includes(key)
    ) {
      this.updateKeyboardMovement();
    }
  }

  private onBlur(): void {
    this.keysDown.clear();
    this.cancelPath();
    this.isDragging = false;
    this.pointerId = -1;
    if (this.config) this.config.movementRef.current = { x: 0, z: 0 };
    this.setMode("idle");
  }

  private updateKeyboardMovement(): void {
    if (!this.config) return;
    const iso = keysToIsometric(this.keysDown);
    this.config.movementRef.current = iso;

    if (iso.x === 0 && iso.z === 0) {
      if (this.mode === "keyboard") this.setMode("idle");
    } else {
      this.setMode("keyboard");
    }
  }

  // -----------------------------------------------------------------------
  // Mode management
  // -----------------------------------------------------------------------

  private setMode(mode: InputMode): void {
    this.mode = mode;
  }
}
