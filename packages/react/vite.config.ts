import { defineConfig, type Plugin } from 'vite';
import { patchCssModules } from 'vite-css-modules';
import fossilConfig from '../../fossil.config.json' with { type: 'json' };
import pkg from './package.json' with { type: 'json' };

const peers = Object.keys(pkg.peerDependencies);

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

export default defineConfig({
  plugins: [
    patchCssModules({ exportMode: 'default', generateSourceTypes: true }),
    styleDeclaration(),
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
        peers.some((peer) => id === peer || id.startsWith(`${peer}/`)),
      output: {
        // One file per module keeps 'use client' on the components that need it.
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
      },
    },
  },
});
