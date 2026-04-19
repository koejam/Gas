import { describe, it, expect } from 'vitest';
import { autoTotal } from '../src/components/FillUpForm';

describe('autoTotal', () => {
  it('returns gallons * price when total was not user-edited', () => {
    expect(autoTotal({ gallons: 10, pricePerGallon: 3.5, userEditedTotal: false })).toBeCloseTo(35, 2);
  });

  it('returns null (meaning: leave total alone) when user edited total', () => {
    expect(autoTotal({ gallons: 10, pricePerGallon: 3.5, userEditedTotal: true })).toBeNull();
  });

  it('returns null when gallons or price is not a positive number', () => {
    expect(autoTotal({ gallons: 0, pricePerGallon: 3.5, userEditedTotal: false })).toBeNull();
    expect(autoTotal({ gallons: 10, pricePerGallon: 0, userEditedTotal: false })).toBeNull();
    expect(autoTotal({ gallons: NaN, pricePerGallon: 3.5, userEditedTotal: false })).toBeNull();
  });
});
