import fossil from '@fossil-design/eslint-config';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  globalIgnores(['.next/', 'next-env.d.ts']),
  { files: ['**/*.{ts,tsx}'], languageOptions: { parser: tseslint.parser } },
  fossil,
);
