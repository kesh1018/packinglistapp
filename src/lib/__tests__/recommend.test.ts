import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildItems, mergeItems, recommend } from '../recommend';
import type { Trip, WeatherSummary } from '../types';

const weather = (over: Partial<WeatherSummary> = {}): WeatherSummary => ({
  days: Array.from({ length: 5 }, (_, i) => ({
    date: `2026-11-1${i}`,
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
  fetchedAt: '2026-11-04T00:00:00Z',
  ...over,
});

const base = {
  destination: { name: 'Lisbon', countryCode: 'PT', latitude: 0, longitude: 0 },
  start: '2026-11-10',
  end: '2026-11-14',
  type: 'leisure' as const,
  transport: 'plane' as const,
  activities: [],
  laundry: false,
  level: 'full' as const,
};

const keys = (t: Parameters<typeof recommend>[0]) => recommend(t).map((r) => r.key);

beforeEach(() => vi.stubGlobal('navigator', { language: 'en-NL' }));
afterEach(() => vi.unstubAllGlobals());

describe('recommend', () => {
  it('scales clothing with trip length and trims it for light packing', () => {
    const full = recommend({ ...base, end: '2026-11-23', weather: weather() });
    const light = recommend({ ...base, end: '2026-11-23', level: 'light', weather: weather() });
    const qty = (rs: typeof full, k: string) => rs.find((r) => r.key === k)!.qty;
    expect(qty(full, 'underwear')).toBe(15);
    expect(qty(light, 'underwear')).toBe(7);
    expect(light.length).toBeLessThan(full.length);
    expect(light.some((r) => r.key === 'neck-pillow')).toBe(false); // optional item dropped
  });

  it('adds rain and cold gear from the weather, with reasons', () => {
    const recs = recommend({ ...base, weather: weather({ rainyDays: 3, minLow: 1, heavyRain: true }) });
    const umbrella = recs.find((r) => r.key === 'umbrella')!;
    expect(umbrella.reason).toBe('Rain expected on 3 of 5 days');
    expect(recs.map((r) => r.key)).toEqual(expect.arrayContaining(['coat', 'gloves', 'waterproof-shoes']));
  });

  it('uses humidity: humid heat vs dry air', () => {
    expect(keys({ ...base, weather: weather({ avgHigh: 31, avgHumidity: 82 }) })).toEqual(
      expect.arrayContaining(['repellent', 'quick-dry-tops'])
    );
    const dry = recommend({ ...base, weather: weather({ avgHumidity: 30 }) });
    expect(dry.find((r) => r.key === 'lip-balm')?.reason).toBe('Dry air (30% humidity)');
    expect(keys({ ...base, weather: weather() })).not.toContain('quick-dry-tops');
  });

  it('marks essentials and items used up on the trip', () => {
    const recs = recommend({ ...base, weather: weather() });
    expect(recs.find((r) => r.key === 'id')).toMatchObject({ name: 'Passport', essential: true });
    expect(recs.find((r) => r.key === 'boarding')).toMatchObject({ essential: true, consumable: true });
  });

  it('names the plug adapter for the destination', () => {
    vi.stubGlobal('navigator', { language: 'en-GB' });
    expect(recommend({ ...base, weather: weather() }).find((r) => r.key === 'adapter')?.name).toBe('Type C/F plug adapter');
    vi.stubGlobal('navigator', { language: 'pt-PT' });
    expect(keys({ ...base, weather: weather() })).not.toContain('adapter');
  });

  it('adds activity gear without duplicates', () => {
    const recs = recommend({ ...base, activities: ['beach', 'swimming', 'snorkeling'], weather: weather() });
    expect(recs.filter((r) => r.key === 'swimsuit')).toHaveLength(1);
    expect(recs.find((r) => r.key === 'swimsuit')!.reason).toContain('Beach');
  });
});

describe('buildItems / mergeItems', () => {
  const trip = (): Trip => ({
    id: 't',
    ...base,
    weather: weather(),
    items: buildItems({ ...base, weather: weather() }, [{ name: 'Kindle', category: 'Electronics', qty: 1 }]),
    dismissedKeys: [],
    repack: false,
    reminders: true,
    createdAt: '',
  });

  it('includes always-pack items once', () => {
    const t = trip();
    expect(t.items.filter((i) => i.name === 'Kindle')).toHaveLength(1);
    expect(t.items.find((i) => i.name === 'Kindle')).toMatchObject({ custom: true, reason: 'On your always-pack list' });
  });

  it('keeps packed state, notes, edited quantities and custom items when re-run', () => {
    const t = trip();
    t.items = t.items.map((i) =>
      i.key === 'socks' ? { ...i, packed: true, note: 'Wool pair', qty: 2, qtyEdited: true } : i
    );
    const merged = mergeItems(t, recommend({ ...t, end: '2026-11-20', weather: weather() }));
    const socks = merged.find((i) => i.key === 'socks')!;
    expect(socks).toMatchObject({ packed: true, note: 'Wool pair', qty: 2 });
    expect(merged.find((i) => i.key === 'underwear')!.qty).toBe(12); // not edited → follows new length
    expect(merged.some((i) => i.name === 'Kindle')).toBe(true);
  });

  it('never re-adds an item the user removed', () => {
    const t = trip();
    t.items = t.items.filter((i) => i.key !== 'umbrella');
    t.dismissedKeys = ['umbrella'];
    const merged = mergeItems(t, recommend({ ...t, weather: weather({ rainyDays: 4 }) }));
    expect(merged.some((i) => i.key === 'umbrella')).toBe(false);
    expect(merged.some((i) => i.key === 'rain-jacket')).toBe(true);
  });

  it('drops unpacked suggestions that no longer apply but keeps packed ones', () => {
    const t = trip();
    t.weather = weather({ rainyDays: 3 });
    t.items = mergeItems(t, recommend(t)).map((i) => (i.key === 'umbrella' ? { ...i, packed: true } : i));
    const dried = mergeItems(t, recommend({ ...t, weather: weather() }));
    expect(dried.some((i) => i.key === 'rain-jacket')).toBe(false);
    expect(dried.some((i) => i.key === 'umbrella')).toBe(true);
  });
});
