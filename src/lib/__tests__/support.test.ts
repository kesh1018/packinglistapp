import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { adapterAdvice } from '../plugs';
import { countdown, eachDay, formatRange, tripDays } from '../dates';
import { describeChange, shouldAutoRefresh } from '../autoRefresh';
import { plannedReminders } from '../reminders';
import { tripToText } from '../share';
import type { Trip, WeatherSummary } from '../types';

const NOW = new Date('2026-11-04T12:00:00');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

const weather = (over: Partial<WeatherSummary> = {}): WeatherSummary => ({
  days: eachDay('2026-11-10', '2026-11-14').map((date) => ({
    date,
    tMax: 18,
    tMin: 10,
    precipSum: 0,
    snowSum: 0,
    windMax: 10,
    code: 1,
    historical: false,
  })),
  source: 'forecast',
  avgHigh: 18,
  avgLow: 10,
  maxHigh: 20,
  minLow: 10,
  rainyDays: 0,
  snowyDays: 0,
  heavyRain: false,
  maxWind: 10,
  maxUv: 3,
  avgHumidity: 60,
  fetchedAt: NOW.toISOString(),
  ...over,
});

const trip = (over: Partial<Trip> = {}): Trip => ({
  id: 'trip-1',
  destination: { name: 'Lisbon', country: 'Portugal', countryCode: 'PT', latitude: 0, longitude: 0 },
  start: '2026-11-10',
  end: '2026-11-14',
  type: 'leisure',
  transport: 'plane',
  activities: [],
  laundry: false,
  level: 'full',
  weather: weather(),
  items: [
    { id: '1', key: 'id', name: 'Passport', category: 'Documents', qty: 1, packed: false, essential: true },
    { id: '2', key: 'socks', name: 'Socks', category: 'Clothing', qty: 6, packed: true, note: 'Wool pair' },
    { id: '3', name: 'Sunscreen', category: 'Toiletries', qty: 1, packed: false, custom: true, toBuy: true },
  ],
  dismissedKeys: [],
  repack: false,
  reminders: true,
  createdAt: '',
  ...over,
});

describe('dates', () => {
  it('counts trip days inclusively and formats ranges', () => {
    expect(tripDays('2026-11-10', '2026-11-14')).toBe(5);
    expect(formatRange('2026-11-10', '2026-11-14')).toBe('10–14 Nov 2026');
    expect(formatRange('2026-11-28', '2026-12-02')).toBe('28 Nov – 2 Dec 2026');
    expect(countdown('2026-11-05', '2026-11-08')).toBe('Tomorrow');
    expect(countdown('2026-11-01', '2026-11-03')).toBe('Completed');
  });
});

describe('adapterAdvice', () => {
  it('skips the adapter when plugs match and names it when they do not', () => {
    expect(adapterAdvice('NL', 'DE')).toBeNull();
    expect(adapterAdvice('GB', 'IE')).toBeNull();
    expect(adapterAdvice('NL', 'GB')?.name).toBe('Type G plug adapter');
    expect(adapterAdvice('NL', 'US')?.reason).toContain('dual-voltage');
    expect(adapterAdvice('NL', 'XX')?.name).toBe('Travel plug adapter');
  });
});

describe('shouldAutoRefresh', () => {
  it('refreshes estimates that entered the forecast window and stale forecasts', () => {
    expect(shouldAutoRefresh(trip(), NOW)).toBe(false);
    const estimate = weather();
    estimate.days = estimate.days.map((d) => ({ ...d, historical: true }));
    expect(shouldAutoRefresh(trip({ weather: estimate }), NOW)).toBe(true);
    expect(shouldAutoRefresh(trip({ weather: weather({ fetchedAt: '2026-11-03T00:00:00Z' }) }), NOW)).toBe(true);
  });

  it('ignores finished trips and far-off trips, but backfills missing humidity', () => {
    expect(shouldAutoRefresh(trip({ start: '2026-10-01', end: '2026-10-05' }), NOW)).toBe(false);
    expect(shouldAutoRefresh(trip({ start: '2027-02-01', end: '2027-02-05' }), NOW)).toBe(false);
    expect(shouldAutoRefresh(trip({ start: '2027-02-01', end: '2027-02-05', weather: weather({ avgHumidity: undefined }) }), NOW)).toBe(true);
  });

  it('describes meaningful changes only', () => {
    expect(describeChange(weather(), weather(), [])).toBeNull();
    expect(describeChange(weather(), weather({ minLow: 4, rainyDays: 3 }), [])).toBe(
      'Lows now 4°C (was 10°C) · rain on 3 days (was 0)'
    );
  });
});

describe('plannedReminders', () => {
  it('schedules 3-days-out, evening-before (naming essentials) and repack reminders', () => {
    const r = plannedReminders(trip(), NOW);
    expect(r.map((n) => n.title)).toEqual(['Lisbon in 3 days', 'Tomorrow: Lisbon', 'Heading home from Lisbon?']);
    expect(r[0].body).toBe('2 of 3 items left to pack · 1 to buy.');
    expect(r[1].body).toBe('Don’t forget: Passport');
    expect(plannedReminders(trip({ reminders: false }), NOW)).toEqual([]);
    expect(r.every((n) => n.isExactNotification === false)).toBe(true);
  });
});

describe('tripToText', () => {
  it('includes weather, notes, essentials and the shopping list', () => {
    const text = tripToText(trip());
    expect(text).toContain('🌤 10–20°C, 60% humidity');
    expect(text).toContain('☐ Passport ★');
    expect(text).toContain('☑ Socks ×6 — Wool pair');
    expect(text).toContain('🛒 To buy: Sunscreen');
  });
});
