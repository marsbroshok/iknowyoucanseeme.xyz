import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ["node_modules/", "dist/", "dist-e2e-keyed/", "intake/", ".worktrees/", ".astro/", "coverage/", "test-results/"] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn'
    }
  }
);