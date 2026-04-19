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
