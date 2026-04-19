import { describe, it, expect } from 'vitest';
import { computeMpg } from '../src/lib/mpg';
import type { FillUp } from '../src/lib/types';

function f(overrides: Partial<FillUp>): FillUp {
  return {
    id: 'x', user_id: 'u', vehicle_id: 'v', created_at: '',
    date: '2025-01-01', mileage: 0, gallons: 0, price_per_gallon: 0, total_price: 0,
    ...overrides,
  };
}

describe('computeMpg', () => {
  it('returns null for the first fill-up (no previous)', () => {
    const entries = [f({ id: 'a', mileage: 10000, gallons: 10 })];
    const result = computeMpg(entries);
    expect(result['a']).toBeNull();
  });

  it('computes mpg as (mileage delta) / gallons for subsequent entries', () => {
    const entries = [
      f({ id: 'a', mileage: 10000, gallons: 10 }),
      f({ id: 'b', mileage: 10250, gallons: 10 }),
    ];
    const result = computeMpg(entries);
    expect(result['b']).toBeCloseTo(25, 3);
  });

  it('handles entries passed in reverse-chronological order (sorts by mileage)', () => {
    const entries = [
      f({ id: 'b', mileage: 10250, gallons: 10 }),
      f({ id: 'a', mileage: 10000, gallons: 10 }),
    ];
    const result = computeMpg(entries);
    expect(result['a']).toBeNull();
    expect(result['b']).toBeCloseTo(25, 3);
  });

  it('returns null when gallons is zero (defensive)', () => {
    const entries = [
      f({ id: 'a', mileage: 10000, gallons: 10 }),
      f({ id: 'b', mileage: 10250, gallons: 0 }),
    ];
    const result = computeMpg(entries);
    expect(result['b']).toBeNull();
  });
});
