import type { Activity, AlwaysItem, Category, PackItem, Trip, WeatherSummary } from './types';
import { tripDays } from './dates';
import { adapterAdvice } from './plugs';

export interface Rec {
  key: string;
  name: string;
  category: Category;
  qty: number;
  reason?: string;
  essential?: boolean;
  consumable?: boolean;
}

interface Flags {
  /** Nice-to-have: left out of light lists. */
  optional?: boolean;
  essential?: boolean;
  consumable?: boolean;
}

type TripInput = Pick<Trip, 'destination' | 'start' | 'end' | 'type' | 'transport' | 'activities' | 'laundry' | 'level'> & {
  weather?: WeatherSummary;
};

/** Region of the device locale, e.g. "en-NL" → "NL". */
export function homeCountry(): string | undefined {
  try {
    const loc = new Intl.Locale(navigator.language);
    return (loc.maximize().region ?? undefined)?.toUpperCase();
  } catch {
    return undefined;
  }
}

/**
 * Builds the recommended packing list from trip length, trip type, transport,
 * activities, packing level and the destination's weather. Each
 * weather/activity-driven item carries a human "reason".
 */
export function recommend(trip: TripInput): Rec[] {
  const light = trip.level === 'light';
  const out = new Map<string, Rec>();
  const add = (key: string, name: string, category: Category, qty = 1, reason?: string, flags: Flags = {}) => {
    if (light && flags.optional) return;
    const prev = out.get(key);
    if (prev) {
      prev.qty = Math.max(prev.qty, qty);
      if (reason && !prev.reason?.includes(reason)) prev.reason = prev.reason ? `${prev.reason} · ${reason}` : reason;
      return;
    }
    out.set(key, { key, name, category, qty, reason, essential: flags.essential, consumable: flags.consumable });
  };
  const opt: Flags = { optional: true };
  const ess: Flags = { essential: true };
  const used: Flags = { consumable: true };

  const days = Math.max(1, tripDays(trip.start, trip.end));
  const nights = Math.max(1, days - 1);
  const clothesDays = Math.min(trip.laundry ? Math.min(days, 7) : days, 14);
  const has = (a: Activity) => trip.activities.includes(a);
  const business = trip.type !== 'leisure';
  const w = trip.weather;
  const home = homeCountry();
  const destCode = trip.destination.countryCode?.toUpperCase();
  const abroad = !home || !destCode || home !== destCode;

  // ── Documents ──
  add('id', abroad ? 'Passport' : 'ID card', 'Documents', 1, abroad ? 'International trip' : undefined, ess);
  add('wallet', 'Wallet, cards & some cash', 'Documents', 1, undefined, ess);
  add('bookings', 'Booking confirmations', 'Documents');
  add('insurance', 'Travel insurance details', 'Documents');
  if (abroad) add('ehic', 'Health insurance card', 'Documents');
  add('keys', 'House keys', 'Documents');

  // ── Clothing basics (light = re-wear) ──
  const under = light ? Math.min(clothesDays + 1, 7) : clothesDays + 1;
  add('underwear', 'Underwear', 'Clothing', under);
  add('socks', 'Socks', 'Clothing', under);
  add('tops', 'T-shirts / tops', 'Clothing', light ? Math.min(5, Math.max(2, Math.ceil(clothesDays * 0.5))) : Math.max(2, Math.ceil(clothesDays * 0.8)));
  add('trousers', 'Trousers / jeans', 'Clothing', light ? Math.min(2, Math.max(1, Math.ceil(clothesDays / 4))) : Math.max(1, Math.ceil(clothesDays / 3)));
  add('sleepwear', 'Sleepwear', 'Clothing', days > 7 && !light ? 2 : 1);
  add('walking-shoes', 'Comfortable walking shoes', 'Clothing');
  if (days >= 4) add('laundry-bag', 'Laundry bag', 'Clothing', 1, `${nights} nights away`, opt);
  if (trip.laundry && days >= 5) add('detergent', 'Travel laundry detergent', 'Clothing', 1, 'Doing laundry', used);

  // ── Weather driven ──
  if (w) {
    const range = `${w.minLow}–${w.maxHigh}°C`;
    if (w.maxHigh >= 24) {
      add('shorts', 'Shorts', 'Clothing', light ? 1 : Math.max(1, Math.ceil(clothesDays / 3)), `Highs up to ${w.maxHigh}°C`);
      add('sunglasses', 'Sunglasses', 'Weather gear', 1, `Highs up to ${w.maxHigh}°C`);
      add('sandals', 'Sandals', 'Clothing', 1, 'Warm days', opt);
      add('water-bottle', 'Reusable water bottle', 'Travel', 1, 'Stay hydrated in the heat', opt);
    }
    if (w.avgHigh >= 28) add('linen', 'Light, breathable clothing', 'Clothing', 2, `Average high ${w.avgHigh}°C`);
    if (w.maxUv >= 6 || w.maxHigh >= 26) {
      add('sunscreen', 'Sunscreen (SPF 30+)', 'Toiletries', 1, `UV index up to ${w.maxUv}`);
      add('sunhat', 'Sun hat / cap', 'Weather gear', 1, `UV index up to ${w.maxUv}`);
    }
    if (w.minLow <= 15 && w.minLow > 8) add('light-jacket', 'Light jacket or hoodie', 'Clothing', 1, `Lows of ${w.minLow}°C`);
    if (w.minLow <= 8) {
      add('sweater', 'Warm sweater / fleece', 'Clothing', days > 4 && !light ? 2 : 1, `Lows of ${w.minLow}°C`);
      add('jacket', 'Warm jacket', 'Clothing', 1, `Lows of ${w.minLow}°C`);
    }
    if (w.minLow <= 3) {
      add('coat', 'Winter coat', 'Weather gear', 1, `Near freezing (${w.minLow}°C)`);
      add('thermals', 'Thermal base layers', 'Clothing', light ? 1 : 2, `Near freezing (${w.minLow}°C)`);
      add('beanie', 'Beanie', 'Weather gear', 1, 'Cold nights');
      add('gloves', 'Gloves', 'Weather gear', 1, 'Cold nights');
      add('scarf', 'Scarf', 'Weather gear', 1, 'Cold nights', opt);
      add('lip-balm', 'Lip balm', 'Toiletries', 1, 'Cold, dry air');
    }
    if (w.minLow <= -5) {
      add('insulated-boots', 'Insulated winter boots', 'Weather gear', 1, `Down to ${w.minLow}°C`);
      add('hand-warmers', 'Hand warmers', 'Weather gear', 2, `Down to ${w.minLow}°C`, { consumable: true, optional: true });
    }
    if (w.maxHigh - w.minLow >= 12) add('layers', 'Extra layer for evenings', 'Clothing', 1, `Big temperature swing (${range})`, opt);
    if (w.rainyDays >= 1) {
      const why = `Rain expected on ${w.rainyDays} of ${w.days.length} days`;
      add('umbrella', 'Compact umbrella', 'Weather gear', 1, why);
      add('rain-jacket', 'Rain jacket', 'Weather gear', 1, why);
    }
    if (w.rainyDays >= 3 || w.heavyRain) {
      add('waterproof-shoes', 'Waterproof shoes', 'Weather gear', 1, w.heavyRain ? 'Heavy rain expected' : 'Several wet days');
      add('dry-bags', 'Plastic / dry bags for wet clothes', 'Weather gear', 2, 'Wet weather', opt);
    }
    if (w.snowyDays >= 1) add('snow-boots', 'Snow boots', 'Weather gear', 1, `Snow on ${w.snowyDays} day${w.snowyDays > 1 ? 's' : ''}`);
    if (w.maxWind >= 40) add('windbreaker', 'Windbreaker', 'Weather gear', 1, `Gusts up to ${w.maxWind} km/h`);
    const h = w.avgHumidity;
    const humid = h != null ? h >= 75 : w.rainyDays >= 1;
    if (w.avgHigh >= 24 && humid) {
      const why = h != null ? `Warm & humid (${h}% humidity)` : 'Warm & humid';
      add('repellent', 'Insect repellent', 'Health', 1, why);
      add('quick-dry-tops', 'Quick-dry / moisture-wicking tops', 'Clothing', 2, why, opt);
    }
    if (h != null && h <= 40) {
      add('lip-balm', 'Lip balm', 'Toiletries', 1, `Dry air (${h}% humidity)`);
      add('skincare', 'Skincare / moisturiser', 'Toiletries', 1, `Dry air (${h}% humidity)`);
    }
  }

  // ── Toiletries & health ──
  add('toothbrush', 'Toothbrush', 'Toiletries');
  add('toothpaste', 'Toothpaste', 'Toiletries');
  add('deodorant', 'Deodorant', 'Toiletries');
  add('shampoo', 'Shampoo & conditioner (travel size)', 'Toiletries', 1, undefined, opt);
  add('bodywash', 'Body wash', 'Toiletries', 1, undefined, opt);
  add('hairbrush', 'Hairbrush / comb', 'Toiletries');
  add('razor', 'Razor', 'Toiletries');
  add('skincare', 'Skincare / moisturiser', 'Toiletries', 1, undefined, opt);
  add('meds', 'Personal medication', 'Health', 1, undefined, ess);
  add('painkillers', 'Pain relievers', 'Health');
  add('plasters', 'Plasters & basic first aid', 'Health');
  add('sanitizer', 'Hand sanitiser', 'Health', 1, undefined, opt);

  // ── Electronics ──
  add('phone-charger', 'Phone charger', 'Electronics', 1, undefined, ess);
  add('power-bank', 'Power bank', 'Electronics');
  add('headphones', 'Headphones', 'Electronics', 1, undefined, opt);
  const plug = adapterAdvice(home, destCode);
  if (plug?.needed) add('adapter', plug.name, 'Electronics', 1, plug.reason, ess);

  // ── Transport ──
  if (trip.transport === 'plane') {
    add('liquids-bag', 'Clear liquids bag (≤100 ml)', 'Travel', 1, 'Flying');
    add('neck-pillow', 'Neck pillow', 'Travel', 1, 'Flying', opt);
    add('earplugs', 'Earplugs & eye mask', 'Travel', 1, 'Flying', opt);
    add('boarding', 'Boarding pass', 'Documents', 1, 'Flying', { essential: true, consumable: true });
  }
  if (trip.transport === 'car') {
    add('license', "Driver's licence", 'Documents', 1, 'Driving', ess);
    add('car-mount', 'Phone car mount & cable', 'Travel', 1, 'Driving');
    add('snacks', 'Road-trip snacks', 'Travel', 1, 'Driving', used);
  }
  if (trip.transport === 'train') {
    add('tickets', 'Train tickets', 'Documents', 1, 'Train travel', { essential: true, consumable: true });
    add('snacks', 'Snacks for the journey', 'Travel', 1, 'Train travel', used);
  }

  // ── Trip type ──
  if (business) {
    const workDays = trip.type === 'business' ? days : Math.ceil(days / 2);
    add('blazer', 'Blazer / suit', 'Business', 1, 'Business trip');
    add('dress-shirts', 'Dress shirts / blouses', 'Business', Math.min(workDays, light ? 4 : 7), 'Business trip');
    add('dress-shoes', 'Dress shoes', 'Business', 1, 'Business trip');
    add('belt', 'Belt', 'Business', 1, 'Business trip');
    add('laptop', 'Laptop & charger', 'Business', 1, 'Business trip', ess);
    add('cards', 'Business cards', 'Business', 1, 'Business trip', opt);
    add('notebook', 'Notebook & pen', 'Business', 1, 'Business trip', opt);
  }

  // ── Activities ──
  const halfDays = Math.max(1, Math.ceil(days / 2));
  if (has('beach')) {
    add('swimsuit', 'Swimsuit', 'Activities', light ? 1 : 2, 'Beach');
    add('beach-towel', 'Beach towel', 'Activities', 1, 'Beach');
    add('flipflops', 'Flip-flops', 'Activities', 1, 'Beach');
    add('beach-bag', 'Beach bag', 'Activities', 1, 'Beach', opt);
    add('after-sun', 'After-sun lotion', 'Toiletries', 1, 'Beach', opt);
    add('sunscreen', 'Sunscreen (SPF 30+)', 'Toiletries', 1, 'Beach');
    add('phone-pouch', 'Waterproof phone pouch', 'Activities', 1, 'Beach', opt);
  }
  if (has('swimming')) {
    add('swimsuit', 'Swimsuit', 'Activities', 1, 'Swimming');
    add('goggles', 'Swim goggles', 'Activities', 1, 'Swimming');
    add('quickdry', 'Quick-dry towel', 'Activities', 1, 'Swimming');
  }
  if (has('snorkeling')) {
    add('snorkel', 'Snorkel & mask', 'Activities', 1, 'Snorkelling / diving');
    add('rash-guard', 'Rash guard', 'Activities', 1, 'Snorkelling / diving');
    add('reef-sunscreen', 'Reef-safe sunscreen', 'Toiletries', 1, 'Snorkelling / diving');
    add('swimsuit', 'Swimsuit', 'Activities', 1, 'Snorkelling / diving');
    add('water-shoes', 'Water shoes', 'Activities', 1, 'Snorkelling / diving', opt);
    add('dive-cert', 'Dive certification card', 'Documents', 1, 'Snorkelling / diving', opt);
  }
  if (has('surfing')) {
    add('wetsuit', 'Wetsuit / rash guard', 'Activities', 1, 'Surfing');
    add('surf-wax', 'Surf wax', 'Activities', 1, 'Surfing', { optional: true, consumable: true });
    add('reef-sunscreen', 'Reef-safe sunscreen', 'Toiletries', 1, 'Surfing');
    add('swimsuit', 'Swimsuit', 'Activities', 1, 'Surfing');
    add('quickdry', 'Quick-dry towel', 'Activities', 1, 'Surfing');
  }
  if (has('sailing')) {
    add('boat-shoes', 'Non-slip boat shoes', 'Activities', 1, 'Sailing');
    add('windbreaker', 'Windbreaker', 'Weather gear', 1, 'Sailing');
    add('seasick', 'Seasickness tablets', 'Health', 1, 'Sailing');
    add('dry-bag', 'Waterproof dry bag', 'Activities', 1, 'Sailing');
    add('sunglasses', 'Sunglasses', 'Weather gear', 1, 'Sailing');
  }
  if (has('fishing')) {
    add('fishing-licence', 'Fishing licence', 'Documents', 1, 'Fishing');
    add('tackle', 'Rod, reel & tackle', 'Activities', 1, 'Fishing');
    add('sunhat', 'Sun hat / cap', 'Weather gear', 1, 'Fishing');
    add('repellent', 'Insect repellent', 'Health', 1, 'Fishing');
  }
  if (has('hiking')) {
    add('hiking-boots', 'Hiking boots', 'Activities', 1, 'Hiking');
    add('daypack', 'Daypack', 'Activities', 1, 'Hiking');
    add('hiking-socks', 'Hiking socks', 'Activities', Math.min(days, light ? 2 : 4), 'Hiking');
    add('water-bottle', 'Reusable water bottle', 'Travel', 1, 'Hiking');
    add('trail-snacks', 'Trail snacks', 'Activities', 1, 'Hiking', used);
    add('offline-maps', 'Offline maps downloaded', 'Activities', 1, 'Hiking');
    add('repellent', 'Insect repellent', 'Health', 1, 'Hiking');
    if (w && w.rainyDays >= 1) add('rain-shell', 'Packable rain shell', 'Activities', 1, 'Hiking in the rain');
  }
  if (has('climbing')) {
    add('climbing-shoes', 'Climbing shoes', 'Activities', 1, 'Climbing');
    add('harness', 'Harness & chalk bag', 'Activities', 1, 'Climbing');
    add('climbing-helmet', 'Climbing helmet', 'Activities', 1, 'Climbing');
    add('finger-tape', 'Finger tape', 'Activities', 1, 'Climbing', used);
  }
  if (has('skiing')) {
    add('ski-jacket', 'Ski jacket', 'Activities', 1, 'Skiing');
    add('ski-pants', 'Ski pants', 'Activities', 1, 'Skiing');
    add('thermals', 'Thermal base layers', 'Clothing', light ? 1 : 2, 'Skiing');
    add('ski-gloves', 'Ski gloves', 'Activities', 1, 'Skiing');
    add('ski-goggles', 'Ski goggles', 'Activities', 1, 'Skiing');
    add('ski-socks', 'Ski socks', 'Activities', Math.min(days, light ? 3 : 5), 'Skiing');
    add('neck-gaiter', 'Neck gaiter', 'Activities', 1, 'Skiing');
    add('sunscreen', 'Sunscreen (SPF 30+)', 'Toiletries', 1, 'High-altitude sun');
  }
  if (has('running') || has('gym') || has('tennis') || has('yoga')) {
    const why = ['running', 'gym', 'tennis', 'yoga'].filter((a) => has(a as Activity)).map((a) => a[0].toUpperCase() + a.slice(1)).join(', ');
    if (!has('yoga') || has('running') || has('gym') || has('tennis'))
      add('trainers', 'Running / training shoes', 'Activities', 1, why);
    add('workout', 'Workout clothes', 'Activities', light ? Math.min(2, halfDays) : halfDays, why);
    add('sports-socks', 'Sports socks', 'Activities', light ? Math.min(2, halfDays) : halfDays, why);
  }
  if (has('tennis')) add('racket', 'Tennis racket', 'Activities', 1, 'Tennis');
  if (has('yoga')) add('yoga-mat', 'Travel yoga mat', 'Activities', 1, 'Yoga', opt);
  if (has('golf')) {
    add('golf-shoes', 'Golf shoes', 'Activities', 1, 'Golf');
    add('golf-glove', 'Golf glove', 'Activities', 1, 'Golf');
    add('polo', 'Polo shirts', 'Activities', light ? 1 : 2, 'Golf');
    add('golf-balls', 'Golf balls & tees', 'Activities', 1, 'Golf', { optional: true, consumable: true });
  }
  if (has('cycling')) {
    add('helmet', 'Bike helmet', 'Activities', 1, 'Cycling');
    add('padded-shorts', 'Padded cycling shorts', 'Activities', 1, 'Cycling');
    add('bike-lights', 'Bike lights', 'Activities', 1, 'Cycling');
  }
  if (has('camping')) {
    add('tent', 'Tent', 'Activities', 1, 'Camping');
    add('sleeping-bag', 'Sleeping bag', 'Activities', 1, 'Camping');
    add('sleeping-mat', 'Sleeping mat', 'Activities', 1, 'Camping');
    add('headlamp', 'Headlamp', 'Activities', 1, 'Camping');
    add('multitool', 'Multi-tool', 'Activities', 1, 'Camping');
    add('stove', 'Camping stove & fuel', 'Activities', 1, 'Camping');
  }
  if (has('sightseeing')) {
    add('daypack', 'Daypack', 'Activities', 1, 'Sightseeing');
    add('walking-shoes', 'Comfortable walking shoes', 'Clothing', 1, 'Sightseeing');
    add('city-pass', 'City pass / museum tickets', 'Documents', 1, 'Sightseeing', { optional: true, consumable: true });
    add('power-bank', 'Power bank', 'Electronics', 1, 'Long days out');
  }
  if (has('themepark')) {
    add('park-tickets', 'Theme park tickets', 'Documents', 1, 'Theme park', { essential: true, consumable: true });
    add('poncho', 'Rain poncho', 'Weather gear', 1, 'Theme park (water rides)', opt);
    add('power-bank', 'Power bank', 'Electronics', 1, 'Theme park');
    add('water-bottle', 'Reusable water bottle', 'Travel', 1, 'Theme park');
  }
  if (has('spa')) {
    add('swimsuit', 'Swimsuit', 'Activities', 1, 'Spa / wellness');
    add('flipflops', 'Flip-flops', 'Activities', 1, 'Spa / wellness');
  }
  if (has('festival')) {
    add('festival-tickets', 'Festival tickets / wristband', 'Documents', 1, 'Festival', { essential: true, consumable: true });
    add('festival-earplugs', 'Hearing protection earplugs', 'Health', 1, 'Festival');
    add('poncho', 'Rain poncho', 'Weather gear', 1, 'Festival');
    add('power-bank', 'Power bank', 'Electronics', 1, 'Festival');
    add('bumbag', 'Bum bag / small crossbody', 'Activities', 1, 'Festival', opt);
    add('wipes', 'Wet wipes', 'Toiletries', 1, 'Festival', used);
    if (w && w.rainyDays >= 1) add('wellies', 'Wellies / rain boots', 'Weather gear', 1, 'Muddy festival grounds');
  }
  if (has('cruise')) {
    add('cruise-docs', 'Cruise documents & boarding card', 'Documents', 1, 'Cruise', ess);
    add('formal-outfit', 'Formal night outfit', 'Clothing', 1, 'Cruise formal nights');
    add('seasick', 'Seasickness tablets', 'Health', 1, 'Cruise');
    add('swimsuit', 'Swimsuit', 'Activities', 1, 'Cruise');
    add('lanyard', 'Lanyard for keycard', 'Travel', 1, 'Cruise', opt);
  }
  if (has('wedding')) {
    add('wedding-outfit', 'Wedding outfit', 'Clothing', 1, 'Wedding', ess);
    add('dress-shoes', 'Dress shoes', 'Clothing', 1, 'Wedding');
    add('accessories', 'Accessories / jewellery', 'Clothing', 1, 'Wedding');
    add('gift', 'Gift & card', 'Other', 1, 'Wedding', used);
    add('steamer', 'Travel steamer', 'Electronics', 1, 'Wrinkle-free outfit', opt);
  }
  if (has('formal')) {
    add('formal-outfit', 'Formal outfit', 'Clothing', 1, 'Formal event');
    add('dress-shoes', 'Dress shoes', 'Clothing', 1, 'Formal event');
    add('accessories', 'Accessories / jewellery', 'Clothing', 1, 'Formal event', opt);
  }
  if (has('nightlife')) {
    add('going-out', 'Going-out outfits', 'Clothing', light ? 1 : Math.max(1, Math.ceil(days / 3)), 'Nights out');
    add('nice-shoes', 'Nice shoes', 'Clothing', 1, 'Nights out');
  }
  if (has('remotework')) {
    add('laptop', 'Laptop & charger', 'Business', 1, 'Remote work', ess);
    add('headset', 'Headset / earbuds with mic', 'Electronics', 1, 'Remote work');
    add('mouse', 'Travel mouse', 'Electronics', 1, 'Remote work', opt);
    add('extension', 'Travel extension lead', 'Electronics', 1, 'Remote work', opt);
  }
  if (has('photography')) {
    add('camera', 'Camera', 'Electronics', 1, 'Photography');
    add('camera-batteries', 'Spare batteries & charger', 'Electronics', 1, 'Photography');
    add('memory-cards', 'Memory cards', 'Electronics', 2, 'Photography');
  }
  if (has('kids')) {
    add('kids-snacks', 'Kids’ snacks', 'Other', 1, 'Travelling with kids', used);
    add('wipes', 'Wet wipes', 'Toiletries', 1, 'Travelling with kids', used);
    add('kids-entertainment', 'Toys / tablet for kids', 'Other', 1, 'Travelling with kids', opt);
    add('kids-clothes', 'Spare outfits for kids', 'Other', clothesDays + (light ? 1 : 2), 'Travelling with kids');
  }
  if (has('baby')) {
    add('nappies', 'Nappies', 'Other', Math.min(days, 7) * 6, 'Travelling with a baby', used);
    add('baby-wipes', 'Baby wipes', 'Other', 2, 'Travelling with a baby', used);
    add('baby-food', 'Baby food / formula', 'Other', 1, 'Travelling with a baby', { essential: true, consumable: true });
    add('baby-clothes', 'Baby clothes', 'Other', clothesDays + 2, 'Travelling with a baby');
    add('changing-mat', 'Changing mat', 'Other', 1, 'Travelling with a baby');
    add('baby-carrier', 'Baby carrier / sling', 'Other', 1, 'Travelling with a baby');
    add('baby-meds', 'Baby medicine & thermometer', 'Health', 1, 'Travelling with a baby', ess);
    add('travel-cot', 'Travel cot', 'Other', 1, 'Travelling with a baby', opt);
  }
  if (has('pets')) {
    add('pet-docs', 'Pet passport / vaccination records', 'Documents', 1, 'Travelling with a pet', ess);
    add('pet-food', 'Pet food', 'Other', 1, 'Travelling with a pet', used);
    add('pet-bowls', 'Food & water bowls', 'Other', 1, 'Travelling with a pet');
    add('leash', 'Leash & harness', 'Other', 1, 'Travelling with a pet');
    add('poop-bags', 'Poop bags', 'Other', 1, 'Travelling with a pet', used);
    add('pet-bed', 'Pet bed / blanket', 'Other', 1, 'Travelling with a pet', opt);
  }

  return [...out.values()];
}

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const newId = uid;

const recToItem = (r: Rec): PackItem => ({ id: uid(), packed: false, ...r });

const alwaysToItem = (a: AlwaysItem): PackItem => ({
  id: uid(),
  name: a.name,
  category: a.category,
  qty: a.qty,
  packed: false,
  custom: true,
  reason: 'On your always-pack list',
});

/** Fresh list for a new trip: recommendations + the user's always-pack items + any carried-over items. */
export function buildItems(trip: TripInput, always: AlwaysItem[] = [], carry: PackItem[] = []): PackItem[] {
  const recs = recommend(trip).map(recToItem);
  const names = new Set(recs.map((r) => r.name.toLowerCase()));
  const extras: PackItem[] = [];
  for (const it of [...carry.map((c) => ({ ...c, id: uid(), packed: false, repacked: false })), ...always.map(alwaysToItem)]) {
    const n = it.name.toLowerCase();
    if (names.has(n)) continue;
    names.add(n);
    extras.push(it);
  }
  return [...recs, ...extras];
}

/**
 * Re-run recommendations (weather refresh, packing level change) while keeping
 * custom items, packed state and quantities the user edited.
 */
export function mergeItems(trip: Trip, recs: Rec[]): PackItem[] {
  const recByKey = new Map(recs.map((r) => [r.key, r]));
  const kept = trip.items.filter((i) => i.custom || (i.key && (recByKey.has(i.key) || i.packed)));
  const keptKeys = new Set(kept.map((i) => i.key));
  const updated = kept.map((i) => {
    const r = i.key ? recByKey.get(i.key) : undefined;
    if (!r) return i;
    return { ...i, name: r.name, reason: r.reason, qty: i.qtyEdited ? i.qty : r.qty, consumable: i.consumable ?? r.consumable, essential: i.essential ?? r.essential };
  });
  const added = recs.filter((r) => !keptKeys.has(r.key) && !trip.dismissedKeys.includes(r.key)).map(recToItem);
  return [...updated, ...added];
}
