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
