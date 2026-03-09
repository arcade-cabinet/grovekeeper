/**
 * toneLayerFactory -- Tone.js synthesis node factory for ambient audio (Spec §27.2).
 *
 * Implements `createToneLayerNode(layer)` for each of the 6 ambient layers:
 *
 *   wind        — NoiseSynth(brown) → LowPassFilter(380Hz) → Volume
 *   birds       — FMSynth (chirp envelope) → Volume
 *   insects     — NoiseSynth(white) → BandPassFilter(5200Hz) → Volume
 *   crickets    — Oscillator(pulse, 2400Hz) → Volume
 *   water       — NoiseSynth(brown) → LowPassFilter(240Hz) → Volume
 *   vegetation  — NoiseSynth(pink) → BandPassFilter(620Hz) → Volume
 *
 * The returned AmbientNode interface is compatible with AmbientLayerNode
 * from ambientAudio.ts (setVolume + dispose). start() and stop() control
 * synthesis lifecycle.
 *
 * Volume threshold: when db < -50 the node ramps to -Infinity (silent)
 * to stop Tone.js from generating wasted CPU.
 */

import type { ToneOscillatorType } from "tone";
import { Filter, FMSynth, Noise, Oscillator, Volume } from "tone";
import type { LayerName } from "./ambientAudio.ts";

/** Minimal controllable interface for a single ambient synthesis layer node. */
export interface AmbientNode {
  setVolume(db: number): void;
  start(): void;
  stop(): void;
  dispose(): void;
}

/** dB value below which we treat the layer as silent and ramp to -Infinity. */
const SILENCE_THRESHOLD_DB = -50;

/**
 * Create a Tone.js synthesis node for the given ambient layer.
 * The node is NOT started automatically -- call start() after creation.
 */
export function createToneLayerNode(layer: LayerName): AmbientNode {
  switch (layer) {
    case "wind":
      return makeNoiseFilterNode("brown", "lowpass", 380);
    case "birds":
      return makeFMSynthNode();
    case "insects":
      return makeNoiseFilterNode("white", "bandpass", 5200);
    case "crickets":
      // Tone.js Oscillator does not support "pulse" type; "square" is acoustically equivalent
      return makeOscillatorNode("square", 2400);
    case "water":
      return makeNoiseFilterNode("brown", "lowpass", 240);
    case "vegetation":
      return makeNoiseFilterNode("pink", "bandpass", 620);
  }
}

type NoiseType = "white" | "pink" | "brown";
type FilterType = "lowpass" | "bandpass";

function makeNoiseFilterNode(
  noiseType: NoiseType,
  filterType: FilterType,
  filterFreq: number,
): AmbientNode {
  const vol = new Volume(-Infinity).toDestination();
  const filter = new Filter(filterFreq, filterType);
  filter.connect(vol);
  const noise = new Noise(noiseType);
  noise.connect(filter);

  return {
    start() {
      noise.start();
    },
    stop() {
      noise.stop();
    },
    setVolume(db: number) {
      vol.volume.rampTo(db < SILENCE_THRESHOLD_DB ? -Infinity : db, 0.1);
    },
    dispose() {
      noise.dispose();
      filter.dispose();
      vol.dispose();
    },
  };
}

function makeFMSynthNode(): AmbientNode {
  const vol = new Volume(-Infinity).toDestination();
  const synth = new FMSynth({
    harmonicity: 8,
    modulationIndex: 2,
    envelope: { attack: 0.1, decay: 0.3, sustain: 0.1, release: 1.2 },
    modulation: { type: "sine" },
    modulationEnvelope: { attack: 0.2, decay: 0.3, sustain: 0, release: 0.5 },
  });
  synth.connect(vol);

  return {
    start() {
      synth.triggerAttack("C5");
    },
    stop() {
      synth.triggerRelease();
    },
    setVolume(db: number) {
      vol.volume.rampTo(db < SILENCE_THRESHOLD_DB ? -Infinity : db, 0.1);
    },
    dispose() {
      synth.dispose();
      vol.dispose();
    },
  };
}

function makeOscillatorNode(type: ToneOscillatorType, freq: number): AmbientNode {
  const vol = new Volume(-Infinity).toDestination();
  const osc = new Oscillator(freq, type);
  osc.connect(vol);

  return {
    start() {
      osc.start();
    },
    stop() {
      osc.stop();
    },
    setVolume(db: number) {
      vol.volume.rampTo(db < SILENCE_THRESHOLD_DB ? -Infinity : db, 0.1);
    },
    dispose() {
      osc.dispose();
      vol.dispose();
    },
  };
}
