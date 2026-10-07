'use strict';

const {
  dayKey, startOfDay, startOfWeek, daysBetween, nextWeeklyReset,
} = require('../../utils/tashkentDate');

describe('tashkentDate (Asia/Tashkent = UTC+5)', () => {
  test('dayKey uses the Tashkent calendar date, not UTC', () => {
    // 2026-10-07 02:00 Tashkent = 2026-10-06 21:00 UTC
    expect(dayKey(new Date('2026-10-06T21:00:00Z'))).toBe('2026-10-07');
    expect(dayKey(new Date('2026-10-06T18:59:59Z'))).toBe('2026-10-06');
    expect(dayKey(new Date('2026-10-06T19:00:00Z'))).toBe('2026-10-07');
  });

  test('startOfDay is 00:00 Tashkent (19:00 UTC previous day)', () => {
    expect(startOfDay(new Date('2026-10-07T10:00:00Z')).toISOString()).toBe('2026-10-06T19:00:00.000Z');
    expect(startOfDay(new Date('2026-10-06T19:00:00Z')).toISOString()).toBe('2026-10-06T19:00:00.000Z');
    expect(startOfDay(new Date('2026-10-06T18:59:59Z')).toISOString()).toBe('2026-10-05T19:00:00.000Z');
  });

  test('startOfWeek is Monday 00:00 Tashkent', () => {
    // Sunday 2026-10-11 15:00 Tashkent -> Monday 2026-10-05 00:00 Tashkent
    expect(startOfWeek(new Date('2026-10-11T10:00:00Z')).toISOString()).toBe('2026-10-04T19:00:00.000Z');
    // Monday 2026-10-12 00:30 Tashkent -> same Monday
    expect(startOfWeek(new Date('2026-10-11T19:30:00Z')).toISOString()).toBe('2026-10-11T19:00:00.000Z');
  });

  test('daysBetween counts Tashkent calendar days', () => {
    // 23:30 Tashkent and 04:30 Tashkent next day are different days (D22)
    expect(daysBetween(new Date('2026-10-06T18:30:00Z'), new Date('2026-10-06T23:30:00Z'))).toBe(1);
    expect(daysBetween(new Date('2026-10-06T19:00:00Z'), new Date('2026-10-07T18:59:00Z'))).toBe(0);
    expect(daysBetween(new Date('2026-10-05T10:00:00Z'), new Date('2026-10-07T10:00:00Z'))).toBe(2);
  });

  test('nextWeeklyReset matches scheduler (Sunday 19:00 UTC) — D23', () => {
    expect(nextWeeklyReset(new Date('2026-10-11T10:00:00Z')).toISOString()).toBe('2026-10-11T19:00:00.000Z');
    expect(nextWeeklyReset(new Date('2026-10-11T19:00:00Z')).toISOString()).toBe('2026-10-18T19:00:00.000Z');
    expect(nextWeeklyReset(new Date('2026-10-07T10:00:00Z')).toISOString()).toBe('2026-10-11T19:00:00.000Z');
  });
});
