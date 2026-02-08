import type { Scene } from "@babylonjs/core/scene";
import type { GridCellComponent } from "../ecs/world";
import { keysToWorld } from "../hooks/useKeyboardInput";
import { screenToGroundPlane } from "../utils/projection";
import {
  advancePathFollow,
  createPathFollow,
  type PathFollowState,
} from "./pathFollowing";
import { buildWalkabilityGrid, findPath, type TileCoord } from "./pathfinding";
import { isMobileDevice } from "./platform";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InputMode = "idle" | "keyboard" | "drag" | "pathfollow";

/** Information about a tapped 3D object. */
export interface ObjectTapInfo {
  entityId: string;
  entityType: string;
  screenX: number;
  screenY: number;
  worldX: number;
  worldZ: number;
}

/** Information about a ground tap (empty ground or object location). */
export interface GroundTapInfo {
  worldX: number;
  worldZ: number;
  screenX: number;
  screenY: number;
  /** If an object was picked, its entity info; otherwise null. */
  entity: { entityId: string; entityType: string } | null;
}

export interface InputManagerCallbacks {
  onAction: () => void;
  onOpenSeeds: () => void;
  onPause: () => void;
  onSelectTool: (index: number) => void;
  /** Called when a pickable 3D object (tree, NPC, structure) is tapped. */
  onObjectTapped?: (info: ObjectTapInfo) => void;
  /** Called when any ground position is tapped (empty ground or object location). */
  onGroundTapped?: (info: GroundTapInfo) => void;
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

// ---------------------------------------------------------------------------
// InputManager
// ---------------------------------------------------------------------------

export class InputManager {
  private config: InputManagerConfig | null = null;
  private mode: InputMode = "idle";
  private disabled = false;
  private joystickActive = false;
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

    config.canvas.addEventListener("pointerdown", this.boundPointerDown, {
      passive: true,
    });
    config.canvas.addEventListener("pointermove", this.boundPointerMove, {
      passive: true,
    });
    config.canvas.addEventListener("pointerup", this.boundPointerUp, {
      passive: true,
    });
    config.canvas.addEventListener("pointercancel", this.boundPointerUp, {
      passive: true,
    });

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

  setJoystickActive(active: boolean): void {
    this.joystickActive = active;
    if (active) {
      // Cancel any ongoing drag — joystick takes priority
      if (this.isDragging) {
        this.isDragging = false;
        this.pointerId = -1;
        if (this.config) this.config.movementRef.current = { x: 0, z: 0 };
        this.setMode("idle");
      }
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

  /** Trigger A* pathfinding to a world position. Used by external callers (e.g. walk-to-act). */
  startPathTo(targetX: number, targetZ: number): boolean {
    if (!this.config) return false;
    const targetTile: TileCoord = {
      x: Math.round(targetX),
      z: Math.round(targetZ),
    };
    const playerTile = this.config.getPlayerTile();
    const bounds = this.config.getWorldBounds();
    const grid = buildWalkabilityGrid(this.config.getGridCells(), bounds);
    const path = findPath(grid, playerTile, targetTile);
    if (!path || path.length === 0) return false;
    this.pathState = createPathFollow(path);
    this.setMode("pathfollow");
    return true;
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
    if (this.boundKeyUp) window.removeEventListener("keyup", this.boundKeyUp);
    if (this.boundBlur) window.removeEventListener("blur", this.boundBlur);

    this.config = null;
    this.pathState = null;
    this.keysDown.clear();
  }

  // -----------------------------------------------------------------------
  // Pointer Events (drag-to-move + tap-to-move + object picking)
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
      if (this.joystickActive) return; // Joystick owns movement — don't start drag
      this.isDragging = true;
      // Cancel any active pathfinding when starting a drag
      this.cancelPath();
      this.setMode("drag");
    }

    if (this.isDragging) {
      // Normalize to magnitude 1
      // With perspective camera, screen directions map directly to world XZ
      const mag = Math.max(dist, 1);
      const nx = dx / mag;
      const ny = -dy / mag; // screen Y is inverted

      // Direct mapping for perspective camera (no isometric rotation needed)
      const rx = nx;
      const rz = ny;

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

    // First: try to pick a 3D object (tree, NPC, structure)
    const pickResult = scene.pick(
      screenX,
      screenY,
      (mesh) => mesh.isPickable && !!mesh.metadata?.entityType,
    );

    if (pickResult?.hit && pickResult.pickedMesh?.metadata) {
      const meta = pickResult.pickedMesh.metadata as {
        entityId: string;
        entityType: string;
      };
      const worldPos = pickResult.pickedPoint;
      const wx = worldPos?.x ?? 0;
      const wz = worldPos?.z ?? 0;

      // Legacy callback (still used for non-radial interactions)
      this.config.callbacks.onObjectTapped?.({
        entityId: meta.entityId,
        entityType: meta.entityType,
        screenX,
        screenY,
        worldX: wx,
        worldZ: wz,
      });

      // Unified ground tap callback for radial menu
      this.config.callbacks.onGroundTapped?.({
        worldX: wx,
        worldZ: wz,
        screenX,
        screenY,
        entity: { entityId: meta.entityId, entityType: meta.entityType },
      });
      return;
    }

    // Fallback: empty ground tap — emit onGroundTapped (caller decides pathfinding)
    const worldPos = screenToGroundPlane(screenX, screenY, scene);
    if (!worldPos) return;

    this.config.callbacks.onGroundTapped?.({
      worldX: worldPos.x,
      worldZ: worldPos.z,
      screenX,
      screenY,
      entity: null,
    });
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
    const movement = keysToWorld(this.keysDown);
    this.config.movementRef.current = movement;

    if (movement.x === 0 && movement.z === 0) {
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
