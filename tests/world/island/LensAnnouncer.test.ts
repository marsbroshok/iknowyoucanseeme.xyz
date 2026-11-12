// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { LensAnnouncer } from '../../../src/world/island/LensAnnouncer.js';

const NAMES = { gel: 'Colour filter', mirror: 'Mirror fold', exposure: 'Multiple exposure', fracture: 'Fracture', flare: 'Light leak', icm: 'Motion blur' };
let el: HTMLElement;
beforeEach(() => {
  document.body.innerHTML = `<p data-drift-lens aria-live="polite"></p>`;
  el = document.querySelector('[data-drift-lens]') as HTMLElement;
  el.dataset.lensNames = JSON.stringify(NAMES);
});

describe('LensAnnouncer', () => {
  it('shows the name of the lens in use, and empties when the lens is off', () => {
    const a = new LensAnnouncer(el);
    a.announce('mirror');
    expect(el.textContent).toBe('Mirror fold');
    a.announce('icm');
    expect(el.textContent).toBe('Motion blur');
    a.clear();
    expect(el.textContent).toBe('');
  });

  it('does not rewrite the live region for the same lens (no repeated announcement)', () => {
    const a = new LensAnnouncer(el);
    a.announce('gel');
    el.textContent = 'touched';
    a.announce('gel');
    expect(el.textContent).toBe('touched');
    a.clear();
    a.announce('gel');
    expect(el.textContent).toBe('Colour filter');
  });

  it('refuses a page that lacks a lens name', () => {
    el.dataset.lensNames = JSON.stringify({ ...NAMES, flare: '' });
    expect(() => new LensAnnouncer(el)).toThrow('[drift] The lens "flare" has no name in data-lens-names');
    delete el.dataset.lensNames;
    expect(() => new LensAnnouncer(el)).toThrow(/"gel" has no name/);
  });
});
