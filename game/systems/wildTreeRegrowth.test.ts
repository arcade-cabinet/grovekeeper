import {
  cancelRegrowth,
  checkRegrowth,
  initializeRegrowthState,
  scheduleRegrowth,
} from "./wildTreeRegrowth.ts";

describe("initializeRegrowthState", () => {
  it("creates state with empty timers array", () => {
    const state = initializeRegrowthState();
    expect(state).toEqual({ timers: [] });
  });
});

describe("scheduleRegrowth", () => {
  it("adds a timer with default delay (7 days)", () => {
    const state = initializeRegrowthState();
    const updated = scheduleRegrowth(state, 3, 5, "white-oak", 10);
    expect(updated.timers).toHaveLength(1);
    expect(updated.timers[0]).toEqual({
      gridX: 3,
      gridZ: 5,
      speciesId: "white-oak",
      expiresAtDay: 17, // 10 + 7
    });
  });

  it("adds a timer with custom delay", () => {
    const state = initializeRegrowthState();
    const updated = scheduleRegrowth(state, 1, 2, "elder-pine", 5, 3);
    expect(updated.timers[0].expiresAtDay).toBe(8); // 5 + 3
  });

  it("preserves existing timers (immutable)", () => {
    let state = initializeRegrowthState();
    state = scheduleRegrowth(state, 0, 0, "white-oak", 1);
    state = scheduleRegrowth(state, 1, 1, "elder-pine", 2);
    expect(state.timers).toHaveLength(2);
    expect(state.timers[0].speciesId).toBe("white-oak");
    expect(state.timers[1].speciesId).toBe("elder-pine");
  });

  it("does not mutate original state", () => {
    const original = initializeRegrowthState();
    const updated = scheduleRegrowth(original, 0, 0, "white-oak", 1);
    expect(original.timers).toHaveLength(0);
    expect(updated.timers).toHaveLength(1);
  });
});

describe("checkRegrowth", () => {
  it("returns no expired timers when all are in the future", () => {
    let state = initializeRegrowthState();
    state = scheduleRegrowth(state, 0, 0, "white-oak", 1, 5);
    const result = checkRegrowth(state, 3);
    expect(result.expired).toHaveLength(0);
    expect(result.state.timers).toHaveLength(1);
  });

  it("returns expired timer when current day meets expiry", () => {
    let state = initializeRegrowthState();
    state = scheduleRegrowth(state, 0, 0, "white-oak", 1, 5);
    // expiresAtDay = 6
    const result = checkRegrowth(state, 6);
    expect(result.expired).toHaveLength(1);
    expect(result.expired[0].speciesId).toBe("white-oak");
    expect(result.state.timers).toHaveLength(0);
  });

  it("returns expired timer when current day exceeds expiry", () => {
    let state = initializeRegrowthState();
    state = scheduleRegrowth(state, 0, 0, "white-oak", 1, 5);
    const result = checkRegrowth(state, 100);
    expect(result.expired).toHaveLength(1);
    expect(result.state.timers).toHaveLength(0);
  });

  it("separates expired and remaining timers", () => {
    let state = initializeRegrowthState();
    state = scheduleRegrowth(state, 0, 0, "white-oak", 1, 5); // expires day 6
    state = scheduleRegrowth(state, 1, 1, "elder-pine", 1, 10); // expires day 11
    const result = checkRegrowth(state, 8);
    expect(result.expired).toHaveLength(1);
    expect(result.expired[0].speciesId).toBe("white-oak");
    expect(result.state.timers).toHaveLength(1);
    expect(result.state.timers[0].speciesId).toBe("elder-pine");
  });

  it("returns same state reference when nothing expired", () => {
    let state = initializeRegrowthState();
    state = scheduleRegrowth(state, 0, 0, "white-oak", 100, 50);
    const result = checkRegrowth(state, 1);
    expect(result.state).toBe(state); // same reference
  });
});

describe("cancelRegrowth", () => {
  it("removes timer at specified position", () => {
    let state = initializeRegrowthState();
    state = scheduleRegrowth(state, 3, 5, "white-oak", 1);
    const updated = cancelRegrowth(state, 3, 5);
    expect(updated.timers).toHaveLength(0);
  });

  it("preserves other timers when cancelling one", () => {
    let state = initializeRegrowthState();
    state = scheduleRegrowth(state, 0, 0, "white-oak", 1);
    state = scheduleRegrowth(state, 5, 5, "elder-pine", 1);
    const updated = cancelRegrowth(state, 0, 0);
    expect(updated.timers).toHaveLength(1);
    expect(updated.timers[0].speciesId).toBe("elder-pine");
  });

  it("returns same state reference when no timer found at position", () => {
    let state = initializeRegrowthState();
    state = scheduleRegrowth(state, 0, 0, "white-oak", 1);
    const updated = cancelRegrowth(state, 99, 99);
    expect(updated).toBe(state); // same reference, nothing changed
  });

  it("does not mutate original state", () => {
    let state = initializeRegrowthState();
    state = scheduleRegrowth(state, 0, 0, "white-oak", 1);
    const original = state;
    cancelRegrowth(state, 0, 0);
    expect(original.timers).toHaveLength(1);
  });
});
