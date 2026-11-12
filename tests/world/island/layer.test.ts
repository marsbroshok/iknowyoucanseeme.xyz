// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DriftLayer } from '../../../src/world/island/DriftLayer.js';
import { WorkList, type WorkListHandlers } from '../../../src/world/island/WorkList.js';

describe('DriftLayer', () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<header>h</header><main><p>awake</p></main><footer inert>f</footer><section data-drift hidden tabindex="-1">world</section><script></script>';
  });
  const root = () => document.querySelector('[data-drift]') as HTMLElement;

  it('shows the world over the awake page, which stays in the DOM but out of reach', () => {
    const layer = new DriftLayer(root());
    layer.show();
    expect(layer.visible).toBe(true);
    expect(root().hidden).toBe(false);
    expect(document.querySelector('main')?.hasAttribute('inert')).toBe(true);
    expect(document.querySelector('header')?.hasAttribute('inert')).toBe(true);
    expect(document.querySelector('script')?.hasAttribute('inert')).toBe(false);
    expect(document.documentElement.classList.contains('drift-active')).toBe(true);
    expect(document.activeElement).toBe(root());
    expect(document.querySelector('main p')?.textContent).toBe('awake');
  });

  it('wakes up: the awake page is reachable again, and inert set by others is kept', () => {
    const layer = new DriftLayer(root());
    layer.show();
    layer.hide();
    expect(layer.visible).toBe(false);
    expect(root().hidden).toBe(true);
    expect(document.querySelector('main')?.hasAttribute('inert')).toBe(false);
    expect(document.querySelector('footer')?.hasAttribute('inert')).toBe(true);
    expect(document.documentElement.classList.contains('drift-active')).toBe(false);
  });
});

describe('WorkList', () => {
  let list: HTMLUListElement;
  let handlers: WorkListHandlers & { focused: string[]; opened: string[] };
  const works = [
    { slug: 'a', title: 'Alpha' },
    { slug: 'b', title: 'Beta' },
    { slug: 'c', title: 'Gamma' },
  ];
  const order = works.map((w) => w.slug);

  beforeEach(() => {
    document.body.innerHTML = '<button id="before">before</button><ul data-drift-works></ul><button id="after">after</button>';
    list = document.querySelector('ul') as HTMLUListElement;
    const focused: string[] = [];
    const opened: string[] = [];
    handlers = {
      focused,
      opened,
      onFocus: (slug) => focused.push(slug),
      onOpen: (slug) => opened.push(slug),
      next: (current, dir) => order[(order.indexOf(current as string) + dir + order.length) % order.length],
      isLast: (slug, dir) => order.indexOf(slug) + dir < 0 || order.indexOf(slug) + dir >= order.length,
    };
  });

  const button = (slug: string) => list.querySelector(`button[data-slug="${slug}"]`) as HTMLButtonElement;
  const tab = (from: HTMLElement, shiftKey = false) => {
    const e = new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true });
    from.dispatchEvent(e);
    return e;
  };

  it('lists every work as a button, with one tab stop (the entry)', () => {
    new WorkList(list, works, handlers);
    expect([...list.querySelectorAll('li > button')].map((b) => b.textContent)).toEqual(['Alpha', 'Beta', 'Gamma']);
    expect([...list.querySelectorAll('button')].map((b) => b.tabIndex)).toEqual([0, -1, -1]);
    expect(button('a').type).toBe('button');
  });

  it('moves the tab stop to the nearest work', () => {
    const wl = new WorkList(list, works, handlers);
    wl.setEntry('b');
    expect([...list.querySelectorAll('button')].map((b) => b.tabIndex)).toEqual([-1, 0, -1]);
    wl.setEntry('unknown');
    expect([...list.querySelectorAll('button')].map((b) => b.tabIndex)).toEqual([-1, 0, -1]);
  });

  it('tells the world which work has focus (the camera glides there)', () => {
    new WorkList(list, works, handlers);
    button('b').focus();
    expect(handlers.focused).toEqual(['b']);
    expect(button('b').tabIndex).toBe(0);
  });

  it('Tab and Shift+Tab go along the path inside the list', () => {
    new WorkList(list, works, handlers);
    button('a').focus();
    expect(tab(button('a')).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(button('b'));
    expect(tab(button('b'), true).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(button('a'));
  });

  it('lets Tab leave the list at either end (no keyboard trap)', () => {
    new WorkList(list, works, handlers);
    expect(tab(button('c')).defaultPrevented).toBe(false);
    expect(tab(button('a'), true).defaultPrevented).toBe(false);
  });

  it('ignores other keys and keys from outside the buttons', () => {
    new WorkList(list, works, handlers);
    const e = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true });
    button('a').dispatchEvent(e);
    expect(e.defaultPrevented).toBe(false);
    const li = list.querySelector('li') as HTMLElement;
    expect(tab(li).defaultPrevented).toBe(false);
  });

  it('opens a work on click or Enter (native button)', () => {
    new WorkList(list, works, handlers);
    button('c').click();
    expect(handlers.opened).toEqual(['c']);
  });

  it('focuses a work on request', () => {
    const wl = new WorkList(list, works, handlers);
    wl.focus('b');
    expect(document.activeElement).toBe(button('b'));
    wl.focus('unknown');
    expect(document.activeElement).toBe(button('b'));
  });

  it('cleans up on detach', () => {
    const wl = new WorkList(list, works, handlers);
    const spy = vi.fn();
    handlers.onOpen = spy;
    wl.detach();
    expect(list.children).toHaveLength(0);
  });
});
