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

  it('does nothing when there is no contact form', () => {
    document.body.innerHTML = '<p>no form</p>';
    expect(bootContactForms(document, { fetch: vi.fn(), location: { search: '' } })).toBe(0);
  });
});
