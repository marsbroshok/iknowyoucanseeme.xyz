// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { ZoneBanner } from '../../../src/world/island/ZoneBanner.js';
import type { Region } from '../../../src/world/core/FieldLayout.js';
import type { ZoneCrossingState } from '../../../src/world/core/ZoneCrossing.js';

const sampleRegion: Region = {
  territory: 'dreamland',
  zone: 'lens',
  start: { x: 0, z: -28 },
  end: { x: 0, z: -56 },
  center: { x: 0, z: -42 },
};

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;

describe('ZoneBanner', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <section data-drift>
        <div data-zone-banner hidden>
          <p data-zone-banner-title></p>
          <p data-zone-banner-subtitle></p>
        </div>
      </section>`;
  });

  const hiddenState: ZoneCrossingState = {
    visible: false,
    triggered: false,
    opacity: 0,
    title: '',
    subtitle: '',
    accent: '',
    region: null,
  };

  it('starts hidden and reveals title, excerpt, accent, and smooth opacity on crossing, then hides on expiry', () => {
    const banner = new ZoneBanner($('[data-drift]'));
    const card = $('[data-zone-banner]');
    const title = $('[data-zone-banner-title]');
    const subtitle = $('[data-zone-banner-subtitle]');

    expect(card.hidden).toBe(true);
    expect(card.style.opacity).toBe('0');

    banner.update({
      visible: true,
      triggered: true,
      opacity: 0.42,
      title: 'Dreamland · Lens',
      subtitle: 'Acting as a lens, this passage sharpens our perception.',
      accent: '#34d399',
      region: sampleRegion,
    });

    expect(card.hidden).toBe(false);
    expect(card.style.opacity).toBe('0.42');
    expect(card.style.getPropertyValue('--zone-accent')).toBe('#34d399');
    expect(title.textContent).toBe('Dreamland · Lens');
    expect(subtitle.textContent).toBe('Acting as a lens, this passage sharpens our perception.');
    expect(subtitle.hidden).toBe(false);

    // Subsequent plateau frame keeps text node stable while updating opacity.
    const titleNode = title.firstChild;
    banner.update({
      visible: true,
      triggered: false,
      opacity: 1,
      title: 'Dreamland · Lens',
      subtitle: 'Acting as a lens, this passage sharpens our perception.',
      accent: '#34d399',
      region: sampleRegion,
    });
    expect(title.firstChild).toBe(titleNode);
    expect(card.style.opacity).toBe('1');

    // Expiry hides the banner cleanly.
    banner.update(hiddenState);
    expect(card.hidden).toBe(true);
    expect(card.style.opacity).toBe('0');
  });

  it('hides the subtitle line when a region has an empty excerpt and clears cleanly on unmount/reset', () => {
    const banner = new ZoneBanner($('[data-drift]'));
    const card = $('[data-zone-banner]');
    const subtitle = $('[data-zone-banner-subtitle]');

    banner.update({
      visible: true,
      triggered: true,
      opacity: 1,
      title: 'The border is thin',
      subtitle: '',
      accent: '#c084fc',
      region: { ...sampleRegion, territory: 'the-border-is-thin', zone: null },
    });
    expect(card.hidden).toBe(false);
    expect(subtitle.hidden).toBe(true);

    banner.clear();
    expect(card.hidden).toBe(true);
    expect(card.style.opacity).toBe('0');

    // Re-triggering the same region after clear() refreshes copy cleanly.
    banner.update({
      visible: true,
      triggered: false,
      opacity: 0.8,
      title: 'The border is thin',
      subtitle: 'Grey autumn rain yields to fractured light.',
      accent: '#c084fc',
      region: { ...sampleRegion, territory: 'the-border-is-thin', zone: null },
    });
    expect(card.hidden).toBe(false);
    expect(subtitle.hidden).toBe(false);
    expect(subtitle.textContent).toBe('Grey autumn rain yields to fractured light.');
  });

  it('fails loudly when required banner elements are missing from the world layer', () => {
    document.body.innerHTML = '<section data-drift></section>';
    expect(() => new ZoneBanner($('[data-drift]'))).toThrow('[drift] Missing [data-zone-banner] in the world layer');
  });
});
