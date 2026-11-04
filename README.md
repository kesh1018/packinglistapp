# Packing Pal

A PackPoint-style packing list app for Android. Pick a destination, dates, trip type, transport and activities, and it builds a categorised packing list from the weather at your destination.


## Features
- Weather-based suggestions: rain gear, warm layers, sun protection, snow and wind gear, each with a reason (e.g. "Rain expected on 5 of 14 days")
- **Humidity:** the weather card shows the trip average with a label (Dry, Comfortable, Humid or Very humid) and each day's humidity. Humid heat (75% or more) adds insect repellent and quick-dry tops; dry air (40% or less) adds lip balm and moisturiser
- **Notes per item:** add a note when creating an item or from its ⋯ menu (e.g. "Borrow from Sam"). Notes show under the item and are included when you share
- **Automatic forecast upgrade:** when a trip that was planned using last year's weather comes within the 16-day forecast window (or its forecast is more than 6 hours old), the app fetches the live forecast when you open it, updates the list, and shows a "Forecast updated" banner describing what changed
- 29 activities in 4 groups, trip type and transport; clothing quantities scale with trip length and laundry
- **Travel light / Full list:** light lists re-wear clothes and skip nice-to-haves; you can switch at any time, and quantities you've edited are kept
- **Plug adapters:** names the socket type (e.g. "Type G plug adapter") by comparing your country with the destination, and warns about voltage differences
- **Essentials** (★) such as passport, medication and charger are listed first and named in reminders
- **Reminders:** 3 days before at 18:00, the evening before (naming any unpacked essentials), and a repack nudge on the morning of your last day
- **Repack mode:** a separate checklist for the trip home that hides items used up on the trip (snacks, tickets)
- **Shopping list:** mark items "need to buy"; they show in a "To buy" tab and a card at the top of the trip
- **Always-pack list:** items added to every new trip; items you've added before are offered as quick picks
- **Pack like this:** reuse a trip with new dates, optionally bringing over your custom items
- Add your own items, change quantities, remove items (with undo), share as a text checklist, delete trips (slide to confirm, with undo)
- Everything is stored on the device (Capacitor Preferences)

## Develop
```bash
npm install
npm run dev            # http://localhost:5199
```

## Build for Android
Needs JDK 21 and Android SDK 36. See `CLAUDE.md` for every build, test and lint command.
```bash
npm run check                      # typecheck + lint + unit tests
npm run build && npx cap sync android
cd android && JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home ./gradlew bundleRelease
# → android/app/build/outputs/bundle/release/app-release.aab  (signed if android/keystore.properties exists)
```
