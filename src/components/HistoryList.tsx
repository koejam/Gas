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
