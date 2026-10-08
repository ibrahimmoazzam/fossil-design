/// <reference types="vite/client" />
import fossilConfig from '../../../fossil.config.json' with { type: 'json' };
import tokensFile from '@fossil-design/tokens/tokens.json';
import { onGitHub, sitePage } from './repo.ts';

/** Where a mention links: a URL, and the site page it opens, if it's on this site. */
export interface Target {
  href: string;
  page?: string;
}

const site = (page: string, anchor?: string): Target => ({
  href: sitePage(page, anchor),
  page,
});
const web = (href: string): Target => ({ href });
const npm = (name: string) => web(`https://www.npmjs.com/package/${name}`);
const published = (pkg: string, file: string) =>
  web(`https://cdn.jsdelivr.net/npm/${fossilConfig.npmScope}/${pkg}/${file}`);

const storyFiles = import.meta.glob<string>(
  '../src/components/*/*.stories.tsx',
  {
    query: '?raw',
    import: 'default',
    eager: true,
  },
);

/** Each component's docs page, from the title its stories file gives Storybook. */
export const components: Record<string, Target> = Object.fromEntries(
  Object.values(storyFiles).flatMap((source) => {
    const title = /title: '([A-Za-z]+)\/([A-Za-z]+)'/.exec(source);
    if (!title) return [];
    const [, group = '', name = ''] = title;
    return [[name, site(`${group}-${name}`.toLowerCase())]];
  }),
);

/** The token reference groups by the first part of a token's path, such as `color`. */
function token(term: string): Target | undefined {
  const path = term.startsWith(`--${fossilConfig.cssPrefix}-`)
    ? Object.keys(tokensFile.tokens).find(
        (key) => tokensFile.tokens[key]?.cssVar === term,
      )
    : term;
  const entry = path === undefined ? undefined : tokensFile.tokens[path];
  if (path === undefined || entry?.tier !== 'semantic') return undefined;
  return site('foundations-semantic-tokens', path.split('.')[0]);
}

/** Inline code that names a file, package or repository, and where it links. */
const code: Record<string, Target> = {
  // Files with a page on this site.
  'Learnings.md': site('research-learnings'),
  'docs/Learnings.md': site('research-learnings'),
  'docs/drift-eval.md': site('research-drift-eval'),
  'adopting.md': site('adopt-fossil-for-your-brand'),
  'docs/adopting.md': site('adopt-fossil-for-your-brand'),
  'key-decisions.md': site('architecture-key-decisions'),
  'docs/key-decisions.md': site('architecture-key-decisions'),
  'docs/decisions/': site('architecture-decision-records'),
  'foundations.md': site('foundations-overview'),
  'tokens.md': site('foundations-semantic-tokens'),

  // Files in this repository.
  'PRD.md': web(onGitHub('docs/PRD.md')),
  'docs/PRD.md': web(onGitHub('docs/PRD.md')),
  'gaps.md': web(onGitHub('docs/gaps.md')),
  'docs/gaps.md': web(onGitHub('docs/gaps.md')),
  'fossil.config.json': web(onGitHub('fossil.config.json')),
  'pnpm-workspace.yaml': web(onGitHub('pnpm-workspace.yaml')),
  'tsconfig.base.json': web(onGitHub('tsconfig.base.json')),
  'stylelint.config.js': web(onGitHub('stylelint.config.js')),
  '.mcp.json': web(onGitHub('.mcp.json')),
  '.github/workflows/release.yml': web(
    onGitHub('.github/workflows/release.yml'),
  ),
  'ci.yml': web(onGitHub('.github/workflows/ci.yml')),
  '.claude/skills/': web(onGitHub('.claude/skills/')),
  'smoke/': web(onGitHub('smoke/')),
  'smoke/off-system/': web(onGitHub('smoke/off-system/')),
  'tests/workspace.test.ts': web(onGitHub('tests/workspace.test.ts')),
  'packages/tokens/src/primitive/': web(
    onGitHub('packages/tokens/src/primitive/'),
  ),
  'src/semantic/': web(onGitHub('packages/tokens/src/semantic/')),
  'packages/tokens/scripts': web(onGitHub('packages/tokens/scripts/')),
  'packages/tokens/scripts/validate.ts': web(
    onGitHub('packages/tokens/scripts/validate.ts'),
  ),
  'packages/tokens/scripts/formats.ts': web(
    onGitHub('packages/tokens/scripts/formats.ts'),
  ),
  'packages/react/vitest.config.ts': web(
    onGitHub('packages/react/vitest.config.ts'),
  ),
  'packages/figma-sync/AGENTS.md': web(
    onGitHub('packages/figma-sync/AGENTS.md'),
  ),
  '.storybook/main.ts': web(onGitHub('packages/react/.storybook/main.ts')),
  'preview-head.html': web(
    onGitHub('packages/react/.storybook/preview-head.html'),
  ),
  'scripts/generate.ts': web(onGitHub('packages/react/scripts/generate.ts')),
  'docs-src/rules.md': web(onGitHub('packages/react/docs-src/rules.md')),
  'docs-src/agents.md': web(onGitHub('packages/react/docs-src/agents.md')),
  'docs-src/figma.md': web(onGitHub('packages/react/docs-src/figma.md')),
  'docs-src/guidelines/': web(onGitHub('packages/react/docs-src/guidelines/')),
  'docs-src/guidelines/setup.md': web(
    onGitHub('packages/react/docs-src/guidelines/setup.md'),
  ),
  'src/spec.ts': web(onGitHub('packages/figma-sync/src/spec.ts')),
  'src/library/components.ts': web(
    onGitHub('packages/figma-sync/src/library/components.ts'),
  ),
  'runtime.ts': web(onGitHub('packages/figma-sync/src/runtime.ts')),

  // Files the packages publish.
  'tokens.json': published('tokens', 'dist/tokens.json'),
  'tokens.css': published('tokens', 'dist/tokens.css'),
  'lint.json': published('tokens', 'dist/lint.json'),
  'foundations-brief.md': published('tokens', 'dist/foundations-brief.md'),
  'style.css': published('react', 'dist/style.css'),
  'dist/style.css': published('react', 'dist/style.css'),
  'Guidelines.md': published('react', 'guidelines/Guidelines.md'),
  'guidelines/Guidelines.md': published('react', 'guidelines/Guidelines.md'),
  'setup.md': published('react', 'guidelines/setup.md'),
  'guidelines/setup.md': published('react', 'guidelines/setup.md'),
  'components.json': published('react', 'docs/components.json'),
  'docs/index.md': published('react', 'docs/index.md'),
  'docs/agents-block.md': published('react', 'docs/agents-block.md'),

  // File formats other tools define.
  'AGENTS.md': web('https://agents.md/'),
  '@AGENTS.md': web('https://code.claude.com/docs/en/memory'),
  'CLAUDE.md': web('https://code.claude.com/docs/en/memory'),
  'CLAUDE.local.md': web('https://code.claude.com/docs/en/memory'),
  'SKILL.md': web('https://agentskills.io/'),
  'DESIGN.md': web('https://github.com/google-labs-code/design.md'),
  'atlassian.design/llms.txt': web('https://atlassian.design/llms.txt'),
  'llms.txt': web('https://llmstxt.org/'),

  // Fossil's packages.
  [`${fossilConfig.npmScope}/react`]: npm(`${fossilConfig.npmScope}/react`),
  [`${fossilConfig.npmScope}/tokens`]: npm(`${fossilConfig.npmScope}/tokens`),
  [`${fossilConfig.npmScope}/eslint-config`]: npm(
    `${fossilConfig.npmScope}/eslint-config`,
  ),
  [`${fossilConfig.npmScope}/stylelint-config`]: npm(
    `${fossilConfig.npmScope}/stylelint-config`,
  ),
  [`${fossilConfig.npmScope}/figma-sync`]: web(
    onGitHub('packages/figma-sync/'),
  ),

  // Other packages, each checked against the npm registry.
  ...Object.fromEntries(
    [
      '@atlaskit/tokens',
      '@carbon/themes',
      '@eslint-community/eslint-plugin-eslint-comments',
      '@floating-ui/react',
      '@joshwooding/vite-plugin-react-docgen-typescript',
      '@material-symbols/svg-400',
      '@storybook/addon-mcp',
      '@storybook/addon-vitest',
      '@storybook/angular-vite',
      '@storybook/mcp',
      '@storybook/react-vite',
      '@storybook/vue3-vite',
      '@types/node',
      '@types/react',
      '@typescript/typescript6',
      '@vanilla-extract/css',
      '@vanilla-extract/recipes',
      '@vanilla-extract/turbopack-plugin',
      '@vitejs/plugin-react',
      'create-next-app',
      'eslint-plugin-jsx-a11y',
      'eslint-plugin-primer-react',
      'focus-trap-react',
      'react-docgen',
      'react-docgen-typescript',
      'storybook',
      'stylelint-declaration-strict-value',
      'stylelint-plugin-carbon-tokens',
      'stylelint-value-no-unknown-custom-properties',
      'typescript',
      'typescript-eslint',
      'vite-css-modules',
    ].map((name) => [name, npm(name)]),
  ),
  '@typescript-eslint/no-deprecated': web(
    'https://typescript-eslint.io/rules/no-deprecated/',
  ),

  // Repositories, each checked against GitHub's API or Bitbucket.
  ...Object.fromEntries(
    [
      'adobe/react-spectrum',
      'adobe/spectrum-design-data',
      'agentskills/agentskills',
      'ant-design/ant-design',
      'carbon-design-system/carbon',
      'evilmartians/agent-skills',
      'evilmartians/design-lint',
      'figma/mcp-server-guide',
      'google-labs-code/design.md',
      'material-components/material-web',
      'microsoft/a11y-llm-eval',
      'microsoft/fluentui',
      'primer/css',
      'primer/primitives',
      'primer/react',
      'Shopify/polaris',
      'storybookjs/mcp',
      'storybookjs/storybook',
      'ymandrikov/ai-design-system',
    ].map((name) => [name, web(`https://github.com/${name}`)]),
  ),
  'atlassian/atlassian-frontend-mirror': web(
    'https://bitbucket.org/atlassian/atlassian-frontend-mirror',
  ),
};

/** Every file, package and repository the table names. */
export const codeTerms = Object.keys(code);

/** Where a piece of inline code links, or `undefined` when it names nothing known. */
export function codeTarget(term: string): Target | undefined {
  // JSX such as `<Box padding="l">` names its component.
  const tag = /^<([A-Z]\w*)[\s/>]/.exec(term)?.[1];
  return components[tag ?? term] ?? code[term] ?? token(term);
}

/** Tools, products and design systems named in running text, and their official sites. */
export const textLinks: Record<string, string> = {
  'Ant Design': 'https://ant.design/',
  Anthropic: 'https://www.anthropic.com/',
  'Are the Types Wrong': 'https://arethetypeswrong.github.io/',
  attw: 'https://arethetypeswrong.github.io/',
  Atlassian: 'https://atlassian.design/',
  axe: 'https://github.com/dequelabs/axe-core',
  'axe-core': 'https://github.com/dequelabs/axe-core',
  'Base UI': 'https://base-ui.com/',
  'Brad Frost': 'https://bradfrost.com/',
  Carbon: 'https://www.carbondesignsystem.com/',
  Changesets: 'https://github.com/changesets/changesets',
  Chromatic: 'https://www.chromatic.com/',
  'Claude Code': 'https://claude.com/product/claude-code',
  'Claude Design': 'https://claude.com/product/design',
  'Code Connect': 'https://developers.figma.com/docs/code-connect/',
  Codex: 'https://openai.com/codex/',
  Copilot: 'https://github.com/features/copilot',
  'CSS Modules': 'https://github.com/css-modules/css-modules',
  Cursor: 'https://cursor.com/',
  DTCG: 'https://www.designtokens.org/',
  ESLint: 'https://eslint.org/',
  'Evil Martians': 'https://evilmartians.com/',
  Figma: 'https://www.figma.com/',
  'Figma Make': 'https://www.figma.com/make/',
  'Floating UI': 'https://floating-ui.com/',
  Fluent: 'https://fluent2.microsoft.design/',
  Gemini: 'https://gemini.google.com/',
  'GitHub Actions': 'https://docs.github.com/en/actions',
  'GitHub Pages': 'https://pages.github.com/',
  'Google Fonts': 'https://fonts.google.com/',
  Griffel: 'https://griffel.js.org/',
  Lenis: 'https://lenis.dev/',
  'Lightning CSS': 'https://lightningcss.dev/',
  Material: 'https://m3.material.io/',
  'Material 3': 'https://m3.material.io/',
  'Material Symbols': 'https://fonts.google.com/icons',
  MCP: 'https://modelcontextprotocol.io/',
  Motion: 'https://motion.dev/',
  'Next.js': 'https://nextjs.org/',
  npm: 'https://www.npmjs.com/',
  Orbit: 'https://polar.sh/blog/orbit-llm-safe-design-system',
  Oxlint: 'https://oxc.rs/docs/guide/usage/linter',
  Playwright: 'https://playwright.dev/',
  pnpm: 'https://pnpm.io/',
  Polar: 'https://polar.sh/',
  Polaris: 'https://shopify.dev/docs/api/polaris',
  Prettier: 'https://prettier.io/',
  Primer: 'https://primer.style/',
  publint: 'https://publint.dev/',
  Radix: 'https://www.radix-ui.com/',
  React: 'https://react.dev/',
  'React Spectrum': 'https://react-spectrum.adobe.com/',
  Salesforce: 'https://www.lightningdesignsystem.com/',
  'shadcn/ui': 'https://ui.shadcn.com/',
  Spectrum: 'https://spectrum.adobe.com/',
  Storybook: 'https://storybook.js.org/',
  'Style Dictionary': 'https://styledictionary.com/',
  Stylelint: 'https://stylelint.io/',
  StyleX: 'https://stylexjs.com/',
  SVGR: 'https://react-svgr.com/',
  Tailwind: 'https://tailwindcss.com/',
  'Tokens Studio': 'https://tokens.studio/',
  Turbopack: 'https://nextjs.org/docs/app/api-reference/turbopack',
  TypeScript: 'https://www.typescriptlang.org/',
  uSpec: 'https://www.uber.com/blog/automate-design-specs/',
  'vanilla-extract': 'https://vanilla-extract.style/',
  Vercel: 'https://vercel.com/',
  Vite: 'https://vite.dev/',
  Vitest: 'https://vitest.dev/',
  WCAG: 'https://www.w3.org/TR/WCAG22/',
  zeroheight: 'https://zeroheight.com/',
};

/** An architecture decision record's place on the decision records page. */
export function adrTarget(
  number: string,
  anchors: Record<string, string>,
): Target | undefined {
  const anchor = anchors[number];
  return anchor === undefined
    ? undefined
    : site('architecture-decision-records', anchor);
}
