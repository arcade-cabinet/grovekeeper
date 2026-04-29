/**
 * CraftingStationProximityBehavior — runtime watcher.
 *
 * Polls all known `CraftingStationActor`s each frame. When the player
 * is within a station's proximity radius AND the `open-craft` action
 * fires its rising edge, the behavior emits a `CraftingPanelEvent`
 * through `eventBus` so the Solid overlay opens.
 *
 * Pure adapter: it never mutates the station, never opens any panel
 * itself, and never reads inventory. It only translates "player +
 * input + nearby station" into a UI event. The actual panel mount,
 * recipe filtering, and craft persistence live in `<CraftingPanel>`.
 *
 * Why a behavior, not a hand-rolled `requestAnimationFrame`: the JP
 * actor graph already gives us a per-frame `update(deltaMs)` and
 * deterministic disposal. Same pattern as `InteractionTickBehavior`.
 */
import { type Actor, ActorComponent } from "@jolly-pixel/engine";
import { eventBus } from "@/runtime/eventBus";
import type { CraftingStationActor } from "./CraftingStationActor";

export interface CraftingStationProximityBehaviorOptions {
  /** Live list of candidate stations. Polled each frame. */
  getStations: () => readonly CraftingStationActor[];
  /** Player position read each frame (XZ used). */
  getPlayerPosition: () => { x: number; z: number };
  /** `InputManager`-shaped reader — we only need the rising-edge bit. */
  input: {
    getActionState(action: "open-craft"): {
      pressed: boolean;
      justPressed: boolean;
    };
  };
}

export class CraftingStationProximityBehavior extends ActorComponent {
  private readonly getStations: () => readonly CraftingStationActor[];
  private readonly getPlayerPosition: () => { x: number; z: number };
  private readonly input: CraftingStationProximityBehaviorOptions["input"];

  constructor(actor: Actor, options: CraftingStationProximityBehaviorOptions) {
    super({ actor, typeName: "CraftingStationProximityBehavior" });
    this.getStations = options.getStations;
    this.getPlayerPosition = options.getPlayerPosition;
    this.input = options.input;
  }

  awake(): void {
    this.needUpdate = true;
  }

  update(_deltaMs: number): void {
    const player = this.getPlayerPosition();
    let nearStation = false;
    for (const station of this.getStations()) {
      if (station.isPlayerNear(player)) {
        nearStation = true;
        eventBus.emitInteractCue({
          variant: "craft",
          label: "Press E to craft",
        });
        const button = this.input.getActionState("open-craft");
        if (button.justPressed) {
          eventBus.emitCraftingPanel({
            stationId: station.stationId,
            open: true,
          });
        }
        return;
      }
    }
    if (!nearStation) {
      eventBus.emitInteractCue(null);
    }
  }
}
