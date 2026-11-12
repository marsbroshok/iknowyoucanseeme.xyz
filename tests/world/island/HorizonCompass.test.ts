// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { HorizonCompass } from '../../../src/world/island/HorizonCompass.js';
import { CompassBearing } from '../../../src/world/core/CompassBearing.js';
import type { Region } from '../../../src/world/core/FieldLayout.js';

const region = (territory: string, zone: Region['zone'], z0: number, z1: number, x = 0): Region => ({
  territory,
  zone,
  start: { x, z: z0 },
  end: { x, z: z1 },
  center: { x, z: (z0 + z1) / 2 },
});
const regions = [region('dreamland', 'arrival', 0, -40), region('dreamland', 'lens', -58, -100), region('the-border-is-thin', null, 0, -90, 300)];
const labels = {
  territories: { dreamland: 'Dreamland', 'the-border-is-thin': 'La frontière est mince' },
  zones: { arrival: 'Arrivée', lens: 'La Loupe', leak: "L'Infiltration" },
};

describe('HorizonCompass', () => {
  let root: HTMLElement;
  let compass: HorizonCompass;
  beforeEach(() => {
    document.body.innerHTML = '<div data-drift-compass></div>';
    root = document.querySelector('[data-drift-compass]') as HTMLElement;
    compass = new HorizonCompass(root, regions, labels, Math.PI / 3);
  });

  const markers = () => [...root.querySelectorAll<HTMLElement>('.drift-marker')];
  const marker = (text: string) => markers().find((m) => m.textContent?.includes(text)) as HTMLElement;

  it('names where the visitor is, politely announced to screen readers', () => {
    compass.update(CompassBearing.read({ x: 0, z: -10, yaw: 0 }, regions));
    const here = root.querySelector('.drift-compass-here') as HTMLElement;
    expect(here.textContent).toBe('Dreamland · Arrivée');
    expect(here.getAttribute('aria-live')).toBe('polite');
    compass.update(CompassBearing.read({ x: 300, z: -10, yaw: 0 }, regions));
    expect(here.textContent).toBe('La frontière est mince');
  });

  it('leaves the announcement alone while the region does not change', () => {
    compass.update(CompassBearing.read({ x: 0, z: -10, yaw: 0 }, regions));
    const here = root.querySelector('.drift-compass-here') as HTMLElement;
    const node = here.firstChild;
    compass.update(CompassBearing.read({ x: 1, z: -12, yaw: 0.1 }, regions));
    expect(here.firstChild).toBe(node);
  });

  it('places the other regions on the horizon line by bearing, hiding the current one', () => {
    compass.update(CompassBearing.read({ x: 0, z: -10, yaw: 0 }, regions));
    expect(markers()).toHaveLength(3);
    expect(marker('Arrivée').hidden).toBe(true);
    const lens = marker('La Loupe');
    expect(lens.hidden).toBe(false);
    expect(lens.textContent).toBe('Dreamland · La Loupe');
    expect(lens.style.getPropertyValue('--x')).toBe('0.500');
    expect(lens.dataset.side).toBe('ahead');
  });

  it('pins regions outside the view to the edge, with an arrow', () => {
    compass.update(CompassBearing.read({ x: 0, z: -10, yaw: 0 }, regions));
    const border = marker('La frontière est mince');
    expect(border.dataset.side).toBe('right');
    expect(border.textContent).toBe('La frontière est mince ›');
    expect(border.style.getPropertyValue('--x')).toBe('0.960');
    // Turned round to the right, Lens is behind on the left.
    compass.update(CompassBearing.read({ x: 0, z: -10, yaw: -(Math.PI - 0.3) }, regions));
    expect(marker('La Loupe').textContent).toBe('‹ Dreamland · La Loupe');
    expect(marker('La Loupe').style.getPropertyValue('--x')).toBe('0.040');
  });

  it('stacks markers that would overlap, the nearest on the line', () => {
    const ahead = [region('dreamland', 'arrival', 0, -40), region('dreamland', 'lens', -58, -100), region('dreamland', 'leak', -118, -200), region('the-border-is-thin', null, 0, -90, 300)];
    const c = new HorizonCompass(root, ahead, labels, Math.PI / 3);
    c.update(CompassBearing.read({ x: 0, z: -10, yaw: 0 }, ahead));
    expect(marker('La Loupe').style.getPropertyValue('--row')).toBe('0');
    expect(marker("L'Infiltration").style.getPropertyValue('--row')).toBe('1');
    expect(marker('La frontière est mince').style.getPropertyValue('--row')).toBe('0');
  });

  it('fails loudly when a label is missing (content and layout out of sync)', () => {
    expect(() => new HorizonCompass(root, [region('nowhere', null, 0, -9)], labels, 1)).toThrow(/No label for territory "nowhere"/);
    expect(() => new HorizonCompass(root, regions, { ...labels, zones: { arrival: 'A' } }, 1)).toThrow(/No label for zone "lens"/);
  });

  it('shows nothing for an empty field', () => {
    const empty = new HorizonCompass(root, [], labels, 1);
    empty.update({ current: null, others: [] });
    expect((root.querySelector('.drift-compass-here') as HTMLElement).textContent).toBe('');
  });
});
