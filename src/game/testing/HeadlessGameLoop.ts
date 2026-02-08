/**
 * HeadlessGameLoop — Ticks all game systems without BabylonJS or React.
 *
 * Provides a lightweight simulation loop for automated testing:
 * growth, harvest, stamina regeneration, weather, and time advancement.
 * Uses a fixed timestep for deterministic, reproducible results.
 */

import { farmerQuery, treesQuery } from "../ecs/world";
import { useGameStore } from "../stores/gameStore";
import { growthSystem } from "../systems/growth";
import { harvestSystem, initHarvestable } from "../systems/harvest";
import { staminaSystem } from "../systems/stamina";
import {
  type GameTime,
  initializeTime,
  type Season,
  updateTime,
} from "../systems/time";
import {
  getWeatherGrowthMultiplier,
  initializeWeather,
  updateWeather,
  type WeatherState,
  type WeatherType,
} from "../systems/weather";
import { hashString } from "../utils/seedRNG";

export interface HeadlessLoopConfig {
  /** Simulation ticks per second (default: 30). */
  ticksPerSecond?: number;
  /** Initial season override (default: uses time system default — spring). */
  initialSeason?: Season;
  /** Whether to run the weather system (default: false for determinism). */
  weatherEnabled?: boolean;
  /** RNG seed for weather rolls (default: 42). */
  weatherSeed?: number;
  /** Time scale multiplier for fast-forwarding seasons/weather (default: 1). */
  timeScale?: number;
}

export class HeadlessGameLoop {
  private _tickCount = 0;
  private readonly _dt: number;
  private readonly _dtMs: number;
  private _gameTime: GameTime | null = null;
  private _weatherState: WeatherState | null = null;
  private readonly _weatherEnabled: boolean;
  private readonly _weatherSeed: number;
  private readonly _timeScale: number;

  constructor(config: HeadlessLoopConfig = {}) {
    const tps = config.ticksPerSecond ?? 30;
    this._dt = 1 / tps;
    this._dtMs = (1 / tps) * 1000;
    this._weatherEnabled = config.weatherEnabled ?? false;
    this._weatherSeed = config.weatherSeed ?? 42;
    this._timeScale = config.timeScale ?? 1;

    // Initialize the time system
    initializeTime(useGameStore.getState().gameTimeMicroseconds);
  }

  /** Delta time per tick in seconds. */
  get dt(): number {
    return this._dt;
  }

  /** Total ticks elapsed. */
  get ticks(): number {
    return this._tickCount;
  }

  /** Current season from the time system. */
  get season(): Season {
    return this._gameTime?.season ?? "spring";
  }

  /** Current game time state. */
  get gameTime(): GameTime | null {
    return this._gameTime;
  }

  /** Time scale multiplier. */
  get timeScale(): number {
    return this._timeScale;
  }

  /** Current weather type. */
  get weather(): WeatherType {
    return this._weatherState?.current.type ?? "clear";
  }

  /**
   * Advance one simulation frame.
   * Calls: updateTime → weather → growthSystem → staminaSystem → harvestSystem.
   * Also promotes trees to harvestable when they reach stage 3+.
   */
  tick(): void {
    // 1. Time system — advance game clock (scaled for fast-forward)
    this._gameTime = updateTime(this._dtMs * this._timeScale);
    const season = this._gameTime.season;

    // 2. Weather system (optional)
    let weatherGrowthMult = 1.0;
    if (this._weatherEnabled) {
      const gameTimeSec = this._gameTime.microseconds / 1_000_000;
      if (!this._weatherState) {
        this._weatherState = initializeWeather(gameTimeSec);
      }
      this._weatherState = updateWeather(
        this._weatherState,
        gameTimeSec,
        season,
        hashString(`seed-${this._weatherSeed}`),
      );
      weatherGrowthMult = getWeatherGrowthMultiplier(
        this._weatherState.current.type,
      );
    }

    // 3. ECS systems
    growthSystem(this._dt, season, weatherGrowthMult);
    this.syncStaminaToECS();
    staminaSystem(this._dt);
    this.syncStaminaToStore();
    harvestSystem(this._dt);

    // 4. Promote newly mature trees to harvestable
    for (const entity of treesQuery) {
      if (entity.tree && entity.tree.stage >= 3 && !entity.harvestable) {
        initHarvestable(entity);
      }
    }

    // 5. Sync time to store periodically (every 30 ticks ~ 1s)
    if (this._tickCount % 30 === 0) {
      const store = useGameStore.getState();
      store.setGameTime(this._gameTime.microseconds);
      store.setCurrentSeason(season);
      store.setCurrentDay(this._gameTime.day);
    }

    this._tickCount++;
  }

  /**
   * Run N ticks in a loop (fast-forward).
   */
  run(ticks: number): void {
    for (let i = 0; i < ticks; i++) {
      this.tick();
    }
  }

  /**
   * Sync Zustand store stamina → ECS farmerState.
   * GameActions deduct from the store; push that to ECS before staminaSystem runs.
   */
  private syncStaminaToECS(): void {
    const storeStamina = useGameStore.getState().stamina;
    for (const entity of farmerQuery) {
      if (entity.farmerState) {
        entity.farmerState.stamina = storeStamina;
      }
    }
  }

  /**
   * Sync ECS farmerState stamina → Zustand store.
   * staminaSystem regenerates on ECS; push that back to the store.
   */
  private syncStaminaToStore(): void {
    for (const entity of farmerQuery) {
      if (entity.farmerState) {
        useGameStore.setState({ stamina: entity.farmerState.stamina });
        break;
      }
    }
  }
}
