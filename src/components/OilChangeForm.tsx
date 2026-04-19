import { useState } from 'react';
import { createOilChange } from '../lib/db';
import type { NewOilChange } from '../lib/types';
import { useToast } from './Toast';

type Props = { vehicleId: string; onSaved: () => void };

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function OilChangeForm({ vehicleId, onSaved }: Props) {
  const toast = useToast();
  const [date, setDate] = useState(today());
  const [mileage, setMileage] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload: NewOilChange = {
      vehicle_id: vehicleId,
      date,
      mileage: mileage ? parseInt(mileage, 10) : null,
      notes: notes.trim() || null,
    };
    try {
      await createOilChange(payload);
      toast({ kind: 'success', message: 'Saved' });
      setMileage(''); setNotes(''); setDate(today());
      onSaved();
    } catch (err) {
      toast({ kind: 'error', message: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="block">
        <span className="text-xs uppercase tracking-wide text-slate-400">Date</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required
          className="mt-1 w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 outline-none focus:border-brand-accent" />
      </label>
      <label className="block">
        <span className="text-xs uppercase tracking-wide text-slate-400">Mileage (optional)</span>
        <input type="number" inputMode="numeric" min={0} value={mileage} onChange={(e) => setMileage(e.target.value)}
          className="mt-1 w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 outline-none focus:border-brand-accent" />
      </label>
      <label className="block">
        <span className="text-xs uppercase tracking-wide text-slate-400">Notes</span>
        <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Kelly oil, 5w-30"
          className="mt-1 w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 outline-none focus:border-brand-accent" />
      </label>
      <button type="submit" disabled={saving}
        className="w-full rounded-lg bg-brand-accent text-slate-900 font-medium py-2 disabled:opacity-60">
        {saving ? 'Saving…' : 'Save oil change'}
      </button>
    </form>
  );
}
