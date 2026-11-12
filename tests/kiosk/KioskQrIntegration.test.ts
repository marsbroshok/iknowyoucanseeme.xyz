import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { generateKioskQrCodes, kioskQrCodes } from '../../tools/kiosk/KioskQrIntegration.js';
import { decodeQrSvg } from '../qr/decodeQr.js';

const ROOT = path.resolve(__dirname, '../..');

/** A works directory with two real work files. */
function fixtureWorks(): { tmp: string; worksDir: string } {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kiosk-qr-'));
  const worksDir = path.join(tmp, 'works');
  fs.mkdirSync(worksDir);
  for (const slug of ['venise-portrait-5', 'arrivee']) fs.copyFileSync(path.join(ROOT, 'src/content/works', `${slug}.yaml`), path.join(worksDir, `${slug}.yaml`));
  fs.writeFileSync(path.join(worksDir, 'notes.txt'), 'not a work');
  return { tmp, worksDir };
}

type Hook<T> = (o: T) => Promise<void> | void;

describe('generateKioskQrCodes', () => {
  it('writes one SVG per work and language that opens the work page in that language', async () => {
    const { tmp, worksDir } = fixtureWorks();
    const outDir = path.join(tmp, 'dist');
    const files = await generateKioskQrCodes({ worksDir, outDir, site: 'https://www.iknowyoucanseeme.xyz' });
    expect(files.map((f) => path.relative(outDir, f)).sort()).toEqual(
      ['qr/en/arrivee.svg', 'qr/en/venise-portrait-5.svg', 'qr/fr/arrivee.svg', 'qr/fr/venise-portrait-5.svg'].map((p) => p.split('/').join(path.sep)),
    );
    expect(await decodeQrSvg(fs.readFileSync(path.join(outDir, 'qr/fr/venise-portrait-5.svg'), 'utf8'))).toBe('https://www.iknowyoucanseeme.xyz/fr/oeuvres/venise-portrait-5/');
    expect(await decodeQrSvg(fs.readFileSync(path.join(outDir, 'qr/en/arrivee.svg'), 'utf8'))).toBe('https://www.iknowyoucanseeme.xyz/en/works/arrivee/');
  });

  it('fails loudly on an invalid work file', async () => {
    const { tmp, worksDir } = fixtureWorks();
    fs.writeFileSync(path.join(worksDir, 'broken.yaml'), 'slug: broken\n');
    await expect(generateKioskQrCodes({ worksDir, outDir: path.join(tmp, 'dist'), site: 'https://x.example' })).rejects.toThrow();
  });
});

describe('kioskQrCodes integration', () => {
  it('takes the site from the Astro config and writes the codes on astro:build:done', async () => {
    const { tmp, worksDir } = fixtureWorks();
    const integration = kioskQrCodes({ worksDir });
    expect(integration.name).toBe('kiosk-qr-codes');
    (integration.hooks['astro:config:done'] as unknown as Hook<{ config: { site?: string } }>)({ config: { site: 'https://www.iknowyoucanseeme.xyz/' } });
    const buildDir = path.join(tmp, 'dist');
    fs.mkdirSync(buildDir);
    const info = vi.fn();
    await (integration.hooks['astro:build:done'] as unknown as Hook<{ dir: URL; logger: { info: (m: string) => void } }>)({ dir: pathToFileURL(buildDir + path.sep), logger: { info } });
    expect(await decodeQrSvg(fs.readFileSync(path.join(buildDir, 'qr/en/venise-portrait-5.svg'), 'utf8'))).toBe('https://www.iknowyoucanseeme.xyz/en/works/venise-portrait-5/');
    expect(info).toHaveBeenCalledWith('4 exhibition QR codes written to qr/');
  });

  it('refuses to build the codes without a site', async () => {
    const integration = kioskQrCodes();
    (integration.hooks['astro:config:done'] as unknown as Hook<{ config: { site?: string } }>)({ config: {} });
    const hook = integration.hooks['astro:build:done'] as unknown as Hook<{ dir: URL; logger: { info: (m: string) => void } }>;
    await expect(hook({ dir: pathToFileURL(os.tmpdir() + path.sep), logger: { info: () => undefined } })).rejects.toThrow('[kiosk] The Astro config needs a site for the QR codes');
  });
});
