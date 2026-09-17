import assert from "node:assert/strict";
import test from "node:test";

import {
  BAR_TIMESTAMP_CONVENTION,
  computeWindowFeatures,
  FEATURE_SCHEMA_VERSION,
} from "./features.mjs";

const T0 = Date.UTC(2026, 8, 14, 13, 0);
const MINUTE = 60_000;

function bar(minute, open, high, low, close, volume = 100, session = "premarket") {
  return { timestamp: T0 + minute * MINUTE, open, high, low, close, volume, session };
}

function windowAt(windows, endMinute, horizon) {
  const found = windows.find((window) =>
    window.windowEndTimestamp === T0 + (endMinute + 1) * MINUTE && window.horizon === horizon
  );
  assert.ok(found, `missing ${horizon}-minute window ending at ${endMinute}`);
  return found;
}

function near(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);
}

test("hand-calculated rising three-minute window preserves raw values and provenance", () => {
  const bars = [
    bar(0, 10, 10, 10, 10, 0),
    bar(1, 10, 11, 10, 11, 100),
    bar(2, 11, 12, 11, 12, 200),
    bar(3, 12, 13, 12, 13, 300),
  ];
  const result = computeWindowFeatures(bars);
  const three = windowAt(result, 3, 3);
  assert.equal(FEATURE_SCHEMA_VERSION, "market-context-window-features-v1");
  assert.equal(BAR_TIMESTAMP_CONVENTION, "start");
  assert.equal(three.windowStartTimestamp, T0 + MINUTE);
  assert.equal(three.windowEndTimestamp, T0 + 4 * MINUTE);
  assert.equal(three.session, "premarket");
  assert.equal(three.rangeDollars, 3);
  assert.equal(three.rangePct, 30);
  assert.equal(three.signedProgressDollars, 3);
  assert.equal(three.signedProgressPct, 30);
  assert.equal(three.averageBodyShare, 1);
  assert.equal(three.bodyObservationCount, 3);
  assert.equal(three.closePathEfficiency, 1);
  assert.equal(three.adjacentOverlap, 0);
  assert.equal(three.overlapObservationCount, 2);
  assert.equal(three.reversalCount, 0);
  assert.equal(three.changeObservationCount, 2);
  assert.equal(three.shareVolume, 600);
  assert.equal(three.dollarVolumeProxy, 7_100);
  assert.equal(windowAt(result, 3, 1).closePathEfficiency, null);
});

test("five-minute chop reports overlap, reversals, and weak close-path efficiency", () => {
  const bars = [
    bar(0, 10, 10, 10, 10),
    bar(1, 10, 11, 10, 11),
    bar(2, 11, 11, 10, 10),
    bar(3, 10, 11, 10, 11),
    bar(4, 11, 11, 10, 10),
    bar(5, 10, 11, 10, 11),
  ];
  const five = windowAt(computeWindowFeatures(bars), 5, 5);
  assert.equal(five.rangeDollars, 1);
  assert.equal(five.rangePct, 10);
  assert.equal(five.signedProgressDollars, 1);
  near(five.closePathEfficiency, 0.2);
  assert.equal(five.adjacentOverlap, 1);
  assert.equal(five.overlapObservationCount, 4);
  assert.equal(five.reversalCount, 3);
  assert.equal(five.changeObservationCount, 4);
});

test("efficient descending movement retains its negative long-side progress", () => {
  const bars = [
    bar(0, 13, 13, 13, 13),
    bar(1, 13, 13, 12, 12),
    bar(2, 12, 12, 11, 11),
    bar(3, 11, 11, 10, 10),
  ];
  const three = windowAt(computeWindowFeatures(bars), 3, 3);
  assert.equal(three.rangeDollars, 3);
  assert.equal(three.signedProgressDollars, -3);
  near(three.signedProgressPct, -300 / 13);
  assert.equal(three.closePathEfficiency, 1);
  assert.equal(three.reversalCount, 0);
});

test("zero ranges and zero close path are unavailable rather than ideal", () => {
  const bars = Array.from({ length: 6 }, (_, minute) => bar(minute, 10, 10, 10, 10, 0));
  const five = windowAt(computeWindowFeatures(bars), 5, 5);
  assert.equal(five.rangeDollars, 0);
  assert.equal(five.averageBodyShare, null);
  assert.equal(five.bodyObservationCount, 0);
  assert.equal(five.closePathEfficiency, null);
  assert.equal(five.adjacentOverlap, null);
  assert.equal(five.overlapObservationCount, 0);
  assert.equal(five.reversalCount, 0);
  assert.equal(five.changeObservationCount, 0);
  assert.equal(five.shareVolume, 0);
  assert.equal(five.dollarVolumeProxy, 0);
});

test("zero-range bars are omitted only from undefined ratios", () => {
  const bars = [
    bar(0, 10, 10, 10, 10),
    bar(1, 10, 10, 10, 10),
    bar(2, 10, 11, 10, 11),
    bar(3, 11, 11, 11, 11),
  ];
  const three = windowAt(computeWindowFeatures(bars), 3, 3);
  assert.equal(three.averageBodyShare, 1);
  assert.equal(three.bodyObservationCount, 1);
  assert.equal(three.adjacentOverlap, null);
  assert.equal(three.overlapObservationCount, 0);
  assert.equal(three.closePathEfficiency, 1);
});

test("first eligible window keeps other metrics without a preceding close", () => {
  const bars = [
    bar(0, 10, 11, 10, 11),
    bar(1, 11, 12, 11, 12),
    bar(2, 12, 13, 12, 13),
  ];
  const three = windowAt(computeWindowFeatures(bars), 2, 3);
  assert.equal(three.closePathEfficiency, null);
  assert.equal(three.rangeDollars, 3);
  assert.equal(three.signedProgressDollars, 3);
  assert.equal(three.shareVolume, 300);
});

test("prior-close-inclusive efficiency can be high on a flat window after a gap up", () => {
  const bars = [
    bar(0, 10, 10, 10, 10),
    bar(1, 11, 11, 11, 11),
    bar(2, 11, 11, 11, 11),
    bar(3, 11, 11, 11, 11),
  ];
  const three = windowAt(computeWindowFeatures(bars), 3, 3);
  assert.equal(three.closePathEfficiency, 1);
  assert.equal(three.signedProgressDollars, 0);
  assert.equal(three.rangeDollars, 0);
});

test("wick range and volume do not imply directional progress", () => {
  const one = windowAt(computeWindowFeatures([bar(0, 10, 15, 9, 10, 200)]), 0, 1);
  assert.equal(one.rangeDollars, 6);
  assert.equal(one.signedProgressDollars, 0);
  assert.equal(one.averageBodyShare, 0);
  assert.equal(one.dollarVolumeProxy, 2_200);
});

test("missing minutes, interrupted bars, invalid bars, and session changes break runs", () => {
  const bars = [
    bar(0, 10, 11, 10, 11),
    bar(1, 11, 12, 11, 12),
    bar(3, 12, 13, 12, 13), // Missing minute 2.
    bar(4, 13, 14, 13, 14),
    { ...bar(5, 14, 15, 14, 15), interrupted: true },
    bar(6, 15, 16, 15, 16),
    { ...bar(7, 16, 17, 16, 17), volume: -1 },
    bar(8, 17, 18, 17, 18),
    bar(9, 18, 19, 18, 19, 100, "regular"),
    bar(10, 19, 20, 19, 20, 100, "regular"),
    bar(11, 20, 21, 20, 21, 100, "regular"),
  ];
  const windows = computeWindowFeatures(bars);
  assert.equal(windows.some((window) => window.horizon === 3 && window.windowEndTimestamp < T0 + 12 * MINUTE), false);
  const regular = windowAt(windows, 11, 3);
  assert.equal(regular.session, "regular");
  assert.equal(regular.windowStartTimestamp, T0 + 9 * MINUTE);
  assert.equal(regular.closePathEfficiency, null);
  assert.equal(windows.some((window) => window.windowStartTimestamp === T0 + 5 * MINUTE), false);
  assert.equal(windows.some((window) => window.windowStartTimestamp === T0 + 7 * MINUTE), false);
});

test("malformed OHLC and empty session are barriers, including between unknown sessions", () => {
  const bars = [
    bar(0, 10, 11, 10, 11),
    { ...bar(1, 11, 12, 11, 12), high: 10 },
    bar(2, 12, 13, 12, 13),
    { ...bar(3, 13, 14, 13, 14), session: "" },
    bar(4, 14, 15, 14, 15),
    bar(5, 15, 16, 15, 16),
    bar(6, 16, 17, 16, 17),
  ];
  const windows = computeWindowFeatures(bars);
  assert.equal(windows.some((window) => window.windowStartTimestamp < T0 + 4 * MINUTE && window.horizon === 3), false);
  assert.equal(windowAt(windows, 6, 3).windowStartTimestamp, T0 + 4 * MINUTE);
});

test("nonfinite and nonpositive prices cannot contribute to a window", () => {
  const bars = [
    bar(0, 10, 11, 10, 11),
    { ...bar(1, 11, 12, 11, 12), close: Infinity },
    bar(2, 12, 13, 12, 13),
    { ...bar(3, 13, 14, 13, 14), low: 0 },
    bar(4, 14, 15, 14, 15),
    bar(5, 15, 16, 15, 16),
    bar(6, 16, 17, 16, 17),
  ];
  const windows = computeWindowFeatures(bars, { horizons: [3] });
  assert.equal(windows.length, 1);
  assert.equal(windows[0].windowStartTimestamp, T0 + 4 * MINUTE);
});

test("flat close changes do not create reversal observations", () => {
  const bars = [
    bar(0, 10, 10, 10, 10),
    bar(1, 10, 11, 10, 11),
    bar(2, 11, 11, 11, 11),
    bar(3, 11, 11, 10, 10),
    bar(4, 10, 10, 10, 10),
    bar(5, 10, 11, 10, 11),
  ];
  const five = windowAt(computeWindowFeatures(bars), 5, 5);
  assert.equal(five.changeObservationCount, 2);
  assert.equal(five.reversalCount, 1);
});

test("timestamp and horizon contracts fail loudly", () => {
  const a = bar(0, 10, 11, 10, 11);
  assert.throws(() => computeWindowFeatures([a, a]), /strictly later/);
  assert.throws(() => computeWindowFeatures([bar(1, 10, 11, 10, 11), a]), /strictly later/);
  assert.throws(() => computeWindowFeatures([{ ...a, timestamp: T0 + 0.5 }]), /integer epoch-ms/);
  assert.throws(() => computeWindowFeatures([{ ...a, timestamp: NaN }]), /integer epoch-ms/);
  assert.throws(() => computeWindowFeatures([a], { horizons: [1, 2] }), /subset/);
  assert.throws(() => computeWindowFeatures([a], { horizons: [1, 1] }), /subset/);
});

test("appending later bars cannot revise any completed window", () => {
  const prefix = [
    bar(0, 10, 10, 10, 10),
    bar(1, 10, 11, 10, 11),
    bar(2, 11, 12, 11, 12),
    bar(3, 12, 13, 12, 13),
    bar(4, 13, 14, 13, 14),
    bar(5, 14, 15, 14, 15),
  ];
  const before = computeWindowFeatures(prefix);
  const after = computeWindowFeatures([...prefix, bar(6, 15, 16, 15, 16)]);
  assert.deepEqual(after.filter((window) => window.windowEndTimestamp <= prefix.at(-1).timestamp + MINUTE), before);
});
