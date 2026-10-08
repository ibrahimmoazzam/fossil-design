import type { ReactNode } from 'react';
import {
  Box,
  Card,
  Icon,
  Link,
  Stack,
  Text,
  type IconComponent,
} from '../src/index.ts';
import { cx } from '../src/responsive.ts';
import {
  ArchitectureIcon,
  ArrowForwardIcon,
  ComponentsIcon,
  DriftEvalIcon,
  FoundationsIcon,
  GettingStartedIcon,
  ResearchIcon,
} from './icons.ts';
import {
  ClaudeIcon,
  CodexIcon,
  CSSIcon,
  CursorIcon,
  ESLintIcon,
  FigmaIcon,
  FigmaMakeIcon,
  GitHubCopilotIcon,
  GitHubIcon,
  JsonIcon,
  MCPIcon,
  NpmIcon,
  ReactIcon,
  StyleDictionaryIcon,
  StylelintIcon,
  ViteIcon,
} from './logos.tsx';
import styles from './Landing.module.css';
import { decisionRecords } from './pages.ts';
import { repo } from './repo.ts';

// The page sits in Storybook's preview frame, so a link to another page loads the whole site.
const pageHref = (page: string) => `./?path=/docs/${page}--docs`;

function PageLink({ page, children }: { page: string; children: ReactNode }) {
  return (
    <Link href={pageHref(page)} target="_top" tone="accent">
      {children}
    </Link>
  );
}

/** The repository on GitHub, as a chip, the same as under the site name in the sidebar. */
function RepoChip() {
  const name = new URL(repo).pathname.slice(1);
  return (
    <a
      href={repo}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${name} on GitHub (opens in a new tab)`}
      className={styles.repoChip}
    >
      <Icon icon={GitHubIcon} />
      {name}
    </a>
  );
}

interface Tool {
  icon: IconComponent;
  label: string;
}

interface Step {
  stage: string;
  tools: Tool[];
  items: { name: string; code?: boolean; body: string }[];
}

interface Pipeline {
  title: string;
  summary: string;
  /** Forks from the other pipelines' source rather than having its own. */
  branch?: boolean;
  steps: Step[];
}

const npm: Tool = { icon: NpmIcon, label: 'npm' };
const figma: Tool = { icon: FigmaIcon, label: 'Figma' };

// Each pipeline reads top to bottom; the stages line up across pipelines on wide screens.
const pipelines: Pipeline[] = [
  {
    title: 'Tokens',
    summary: 'Every colour, size, font and duration, named once.',
    steps: [
      {
        stage: 'In git',
        tools: [{ icon: JsonIcon, label: 'JSON' }],
        items: [
          {
            name: 'Token files',
            body: 'DTCG JSON, with light and dark values.',
          },
        ],
      },
      {
        stage: 'Built by',
        tools: [{ icon: StyleDictionaryIcon, label: 'Style Dictionary' }],
        items: [
          {
            name: 'The token build',
            body: 'Checks the source and its contrast, then runs Style Dictionary.',
          },
        ],
      },
      {
        stage: 'Ships as',
        tools: [npm, { icon: StylelintIcon, label: 'Stylelint' }],
        items: [
          {
            name: '@fossil-design/tokens',
            code: true,
            body: 'CSS, JSON and TypeScript.',
          },
          {
            name: '@fossil-design/stylelint-config',
            code: true,
            body: 'Semantic tokens only.',
          },
        ],
      },
    ],
  },
  {
    title: 'Components',
    summary: 'React components, styled only with semantic tokens.',
    steps: [
      {
        stage: 'In git',
        tools: [
          { icon: ReactIcon, label: 'React' },
          { icon: CSSIcon, label: 'CSS' },
        ],
        items: [
          {
            name: 'Component source',
            body: 'React and CSS Modules, each with a JSDoc contract and stories.',
          },
        ],
      },
      {
        stage: 'Built by',
        tools: [{ icon: ViteIcon, label: 'Vite' }],
        items: [
          {
            name: 'The package and docs builds',
            body: 'Vite for the code; docs from each contract and its stories.',
          },
        ],
      },
      {
        stage: 'Ships as',
        tools: [npm, { icon: ESLintIcon, label: 'ESLint' }],
        items: [
          {
            name: '@fossil-design/react',
            code: true,
            body: 'Components, docs for agents and the Make guidelines.',
          },
          {
            name: '@fossil-design/eslint-config',
            code: true,
            body: 'Layout through `Box`, and a reason on every disable.',
          },
        ],
      },
    ],
  },
  {
    title: 'Figma',
    summary: 'A branch off both pipelines, for designers.',
    branch: true,
    steps: [
      {
        stage: 'Built by',
        tools: [figma, { icon: MCPIcon, label: 'Model Context Protocol' }],
        items: [
          {
            name: 'The Figma sync and library build',
            body: 'Generated scripts, run through the Figma MCP server. Value edits come back as a pull request.',
          },
        ],
      },
      {
        stage: 'Ships as',
        tools: [figma],
        items: [
          {
            name: 'Foundations library',
            body: 'Variables, styles and icons.',
          },
          {
            name: 'Components library',
            body: 'Every component and variant.',
          },
        ],
      },
    ],
  },
];

const agents: Tool[] = [
  { icon: ClaudeIcon, label: 'Claude Code' },
  { icon: CursorIcon, label: 'Cursor' },
  { icon: CodexIcon, label: 'Codex' },
  { icon: GitHubCopilotIcon, label: 'GitHub Copilot' },
];

// Each consumer says which pipelines it draws on. Side by side, each sits under the middle of
// what it draws on, so the order matches the pipelines': Tokens, Figma, Components.
const consumers: {
  name: string;
  from: string;
  tools: Tool[];
  body: string;
}[] = [
  {
    name: 'Coding agents',
    from: 'Tokens and Components',
    tools: agents,
    body: 'Build with `@fossil-design/react` and the tokens, guided by `AGENTS.md` and the bundled docs. Types and lint reject drift.',
  },
  {
    name: 'Designers',
    from: 'Figma libraries',
    tools: [figma],
    body: 'Design with both libraries, using variables named as in code.',
  },
  {
    name: 'Figma Make',
    from: 'Tokens and Components',
    tools: [{ icon: FigmaMakeIcon, label: 'Figma Make' }],
    body: 'Builds with the same package through a Make kit, following its guidelines.',
  },
];

const offSystem = [
  {
    lead: 'They don’t know what exists, so they invent.',
    body: 'An agent that has never seen your Button writes its own, styled from its training data.',
  },
  {
    lead: 'They know, and drift anyway.',
    body: 'Training pulls harder than documentation, so an agent writes a raw hex value or a 12px margin with your tokens in plain view.',
  },
];

const layers = [
  {
    title: 'Context',
    lead: 'So agents know what exists, in the version you installed.',
    points: [
      {
        lead: 'An `AGENTS.md` block.',
        body: '`npx fossil-agents-md` writes the rules, the token scales and the component list into your app’s `AGENTS.md`, which coding agents read on every task.',
      },
      {
        lead: 'Docs in the package.',
        body: 'Each component’s when to use, when not to, states, accessibility, props and examples, read from `node_modules` rather than training data.',
      },
      {
        lead: 'Guidelines for Figma Make.',
        body: 'One line in a Make file’s guidelines routes Make through the same docs.',
      },
      {
        lead: 'Figma variables with code syntax.',
        body: 'Dev Mode and the Figma MCP server name each value as its custom property, not a hex code.',
      },
    ],
  },
  {
    title: 'Constraint',
    lead: 'So drift fails in the editor, before it ships.',
    points: [
      {
        lead: 'Props typed to tokens.',
        body: 'The `padding` and `gap` props on `Box` take token keys, not lengths, and there is no margin prop.',
      },
      {
        lead: 'Stylelint.',
        body: 'Semantic tokens only: no raw colours, no primitive tokens, no margins but `0`.',
      },
      {
        lead: 'ESLint.',
        body: 'No raw `<div>` or other element `Box` renders, so layout goes through `Box` and `Stack`.',
      },
      {
        lead: 'Visible escapes.',
        body: 'Every disable comment needs a reason, and the same escape three times is a gap to log.',
      },
    ],
  },
];

const checks = [
  {
    lead: 'Token validation.',
    body: 'Every token’s type and references, and the contrast of each text and border pair, in light and dark.',
  },
  {
    lead: 'Component tests.',
    body: 'Every story checked with axe at zero violations, with interaction tests and real keyboard and pointer input in a browser.',
  },
  {
    lead: 'Figma library checks.',
    body: 'Both Figma libraries are checked against the code: components, variants, properties, styles and icons.',
  },
  {
    lead: 'Smoke test.',
    body: 'The packed packages install, build and render in a Next.js app and a Vite app on React 18, and lint rejects a deliberately off-system component.',
  },
];

const sections = [
  {
    page: 'getting-started',
    title: 'Getting Started',
    icon: GettingStartedIcon,
    body: 'Install the packages, add the lint configs and point your coding agent and Figma Make at the docs.',
  },
  {
    page: 'foundations-overview',
    title: 'Foundations',
    icon: FoundationsIcon,
    body: 'The semantic tokens for colour, type and space, the primitives behind them, and the rules for using them.',
  },
  {
    page: 'layout-box',
    title: 'Components',
    icon: ComponentsIcon,
    body: 'Each component with when to use it, when not to, its states and its accessibility.',
  },
  {
    page: 'architecture-decision-records',
    title: 'Architecture',
    icon: ArchitectureIcon,
    body: `${String(decisionRecords.length)} decision records: what was chosen, what was rejected and why.`,
  },
  {
    page: 'research-learnings',
    title: 'Research',
    icon: ResearchIcon,
    body: 'The survey of production design systems that shaped the workflow.',
  },
  {
    page: 'research-drift-eval',
    title: 'Drift Eval',
    icon: DriftEvalIcon,
    body: 'The planned measure of how often agents stay on-system, with and without each layer.',
  },
];

// Backticks in the page's copy mark code, as they do in Markdown.
function withCode(text: string): ReactNode {
  return text.split('`').map((part, index) =>
    index % 2 === 1 ? (
      <code key={index} className={styles.code}>
        {part}
      </code>
    ) : (
      part
    ),
  );
}

function NumberBadge({ number }: { number: number }) {
  return (
    <Box as="span" className={styles.number} aria-hidden="true">
      {number}
    </Box>
  );
}

function LayerHeading({
  number,
  children,
}: {
  number: number;
  children: string;
}) {
  return (
    <Box as="span" className={styles.heading}>
      <NumberBadge number={number} />
      {children}
    </Box>
  );
}

// Each point opens with a bold lead, the way Card sets a lead in its body.
function Points({ points }: { points: { lead: string; body: string }[] }) {
  return (
    <Box as="ul" role="list" display="grid" gap="s" className={styles.points}>
      {points.map(({ lead, body }) => (
        <Text key={lead} as="li" variant="small">
          <strong>{withCode(lead)}</strong> {withCode(body)}
        </Text>
      ))}
    </Box>
  );
}

function Tools({ tools }: { tools: Tool[] }) {
  return (
    <Stack direction="row" gap="s" className={styles.tools}>
      {tools.map(({ icon, label }) => (
        <Icon key={label} icon={icon} label={label} size="m" />
      ))}
    </Stack>
  );
}

function Node({ stage, tools, items, first }: Step & { first: boolean }) {
  return (
    <Box
      as="li"
      surface="surface"
      padding="m"
      radius="surface"
      display="flex"
      flexDirection="column"
      gap="s"
      className={styles.node}
    >
      {!first && (
        <Box
          as="span"
          display="grid"
          className={styles.flow}
          aria-hidden="true"
        >
          <Icon icon={ArrowForwardIcon} />
        </Box>
      )}
      <Tools tools={tools} />
      <Text variant="label" tone="muted">
        {stage}
      </Text>
      {items.map(({ name, code, body }) => (
        <Stack key={name} gap="2xs">
          <Text as="strong" variant="small" className={styles.name}>
            {code ? <code className={styles.code}>{name}</code> : name}
          </Text>
          <Text variant="caption" tone="muted">
            {withCode(body)}
          </Text>
        </Stack>
      ))}
    </Box>
  );
}

/**
 * Two pipelines from git to npm, tokens and components, with a branch off both into Figma,
 * and who uses what they ship.
 */
function PipelineDiagram() {
  return (
    <Box as="figure" display="grid">
      <Box display="grid" gap="xl" className={styles.pipelines}>
        {pipelines.map(({ title, summary, branch, steps }) => (
          <Box
            key={title}
            display="grid"
            className={cx(styles.pipeline, branch && styles.branch)}
          >
            <Stack gap="2xs">
              <Text as="h3" variant="heading-xs" tone="highlight">
                {title}
              </Text>
              <Text variant="caption" tone="muted">
                {summary}
              </Text>
            </Stack>
            {branch && (
              <Box as="span" className={styles.fork} aria-hidden="true" />
            )}
            <Box
              as="ol"
              role="list"
              display="grid"
              aria-label={
                branch
                  ? `${title}, from both pipelines to what ships`
                  : `${title}, from source to what ships`
              }
              className={styles.steps}
            >
              {steps.map((step, index) => (
                <Node
                  key={step.stage}
                  {...step}
                  first={index === 0 && !branch}
                />
              ))}
            </Box>
          </Box>
        ))}
      </Box>
      <Box display="grid" aria-hidden="true" className={styles.connector}>
        {pipelines.map(({ title }) => (
          <Box key={title} as="span" display="grid" className={styles.drop}>
            <Icon icon={ArrowForwardIcon} />
          </Box>
        ))}
        <Box as="span" className={styles.hop} />
      </Box>
      <Box
        as="ul"
        role="list"
        display="grid"
        gap="m"
        aria-label="Used by"
        className={styles.consumers}
      >
        {consumers.map(({ name, from, tools, body }) => (
          <Box
            key={name}
            as="li"
            surface="surface"
            padding="m"
            radius="surface"
            display="flex"
            flexDirection="column"
            gap="s"
            className={styles.node}
          >
            <Tools tools={tools} />
            <Text variant="label" tone="muted">
              From {from}
            </Text>
            <Stack gap="2xs">
              <Text as="strong" variant="small" className={styles.name}>
                {name}
              </Text>
              <Text variant="caption" tone="muted">
                {withCode(body)}
              </Text>
            </Stack>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

interface SectionCardProps {
  page: string;
  title: string;
  icon: IconComponent;
  body: string;
}

// The heading's link stretches over the card, so the whole card is one target and one tab stop.
function SectionCard({ page, title, icon, body }: SectionCardProps) {
  return (
    <Box
      as="li"
      surface="surface"
      padding="l"
      radius="surface"
      display="flex"
      flexDirection="column"
      gap="l"
      className={styles.card}
    >
      <Icon icon={icon} className={styles.mark} />
      <Stack gap="xs" className={styles.text}>
        <Text as="h3" variant="heading-s">
          <a href={pageHref(page)} target="_top" className={styles.link}>
            {title}
          </a>
        </Text>
        <Text variant="prose" tone="muted">
          {body}
        </Text>
      </Stack>
      <Box as="span" className={styles.chip}>
        <Icon icon={ArrowForwardIcon} className={styles.arrow} />
      </Box>
    </Box>
  );
}

/** The site's front page, built from Fossil's own components. */
export function Landing() {
  return (
    <Stack gap="2xl">
      <Stack as="header" gap="m" paddingBlock="xl">
        <Text variant="label" tone="muted">
          Open-source agentic design system
        </Text>
        <Text as="h1" variant="heading-xl">
          Fossil Design
        </Text>
        <RepoChip />
        <Text variant="prose" tone="muted">
          Fossil Design is an{' '}
          <strong className={styles.pop}>agentic design system</strong>: a
          design system built for AI agents to stay on-system from design to
          code. Its tokens live in git and flow into CSS, typed React
          components, Figma variables and a Figma component library generated
          from code. Docs bundled into the packages, guidelines for Figma Make
          and lint configs keep what agents generate on-system.
        </Text>
        <Stack direction="row" gap="l" className={styles.actions}>
          <PageLink page="getting-started">Get started</PageLink>
          <PageLink page="architecture-design-to-code-lifecycle">
            See it from design to code
          </PageLink>
          <PageLink page="research-learnings">Read the reasoning</PageLink>
        </Stack>
      </Stack>

      <Stack as="section" gap="l">
        <Stack gap="s">
          <Text as="h2" id="how-it-works" variant="heading-m">
            How it works
          </Text>
          <Text variant="prose">
            Code is the source of truth. Two pipelines carry it from git to npm,
            and a branch off both carries it into Figma, for the designers,
            developers and agents who build with it.
          </Text>
        </Stack>
        <PipelineDiagram />
      </Stack>

      <Stack as="section" gap="l">
        <Text as="h2" id="why-it-matters" variant="heading-m">
          Why it matters
        </Text>
        <Stack gap="m">
          <Text variant="prose">AI tools go off-system in two ways:</Text>
          <Box as="ol" role="list" display="grid" gap="m">
            {offSystem.map(({ lead, body }, index) => (
              <Box key={lead} as="li" display="flex" alignItems="start" gap="s">
                <NumberBadge number={index + 1} />
                <Text variant="prose" className={styles.way}>
                  <strong>{withCode(lead)}</strong> {withCode(body)}
                </Text>
              </Box>
            ))}
          </Box>
          <Text variant="prose">
            Fossil answers the first with context and the second with
            constraint. Then it verifies both, so the system itself stays true
            in code and in Figma.
          </Text>
        </Stack>
        <Box as="ul" display="grid" gap="m" className={styles.layers}>
          {layers.map(({ title, lead, points }, index) => (
            <Card
              key={title}
              as="li"
              title={<LayerHeading number={index + 1}>{title}</LayerHeading>}
              titleAs="h3"
            >
              <Stack gap="m">
                <Text variant="prose">{lead}</Text>
                <Points points={points} />
              </Stack>
            </Card>
          ))}
          <Card
            as="li"
            title="Verification"
            titleAs="h3"
            className={styles.verification}
          >
            <Stack gap="m">
              <Text variant="prose">
                So Fossil itself stays on-system, in code and in Figma.
              </Text>
              <Points points={checks} />
            </Stack>
          </Card>
        </Box>
      </Stack>

      <Stack as="section" gap="m">
        <Text as="h2" id="explore" variant="heading-m">
          Explore
        </Text>
        <Box as="ul" display="grid" gap="m" className={styles.sections}>
          {sections.map((section) => (
            <SectionCard key={section.page} {...section} />
          ))}
        </Box>
      </Stack>
    </Stack>
  );
}
