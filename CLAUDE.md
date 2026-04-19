# Gas Tracker

Single-user PWA for tracking gas fill-ups and oil changes across multiple vehicles. Replaces an existing Google Form workflow with ~7 years of imported history.

## Stack

- React 19 + TypeScript + Vite
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
