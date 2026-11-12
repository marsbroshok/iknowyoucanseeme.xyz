import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { mergeSelection, SelectionEntry, readSelection, writeSelection } from '../src/intake/SelectionStore.js';
import fs from 'fs';
import path from 'path';

describe('SelectionStore', () => {
  it('merging preserves edits and appends new', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.record({
          src: fc.string(), keep: fc.boolean(), slug: fc.string(), title_fr: fc.string(), territory: fc.string(), zone: fc.string(), techniques: fc.array(fc.string())
        }, { requiredKeys: ['src', 'keep', 'slug', 'title_fr', 'territory'] }), { selector: o => o.src }),
        fc.uniqueArray(fc.record({
          src: fc.string(), keep: fc.boolean(), slug: fc.string(), title_fr: fc.string(), territory: fc.string(), zone: fc.string(), techniques: fc.array(fc.string())
        }, { requiredKeys: ['src', 'keep', 'slug', 'title_fr', 'territory'] }), { selector: o => o.src }),
        (original, proposed) => {
          const merged = mergeSelection(original as SelectionEntry[], proposed as SelectionEntry[]);
          for (const orig of original) {
            const found = merged.find(m => m.src === orig.src);
            expect(found).toBeDefined();
            expect(found).toEqual(orig);
          }
          for (const prop of proposed) {
            const found = merged.find(m => m.src === prop.src);
            expect(found).toBeDefined();
            if (!original.find(o => o.src === prop.src)) {
              expect(found).toEqual(prop);
            }
          }
        }
      )
    );
  });

  it('reads and writes selection', () => {
    const temp = path.resolve(__dirname, 'temp_sel.yaml');
    expect(readSelection(temp)).toEqual([]); // missing file
    
    fs.writeFileSync(temp, 'foo: bar'); // missing selection key
    expect(readSelection(temp)).toEqual([]);
    
    const entries: SelectionEntry[] = [
      { src: '1.jpg', keep: true, slug: 's', title_fr: 't', territory: 't1' },
      { src: '2.jpg', keep: true, slug: 'r', title_fr: 'Les Reflets', territory: 't1', techniques: ['colour filter'] },
    ];
    writeSelection(temp, entries);
    
    expect(readSelection(temp)).toEqual(entries);
    fs.unlinkSync(temp);
  });
});

