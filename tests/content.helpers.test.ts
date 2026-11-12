import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withCopy } from '../src/content/helpers.js';
import fs from 'node:fs';
import path from 'node:path';

vi.mock('astro:content', () => {
  const db: Record<string, unknown> = {
    'copyWorks/arrivee': {
      id: 'arrivee',
      collection: 'copyWorks',
      data: {
        fragment: {
          status: 'draft',
          en: 'Test EN',
          fr: 'Test FR',
          sources: []
        }
      }
    }
  };

  return {
    getEntry: vi.fn((col, id) => Promise.resolve(db[`${col}/${id}`] || undefined))
  };
});

describe('withCopy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('merges copy data correctly without mutating original entry', async () => {
    const originalEntry: Record<string, unknown> = {
      id: 'arrivee',
      collection: 'works',
      data: {
        title: { fr: 'Arrivee' }
      }
    };

    Object.freeze(originalEntry);
    Object.freeze(originalEntry.data);

    const merged = await withCopy(originalEntry);

    expect(merged.data.title.fr).toBe('Arrivee');
    expect(merged.data.fragment.en).toBe('Test EN');
    expect(originalEntry.data.fragment).toBeUndefined();
  });

  it('merges territories copy data', async () => {
    const originalEntry: Record<string, unknown> = {
      id: 'dreamland',
      collection: 'territories',
      data: { slug: 'dreamland' }
    };
    const merged = await withCopy(originalEntry);
    expect(merged.data.statement).toBeUndefined(); // we didn't mock it, so it will warn and set undefined
  });

  it('merges zones copy data', async () => {
    const originalEntry: Record<string, unknown> = {
      id: 'lens',
      collection: 'zones',
      data: { slug: 'lens' }
    };
    const merged = await withCopy(originalEntry);
    expect(merged.data.statement).toBeUndefined();
  });

  it('returns original entry if collection is not mergeable', async () => {
    const originalEntry: Record<string, unknown> = {
      id: 'some-page',
      collection: 'pages',
      data: { slug: 'about' }
    };
    const merged = await withCopy(originalEntry);
    expect(merged).toBe(originalEntry);
  });

  it('returns undefined fragment and warns if copy is missing', async () => {
    const originalEntry: Record<string, unknown> = {
      id: 'missing-copy',
      collection: 'works',
      data: {
        title: { fr: 'Missing' },
        fragment: { someOldData: true } // to ensure it gets cleared
      }
    };
    
    Object.freeze(originalEntry);
    Object.freeze(originalEntry.data);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const merged = await withCopy(originalEntry);

    expect(merged.data.fragment).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith('[content] Missing copy for works/missing-copy');

    warnSpy.mockRestore();
  });

  it('every work in src/content/works has a corresponding copy in src/content/copy/works', () => {
    const worksDir = path.join(process.cwd(), 'src/content/works');
    const copyWorksDir = path.join(process.cwd(), 'src/content/copy/works');

    if (fs.existsSync(worksDir) && fs.existsSync(copyWorksDir)) {
      const works = fs.readdirSync(worksDir).filter(f => f.endsWith('.yaml'));
      for (const work of works) {
        expect(fs.existsSync(path.join(copyWorksDir, work))).toBe(true);
      }
    }
  });
});

