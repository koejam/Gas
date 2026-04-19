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
