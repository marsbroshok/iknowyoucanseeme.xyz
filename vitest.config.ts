import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: {
    exclude: ['**/node_modules/**', 'dist/**', 'dist-e2e-keyed/**', '.idea', '.git', '.cache', 'tests/e2e/**', '.worktrees/**'],
    coverage: {
      provider: 'v8',
      include: ['src/**', 'tools/**', 'tests/**'],
      exclude: ['src/**/*.astro', 'src/world/gl/**', 'tests/e2e/**', '**/*.d.ts'], // Astro components: container API / Playwright; WebGL code (src/world/gl): Playwright, see docs/adr/0006
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100
      }
    }
  }
});
