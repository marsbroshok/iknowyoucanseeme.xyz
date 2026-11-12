import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { inlineJson } from '../../src/domain/InlineJson.js';

describe('inlineJson', () => {
  it('cannot close the surrounding <script> element, whatever the copy says', () => {
    const value = { fragment: 'Before </script><script>alert(1)</script> after & <!-- more -->' };
    const out = inlineJson(value);
    expect(out).not.toMatch(/<\/script/i);
    expect(out).not.toMatch(/[<>&]/);
    expect(out).toContain('\\u003c/script\\u003e');
    expect(JSON.parse(out)).toEqual(value);
  });

  it('escapes the JavaScript line separators too', () => {
    const out = inlineJson({ text: 'a\u2028b\u2029c' });
    expect(out).toBe('{"text":"a\\u2028b\\u2029c"}');
  });

  it('round-trips any JSON value unchanged (property)', () => {
    fc.assert(
      fc.property(fc.jsonValue(), (value) => {
        const out = inlineJson(value);
        expect(out).not.toMatch(/[<>&\u2028\u2029]/);
        expect(JSON.parse(out)).toEqual(JSON.parse(JSON.stringify(value)));
      }),
    );
  });

  it('refuses values JSON cannot represent', () => {
    expect(() => inlineJson(undefined)).toThrow(/cannot be written as JSON/);
  });
});
