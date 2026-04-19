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
