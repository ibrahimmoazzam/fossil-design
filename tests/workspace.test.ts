import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import config from '../fossil.config.json' with { type: 'json' };
import rootManifest from '../package.json' with { type: 'json' };

interface Manifest {
  name: string;
  private?: boolean;
  license?: string;
  repository?: { type?: string; url?: string; directory?: string };
  publishConfig?: { access?: string };
  scripts?: Record<string, string>;
  bin?: Record<string, string>;
}

const packagesDir = new URL('../packages/', import.meta.url);

const workspaces = readdirSync(packagesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => ({
    dir: entry.name,
    manifest: JSON.parse(
      readFileSync(new URL(`${entry.name}/package.json`, packagesDir), 'utf8'),
    ) as Manifest,
  }));

const published = workspaces.filter(
  ({ manifest }) => manifest.private !== true,
);

describe('fossil.config.json', () => {
  it('names the system, CSS prefix and npm scope', () => {
    expect(config.name).not.toBe('');
    expect(config.cssPrefix).toMatch(/^[a-z][a-z0-9-]*$/);
    expect(config.npmScope).toMatch(/^@[a-z0-9][a-z0-9._~-]*$/);
  });

  it.each(workspaces)(
    'names packages/$dir after its folder, under the scope',
    ({ dir, manifest }) => {
      expect(manifest.name).toBe(`${config.npmScope}/${dir}`);
    },
  );
});

describe('the AGENTS.md bin', () => {
  // A fork's apps run it by name, so it carries the fork's prefix, as its packages carry its scope.
  it('is named after the CSS prefix, and runs from the build', () => {
    const react = workspaces.find(({ dir }) => dir === 'react');
    expect(react?.manifest.bin).toEqual({
      [`${config.cssPrefix}-agents-md`]: './dist/bin/agents-md.js',
    });
  });
});

describe.each(published)('$manifest.name', ({ dir, manifest }) => {
  it('publishes publicly under the MIT license', () => {
    expect(manifest.publishConfig?.access).toBe('public');
    expect(manifest.license).toBe('MIT');
    expect(existsSync(new URL(`${dir}/LICENSE`, packagesDir))).toBe(true);
  });

  it('builds before packing, so a tarball never ships a stale dist', () => {
    expect(manifest.scripts?.prepack).toBe('pnpm run build');
  });

  // Trusted publishing rejects a package whose repository URL differs from the publishing repo.
  it('points at its own folder in this repository', () => {
    expect(manifest.repository).toEqual({
      type: 'git',
      url: rootManifest.repository.url,
      directory: `packages/${dir}`,
    });
  });
});
