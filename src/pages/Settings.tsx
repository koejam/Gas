import { useEffect, useState } from 'react';
import { createVehicle, deleteVehicle, listFillUps, listOilChanges, listVehicles, updateVehicle } from '../lib/db';
import { supabase } from '../lib/supabase';
import type { Vehicle } from '../lib/types';
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
