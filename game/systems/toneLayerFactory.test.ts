/**
 * toneLayerFactory tests (Spec §27.2)
 *
 * Verifies that createToneLayerNode returns the correct AmbientNode
 * structure for each of the 6 ambient layers, and that setVolume applies
 * the silence threshold correctly.
 *
 * Tone.js is mocked -- all synthesis classes require AudioContext (not available
 * in Node.js). The mock verifies structural wiring without running audio hardware.
 */

import { Filter, FMSynth, Noise, Oscillator, Volume } from "tone";
import type { LayerName } from "./ambientAudio.ts";
import { createToneLayerNode } from "./toneLayerFactory.ts";

const mockRampTo = jest.fn();

const makeVolumeMock = () => {
  const vol = {
    volume: { rampTo: mockRampTo },
    connect: jest.fn(),
    dispose: jest.fn(),
    toDestination: jest.fn(),
  };
  vol.toDestination.mockReturnValue(vol);
  return vol;
};

const makeNoiseMock = () => ({
  connect: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
  dispose: jest.fn(),
});

const makeFilterMock = () => ({
  connect: jest.fn(),
  dispose: jest.fn(),
});

const makeFMSynthMock = () => ({
  connect: jest.fn(),
  triggerAttack: jest.fn(),
  triggerRelease: jest.fn(),
  dispose: jest.fn(),
});

const makeOscillatorMock = () => ({
  connect: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
  dispose: jest.fn(),
});

jest.mock("tone", () => ({
  Volume: jest.fn(),
  Noise: jest.fn(),
  Filter: jest.fn(),
  FMSynth: jest.fn(),
  Oscillator: jest.fn(),
}));

const MockVolume = Volume as unknown as jest.Mock;
const MockNoise = Noise as unknown as jest.Mock;
const MockFilter = Filter as unknown as jest.Mock;
const MockFMSynth = FMSynth as unknown as jest.Mock;
const MockOscillator = Oscillator as unknown as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  MockVolume.mockImplementation(makeVolumeMock);
  MockNoise.mockImplementation(makeNoiseMock);
  MockFilter.mockImplementation(makeFilterMock);
  MockFMSynth.mockImplementation(makeFMSynthMock);
  MockOscillator.mockImplementation(makeOscillatorMock);
});

describe("createToneLayerNode -- interface shape", () => {
  const layers: LayerName[] = ["wind", "birds", "insects", "crickets", "water", "vegetation"];

  it.each(layers)("returns an AmbientNode with required methods for layer: %s", (layer) => {
    const node = createToneLayerNode(layer);
    expect(typeof node.setVolume).toBe("function");
    expect(typeof node.start).toBe("function");
    expect(typeof node.stop).toBe("function");
    expect(typeof node.dispose).toBe("function");
  });
});

describe("createToneLayerNode -- layer-specific synthesis", () => {
  it("wind: constructs brown Noise + lowpass Filter + Volume", () => {
    createToneLayerNode("wind");
    expect(MockNoise).toHaveBeenCalledWith("brown");
    expect(MockFilter).toHaveBeenCalledWith(380, "lowpass");
    expect(MockVolume).toHaveBeenCalled();
  });

  it("birds: constructs FMSynth + Volume (no Noise or Filter)", () => {
    createToneLayerNode("birds");
    expect(MockFMSynth).toHaveBeenCalled();
    expect(MockNoise).not.toHaveBeenCalled();
    expect(MockFilter).not.toHaveBeenCalled();
    expect(MockVolume).toHaveBeenCalled();
  });

  it("insects: constructs white Noise + bandpass Filter + Volume", () => {
    createToneLayerNode("insects");
    expect(MockNoise).toHaveBeenCalledWith("white");
    expect(MockFilter).toHaveBeenCalledWith(5200, "bandpass");
    expect(MockVolume).toHaveBeenCalled();
  });

  it("crickets: constructs pulse Oscillator + Volume (no Noise or Filter)", () => {
    createToneLayerNode("crickets");
    // Oscillator is called with (frequency, type) positional args since Tone.js
    // Oscillator does not support "pulse" -- "square" is used instead.
    expect(MockOscillator).toHaveBeenCalledWith(2400, "square");
    expect(MockNoise).not.toHaveBeenCalled();
    expect(MockFilter).not.toHaveBeenCalled();
    expect(MockVolume).toHaveBeenCalled();
  });

  it("water: constructs brown Noise + lowpass Filter + Volume", () => {
    createToneLayerNode("water");
    expect(MockNoise).toHaveBeenCalledWith("brown");
    expect(MockFilter).toHaveBeenCalledWith(240, "lowpass");
    expect(MockVolume).toHaveBeenCalled();
  });

  it("vegetation: constructs pink Noise + bandpass Filter + Volume", () => {
    createToneLayerNode("vegetation");
    expect(MockNoise).toHaveBeenCalledWith("pink");
    expect(MockFilter).toHaveBeenCalledWith(620, "bandpass");
    expect(MockVolume).toHaveBeenCalled();
  });
});

describe("createToneLayerNode -- setVolume silence threshold", () => {
  it("ramps to -Infinity when db < -50 (noise layer)", () => {
    const node = createToneLayerNode("wind");
    node.setVolume(-51);
    expect(mockRampTo).toHaveBeenCalledWith(-Infinity, 0.1);
  });

  it("ramps to -Infinity when db is very negative", () => {
    const node = createToneLayerNode("water");
    node.setVolume(-100);
    expect(mockRampTo).toHaveBeenCalledWith(-Infinity, 0.1);
  });

  it("ramps to db value when db >= -50 (not silent)", () => {
    const node = createToneLayerNode("vegetation");
    node.setVolume(-20);
    expect(mockRampTo).toHaveBeenCalledWith(-20, 0.1);
  });

  it("ramps to db at exactly -50 (boundary -- not below threshold)", () => {
    const node = createToneLayerNode("crickets");
    node.setVolume(-50);
    expect(mockRampTo).toHaveBeenCalledWith(-50, 0.1);
  });

  it("ramps to -Infinity for birds layer when below threshold", () => {
    const node = createToneLayerNode("birds");
    node.setVolume(-60);
    expect(mockRampTo).toHaveBeenCalledWith(-Infinity, 0.1);
  });

  it("ramps to db for birds layer when audible", () => {
    const node = createToneLayerNode("birds");
    node.setVolume(-12);
    expect(mockRampTo).toHaveBeenCalledWith(-12, 0.1);
  });
});

describe("createToneLayerNode -- lifecycle methods", () => {
  it("wind.start() calls noise.start()", () => {
    const node = createToneLayerNode("wind");
    node.start();
    const noiseInstance = MockNoise.mock.results[0].value as ReturnType<typeof makeNoiseMock>;
    expect(noiseInstance.start).toHaveBeenCalled();
  });

  it("wind.stop() calls noise.stop()", () => {
    const node = createToneLayerNode("wind");
    node.stop();
    const noiseInstance = MockNoise.mock.results[0].value as ReturnType<typeof makeNoiseMock>;
    expect(noiseInstance.stop).toHaveBeenCalled();
  });

  it("wind.dispose() calls noise.dispose, filter.dispose, volume.dispose", () => {
    const node = createToneLayerNode("wind");
    node.dispose();
    const noiseInstance = MockNoise.mock.results[0].value as ReturnType<typeof makeNoiseMock>;
    const filterInstance = MockFilter.mock.results[0].value as ReturnType<typeof makeFilterMock>;
    const volInstance = MockVolume.mock.results[0].value as ReturnType<typeof makeVolumeMock>;
    expect(noiseInstance.dispose).toHaveBeenCalled();
    expect(filterInstance.dispose).toHaveBeenCalled();
    expect(volInstance.dispose).toHaveBeenCalled();
  });

  it("birds.start() calls synth.triggerAttack", () => {
    const node = createToneLayerNode("birds");
    node.start();
    const synthInstance = MockFMSynth.mock.results[0].value as ReturnType<typeof makeFMSynthMock>;
    expect(synthInstance.triggerAttack).toHaveBeenCalledWith("C5");
  });

  it("birds.stop() calls synth.triggerRelease", () => {
    const node = createToneLayerNode("birds");
    node.stop();
    const synthInstance = MockFMSynth.mock.results[0].value as ReturnType<typeof makeFMSynthMock>;
    expect(synthInstance.triggerRelease).toHaveBeenCalled();
  });

  it("crickets.start() calls oscillator.start()", () => {
    const node = createToneLayerNode("crickets");
    node.start();
    const oscInstance = MockOscillator.mock.results[0].value as ReturnType<
      typeof makeOscillatorMock
    >;
    expect(oscInstance.start).toHaveBeenCalled();
  });
});
