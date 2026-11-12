// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SoundControls } from '../../../src/sound/island/SoundControls.js';
import { SoundDirector } from '../../../src/sound/core/SoundDirector.js';
import { SoundPreference } from '../../../src/sound/core/SoundPreference.js';
import { MemoryStorage } from '../../world/memoryStorage.js';

let visibility: DocumentVisibilityState = 'visible';
beforeEach(() => {
  visibility = 'visible';
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility });
  document.body.innerHTML = '<button type="button" data-sound-toggle data-label-mute="Mute sound" data-label-unmute="Unmute sound">Mute sound</button>';
});

const button = () => document.querySelector('[data-sound-toggle]') as HTMLButtonElement;

function director(storage = new MemoryStorage()) {
  const d = new SoundDirector(new SoundPreference(storage), vi.fn(async () => Promise.reject(new Error('not in this test'))));
  return { d, storage, setHidden: vi.spyOn(d, 'setHidden'), setMuted: vi.spyOn(d, 'setMuted') };
}

describe('SoundControls', () => {
  it('labels the toggle with what a press does, from the stored choice', () => {
    const storage = new MemoryStorage();
    storage.setItem(SoundPreference.KEY, 'off');
    new SoundControls(button(), director(storage).d, document);
    expect(button().textContent).toBe('Unmute sound');
    expect(button().dataset.muted).toBe('true');
  });

  it('a press toggles mute in the director and the label follows', () => {
    const { d, setMuted } = director();
    new SoundControls(button(), d, document);
    expect(button().textContent).toBe('Mute sound');
    button().click();
    expect(setMuted).toHaveBeenLastCalledWith(true);
    expect(button().textContent).toBe('Unmute sound');
    button().click();
    expect(setMuted).toHaveBeenLastCalledWith(false);
    expect(button().textContent).toBe('Mute sound');
  });

  it('tells the director when the tab is hidden or shown, starting with the current state', () => {
    const { d, setHidden } = director();
    visibility = 'hidden';
    new SoundControls(button(), d, document);
    expect(setHidden).toHaveBeenLastCalledWith(true);
    visibility = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    expect(setHidden).toHaveBeenLastCalledWith(false);
  });

  it('detach removes the listeners', () => {
    const { d, setHidden, setMuted } = director();
    const controls = new SoundControls(button(), d, document);
    controls.detach();
    setHidden.mockClear();
    button().click();
    document.dispatchEvent(new Event('visibilitychange'));
    expect(setMuted).not.toHaveBeenCalled();
    expect(setHidden).not.toHaveBeenCalled();
  });

  it('reports a toggle without its labels', () => {
    document.body.innerHTML = '<button data-sound-toggle data-label-mute="Mute sound">x</button>';
    expect(() => new SoundControls(button(), director().d, document)).toThrow('[sound] [data-sound-toggle] needs data-label-mute and data-label-unmute');
    document.body.innerHTML = '<button data-sound-toggle data-label-unmute="Unmute sound">x</button>';
    expect(() => new SoundControls(button(), director().d, document)).toThrow('needs data-label-mute');
  });
});
