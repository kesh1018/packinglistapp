import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ListChecks, Luggage, Plus } from 'lucide-react';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { emptyProfile, type PackItem, type PackLevel, type Profile, type Trip } from './lib/types';
import { loadProfile, loadTrips, saveProfile, saveTrips } from './lib/storage';
import { getTripWeather } from './lib/weather';
import { buildItems, mergeItems, newId, recommend } from './lib/recommend';
import { fromISO, today } from './lib/dates';
import { shareTrip } from './lib/share';
import { describeChange, shouldAutoRefresh } from './lib/autoRefresh';
import { ensureNotificationPermission, onReminderTap, syncReminders } from './lib/reminders';
import { Button } from './components/ui/Button';
import { AnimatedTabs } from './components/ui/AnimatedTabs';
import { VelocityToast, type VelocityToastVariant } from './components/ui/VelocityToast';
import { UndoToast } from './components/ui/UndoToast';
import { Skeleton } from './components/ui/skeleton';
import { TripCard } from './components/TripCard';
import { TripDetail } from './components/TripDetail';
import { NewTripSheet, type NewTripInput } from './components/NewTripSheet';
import { AlwaysPackSheet } from './components/AlwaysPackSheet';
import type { NewItem } from './components/AddItemSheet';
import { Eyebrow } from './components/bits';

interface ToastState {
  id: number;
  title: string;
  description?: string;
  variant?: VelocityToastVariant;
}
interface UndoState {
  id: number;
  title: string;
  description?: string;
  undo: () => void;
}

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export default function App() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [profile, setProfile] = useState<Profile>(emptyProfile());
  const [loaded, setLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [newOpen, setNewOpen] = useState(false);
  const [reuse, setReuse] = useState<Trip | null>(null);
  const [alwaysOpen, setAlwaysOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [undo, setUndo] = useState<UndoState | null>(null);

  const tripsRef = useRef(trips);
  tripsRef.current = trips;

  // ── persistence ──
  // `loaded` gates saving: if storage can't be read we stay read-only rather than
  // overwrite the user's real trips with an empty list.
  useEffect(() => {
    Promise.all([loadTrips(), loadProfile()])
      .then(([t, p]) => {
        setTrips(t);
        setProfile(p);
        setLoaded(true);
      })
      .catch(() => {
        setLoadFailed(true);
        setToast({ id: Date.now(), title: 'Couldn’t load your trips', description: 'Restart the app — nothing has been changed', variant: 'error' });
      });
  }, []);
  useEffect(() => {
    if (loaded) saveTrips(trips);
  }, [trips, loaded]);
  useEffect(() => {
    if (loaded) saveProfile(profile);
  }, [profile, loaded]);

  const notify = useCallback((title: string, description?: string, variant: VelocityToastVariant = 'success') => {
    setUndo(null);
    setToast({ id: Date.now(), title, description, variant });
  }, []);
  const offerUndo = useCallback((title: string, description: string, undoFn: () => void) => {
    setToast(null);
    setUndo({ id: Date.now(), title, description, undo: undoFn });
  }, []);
  const dismissToast = useCallback(() => setToast(null), []);
  const dismissUndo = useCallback(() => setUndo(null), []);
  const runUndo = useCallback(() => undo?.undo(), [undo]);

  const updateTrip = useCallback((id: string, fn: (t: Trip) => Trip) => {
    setTrips((ts) => ts.map((t) => (t.id === id ? fn(t) : t)));
  }, []);

  // ── Reminders: reschedule whenever trips change (debounced) ──
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => syncReminders(trips).catch(() => {}), 1500);
    return () => clearTimeout(t);
  }, [trips, loaded]);

  useEffect(
    () =>
      onReminderTap((tripId, repack) => {
        setOpenId(tripId);
        if (repack) updateTrip(tripId, (t) => ({ ...t, repack: true }));
      }),
    [updateTrip]
  );

  // ── Auto weather upgrade: on launch and whenever the app comes back ──
  const autoRefresh = useCallback(async () => {
    const due = tripsRef.current.filter((t) => shouldAutoRefresh(t));
    const changed: string[] = [];
    for (const trip of due) {
      try {
        const weather = await getTripWeather(trip.destination, trip.start, trip.end);
        const current = tripsRef.current.find((t) => t.id === trip.id);
        if (!current) continue;
        const items = mergeItems(current, recommend({ ...current, weather }));
        const added = items.filter((i) => !current.items.some((x) => x.id === i.id));
        const summary = describeChange(current.weather, weather, added);
        if (summary) changed.push(current.destination.name);
        updateTrip(trip.id, (t) => ({
          ...t,
          weather,
          items: mergeItems(t, recommend({ ...t, weather })),
          weatherChange: summary ? { at: new Date().toISOString(), summary, added: added.map((a) => a.name) } : t.weatherChange,
        }));
      } catch {
        // offline — try again next time
      }
    }
    if (changed.length) notify('Forecast updated', `New weather for ${changed.join(', ')} — tap the trip to see what changed`, 'info');
  }, [notify, updateTrip]);

  useEffect(() => {
    if (!loaded) return;
    autoRefresh();
    if (!Capacitor.isNativePlatform()) return;
    const sub = CapApp.addListener('resume', () => {
      autoRefresh();
      // Permission may have been granted in Android settings while away.
      syncReminders(tripsRef.current).catch(() => {});
    });
    return () => {
      sub.then((s) => s.remove());
    };
  }, [loaded, autoRefresh]);

  // ── Android hardware back: close sheet → close trip → background app ──
  const openIdRef = useRef(openId);
  openIdRef.current = openId;
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const sub = CapApp.addListener('backButton', () => {
      if (document.querySelector('[role="dialog"]')) {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      } else if (openIdRef.current) {
        setOpenId(null);
      } else {
        CapApp.minimizeApp();
      }
    });
    return () => {
      sub.then((s) => s.remove());
    };
  }, []);

  // ── create ──
  const createTrip = async ({ carryFrom, ...input }: NewTripInput) => {
    let weather: Trip['weather'];
    let weatherFailed = false;
    try {
      weather = await getTripWeather(input.destination, input.start, input.end);
    } catch {
      weatherFailed = true;
    }
    const carry = carryFrom ? (tripsRef.current.find((t) => t.id === carryFrom)?.items.filter((i) => i.custom) ?? []) : [];
    const trip: Trip = {
      id: newId(),
      ...input,
      weather,
      items: buildItems({ ...input, weather }, profile.alwaysPack, carry),
      dismissedKeys: [],
      repack: false,
      reminders: true,
      createdAt: new Date().toISOString(),
    };
    setTrips((ts) => [trip, ...ts]);
    setTab('upcoming');
    setOpenId(trip.id);
    if (weatherFailed) notify('List created without weather', 'Tap refresh on the weather card to retry', 'warning');
    else notify(`${trip.items.length} items recommended`, `Based on ${trip.weather!.minLow}–${trip.weather!.maxHigh}°C in ${input.destination.name}`);
    ensureNotificationPermission()
      .then((ok) => ok && setTimeout(() => syncReminders(tripsRef.current).catch(() => {}), 300))
      .catch(() => {});
  };

  const refreshWeather = async (trip: Trip) => {
    try {
      const weather = await getTripWeather(trip.destination, trip.start, trip.end);
      const items = mergeItems(trip, recommend({ ...trip, weather }));
      const added = items.filter((i) => !trip.items.some((x) => x.id === i.id)).length;
      updateTrip(trip.id, (t) => ({ ...t, weather, weatherChange: undefined, items: mergeItems(t, recommend({ ...t, weather })) }));
      notify('Weather updated', added > 0 ? `${added} new item${added > 1 ? 's' : ''} suggested` : 'Your list is up to date');
    } catch {
      notify('Couldn’t reach the weather service', 'Check your connection and try again', 'error');
    }
  };

  const setLevel = (trip: Trip, level: PackLevel) => {
    const before = trip.items.length;
    const next = { ...trip, level };
    const items = mergeItems(next, recommend(next));
    updateTrip(trip.id, (t) => {
      const n = { ...t, level };
      return { ...n, items: mergeItems(n, recommend(n)) };
    });
    const diff = items.length - before;
    notify(
      level === 'light' ? 'Travelling light' : 'Full packing list',
      diff === 0 ? 'Quantities updated' : diff < 0 ? `${-diff} nice-to-haves removed, quantities trimmed` : `${diff} items added back`,
      'info'
    );
  };

  const setReminders = async (trip: Trip, on: boolean) => {
    updateTrip(trip.id, (t) => ({ ...t, reminders: on }));
    if (on && Capacitor.isNativePlatform()) {
      const ok = await ensureNotificationPermission();
      if (ok) syncReminders(tripsRef.current).catch(() => {});
      if (!ok) notify('Notifications are off', 'Allow notifications for Packing Pal in Android settings', 'warning');
    }
  };

  const rememberHistory = (p: Profile, it: { name: string; category: PackItem['category']; qty: number }): Profile => ({
    ...p,
    history: [{ name: it.name, category: it.category, qty: it.qty }, ...p.history.filter((h) => !sameName(h.name, it.name))].slice(0, 40),
  });

  const addItem = (trip: Trip, n: NewItem) => {
    updateTrip(trip.id, (t) => ({
      ...t,
      items: [...t.items, { id: newId(), name: n.name, category: n.category, qty: n.qty, packed: false, custom: true, note: n.note }],
    }));
    setProfile((p) => {
      let next = rememberHistory(p, n);
      if (n.always) next = { ...next, alwaysPack: [...next.alwaysPack.filter((a) => !sameName(a.name, n.name)), { name: n.name, category: n.category, qty: n.qty }] };
      return next;
    });
    notify(`Added “${n.name}”`, n.always ? 'Also added to your always-pack list' : undefined);
  };

  const toggleAlways = (item: PackItem, on: boolean) => {
    setProfile((p) => ({
      ...p,
      alwaysPack: on
        ? [...p.alwaysPack.filter((a) => !sameName(a.name, item.name)), { name: item.name, category: item.category, qty: item.qty }]
        : p.alwaysPack.filter((a) => !sameName(a.name, item.name)),
    }));
    notify(on ? 'Added to always-pack list' : 'Removed from always-pack list', item.name, 'info');
  };

  const removeItem = (trip: Trip, item: PackItem) => {
    const index = trip.items.findIndex((i) => i.id === item.id);
    updateTrip(trip.id, (t) => ({
      ...t,
      items: t.items.filter((i) => i.id !== item.id),
      dismissedKeys: item.key ? [...new Set([...t.dismissedKeys, item.key])] : t.dismissedKeys,
    }));
    offerUndo(`Removed “${item.name}”`, trip.destination.name, () =>
      updateTrip(trip.id, (t) => {
        const items = [...t.items];
        items.splice(Math.min(index, items.length), 0, item);
        return { ...t, items, dismissedKeys: t.dismissedKeys.filter((k) => k !== item.key) };
      })
    );
  };

  const deleteTrip = (trip: Trip) => {
    const index = trips.findIndex((t) => t.id === trip.id);
    setOpenId(null);
    setTrips((ts) => ts.filter((t) => t.id !== trip.id));
    offerUndo('Trip deleted', `${trip.destination.name} and its packing list`, () =>
      setTrips((ts) => {
        const next = [...ts];
        next.splice(Math.min(index, next.length), 0, trip);
        return next;
      })
    );
  };

  const share = async (trip: Trip) => {
    const r = await shareTrip(trip);
    if (r === 'copied') notify('Packing list copied', 'Paste it into any chat or email', 'info');
  };

  const startReuse = (trip: Trip) => {
    setReuse(trip);
    setOpenId(null);
    setNewOpen(true);
  };

  // ── derived ──
  const { upcoming, past } = useMemo(() => {
    const t = today();
    const sorted = [...trips].sort((a, b) => a.start.localeCompare(b.start));
    return {
      upcoming: sorted.filter((x) => fromISO(x.end) >= t),
      past: sorted.filter((x) => fromISO(x.end) < t).reverse(),
    };
  }, [trips]);
  const list = tab === 'upcoming' ? upcoming : past;
  const openTrip = trips.find((t) => t.id === openId) ?? null;

  return (
    <div className="min-h-full bg-[var(--bg)] text-[var(--text-primary)]">
      <main className="safe-top mx-auto max-w-md px-4 pb-32">
        <header className="flex items-start justify-between gap-3 pb-5 pt-8">
          <div>
            <Eyebrow>Packing Pal</Eyebrow>
            <h1 className="mt-1.5 text-[30px] font-semibold leading-tight tracking-tight-heading">Your trips</h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Weather-smart packing lists for every destination.</p>
          </div>
          <Button size="icon" variant="secondary" aria-label="Always-pack list" onClick={() => setAlwaysOpen(true)} className="mt-1">
            <ListChecks className="size-[18px]" />
          </Button>
        </header>

        <AnimatedTabs
          renderContent={false}
          activeTab={tab}
          onChange={(id) => setTab(id as 'upcoming' | 'past')}
          tabsContainerClassName="mb-4"
          tabs={[
            { id: 'upcoming', label: 'Upcoming', badge: upcoming.length || undefined },
            { id: 'past', label: 'Past', badge: past.length || undefined },
          ]}
        />

        {loadFailed ? (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-6 py-10 text-center text-sm text-rose-300">
            Your trips couldn’t be loaded. Close and reopen Packing Pal — your saved data hasn’t been touched.
          </div>
        ) : !loaded ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-[132px] w-full rounded-xl" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center rounded-2xl border border-dashed border-[var(--border)] px-6 py-12 text-center"
          >
            <div className="mb-4 grid size-12 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              <Luggage className="size-5 text-[var(--text-secondary)]" />
            </div>
            <div className="text-sm font-medium">{tab === 'upcoming' ? 'No upcoming trips' : 'No past trips yet'}</div>
            <p className="mt-1 max-w-[16rem] text-xs leading-relaxed text-[var(--text-muted)]">
              {tab === 'upcoming'
                ? 'Add a destination and dates — we’ll check the forecast and suggest what to pack.'
                : 'Trips move here once they’re over.'}
            </p>
            {tab === 'upcoming' && (
              <Button className="mt-5" leftIcon={<Plus className="size-4" />} onClick={() => setNewOpen(true)}>
                Plan a trip
              </Button>
            )}
          </motion.div>
        ) : (
          <motion.div layout className="space-y-3">
            <AnimatePresence initial={false} mode="popLayout">
              {list.map((t) => (
                <TripCard key={t.id} trip={t} onOpen={() => setOpenId(t.id)} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </main>

      {/* Bottom action */}
      <div className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/90 to-transparent pt-10">
        <div className="pointer-events-auto mx-auto max-w-md px-4 pb-5">
          <Button
            fullWidth
            size="lg"
            leftIcon={<Plus className="size-4" />}
            onClick={() => {
              setReuse(null);
              setNewOpen(true);
            }}
          >
            New trip
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {openTrip && (
          <TripDetail
            key={openTrip.id}
            trip={openTrip}
            alwaysPack={profile.alwaysPack}
            history={profile.history}
            onBack={() => setOpenId(null)}
            onUpdate={(fn) => updateTrip(openTrip.id, fn)}
            onRemoveItem={(item) => removeItem(openTrip, item)}
            onAddItem={(n) => addItem(openTrip, n)}
            onToggleAlways={toggleAlways}
            onSetLevel={(l) => setLevel(openTrip, l)}
            onSetReminders={(on) => setReminders(openTrip, on)}
            onRefreshWeather={() => refreshWeather(openTrip)}
            onShare={() => share(openTrip)}
            onReuse={() => startReuse(openTrip)}
            onDelete={() => deleteTrip(openTrip)}
          />
        )}
      </AnimatePresence>

      <NewTripSheet
        open={newOpen}
        reuse={reuse}
        onOpenChange={(o) => {
          setNewOpen(o);
          if (!o) setReuse(null);
        }}
        onCreate={createTrip}
      />
      <AlwaysPackSheet
        open={alwaysOpen}
        onOpenChange={setAlwaysOpen}
        items={profile.alwaysPack}
        history={profile.history}
        onChange={(alwaysPack) => setProfile((p) => ({ ...p, alwaysPack }))}
      />

      {toast && (
        <VelocityToast
          key={toast.id}
          open
          title={toast.title}
          description={toast.description}
          variant={toast.variant}
          position="top-center"
          duration={3500}
          onDismiss={dismissToast}
          className="mt-[var(--safe-area-inset-top,0px)] min-w-[300px] max-w-[calc(100vw-2rem)]"
        />
      )}
      {undo && (
        <UndoToast
          key={undo.id}
          open
          title={undo.title}
          description={undo.description}
          restoredMessage="Restored"
          variant="default"
          position="top-center"
          duration={5000}
          onUndo={runUndo}
          onDismiss={dismissUndo}
          className="mt-[var(--safe-area-inset-top,0px)] min-w-[300px] max-w-[calc(100vw-2rem)]"
        />
      )}
    </div>
  );
}
