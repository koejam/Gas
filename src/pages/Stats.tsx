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
