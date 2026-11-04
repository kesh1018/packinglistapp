import type { PackItem, Trip, WeatherSummary } from './types';
import { addDays, fromISO, toISO, today } from './dates';

const FORECAST_WINDOW = 16;
const STALE_MS = 6 * 60 * 60 * 1000;

/**
 * True when an upcoming trip's weather can be improved: estimated days have
 * entered the live-forecast window, or the forecast is more than 6 hours old.
 */
export function shouldAutoRefresh(trip: Trip, now = new Date()): boolean {
  const t = today();
  if (fromISO(trip.end) < t) return false;
  // Trips saved before humidity was tracked: fetch once to fill it in.
  if (trip.weather && trip.weather.avgHumidity === undefined) return true;
  const windowEnd = toISO(addDays(t, FORECAST_WINDOW - 1));
  if (trip.start > windowEnd) return false;
  if (!trip.weather) return true;
  const todayISO = toISO(t);
  const upgradable = trip.weather.days.some((d) => d.historical && d.date >= todayISO && d.date <= windowEnd);
  if (upgradable) return true;
  return now.getTime() - new Date(trip.weather.fetchedAt).getTime() > STALE_MS;
}

/** Human summary of what changed — or null if nothing worth interrupting for. */
export function describeChange(prev: WeatherSummary | undefined, next: WeatherSummary, added: PackItem[]): string | null {
  const parts: string[] = [];
  const todayISO = toISO(today());
  const wasEstimate = !prev || prev.days.some((d) => d.historical && d.date >= todayISO);
  const nowLive = next.days.filter((d) => !d.historical).length > (prev?.days.filter((d) => !d.historical).length ?? 0);

  if (wasEstimate && nowLive) parts.push('Live forecast now available');
  if (prev) {
    if (Math.abs(next.minLow - prev.minLow) >= 3) parts.push(`lows now ${next.minLow}°C (was ${prev.minLow}°C)`);
    if (Math.abs(next.maxHigh - prev.maxHigh) >= 3) parts.push(`highs now ${next.maxHigh}°C (was ${prev.maxHigh}°C)`);
    if (Math.abs(next.rainyDays - prev.rainyDays) >= 2 || (prev.rainyDays === 0) !== (next.rainyDays === 0))
      parts.push(next.rainyDays ? `rain on ${next.rainyDays} day${next.rainyDays > 1 ? 's' : ''} (was ${prev.rainyDays})` : 'no rain expected now');
    if (next.snowyDays && !prev.snowyDays) parts.push('snow expected');
  }
  if (added.length) parts.push(`added ${added.map((a) => a.name).slice(0, 3).join(', ')}${added.length > 3 ? ` +${added.length - 3} more` : ''}`);
  if (!parts.length) return null;
  const s = parts.join(' · ');
  return s[0].toUpperCase() + s.slice(1);
}
