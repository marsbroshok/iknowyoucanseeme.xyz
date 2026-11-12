import { describe, it, expect } from 'vitest';
import { getAvailabilityLabel, isEnquirable } from '../../src/domain/Availability.js';
import type { Work } from '../../src/content/schema/index.js';

describe('Availability', () => {
  it('returns sold label', () => {
    const work = { availability: 'sold' } as Work;
    expect(getAvailabilityLabel(work, 'en')).toBe('Sold');
    expect(getAvailabilityLabel(work, 'fr')).toBe('Vendu');
  });
  
  it('returns not-for-sale label', () => {
    const work = { availability: 'not-for-sale' } as Work;
    expect(getAvailabilityLabel(work, 'en')).toBe('Not for sale');
    expect(getAvailabilityLabel(work, 'fr')).toBe('Non disponible');
  });
  
  it('returns contact label for available', () => {
    const work = { availability: 'available' } as Work;
    expect(getAvailabilityLabel(work, 'en')).toBe('Contact for availability');
    expect(getAvailabilityLabel(work, 'fr')).toBe('Disponibilité sur demande');
  });

  it('returns contact label for unknown', () => {
    const work = { availability: 'unknown' } as Work;
    expect(getAvailabilityLabel(work, 'en')).toBe('Contact for availability');
    expect(getAvailabilityLabel(work, 'fr')).toBe('Disponibilité sur demande');
  });

  it('isEnquirable only for available and unknown', () => {
    expect(isEnquirable({ availability: 'available' })).toBe(true);
    expect(isEnquirable({ availability: 'unknown' })).toBe(true);
    expect(isEnquirable({ availability: 'sold' })).toBe(false);
    expect(isEnquirable({ availability: 'not-for-sale' })).toBe(false);
  });

  it('never outputs a price or currency for any availability', () => {
    for (const availability of ['available', 'sold', 'not-for-sale', 'unknown'] as const) {
      for (const lang of ['en', 'fr'] as const) {
        expect(getAvailabilityLabel({ availability }, lang)).not.toMatch(/[€$£]|\d/);
      }
    }
  });
});
