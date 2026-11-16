import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { PERSONA_IDS, WAYFINDING_CHECK_IDS } from '../../src/ux/VisitorPersonas.js';

const ROOT = path.resolve(__dirname, '../..');

describe('UX survey & synthesis documentation invariants', () => {
  const surveyPath = path.join(ROOT, 'docs/ux/sociological-survey.md');
  const synthesisPath = path.join(ROOT, 'docs/ux/senior-ux-synthesis.md');
  const adrPath = path.join(
    ROOT,
    'docs/adr/0014-sociological-ux-survey-and-wayfinding-architecture.md',
  );
  const adr0015Path = path.join(
    ROOT,
    'docs/adr/0015-drift-wayfinding-ergonomics-and-focus-stepping.md',
  );
  const readmePath = path.join(ROOT, 'README.md');

  it('provides sociological-survey.md covering all 7 personas and 5 empirical viewports', () => {
    expect(fs.existsSync(surveyPath)).toBe(true);
    const text = fs.readFileSync(surveyPath, 'utf8');
    for (const id of PERSONA_IDS) {
      expect(text, `persona ${id}`).toContain(id);
    }
    for (const vp of ['375×667', '390×844', '820×1180', '1440×900', '1920×1080']) {
      expect(text, `viewport ${vp}`).toContain(vp);
    }
  });

  it('provides senior-ux-synthesis.md distilling P0/P1/P2 priorities and all 8 wayfinding checks', () => {
    expect(fs.existsSync(synthesisPath)).toBe(true);
    const text = fs.readFileSync(synthesisPath, 'utf8');
    for (const tier of ['P0', 'P1', 'P2']) {
      expect(text, `priority ${tier}`).toContain(tier);
    }
    for (const checkId of WAYFINDING_CHECK_IDS) {
      expect(text, `check ${checkId}`).toContain(checkId);
    }
  });

  it('records ADR 0014 & ADR 0015, documents empirical before/after persona scores, and indexes UX telemetry docs in README.md without local paths or commercial markers', () => {
    expect(fs.existsSync(adrPath)).toBe(true);
    expect(fs.existsSync(adr0015Path)).toBe(true);
    const readme = fs.readFileSync(readmePath, 'utf8');
    expect(readme).toContain('docs/ux/sociological-survey.md');
    expect(readme).toContain('docs/ux/senior-ux-synthesis.md');
    expect(readme).toContain('0014-sociological-ux-survey-and-wayfinding-architecture.md');
    expect(readme).toContain('0015-drift-wayfinding-ergonomics-and-focus-stepping.md');

    const synthesis = fs.readFileSync(synthesisPath, 'utf8');
    expect(synthesis).toContain('100 / 100');

    for (const docPath of [surveyPath, synthesisPath, adrPath, adr0015Path]) {
      const content = fs.readFileSync(docPath, 'utf8');
      expect(content).not.toMatch(/\/Users\/|\/home\/|\.gemini|\.agy|\.claude/);
      expect(content).not.toMatch(/€|\$|\bprix\b|\bprices?\b/i);
    }
  });
});
