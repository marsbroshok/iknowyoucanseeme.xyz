import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { AudioManifest } from '../../../src/sound/core/AudioManifest.js';

describe('AudioManifest', () => {
  it('accepts the empty manifest the site ships (no field recordings yet)', () => {
    expect(AudioManifest.parse({ zones: {} })).toEqual([]);
  });

  it('the shipped public/audio/manifest.json is valid and empty, and lives at the URL the engine fetches', () => {
    const file = path.resolve(__dirname, '../../../public', AudioManifest.URL.slice(1));
    expect(AudioManifest.URL).toBe('/audio/manifest.json');
    expect(AudioManifest.parse(JSON.parse(fs.readFileSync(file, 'utf8')))).toEqual([]);
  });

  it('lists looping files per zone, with a gain (default 1)', () => {
    expect(
      AudioManifest.parse({
        zones: {
          arrival: [{ src: '/audio/sea-at-dusk.ogg', gain: 0.5 }, { src: '/audio/gulls.mp3' }],
          border: [{ src: '/audio/wind/dune.opus', gain: 1 }],
        },
      }),
    ).toEqual([
      { zone: 'arrival', src: '/audio/sea-at-dusk.ogg', gain: 0.5 },
      { zone: 'arrival', src: '/audio/gulls.mp3', gain: 1 },
      { zone: 'border', src: '/audio/wind/dune.opus', gain: 1 },
    ]);
  });

  it('rejects a manifest that is not an object with zones', () => {
    for (const bad of [null, [], 'zones', 3, {}, { zones: [] }, { zones: null }]) {
      expect(() => AudioManifest.parse(bad), JSON.stringify(bad)).toThrow('[audio manifest] must be an object with "zones": { <zone>: [ { "src": … } ] }');
    }
  });

  it('rejects unknown zones and zone entries that are not lists, loudly with the path', () => {
    expect(() => AudioManifest.parse({ zones: { sea: [] } })).toThrow('[audio manifest] zones.sea: unknown zone (arrival, lens, leak, border)');
    expect(() => AudioManifest.parse({ zones: { lens: { src: '/audio/a.ogg' } } })).toThrow('[audio manifest] zones.lens must be a list');
  });

  it('rejects loops that are not objects, or whose file is outside /audio/ or not an audio file', () => {
    const one = (loop: unknown) => () => AudioManifest.parse({ zones: { leak: [loop] } });
    expect(one('/audio/a.ogg')).toThrow('[audio manifest] zones.leak[0] must be an object');
    expect(one(null)).toThrow('zones.leak[0] must be an object');
    expect(one({})).toThrow('[audio manifest] zones.leak[0].src must be a path under /audio/ ending in .ogg, .opus, .mp3, .m4a, .webm, .wav or .flac');
    for (const src of ['https://example.com/audio/a.ogg', '//cdn/audio/a.ogg', 'audio/a.ogg', '/audio/../secret.ogg', '/audio/a.txt', '/audio/.ogg', '/img/a.ogg', '/audio/a b.ogg', '/audio/a.ogg?x=1']) {
      expect(one({ src }), src).toThrow('zones.leak[0].src must be a path under /audio/');
    }
  });

  it('rejects gains outside (0, 1]', () => {
    for (const gain of [0, -0.5, 1.5, Number.NaN, '0.5']) {
      expect(() => AudioManifest.parse({ zones: { lens: [{ src: '/audio/a.ogg', gain }] } }), String(gain)).toThrow('[audio manifest] zones.lens[0].gain must be a number in (0, 1]');
    }
  });
});

describe('AudioManifest.load', () => {
  const response = (status: number, body: () => unknown) => async (url: string) => {
    expect(url).toBe('/audio/manifest.json');
    return { ok: status >= 200 && status < 300, status, json: async () => body() };
  };

  it('fetches and validates the manifest', async () => {
    expect(await AudioManifest.load(response(200, () => ({ zones: { lens: [{ src: '/audio/a.ogg' }] } })))).toEqual([{ zone: 'lens', src: '/audio/a.ogg', gain: 1 }]);
  });

  it('gives no recordings, with a warning, when the manifest is missing', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(await AudioManifest.load(response(404, () => null))).toEqual([]);
    expect(warn).toHaveBeenCalledWith('[audio manifest] /audio/manifest.json answered 404; no field recordings.');
    warn.mockRestore();
  });

  it('gives no recordings, with an error naming the problem, when the manifest is malformed, unreadable or the fetch fails', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(await AudioManifest.load(response(200, () => ({ zones: { sea: [] } })))).toEqual([]);
    expect(await AudioManifest.load(response(200, () => {
      throw new SyntaxError('Unexpected token');
    }))).toEqual([]);
    expect(await AudioManifest.load(async () => {
      throw new TypeError('offline');
    })).toEqual([]);
    expect(error).toHaveBeenCalledTimes(3);
    expect(String(error.mock.calls[0][1])).toContain('zones.sea: unknown zone');
    error.mockRestore();
  });
});
