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
import {
  ArchitectureIcon,
  ArrowForwardIcon,
  ComponentsIcon,
  DriftEvalIcon,
  FoundationsIcon,
  GettingStartedIcon,
  ResearchIcon,
} from './icons.ts';
import styles from './Landing.module.css';
import { decisionRecords } from './pages.ts';

// The page sits in Storybook's preview frame, so a link to another page loads the whole site.
const pageHref = (page: string) => `./?path=/docs/${page}--docs`;

function PageLink({ page, children }: { page: string; children: ReactNode }) {
  return (
    <Link href={pageHref(page)} target="_top" tone="accent">
      {children}
    </Link>
  );
}

const layers = [
  {
    title: 'Context',
    body: 'An always-on AGENTS.md block, component docs bundled in the installed package, guidelines for Figma Make, and Figma variables with code syntax.',
  },
  {
    title: 'Constraint',
    body: 'Box props typed to token keys, a Stylelint config that allows only semantic tokens, and an ESLint rule against raw divs.',
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
    body: 'The semantic tokens for colour, type and space, and the rules for using them.',
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

function LayerHeading({
  number,
  children,
}: {
  number: number;
  children: string;
}) {
  return (
    <Box as="span" className={styles.heading}>
      <Box as="span" className={styles.number} aria-hidden="true">
        {number}
      </Box>
      {children}
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
        <Text variant="prose" tone="muted">
          Built for the AI tools that write UI, in code and in Figma. Tokens
          live in git and flow into CSS, typed React components, Figma variables
          and a Figma component library generated from code. Lint configs, docs
          bundled into the packages and guidelines for Figma Make keep what
          coding agents and Make generate on-system.
        </Text>
        <Stack direction="row" gap="l">
          <PageLink page="getting-started">Get started</PageLink>
          <PageLink page="architecture-decision-records">
            Read the reasoning
          </PageLink>
        </Stack>
      </Stack>

      <Stack as="section" gap="m">
        <Text as="h2" id="how-it-works" variant="heading-m">
          How it works
        </Text>
        <Text variant="prose">
          AI tools go off-system in two ways. They don&apos;t know what exists,
          so they invent; or they know, and drift anyway. Fossil answers the
          first with context and the second with constraint, and verifies both.
        </Text>
        <Box as="ul" display="grid" gap="m" className={styles.layers}>
          {layers.map(({ title, body }, index) => (
            <Card
              key={title}
              as="li"
              title={<LayerHeading number={index + 1}>{title}</LayerHeading>}
              titleAs="h3"
            >
              {body}
            </Card>
          ))}
          <Card
            as="li"
            title="Verification"
            titleAs="h3"
            className={styles.verification}
          >
            Token build validation, interaction and accessibility tests, and a
            check that the Figma library matches the code.
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
