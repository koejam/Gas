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
