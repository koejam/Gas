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
