import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { defineConfig, type Plugin } from 'vite';
import { patchCssModules } from 'vite-css-modules';
import fossilConfig from '../../fossil.config.json' with { type: 'json' };
import pkg from './package.json' with { type: 'json' };

// The tokens are bundled into style.css, never imported at runtime; a bare CSS import left in JS
// breaks Node, Vitest and Jest consumers.
const external = [
  ...Object.keys(pkg.peerDependencies),
  ...Object.keys(pkg.dependencies).filter(
    (name) => name !== '@fossil-design/tokens',
  ),
];

/** A consumer's `import '@fossil-design/react/style.css'` needs a declaration under TypeScript 6. */
function styleDeclaration(): Plugin {
  return {
    name: 'fossil:style-declaration',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'style.css.d.ts',
        source: 'export {};\n',
      });
    },
  };
}

/** Apache-2.0 asks for its license to travel with the icons Fossil generates from Material Symbols. */
function iconLicense(): Plugin {
  const require = createRequire(import.meta.url);
  return {
    name: 'fossil:icon-license',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'licenses/material-symbols.txt',
        source: readFileSync(
          require.resolve('@material-symbols/svg-400/LICENSE'),
          'utf8',
        ),
      });
    },
  };
}

export default defineConfig({
  plugins: [
    patchCssModules({ exportMode: 'default', generateSourceTypes: true }),
    styleDeclaration(),
    iconLicense(),
  ],
  css: {
    modules: {
      generateScopedName: `${fossilConfig.cssPrefix}-[local]-[hash:base64:5]`,
    },
  },
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      cssFileName: 'style',
    },
    // Consumers minify. Unminified output stays readable, and skips Lightning CSS, which adds
    // `--lightningcss-*` variables wherever `color-scheme` appears.
    minify: false,
    rolldownOptions: {
      external: (id) =>
        external.some((name) => id === name || id.startsWith(`${name}/`)),
      output: {
        // One file per module keeps 'use client' on the components that need it.
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
      },
    },
  },
});
