// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { WorldWhisper } from '../../../src/world/island/WorldWhisper.js';

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;

beforeEach(() => {
  document.body.innerHTML = `
    <section data-drift>
      <p data-drift-gaze aria-hidden="true">I know you can see me</p>
      <p data-drift-fragment aria-hidden="true"></p>
      <p data-drift-said aria-live="polite"></p>
    </section>`;
});

const whisper = () => new WorldWhisper($('[data-drift]'));

describe('WorldWhisper', () => {
  it('starts silent and invisible', () => {
    whisper();
    expect($('[data-drift-gaze]').style.opacity).toBe('0');
    expect($('[data-drift-fragment]').style.opacity).toBe('0');
    expect($('[data-drift-said]').textContent).toBe('');
  });

  it('shows the gaze line at an opacity, and mirrors it into the live region when it starts', () => {
    const w = whisper();
    w.gaze(0.4, true);
    expect($('[data-drift-gaze]').style.opacity).toBe('0.4');
    expect($('[data-drift-said]').textContent).toBe('I know you can see me');
    w.gaze(1, false);
    expect($('[data-drift-gaze]').style.opacity).toBe('1');
  });

  it('places a fragment near its work (screen position from the projection), mirrors it once, and clears it', () => {
    const w = whisper();
    w.fragment({ text: 'The moment of return.', opacity: 0.5, at: { x: 0, y: 0.5 } }, true);
    const el = $('[data-drift-fragment]');
    expect(el.textContent).toBe('The moment of return.');
    expect(el.style.opacity).toBe('0.5');
    expect(el.style.getPropertyValue('--x')).toBe('50%');
    expect(el.style.getPropertyValue('--y')).toBe('25%');
    expect($('[data-drift-said]').textContent).toBe('The moment of return.');
    w.fragment({ text: 'The moment of return.', opacity: 1, at: { x: 3, y: -3 } }, false);
    expect(el.style.getPropertyValue('--x')).toBe('85%');
    expect(el.style.getPropertyValue('--y')).toBe('85%');
    w.fragment(null, false);
    expect(el.textContent).toBe('');
    expect(el.style.opacity).toBe('0');
  });

  it('keeps a fragment in place when its work is off screen (no position)', () => {
    const w = whisper();
    w.fragment({ text: 'A.', opacity: 1, at: { x: 0, y: 0 } }, true);
    w.fragment({ text: 'A.', opacity: 0.8, at: null }, false);
    expect($('[data-drift-fragment]').style.getPropertyValue('--x')).toBe('50%');
    expect($('[data-drift-fragment]').style.opacity).toBe('0.8');
  });

  it('reports a world layer without its text elements', () => {
    document.body.innerHTML = '<section data-drift></section>';
    expect(() => whisper()).toThrow('[drift] Missing [data-drift-gaze] in the world layer');
  });
});
