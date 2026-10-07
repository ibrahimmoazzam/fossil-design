import type { ReactNode } from 'react';
import { Box, Card, Link, Stack, Text } from '../src/index.ts';
import { decisionRecords } from './pages.ts';

// The page sits in Storybook's preview frame, so a link to another page loads the whole site.
function PageLink({ page, children }: { page: string; children: ReactNode }) {
  return (
    <Link href={`./?path=/docs/${page}--docs`} target="_top" tone="accent">
      {children}
    </Link>
  );
}

const layers = [
  {
    title: 'Context',
    body: 'An always-on AGENTS.md block, component docs bundled in the installed package, and Figma variables with code syntax.',
  },
  {
    title: 'Constraint',
    body: 'Box props typed to token keys, a Stylelint config that allows only semantic tokens, and an ESLint rule against raw divs.',
  },
  {
    title: 'Verification',
    body: 'Token build validation, interaction and accessibility tests, and a check that the Figma library matches the code.',
  },
];

const sections = [
  {
    page: 'getting-started',
    title: 'Getting started',
    body: 'Install the packages, add the lint configs and point your coding agent at the docs.',
  },
  {
    page: 'foundations-overview',
    title: 'Foundations',
    body: 'The semantic tokens for colour, type and space, and the rules for using them.',
  },
  {
    page: 'layout-box',
    title: 'Components',
    body: 'Each component with when to use it, when not to, its states and its accessibility.',
  },
  {
    page: 'architecture-decision-records',
    title: 'Architecture',
    body: `${String(decisionRecords.length)} decision records: what was chosen, what was rejected and why.`,
  },
  {
    page: 'research-learnings',
    title: 'Research',
    body: 'The survey of production design systems behind the workflow, and the planned drift eval.',
  },
];

const grid = { gridTemplateColumns: 'repeat(auto-fit, minmax(12rem, 1fr))' };

/** The site's front page, built from Fossil's own components. */
export function Landing() {
  return (
    <Stack gap="2xl">
      <Stack as="header" gap="m" paddingBlock="xl">
        <Text variant="label" tone="muted">
          Open-source design system
        </Text>
        <Text as="h1" variant="heading-xl">
          Fossil Design
        </Text>
        <Text variant="prose" tone="muted">
          A design system for agentic coding. Tokens live in git and flow into
          CSS, typed React components, Figma variables and a Figma component
          library generated from code. Lint configs and docs bundled into the
          packages keep the UI that coding agents write on-system.
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
          Coding agents go off-system in two ways. They don&apos;t know what
          exists, so they invent; or they know, and drift anyway. Fossil answers
          the first with context and the second with constraint, and verifies
          both.
        </Text>
        <Box as="ul" display="grid" gap="m" style={grid}>
          {layers.map(({ title, body }) => (
            <Card key={title} as="li" title={title} titleAs="h3">
              {body}
            </Card>
          ))}
        </Box>
      </Stack>

      <Stack as="section" gap="m">
        <Text as="h2" id="explore" variant="heading-m">
          Explore
        </Text>
        <Box as="ul" display="grid" gap="m" style={grid}>
          {sections.map(({ page, title, body }) => (
            <Card
              key={page}
              as="li"
              title={<PageLink page={page}>{title}</PageLink>}
              titleAs="h3"
            >
              {body}
            </Card>
          ))}
        </Box>
      </Stack>
    </Stack>
  );
}
