import assert from 'node:assert/strict';
import test from 'node:test';

import { analyzeSnapshot } from './run-pilot.mjs';

const MINUTE = 60_000;
const START = Date.UTC(2026, 8, 14, 13, 0);
const DATE = '2026-09-14';

function bar(minute, price = 10) {
  return {
    timestamp: START + minute * MINUTE,
    open: price, high: price + 1, low: price, close: price + 1,
    volume: 100,
  };
}

function candidate(overrides = {}) {
  return {
    instrument_type: 'common_stock', previous_regular_close: 5,
    previous_close_date: '2026-09-11', split_event: false,
    max_gain_pct: 100, evaluation_state: 'validated',
    // This legacy flag is deliberately at odds with the injected policy in tests.
    qualifies_mover: false,
    ...overrides,
  };
}

function day(symbols, overrides = {}) {
  return {
    date: DATE, stratum: 'selected-recovery', sourceFingerprint: 'synthetic-only',
    coverage: { state: 'incomplete' }, sourceRead: { state: 'synthetic' },
    symbols,
    ...overrides,
  };
}

function snapshot(days) {
  return { schemaVersion: 'market-context-pilot-input:v1', provenance: 'synthetic-only', days };
}

function dependencies(qualifyCoreMover = ({ maxGainPercent }) => ({
  qualifies: maxGainPercent >= 50, ruleVersion: 'test-core-v1', excludedBy: null,
})) {
  return {
    qualifyCoreMover,
    calendar: {
      marketSessionDefinition(date) { return { date, marketDay: true }; },
      marketSessionForTimestamp(timestamp) {
        const minute = (timestamp - START) / MINUTE;
        if (minute >= 0 && minute < 3) return { date: DATE, id: 'premarket' };
        if (minute >= 3 && minute < 6) return { date: DATE, id: 'regular' };
        if (minute >= 6 && minute < 9) return { date: DATE, id: 'afterHours' };
        return null;
      },
    },
  };
}

test('retrospective final-day candidate keeps bars from every session', () => {
  // The daily high is in premarket; regular and after-hours must still be studied.
  const bars = [
    bar(0, 10), bar(1, 12), bar(2, 15),
    bar(3, 11), bar(4, 11), bar(5, 11),
    bar(6, 12), bar(7, 12), bar(8, 12),
  ];
  const result = analyzeSnapshot(snapshot([day([
    { symbol: 'SYN', candidate: candidate({ session_of_high: 'premarket' }), bars },
  ])]), dependencies());

  assert.equal(result.days[0].eligibleCount, 1);
  assert.equal(result.days[0].sessions.premarket.bars, 3);
  assert.equal(result.days[0].sessions.regular.bars, 3);
  assert.equal(result.days[0].sessions.afterHours.bars, 3);
  assert.deepEqual(new Set(result.windows.map(row => row.session)),
    new Set(['premarket', 'regular', 'afterHours']));
  assert.equal(result.windows.some(row => row.session === 'regular' && row.horizon === 3), true);
  assert.equal(result.windows.some(row => row.session === 'afterHours' && row.horizon === 3), true);
  assert.equal(result.windows.some(row => row.windowStartTimestamp < START + 3 * MINUTE &&
    row.windowEndTimestamp > START + 3 * MINUTE), false);
  assert.equal(result.windows.every(row => row.mode === 'retrospective-final-day-candidates'), true);
  assert.equal(result.days[0].classification, null);
});

test('current injected policy and recovery validation override a stale legacy flag', () => {
  const policyInputs = [];
  const policy = input => {
    policyInputs.push(input);
    return {
      qualifies: input.maxGainPercent >= 50 && input.instrumentType === 'common_stock',
      ruleVersion: 'test-core-v2', excludedBy: null,
    };
  };
  const result = analyzeSnapshot(snapshot([day([
    { symbol: 'VALID', candidate: candidate({ qualifies_mover: false }), bars: [bar(0)] },
    { symbol: 'STALE', candidate: candidate({ max_gain_pct: 49, qualifies_mover: true }), bars: [bar(1)] },
    { symbol: 'UNVERIFIED', candidate: candidate({ evaluation_state: 'pending', qualifies_mover: true }), bars: [bar(2)] },
  ])]), dependencies(policy));

  assert.equal(policyInputs.length, 3);
  assert.equal(policyInputs[0].previousRegularClose, 5);
  assert.equal(policyInputs[0].sessionDateEt, DATE);
  assert.equal(policyInputs[0].maxGainPercent, 100);
  assert.deepEqual(result.candidates.map(row => [row.symbol, row.eligible]), [
    ['VALID', true], ['STALE', false], ['UNVERIFIED', false],
  ]);
  assert.deepEqual(new Set(result.windows.map(row => row.symbol)), new Set(['VALID']));
  assert.equal(result.windows[0].policyVersion, 'test-core-v2');
  assert.equal(result.days[0].gainBands.hundredToUnderTwoHundred, 1);
});

test('duplicate, descending, and nonaligned minute-start timestamps fail loudly', () => {
  const cases = [
    [bar(0), bar(0)],
    [bar(1), bar(0)],
    [bar(0), { ...bar(1), timestamp: START + MINUTE + 1 }],
    [{ ...bar(0), timestamp: START + 0.5 }],
  ];
  for (const bars of cases) {
    assert.throws(() => analyzeSnapshot(snapshot([day([
      { symbol: 'SYN', candidate: candidate(), bars },
    ])]), dependencies()), /unique, ascending minute-start timestamps/);
  }
});

test('zero candidates remain unclassified regardless of claimed discovery coverage', () => {
  const result = analyzeSnapshot(snapshot([
    day([], { date: DATE, coverage: { state: 'complete' } }),
    day([], { date: '2026-09-15', coverage: { state: 'incomplete' } }),
  ]), dependencies());
  assert.deepEqual(result.days.map(row => row.eligibleCount), [0, 0]);
  assert.deepEqual(result.days.map(row => row.classification), [null, null]);
  assert.equal(result.windows.length, 0);
  assert.equal(result.candidates.length, 0);
});
