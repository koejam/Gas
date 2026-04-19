import type { FillUp } from './types';

/**
 * Computes MPG for each fill-up keyed by id.
 * MPG = (current.mileage - previous.mileage) / current.gallons, where
 * "previous" is the prior entry for the same vehicle ordered by mileage ascending.
 * Returns null for the first entry (no previous) or when gallons is zero.
 */
export function computeMpg(fillUps: FillUp[]): Record<string, number | null> {
  const byVehicle = new Map<string, FillUp[]>();
  for (const f of fillUps) {
    const list = byVehicle.get(f.vehicle_id) ?? [];
    list.push(f);
    byVehicle.set(f.vehicle_id, list);
  }

  const result: Record<string, number | null> = {};
  for (const [, list] of byVehicle) {
    list.sort((a, b) => a.mileage - b.mileage);
    list.forEach((entry, i) => {
      if (i === 0 || entry.gallons <= 0) {
        result[entry.id] = null;
      } else {
        const prev = list[i - 1];
        result[entry.id] = (entry.mileage - prev.mileage) / entry.gallons;
      }
    });
  }

  return result;
}
