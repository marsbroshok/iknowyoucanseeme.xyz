// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { bootContactForms } from '../../src/scripts/ContactFormBoot.js';

const form = (id: string) => `
  <form id="${id}" action="https://api.web3forms.com/submit" data-contact-form
        data-msg-sending="S" data-msg-success="OK" data-msg-error="KO">
    <input type="hidden" name="work" value="">
    <button type="submit">Send</button>
    <p data-form-status></p>
  </form>`;

describe('bootContactForms', () => {
  it('enhances every contact form on the page with the window fetch and query', () => {
    document.body.innerHTML = form('a') + form('b') + '<form id="other"></form>';
    const fetchMock = vi.fn();
    const count = bootContactForms(document, { fetch: fetchMock, location: { search: '?work=solitude' } });
    expect(count).toBe(2);
    for (const id of ['a', 'b']) {
      expect((document.querySelector(`#${id} input[name="work"]`) as HTMLInputElement).value).toBe('solitude');
    }
  });

  it('calls fetch with the window as receiver (native fetch throws "Illegal invocation" otherwise)', async () => {
    document.body.innerHTML = form('a');
    const win = {
      location: { search: '' },
      fetch(this: unknown) {
        if (this !== win) throw new TypeError('Illegal invocation');
        return Promise.resolve(new Response(JSON.stringify({ success: true })));
      },
    };
    bootContactForms(document, win as unknown as Parameters<typeof bootContactForms>[1]);
    const f = document.querySelector('form') as HTMLFormElement;
    f.dispatchEvent(new Event('submit', { cancelable: true }));
    await vi.waitFor(() => expect(f.querySelector('[data-form-status]')?.textContent).toBe('OK'));
  });

  it('does nothing when there is no contact form', () => {
    document.body.innerHTML = '<p>no form</p>';
    expect(bootContactForms(document, { fetch: vi.fn(), location: { search: '' } })).toBe(0);
  });
});
