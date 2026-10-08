import tokensFile from '@fossil-design/tokens/tokens.json';
import type { ReactNode } from 'react';
import { Box, Stack, Text } from '../src/index.ts';
import styles from './Primitives.module.css';

// The primitive tokens, read from the token build's JSON at build time. This page is for
// people: its Meta tags it !manifest, so Storybook MCP doesn't serve it to agents, and the
// docs bundled in the package don't include it.

interface Dimension {
  value: number;
  unit: 'px' | 'rem';
}
interface Color {
  components: number[];
  alpha?: number;
  hex: string;
}
interface Token {
  tier: string;
  type: string;
  cssVar?: string;
  value: unknown;
  aliasOf?: unknown;
  dark?: { aliasOf?: unknown };
  description?: string;
}

const tokens = tokensFile.tokens as Record<string, Token>;
const primitives = Object.entries(tokens).filter(
  ([, token]) => token.tier === 'primitive',
);

function aliasPaths(alias: unknown): string[] {
  if (typeof alias === 'string') return [alias];
  if (alias && typeof alias === 'object')
    return Object.values(alias).flatMap(aliasPaths);
  return [];
}

// Each primitive's semantic tokens, and the modes each one names it in.
const usedBy = new Map<string, Map<string, Set<'light' | 'dark'>>>();
for (const [name, token] of Object.entries(tokens)) {
  if (token.tier !== 'semantic') continue;
  const record = (alias: unknown, mode: 'light' | 'dark') => {
    for (const path of aliasPaths(alias)) {
      const names =
        usedBy.get(path) ?? new Map<string, Set<'light' | 'dark'>>();
      names.set(name, (names.get(name) ?? new Set()).add(mode));
      usedBy.set(path, names);
    }
  };
  record(token.aliasOf, 'light');
  record(token.dark?.aliasOf, 'dark');
}

const short = (name: string) => name.replace(/^base\./, '');
const px = ({ value, unit }: Dimension) =>
  unit === 'rem' ? value * 16 : value;

function formatValue(token: Token): string {
  const { type, value } = token;
  if (type === 'color') {
    const { hex, alpha } = value as Color;
    return alpha === undefined
      ? hex
      : `${hex} at ${String(Math.round(alpha * 100))}%`;
  }
  if (type === 'dimension') {
    const dimension = value as Dimension;
    const text = `${String(dimension.value)}${dimension.unit}`;
    return dimension.unit === 'rem'
      ? `${text} · ${String(px(dimension))}px`
      : text;
  }
  if (type === 'duration') {
    const { value: amount, unit } = value as { value: number; unit: string };
    return `${String(amount)}${unit}`;
  }
  if (type === 'cubicBezier')
    return `cubic-bezier(${(value as number[]).join(', ')})`;
  if (type === 'fontFamily') return (value as string[]).join(', ');
  return String(value);
}

function fill(token: Token): string {
  const { components, alpha = 1 } = token.value as Color;
  const [r, g, b] = components.map((c) => Math.round(c * 255));
  return `rgb(${String(r)} ${String(g)} ${String(b)} / ${String(alpha)})`;
}

// A token name breaks only after a dot or a hyphen, never mid-word.
function breakable(name: string): ReactNode[] {
  return name
    .split(/(?<=[.-])/)
    .flatMap((part, index) =>
      index === 0 ? [part] : [<wbr key={index} />, part],
    );
}

function UsedBy({ name }: { name: string }) {
  const names = [...(usedBy.get(name) ?? new Map<string, Set<string>>())];
  if (names.length === 0)
    return (
      <Text variant="caption" tone="muted">
        No semantic token yet
      </Text>
    );
  return (
    <Box as="ul" role="list" display="flex" gap="2xs" className={styles.uses}>
      {names.map(([semantic, modes]) => (
        <Text key={semantic} as="li" variant="caption" tone="muted">
          <code className={styles.code}>{breakable(semantic)}</code>
          {modes.size === 1 && modes.has('dark') && ' in dark'}
          {modes.size === 1 && modes.has('light') && tokens[semantic]?.dark
            ? ' in light'
            : ''}
        </Text>
      ))}
    </Box>
  );
}

const checker = 'primitives-checker';

/** A drawn sample of a primitive, sized from its value. */
function Sample({ name, token }: { name: string; token: Token }): ReactNode {
  const { type, value } = token;
  const group = short(name).split('.')[0];
  if (type === 'color')
    return (
      <svg className={styles.swatch} viewBox="0 0 160 72" aria-hidden="true">
        <rect width="160" height="72" fill={`url(#${checker})`} />
        <rect width="160" height="72" fill={fill(token)} />
      </svg>
    );
  if (group === 'space') {
    const width = Math.max(px(value as Dimension), 1);
    return (
      <svg width={width} height="12" aria-hidden="true">
        <rect className={styles.bar} width={width} height="12" />
      </svg>
    );
  }
  if (group === 'radius')
    return (
      <svg width="48" height="48" aria-hidden="true">
        <rect
          className={styles.shape}
          x="1"
          y="1"
          width="46"
          height="46"
          rx={Math.min(px(value as Dimension), 23)}
        />
      </svg>
    );
  if (name.startsWith('base.border.width'))
    return (
      <svg width="96" height="12" aria-hidden="true">
        <line
          className={styles.stroke}
          x1="0"
          y1="6"
          x2="96"
          y2="6"
          strokeWidth={px(value as Dimension)}
        />
      </svg>
    );
  if (name.startsWith('base.font.family'))
    return (
      <svg width="200" height="32" aria-hidden="true">
        <text
          className={styles.glyphs}
          x="0"
          y="24"
          fontFamily={formatValue(token)}
          fontSize="20"
        >
          Fossil Aa 123
        </text>
      </svg>
    );
  if (name.startsWith('base.font.size')) {
    const size = px(value as Dimension);
    return (
      <svg width={size * 1.6} height={size * 1.3} aria-hidden="true">
        <text className={styles.glyphs} x="0" y={size} fontSize={size}>
          Aa
        </text>
      </svg>
    );
  }
  if (name.startsWith('base.font.weight'))
    return (
      <svg width="48" height="32" aria-hidden="true">
        <text
          className={styles.glyphs}
          x="0"
          y="24"
          fontSize="22"
          fontWeight={String(value)}
        >
          Aa
        </text>
      </svg>
    );
  if (name.startsWith('base.letter-spacing'))
    return (
      <svg width="96" height="20" aria-hidden="true">
        <text
          className={styles.label}
          x="0"
          y="15"
          letterSpacing={px(value as Dimension)}
        >
          LABEL
        </text>
      </svg>
    );
  if (name.startsWith('base.line-height')) {
    const gap = (value as number) * 10;
    return (
      <svg width="72" height={gap * 2 + 6} aria-hidden="true">
        {[0, 1, 2].map((line) => (
          <rect
            key={line}
            className={styles.bar}
            y={line * gap}
            width={line === 2 ? 44 : 72}
            height="6"
            rx="3"
          />
        ))}
      </svg>
    );
  }
  if (group === 'duration') {
    const width = (value as { value: number }).value / 4;
    return (
      <svg width={width} height="12" aria-hidden="true">
        <rect className={styles.bar} width={width} height="12" />
      </svg>
    );
  }
  if (group === 'easing') {
    const [x1 = 0, y1 = 0, x2 = 1, y2 = 1] = value as number[];
    return (
      <svg width="56" height="56" viewBox="-4 -4 64 64" aria-hidden="true">
        <rect className={styles.frame} width="56" height="56" />
        <path
          className={styles.curve}
          d={`M0 56 C${String(x1 * 56)} ${String(56 - y1 * 56)} ${String(x2 * 56)} ${String(56 - y2 * 56)} 56 0`}
        />
      </svg>
    );
  }
  if (group === 'breakpoint') {
    const width = px(value as Dimension) / 16;
    return (
      <svg width={width} height="12" aria-hidden="true">
        <rect className={styles.bar} width={width} height="12" />
      </svg>
    );
  }
  return null;
}

function TokenName({ name, token }: { name: string; token: Token }) {
  return (
    <Stack gap="2xs">
      <Text as="strong" variant="small" className={styles.name}>
        {short(name)}
      </Text>
      {token.cssVar && (
        <code className={styles.code}>{breakable(token.cssVar)}</code>
      )}
    </Stack>
  );
}

function Swatches({ entries }: { entries: [string, Token][] }) {
  return (
    <Box as="ul" role="list" display="grid" gap="m" className={styles.swatches}>
      {entries.map(([name, token]) => (
        <Box
          key={name}
          as="li"
          surface="surface"
          radius="surface"
          display="flex"
          flexDirection="column"
          className={styles.tile}
        >
          <Sample name={name} token={token} />
          <Stack gap="xs" padding="m">
            <TokenName name={name} token={token} />
            <Text variant="caption" className={styles.value}>
              {formatValue(token)}
            </Text>
            {token.description && (
              <Text variant="caption" tone="muted">
                {token.description}
              </Text>
            )}
            <UsedBy name={name} />
          </Stack>
        </Box>
      ))}
    </Box>
  );
}

function Scale({ entries }: { entries: [string, Token][] }) {
  return (
    <Box tabIndex={0} className={styles.scroller}>
      <table className={styles.table}>
        <colgroup>
          <col className={styles.colToken} />
          <col className={styles.colValue} />
          <col className={styles.colSample} />
          <col />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">Token</th>
            <th scope="col">Value</th>
            <th scope="col">Sample</th>
            <th scope="col">Used by</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([name, token]) => (
            <tr key={name}>
              <td>
                <TokenName name={name} token={token} />
              </td>
              <td>
                <Text variant="caption" className={styles.value}>
                  {formatValue(token)}
                </Text>
                {token.description && (
                  <Text variant="caption" tone="muted">
                    {token.description}
                  </Text>
                )}
              </td>
              <td>
                <Sample name={name} token={token} />
              </td>
              <td>
                <UsedBy name={name} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Box>
  );
}

const pick = (...prefixes: string[]) =>
  primitives.filter(([name]) =>
    prefixes.some((prefix) => name.startsWith(`base.${prefix}`)),
  );

const colourFamilies = [
  ...new Set(pick('color.').map(([name]) => short(name).split('.')[1] ?? '')),
];

const sections: {
  id: string;
  title: string;
  intro: string;
  groups: { title?: string; entries: [string, Token][] }[];
}[] = [
  {
    id: 'space',
    title: 'Space',
    intro: 'The spacing scale, in rem. The semantic space tokens pick from it.',
    groups: [{ entries: pick('space.') }],
  },
  {
    id: 'radius',
    title: 'Radius',
    intro: 'Corner radii, from square to a full pill.',
    groups: [{ entries: pick('radius.') }],
  },
  {
    id: 'border',
    title: 'Border',
    intro: 'Stroke widths and the one stroke style.',
    groups: [{ entries: pick('border.') }],
  },
  {
    id: 'type',
    title: 'Type',
    intro:
      'The faces, sizes, weights, line heights and tracking the text styles combine.',
    groups: [
      { title: 'Font family', entries: pick('font.family.') },
      { title: 'Font size', entries: pick('font.size.') },
      { title: 'Font weight', entries: pick('font.weight.') },
      { title: 'Line height', entries: pick('line-height.') },
      { title: 'Letter spacing', entries: pick('letter-spacing.') },
    ],
  },
  {
    id: 'motion',
    title: 'Motion',
    intro: 'Durations and the easing curve.',
    groups: [{ entries: pick('duration.', 'easing.') }],
  },
  {
    id: 'layout',
    title: 'Layout',
    intro: 'Breakpoints, the reading measure and the overlay layer.',
    groups: [{ entries: pick('breakpoint.', 'size.', 'z-index.') }],
  },
];

/** How many primitives there are, for the page's introduction. */
export const primitiveCount = primitives.length;

/**
 * The site's showcase of the primitive tokens: every raw value, and what is built from it. The
 * page's MDX holds its title and introduction, so they match the other pages.
 */
export function Primitives() {
  return (
    <Stack gap="2xl">
      <svg className={styles.defs} aria-hidden="true">
        <defs>
          <pattern
            id={checker}
            width="16"
            height="16"
            patternUnits="userSpaceOnUse"
          >
            <rect className={styles.checkerBase} width="16" height="16" />
            <rect className={styles.checkerSquare} width="8" height="8" />
            <rect
              className={styles.checkerSquare}
              x="8"
              y="8"
              width="8"
              height="8"
            />
          </pattern>
        </defs>
      </svg>

      <Box padding="m" radius="surface" className={styles.note}>
        <Text variant="small">
          <strong>For looking, not for using.</strong> Code and designs take
          semantic tokens only; Stylelint rejects a{' '}
          <code className={styles.code}>--fossil-base-…</code> property. This
          page isn’t in the docs agents read.
        </Text>
      </Box>

      <Stack as="section" gap="l">
        <Stack gap="s">
          <Text as="h2" id="colour" variant="heading-m">
            Colour
          </Text>
          <Text variant="prose">
            The palette, by family. Translucent colours sit over a checkerboard.
          </Text>
        </Stack>
        {colourFamilies.map((family) => (
          <Stack key={family} gap="s">
            <Text as="h3" variant="heading-xs">
              {family.charAt(0).toUpperCase() + family.slice(1)}
            </Text>
            <Swatches entries={pick(`color.${family}`)} />
          </Stack>
        ))}
      </Stack>

      {sections.map(({ id, title, intro, groups }) => (
        <Stack key={id} as="section" gap="l">
          <Stack gap="s">
            <Text as="h2" id={id} variant="heading-m">
              {title}
            </Text>
            <Text variant="prose">{intro}</Text>
          </Stack>
          {groups.map(({ title: groupTitle, entries }) => (
            <Stack key={groupTitle ?? id} gap="s">
              {groupTitle && (
                <Text as="h3" variant="heading-xs">
                  {groupTitle}
                </Text>
              )}
              <Scale entries={entries} />
            </Stack>
          ))}
        </Stack>
      ))}
    </Stack>
  );
}
