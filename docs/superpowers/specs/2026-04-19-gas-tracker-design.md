# Gas Tracker — Design Spec

**Date:** 2026-04-19
**Status:** Approved pending user review

## Overview

A single-user Progressive Web App for tracking vehicle fuel fill-ups and oil changes. Replaces an existing Google Form + Sheet workflow that has ~7 years of fill-up history. Installable on mobile home screen, online-first with basic offline shell caching.

## Goals

- Fast entry of gas fill-ups and oil changes from a phone
- Multi-vehicle support with last-used-vehicle default (no picker every time)
- Visual history: charts (MPG, price, monthly spend), lifetime totals, scrollable history
- Miles-since-last-oil-change display per vehicle
- One-time import of existing `Gas tracking.xlsx` data (tagged to "Car 1")

## Non-goals (v1)

- Oil change reminders / push notifications (user opted out — display only)
- Offline writes with queue-and-sync (deferred to v1.1)
- Multi-user / sharing / family accounts
- Tracking non-oil maintenance (tires, brakes, etc.)
- Fuel grade, station, receipt photos

## Stack

| Layer | Choice |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS |
| Charts | Recharts |
| PWA | `vite-plugin-pwa` (Workbox under the hood) |
| Backend | Supabase (Postgres + Auth + RLS) |
| Auth | Supabase magic-link email |
| Hosting | Vercel (free tier) |
| Testing | Vitest (unit), manual QA checklist |

## Architecture

```
React PWA (Vercel)  ──https──▶  Supabase
                                 ├─ Auth (magic link)
                                 └─ Postgres + RLS
```

Single-page app. All data access goes through `@supabase/supabase-js` client. RLS policies enforce `auth.uid() = user_id` on every row. No backend server owned by us; Supabase is the full backend.

## Data model

All tables have `user_id uuid references auth.users(id)` and RLS policy `auth.uid() = user_id` for select/insert/update/delete.

### `vehicles`

| column | type | notes |
|---|---|---|
| id | uuid primary key | `gen_random_uuid()` default |
| user_id | uuid | FK auth.users |
| name | text not null | e.g. "Honda CR-V" |
| is_default | boolean default false | Enforced by app logic: only one default per user at a time (app sets others false on update) |
| created_at | timestamptz default now() | |

### `fill_ups`

| column | type | notes |
|---|---|---|
| id | uuid primary key | |
| user_id | uuid | |
| vehicle_id | uuid | FK vehicles, ON DELETE CASCADE |
| date | date not null | |
| mileage | integer not null | odometer reading |
| gallons | numeric(8,3) not null | 3 decimal places (matches source data) |
| price_per_gallon | numeric(6,3) not null | 3 decimal places |
| total_price | numeric(8,2) not null | stored (not generated) — user may enter total and we reconcile |
| created_at | timestamptz default now() | |

Index: `(vehicle_id, mileage)` — MPG calc reads previous entry by mileage within vehicle.

**MPG is computed at read time**, never stored: `(current.mileage - previous.mileage) / current.gallons` where "previous" is the prior fill-up for the same vehicle ordered by mileage. Keeps values correct when entries are backfilled or edited.

### `oil_changes`

| column | type | notes |
|---|---|---|
| id | uuid primary key | |
| user_id | uuid | |
| vehicle_id | uuid | FK vehicles, ON DELETE CASCADE |
| date | date not null | |
| mileage | integer | nullable — some legacy entries lack it |
| notes | text | "Kelly oil", "DIY 5w-30", etc. |
| created_at | timestamptz default now() | |

## Screens

Bottom-nav four-tab layout on mobile.

### 1. Add (default landing)

- Vehicle selector at top — shows last-used vehicle (persisted in `localStorage` key `lastVehicleId`, falls back to the default vehicle).
- Two large buttons: "Fill-up" and "Oil change" → reveal respective form below.
- **Fill-up form fields:** Date (defaults today), Mileage, Gallons, Price/gal, Total price. All three money/volume fields are independently editable. Gallons × price/gal auto-populates Total on first entry, but the user can overwrite any field without reconciliation (gas-pump receipts routinely show a total that differs from gallons × price/gal by a cent due to rounding — we trust what the user typed).
- **Oil change form fields:** Date (defaults today), Mileage (optional), Notes (optional).
- Save → success toast → form resets, user stays on Add screen.

### 2. History

- Segmented control: All / Fill-ups / Oil changes.
- Vehicle filter pills above the list (All, plus one per vehicle).
- Reverse-chronological list; swipe-left reveals Edit and Delete actions.
- Fill-up row: date · mileage · gallons · $ total · computed MPG.
- Oil row: date · mileage (if present) · notes · "X,XXX mi since previous oil change" (if previous exists).

### 3. Stats

- Per-vehicle cards at top of screen, one per vehicle: total miles driven (last mileage − first mileage), lifetime fuel spend, average MPG (total miles ÷ total gallons), total gallons, last fill-up date, miles since last oil change.
- Charts below (Recharts):
  - MPG over time — line, separate series per vehicle
  - Price per gallon over time — line
  - Monthly fuel spend — bar (summed across vehicles)
- Time-range toggle: 3 months / 1 year / all-time.

### 4. Settings

- Vehicles: list with add, rename, delete, set-default actions.
- Account: shows email; Sign out button.
- Data: Export CSV (fill-ups + oil changes, one file).

## Data import (one-time script)

Script: `scripts/import-xlsx.ts`, run locally with `tsx scripts/import-xlsx.ts <path-to-xlsx>` after the DB is provisioned and the user has signed in at least once (to seed the auth user row).

Behavior:
1. Parse `.xlsx` via the `xlsx` npm package.
2. Create a vehicle row named "Car 1" with `is_default = true` (if no vehicles exist yet).
3. Rows with numeric `mileage`, `gallons`, and `price` → insert into `fill_ups` tagged to Car 1. Excel serial dates converted to ISO dates.
4. Rows whose only content is a milestone string (e.g. "Kelly oil 12/27 63k", "Changed oil 5/31/21", "Changed oil 8/25") → parse what we can:
   - Extract a date if the string contains one; otherwise leave `date` as the row's own date if present, else skip.
   - Extract a mileage if the string contains one (e.g. "63k" → 63000).
   - Whole original string → `notes`.
   - Insert into `oil_changes` tagged to Car 1.
5. "Missed an entry above this line" strings → skip, log to stdout so the user can eyeball.
6. Final stdout summary: `Imported N fill-ups, M oil changes, skipped K rows.`

Script is idempotent-ish: re-running would duplicate. User is expected to run it once. A flag `--dry-run` prints what would be inserted without writing.

## PWA behavior

- `vite-plugin-pwa` generates manifest + service worker.
- Manifest: name "Gas Tracker", short name "Gas", icons (192/512 PNG + maskable), theme color, standalone display mode.
- Service worker caches the built app shell so the app opens instantly offline (reads still fail without network — shown as a "You're offline — data will load when reconnected" banner).
- Install prompt surfaced via custom "Install" button in Settings on browsers that support `beforeinstallprompt`.

## Error handling

- All Supabase errors surface as toasts with a human message and (where safe) a Retry button.
- Forms preserve their state on failed submit — user never retypes.
- Network errors on reads show an inline retry control; the stale cached view stays visible.
- Import script exits non-zero on parse failure and prints the offending row; no partial imports (wrap inserts in a single batch per table).

## Testing

**Unit (Vitest):**
- MPG calculation: correct value; null for first entry; handles out-of-order mileage.
- Fill-up form auto-populate: gallons × price/gal writes to total on first entry but does not overwrite a user-typed total.
- Import script mapping: sample xlsx → expected row counts and values.

**RLS verification:**
- Create a second test Supabase user; confirm they cannot read or write the first user's rows via direct client query.

**Manual QA checklist (run before shipping):**
- Add fill-up on phone form factor — saves, toast fires, form resets.
- Add oil change — saves.
- Switch vehicles — default persists across reloads.
- Edit and delete from History.
- History filter by vehicle works.
- Stats charts render with and without data.
- Install to home screen on iOS Safari and Android Chrome.
- App shell loads offline.
- Sign out → magic link re-auth works.

## Repo layout

```
C:\Users\joeka\Documents\claude\GasTracker\
├── src/
│   ├── lib/
│   │   ├── supabase.ts          # client + typed helpers
│   │   ├── mpg.ts               # MPG calculation
│   │   └── db.ts                # query/mutation wrappers
│   ├── components/
│   │   ├── FillUpForm.tsx
│   │   ├── OilChangeForm.tsx
│   │   ├── HistoryList.tsx
│   │   ├── StatsCards.tsx
│   │   ├── Charts.tsx
│   │   └── VehiclePicker.tsx
│   ├── pages/
│   │   ├── Add.tsx
│   │   ├── History.tsx
│   │   ├── Stats.tsx
│   │   └── Settings.tsx
│   ├── App.tsx
│   └── main.tsx
├── scripts/
│   └── import-xlsx.ts
├── supabase/
│   └── migrations/              # SQL for tables, policies, indexes
├── public/
│   ├── icons/                   # 192, 512, maskable
│   └── manifest.webmanifest     # generated by plugin but committed icons
├── docs/
│   └── superpowers/
│       └── specs/
│           └── 2026-04-19-gas-tracker-design.md
├── tests/                       # Vitest
├── .env.local.example           # SUPABASE_URL, SUPABASE_ANON_KEY
├── CLAUDE.md
├── README.md
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.ts
```

## Open / deferred

- **Offline writes (v1.1):** queue failed inserts in IndexedDB, retry on `online` event. Deferred to keep v1 scope tight.
- **Oil change reminders (not planned):** user opted for display-only; revisit only if asked.
- **Anonymous-to-email upgrade:** not applicable — we picked magic-link from the start.

## Success criteria

- User can install on phone, sign in once with email, and add a fill-up in under 15 seconds.
- Imported history matches source xlsx row count (minus the logged skips).
- RLS verified — second user sees zero rows.
- All Vitest unit tests pass.
- App shell loads offline after first visit.
