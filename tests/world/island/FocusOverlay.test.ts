// @vitest-environment jsdom
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { FocusOverlay } from '../../../src/world/island/FocusOverlay.js';
import { sampleManifest } from '../fixtures.js';

/** jsdom has no <dialog> behaviour: a minimal test double of the native API. */
beforeAll(() => {
  const proto = HTMLDialogElement.prototype as HTMLDialogElement & { showModal(): void; close(): void };
  proto.showModal = function (this: HTMLDialogElement) {
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
    <img data-focus-image alt="" />
    <h2 id="drift-focus-title" data-focus-title></h2>
    <p data-focus-fragment></p>
    <p><a data-focus-work>See the work page</a></p>
    <p data-focus-contact-row><a data-focus-contact>Ask about this work</a></p>
    <button type="button" data-focus-close>Close dialog</button>
  </dialog>`;

let dialog: HTMLDialogElement;
const $ = <T extends Element>(sel: string) => dialog.querySelector(sel) as T;
beforeEach(() => {
  document.body.innerHTML = DIALOG;
  dialog = document.querySelector('dialog') as HTMLDialogElement;
});

describe('FocusOverlay', () => {
  it('opens a modal dialog with the work\'s title, fragment, unaltered image and links', () => {
    const overlay = new FocusOverlay(dialog);
    overlay.open(sampleManifest.works[0]);
    expect(dialog.open).toBe(true);
    expect(overlay.isOpen).toBe(true);
    expect($('[data-focus-title]').textContent).toBe('Arrivée');
    expect($('[data-focus-fragment]').textContent).toBe('Le moment du retour.');
    expect(($('[data-focus-fragment]') as HTMLElement).hidden).toBe(false);
    const img = $('[data-focus-image]') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('/_astro/x_960.webp');
    expect(img.alt).toBe('Arrivée');
    expect([img.width, img.height]).toEqual([960, 1200]);
    expect($('[data-focus-work]').getAttribute('href')).toBe('/fr/oeuvres/arrivee/');
    expect($('[data-focus-contact]').getAttribute('href')).toBe('/fr/contact/?work=arrivee');
  });

  it('leaves out the fragment and the contact link when the work has none', () => {
    const overlay = new FocusOverlay(dialog);
    overlay.open(sampleManifest.works[1]);
    expect(($('[data-focus-fragment]') as HTMLElement).hidden).toBe(true);
    expect(($('[data-focus-contact-row]') as HTMLElement).hidden).toBe(true);
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

  it('fails loudly when the page lacks a part of the dialog', () => {
    dialog.querySelector('[data-focus-title]')?.remove();
    expect(() => new FocusOverlay(dialog)).toThrow(/Missing \[data-focus-title\]/);
  });

  it('stops listening on detach', () => {
    const onClose = vi.fn();
    const overlay = new FocusOverlay(dialog, onClose);
    overlay.open(sampleManifest.works[0]);
    overlay.detach();
    expect(dialog.open).toBe(false);
    overlay.open(sampleManifest.works[0]);
    ($('[data-focus-close]') as HTMLButtonElement).click();
    expect(dialog.open).toBe(true);
  });
});
