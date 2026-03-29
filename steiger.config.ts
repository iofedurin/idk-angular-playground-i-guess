import { defineConfig } from 'steiger';
import fsd from '@feature-sliced/steiger-plugin';

export default defineConfig([
  ...fsd.configs.recommended,
  {
    // country/department/job-title are intentionally separate entities —
    // in a real app they would each have their own CRUD pages.
    rules: {
      'fsd/insignificant-slice': 'off',
    },
  },
  {
    // Pages are single-component routing shells — no extra segments needed.
    // entities/app has no UI layer — model + store only.
    files: ['./src/app/pages/**', './src/app/entities/app/**'],
    rules: {
      'fsd/no-segmentless-slices': 'off',
    },
  },
]);
