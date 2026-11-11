import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Coverage configuration', () => {
  it('enforces 100% coverage thresholds', () => {
    const configPath = path.resolve(__dirname, '../vitest.config.ts');
    const configContent = fs.readFileSync(configPath, 'utf-8');
    
    expect(configContent).toContain('statements: 100');
    expect(configContent).toContain('branches: 100');
    expect(configContent).toContain('functions: 100');
    expect(configContent).toContain('lines: 100');
  });
});
