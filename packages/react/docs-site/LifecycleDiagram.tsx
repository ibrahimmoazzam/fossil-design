import { useId } from 'react';
import { Box, type IconComponent } from '../src/index.ts';
import {
  ClaudeIcon,
  CodexIcon,
  CursorIcon,
  FigmaIcon,
  FigmaMakeIcon,
  GitHubCopilotIcon,
  GitHubIcon,
  JsonIcon,
  NpmIcon,
  ReactIcon,
} from './logos.tsx';
import styles from './LifecycleDiagram.module.css';

// One drawing, top to bottom: the repo, what each release publishes, and a feature built from
// it. Solid arrows are delivery; dashed ones are contribution, back to the repo.
// Coordinates are in the viewBox's units; colours and type come from the stylesheet's tokens.

const logoSize = 22;
const logoGap = 8;

interface NodeProps {
  x: number;
  y: number;
  width: number;
  logos: IconComponent[];
  title: string;
  lines: string[];
}

/** A box sized to its text: a row of logos, a title, then a line of detail for each entry. */
function nodeHeight(lines: number): number {
  return 104 + (lines - 1) * 20;
}

function Node({ x, y, width, logos, title, lines }: NodeProps) {
  const centre = x + width / 2;
  const row = logos.length * logoSize + (logos.length - 1) * logoGap;
  return (
    <g>
      <rect
        className={styles.node}
        x={x}
        y={y}
        width={width}
        height={nodeHeight(lines.length)}
        rx={12}
      />
      {logos.map((Logo, index) => (
        <Logo
          key={Logo.displayName ?? Logo.name}
          className={styles.logo}
          x={centre - row / 2 + index * (logoSize + logoGap)}
          y={y + 16}
          width={logoSize}
          height={logoSize}
          aria-hidden="true"
        />
      ))}
      <text className={styles.title} x={centre} y={y + 62}>
        {title}
      </text>
      {lines.map((line, index) => (
        <text
          key={line}
          className={styles.detail}
          x={centre}
          y={y + 86 + index * 20}
        >
          {line}
        </text>
      ))}
    </g>
  );
}

function Label({
  x,
  y,
  children,
  anchor = 'start',
}: {
  x: number;
  y: number;
  children: string;
  anchor?: 'start' | 'middle' | 'end';
}) {
  return (
    <text className={styles.label} x={x} y={y} textAnchor={anchor}>
      {children}
    </text>
  );
}

const description =
  'The Fossil repo holds the tokens, as DTCG JSON, and the React components. Each release syncs and generates the Figma libraries, the foundations and the components, and builds the npm packages: the React components, the tokens, the lint configs, the docs, the AGENTS.md block and the Make guidelines. ' +
  'Each feature is designed in Figma from the libraries, or in Figma Make from a Make kit built from the npm packages, then built by a coding agent such as Claude Code, Cursor, Codex or GitHub Copilot, which reads the design through the Figma MCP server and builds with the packages and their docs, and shipped in a pull request on GitHub that the lint configs and type check guard. ' +
  'Two contribution loops come back to the repo: a designer’s value-only edits in the Figma libraries return as a pull request, and the gaps a build finds, with escapes repeated in review, become new components and patterns.';

/**
 * The design-to-code lifecycle: the system as one diagram, with delivery and contribution.
 * It has a page of its own, and takes the whole docs column there; preview-head.html has the rule.
 */
export function LifecycleDiagram() {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const forward = `${id}-forward`;
  const back = `${id}-back`;

  return (
    <Box
      as="figure"
      tabIndex={0}
      data-fossil-wide=""
      aria-label="Design-to-code lifecycle. Scrolls sideways on a narrow screen."
      className={styles.figure}
    >
      <svg
        viewBox="0 0 1160 712"
        role="img"
        aria-labelledby={`${id}-title ${id}-desc`}
        className={styles.diagram}
      >
        <title id={`${id}-title`}>Design-to-code lifecycle</title>
        <desc id={`${id}-desc`}>{description}</desc>
        <defs>
          <marker
            id={forward}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="9"
            markerHeight="9"
            markerUnits="userSpaceOnUse"
            orient="auto-start-reverse"
          >
            <path className={styles.headForward} d="M0 0 L10 5 L0 10 z" />
          </marker>
          <marker
            id={back}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="9"
            markerHeight="9"
            markerUnits="userSpaceOnUse"
            orient="auto-start-reverse"
          >
            <path className={styles.headBack} d="M0 0 L10 5 L0 10 z" />
          </marker>
        </defs>

        <line className={styles.rule} x1={24} y1={228} x2={1136} y2={228} />
        <line className={styles.rule} x1={24} y1={456} x2={1136} y2={456} />
        <text className={styles.band} x={24} y={56}>
          Source
        </text>
        <text className={styles.band} x={24} y={324}>
          Each release
        </text>
        <text className={styles.band} x={24} y={552}>
          Each feature
        </text>

        <rect
          className={styles.group}
          x={360}
          y={24}
          width={520}
          height={176}
          rx={16}
        />
        <text className={styles.groupTitle} x={384} y={56}>
          Fossil repo
        </text>
        <Node
          x={384}
          y={72}
          width={220}
          logos={[JsonIcon]}
          title="Tokens"
          lines={['DTCG JSON']}
        />
        <Node
          x={636}
          y={72}
          width={220}
          logos={[ReactIcon]}
          title="Components"
          lines={['React · JSDoc contracts']}
        />

        <Node
          x={200}
          y={262}
          width={300}
          logos={[FigmaIcon]}
          title="Figma libraries"
          lines={['Foundations · Components']}
        />
        <Node
          x={600}
          y={262}
          width={380}
          logos={[NpmIcon]}
          title="npm packages"
          lines={[
            'react · tokens · lint configs',
            'docs · AGENTS.md · Make guidelines',
          ]}
        />

        <Node
          x={200}
          y={490}
          width={220}
          logos={[FigmaIcon, FigmaMakeIcon]}
          title="Design"
          lines={['Figma · Figma Make']}
        />
        <Node
          x={520}
          y={490}
          width={220}
          logos={[ClaudeIcon, CursorIcon, CodexIcon, GitHubCopilotIcon]}
          title="Build"
          lines={['Coding agent']}
        />
        <Node
          x={830}
          y={490}
          width={170}
          logos={[GitHubIcon]}
          title="Ship"
          lines={['Pull request · CI']}
        />

        <g className={styles.edge} markerEnd={`url(#${forward})`}>
          <path d="M420 200 V232 H350 V260" />
          <path d="M790 200 V260" />
          <path d="M280 366 V488" />
          <path d="M630 386 V430 H380 V488" />
          <path d="M660 386 V488" />
          <path d="M915 386 V488" />
          <path d="M420 542 H518" />
          <path d="M740 542 H828" />
        </g>
        <Label x={428} y={220}>
          sync · generate
        </Label>
        <Label x={798} y={236}>
          build
        </Label>
        <Label x={288} y={410}>
          instances · variables
        </Label>
        <Label x={388} y={478}>
          Make kit
        </Label>
        <Label x={668} y={440}>
          components · docs
        </Label>
        <Label x={923} y={440}>
          lint · types
        </Label>
        <Label x={469} y={532} anchor="middle">
          Figma MCP
        </Label>

        <g className={styles.loop} markerEnd={`url(#${back})`}>
          <path d="M200 314 H172 V124 H358" />
          <path d="M630 594 V640 H1040 V124 H882" />
        </g>
        <path className={styles.loop} d="M915 594 V640" />
        <Label x={182} y={154}>
          value-only edits
        </Label>
        <Label x={182} y={172}>
          → pull request
        </Label>
        <Label x={638} y={622}>
          gaps
        </Label>
        <Label x={923} y={622}>
          escapes
        </Label>
        <Label x={1052} y={380}>
          gaps
        </Label>
        <Label x={1052} y={398}>
          → component
        </Label>
        <Label x={1052} y={416}>
          · pattern
        </Label>

        <line className={styles.edge} x1={200} y1={690} x2={240} y2={690} />
        <Label x={250} y={694}>
          delivery
        </Label>
        <line className={styles.loop} x1={340} y1={690} x2={380} y2={690} />
        <Label x={390} y={694}>
          contribution
        </Label>
      </svg>
    </Box>
  );
}
