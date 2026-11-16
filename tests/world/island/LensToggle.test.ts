// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LENS_MODES, type LensMode } from '../../../src/world/core/LensMode.js';
import { LensToggle } from '../../../src/world/island/LensToggle.js';

const NAMES: Record<LensMode, string> = {
  gel: 'Colour filter',
  mirror: 'Mirror fold',
  exposure: 'Multiple exposure',
  fracture: 'Fracture and collage',
  flare: 'Light leak',
  icm: 'Motion blur',
};

let button: HTMLButtonElement;

function makeButton(attrs: Partial<Record<'names' | 'prompt' | 'template', string>> = {}): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.setAttribute('data-lens-cycle', '');
  btn.dataset.lensNames = attrs.names ?? JSON.stringify(NAMES);
  btn.dataset.lensPrompt = attrs.prompt ?? 'Lens';
  btn.dataset.lensTemplate = attrs.template ?? 'Lens · {mode}';
  document.body.replaceChildren(btn);
  return btn;
}

beforeEach(() => {
  button = makeButton();
});

describe('LensToggle', () => {
  it('initializes with idle prompt, updates label and data attributes across lens modes, and resets to prompt on null', () => {
    const toggle = new LensToggle(button, { onCycle: () => null });
    expect(button.textContent).toBe('Lens');
    expect(button.dataset.lensActive).toBe('false');
    expect(button.dataset.lensMode).toBeUndefined();
    expect(toggle.currentMode).toBeNull();

    // Repeated null is a no-op.
    toggle.setMode(null);
    expect(button.textContent).toBe('Lens');

    toggle.setMode('mirror');
    expect(button.textContent).toBe('Lens · Mirror fold');
    expect(button.dataset.lensActive).toBe('true');
    expect(button.dataset.lensMode).toBe('mirror');
    expect(toggle.currentMode).toBe('mirror');

    // Repeated same mode is a no-op.
    toggle.setMode('mirror');
    expect(button.textContent).toBe('Lens · Mirror fold');

    toggle.setMode(null);
    expect(button.textContent).toBe('Lens');
    expect(button.dataset.lensActive).toBe('false');
    expect(button.dataset.lensMode).toBeUndefined();
    toggle.detach();
  });

  it('cycles through all 6 camera lenses on click/tap and stops listening on detach', () => {
    let idx = -1;
    const onCycle = vi.fn((): LensMode | null => {
      idx = (idx + 1) % LENS_MODES.length;
      return LENS_MODES[idx];
    });
    const toggle = new LensToggle(button, { onCycle });

    const seenLabels: string[] = [];
    for (let i = 0; i < LENS_MODES.length; i++) {
      button.click();
      seenLabels.push(button.textContent ?? '');
    }
    expect(seenLabels).toEqual([
      'Lens · Colour filter',
      'Lens · Mirror fold',
      'Lens · Multiple exposure',
      'Lens · Fracture and collage',
      'Lens · Light leak',
      'Lens · Motion blur',
    ]);

    toggle.detach();
    button.click();
    expect(onCycle).toHaveBeenCalledTimes(LENS_MODES.length);
  });

  it('leaves idle prompt intact when onCycle returns null (no work in view)', () => {
    const toggle = new LensToggle(button, { onCycle: () => null });
    button.click();
    expect(button.textContent).toBe('Lens');
    expect(toggle.currentMode).toBeNull();
    toggle.detach();
  });

  it('fails loudly when lens names JSON, prompt, or {mode} template are missing or incomplete', () => {
    const missingNames = document.createElement('button');
    expect(() => new LensToggle(missingNames, { onCycle: () => null })).toThrow(/has no name in data-lens-names/);

    const partial = makeButton({ names: JSON.stringify({ ...NAMES, icm: '' }) });
    expect(() => new LensToggle(partial, { onCycle: () => null })).toThrow(/icm/);

    const emptyPrompt = makeButton({ prompt: '' });
    expect(() => new LensToggle(emptyPrompt, { onCycle: () => null })).toThrow(/data-lens-prompt/);

    const badTemplate = makeButton({ template: 'Lens' });
    expect(() => new LensToggle(badTemplate, { onCycle: () => null })).toThrow(/data-lens-template/);
  });
});
