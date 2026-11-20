# SharedSpace — Android app

A private space for two, kept on one phone: shared inbox, gallery, document locker,
notepad (with photos and coloured text), contacts, special dates and calculated
Vedic Kundalis. 2000s Vice City look. Nothing is uploaded anywhere.

Kundlis and Natal charts: once both charts are created and shared, **Compatibility** opens first —
Ashtakoota Guna Milan (36 points, with selectable traditional roles), Manglik check,
a two-ring compatibility map, each other's planets in your houses, and every position
side by side. Each person also gets **Explained** (Lagna, Rashi, Nakshatra, Pada, all
nine grahas, all twelve houses, yogas, current Dasha) and **Forecast** (today, 7 days,
30 days, 12 months from transits, Tara bala, Chandrashtama, Sade Sati and Dasha).
These are traditional interpretations, not scientific predictions.

Each section has its own drawn backdrop: Inbox (Ocean Drive afternoon), Gallery
(sunset over water), Locker (downtown at night), Special dates (dusk coastline) and
everything under More (magenta skyline).

```
src/              the app (HTML/CSS/JS) — also used by the claude.ai version
build.mjs         builds src/ into android/app/src/main/assets/www/index.html
android/          Android project (WebView shell, targets API 36, Android 10+)
store/            Google Play icon, feature graphic and phone screenshots
test/             engine, time-zone and browser tests
.github/workflows/android.yml   builds the APK on GitHub
firebase/         optional: rules for a future two-phone sync (not used now)
```

## Get the APK

Every push to `main` builds the app automatically (about 5 minutes), or run it by hand:
**Actions → Build Vice Space for Android → Run workflow**. Open the finished run and
download **ViceSpace-android-N** under *Artifacts* (it's a zip with the APK inside).

## Install on your phone

1. Copy the `.apk` to the phone (Google Drive, email, USB) and tap it.
2. Allow **Install unknown apps** for the app you opened it from, then **Install**.
3. Open Vice Space, enter both names, and you're in. Android 10 or newer.

Updates install over the old version and keep your data — as long as every build is
signed with the same key (see below). Uninstalling the app deletes its data, so use
**Settings → Download my data** now and then.

## Your data

Everything lives in the app's private storage on the phone: messages, notes and
details in WebView storage, photos and files in the app's database. Two people can
share one phone and switch **Writing as** at the top of the screen.

## Signing (needed for Google Play, recommended for updates)

Without secrets the workflow builds a debug APK, which is fine to install and try.
For a stable key (and for Google Play), add four repository secrets in
**Settings → Secrets and variables → Actions** using the values in `signing-secrets.txt`:
`ENKO_KEYSTORE_B64`, `ENKO_STORE_PASSWORD`, `ENKO_KEY_ALIAS`, `ENKO_KEY_PASSWORD`.
The next build then produces a signed `…-release.apk` and a `…-release.aab` for Play.
Note: an app signed with a different key can't update over the old one — switch
before you start using the app for real, or uninstall first (after downloading your data).

## Google Play (optional)

1. Developer account at play.google.com/console (one-time US$25 + identity check).
2. **Create app** → *Vice Space* → Free. Upload the `.aab` under
   **Testing → Internal testing** and add your Google accounts as testers
   (up to 100 testers, no review wait). Install from the opt-in link.
3. A public listing on a personal account created after 13 Nov 2023 first needs a
   closed test with at least 12 testers for 14 days.
4. Listing assets: `store/play-icon-512.png`, `store/play-feature-graphic-1024x500.png`,
   `store/screens/*.png`. Privacy policy: publish `PRIVACY.md` (e.g. Google Docs →
   Publish to web). Data safety: the app collects no data — everything stays on the device.

## Change the app

Edit files in `src/`, push, download the new build. The version number goes up with
every build automatically.

## Tests

```
node test/astro.test.js      # chart engine vs. published examples and known events
node test/tz.test.js         # historical offsets, DST gaps and overlaps
node build.mjs --android && node test/notes-rich.mjs   # phone-only setup + rich notes in Chrome (needs Playwright)
```
