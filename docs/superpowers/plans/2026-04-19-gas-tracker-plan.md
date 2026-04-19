# Gas Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-user PWA that replaces a Google Form gas/oil tracker, with multi-vehicle support, magic-link auth, chart/history views, and a one-time import of 7 years of existing xlsx data.

**Architecture:** React + Vite + TypeScript single-page app calling Supabase (Postgres + Auth + RLS) directly from the browser. Deployed to Vercel. Service worker caches app shell for fast offline open; writes are online-only in v1. `vehicle_id` is the primary partition dimension in the data model; MPG and "miles since last oil change" are computed at read time.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, Recharts, `vite-plugin-pwa`, Supabase (Postgres + Auth), Vitest, Vercel.

**Spec:** `docs/superpowers/specs/2026-04-19-gas-tracker-design.md`

---

## File Map

Tasks below create or modify these files:

```
GasTracker/
├── .env.local.example               # Task 3
├── .gitignore                       # Task 1
├── CLAUDE.md                        # Task 1
├── README.md                        # Task 1
├── index.html                       # Task 1 (Vite default; edit title/meta)
├── package.json                     # Task 1
├── postcss.config.js                # Task 2
├── public/
│   ├── favicon.svg                  # Task 17
│   └── icons/                       # Task 17 (192, 512, maskable)
├── scripts/
│   └── import-xlsx.ts               # Task 18
├── src/
│   ├── App.tsx                      # Task 7
│   ├── components/
│   │   ├── BottomNav.tsx            # Task 7
│   │   ├── Charts.tsx               # Task 15
│   │   ├── FillUpForm.tsx           # Task 11
│   │   ├── HistoryList.tsx          # Task 14
│   │   ├── LoginScreen.tsx          # Task 6
│   │   ├── OilChangeForm.tsx        # Task 12
│   │   ├── StatsCards.tsx           # Task 15
│   │   ├── Toast.tsx                # Task 7
│   │   └── VehiclePicker.tsx        # Task 9
│   ├── index.css                    # Task 2
│   ├── lib/
│   │   ├── db.ts                    # Task 10
│   │   ├── mpg.ts                   # Task 8
│   │   ├── supabase.ts              # Task 5
│   │   ├── types.ts                 # Task 4
│   │   └── vehicle.ts               # Task 9
│   ├── main.tsx                     # Task 1
│   └── pages/
│       ├── Add.tsx                  # Task 13
│       ├── History.tsx              # Task 14
│       ├── Settings.tsx             # Task 16
│       └── Stats.tsx                # Task 15
├── supabase/
│   └── migrations/
│       ├── 0001_initial_schema.sql  # Task 3
│       └── 0002_rls_policies.sql    # Task 3
├── tailwind.config.ts               # Task 2
├── tests/
│   ├── fillup-form.test.ts          # Task 11
│   ├── import-xlsx.test.ts          # Task 18
│   └── mpg.test.ts                  # Task 8
├── tsconfig.json                    # Task 1
├── tsconfig.node.json               # Task 1
└── vite.config.ts                   # Task 1 (updated in Task 17 for PWA)
```

---

## Task 0: Prerequisites (User action)

Before any coding, user needs accounts + one API key pair.

- [ ] **Step 1: Create Supabase project**

Go to https://supabase.com → New project. Choose a free-tier project in a nearby region. Set a DB password and save it.

- [ ] **Step 2: Copy API credentials**

In the Supabase dashboard → Project Settings → API. Copy:
- Project URL (`https://xxxxxxxx.supabase.co`)
- `anon` public API key
- `service_role` secret key (needed for import script; never commit)

- [ ] **Step 3: Create Vercel account (optional for v1 ship — can wait until Task 19)**

Sign up at https://vercel.com with GitHub. Deferred until deploy task.

- [ ] **Step 4: Report to Claude**

Reply with Supabase URL + anon key. Service role key will be needed later for the import script — keep it handy but don't paste until Task 18.

---

## Task 1: Scaffold Vite + React + TypeScript

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `.gitignore`, `README.md`, `CLAUDE.md`

- [ ] **Step 1: Run Vite scaffold**

From `C:\Users\joeka\Documents\claude\GasTracker\`:

```bash
npm create vite@latest . -- --template react-ts
```

Answer "Ignore files and continue" if prompted (the folder has `.git/` and `docs/`).

- [ ] **Step 2: Install dependencies**

```bash
npm install
```

Expected: runs without errors, creates `node_modules/` and `package-lock.json`.

- [ ] **Step 3: Verify dev server boots**

```bash
npm run dev
```

Expected: Vite prints "Local: http://localhost:5173". Open it — should show the default Vite+React page. Stop with `Ctrl+C`.

- [ ] **Step 4: Replace `.gitignore` additions**

Append to `.gitignore`:

```
.env.local
.env.*.local
.vercel
dist
```

- [ ] **Step 5: Set meta + title in `index.html`**

Replace the `<head>` of `index.html`:

```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="theme-color" content="#0f172a" />
  <title>Gas Tracker</title>
</head>
```

- [ ] **Step 6: Write minimal CLAUDE.md**

Create `CLAUDE.md`:

```markdown
# Gas Tracker

Single-user PWA for tracking gas fill-ups and oil changes across multiple vehicles. Replaces an existing Google Form workflow with ~7 years of imported history.

## Stack

- React 18 + TypeScript + Vite
- Tailwind CSS
- Supabase (Postgres + Auth + RLS); magic-link auth
- Recharts for charts
- vite-plugin-pwa for installability
- Vitest for unit tests

## Run

- `npm run dev` — dev server
- `npm run build` — production build
- `npm test` — run unit tests
- `tsx scripts/import-xlsx.ts <path>` — one-time import from xlsx

## Design docs

- Spec: `docs/superpowers/specs/2026-04-19-gas-tracker-design.md`
- Plan: `docs/superpowers/plans/2026-04-19-gas-tracker-plan.md`

## Conventions

- MPG is computed at read time (not stored).
- `lib/db.ts` is the only module that calls Supabase. Components import from it, never from `@supabase/supabase-js` directly.
- All DB tables have `user_id` + RLS policy `auth.uid() = user_id`.
```

- [ ] **Step 7: Write minimal README.md**

Create `README.md`:

```markdown
# Gas Tracker

Personal PWA for logging vehicle fill-ups and oil changes.

## Setup

1. `cp .env.local.example .env.local` and fill in Supabase URL + anon key.
2. `npm install`
3. `npm run dev`

## Deploy

See plan task 19.
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "scaffold vite + react + typescript project"
```

---

## Task 2: Install and configure Tailwind

**Files:**
- Create: `tailwind.config.ts`, `postcss.config.js`
- Modify: `src/index.css`, `src/main.tsx`

- [ ] **Step 1: Install Tailwind**

```bash
npm install -D tailwindcss@3 postcss autoprefixer
npx tailwindcss init -p
```

This creates `tailwind.config.js` and `postcss.config.js`. Rename the JS config to TS:

```bash
mv tailwind.config.js tailwind.config.ts
```

- [ ] **Step 2: Configure `tailwind.config.ts`**

Replace the file contents:

```ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0f172a',
          accent: '#22d3ee',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 3: Replace `src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body, #root {
  height: 100%;
  background: #0f172a;
  color: #e2e8f0;
  -webkit-font-smoothing: antialiased;
  font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
}
```

- [ ] **Step 4: Confirm `src/main.tsx` imports `./index.css`**

Vite's template already imports it. Verify the line:

```tsx
import './index.css';
```

exists in `src/main.tsx`. If not, add it.

- [ ] **Step 5: Smoke test Tailwind**

Replace the contents of `src/App.tsx` temporarily:

```tsx
export default function App() {
  return (
    <div className="h-full flex items-center justify-center">
      <h1 className="text-3xl font-semibold text-brand-accent">Gas Tracker</h1>
    </div>
  );
}
```

Run `npm run dev` and confirm you see the title in cyan on dark background. Stop with `Ctrl+C`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "configure tailwind css with dark theme"
```

---

## Task 3: Database schema + RLS policies

**Context:** We're reusing the existing `Grid` Supabase project (to stay on the free tier — 2-project limit). Tables are prefixed `gas_` so they don't collide with Grid's tables. RLS isolates rows per `auth.uid()`, so Grid and Gas data are mutually invisible even though they share the same DB.

**Files:**
- Create: `supabase/migrations/0001_initial_schema.sql`, `supabase/migrations/0002_rls_policies.sql`, `.env.local.example`, `.env.local` (not committed)

- [ ] **Step 1: Write schema migration**

Create `supabase/migrations/0001_initial_schema.sql`:

```sql
create extension if not exists "pgcrypto";

create table public.gas_vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index gas_vehicles_user_id_idx on public.gas_vehicles(user_id);

create table public.gas_fill_ups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid not null references public.gas_vehicles(id) on delete cascade,
  date date not null,
  mileage integer not null,
  gallons numeric(8,3) not null check (gallons > 0),
  price_per_gallon numeric(6,3) not null check (price_per_gallon >= 0),
  total_price numeric(8,2) not null check (total_price >= 0),
  created_at timestamptz not null default now()
);

create index gas_fill_ups_user_id_idx on public.gas_fill_ups(user_id);
create index gas_fill_ups_vehicle_mileage_idx on public.gas_fill_ups(vehicle_id, mileage);
create index gas_fill_ups_vehicle_date_idx on public.gas_fill_ups(vehicle_id, date);

create table public.gas_oil_changes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid not null references public.gas_vehicles(id) on delete cascade,
  date date not null,
  mileage integer,
  notes text,
  created_at timestamptz not null default now()
);

create index gas_oil_changes_user_id_idx on public.gas_oil_changes(user_id);
create index gas_oil_changes_vehicle_date_idx on public.gas_oil_changes(vehicle_id, date);
```

- [ ] **Step 2: Write RLS migration**

Create `supabase/migrations/0002_rls_policies.sql`:

```sql
alter table public.gas_vehicles enable row level security;
alter table public.gas_fill_ups enable row level security;
alter table public.gas_oil_changes enable row level security;

create policy "gas_vehicles_owner_select" on public.gas_vehicles
  for select using (auth.uid() = user_id);
create policy "gas_vehicles_owner_insert" on public.gas_vehicles
  for insert with check (auth.uid() = user_id);
create policy "gas_vehicles_owner_update" on public.gas_vehicles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "gas_vehicles_owner_delete" on public.gas_vehicles
  for delete using (auth.uid() = user_id);

create policy "gas_fill_ups_owner_select" on public.gas_fill_ups
  for select using (auth.uid() = user_id);
create policy "gas_fill_ups_owner_insert" on public.gas_fill_ups
  for insert with check (auth.uid() = user_id);
create policy "gas_fill_ups_owner_update" on public.gas_fill_ups
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "gas_fill_ups_owner_delete" on public.gas_fill_ups
  for delete using (auth.uid() = user_id);

create policy "gas_oil_changes_owner_select" on public.gas_oil_changes
  for select using (auth.uid() = user_id);
create policy "gas_oil_changes_owner_insert" on public.gas_oil_changes
  for insert with check (auth.uid() = user_id);
create policy "gas_oil_changes_owner_update" on public.gas_oil_changes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "gas_oil_changes_owner_delete" on public.gas_oil_changes
  for delete using (auth.uid() = user_id);
```

- [ ] **Step 3: Apply migrations in Supabase dashboard**

In the Supabase project → SQL Editor → New query. Paste the contents of `0001_initial_schema.sql`, run it. Then new query, paste `0002_rls_policies.sql`, run it.

Expected: both succeed with "Success. No rows returned."

- [ ] **Step 4: Verify tables exist**

In Supabase → Table Editor. Confirm `vehicles`, `fill_ups`, `oil_changes` appear with RLS enabled (shield icon).

- [ ] **Step 5: Create `.env.local.example`**

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

- [ ] **Step 6: Create `.env.local` (not committed)**

Copy from example and fill in the real values from Task 0.

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with real URL and anon key.

- [ ] **Step 7: Commit**

```bash
git add supabase/ .env.local.example
git commit -m "add supabase schema and rls policies"
```

---

## Task 4: TypeScript types

**Files:**
- Create: `src/lib/types.ts`

- [ ] **Step 1: Write the types**

Create `src/lib/types.ts`:

```ts
export type Vehicle = {
  id: string;
  user_id: string;
  name: string;
  is_default: boolean;
  created_at: string;
};

export type FillUp = {
  id: string;
  user_id: string;
  vehicle_id: string;
  date: string;            // ISO date 'YYYY-MM-DD'
  mileage: number;
  gallons: number;
  price_per_gallon: number;
  total_price: number;
  created_at: string;
};

export type OilChange = {
  id: string;
  user_id: string;
  vehicle_id: string;
  date: string;            // ISO date
  mileage: number | null;
  notes: string | null;
  created_at: string;
};

export type NewFillUp = Omit<FillUp, 'id' | 'user_id' | 'created_at'>;
export type NewOilChange = Omit<OilChange, 'id' | 'user_id' | 'created_at'>;
export type NewVehicle = Omit<Vehicle, 'id' | 'user_id' | 'created_at'>;
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "add data model types"
```

---

## Task 5: Supabase client

**Files:**
- Create: `src/lib/supabase.ts`

- [ ] **Step 1: Install Supabase client**

```bash
npm install @supabase/supabase-js
```

- [ ] **Step 2: Write the client singleton**

Create `src/lib/supabase.ts`:

```ts
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.local.example to .env.local and fill in values.');
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
```

- [ ] **Step 3: Verify it builds**

```bash
npx tsc --noEmit
```

Expected: no errors. (If the env vars aren't typed, add to `src/vite-env.d.ts` — Vite usually handles this.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase.ts package.json package-lock.json
git commit -m "add supabase client singleton"
```

---

## Task 6: Login screen (magic link)

**Files:**
- Create: `src/components/LoginScreen.tsx`

- [ ] **Step 1: Write the component**

Create `src/components/LoginScreen.tsx`:

```tsx
import { useState } from 'react';
import { supabase } from '../lib/supabase';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    setErrorMsg('');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      setStatus('error');
      setErrorMsg(error.message);
    } else {
      setStatus('sent');
    }
  }

  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold mb-1">Gas Tracker</h1>
        <p className="text-slate-400 mb-6 text-sm">Sign in with a magic link.</p>

        {status === 'sent' ? (
          <div className="rounded-lg bg-slate-800 p-4 text-sm">
            Check <span className="font-medium">{email}</span> for a sign-in link.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 outline-none focus:border-brand-accent"
            />
            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full rounded-lg bg-brand-accent text-slate-900 font-medium py-2 disabled:opacity-60"
            >
              {status === 'sending' ? 'Sending...' : 'Send magic link'}
            </button>
            {errorMsg && <p className="text-red-400 text-sm">{errorMsg}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/LoginScreen.tsx
git commit -m "add magic-link login screen"
```

---

## Task 7: App shell — auth guard, bottom nav, toast

**Files:**
- Create: `src/components/BottomNav.tsx`, `src/components/Toast.tsx`
- Modify: `src/App.tsx`, `src/main.tsx`

- [ ] **Step 1: Install react-router**

```bash
npm install react-router-dom
```

- [ ] **Step 2: Write Toast component**

Create `src/components/Toast.tsx`:

```tsx
import { createContext, useCallback, useContext, useState } from 'react';

type Toast = { id: number; kind: 'success' | 'error'; message: string };

const ToastCtx = createContext<(t: Omit<Toast, 'id'>) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 3000);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 space-y-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-lg px-4 py-2 text-sm shadow ${
              t.kind === 'success' ? 'bg-emerald-500 text-slate-900' : 'bg-red-500 text-white'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}
```

- [ ] **Step 3: Write BottomNav component**

Create `src/components/BottomNav.tsx`:

```tsx
import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/', label: 'Add' },
  { to: '/history', label: 'History' },
  { to: '/stats', label: 'Stats' },
  { to: '/settings', label: 'Settings' },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-slate-900/95 backdrop-blur border-t border-slate-800 pb-[env(safe-area-inset-bottom)]">
      <ul className="flex">
        {TABS.map((tab) => (
          <li key={tab.to} className="flex-1">
            <NavLink
              end={tab.to === '/'}
              to={tab.to}
              className={({ isActive }) =>
                `block text-center py-3 text-sm ${isActive ? 'text-brand-accent' : 'text-slate-400'}`
              }
            >
              {tab.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

- [ ] **Step 4: Replace `src/App.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { LoginScreen } from './components/LoginScreen';
import { BottomNav } from './components/BottomNav';
import { Add } from './pages/Add';
import { History } from './pages/History';
import { Stats } from './pages/Stats';
import { Settings } from './pages/Settings';

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) return <div className="h-full flex items-center justify-center text-slate-400">Loading…</div>;
  if (session === null) return <LoginScreen />;

  return (
    <div className="h-full flex flex-col">
      <main className="flex-1 overflow-y-auto pb-16">
        <Routes>
          <Route path="/" element={<Add />} />
          <Route path="/history" element={<History />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  );
}
```

- [ ] **Step 5: Update `src/main.tsx`**

Replace contents:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ToastProvider } from './components/Toast';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <App />
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
);
```

- [ ] **Step 6: Create placeholder pages so imports resolve**

Create each of the four files with a stub (they'll be filled in later tasks).

`src/pages/Add.tsx`:

```tsx
export function Add() {
  return <div className="p-4">Add</div>;
}
```

`src/pages/History.tsx`:

```tsx
export function History() {
  return <div className="p-4">History</div>;
}
```

`src/pages/Stats.tsx`:

```tsx
export function Stats() {
  return <div className="p-4">Stats</div>;
}
```

`src/pages/Settings.tsx`:

```tsx
export function Settings() {
  return <div className="p-4">Settings</div>;
}
```

- [ ] **Step 7: Verify app boots, login screen shows, and tabs work after signing in**

```bash
npm run dev
```

Open http://localhost:5173 — should see login screen. Enter your email, click "Send magic link", check email, click link. Back in the app, you should see the four-tab layout. Sign out via `localStorage.clear()` in devtools if you need to re-test. Stop with `Ctrl+C`.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "add app shell with auth guard, bottom nav, and toast"
```

---

## Task 8: MPG calculation (TDD)

**Files:**
- Create: `src/lib/mpg.ts`, `tests/mpg.test.ts`

- [ ] **Step 1: Install Vitest**

```bash
npm install -D vitest
```

Add to `package.json` scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 2: Write failing test**

Create `tests/mpg.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { computeMpg } from '../src/lib/mpg';
import type { FillUp } from '../src/lib/types';

function f(overrides: Partial<FillUp>): FillUp {
  return {
    id: 'x', user_id: 'u', vehicle_id: 'v', created_at: '',
    date: '2025-01-01', mileage: 0, gallons: 0, price_per_gallon: 0, total_price: 0,
    ...overrides,
  };
}

describe('computeMpg', () => {
  it('returns null for the first fill-up (no previous)', () => {
    const entries = [f({ id: 'a', mileage: 10000, gallons: 10 })];
    const result = computeMpg(entries);
    expect(result['a']).toBeNull();
  });

  it('computes mpg as (mileage delta) / gallons for subsequent entries', () => {
    const entries = [
      f({ id: 'a', mileage: 10000, gallons: 10 }),
      f({ id: 'b', mileage: 10250, gallons: 10 }),
    ];
    const result = computeMpg(entries);
    expect(result['b']).toBeCloseTo(25, 3);
  });

  it('handles entries passed in reverse-chronological order (sorts by mileage)', () => {
    const entries = [
      f({ id: 'b', mileage: 10250, gallons: 10 }),
      f({ id: 'a', mileage: 10000, gallons: 10 }),
    ];
    const result = computeMpg(entries);
    expect(result['a']).toBeNull();
    expect(result['b']).toBeCloseTo(25, 3);
  });

  it('returns null when gallons is zero (defensive)', () => {
    const entries = [
      f({ id: 'a', mileage: 10000, gallons: 10 }),
      f({ id: 'b', mileage: 10250, gallons: 0 }),
    ];
    const result = computeMpg(entries);
    expect(result['b']).toBeNull();
  });
});
```

- [ ] **Step 3: Run the test — expect failure**

```bash
npm test
```

Expected: FAIL, "Cannot find module '../src/lib/mpg'" or similar.

- [ ] **Step 4: Write the minimal implementation**

Create `src/lib/mpg.ts`:

```ts
import type { FillUp } from './types';

/**
 * Computes MPG for each fill-up keyed by id.
 * MPG = (current.mileage - previous.mileage) / current.gallons, where
 * "previous" is the prior entry for the same vehicle ordered by mileage ascending.
 * Returns null for the first entry (no previous) or when gallons is zero.
 */
export function computeMpg(fillUps: FillUp[]): Record<string, number | null> {
  const byVehicle = new Map<string, FillUp[]>();
  for (const f of fillUps) {
    const list = byVehicle.get(f.vehicle_id) ?? [];
    list.push(f);
    byVehicle.set(f.vehicle_id, list);
  }

  const result: Record<string, number | null> = {};
  for (const [, list] of byVehicle) {
    list.sort((a, b) => a.mileage - b.mileage);
    list.forEach((entry, i) => {
      if (i === 0 || entry.gallons <= 0) {
        result[entry.id] = null;
      } else {
        const prev = list[i - 1];
        result[entry.id] = (entry.mileage - prev.mileage) / entry.gallons;
      }
    });
  }

  return result;
}
```

- [ ] **Step 5: Run the test — expect pass**

```bash
npm test
```

Expected: PASS, 4 tests green.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "add mpg calculation with unit tests"
```

---

## Task 9: Vehicle picker + last-used helper

**Files:**
- Create: `src/lib/vehicle.ts`, `src/components/VehiclePicker.tsx`

- [ ] **Step 1: Write the helper**

Create `src/lib/vehicle.ts`:

```ts
const KEY = 'lastVehicleId';

export function getLastVehicleId(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setLastVehicleId(id: string): void {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    // ignore — private browsing
  }
}
```

- [ ] **Step 2: Write the VehiclePicker**

Create `src/components/VehiclePicker.tsx`:

```tsx
import type { Vehicle } from '../lib/types';

type Props = {
  vehicles: Vehicle[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function VehiclePicker({ vehicles, selectedId, onSelect }: Props) {
  if (vehicles.length <= 1) return null;
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {vehicles.map((v) => {
        const active = v.id === selectedId;
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => onSelect(v.id)}
            className={`shrink-0 rounded-full px-3 py-1 text-sm border ${
              active ? 'bg-brand-accent text-slate-900 border-brand-accent' : 'border-slate-700 text-slate-300'
            }`}
          >
            {v.name}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Verify compilation**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "add vehicle picker and last-used helper"
```

---

## Task 10: DB layer

**Files:**
- Create: `src/lib/db.ts`

- [ ] **Step 1: Write db.ts**

Create `src/lib/db.ts`:

```ts
import { supabase } from './supabase';
import type { FillUp, NewFillUp, NewOilChange, NewVehicle, OilChange, Vehicle } from './types';

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Not authenticated');
  return data.user.id;
}

// Vehicles
export async function listVehicles(): Promise<Vehicle[]> {
  const { data, error } = await supabase
    .from('gas_vehicles').select('*').order('created_at', { ascending: true });
  if (error) throw error;
  return data as Vehicle[];
}

export async function createVehicle(input: NewVehicle): Promise<Vehicle> {
  const user_id = await requireUserId();
  if (input.is_default) {
    await supabase.from('gas_vehicles').update({ is_default: false }).eq('user_id', user_id);
  }
  const { data, error } = await supabase
    .from('gas_vehicles').insert({ ...input, user_id }).select().single();
  if (error) throw error;
  return data as Vehicle;
}

export async function updateVehicle(id: string, patch: Partial<NewVehicle>): Promise<Vehicle> {
  const user_id = await requireUserId();
  if (patch.is_default) {
    await supabase.from('gas_vehicles').update({ is_default: false }).eq('user_id', user_id).neq('id', id);
  }
  const { data, error } = await supabase
    .from('gas_vehicles').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data as Vehicle;
}

export async function deleteVehicle(id: string): Promise<void> {
  const { error } = await supabase.from('gas_vehicles').delete().eq('id', id);
  if (error) throw error;
}

// Fill-ups
export async function listFillUps(vehicleId?: string): Promise<FillUp[]> {
  let q = supabase.from('gas_fill_ups').select('*').order('date', { ascending: false });
  if (vehicleId) q = q.eq('vehicle_id', vehicleId);
  const { data, error } = await q;
  if (error) throw error;
  return data as FillUp[];
}

export async function createFillUp(input: NewFillUp): Promise<FillUp> {
  const user_id = await requireUserId();
  const { data, error } = await supabase
    .from('gas_fill_ups').insert({ ...input, user_id }).select().single();
  if (error) throw error;
  return data as FillUp;
}

export async function updateFillUp(id: string, patch: Partial<NewFillUp>): Promise<FillUp> {
  const { data, error } = await supabase
    .from('gas_fill_ups').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data as FillUp;
}

export async function deleteFillUp(id: string): Promise<void> {
  const { error } = await supabase.from('gas_fill_ups').delete().eq('id', id);
  if (error) throw error;
}

// Oil changes
export async function listOilChanges(vehicleId?: string): Promise<OilChange[]> {
  let q = supabase.from('gas_oil_changes').select('*').order('date', { ascending: false });
  if (vehicleId) q = q.eq('vehicle_id', vehicleId);
  const { data, error } = await q;
  if (error) throw error;
  return data as OilChange[];
}

export async function createOilChange(input: NewOilChange): Promise<OilChange> {
  const user_id = await requireUserId();
  const { data, error } = await supabase
    .from('gas_oil_changes').insert({ ...input, user_id }).select().single();
  if (error) throw error;
  return data as OilChange;
}

export async function updateOilChange(id: string, patch: Partial<NewOilChange>): Promise<OilChange> {
  const { data, error } = await supabase
    .from('gas_oil_changes').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data as OilChange;
}

export async function deleteOilChange(id: string): Promise<void> {
  const { error } = await supabase.from('gas_oil_changes').delete().eq('id', id);
  if (error) throw error;
}
```

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "add db layer wrapping supabase queries"
```

---

## Task 11: FillUpForm (with auto-populate test)

**Files:**
- Create: `src/components/FillUpForm.tsx`, `tests/fillup-form.test.ts`

- [ ] **Step 1: Write the failing test for auto-populate logic**

The reconciliation rule lives in a pure helper so it can be tested without React. Create `tests/fillup-form.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { autoTotal } from '../src/components/FillUpForm';

describe('autoTotal', () => {
  it('returns gallons * price when total was not user-edited', () => {
    expect(autoTotal({ gallons: 10, pricePerGallon: 3.5, userEditedTotal: false })).toBeCloseTo(35, 2);
  });

  it('returns null (meaning: leave total alone) when user edited total', () => {
    expect(autoTotal({ gallons: 10, pricePerGallon: 3.5, userEditedTotal: true })).toBeNull();
  });

  it('returns null when gallons or price is not a positive number', () => {
    expect(autoTotal({ gallons: 0, pricePerGallon: 3.5, userEditedTotal: false })).toBeNull();
    expect(autoTotal({ gallons: 10, pricePerGallon: 0, userEditedTotal: false })).toBeNull();
    expect(autoTotal({ gallons: NaN, pricePerGallon: 3.5, userEditedTotal: false })).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test — expect failure**

```bash
npm test
```

Expected: FAIL, "Cannot find module '../src/components/FillUpForm'".

- [ ] **Step 3: Write the component**

Create `src/components/FillUpForm.tsx`:

```tsx
import { useState } from 'react';
import { createFillUp } from '../lib/db';
import type { NewFillUp } from '../lib/types';
import { useToast } from './Toast';

type Props = { vehicleId: string; onSaved: () => void };

export function autoTotal(args: {
  gallons: number;
  pricePerGallon: number;
  userEditedTotal: boolean;
}): number | null {
  if (args.userEditedTotal) return null;
  if (!isFinite(args.gallons) || !isFinite(args.pricePerGallon)) return null;
  if (args.gallons <= 0 || args.pricePerGallon <= 0) return null;
  return Math.round(args.gallons * args.pricePerGallon * 100) / 100;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function FillUpForm({ vehicleId, onSaved }: Props) {
  const toast = useToast();
  const [date, setDate] = useState(today());
  const [mileage, setMileage] = useState('');
  const [gallons, setGallons] = useState('');
  const [pricePerGallon, setPricePerGallon] = useState('');
  const [total, setTotal] = useState('');
  const [userEditedTotal, setUserEditedTotal] = useState(false);
  const [saving, setSaving] = useState(false);

  function recomputeTotal(nextGallons: string, nextPrice: string) {
    const auto = autoTotal({
      gallons: parseFloat(nextGallons),
      pricePerGallon: parseFloat(nextPrice),
      userEditedTotal,
    });
    if (auto !== null) setTotal(auto.toFixed(2));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload: NewFillUp = {
      vehicle_id: vehicleId,
      date,
      mileage: parseInt(mileage, 10),
      gallons: parseFloat(gallons),
      price_per_gallon: parseFloat(pricePerGallon),
      total_price: parseFloat(total),
    };
    try {
      await createFillUp(payload);
      toast({ kind: 'success', message: 'Saved' });
      setMileage(''); setGallons(''); setPricePerGallon(''); setTotal('');
      setUserEditedTotal(false); setDate(today());
      onSaved();
    } catch (err) {
      toast({ kind: 'error', message: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Field label="Date">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className={inputCx} />
      </Field>
      <Field label="Mileage">
        <input
          type="number" inputMode="numeric" min={0} required
          value={mileage} onChange={(e) => setMileage(e.target.value)} className={inputCx}
        />
      </Field>
      <Field label="Gallons">
        <input
          type="number" inputMode="decimal" step="0.001" min={0} required
          value={gallons}
          onChange={(e) => { setGallons(e.target.value); recomputeTotal(e.target.value, pricePerGallon); }}
          className={inputCx}
        />
      </Field>
      <Field label="Price / gallon">
        <input
          type="number" inputMode="decimal" step="0.001" min={0} required
          value={pricePerGallon}
          onChange={(e) => { setPricePerGallon(e.target.value); recomputeTotal(gallons, e.target.value); }}
          className={inputCx}
        />
      </Field>
      <Field label="Total price">
        <input
          type="number" inputMode="decimal" step="0.01" min={0} required
          value={total}
          onChange={(e) => { setTotal(e.target.value); setUserEditedTotal(true); }}
          className={inputCx}
        />
      </Field>
      <button type="submit" disabled={saving} className="w-full rounded-lg bg-brand-accent text-slate-900 font-medium py-2 disabled:opacity-60">
        {saving ? 'Saving…' : 'Save fill-up'}
      </button>
    </form>
  );
}

const inputCx = 'w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 outline-none focus:border-brand-accent';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wide text-slate-400">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
```

- [ ] **Step 4: Run the test — expect pass**

```bash
npm test
```

Expected: PASS, all `autoTotal` tests green.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "add fill-up form with auto-populate total"
```

---

## Task 12: OilChangeForm

**Files:**
- Create: `src/components/OilChangeForm.tsx`

- [ ] **Step 1: Write the component**

Create `src/components/OilChangeForm.tsx`:

```tsx
import { useState } from 'react';
import { createOilChange } from '../lib/db';
import type { NewOilChange } from '../lib/types';
import { useToast } from './Toast';

type Props = { vehicleId: string; onSaved: () => void };

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function OilChangeForm({ vehicleId, onSaved }: Props) {
  const toast = useToast();
  const [date, setDate] = useState(today());
  const [mileage, setMileage] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload: NewOilChange = {
      vehicle_id: vehicleId,
      date,
      mileage: mileage ? parseInt(mileage, 10) : null,
      notes: notes.trim() || null,
    };
    try {
      await createOilChange(payload);
      toast({ kind: 'success', message: 'Saved' });
      setMileage(''); setNotes(''); setDate(today());
      onSaved();
    } catch (err) {
      toast({ kind: 'error', message: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="block">
        <span className="text-xs uppercase tracking-wide text-slate-400">Date</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required
          className="mt-1 w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 outline-none focus:border-brand-accent" />
      </label>
      <label className="block">
        <span className="text-xs uppercase tracking-wide text-slate-400">Mileage (optional)</span>
        <input type="number" inputMode="numeric" min={0} value={mileage} onChange={(e) => setMileage(e.target.value)}
          className="mt-1 w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 outline-none focus:border-brand-accent" />
      </label>
      <label className="block">
        <span className="text-xs uppercase tracking-wide text-slate-400">Notes</span>
        <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Kelly oil, 5w-30"
          className="mt-1 w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 outline-none focus:border-brand-accent" />
      </label>
      <button type="submit" disabled={saving}
        className="w-full rounded-lg bg-brand-accent text-slate-900 font-medium py-2 disabled:opacity-60">
        {saving ? 'Saving…' : 'Save oil change'}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "add oil change form"
```

---

## Task 13: Add page

**Files:**
- Modify: `src/pages/Add.tsx`

- [ ] **Step 1: Replace `src/pages/Add.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { listVehicles } from '../lib/db';
import type { Vehicle } from '../lib/types';
import { getLastVehicleId, setLastVehicleId } from '../lib/vehicle';
import { VehiclePicker } from '../components/VehiclePicker';
import { FillUpForm } from '../components/FillUpForm';
import { OilChangeForm } from '../components/OilChangeForm';

export function Add() {
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<'fillup' | 'oil'>('fillup');

  useEffect(() => { (async () => {
    const vs = await listVehicles();
    setVehicles(vs);
    const last = getLastVehicleId();
    const valid = vs.find((v) => v.id === last) ?? vs.find((v) => v.is_default) ?? vs[0];
    if (valid) setSelectedId(valid.id);
  })(); }, []);

  function pick(id: string) {
    setSelectedId(id);
    setLastVehicleId(id);
  }

  if (vehicles === null) return <div className="p-4 text-slate-400">Loading…</div>;
  if (vehicles.length === 0) {
    return (
      <div className="p-4 space-y-3">
        <p className="text-slate-300">No vehicles yet.</p>
        <a href="/settings" className="inline-block rounded-lg bg-brand-accent text-slate-900 font-medium px-3 py-2">Add a vehicle</a>
      </div>
    );
  }
  if (!selectedId) return null;

  return (
    <div className="p-4 space-y-4">
      <VehiclePicker vehicles={vehicles} selectedId={selectedId} onSelect={pick} />

      <div className="flex rounded-lg bg-slate-800 p-1">
        <button onClick={() => setMode('fillup')}
          className={`flex-1 rounded-md py-2 text-sm ${mode === 'fillup' ? 'bg-slate-700' : ''}`}>Fill-up</button>
        <button onClick={() => setMode('oil')}
          className={`flex-1 rounded-md py-2 text-sm ${mode === 'oil' ? 'bg-slate-700' : ''}`}>Oil change</button>
      </div>

      {mode === 'fillup' ? (
        <FillUpForm vehicleId={selectedId} onSaved={() => {}} />
      ) : (
        <OilChangeForm vehicleId={selectedId} onSaved={() => {}} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Smoke test**

```bash
npm run dev
```

Sign in, go to Settings (stub) — no way to add a vehicle yet. Skip ahead for now; the full test happens after Task 16.

Stop with `Ctrl+C`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "wire up add page with vehicle picker and forms"
```

---

## Task 14: History page

**Files:**
- Create: `src/components/HistoryList.tsx`
- Modify: `src/pages/History.tsx`

- [ ] **Step 1: Write HistoryList**

Create `src/components/HistoryList.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { deleteFillUp, deleteOilChange, listFillUps, listOilChanges, listVehicles } from '../lib/db';
import { computeMpg } from '../lib/mpg';
import type { FillUp, OilChange, Vehicle } from '../lib/types';
import { useToast } from './Toast';

type Filter = 'all' | 'fillup' | 'oil';

export function HistoryList() {
  const toast = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [fillUps, setFillUps] = useState<FillUp[]>([]);
  const [oilChanges, setOilChanges] = useState<OilChange[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [vehicleFilter, setVehicleFilter] = useState<string | 'all'>('all');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [v, f, o] = await Promise.all([listVehicles(), listFillUps(), listOilChanges()]);
    setVehicles(v); setFillUps(f); setOilChanges(o);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const mpgById = useMemo(() => computeMpg(fillUps), [fillUps]);

  const milesSincePrevOilChange = useMemo(() => {
    const result: Record<string, number | null> = {};
    const byVehicle = new Map<string, OilChange[]>();
    for (const o of oilChanges) {
      const list = byVehicle.get(o.vehicle_id) ?? [];
      list.push(o);
      byVehicle.set(o.vehicle_id, list);
    }
    for (const [, list] of byVehicle) {
      list.sort((a, b) => (a.date < b.date ? -1 : 1));
      list.forEach((o, i) => {
        if (i === 0 || o.mileage == null) { result[o.id] = null; return; }
        const prev = list[i - 1];
        if (prev.mileage == null) { result[o.id] = null; return; }
        result[o.id] = o.mileage - prev.mileage;
      });
    }
    return result;
  }, [oilChanges]);

  const vehicleName = (id: string) => vehicles.find((v) => v.id === id)?.name ?? '—';

  const items = useMemo(() => {
    const vf = vehicleFilter === 'all' ? null : vehicleFilter;
    const fu = fillUps
      .filter((x) => !vf || x.vehicle_id === vf)
      .map((x) => ({ type: 'fillup' as const, item: x }));
    const oc = oilChanges
      .filter((x) => !vf || x.vehicle_id === vf)
      .map((x) => ({ type: 'oil' as const, item: x }));
    let rows = [...fu, ...oc];
    if (filter === 'fillup') rows = fu;
    if (filter === 'oil') rows = oc;
    rows.sort((a, b) => (a.item.date < b.item.date ? 1 : -1));
    return rows;
  }, [fillUps, oilChanges, filter, vehicleFilter]);

  async function handleDelete(type: 'fillup' | 'oil', id: string) {
    if (!confirm('Delete this entry?')) return;
    try {
      if (type === 'fillup') await deleteFillUp(id); else await deleteOilChange(id);
      toast({ kind: 'success', message: 'Deleted' });
      load();
    } catch (err) {
      toast({ kind: 'error', message: (err as Error).message });
    }
  }

  if (loading) return <div className="p-4 text-slate-400">Loading…</div>;

  return (
    <div className="p-4 space-y-3">
      <div className="flex rounded-lg bg-slate-800 p-1 text-sm">
        {(['all', 'fillup', 'oil'] as Filter[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex-1 rounded-md py-1.5 capitalize ${filter === f ? 'bg-slate-700' : ''}`}>
            {f === 'all' ? 'All' : f === 'fillup' ? 'Fill-ups' : 'Oil'}
          </button>
        ))}
      </div>

      {vehicles.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[{ id: 'all' as const, name: 'All cars' }, ...vehicles].map((v) => (
            <button key={v.id} onClick={() => setVehicleFilter(v.id as any)}
              className={`shrink-0 rounded-full px-3 py-1 text-sm border ${
                vehicleFilter === v.id ? 'bg-brand-accent text-slate-900 border-brand-accent' : 'border-slate-700 text-slate-300'
              }`}>
              {v.name}
            </button>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-slate-400 text-sm">No entries yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map(({ type, item }) => (
            <li key={item.id} className="rounded-lg bg-slate-800 p-3">
              <div className="flex items-baseline justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${type === 'fillup' ? 'bg-brand-accent/20 text-brand-accent' : 'bg-amber-500/20 text-amber-400'}`}>
                    {type === 'fillup' ? 'Gas' : 'Oil'}
                  </span>
                  <span className="text-sm text-slate-400">{item.date}</span>
                  <span className="text-sm text-slate-400">· {vehicleName(item.vehicle_id)}</span>
                </div>
                <button onClick={() => handleDelete(type, item.id)} className="text-xs text-red-400">Delete</button>
              </div>
              {type === 'fillup' ? (
                <div className="mt-1 text-sm flex flex-wrap gap-x-4 gap-y-1">
                  <span>{(item as FillUp).mileage.toLocaleString()} mi</span>
                  <span>{(item as FillUp).gallons.toFixed(3)} gal</span>
                  <span>${(item as FillUp).total_price.toFixed(2)}</span>
                  <span className="text-slate-400">
                    {mpgById[item.id] == null ? '—' : `${mpgById[item.id]!.toFixed(1)} mpg`}
                  </span>
                </div>
              ) : (
                <div className="mt-1 text-sm flex flex-wrap gap-x-4 gap-y-1">
                  {(item as OilChange).mileage != null && <span>{(item as OilChange).mileage!.toLocaleString()} mi</span>}
                  {(item as OilChange).notes && <span className="text-slate-300">{(item as OilChange).notes}</span>}
                  {milesSincePrevOilChange[item.id] != null && (
                    <span className="text-slate-400">
                      {milesSincePrevOilChange[item.id]!.toLocaleString()} mi since previous
                    </span>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Replace `src/pages/History.tsx`**

```tsx
import { HistoryList } from '../components/HistoryList';

export function History() {
  return <HistoryList />;
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "add history page with filters and mpg display"
```

**Note:** Edit-in-place is deferred to v1.1. For typos in v1, delete and re-add. This keeps the history screen simple and focuses the editing UX work into one pass later.

---

## Task 15: Stats page (cards + charts)

**Files:**
- Create: `src/components/StatsCards.tsx`, `src/components/Charts.tsx`
- Modify: `src/pages/Stats.tsx`

- [ ] **Step 1: Install Recharts**

```bash
npm install recharts
```

- [ ] **Step 2: Write StatsCards**

Create `src/components/StatsCards.tsx`:

```tsx
import type { FillUp, OilChange, Vehicle } from '../lib/types';

type Props = {
  vehicles: Vehicle[];
  fillUps: FillUp[];
  oilChanges: OilChange[];
};

export function StatsCards({ vehicles, fillUps, oilChanges }: Props) {
  return (
    <div className="space-y-3">
      {vehicles.map((v) => {
        const vFills = fillUps.filter((f) => f.vehicle_id === v.id).sort((a, b) => a.mileage - b.mileage);
        const vOil = oilChanges.filter((o) => o.vehicle_id === v.id).sort((a, b) => (a.date < b.date ? -1 : 1));

        const lastFill = vFills[vFills.length - 1];
        const firstFill = vFills[0];
        const totalMiles = lastFill && firstFill ? lastFill.mileage - firstFill.mileage : 0;
        const totalGallons = vFills.reduce((s, f) => s + Number(f.gallons), 0);
        const totalSpend = vFills.reduce((s, f) => s + Number(f.total_price), 0);
        const avgMpg = totalGallons > 0 ? totalMiles / totalGallons : null;

        const lastOilMileage = [...vOil].reverse().find((o) => o.mileage != null)?.mileage ?? null;
        const milesSinceOil = lastOilMileage != null && lastFill ? lastFill.mileage - lastOilMileage : null;

        return (
          <div key={v.id} className="rounded-lg bg-slate-800 p-4">
            <h3 className="font-medium">{v.name}</h3>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <Stat label="Total miles" value={totalMiles.toLocaleString()} />
              <Stat label="Lifetime spend" value={`$${totalSpend.toFixed(2)}`} />
              <Stat label="Avg MPG" value={avgMpg == null ? '—' : avgMpg.toFixed(1)} />
              <Stat label="Total gallons" value={totalGallons.toFixed(1)} />
              <Stat label="Last fill-up" value={lastFill ? lastFill.date : '—'} />
              <Stat label="Miles since oil" value={milesSinceOil == null ? '—' : milesSinceOil.toLocaleString()} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="text-base">{value}</div>
    </div>
  );
}
```

- [ ] **Step 3: Write Charts**

Create `src/components/Charts.tsx`:

```tsx
import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import type { FillUp, Vehicle } from '../lib/types';
import { computeMpg } from '../lib/mpg';

type Props = { vehicles: Vehicle[]; fillUps: FillUp[]; range: '3m' | '1y' | 'all' };

function cutoff(range: '3m' | '1y' | 'all'): string | null {
  if (range === 'all') return null;
  const d = new Date();
  if (range === '3m') d.setMonth(d.getMonth() - 3);
  else d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().slice(0, 10);
}

const COLORS = ['#22d3ee', '#a78bfa', '#f472b6', '#facc15', '#34d399', '#f97316'];

export function Charts({ vehicles, fillUps, range }: Props) {
  const after = cutoff(range);
  const filtered = useMemo(() => after ? fillUps.filter((f) => f.date >= after) : fillUps, [fillUps, after]);
  const mpg = useMemo(() => computeMpg(filtered), [filtered]);

  const mpgData = useMemo(() => {
    const rows = filtered.map((f) => ({
      date: f.date,
      ...vehicles.reduce((acc, v) => ({ ...acc, [v.id]: f.vehicle_id === v.id ? mpg[f.id] : null }), {}),
    }));
    return rows.sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [filtered, mpg, vehicles]);

  const priceData = useMemo(() =>
    [...filtered].sort((a, b) => (a.date < b.date ? -1 : 1)).map((f) => ({ date: f.date, price: Number(f.price_per_gallon) })),
    [filtered]);

  const monthlySpend = useMemo(() => {
    const byMonth = new Map<string, number>();
    for (const f of filtered) {
      const m = f.date.slice(0, 7);
      byMonth.set(m, (byMonth.get(m) ?? 0) + Number(f.total_price));
    }
    return Array.from(byMonth.entries()).sort(([a], [b]) => (a < b ? -1 : 1)).map(([month, spend]) => ({ month, spend }));
  }, [filtered]);

  return (
    <div className="space-y-6">
      <ChartSection title="MPG over time">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={mpgData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 10 }} />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {vehicles.map((v, i) => (
              <Line key={v.id} type="monotone" dataKey={v.id} name={v.name} stroke={COLORS[i % COLORS.length]} connectNulls dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </ChartSection>

      <ChartSection title="Price per gallon">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={priceData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 10 }} />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} />
            <Line type="monotone" dataKey="price" stroke="#22d3ee" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartSection>

      <ChartSection title="Monthly spend">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthlySpend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 10 }} />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} />
            <Bar dataKey="spend" fill="#a78bfa" />
          </BarChart>
        </ResponsiveContainer>
      </ChartSection>
    </div>
  );
}

function ChartSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-slate-800 p-3">
      <h3 className="text-sm text-slate-300 mb-2">{title}</h3>
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Replace `src/pages/Stats.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { listFillUps, listOilChanges, listVehicles } from '../lib/db';
import type { FillUp, OilChange, Vehicle } from '../lib/types';
import { StatsCards } from '../components/StatsCards';
import { Charts } from '../components/Charts';

export function Stats() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [fillUps, setFillUps] = useState<FillUp[]>([]);
  const [oilChanges, setOilChanges] = useState<OilChange[]>([]);
  const [range, setRange] = useState<'3m' | '1y' | 'all'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => { (async () => {
    const [v, f, o] = await Promise.all([listVehicles(), listFillUps(), listOilChanges()]);
    setVehicles(v); setFillUps(f); setOilChanges(o);
    setLoading(false);
  })(); }, []);

  if (loading) return <div className="p-4 text-slate-400">Loading…</div>;

  return (
    <div className="p-4 space-y-4">
      <StatsCards vehicles={vehicles} fillUps={fillUps} oilChanges={oilChanges} />

      <div className="flex rounded-lg bg-slate-800 p-1 text-sm">
        {(['3m', '1y', 'all'] as const).map((r) => (
          <button key={r} onClick={() => setRange(r)}
            className={`flex-1 rounded-md py-1.5 ${range === r ? 'bg-slate-700' : ''}`}>
            {r === '3m' ? '3 months' : r === '1y' ? '1 year' : 'All time'}
          </button>
        ))}
      </div>

      <Charts vehicles={vehicles} fillUps={fillUps} range={range} />
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "add stats page with per-vehicle cards and charts"
```

---

## Task 16: Settings page (vehicles + export CSV + sign out)

**Files:**
- Modify: `src/pages/Settings.tsx`

- [ ] **Step 1: Replace `src/pages/Settings.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { createVehicle, deleteVehicle, listFillUps, listOilChanges, listVehicles, updateVehicle } from '../lib/db';
import { supabase } from '../lib/supabase';
import type { FillUp, OilChange, Vehicle } from '../lib/types';
import { useToast } from '../components/Toast';

export function Settings() {
  const toast = useToast();
  const [email, setEmail] = useState<string>('');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [newName, setNewName] = useState('');

  async function reload() {
    setVehicles(await listVehicles());
  }

  useEffect(() => { (async () => {
    const u = (await supabase.auth.getUser()).data.user;
    setEmail(u?.email ?? '');
    await reload();
  })(); }, []);

  async function addVehicle(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await createVehicle({ name: newName.trim(), is_default: vehicles.length === 0 });
      setNewName('');
      toast({ kind: 'success', message: 'Vehicle added' });
      await reload();
    } catch (err) {
      toast({ kind: 'error', message: (err as Error).message });
    }
  }

  async function rename(v: Vehicle) {
    const name = prompt('Rename vehicle', v.name);
    if (!name?.trim() || name.trim() === v.name) return;
    await updateVehicle(v.id, { name: name.trim() });
    await reload();
  }

  async function setDefault(v: Vehicle) {
    await updateVehicle(v.id, { is_default: true });
    await reload();
  }

  async function remove(v: Vehicle) {
    if (!confirm(`Delete "${v.name}" and ALL its fill-ups and oil changes?`)) return;
    try {
      await deleteVehicle(v.id);
      toast({ kind: 'success', message: 'Deleted' });
      await reload();
    } catch (err) {
      toast({ kind: 'error', message: (err as Error).message });
    }
  }

  async function exportCsv() {
    const [fills, oils, vs] = await Promise.all([listFillUps(), listOilChanges(), listVehicles()]);
    const vname = (id: string) => vs.find((v) => v.id === id)?.name ?? '';
    const lines: string[] = [];
    lines.push('type,vehicle,date,mileage,gallons,price_per_gallon,total_price,notes');
    for (const f of fills) {
      lines.push(['fillup', vname(f.vehicle_id), f.date, f.mileage, f.gallons, f.price_per_gallon, f.total_price, ''].join(','));
    }
    for (const o of oils) {
      lines.push(['oil', vname(o.vehicle_id), o.date, o.mileage ?? '', '', '', '', JSON.stringify(o.notes ?? '')].join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gas-tracker-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <div className="p-4 space-y-6">
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Vehicles</h2>
        <ul className="space-y-2">
          {vehicles.map((v) => (
            <li key={v.id} className="rounded-lg bg-slate-800 p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium truncate">{v.name}</div>
                {v.is_default && <div className="text-xs text-brand-accent">Default</div>}
              </div>
              <div className="flex gap-3 text-sm">
                {!v.is_default && <button onClick={() => setDefault(v)} className="text-slate-300">Set default</button>}
                <button onClick={() => rename(v)} className="text-slate-300">Rename</button>
                <button onClick={() => remove(v)} className="text-red-400">Delete</button>
              </div>
            </li>
          ))}
        </ul>
        <form onSubmit={addVehicle} className="flex gap-2">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New vehicle name"
            className="flex-1 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 outline-none focus:border-brand-accent" />
          <button type="submit" className="rounded-lg bg-brand-accent text-slate-900 font-medium px-4">Add</button>
        </form>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Data</h2>
        <button onClick={exportCsv} className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm">Export CSV</button>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Account</h2>
        <p className="text-sm text-slate-400">{email}</p>
        <button onClick={signOut} className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm">Sign out</button>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Smoke test end-to-end (not including import yet)**

```bash
npm run dev
```

- Sign in.
- Go to Settings, add "Car 1" — should appear with "Default" label.
- Go to Add — form appears, enter a sample fill-up, save → toast, form clears.
- Add an oil change.
- Go to History — both entries appear, correct filters work.
- Go to Stats — cards show, charts show (with 1-2 entries; MPG will be sparse).
- Delete from History — entry disappears.
- Add "Car 2", switch on Add screen — "Car 2" highlights, selection persists after reload.
- Sign out — back to login.

Stop with `Ctrl+C`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "add settings page with vehicle management, csv export, sign out"
```

---

## Task 17: PWA (manifest, icons, service worker)

**Files:**
- Create: `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/icon-maskable.png`, `public/favicon.svg`
- Modify: `vite.config.ts`, `index.html`

- [ ] **Step 1: Install vite-plugin-pwa**

```bash
npm install -D vite-plugin-pwa
```

- [ ] **Step 2: Add icon files**

Generate three PNGs (or create simple solid-color placeholders for v1 with the letter "G"):
- `public/icons/icon-192.png` (192×192)
- `public/icons/icon-512.png` (512×512)
- `public/icons/icon-maskable.png` (512×512, with padding for maskable)

Use any tool (Figma, https://realfavicongenerator.net, or ImageMagick):

```bash
# Quick placeholder via ImageMagick if installed:
mkdir -p public/icons
magick -size 192x192 xc:'#0f172a' -gravity center -pointsize 128 -fill '#22d3ee' -annotate 0 'G' public/icons/icon-192.png
magick -size 512x512 xc:'#0f172a' -gravity center -pointsize 340 -fill '#22d3ee' -annotate 0 'G' public/icons/icon-512.png
magick -size 512x512 xc:'#0f172a' -gravity center -pointsize 240 -fill '#22d3ee' -annotate 0 'G' public/icons/icon-maskable.png
```

If ImageMagick isn't installed, manually create and save three PNGs with any drawing tool.

Also create `public/favicon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#0f172a"/><text x="32" y="44" text-anchor="middle" font-family="system-ui" font-size="36" font-weight="700" fill="#22d3ee">G</text></svg>
```

- [ ] **Step 3: Configure `vite.config.ts`**

Replace file contents:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable.png'],
      manifest: {
        name: 'Gas Tracker',
        short_name: 'Gas',
        description: 'Track gas fill-ups and oil changes',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
      },
    }),
  ],
});
```

- [ ] **Step 4: Reference favicon in `index.html`**

Inside `<head>`, add:

```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
```

- [ ] **Step 5: Build and preview**

```bash
npm run build
npm run preview
```

Open the preview URL. In Chrome DevTools → Application → Manifest, verify the manifest loads and shows the icons. In Application → Service Workers, verify one is registered. Stop the preview.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "add pwa manifest, icons, and service worker"
```

---

## Task 18: Import script (TDD)

**Files:**
- Create: `scripts/import-xlsx.ts`, `tests/import-xlsx.test.ts`

- [ ] **Step 1: Install dependencies**

```bash
npm install -D tsx @types/node
npm install xlsx
```

- [ ] **Step 2: Write failing tests for the pure parsing helpers**

Create `tests/import-xlsx.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { excelSerialToIsoDate, parseOilNoteToDate, parseOilNoteToMileage } from '../scripts/import-xlsx';

describe('excelSerialToIsoDate', () => {
  it('converts 43127 to 2018-02-01', () => {
    // Excel serial 43127 = 2018-02-01 (first row in user's sheet)
    expect(excelSerialToIsoDate(43127)).toBe('2018-02-01');
  });

  it('strips fractional time', () => {
    expect(excelSerialToIsoDate(43127.5094)).toBe('2018-02-01');
  });
});

describe('parseOilNoteToMileage', () => {
  it('parses "63k" as 63000', () => {
    expect(parseOilNoteToMileage('Kelly oil 12/27 63k')).toBe(63000);
  });

  it('parses a bare number as that number', () => {
    expect(parseOilNoteToMileage('Changed oil at 87420')).toBe(87420);
  });

  it('returns null when no number is present', () => {
    expect(parseOilNoteToMileage('Changed oil 8/25')).toBeNull();
  });
});

describe('parseOilNoteToDate', () => {
  it('parses "5/31/21" as 2021-05-31', () => {
    expect(parseOilNoteToDate('Changed oil 5/31/21')).toBe('2021-05-31');
  });

  it('parses "10/6/23" as 2023-10-06', () => {
    expect(parseOilNoteToDate('Changed oil 10/6/23')).toBe('2023-10-06');
  });

  it('parses "3/22" (no year) as null', () => {
    expect(parseOilNoteToDate('Changed oil 3/22')).toBeNull();
  });

  it('returns null when no date is present', () => {
    expect(parseOilNoteToDate('Kelly oil')).toBeNull();
  });
});
```

- [ ] **Step 3: Run tests — expect failure**

```bash
npm test
```

Expected: FAIL — helpers not yet defined.

- [ ] **Step 4: Write the script with the helpers and the main import**

Create `scripts/import-xlsx.ts`:

```ts
#!/usr/bin/env tsx
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

// --- Pure helpers (exported for tests) ---

export function excelSerialToIsoDate(serial: number): string {
  // Excel epoch is 1899-12-30 (handling the famous 1900 leap-year bug).
  const EPOCH = Date.UTC(1899, 11, 30);
  const ms = EPOCH + Math.floor(serial) * 86400000;
  return new Date(ms).toISOString().slice(0, 10);
}

export function parseOilNoteToMileage(note: string): number | null {
  const kMatch = note.match(/(\d+)\s*k\b/i);
  if (kMatch) return parseInt(kMatch[1], 10) * 1000;
  const m = note.match(/(\d{4,6})/);
  return m ? parseInt(m[1], 10) : null;
}

export function parseOilNoteToDate(note: string): string | null {
  // Matches M/D/YY or M/D/YYYY
  const m = note.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!m) return null;
  const month = parseInt(m[1], 10);
  const day = parseInt(m[2], 10);
  let year = parseInt(m[3], 10);
  if (m[3].length === 2) year = year < 70 ? 2000 + year : 1900 + year;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

// --- Main ---

async function main() {
  const xlsxPath = process.argv[2];
  const dryRun = process.argv.includes('--dry-run');
  if (!xlsxPath) {
    console.error('Usage: tsx scripts/import-xlsx.ts <path-to-xlsx> [--dry-run]');
    process.exit(1);
  }

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const userEmail = process.env.IMPORT_USER_EMAIL;
  if (!url || !serviceKey || !userEmail) {
    console.error('Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and IMPORT_USER_EMAIL env vars.');
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey);

  // Resolve the user id from the email (they must have signed in at least once).
  const { data: userList, error: userErr } = await supabase.auth.admin.listUsers();
  if (userErr) throw userErr;
  const user = userList.users.find((u) => u.email === userEmail);
  if (!user) {
    console.error(`No Supabase user with email ${userEmail}. Sign in via the app once first.`);
    process.exit(1);
  }
  const userId = user.id;

  // Create Car 1 if no vehicle exists for the user yet.
  const { data: existing } = await supabase.from('gas_vehicles').select('*').eq('user_id', userId);
  let vehicleId: string;
  if (existing && existing.length > 0) {
    vehicleId = existing[0].id;
    console.log(`Using existing vehicle: ${existing[0].name} (${vehicleId})`);
  } else {
    if (dryRun) {
      vehicleId = 'dry-run-vehicle';
      console.log('Would create vehicle: Car 1 (default)');
    } else {
      const { data, error } = await supabase.from('gas_vehicles').insert({ user_id: userId, name: 'Car 1', is_default: true }).select().single();
      if (error) throw error;
      vehicleId = data.id;
      console.log(`Created vehicle: Car 1 (${vehicleId})`);
    }
  }

  const wb = XLSX.readFile(path.resolve(xlsxPath));
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<any>(sheet, { header: 1, raw: true });

  const fillUps: any[] = [];
  const oilChanges: any[] = [];
  const skipped: string[] = [];

  // Row 0 is header; skip.
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 0) continue;

    const [timestamp, date, mileage, gallons, pricePerGallon, totalPrice, ...rest] = r;

    // Normal data row: numeric mileage, gallons, price all present.
    if (typeof mileage === 'number' && typeof gallons === 'number' && typeof pricePerGallon === 'number') {
      const rowDate = typeof date === 'number' ? excelSerialToIsoDate(date)
        : typeof timestamp === 'number' ? excelSerialToIsoDate(timestamp)
        : null;
      if (!rowDate) { skipped.push(`Row ${i + 1}: no date`); continue; }
      fillUps.push({
        user_id: userId, vehicle_id: vehicleId, date: rowDate,
        mileage: Math.round(mileage), gallons, price_per_gallon: pricePerGallon,
        total_price: typeof totalPrice === 'number' ? totalPrice : Math.round(gallons * pricePerGallon * 100) / 100,
      });
      continue;
    }

    // Milestone/oil row: check if any string cell looks like an oil-change note.
    const strings = r.filter((c: any) => typeof c === 'string');
    const note = strings.find((s: string) => /oil|changed/i.test(s));
    if (note) {
      if (/missed an entry/i.test(note)) { skipped.push(`Row ${i + 1}: "missed an entry" marker`); continue; }
      const noteDate = parseOilNoteToDate(note)
        ?? (typeof date === 'number' ? excelSerialToIsoDate(date) : null)
        ?? (typeof timestamp === 'number' ? excelSerialToIsoDate(timestamp) : null);
      if (!noteDate) { skipped.push(`Row ${i + 1}: oil note "${note}" but no parseable date`); continue; }
      const noteMileage = parseOilNoteToMileage(note) ?? (typeof mileage === 'number' ? Math.round(mileage) : null);
      oilChanges.push({
        user_id: userId, vehicle_id: vehicleId, date: noteDate, mileage: noteMileage, notes: note,
      });
      continue;
    }

    skipped.push(`Row ${i + 1}: unrecognized, skipping (${JSON.stringify(r)})`);
  }

  console.log(`Parsed: ${fillUps.length} fill-ups, ${oilChanges.length} oil changes, ${skipped.length} skipped.`);
  skipped.forEach((s) => console.log('  SKIP:', s));

  if (dryRun) { console.log('Dry run — no writes.'); return; }

  if (fillUps.length > 0) {
    const { error } = await supabase.from('gas_fill_ups').insert(fillUps);
    if (error) throw error;
    console.log(`Inserted ${fillUps.length} fill-ups.`);
  }
  if (oilChanges.length > 0) {
    const { error } = await supabase.from('gas_oil_changes').insert(oilChanges);
    if (error) throw error;
    console.log(`Inserted ${oilChanges.length} oil changes.`);
  }

  console.log('Done.');
}

// Only run when invoked as a script, not when imported by tests.
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
```

- [ ] **Step 5: Run tests — expect pass**

```bash
npm test
```

Expected: all tests green (MPG + autoTotal + import helpers).

- [ ] **Step 6: Dry-run the import**

Set environment variables in the shell (don't commit the service key):

```bash
export SUPABASE_URL='https://your-project.supabase.co'
export SUPABASE_SERVICE_ROLE_KEY='your-service-role-key'
export IMPORT_USER_EMAIL='your@email.com'
npx tsx scripts/import-xlsx.ts "C:/Users/joeka/Downloads/Gas tracking.xlsx" --dry-run
```

Expected output: `Parsed: N fill-ups, M oil changes, K skipped.` plus skip reasons. No DB writes.

- [ ] **Step 7: Real import**

```bash
npx tsx scripts/import-xlsx.ts "C:/Users/joeka/Downloads/Gas tracking.xlsx"
```

Expected: same counts, plus `Inserted N fill-ups.` and `Inserted M oil changes.`

- [ ] **Step 8: Verify in app**

Run `npm run dev`, sign in, go to History — rows appear. Go to Stats — cards and charts populated with years of data.

- [ ] **Step 9: Commit (script only — no secrets)**

```bash
git add scripts/ tests/import-xlsx.test.ts package.json package-lock.json
git commit -m "add xlsx import script with parsing tests"
```

---

## Task 19: Deploy to Vercel

**Files:**
- Modify: `README.md` (deployment section)

- [ ] **Step 1: Push the project to a new GitHub repo**

```bash
gh repo create gas-tracker --private --source=. --remote=origin --push
```

If `gh` isn't available, create the repo on github.com and follow the "push an existing repo" instructions.

- [ ] **Step 2: Import into Vercel**

Go to https://vercel.com/new → Import the `gas-tracker` repo. Framework preset: Vite (auto-detected).

Add environment variables in the import screen:
- `VITE_SUPABASE_URL` = (your Supabase URL)
- `VITE_SUPABASE_ANON_KEY` = (your anon key)

Click Deploy.

- [ ] **Step 3: Update Supabase auth redirect URL**

In Supabase dashboard → Authentication → URL Configuration:
- Site URL: `https://<your-app>.vercel.app`
- Add to Redirect URLs: `https://<your-app>.vercel.app`

- [ ] **Step 4: Sign in from the deployed app**

Open the Vercel URL on your phone. Enter email, click magic link — make sure the redirect lands back on the Vercel URL (not localhost).

- [ ] **Step 5: Install to home screen**

- iOS Safari: Share → Add to Home Screen.
- Android Chrome: ⋮ → Install app.

Verify the installed app launches standalone, icon appears correctly.

- [ ] **Step 6: Update README with deploy URL**

Edit the README Deploy section to note the live URL.

- [ ] **Step 7: Commit**

```bash
git add README.md
git commit -m "add deployment url to readme"
git push
```

---

## Task 20: RLS verification + final QA

**Files:** none — verification only

- [ ] **Step 1: RLS verification**

In Supabase dashboard → Authentication → Users → "Add user" (invite a throwaway email you control). Sign in as that user in an incognito window on the Vercel URL. Confirm:
- History is empty
- Stats shows no vehicles/cards
- Adding a new vehicle as this user does NOT affect the first user's data

Then in SQL Editor, run as that second user's context (`set request.jwt.claims...` is Postgres-side, but simpler: query the tables via the second user's anon session from Supabase's API playground) and confirm queries return empty for their rows but still see only their own rows on insert.

Remove the test user when done: Authentication → Users → delete.

- [ ] **Step 2: Manual QA checklist — run on your phone**

- [ ] Add fill-up on phone form factor — saves, toast fires, form resets
- [ ] Add oil change — saves
- [ ] Switch vehicles — default persists across reloads
- [ ] Edit and delete from History
- [ ] History filter by vehicle works
- [ ] Stats charts render with and without data
- [ ] Install to home screen on iOS Safari (if applicable)
- [ ] Install to home screen on Android Chrome (if applicable)
- [ ] App shell loads offline (airplane mode → open PWA → shell shows with "offline" banner; reads fail gracefully)
- [ ] Sign out → magic link re-auth works

- [ ] **Step 3: If everything passes, tag a release**

```bash
git tag v1.0.0
git push --tags
```

---

## Done criteria

- All 20 tasks checked off.
- `npm test` green.
- Deployed PWA reachable at the Vercel URL.
- Imported data visible in History and Stats.
- RLS verified via a second user.
- PWA installable on both iOS and Android.
