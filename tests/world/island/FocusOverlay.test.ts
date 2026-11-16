// @vitest-environment jsdom
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { FocusOverlay } from '../../../src/world/island/FocusOverlay.js';
import { sampleManifest } from '../fixtures.js';

/** jsdom has no <dialog> behaviour: a minimal test double of the native API. */
beforeAll(() => {
  const proto = HTMLDialogElement.prototype as HTMLDialogElement & { showModal(): void; close(): void };
  proto.showModal = function (this: HTMLDialogElement) {
    if (this.hasAttribute('open')) {
      throw new DOMException('Dialog is already open', 'InvalidStateError');
    }
    this.setAttribute('open', '');
  };
  proto.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});

const DIALOG = `
  <button id="opener">work</button>
  <dialog data-drift-focus closedby="any" aria-labelledby="drift-focus-title">
    <div class="drift-focus-header">
      <p data-focus-context></p>
      <button type="button" data-focus-close>Close dialog</button>
    </div>
    <img data-focus-image alt="" />
    <h2 id="drift-focus-title" data-focus-title></h2>
    <p data-focus-meta></p>
    <p data-focus-fragment></p>
    <p data-focus-specimen hidden></p>
    <div class="drift-focus-stepper">
      <button type="button" data-focus-prev>Previous work</button>
      <button type="button" data-focus-next>Next work</button>
    </div>
    <p data-focus-work-row><a data-focus-work>See the work page</a></p>
    <p data-focus-contact-row><a data-focus-contact>Ask about this work</a></p>
    <figure data-focus-qr-row hidden><img data-focus-qr alt="QR code of the work page" /><figcaption>Scan to open this work on your phone</figcaption></figure>
  </dialog>`;

let dialog: HTMLDialogElement;
const $ = <T extends Element>(sel: string) => dialog.querySelector(sel) as T;
beforeEach(() => {
  document.body.innerHTML = DIALOG;
  dialog = document.querySelector('dialog') as HTMLDialogElement;
});

describe('FocusOverlay', () => {
  it('opens a modal dialog with context header, title, curatorial metadata, fragment, unaltered image and links', () => {
    const overlay = new FocusOverlay(dialog);
    overlay.open(sampleManifest.works[0]);
    expect(dialog.open).toBe(true);
    expect(overlay.isOpen).toBe(true);
    expect($('[data-focus-context]').textContent).toBe('Dreamland · Arrivée · 1 / 2');
    expect($('[data-focus-title]').textContent).toBe('Arrivée');
    expect($('[data-focus-meta]').textContent).toBe('30 × 40 cm · 2025 · photographie · Disponibilité sur demande');
    expect($('[data-focus-fragment]').textContent).toBe('Le moment du retour.');
    expect(($('[data-focus-fragment]') as HTMLElement).hidden).toBe(false);
    const img = $('[data-focus-image]') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('/_astro/x_960.webp');
    expect(img.alt).toBe('Arrivée');
    expect([img.width, img.height]).toEqual([960, 1200]);
    expect($('[data-focus-work]').getAttribute('href')).toBe('/fr/oeuvres/arrivee/');
    expect($('[data-focus-contact]').getAttribute('href')).toBe('/fr/contact/?work=arrivee');
  });

  it('updates an already-open dialog without calling showModal() a second time', () => {
    const overlay = new FocusOverlay(dialog);
    overlay.open(sampleManifest.works[0]);
    overlay.open(sampleManifest.works[1]);
    expect(dialog.open).toBe(true);
    expect($('[data-focus-title]').textContent).toBe('Cygne ICM 1');
    expect($('[data-focus-context]').textContent).toBe('La frontière est mince · 2 / 2');
    expect($('[data-focus-meta]').textContent).toBe('2026 · photographie · ICM · Vendu');
  });

  it('leaves out the fragment and removes the contact href when the work has none', () => {
    const overlay = new FocusOverlay(dialog);
    overlay.open(sampleManifest.works[0]);
    overlay.open(sampleManifest.works[1]);
    expect(($('[data-focus-fragment]') as HTMLElement).hidden).toBe(true);
    expect(($('[data-focus-contact-row]') as HTMLElement).hidden).toBe(true);
    expect($('[data-focus-contact]').hasAttribute('href')).toBe(false);
  });

  it('shows a Leak-zone work\'s specimen tag, and hides it for other works', () => {
    const overlay = new FocusOverlay(dialog);
    overlay.open({ ...sampleManifest.works[0], specimen: 'spécimen 03 · Venise · 2025' });
    expect($('[data-focus-specimen]').textContent).toBe('spécimen 03 · Venise · 2025');
    expect(($('[data-focus-specimen]') as HTMLElement).hidden).toBe(false);
    overlay.open(sampleManifest.works[1]);
    expect(($('[data-focus-specimen]') as HTMLElement).hidden).toBe(true);
  });

  it('keeps the QR code hidden outside the exhibition mode', () => {
    new FocusOverlay(dialog).open(sampleManifest.works[0]);
    expect(($('[data-focus-qr-row]') as HTMLElement).hidden).toBe(true);
    expect(($('[data-focus-work-row]') as HTMLElement).hidden).toBe(false);
  });

  it('in the exhibition mode shows the work\'s QR code instead of the links and leaves zero a[href] elements', () => {
    const overlay = new FocusOverlay(dialog, undefined, { kiosk: true });
    overlay.open(sampleManifest.works[0]);
    expect(($('[data-focus-qr-row]') as HTMLElement).hidden).toBe(false);
    expect($('[data-focus-qr]').getAttribute('src')).toBe('/qr/fr/arrivee.svg');
    expect(($('[data-focus-contact-row]') as HTMLElement).hidden).toBe(true);
    expect(($('[data-focus-work-row]') as HTMLElement).hidden).toBe(true);
    expect(dialog.querySelectorAll('a[href]')).toHaveLength(0);
  });

  it('steps in place via [data-focus-prev] and [data-focus-next] buttons, updating metadata, image, and links', () => {
    const steps: Array<[string, -1 | 1]> = [];
    const overlay = new FocusOverlay(dialog, undefined, {
      onStep: (slug, direction) => {
        steps.push([slug, direction]);
        return slug === 'arrivee' ? sampleManifest.works[1] : sampleManifest.works[0];
      },
    });
    overlay.open(sampleManifest.works[0]);

    ($('[data-focus-next]') as HTMLButtonElement).click();
    expect(steps).toEqual([['arrivee', 1]]);
    expect(dialog.open).toBe(true);
    expect($('[data-focus-title]').textContent).toBe('Cygne ICM 1');
    expect($('[data-focus-context]').textContent).toBe('La frontière est mince · 2 / 2');

    ($('[data-focus-prev]') as HTMLButtonElement).click();
    expect(steps).toEqual([
      ['arrivee', 1],
      ['cygne-icm-1', -1],
    ]);
    expect($('[data-focus-title]').textContent).toBe('Arrivée');
    expect($('[data-focus-context]').textContent).toBe('Dreamland · Arrivée · 1 / 2');
  });

  it('steps in place on ArrowRight and ArrowLeft keys while open, ignoring modifier combos, other keys, closed state, or null onStep results', () => {
    const steps: Array<[string, -1 | 1]> = [];
    let allowStep = true;
    const overlay = new FocusOverlay(dialog, undefined, {
      onStep: (slug, direction) => {
        steps.push([slug, direction]);
        if (!allowStep) return null;
        return slug === 'arrivee' ? sampleManifest.works[1] : sampleManifest.works[0];
      },
    });

    // Ignored while dialog is closed.
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    ($('[data-focus-next]') as HTMLButtonElement).click();
    expect(steps).toEqual([]);

    overlay.open(sampleManifest.works[0]);

    // Unrelated keys and modifier shortcuts are ignored.
    const tabEv = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    dialog.dispatchEvent(tabEv);
    expect(tabEv.defaultPrevented).toBe(false);

    const altRight = new KeyboardEvent('keydown', { key: 'ArrowRight', altKey: true, bubbles: true, cancelable: true });
    dialog.dispatchEvent(altRight);
    expect(altRight.defaultPrevented).toBe(false);
    expect(steps).toEqual([]);

    // ArrowRight advances in place and prevents default scrolling.
    const rightEv = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    dialog.dispatchEvent(rightEv);
    expect(rightEv.defaultPrevented).toBe(true);
    expect($('[data-focus-title]').textContent).toBe('Cygne ICM 1');

    // ArrowLeft steps back in place.
    const leftEv = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true });
    dialog.dispatchEvent(leftEv);
    expect(leftEv.defaultPrevented).toBe(true);
    expect($('[data-focus-title]').textContent).toBe('Arrivée');

    // Null result from onStep leaves current work untouched.
    allowStep = false;
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect($('[data-focus-title]').textContent).toBe('Arrivée');

    // Without onStep configured, clicking prev/next is a safe no-op.
    overlay.detach();
    const standalone = new FocusOverlay(dialog);
    standalone.open(sampleManifest.works[0]);
    ($('[data-focus-next]') as HTMLButtonElement).click();
    expect($('[data-focus-title]').textContent).toBe('Arrivée');
    standalone.detach();
  });

  it('close() closes an open dialog (exhibition reset) and does nothing when closed', () => {
    const onClose = vi.fn();
    const overlay = new FocusOverlay(dialog, onClose);
    overlay.close();
    expect(onClose).not.toHaveBeenCalled();
    overlay.open(sampleManifest.works[0]);
    overlay.close();
    expect(overlay.isOpen).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes with its button and tells the world', () => {
    const onClose = vi.fn();
    const overlay = new FocusOverlay(dialog, onClose);
    overlay.open(sampleManifest.works[0]);
    ($('[data-focus-close]') as HTMLButtonElement).click();
    expect(dialog.open).toBe(false);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes on a click on the backdrop where closedby is not supported (Safari), not on the content', () => {
    const overlay = new FocusOverlay(dialog);
    overlay.open(sampleManifest.works[0]);
    dialog.getBoundingClientRect = () => ({ top: 100, left: 100, width: 200, height: 200, right: 300, bottom: 300, x: 100, y: 100, toJSON: () => ({}) });
    dialog.dispatchEvent(new MouseEvent('click', { clientX: 150, clientY: 150, bubbles: true }));
    expect(dialog.open).toBe(true);
    $('[data-focus-title]').dispatchEvent(new MouseEvent('click', { clientX: 10, clientY: 10, bubbles: true }));
    expect(dialog.open).toBe(true);
    dialog.dispatchEvent(new MouseEvent('click', { clientX: 10, clientY: 10, bubbles: true }));
    expect(dialog.open).toBe(false);
  });

  it('relies on the native light dismiss where closedby is supported', () => {
    Object.defineProperty(HTMLDialogElement.prototype, 'closedBy', { configurable: true, value: 'any' });
    const overlay = new FocusOverlay(dialog);
    overlay.open(sampleManifest.works[0]);
    dialog.getBoundingClientRect = () => ({ top: 100, left: 100, width: 200, height: 200, right: 300, bottom: 300, x: 100, y: 100, toJSON: () => ({}) });
    dialog.dispatchEvent(new MouseEvent('click', { clientX: 10, clientY: 10, bubbles: true }));
    expect(dialog.open).toBe(true);
    delete (HTMLDialogElement.prototype as unknown as Record<string, unknown>).closedBy;
  });

  it('fails loudly when the page lacks a core part of the dialog, while tolerating absent optional header/stepper slots', () => {
    for (const sel of ['[data-focus-context]', '[data-focus-meta]', '[data-focus-prev]', '[data-focus-next]']) {
      dialog.querySelector(sel)?.remove();
    }
    const minimal = new FocusOverlay(dialog);
    minimal.open(sampleManifest.works[0]);
    expect($('[data-focus-title]').textContent).toBe('Arrivée');
    minimal.detach();

    dialog.querySelector('[data-focus-title]')?.remove();
    expect(() => new FocusOverlay(dialog)).toThrow(/Missing \[data-focus-title\]/);
  });

  it('stops listening on detach', () => {
    const onClose = vi.fn();
    const onStep = vi.fn(() => sampleManifest.works[1]);
    const overlay = new FocusOverlay(dialog, onClose, { onStep });
    overlay.open(sampleManifest.works[0]);
    overlay.detach();
    expect(dialog.open).toBe(false);
    dialog.showModal();
    ($('[data-focus-close]') as HTMLButtonElement).click();
    ($('[data-focus-next]') as HTMLButtonElement).click();
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(dialog.open).toBe(true);
    expect(onStep).not.toHaveBeenCalled();
  });
});
