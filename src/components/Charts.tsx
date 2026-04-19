import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import type { FillUp, Vehicle } from '../lib/types';
import { computeMpg } from '../lib/mpg';

type Props = { vehicles: Vehicle[]; fillUps: FillUp[]; range: '3m' | '1y' | 'all' };

function cutoff(range: '3m' | '1y' | 'all'): string | null {
  if (range === 'all') return null;
  const d = new Date();
  if (range === '3m') d.setMonth(d.getMonth() - 3);
  else d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().slice(0, 10);
}

const COLORS = ['#22d3ee', '#a78bfa', '#f472b6', '#facc15', '#34d399', '#f97316'];

export function Charts({ vehicles, fillUps, range }: Props) {
  const after = cutoff(range);
  const filtered = useMemo(() => after ? fillUps.filter((f) => f.date >= after) : fillUps, [fillUps, after]);
  const mpg = useMemo(() => computeMpg(filtered), [filtered]);

  const mpgData = useMemo(() => {
    const rows = filtered.map((f) => ({
      date: f.date,
      ...vehicles.reduce((acc, v) => ({ ...acc, [v.id]: f.vehicle_id === v.id ? mpg[f.id] : null }), {}),
    }));
    return rows.sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [filtered, mpg, vehicles]);

  const priceData = useMemo(() =>
    [...filtered].sort((a, b) => (a.date < b.date ? -1 : 1)).map((f) => ({ date: f.date, price: Number(f.price_per_gallon) })),
    [filtered]);

  const monthlySpend = useMemo(() => {
    const byMonth = new Map<string, number>();
    for (const f of filtered) {
      const m = f.date.slice(0, 7);
      byMonth.set(m, (byMonth.get(m) ?? 0) + Number(f.total_price));
    }
    return Array.from(byMonth.entries()).sort(([a], [b]) => (a < b ? -1 : 1)).map(([month, spend]) => ({ month, spend }));
  }, [filtered]);

  return (
    <div className="space-y-6">
      <ChartSection title="MPG over time">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={mpgData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 10 }} />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {vehicles.map((v, i) => (
              <Line key={v.id} type="monotone" dataKey={v.id} name={v.name} stroke={COLORS[i % COLORS.length]} connectNulls dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </ChartSection>

      <ChartSection title="Price per gallon">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={priceData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 10 }} />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} />
            <Line type="monotone" dataKey="price" stroke="#22d3ee" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartSection>

      <ChartSection title="Monthly spend">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthlySpend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 10 }} />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} />
            <Bar dataKey="spend" fill="#a78bfa" />
          </BarChart>
        </ResponsiveContainer>
      </ChartSection>
    </div>
  );
}

function ChartSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-slate-800 p-3">
      <h3 className="text-sm text-slate-300 mb-2">{title}</h3>
      {children}
    </div>
  );
}
