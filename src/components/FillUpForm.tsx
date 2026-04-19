import { useState } from 'react';
import { createFillUp } from '../lib/db';
import type { NewFillUp } from '../lib/types';
import { useToast } from './Toast';

type Props = { vehicleId: string; onSaved: () => void };

export function autoTotal(args: {
  gallons: number;
  pricePerGallon: number;
  userEditedTotal: boolean;
}): number | null {
  if (args.userEditedTotal) return null;
  if (!isFinite(args.gallons) || !isFinite(args.pricePerGallon)) return null;
  if (args.gallons <= 0 || args.pricePerGallon <= 0) return null;
  return Math.round(args.gallons * args.pricePerGallon * 100) / 100;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function FillUpForm({ vehicleId, onSaved }: Props) {
  const toast = useToast();
  const [date, setDate] = useState(today());
  const [mileage, setMileage] = useState('');
  const [gallons, setGallons] = useState('');
  const [pricePerGallon, setPricePerGallon] = useState('');
  const [total, setTotal] = useState('');
  const [userEditedTotal, setUserEditedTotal] = useState(false);
  const [saving, setSaving] = useState(false);

  function recomputeTotal(nextGallons: string, nextPrice: string) {
    const auto = autoTotal({
      gallons: parseFloat(nextGallons),
      pricePerGallon: parseFloat(nextPrice),
      userEditedTotal,
    });
    if (auto !== null) setTotal(auto.toFixed(2));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload: NewFillUp = {
      vehicle_id: vehicleId,
      date,
      mileage: parseInt(mileage, 10),
      gallons: parseFloat(gallons),
      price_per_gallon: parseFloat(pricePerGallon),
      total_price: parseFloat(total),
    };
    try {
      await createFillUp(payload);
      toast({ kind: 'success', message: 'Saved' });
      setMileage(''); setGallons(''); setPricePerGallon(''); setTotal('');
      setUserEditedTotal(false); setDate(today());
      onSaved();
    } catch (err) {
      toast({ kind: 'error', message: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Field label="Date">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className={inputCx} />
      </Field>
      <Field label="Mileage">
        <input
          type="number" inputMode="numeric" min={0} required
          value={mileage} onChange={(e) => setMileage(e.target.value)} className={inputCx}
        />
      </Field>
      <Field label="Gallons">
        <input
          type="number" inputMode="decimal" step="0.001" min={0} required
          value={gallons}
          onChange={(e) => { setGallons(e.target.value); recomputeTotal(e.target.value, pricePerGallon); }}
          className={inputCx}
        />
      </Field>
      <Field label="Price / gallon">
        <input
          type="number" inputMode="decimal" step="0.001" min={0} required
          value={pricePerGallon}
          onChange={(e) => { setPricePerGallon(e.target.value); recomputeTotal(gallons, e.target.value); }}
          className={inputCx}
        />
      </Field>
      <Field label="Total price">
        <input
          type="number" inputMode="decimal" step="0.01" min={0} required
          value={total}
          onChange={(e) => { setTotal(e.target.value); setUserEditedTotal(true); }}
          className={inputCx}
        />
      </Field>
      <button type="submit" disabled={saving} className="w-full rounded-lg bg-brand-accent text-slate-900 font-medium py-2 disabled:opacity-60">
        {saving ? 'Saving…' : 'Save fill-up'}
      </button>
    </form>
  );
}

const inputCx = 'w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 outline-none focus:border-brand-accent';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wide text-slate-400">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
