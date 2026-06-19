# Changelog

All notable changes to the HustleOn app are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Added
- **CHANGELOG.md** – This file. All future changes will be logged here.
- **Supplement tracking** – `Supplement` type in `src/types/index.ts`; store state `supplements`, `addSupplement`, `removeSupplement`, `toggleSupplementTaken` in `src/store/index.ts`; persisted and seeded with default supplements (Vitamin D, Multivitamin, Protein) when empty. Workout screen shows list with taken-today toggle and remove; "Add Supplement" adds a new entry.
- **Dummy trends when no data** – Summary screen: when no workouts, shows sample stat card values (8, 3, 2.1, 72), sample weekly breakdown text, and sample workout-day distribution bars. BMI Trends tab: when fewer than 2 BMI records, shows sample weight-trend bars (7 bars) and sample prediction card.

### Changed
- (None this session)

### Fixed
- (None this session)

---

## 2026-02-09 (earlier session)

### Added
- **Theme typography and spacing** – `FONTS` and expanded `SIZES` in `src/constants/theme.ts` (display, h1–h3, body, bodySmall, caption, overline; bold/semibold/medium/regular; xs–xxl spacing; iconSm/iconMd/iconLg).
- **Consistent font/size usage** – WorkoutTrackerScreen, SummaryScreen, CalorieTrackerScreen, and ProfileScreen now use `FONTS` and `SIZES` from the theme for headings, body text, spacing, and icons.

### Changed
- **iOS dev script** – `npm run ios` now runs with `--localhost` so the simulator connects to Metro at `127.0.0.1:8081` and avoids "network connection was lost" on LAN.
- **Border radius and card padding** – `SIZES.borderRadius` set to 12, `SIZES.cardPadding` to 18.

### Fixed
- **iOS simulator not opening** – Clarified that `npm run start` only starts Metro; use `npm run ios` (or press `i` after start) to open the iOS simulator.
- **iOS "network connection was lost"** – Fixed by using `expo start --ios --localhost` so the app connects via localhost.

---

## 2026-02-09 (header revert)

### Changed
- **Workout header** – Restored "Gym Tracker" title and "Build your fitness habit" subtitle (reverted the earlier "Hustle On" / no-subtitle change).

---

*Entries above "Unreleased" are grouped by session; new changes will be added under [Unreleased].*
