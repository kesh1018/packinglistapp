import type { Place, WeatherDay, WeatherSummary } from './types';
import { addDays, eachDay, fromISO, toISO, today } from './dates';

/**
 * Weather comes from Open-Meteo (free, no API key, CORS-enabled).
 *  - Days within the 16-day forecast window use the live forecast.
 *  - Days further out use the same calendar dates from last year
 *    (historical archive) as a "typical weather" estimate.
 */
const GEO = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST = 'https://api.open-meteo.com/v1/forecast';
const ARCHIVE = 'https://archive-api.open-meteo.com/v1/archive';
const FORECAST_DAYS = 16;

interface GeoResult {
  name: string;
  admin1?: string;
  country?: string;
  country_code?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const url = `${GEO}?name=${encodeURIComponent(q)}&count=8&language=en&format=json`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Place search failed (${res.status})`);
  const json = (await res.json()) as { results?: GeoResult[] };
  return (json.results ?? []).map((r) => ({
    name: r.name,
    admin1: r.admin1,
    country: r.country,
    countryCode: r.country_code,
    latitude: r.latitude,
    longitude: r.longitude,
    timezone: r.timezone,
  }));
}

interface DailyBlock {
  time: string[];
  weather_code: (number | null)[];
  temperature_2m_max: (number | null)[];
  temperature_2m_min: (number | null)[];
  precipitation_sum: (number | null)[];
  precipitation_probability_max?: (number | null)[];
  snowfall_sum: (number | null)[];
  wind_speed_10m_max: (number | null)[];
  uv_index_max?: (number | null)[];
  relative_humidity_2m_mean?: (number | null)[];
}

async function fetchDaily(base: string, place: Place, start: string, end: string, extra: string[]) {
  const daily = [
    'weather_code',
    'temperature_2m_max',
    'temperature_2m_min',
    'precipitation_sum',
    'snowfall_sum',
    'wind_speed_10m_max',
    'relative_humidity_2m_mean',
    ...extra,
  ].join(',');
  const url =
    `${base}?latitude=${place.latitude}&longitude=${place.longitude}` +
    `&daily=${daily}&timezone=auto&start_date=${start}&end_date=${end}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather lookup failed (${res.status})`);
  const json = (await res.json()) as { daily: DailyBlock };
  return json.daily;
}

function toDays(d: DailyBlock, historical: boolean, remap?: (iso: string) => string): WeatherDay[] {
  return d.time.map((t, i) => ({
    date: remap ? remap(t) : t,
    tMax: d.temperature_2m_max[i] ?? NaN,
    tMin: d.temperature_2m_min[i] ?? NaN,
    precipSum: d.precipitation_sum[i] ?? 0,
    precipProb: d.precipitation_probability_max?.[i] ?? undefined,
    snowSum: d.snowfall_sum[i] ?? 0,
    windMax: d.wind_speed_10m_max[i] ?? 0,
    uvMax: d.uv_index_max?.[i] ?? undefined,
    humidity: d.relative_humidity_2m_mean?.[i] ?? undefined,
    code: d.weather_code[i] ?? 0,
    historical,
  }));
}

const shiftYear = (iso: string, years: number) => {
  const d = fromISO(iso);
  return toISO(new Date(d.getFullYear() + years, d.getMonth(), d.getDate()));
};

export async function getTripWeather(place: Place, start: string, end: string): Promise<WeatherSummary> {
  const t = today();
  const lastForecastDay = toISO(addDays(t, FORECAST_DAYS - 1));
  const todayISO = toISO(t);
  const all = eachDay(start, end);
  const valid = (d: WeatherDay) => !Number.isNaN(d.tMax) && !Number.isNaN(d.tMin);

  // 1) Live forecast for any trip days inside the forecast window.
  const forecastDates = all.filter((d) => d >= todayISO && d <= lastForecastDay);
  let forecast: WeatherDay[] = [];
  if (forecastDates.length) {
    try {
      const d = await fetchDaily(FORECAST, place, forecastDates[0], forecastDates[forecastDates.length - 1], [
        'precipitation_probability_max',
        'uv_index_max',
      ]);
      forecast = toDays(d, false).filter(valid);
    } catch {
      // fall through — the archive fills every missing day below
    }
  }

  // 2) Every day still missing (beyond the window, in the past, or a gap in
  //    the forecast) comes from the archive. The archive lags ~5 days, so step
  //    back whole years until every date is safely in the past.
  const have = new Set(forecast.map((d) => d.date));
  const missing = all.filter((d) => !have.has(d));
  let historic: WeatherDay[] = [];
  if (missing.length) {
    const safeEnd = toISO(addDays(t, -7));
    let years = 0;
    while (shiftYear(missing[missing.length - 1], years) > safeEnd) years--;
    const d = await fetchDaily(ARCHIVE, place, shiftYear(missing[0], years), shiftYear(missing[missing.length - 1], years), []);
    historic = toDays(d, true, (iso) => shiftYear(iso, -years)).filter((x) => valid(x) && missing.includes(x.date));
  }

  const days = [...forecast, ...historic].sort((a, b) => a.date.localeCompare(b.date));
  if (!days.length) throw new Error('No weather data available for these dates');
  const source = !historic.length ? 'forecast' : !forecast.length ? 'historical' : 'mixed';
  return summarize(days, source);
}

const isRainy = (d: WeatherDay) => d.precipSum - d.snowSum / 7 >= 1 || (d.precipProb ?? 0) >= 60;

function summarize(days: WeatherDay[], source: WeatherSummary['source']): WeatherSummary {
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  return {
    days,
    source,
    avgHigh: Math.round(avg(days.map((d) => d.tMax))),
    avgLow: Math.round(avg(days.map((d) => d.tMin))),
    maxHigh: Math.round(Math.max(...days.map((d) => d.tMax))),
    minLow: Math.round(Math.min(...days.map((d) => d.tMin))),
    rainyDays: days.filter(isRainy).length,
    snowyDays: days.filter((d) => d.snowSum >= 0.5).length,
    heavyRain: days.some((d) => d.precipSum >= 10),
    maxWind: Math.round(Math.max(...days.map((d) => d.windMax))),
    avgHumidity: (() => {
      const hs = days.map((d) => d.humidity).filter((h): h is number => typeof h === 'number');
      return hs.length ? Math.round(avg(hs)) : null; // null = fetched, but no data
    })(),
    // Archive has no UV — estimate from heat + clear-ish skies.
    maxUv: Math.round(
      Math.max(...days.map((d) => d.uvMax ?? (d.tMax >= 25 && d.code <= 3 ? 7 : d.tMax >= 18 ? 4 : 2)))
    ),
    fetchedAt: new Date().toISOString(),
  };
}

/** WMO weather code → short label. */
export function describeCode(code: number): string {
  if (code === 0) return 'Clear';
  if (code <= 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code <= 48) return 'Fog';
  if (code <= 57) return 'Drizzle';
  if (code <= 67) return 'Rain';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Showers';
  if (code <= 86) return 'Snow showers';
  return 'Thunderstorm';
}
