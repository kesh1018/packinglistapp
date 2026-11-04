import React from 'react';
import { motion } from 'framer-motion';
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
  Minus,
  Plus,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motionTransitions } from '../lib/motion-tokens';

/** Toggle chip styled with EasyUI tokens (monochrome; selected = inverted). */
export function Chip({
  active,
  onClick,
  icon,
  children,
  className,
}: {
  active?: boolean;
  onClick?: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.95 }}
      transition={motionTransitions.springSnappy}
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-colors focus-ring select-none',
        active
          ? 'border-transparent bg-[var(--text-primary)] text-[var(--bg)]'
          : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]',
        className
      )}
    >
      {icon && <span className="shrink-0 [&>svg]:size-3.5">{icon}</span>}
      {children}
    </motion.button>
  );
}

export function WeatherIcon({ code, className }: { code: number; className?: string }) {
  const cls = cn('size-4', className);
  if (code === 0) return <Sun className={cls} />;
  if (code <= 2) return <CloudSun className={cls} />;
  if (code === 3) return <Cloud className={cls} />;
  if (code <= 48) return <CloudFog className={cls} />;
  if (code <= 57) return <CloudDrizzle className={cls} />;
  if (code <= 67 || (code >= 80 && code <= 82)) return <CloudRain className={cls} />;
  if (code <= 77 || (code >= 85 && code <= 86)) return <CloudSnow className={cls} />;
  return <CloudLightning className={cls} />;
}

export function QtyStepper({ value, onChange, min = 1 }: { value: number; onChange: (n: number) => void; min?: number }) {
  return (
    <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface-raised)]">
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="grid size-7 place-items-center text-[var(--text-muted)] disabled:opacity-30 focus-ring"
      >
        <Minus className="size-3" />
      </button>
      <motion.span
        key={value}
        initial={{ y: -6, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={motionTransitions.springSnappy}
        className="w-6 text-center font-mono text-xs tabular-nums text-[var(--text-primary)]"
      >
        {value}
      </motion.span>
      <button
        type="button"
        aria-label="Increase quantity"
        onClick={() => onChange(value + 1)}
        className="grid size-7 place-items-center text-[var(--text-muted)] focus-ring"
      >
        <Plus className="size-3" />
      </button>
    </div>
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-raised)]', className)}>
      <motion.div
        className={cn('h-full rounded-full', value >= 1 ? 'bg-emerald-400' : 'bg-[var(--text-primary)]')}
        initial={false}
        animate={{ width: `${Math.round(value * 100)}%` }}
        transition={motionTransitions.springSmooth}
      />
    </div>
  );
}

export const Eyebrow = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]', className)}>{children}</div>
);
