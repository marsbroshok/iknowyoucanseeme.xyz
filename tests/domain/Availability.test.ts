import { describe, it, expect } from 'vitest';
import { getAvailabilityLabel } from '../../src/domain/Availability.js';
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
});
