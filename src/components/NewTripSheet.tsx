import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Baby,
  Bath,
  Bike,
  Briefcase,
  Camera,
  Car,
  Check,
  Dumbbell,
  Feather,
  FerrisWheel,
  Fish,
  Flag,
  Flower2,
  Footprints,
  Gem,
  Landmark,
  Laptop,
  Luggage,
  MapPin,
  Moon,
  Mountain,
  MountainSnow,
  Music,
  PawPrint,
  Plane,
  Sailboat,
  Search,
  Shell,
  Ship,
  Shirt,
  Sparkles,
  Tent,
  TrainFront,
  TreePine,
  Trophy,
  Umbrella,
  Users,
  Waves,
  WavesLadder,
} from 'lucide-react';
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from './ui/sheet';
import { Stepper, StepPanels } from './ui/stepper';
import { Calendar, type DateRange } from './ui/calendar';
import { Input, Switch } from './ui/Form';
import { Button } from './ui/Button';
import { AnimatedTabs } from './ui/AnimatedTabs';
import { Chip, Eyebrow } from './bits';
import type { Activity, PackLevel, Place, Transport, Trip, TripType } from '../lib/types';
import { searchPlaces } from '../lib/weather';
import { daysBetween, today, toISO } from '../lib/dates';
import { cn } from '../lib/utils';

export interface NewTripInput {
  destination: Place;
  start: string;
  end: string;
  type: TripType;
  transport: Transport;
  activities: Activity[];
  laundry: boolean;
  level: PackLevel;
  /** When reusing a trip: carry over its custom items. */
  carryFrom?: string;
}

const ACTIVITY_GROUPS: { title: string; items: { id: Activity; label: string; icon: ReactNode }[] }[] = [
  {
    title: 'Water',
    items: [
      { id: 'beach', label: 'Beach', icon: <Umbrella /> },
      { id: 'swimming', label: 'Swimming', icon: <WavesLadder /> },
      { id: 'snorkeling', label: 'Snorkel / dive', icon: <Shell /> },
      { id: 'surfing', label: 'Surfing', icon: <Waves /> },
      { id: 'sailing', label: 'Sailing', icon: <Sailboat /> },
      { id: 'fishing', label: 'Fishing', icon: <Fish /> },
    ],
  },
  {
    title: 'Outdoors & sport',
    items: [
      { id: 'hiking', label: 'Hiking', icon: <TreePine /> },
      { id: 'climbing', label: 'Climbing', icon: <Mountain /> },
      { id: 'skiing', label: 'Skiing', icon: <MountainSnow /> },
      { id: 'camping', label: 'Camping', icon: <Tent /> },
      { id: 'cycling', label: 'Cycling', icon: <Bike /> },
      { id: 'running', label: 'Running', icon: <Footprints /> },
      { id: 'gym', label: 'Gym', icon: <Dumbbell /> },
      { id: 'yoga', label: 'Yoga', icon: <Flower2 /> },
      { id: 'golf', label: 'Golf', icon: <Flag /> },
      { id: 'tennis', label: 'Tennis', icon: <Trophy /> },
    ],
  },
  {
    title: 'Going out',
    items: [
      { id: 'sightseeing', label: 'Sightseeing', icon: <Landmark /> },
      { id: 'themepark', label: 'Theme park', icon: <FerrisWheel /> },
      { id: 'spa', label: 'Spa', icon: <Bath /> },
      { id: 'festival', label: 'Festival', icon: <Music /> },
      { id: 'cruise', label: 'Cruise', icon: <Ship /> },
      { id: 'wedding', label: 'Wedding', icon: <Gem /> },
      { id: 'formal', label: 'Formal event', icon: <Shirt /> },
      { id: 'nightlife', label: 'Nightlife', icon: <Moon /> },
    ],
  },
  {
    title: 'Other',
    items: [
      { id: 'remotework', label: 'Remote work', icon: <Laptop /> },
      { id: 'photography', label: 'Photography', icon: <Camera /> },
      { id: 'kids', label: 'With kids', icon: <Users /> },
      { id: 'baby', label: 'With a baby', icon: <Baby /> },
      { id: 'pets', label: 'With a pet', icon: <PawPrint /> },
    ],
  },
];

const STEPS = [{ title: 'Where' }, { title: 'When' }, { title: 'What' }];

export function NewTripSheet({
  open,
  onOpenChange,
  onCreate,
  reuse,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreate: (t: NewTripInput) => Promise<void>;
  /** Prefill from an earlier trip ("Pack like last time"). */
  reuse?: Trip | null;
}) {
  const [step, setStep] = useState(0);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const [range, setRange] = useState<DateRange>({ from: null, to: null });
  const [type, setType] = useState<TripType>('leisure');
  const [transport, setTransport] = useState<Transport>('plane');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [laundry, setLaundry] = useState(false);
  const [level, setLevel] = useState<PackLevel>('full');
  const [carry, setCarry] = useState(true);
  const [busy, setBusy] = useState(false);

  // Reset (or prefill from a reused trip) when the sheet opens.
  useEffect(() => {
    if (!open) return;
    setStep(reuse ? 1 : 0);
    setQuery(reuse?.destination.name ?? '');
    setResults([]);
    setPlace(reuse?.destination ?? null);
    setRange({ from: null, to: null });
    setType(reuse?.type ?? 'leisure');
    setTransport(reuse?.transport ?? 'plane');
    setActivities(reuse?.activities ?? []);
    setLaundry(reuse?.laundry ?? false);
    setLevel(reuse?.level ?? 'full');
    setCarry(true);
    setBusy(false);
  }, [open, reuse]);

  // Debounced destination search (Open-Meteo geocoding).
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2 || (place && q === place.name)) {
      setResults([]);
      setSearching(false);
      return;
    }
    const ctrl = new AbortController();
    setSearching(true);
    setSearchError(null);
    const t = setTimeout(() => {
      searchPlaces(q, ctrl.signal)
        .then(setResults)
        .catch((e) => {
          if (e.name !== 'AbortError') setSearchError('Could not search places. Check your connection.');
        })
        .finally(() => !ctrl.signal.aborted && setSearching(false));
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, place]);

  const nights = useMemo(() => (range.from && range.to ? daysBetween(range.from, range.to) : null), [range]);
  const customCount = reuse?.items.filter((i) => i.custom).length ?? 0;
  const canNext = step === 0 ? !!place : step === 1 ? !!range.from : true;

  const finish = async () => {
    if (!place || !range.from) return;
    setBusy(true);
    try {
      await onCreate({
        destination: place,
        start: toISO(range.from),
        end: toISO(range.to ?? range.from),
        type,
        transport,
        activities,
        laundry,
        level,
        carryFrom: reuse && carry ? reuse.id : undefined,
      });
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  const toggleActivity = (a: Activity) => setActivities((xs) => (xs.includes(a) ? xs.filter((x) => x !== a) : [...xs, a]));

  return (
    <Sheet open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <SheetContent side="bottom" className="h-[92dvh] max-h-[92dvh] bg-[var(--bg)] border-[var(--border)]">
        <SheetHeader>
          <SheetTitle>{reuse ? `Pack like your ${reuse.destination.name} trip` : 'New trip'}</SheetTitle>
          <SheetDescription>
            {reuse ? 'Same settings — pick new dates. You can change anything.' : 'We’ll check the weather and build your list.'}
          </SheetDescription>
        </SheetHeader>
        <div className="px-5 pb-3">
          <Stepper steps={STEPS} current={step} onStepChange={(i) => i < step && setStep(i)} />
        </div>

        <SheetBody className="pb-6">
          <StepPanels current={step}>
            {/* ── Step 1: destination ── */}
            <div className="space-y-3">
              <Eyebrow>Destination</Eyebrow>
              <Input
                autoFocus={!reuse}
                placeholder="Search a city, e.g. Lisbon"
                value={query}
                leftIcon={<Search className="size-4" />}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (place && e.target.value !== place.name) setPlace(null);
                }}
                className="h-11 text-sm"
              />
              {searchError && <p className="text-xs text-rose-400">{searchError}</p>}
              <div className="space-y-1.5">
                <AnimatePresence initial={false}>
                  {place && (
                    <motion.div
                      key="selected"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3"
                    >
                      <MapPin className="size-4 text-emerald-400" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{place.name}</div>
                        <div className="truncate text-xs text-[var(--text-muted)]">
                          {[place.admin1, place.country].filter(Boolean).join(', ')}
                        </div>
                      </div>
                      <Check className="size-4 text-emerald-400" />
                    </motion.div>
                  )}
                  {!place &&
                    results.map((r, i) => (
                      <motion.button
                        key={`${r.latitude},${r.longitude}`}
                        type="button"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0, transition: { delay: i * 0.03 } }}
                        exit={{ opacity: 0 }}
                        onClick={() => {
                          setPlace(r);
                          setQuery(r.name);
                          setResults([]);
                        }}
                        className="flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-left hover:border-[var(--border-hover)] focus-ring"
                      >
                        <MapPin className="size-4 text-[var(--text-muted)]" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium">{r.name}</div>
                          <div className="truncate text-xs text-[var(--text-muted)]">
                            {[r.admin1, r.country].filter(Boolean).join(', ')}
                          </div>
                        </div>
                      </motion.button>
                    ))}
                </AnimatePresence>
                {!place && searching && <p className="px-1 text-xs text-[var(--text-muted)]">Searching…</p>}
                {!place && !searching && query.trim().length >= 2 && !results.length && !searchError && (
                  <p className="px-1 text-xs text-[var(--text-muted)]">No places found.</p>
                )}
              </div>
            </div>

            {/* ── Step 2: dates ── */}
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <Eyebrow>Travel dates</Eyebrow>
                <span className="text-xs text-[var(--text-secondary)]">
                  {nights === null
                    ? range.from
                      ? 'Pick a return date (or continue for a day trip)'
                      : 'Pick your departure date'
                    : `${nights + 1} days · ${nights} night${nights === 1 ? '' : 's'}`}
                </span>
              </div>
              <div className="flex justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2">
                <Calendar mode="range" value={range} onChange={setRange} minDate={today()} weekStartsOn={1} />
              </div>
            </div>

            {/* ── Step 3: details ── */}
            <div className="space-y-6">
              <div className="space-y-2.5">
                <Eyebrow>Trip type</Eyebrow>
                <AnimatedTabs
                  variant="pill"
                  renderContent={false}
                  activeTab={type}
                  onChange={(id) => setType(id as TripType)}
                  tabs={[
                    { id: 'leisure', label: 'Leisure', icon: <Sparkles className="size-3.5" /> },
                    { id: 'business', label: 'Business', icon: <Briefcase className="size-3.5" /> },
                    { id: 'mixed', label: 'Both' },
                  ]}
                />
              </div>
              <div className="space-y-2.5">
                <Eyebrow>Getting there</Eyebrow>
                <AnimatedTabs
                  variant="pill"
                  renderContent={false}
                  activeTab={transport}
                  onChange={(id) => setTransport(id as Transport)}
                  tabs={[
                    { id: 'plane', label: 'Plane', icon: <Plane className="size-3.5" /> },
                    { id: 'car', label: 'Car', icon: <Car className="size-3.5" /> },
                    { id: 'train', label: 'Train', icon: <TrainFront className="size-3.5" /> },
                  ]}
                />
              </div>
              <div className="space-y-2.5">
                <Eyebrow>Packing style</Eyebrow>
                <AnimatedTabs
                  variant="pill"
                  renderContent={false}
                  activeTab={level}
                  onChange={(id) => setLevel(id as PackLevel)}
                  tabs={[
                    { id: 'light', label: 'Travel light', icon: <Feather className="size-3.5" /> },
                    { id: 'full', label: 'Full list', icon: <Luggage className="size-3.5" /> },
                  ]}
                />
                <p className="text-[11px] text-[var(--text-muted)]">
                  {level === 'light'
                    ? 'Re-wear clothes and skip nice-to-haves — ideal for carry-on only.'
                    : 'Everything we’d suggest, with a fresh outfit for most days.'}
                </p>
              </div>
              {ACTIVITY_GROUPS.map((g) => (
                <div key={g.title} className="space-y-2.5">
                  <Eyebrow>{g.title}</Eyebrow>
                  <div className="flex flex-wrap gap-2">
                    {g.items.map((a) => (
                      <Chip key={a.id} icon={a.icon} active={activities.includes(a.id)} onClick={() => toggleActivity(a.id)}>
                        {a.label}
                      </Chip>
                    ))}
                  </div>
                </div>
              ))}
              <div className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                <Switch
                  className="p-4"
                  checked={laundry}
                  onChange={setLaundry}
                  label="I can do laundry"
                  description="Caps clothing at about a week’s worth"
                />
                {reuse && customCount > 0 && (
                  <Switch
                    className="p-4"
                    checked={carry}
                    onChange={setCarry}
                    label={`Bring over my ${customCount} custom item${customCount > 1 ? 's' : ''}`}
                    description={`Items you added to the ${reuse.destination.name} list`}
                  />
                )}
              </div>
            </div>
          </StepPanels>
        </SheetBody>

        <SheetFooter className={cn('safe-bottom border-[var(--border)]', step === 0 && 'justify-end')}>
          {step > 0 && (
            <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={busy}>
              Back
            </Button>
          )}
          <div className="flex-1" />
          {step < 2 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canNext}>
              Continue
            </Button>
          ) : (
            <Button onClick={finish} isLoading={busy} loadingText="Checking weather…">
              Build my list
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
