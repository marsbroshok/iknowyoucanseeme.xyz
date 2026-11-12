// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContactFormEnhancer, readWorkSlug } from '../../src/scripts/ContactFormEnhancer.js';

const FORM_HTML = `
  <form action="https://api.web3forms.com/submit" method="POST" data-contact-form
        data-msg-sending="Sending" data-msg-success="Sent" data-msg-error="Failed">
    <input type="hidden" name="access_key" value="k">
    <input type="hidden" name="work" value="">
    <p data-work-note hidden>About <span data-work-title></span></p>
    <input name="name">
    <input name="email">
    <textarea name="message"></textarea>
    <button type="submit">Send</button>
    <p data-form-status role="status"></p>
  </form>
  <script type="application/json" id="work-titles">{"arrivee":"Arrivée"}</script>`;

function setup(search = '?work=arrivee') {
  document.body.innerHTML = FORM_HTML;
  const form = document.querySelector('form') as HTMLFormElement;
  // Typed by the visitor (not default values, so form.reset() clears them).
  (form.elements.namedItem('name') as HTMLInputElement).value = 'Ann';
  (form.elements.namedItem('email') as HTMLInputElement).value = 'a@b.c';
  (form.elements.namedItem('message') as HTMLTextAreaElement).value = 'Hello';
  const fetchMock = vi.fn();
  const enhancer = new ContactFormEnhancer(form, { fetch: fetchMock, search, document });
  return { form, fetchMock, enhancer };
}
const status = () => document.querySelector('[data-form-status]')?.textContent;
const submit = async (form: HTMLFormElement, enhancer: ContactFormEnhancer) => {
  const event = new Event('submit', { cancelable: true });
  await enhancer.handleSubmit(event);
  return event;
};

describe('readWorkSlug', () => {
  it('accepts a valid slug and rejects anything else', () => {
    expect(readWorkSlug('?work=venise-portrait-5')).toBe('venise-portrait-5');
    expect(readWorkSlug('?work=<script>')).toBeUndefined();
    expect(readWorkSlug('?work=')).toBeUndefined();
    expect(readWorkSlug('')).toBeUndefined();
  });
});

describe('ContactFormEnhancer', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('pre-fills the hidden work field from ?work= and shows the work title', () => {
    const { form, enhancer } = setup();
    enhancer.init();
    expect((form.elements.namedItem('work') as HTMLInputElement).value).toBe('arrivee');
    const note = document.querySelector('[data-work-note]') as HTMLElement;
    expect(note.hidden).toBe(false);
    expect(note.textContent).toContain('Arrivée');
  });

  it('shows the slug when the title is unknown, and nothing without ?work=', () => {
    const a = setup('?work=unknown-work');
    a.enhancer.init();
    expect(document.querySelector('[data-work-title]')?.textContent).toBe('unknown-work');
    const b = setup('');
    b.enhancer.init();
    expect((b.form.elements.namedItem('work') as HTMLInputElement).value).toBe('');
    expect((document.querySelector('[data-work-note]') as HTMLElement).hidden).toBe(true);
  });

  it('works without a titles script', () => {
    const { form, enhancer } = setup();
    document.getElementById('work-titles')?.remove();
    enhancer.init();
    expect((form.elements.namedItem('work') as HTMLInputElement).value).toBe('arrivee');
    expect(document.querySelector('[data-work-title]')?.textContent).toBe('arrivee');
  });

  it('rejects a malformed titles map loudly', () => {
    const { enhancer } = setup();
    (document.getElementById('work-titles') as HTMLElement).textContent = '["not","a","map"]';
    expect(() => enhancer.init()).toThrow(/work titles/);
  });

  it('submits via fetch with the form data (including work), shows success and resets but keeps work', async () => {
    const { form, fetchMock, enhancer } = setup();
    enhancer.init();
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));
    const event = await submit(form, enhancer);
    expect(event.defaultPrevented).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.web3forms.com/submit');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ Accept: 'application/json' });
    const body = init.body as FormData;
    expect(body.get('work')).toBe('arrivee');
    expect(body.get('access_key')).toBe('k');
    expect(status()).toBe('Sent');
    expect((form.elements.namedItem('message') as HTMLTextAreaElement).value).toBe('');
    expect((form.elements.namedItem('work') as HTMLInputElement).value).toBe('arrivee');
    expect((form.querySelector('button') as HTMLButtonElement).disabled).toBe(false);
  });

  it('shows the error message when the service refuses', async () => {
    const { form, fetchMock, enhancer } = setup();
    enhancer.init();
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: false, message: 'bad key' }), { status: 400 }));
    await submit(form, enhancer);
    expect(status()).toBe('Failed');
    expect((form.elements.namedItem('message') as HTMLTextAreaElement).value).toBe('Hello');
  });

  it('shows the error message when the response is ok but not a success', async () => {
    const { form, fetchMock, enhancer } = setup();
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: false }), { status: 200 }));
    await submit(form, enhancer);
    expect(status()).toBe('Failed');
  });

  it('reports network failures to the visitor and the console (not swallowed)', async () => {
    const { form, fetchMock, enhancer } = setup();
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockRejectedValue(new TypeError('offline'));
    await submit(form, enhancer);
    expect(status()).toBe('Failed');
    expect(error).toHaveBeenCalledWith('[contact] Sending failed', expect.any(TypeError));
  });

  it('shows the sending state while the request is pending', async () => {
    const { form, fetchMock, enhancer } = setup();
    let resolve!: (r: Response) => void;
    fetchMock.mockReturnValue(new Promise<Response>((r) => (resolve = r)));
    const pending = submit(form, enhancer);
    expect(status()).toBe('Sending');
    expect((form.querySelector('button') as HTMLButtonElement).disabled).toBe(true);
    resolve(new Response(JSON.stringify({ success: true })));
    await pending;
  });

  it('init wires the submit listener', async () => {
    const { form, fetchMock, enhancer } = setup();
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: true })));
    const spy = vi.spyOn(enhancer, 'handleSubmit');
    enhancer.init();
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(spy).toHaveBeenCalledTimes(1);
    await spy.mock.results[0].value;
  });

  it('fails loudly when required markup is missing', () => {
    document.body.innerHTML = '<form data-contact-form></form>';
    const form = document.querySelector('form') as HTMLFormElement;
    expect(() => new ContactFormEnhancer(form, { fetch: vi.fn(), search: '', document })).toThrow(/missing the work field/);
    document.body.innerHTML = FORM_HTML.replace('data-msg-error="Failed"', '');
    const noMsg = document.querySelector('form') as HTMLFormElement;
    expect(() => new ContactFormEnhancer(noMsg, { fetch: vi.fn(), search: '', document })).toThrow(/data-msg-\*/);
  });
});
