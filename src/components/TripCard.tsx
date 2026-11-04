import { motion } from 'framer-motion';
import { ChevronRight, CloudOff } from 'lucide-react';
import type { Trip } from '../lib/types';
import { countdown, formatRange, tripDays } from '../lib/dates';
import { motionTransitions } from '../lib/motion-tokens';
import { Badge } from './ui/badge';
import { ProgressBar, WeatherIcon } from './bits';

function dominantCode(trip: Trip) {
  const days = trip.weather?.days ?? [];
  if (!days.length) return 0;
  return [...days].sort((a, b) => b.code - a.code)[Math.floor(days.length / 2)].code;
}

export function TripCard({ trip, onOpen }: { trip: Trip; onOpen: () => void }) {
  const packed = trip.items.filter((i) => i.packed).length;
  const total = trip.items.length;
  const label = countdown(trip.start, trip.end);
  const days = tripDays(trip.start, trip.end);
  const w = trip.weather;

  return (
    <motion.button
      layout
      type="button"
      onClick={onOpen}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      whileTap={{ scale: 0.985 }}
      transition={motionTransitions.springSmooth}
      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-left transition-colors hover:border-[var(--border-hover)] focus-ring"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[17px] font-semibold tracking-snug-heading text-[var(--text-primary)]">
            {trip.destination.name}
          </div>
          <div className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
            {[trip.destination.admin1, trip.destination.country].filter(Boolean).join(', ')}
          </div>
        </div>
        <Badge
          tone={label === 'Travelling now' ? 'success' : label === 'Completed' ? 'neutral' : 'warning'}
          dot
          pulse={label === 'Travelling now'}
        >
          {label}
        </Badge>
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs text-[var(--text-secondary)]">
        <span>{formatRange(trip.start, trip.end)}</span>
        <span className="text-[var(--text-subtle)]">·</span>
        <span>
          {days} day{days > 1 ? 's' : ''}
        </span>
        <span className="text-[var(--text-subtle)]">·</span>
        {w ? (
          <span className="inline-flex items-center gap-1">
            <WeatherIcon code={dominantCode(trip)} className="size-3.5" />
            {w.minLow}–{w.maxHigh}°
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[var(--text-muted)]">
            <CloudOff className="size-3.5" /> No weather
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <ProgressBar value={total ? packed / total : 0} />
        <span className="shrink-0 font-mono text-[11px] tabular-nums text-[var(--text-muted)]">
          {packed}/{total}
        </span>
        <ChevronRight className="size-4 shrink-0 text-[var(--text-subtle)]" />
      </div>
    </motion.button>
  );
}
