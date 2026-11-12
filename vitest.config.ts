import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: {
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache', 'tests/e2e/**'],
    coverage: {
      provider: 'v8',
      include: ['src/**', 'tools/**', 'tests/**'],
      exclude: ['src/**/*.astro', 'tests/e2e/**', 'tools/download-fonts.ts', '**/*.d.ts'], // Astro components are tested via container api / playwright, but not tracked for v8 coverage easily
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100
      }
    }
  }
});
