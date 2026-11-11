import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ["node_modules/", "dist/", "intake/", ".worktrees/", "static/", "assets/", "layouts/", "hugo-blox/", "notebooks/", "config/", "content/", "_archived/"] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn'
    }
  }
);