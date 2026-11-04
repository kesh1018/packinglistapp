import { motion } from 'framer-motion';
import { Ellipsis, ShoppingCart, Star, StickyNote } from 'lucide-react';
import type { PackItem } from '../lib/types';
import { DrawCheckbox } from './ui/DrawCheckbox';
import { QtyStepper } from './bits';
import { cn } from '../lib/utils';
import { motionTransitions } from '../lib/motion-tokens';

export function ItemRow({
  item,
  repack,
  onToggle,
  onQty,
  onMore,
}: {
  item: PackItem;
  /** In repack mode the checkbox tracks `repacked` and quantities are fixed. */
  repack: boolean;
  onToggle: () => void;
  onQty: (n: number) => void;
  onMore: () => void;
}) {
  const checked = repack ? !!item.repacked : item.packed;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={motionTransitions.springGentle}
      className="overflow-hidden"
    >
      <div className="flex items-center gap-2 py-2.5">
        <DrawCheckbox
          checked={checked}
          onChange={onToggle}
          className="min-w-0 flex-1 items-center gap-3 [&>div:first-child]:mt-0 [&>div:first-child>div]:size-5 [&>div:first-child>div]:rounded-md"
          label={
            <span
              className={cn(
                'flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm font-normal transition-colors',
                checked ? 'text-[var(--text-muted)]' : 'text-[var(--text-primary)]'
              )}
            >
              <span className={cn(checked && 'line-through decoration-[var(--text-subtle)]')}>{item.name}</span>
              {item.essential && <Star aria-label="Essential" className="size-3 fill-amber-400 text-amber-400" />}
              {item.toBuy && !item.packed && (
                <span className="inline-flex items-center gap-0.5 rounded bg-sky-500/10 px-1 py-px text-[9px] font-medium uppercase tracking-wider text-sky-400">
                  <ShoppingCart className="size-2.5" /> buy
                </span>
              )}
              {item.custom && (
                <span className="rounded bg-[var(--surface-raised)] px-1 py-px text-[9px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  yours
                </span>
              )}
              {item.note && (
                <span className="flex basis-full items-start gap-1 text-[11px] leading-snug text-amber-200/80">
                  <StickyNote className="mt-px size-3 shrink-0" />
                  <span className="break-words">{item.note}</span>
                </span>
              )}
            </span>
          }
          description={item.reason}
        />
        {repack ? (
          item.qty > 1 && <span className="font-mono text-xs tabular-nums text-[var(--text-muted)]">×{item.qty}</span>
        ) : (
          <QtyStepper value={item.qty} onChange={onQty} />
        )}
        <button
          type="button"
          aria-label={`More options for ${item.name}`}
          onClick={onMore}
          className="grid size-7 shrink-0 place-items-center rounded-md text-[var(--text-subtle)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-ring"
        >
          <Ellipsis className="size-4" />
        </button>
      </div>
    </motion.div>
  );
}
