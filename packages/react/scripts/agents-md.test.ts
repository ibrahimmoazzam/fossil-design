import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { importsAgents, sync, withBlock, withImport } from './agents-md.ts';

const block = (version: string) =>
  `<!-- BEGIN:acme-agent-rules -->\n## Acme ${version}\n<!-- END:acme-agent-rules -->\n`;
const source = '@acme/react 1.0.0';

const temporary: string[] = [];
afterAll(() => {
  for (const dir of temporary) rmSync(dir, { recursive: true, force: true });
});
const app = (files: Record<string, string> = {}) => {
  const dir = mkdtempSync(join(tmpdir(), 'fossil-agents-md-'));
  temporary.push(dir);
  for (const [name, text] of Object.entries(files))
    writeFileSync(join(dir, name), text);
  return dir;
};
const read = (dir: string, name: string) =>
  readFileSync(join(dir, name), 'utf8');

describe('placing the block in AGENTS.md', () => {
  it('starts an empty file with it', () => {
    expect(withBlock('', block('1'))).toBe(block('1'));
  });

  it('adds it after what the file already says', () => {
    expect(withBlock('# My app\n\nUse pnpm.\n', block('1'))).toBe(
      `# My app\n\nUse pnpm.\n\n${block('1')}`,
    );
  });

  it('replaces only the block, wherever it sits', () => {
    const before = `# My app\n\n${block('1')}\n## Testing\n\nRun it.\n`;
    expect(withBlock(before, block('2'))).toBe(
      `# My app\n\n${block('2')}\n## Testing\n\nRun it.\n`,
    );
  });

  it('refuses a block whose end marker is gone', () => {
    expect(() =>
      withBlock('<!-- BEGIN:acme-agent-rules -->\nhalf', block('1')),
    ).toThrow('no <!-- END:acme-agent-rules --> after it');
  });
});

describe('importing AGENTS.md from CLAUDE.md', () => {
  it('sees an import on its own line or in a sentence', () => {
    expect(importsAgents('# Notes\n\n@AGENTS.md\n')).toBe(true);
    expect(importsAgents('Read @./AGENTS.md first.')).toBe(true);
    expect(importsAgents('See AGENTS.md, or @AGENTS.mdx.')).toBe(false);
  });

  it('adds the import at the end', () => {
    expect(withImport('# Notes\n')).toBe('# Notes\n\n@AGENTS.md\n');
    expect(withImport('')).toBe('@AGENTS.md\n');
  });
});

describe('running it in an app', () => {
  it('creates AGENTS.md, and leaves a missing CLAUDE.md alone', () => {
    const dir = app();
    expect(sync(dir, block('1'), source, false)).toEqual({
      ok: true,
      messages: ["Created AGENTS.md with @acme/react 1.0.0's block."],
    });
    expect(read(dir, 'AGENTS.md')).toBe(block('1'));
    expect(existsSync(join(dir, 'CLAUDE.md'))).toBe(false);
  });

  it('updates the block and imports AGENTS.md from CLAUDE.md, then has nothing to do', () => {
    const dir = app({
      'AGENTS.md': `# My app\n\n${block('1')}`,
      'CLAUDE.md': '# Claude\n',
    });
    expect(sync(dir, block('2'), source, false).messages).toEqual([
      "Updated @acme/react 1.0.0's block in AGENTS.md.",
      'Added @AGENTS.md to CLAUDE.md, so Claude Code reads AGENTS.md too.',
    ]);
    expect(read(dir, 'AGENTS.md')).toBe(`# My app\n\n${block('2')}`);
    expect(read(dir, 'CLAUDE.md')).toBe('# Claude\n\n@AGENTS.md\n');
    expect(sync(dir, block('2'), source, false)).toEqual({
      ok: true,
      messages: ["AGENTS.md has @acme/react 1.0.0's block, up to date."],
    });
  });

  it('with --check, fails on an old block or a missing import and writes nothing', () => {
    const files = {
      'AGENTS.md': `# My app\n\n${block('1')}`,
      'CLAUDE.md': '# Claude\n',
    };
    const dir = app(files);
    expect(sync(dir, block('2'), source, true)).toEqual({
      ok: false,
      messages: [
        "AGENTS.md's block doesn't match @acme/react 1.0.0.",
        "CLAUDE.md doesn't import AGENTS.md, so Claude Code won't read the block.",
      ],
    });
    expect(read(dir, 'AGENTS.md')).toBe(files['AGENTS.md']);
    expect(read(dir, 'CLAUDE.md')).toBe(files['CLAUDE.md']);
    expect(sync(app(), block('2'), source, true).messages).toEqual([
      "AGENTS.md doesn't have @acme/react 1.0.0's block.",
    ]);
  });

  it('keeps Windows line endings, and passes --check once written', () => {
    const dir = app({ 'AGENTS.md': '# My app\r\n\r\nUse pnpm.\r\n' });
    sync(dir, block('1'), source, false);
    expect(read(dir, 'AGENTS.md')).toBe(
      `# My app\n\nUse pnpm.\n\n${block('1')}`.replaceAll('\n', '\r\n'),
    );
    expect(sync(dir, block('1'), source, true).ok).toBe(true);
  });
});
