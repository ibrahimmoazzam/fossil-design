import js from '@eslint/js';
import { fossil } from '@fossil-design/eslint-config';
import { defineConfig, globalIgnores } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default defineConfig(
  globalIgnores([
    '**/dist/',
    '**/coverage/',
    '**/src/generated/',
    '**/.figma/',
    '**/storybook-static/',
    '**/*.module.css.d.ts',
    // The smoke-test apps install Fossil from tarballs and have no node_modules in the repository.
    'smoke/',
  ]),
  {
    files: ['**/*.{js,ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['**/*.tsx'],
    extends: [reactHooks.configs.flat.recommended],
  },
  // Fossil lints its own code with the config it publishes, so consumers get a tested path.
  fossil(),
);
