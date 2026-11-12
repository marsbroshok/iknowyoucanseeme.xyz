import { describe, it, expect, beforeAll } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import ContactPage from '../../src/components/pages/ContactPage.astro';

describe('ContactPage', () => {
  let container: AstroContainer;
  beforeAll(async () => {
    container = await AstroContainer.create();
  });

  const titles = { arrivee: 'Arrivée', solitude: 'Solitude' };

  it('without an access key: no form, only the email (explicit email-only mode)', async () => {
    const html = await container.renderToString(ContactPage, { props: { lang: 'en', workTitles: titles } });
    expect(html).not.toContain('<form');
    expect(html).not.toContain('api.web3forms.com');
    expect(html).toContain('The best way to reach me is by email.');
    expect(html).toContain('href="mailto:marsbroshok+iknowyoucanseeme@gmail.com"');
    expect(html).toContain('rel="canonical" href="https://www.iknowyoucanseeme.xyz/en/contact/"');
  });

  it('with an access key: a plain-POST Web3Forms form with labelled fields, honeypot and work field', async () => {
    const html = await container.renderToString(ContactPage, { props: { lang: 'fr', accessKey: 'test-key-123', workTitles: titles } });
    expect(html).toMatch(/<form[^>]*action="https:\/\/api\.web3forms\.com\/submit"[^>]*method="POST"/);
    expect(html).toMatch(/name="access_key"[^>]*value="test-key-123"|value="test-key-123"[^>]*name="access_key"/);
    expect(html).toMatch(/<input[^>]*type="hidden"[^>]*name="work"/);
    for (const [id, label] of [['contact-name', 'Nom'], ['contact-email', 'Email'], ['contact-message', 'Message']]) {
      expect(html).toMatch(new RegExp(`<label[^>]*for="${id}"[^>]*>${label}`));
      expect(html).toMatch(new RegExp(`id="${id}"[^>]*required|required[^>]*id="${id}"`));
    }
    expect(html).toMatch(/type="email"/);
    expect(html).toMatch(/name="botcheck"/);
    expect(html).toContain('Laissez ce champ vide');
    expect(html).toMatch(/data-form-status[^>]*role="status"|role="status"[^>]*data-form-status/);
    expect(html).toContain('data-msg-success="Message envoyé avec succès."');
    expect(html).toContain('data-msg-error="Une erreur est survenue. Veuillez réessayer."');
    expect(html).toContain('id="work-titles"');
    expect(html).toContain('"arrivee":"Arrivée"');
    expect(html).toContain('Envoyer');
    // The email stays visible as a fallback.
    expect(html).toContain('href="mailto:marsbroshok+iknowyoucanseeme@gmail.com"');
  });
});
