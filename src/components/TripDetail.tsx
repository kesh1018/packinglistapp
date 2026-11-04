import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Bell,
  Copy,
  Feather,
  Luggage,
  PartyPopper,
  Plus,
  RotateCcw,
  Share2,
  ShoppingCart,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import type { AlwaysItem, PackItem, PackLevel, Trip } from '../lib/types';
import { CATEGORY_ORDER } from '../lib/types';
import { countdown, formatRange, tripDays } from '../lib/dates';
import { Button } from './ui/Button';
import { AnimatedTabs } from './ui/AnimatedTabs';
import { UnfoldAccordion } from './ui/UnfoldAccordion';
import { Badge } from './ui/badge';
import { Switch } from './ui/Form';
import { WeatherCard } from './WeatherCard';
import { ItemRow } from './ItemRow';
import { AddItemSheet, type NewItem } from './AddItemSheet';
import { ItemActionsSheet } from './ItemActionsSheet';
import { DeleteTripSheet } from './DeleteTripSheet';
import { Eyebrow, ProgressBar } from './bits';
import { motionTransitions } from '../lib/motion-tokens';

type Filter = 'all' | 'todo' | 'buy' | 'packed';

const TYPE_LABEL = { leisure: 'Leisure', business: 'Business', mixed: 'Business + leisure' } as const;
const TRANSPORT_LABEL = { plane: 'Flying', car: 'Driving', train: 'By train' } as const;
const ACTIVITY_LABEL: Partial<Record<string, string>> = {
  kids: 'With kids',
  baby: 'With a baby',
  pets: 'With a pet',
  snorkeling: 'Snorkel / dive',
  themepark: 'Theme park',
  remotework: 'Remote work',
};

export function TripDetail({
  trip,
  alwaysPack,
  history,
  onBack,
  onUpdate,
  onRemoveItem,
  onAddItem,
  onToggleAlways,
  onSetLevel,
  onSetReminders,
  onRefreshWeather,
  onShare,
  onReuse,
  onDelete,
}: {
  trip: Trip;
  alwaysPack: AlwaysItem[];
  history: AlwaysItem[];
  onBack: () => void;
  onUpdate: (fn: (t: Trip) => Trip) => void;
  onRemoveItem: (item: PackItem) => void;
  onAddItem: (item: NewItem) => void;
  onToggleAlways: (item: PackItem, on: boolean) => void;
  onSetLevel: (level: PackLevel) => void;
  onSetReminders: (on: boolean) => void;
  onRefreshWeather: () => Promise<void>;
  onShare: () => void;
  onReuse: () => void;
  onDelete: () => void;
}) {
  const [filter, setFilter] = useState<Filter>('all');
  const [addOpen, setAddOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const repack = trip.repack;
  const status = countdown(trip.start, trip.end);
  const onTrip = status === 'Travelling now' || status === 'Completed';
  const days = tripDays(trip.start, trip.end);

  // In repack mode, used-up items (snacks, tickets) don't come home.
  const pool = repack ? trip.items.filter((i) => !i.consumable) : trip.items;
  const isDone = (i: PackItem) => (repack ? !!i.repacked : i.packed);
  const done = pool.filter(isDone).length;
  const total = pool.length;
  const allDone = total > 0 && done === total;
  const toBuy = trip.items.filter((i) => i.toBuy && !i.packed);
  const actionItem = trip.items.find((i) => i.id === actionId) ?? null;

  const setItem = (id: string, patch: Partial<PackItem>) =>
    onUpdate((t) => ({ ...t, items: t.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));

  const toggle = (item: PackItem) =>
    repack
      ? setItem(item.id, { repacked: !item.repacked })
      : setItem(item.id, { packed: !item.packed, ...(!item.packed ? { toBuy: false } : {}) });

  const refresh = async () => {
    setRefreshing(true);
    try {
      await onRefreshWeather();
    } finally {
      setRefreshing(false);
    }
  };

  const activeFilter: Filter = repack && filter === 'buy' ? 'all' : filter;
  const sections = useMemo(() => {
    const match = (i: PackItem) =>
      activeFilter === 'all'
        ? true
        : activeFilter === 'packed'
          ? isDone(i)
          : activeFilter === 'buy'
            ? !!i.toBuy && !i.packed
            : !isDone(i);
    const sortKey = (i: PackItem) => (i.essential ? 0 : 1);
    return CATEGORY_ORDER.map((cat) => {
      const all = pool.filter((i) => i.category === cat);
      const shown = all.filter(match).sort((a, b) => sortKey(a) - sortKey(b));
      return { cat, all, shown };
    }).filter((s) => s.shown.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.items, activeFilter, repack]);

  const tabs = repack
    ? [
        { id: 'all', label: 'All', badge: total || undefined },
        { id: 'todo', label: 'To repack', badge: total - done || undefined },
        { id: 'packed', label: 'Repacked', badge: done || undefined },
      ]
    : [
        { id: 'all', label: 'All', badge: total || undefined },
        { id: 'todo', label: 'To pack', badge: total - done || undefined },
        ...(toBuy.length ? [{ id: 'buy', label: 'To buy', badge: toBuy.length }] : []),
        { id: 'packed', label: 'Packed', badge: done || undefined },
      ];

  const setRepack = (on: boolean) => {
    setFilter('all');
    onUpdate((t) => ({ ...t, repack: on }));
  };

  return (
    <motion.div
      key={trip.id}
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 380, damping: 40, mass: 0.9 }}
      className="fixed inset-0 z-40 overflow-y-auto bg-[var(--bg)]"
    >
      {/* Top bar */}
      <div className="safe-top sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--bg)]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-md items-center gap-1 px-2">
          <Button size="icon" variant="ghost" aria-label="Back" onClick={onBack}>
            <ArrowLeft className="size-5" />
          </Button>
          <div className="min-w-0 flex-1 truncate text-sm font-semibold">
            {trip.destination.name}
            {repack && <span className="ml-2 text-xs font-normal text-amber-400">Repacking</span>}
          </div>
          <Button size="icon" variant="ghost" aria-label="Share trip" onClick={onShare}>
            <Share2 className="size-[18px]" />
          </Button>
          <Button size="icon" variant="ghost" aria-label="Delete trip" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="size-[18px]" />
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-md space-y-5 px-4 pb-32 pt-5">
        {/* Hero */}
        <div>
          <Eyebrow>{status}</Eyebrow>
          <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-tight-heading">{trip.destination.name}</h1>
          <div className="mt-1 text-sm text-[var(--text-secondary)]">
            {[trip.destination.admin1, trip.destination.country].filter(Boolean).join(', ')}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge variant="outline">{formatRange(trip.start, trip.end)}</Badge>
            <Badge variant="outline">
              {days} day{days > 1 ? 's' : ''}
            </Badge>
            <Badge variant="outline">{TYPE_LABEL[trip.type]}</Badge>
            <Badge variant="outline">{TRANSPORT_LABEL[trip.transport]}</Badge>
            <Badge variant="outline">{trip.level === 'light' ? 'Travel light' : 'Full list'}</Badge>
            {trip.activities.map((a) => (
              <Badge key={a} variant="outline" className="capitalize">
                {ACTIVITY_LABEL[a] ?? a}
              </Badge>
            ))}
          </div>
        </div>

        {/* Automatic forecast update */}
        <AnimatePresence initial={false}>
          {trip.weatherChange && (
            <motion.div
              key="change"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={motionTransitions.springGentle}
              className="overflow-hidden"
            >
              <div className="flex gap-3 rounded-xl border border-sky-500/30 bg-sky-500/10 p-4">
                <Sparkles className="mt-0.5 size-4 shrink-0 text-sky-400" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-sky-300">Forecast updated</div>
                  <div className="mt-0.5 text-xs leading-relaxed text-[var(--text-secondary)]">{trip.weatherChange.summary}</div>
                </div>
                <button
                  type="button"
                  aria-label="Dismiss forecast update"
                  onClick={() => onUpdate((t) => ({ ...t, weatherChange: undefined }))}
                  className="grid size-6 shrink-0 place-items-center rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] focus-ring"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Repack prompt during / after the trip */}
        {onTrip && !repack && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <RotateCcw className="size-4 shrink-0 text-amber-400" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-amber-300">Heading home?</div>
              <div className="text-xs text-[var(--text-secondary)]">Repack mode gives you a fresh checklist so nothing gets left behind.</div>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setRepack(true)}>
              Repack
            </Button>
          </div>
        )}

        {!repack && <WeatherCard weather={trip.weather} refreshing={refreshing} onRefresh={refresh} />}

        {/* Progress */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="mb-2.5 flex items-baseline justify-between">
            <span className="text-sm font-medium">
              {allDone ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-400">
                  <PartyPopper className="size-4" /> {repack ? 'All repacked — safe travels home!' : 'All packed!'}
                </span>
              ) : repack ? (
                'Repacking for home'
              ) : (
                'Packing progress'
              )}
            </span>
            <span className="font-mono text-xs tabular-nums text-[var(--text-secondary)]">
              {done} / {total}
            </span>
          </div>
          <ProgressBar value={total ? done / total : 0} />
          {repack && (
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-[11px] text-[var(--text-muted)]">Used-up items like snacks and tickets are hidden.</span>
              <Button size="sm" variant="ghost" onClick={() => setRepack(false)}>
                Exit
              </Button>
            </div>
          )}
        </div>

        {/* Shopping list */}
        {!repack && toBuy.length > 0 && (
          <button
            type="button"
            onClick={() => setFilter('buy')}
            className="flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-left hover:border-[var(--border-hover)] focus-ring"
          >
            <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-sky-500/30 bg-sky-500/10">
              <ShoppingCart className="size-4 text-sky-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">
                {toBuy.length} item{toBuy.length > 1 ? 's' : ''} to buy before you go
              </div>
              <div className="truncate text-xs text-[var(--text-muted)]">{toBuy.map((i) => i.name).join(', ')}</div>
            </div>
          </button>
        )}

        {/* List */}
        <div className="space-y-3">
          <div className="no-scrollbar -mx-4 overflow-x-auto px-4">
            <AnimatedTabs
              renderContent={false}
              activeTab={activeFilter}
              onChange={(id) => setFilter(id as Filter)}
              tabs={tabs}
              tabsContainerClassName="whitespace-nowrap"
            />
          </div>

          {sections.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--text-muted)]">
              {activeFilter === 'packed'
                ? repack
                  ? 'Nothing repacked yet.'
                  : 'Nothing packed yet.'
                : activeFilter === 'todo'
                  ? 'Everything is packed 🎉'
                  : 'Your list is empty.'}
            </div>
          ) : (
            <UnfoldAccordion
              key={`${activeFilter}-${repack}`}
              allowMultiple
              defaultOpen={CATEGORY_ORDER as string[]}
              items={sections.map(({ cat, all, shown }) => ({
                id: cat,
                title: cat,
                subtitle: `${all.filter(isDone).length} of ${all.length} ${repack ? 'repacked' : 'packed'}`,
                content: (
                  <div className="-mx-1 divide-y divide-[var(--border-subtle)]">
                    <AnimatePresence initial={false}>
                      {shown.map((item) => (
                        <ItemRow
                          key={item.id}
                          item={item}
                          repack={repack}
                          onToggle={() => toggle(item)}
                          onQty={(qty) => setItem(item.id, { qty, qtyEdited: true })}
                          onMore={() => setActionId(item.id)}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                ),
              }))}
            />
          )}

          {!repack && (
            <Button variant="secondary" fullWidth size="lg" leftIcon={<Plus className="size-4" />} onClick={() => setAddOpen(true)}>
              Add your own item
            </Button>
          )}
        </div>

        {/* List settings */}
        <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <Eyebrow>List settings</Eyebrow>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-medium">Packing style</div>
              <div className="text-[11px] text-[var(--text-muted)]">Updates suggested items and quantities</div>
            </div>
            <AnimatedTabs
              variant="pill"
              renderContent={false}
              activeTab={trip.level}
              onChange={(id) => id !== trip.level && onSetLevel(id as PackLevel)}
              tabs={[
                { id: 'light', label: 'Light', icon: <Feather className="size-3" /> },
                { id: 'full', label: 'Full', icon: <Luggage className="size-3" /> },
              ]}
            />
          </div>
          <div className="h-px bg-[var(--border)]" />
          <Switch
            checked={trip.reminders}
            onChange={onSetReminders}
            label={
              <span className="inline-flex items-center gap-1.5">
                <Bell className="size-3" /> Reminders
              </span>
            }
            description="3 days before, the evening before, and a repack nudge on your last day"
          />
          <div className="h-px bg-[var(--border)]" />
          <Switch
            checked={repack}
            onChange={setRepack}
            label="Repack mode"
            description="A fresh checklist for the trip home"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button variant="outline" size="lg" leftIcon={<Share2 className="size-4" />} onClick={onShare}>
            Share
          </Button>
          <Button variant="outline" size="lg" leftIcon={<Copy className="size-4" />} onClick={onReuse}>
            Pack like this
          </Button>
          <Button
            variant="destructive"
            size="lg"
            className="col-span-2"
            leftIcon={<Trash2 className="size-4" />}
            onClick={() => setDeleteOpen(true)}
          >
            Delete trip
          </Button>
        </div>
      </div>

      <AddItemSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdd={onAddItem}
        history={history}
        existingNames={trip.items.map((i) => i.name)}
      />
      <ItemActionsSheet
        item={actionItem}
        onClose={() => setActionId(null)}
        onPatch={(p) => actionItem && setItem(actionItem.id, p)}
        onRemove={() => actionItem && onRemoveItem(actionItem)}
        alwaysPack={!!actionItem && alwaysPack.some((a) => a.name.toLowerCase() === actionItem.name.toLowerCase())}
        onToggleAlways={(on) => actionItem && onToggleAlways(actionItem, on)}
      />
      <DeleteTripSheet
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        tripName={trip.destination.name}
        onConfirm={() => {
          setDeleteOpen(false);
          onDelete();
        }}
      />
    </motion.div>
  );
}
