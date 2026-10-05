import fossil from '@fossil-design/eslint-config';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  globalIgnores(['dist/', 'dist-server/']),
  { files: ['**/*.{ts,tsx}'], languageOptions: { parser: tseslint.parser } },
  fossil,
);
