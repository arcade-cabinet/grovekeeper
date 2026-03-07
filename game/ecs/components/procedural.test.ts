/**
 * Procedural ECS components tests (Spec §procedural-ecs).
 *
 * Validates that procedural entities (terrain, water, sky, weather,
 * particles, fog, audio zones) work through the same Miniplex query
 * pipeline as GLB model entities.
 */
import { World } from "miniplex";
import type {
  TerrainChunkComponent,
  WaterBodyComponent,
  SkyComponent,
  DayNightComponent,
  WeatherComponent,
  FogVolumeComponent,
  ParticleEmitterComponent,
  AmbientZoneComponent,
  PathSegmentComponent,
} from "./procedural";
import type { Position } from "./core";

interface TestEntity {
  id: string;
  position?: Position;
  terrainChunk?: TerrainChunkComponent;
  waterBody?: WaterBodyComponent;
  sky?: SkyComponent;
  dayNight?: DayNightComponent;
  weather?: WeatherComponent;
  fogVolume?: FogVolumeComponent;
  particleEmitter?: ParticleEmitterComponent;
  ambientZone?: AmbientZoneComponent;
  pathSegment?: PathSegmentComponent;
}

describe("Procedural ECS Components", () => {
  let world: World<TestEntity>;

  beforeEach(() => {
    world = new World<TestEntity>();
  });

  describe("TerrainChunk", () => {
    it("should query terrain chunks by position", () => {
      world.add({
        id: "tc_0_0",
        position: { x: 0, y: 0, z: 0 },
        terrainChunk: {
          heightmap: new Float32Array(256),
          baseColor: "#4a7c3f",
          biomeBlend: [0, 0, 0, 0],
          dirty: true,
        },
      });
      world.add({
        id: "tc_1_0",
        position: { x: 16, y: 0, z: 0 },
        terrainChunk: {
          heightmap: new Float32Array(256),
          baseColor: "#7ab648",
          biomeBlend: [0.5, 0, 0, 0],
          dirty: false,
        },
      });

      const query = world.with("terrainChunk", "position");
      expect(query.entities.length).toBe(2);
      const colors = query.entities.map((e) => e.terrainChunk.baseColor).sort();
      expect(colors).toEqual(["#4a7c3f", "#7ab648"]);
    });

    it("should filter dirty chunks for regeneration", () => {
      world.add({
        id: "tc_dirty",
        position: { x: 0, y: 0, z: 0 },
        terrainChunk: {
          heightmap: new Float32Array(256),
          baseColor: "#4a7c3f",
          biomeBlend: [0, 0, 0, 0],
          dirty: true,
        },
      });
      world.add({
        id: "tc_clean",
        position: { x: 16, y: 0, z: 0 },
        terrainChunk: {
          heightmap: new Float32Array(256),
          baseColor: "#7ab648",
          biomeBlend: [0, 0, 0, 0],
          dirty: false,
        },
      });

      const query = world.with("terrainChunk", "position");
      const dirty = query.entities.filter((e) => e.terrainChunk.dirty);
      expect(dirty.length).toBe(1);
      expect(dirty[0].id).toBe("tc_dirty");
    });
  });

  describe("WaterBody", () => {
    it("should create water bodies with Gerstner wave layers", () => {
      world.add({
        id: "pond_1",
        position: { x: 10, y: -0.2, z: 15 },
        waterBody: {
          waterType: "pond",
          waveLayers: [
            { amplitude: 0.02, wavelength: 3, speed: 0.3, steepness: 0.1, direction: [1, 0] },
          ],
          color: "#3d9ea0",
          opacity: 0.7,
          size: { width: 5, depth: 5 },
          foamEnabled: false,
          foamThreshold: 0.6,
          causticsEnabled: true,
          flowDirection: [0, 0],
          flowSpeed: 0,
        },
      });

      const query = world.with("waterBody", "position");
      expect(query.entities.length).toBe(1);
      expect(query.entities[0].waterBody.waterType).toBe("pond");
      expect(query.entities[0].waterBody.waveLayers.length).toBe(1);
    });

    it("should support different water body types", () => {
      const types = ["ocean", "river", "pond", "stream", "waterfall"] as const;
      for (const waterType of types) {
        world.add({
          id: `water_${waterType}`,
          position: { x: 0, y: 0, z: 0 },
          waterBody: {
            waterType,
            waveLayers: [],
            color: "#1a5276",
            opacity: 0.8,
            size: { width: 10, depth: 10 },
            foamEnabled: waterType === "ocean" || waterType === "waterfall",
            foamThreshold: 0.6,
            causticsEnabled: waterType !== "waterfall",
            flowDirection: [1, 0],
            flowSpeed: waterType === "river" || waterType === "stream" ? 1.0 : 0,
          },
        });
      }

      const query = world.with("waterBody", "position");
      expect(query.entities.length).toBe(5);
    });
  });

  describe("Sky + DayNight (singletons)", () => {
    it("should query sky without requiring position", () => {
      world.add({
        id: "sky",
        sky: {
          sunAngle: Math.PI / 4,
          sunAzimuth: Math.PI,
          gradientStops: [
            { position: 0, color: "#87ceeb" },
            { position: 1, color: "#1a3a5c" },
          ],
          starIntensity: 0,
          moonPhase: 0,
          cloudCoverage: 0.3,
          cloudSpeed: 0.02,
        },
      });

      const query = world.with("sky");
      expect(query.entities.length).toBe(1);
      expect(query.entities[0].sky.sunAngle).toBeCloseTo(Math.PI / 4);
    });

    it("should query dayNight without requiring position", () => {
      world.add({
        id: "day_night",
        dayNight: {
          gameHour: 12,
          timeOfDay: "noon",
          dayNumber: 1,
          season: "spring",
          ambientColor: "#ffffff",
          ambientIntensity: 1.0,
          directionalColor: "#fffaee",
          directionalIntensity: 0.9,
          shadowOpacity: 0.8,
        },
      });

      const query = world.with("dayNight");
      expect(query.entities.length).toBe(1);
      expect(query.entities[0].dayNight.timeOfDay).toBe("noon");
    });
  });

  describe("Weather", () => {
    it("should query weather singleton", () => {
      world.add({
        id: "weather",
        weather: {
          weatherType: "rain",
          intensity: 0.7,
          windDirection: [0.5, 0.5],
          windSpeed: 1.5,
          timeRemaining: 90,
          affectsGameplay: true,
        },
      });

      const query = world.with("weather");
      expect(query.entities.length).toBe(1);
      expect(query.entities[0].weather.weatherType).toBe("rain");
      expect(query.entities[0].weather.affectsGameplay).toBe(true);
    });
  });

  describe("FogVolume", () => {
    it("should query fog volumes by position", () => {
      world.add({
        id: "fog_swamp",
        position: { x: 30, y: 0, z: 45 },
        fogVolume: {
          density: 0.6,
          color: "#4a5a4a",
          radius: 15,
          height: 2.5,
          animated: true,
        },
      });

      const query = world.with("fogVolume", "position");
      expect(query.entities.length).toBe(1);
      expect(query.entities[0].fogVolume.density).toBe(0.6);
    });
  });

  describe("ParticleEmitter", () => {
    it("should create firefly emitters near water", () => {
      world.add({
        id: "fireflies_pond",
        position: { x: 10, y: 1, z: 15 },
        particleEmitter: {
          particleType: "fireflies",
          emissionRate: 3,
          lifetime: 4,
          emissionRadius: 8,
          size: 0.04,
          color: "#c8ff00",
          gravity: -0.1,
          windAffected: false,
          maxParticles: 30,
          active: true,
        },
      });

      const query = world.with("particleEmitter", "position");
      expect(query.entities.length).toBe(1);
      expect(query.entities[0].particleEmitter.particleType).toBe("fireflies");
    });

    it("should filter active emitters", () => {
      world.add({
        id: "smoke_active",
        position: { x: 0, y: 0, z: 0 },
        particleEmitter: {
          particleType: "smoke",
          emissionRate: 8,
          lifetime: 3,
          emissionRadius: 0.5,
          size: 0.15,
          color: "#888888",
          gravity: -0.5,
          windAffected: true,
          maxParticles: 25,
          active: true,
        },
      });
      world.add({
        id: "smoke_inactive",
        position: { x: 5, y: 0, z: 5 },
        particleEmitter: {
          particleType: "smoke",
          emissionRate: 8,
          lifetime: 3,
          emissionRadius: 0.5,
          size: 0.15,
          color: "#888888",
          gravity: -0.5,
          windAffected: true,
          maxParticles: 25,
          active: false,
        },
      });

      const query = world.with("particleEmitter", "position");
      const active = query.entities.filter((e) => e.particleEmitter.active);
      expect(active.length).toBe(1);
    });
  });

  describe("AmbientZone", () => {
    it("should create spatial audio zones", () => {
      world.add({
        id: "zone_forest",
        position: { x: 20, y: 0, z: 20 },
        ambientZone: {
          soundscape: "forest",
          radius: 12,
          volume: 0.6,
        },
      });
      world.add({
        id: "zone_water",
        position: { x: 10, y: 0, z: 15 },
        ambientZone: {
          soundscape: "water",
          radius: 8,
          volume: 0.7,
          secondarySoundscape: "forest",
          secondaryVolume: 0.3,
        },
      });

      const query = world.with("ambientZone", "position");
      expect(query.entities.length).toBe(2);
      const waterZone = query.entities.find((e) => e.id === "zone_water");
      expect(waterZone?.ambientZone.secondarySoundscape).toBe("forest");
    });
  });

  describe("PathSegment", () => {
    it("should create path segments with control points", () => {
      world.add({
        id: "trail_1",
        position: { x: 0, y: 0, z: 0 },
        pathSegment: {
          pathType: "trail",
          controlPoints: [
            { x: 0, z: 0 },
            { x: 4, z: 2 },
            { x: 8, z: 1 },
          ],
          width: 1.0,
        },
      });

      const query = world.with("pathSegment", "position");
      expect(query.entities.length).toBe(1);
      expect(query.entities[0].pathSegment.controlPoints.length).toBe(3);
    });
  });

  describe("Uniform query pattern", () => {
    it("should query procedural entities exactly like model entities", () => {
      // Add a mix of procedural and model-like entities
      world.add({
        id: "terrain_0_0",
        position: { x: 0, y: 0, z: 0 },
        terrainChunk: {
          heightmap: new Float32Array(16),
          baseColor: "#4a7c3f",
          biomeBlend: [0, 0, 0, 0],
          dirty: false,
        },
      });
      world.add({
        id: "water_pond",
        position: { x: 5, y: -0.2, z: 5 },
        waterBody: {
          waterType: "pond",
          waveLayers: [],
          color: "#3d9ea0",
          opacity: 0.7,
          size: { width: 4, depth: 4 },
          foamEnabled: false,
          foamThreshold: 0.6,
          causticsEnabled: true,
          flowDirection: [0, 0],
          flowSpeed: 0,
        },
      });
      world.add({
        id: "emitter_fireflies",
        position: { x: 5, y: 1, z: 5 },
        particleEmitter: {
          particleType: "fireflies",
          emissionRate: 3,
          lifetime: 4,
          emissionRadius: 8,
          size: 0.04,
          color: "#c8ff00",
          gravity: -0.1,
          windAffected: false,
          maxParticles: 30,
          active: true,
        },
      });

      // Each query returns ONLY its type — no cross-contamination
      expect(world.with("terrainChunk", "position").entities.length).toBe(1);
      expect(world.with("waterBody", "position").entities.length).toBe(1);
      expect(world.with("particleEmitter", "position").entities.length).toBe(1);

      // All have position — a generic "positioned entities" query would get all 3
      const allPositioned = world.with("position");
      expect(allPositioned.entities.length).toBe(3);
    });
  });
});
