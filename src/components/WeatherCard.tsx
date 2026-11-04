import type React from 'react';
import { CloudOff, CloudRain, Droplets, RefreshCw, ThermometerSun, Wind } from 'lucide-react';
import type { WeatherSummary } from '../lib/types';
import { describeCode } from '../lib/weather';
import { fromISO, weekday } from '../lib/dates';
import { Button } from './ui/Button';
import { Eyebrow, WeatherIcon } from './bits';
import { cn } from '../lib/utils';

export function WeatherCard({
  weather,
  refreshing,
  onRefresh,
}: {
  weather?: WeatherSummary;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  if (!weather) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-4">
        <CloudOff className="size-5 text-[var(--text-muted)]" />
        <div className="flex-1 text-xs text-[var(--text-secondary)]">
          Weather couldn’t be loaded, so the list doesn’t include weather-based items yet.
        </div>
        <Button size="sm" variant="secondary" onClick={onRefresh} isLoading={refreshing}>
          Retry
        </Button>
      </div>
    );
  }

  const w = weather;
  const sourceNote =
    w.source === 'forecast'
      ? 'Live forecast'
      : w.source === 'mixed'
        ? 'Forecast + last year’s weather for later days'
        : 'Typical weather (same dates last year)';

  const h = w.avgHumidity;
  const humidityNote = h == null ? undefined : h >= 80 ? 'Very humid' : h >= 65 ? 'Humid' : h <= 35 ? 'Dry' : 'Comfortable';
  const stats: { icon: React.ReactNode; label: string; value: string; unit?: string; note?: string }[] = [
    { icon: <ThermometerSun className="size-3.5" />, label: 'Avg', value: `${w.avgLow}–${w.avgHigh}°` },
    {
      icon: <CloudRain className="size-3.5" />,
      label: 'Rain',
      value: `${w.rainyDays}d`,
      note: w.snowyDays ? `${w.snowyDays}d snow` : undefined,
    },
    { icon: <Wind className="size-3.5" />, label: 'Wind', value: `${w.maxWind}`, unit: 'km/h' },
    { icon: <Droplets className="size-3.5" />, label: 'Humidity', value: h == null ? '—' : `${h}`, unit: h == null ? undefined : '%', note: humidityNote },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-start justify-between gap-3 p-4 pb-3">
        <div>
          <Eyebrow>Weather at destination</Eyebrow>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-medium tabular-nums tracking-tight">
              {w.minLow}° <span className="text-[var(--text-subtle)]">/</span> {w.maxHigh}°
            </span>
          </div>
          <div className="mt-1 text-[11px] text-[var(--text-muted)]">{sourceNote}</div>
        </div>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Refresh weather"
          onClick={onRefresh}
          disabled={refreshing}
          className="size-9"
        >
          <RefreshCw className={cn('size-4', refreshing && 'animate-spin')} />
        </Button>
      </div>

      <div className="grid grid-cols-[1.15fr_0.75fr_1fr_1.1fr] gap-px border-y border-[var(--border)] bg-[var(--border)]">
        {stats.map((s) => (
          <div key={s.label} className="min-w-0 bg-[var(--surface)] px-2.5 py-2.5">
            <div className="flex items-center gap-1 truncate text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
              <span className="shrink-0">{s.icon}</span>
              <span className="truncate">{s.label}</span>
            </div>
            <div className="mt-0.5 truncate font-mono text-sm tabular-nums">
              {s.value}
              {s.unit && <span className="ml-0.5 text-[10px] text-[var(--text-muted)]">{s.unit}</span>}
            </div>
            {s.note && <div className="truncate text-[10px] text-[var(--text-muted)]">{s.note}</div>}
          </div>
        ))}
      </div>

      <div className="no-scrollbar flex gap-1 overflow-x-auto p-2">
        {w.days.map((d) => (
          <div
            key={d.date}
            title={describeCode(d.code)}
            className="flex min-w-[52px] flex-col items-center gap-1 rounded-lg px-1.5 py-2 text-center"
          >
            <span className="text-[10px] font-medium uppercase text-[var(--text-muted)]">{weekday(d.date)}</span>
            <span className="text-[10px] text-[var(--text-subtle)]">{fromISO(d.date).getDate()}</span>
            <WeatherIcon code={d.code} className="my-0.5 size-5 text-[var(--text-secondary)]" />
            <span className="font-mono text-xs tabular-nums">{Math.round(d.tMax)}°</span>
            <span className="font-mono text-[11px] tabular-nums text-[var(--text-muted)]">{Math.round(d.tMin)}°</span>
            {d.precipSum >= 1 && (
              <span className="font-mono text-[10px] tabular-nums text-sky-400">{Math.round(d.precipSum)}mm</span>
            )}
            {d.humidity != null && (
              <span className="inline-flex items-center gap-0.5 font-mono text-[10px] tabular-nums text-[var(--text-muted)]" title="Humidity">
                <Droplets className="size-2.5" />
                {Math.round(d.humidity)}%
              </span>
            )}
            {d.historical && <span className="size-1 rounded-full bg-[var(--text-subtle)]" title="Last year" />}
          </div>
        ))}
      </div>
    </div>
  );
}
