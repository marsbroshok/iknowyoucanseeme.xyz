import { describe, it, expect } from 'vitest';
import { getAvailabilityLabel, isEnquirable } from '../../src/domain/Availability.js';
import type { Work } from '../../src/content/schema/index.js';
import { UI_BLOCKS } from '../../src/i18n/UiCatalog.js';

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

  it('reads every label from ui.yaml (availability_sold, availability_not_for_sale, contact)', () => {
    const keys = { sold: 'availability_sold', 'not-for-sale': 'availability_not_for_sale', available: 'contact', unknown: 'contact' } as const;
    for (const [availability, key] of Object.entries(keys) as [Work['availability'], string][]) {
      for (const lang of ['en', 'fr'] as const) {
        expect(UI_BLOCKS[key], key).toBeDefined();
        expect(getAvailabilityLabel({ availability }, lang)).toBe(UI_BLOCKS[key][lang]);
      }
    }
  });
});
