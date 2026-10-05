// Counts Level 2 escapes: disable comments that turn off one of Fossil's rules, outside tests.
// With a base ref it also lists the escapes a branch adds. In CI it writes the report to the job
// summary. It reports and never fails: deviation should be visible, not impossible.
import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

/** Fossil's ESLint and Stylelint rules. A disable naming no rule turns off all of them. */
const fossilRules = new Set([
  'no-restricted-syntax',
  'scale-unlimited/declaration-strict-value',
  'csstools/value-no-unknown-custom-properties',
  'declaration-property-value-disallowed-list',
  'declaration-property-value-allowed-list',
]);

const everyRule = 'every rule';
const signal = 3;

const pathspecs = [
  '*.css',
  '*.js',
  '*.jsx',
  '*.mjs',
  '*.cjs',
  '*.ts',
  '*.tsx',
  '*.mts',
  '*.cts',
  ':!*.test.*',
  ':!**/test/**',
  ':!tests/**',
  ':!smoke/off-system/**',
];

interface Escape {
  file: string;
  line: number;
  rule: string;
  reason: string;
}

const directive =
  /\b(?:eslint|stylelint)-disable(?:-next-line|-line)?\b(.*?)(?:\*\/|$)/;

/** The escapes in `rev`, or in the working tree's tracked files without one. */
function escapesAt(rev?: string): Escape[] {
  let output: string;
  try {
    output = execFileSync(
      'git',
      [
        'grep',
        '-n',
        '-z',
        '-I',
        '-E',
        '(eslint|stylelint)-disable',
        ...(rev ? [rev] : []),
        '--',
        ...pathspecs,
      ],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
    );
  } catch (error) {
    // git grep exits with 1 when nothing matches.
    if ((error as { status?: number }).status === 1) return [];
    throw error;
  }
  return output
    .split('\n')
    .filter(Boolean)
    .flatMap((match) => {
      const [path = '', line = '', ...text] = match.split('\0');
      const body = directive.exec(text.join('\0'))?.[1];
      if (body === undefined) return [];
      const [rules = '', ...reason] = body.split(/\s--\s/);
      const names = rules
        .split(',')
        .map((rule) => rule.trim())
        .filter(Boolean);
      return (names.length > 0 ? names : [everyRule])
        .filter((rule) => rule === everyRule || fossilRules.has(rule))
        .map((rule) => ({
          file: rev ? path.slice(rev.length + 1) : path,
          line: Number(line),
          rule,
          reason: reason.join(' -- ').trim(),
        }));
    });
}

const countBy = (escapes: Escape[]) =>
  escapes.reduce(
    (counts, { rule }) => counts.set(rule, (counts.get(rule) ?? 0) + 1),
    new Map<string, number>(),
  );

/** The escapes in `head` with no match in `base`, matched by file, rule and reason. */
function added(head: Escape[], base: Escape[]): Escape[] {
  const key = ({ file, rule, reason }: Escape) =>
    [file, rule, reason].join('\0');
  const unmatched = new Map<string, number>();
  for (const escape of base) {
    unmatched.set(key(escape), (unmatched.get(key(escape)) ?? 0) + 1);
  }
  return head.filter((escape) => {
    const left = unmatched.get(key(escape)) ?? 0;
    unmatched.set(key(escape), left - 1);
    return left === 0;
  });
}

const baseRef = process.argv[2];
const head = escapesAt();
const base = baseRef ? escapesAt(baseRef) : undefined;
const headCounts = countBy(head);
const baseCounts = base ? countBy(base) : undefined;

const signed = (n: number) => (n > 0 ? `+${String(n)}` : String(n));
const row = (cells: string[]) => `| ${cells.join(' | ')} |`;
const lines = [
  '## Lint escapes',
  '',
  `${String(head.length)} disable comments turn off Fossil's rules${
    base ? ` (${signed(head.length - base.length)} on this branch)` : ''
  }.`,
  '',
];

const rules = [
  ...new Set([...headCounts.keys(), ...(baseCounts?.keys() ?? [])]),
].sort();
if (rules.length > 0) {
  const header = base ? ['Rule', 'Escapes', 'Change'] : ['Rule', 'Escapes'];
  lines.push(
    row(header),
    row(header.map(() => '---')),
    ...rules.map((rule) => {
      const count = headCounts.get(rule) ?? 0;
      const cells = [
        `\`${rule}\``,
        `${String(count)}${count >= signal ? ' ⚑' : ''}`,
      ];
      if (baseCounts) cells.push(signed(count - (baseCounts.get(rule) ?? 0)));
      return row(cells);
    }),
    '',
  );
}

if (rules.some((rule) => (headCounts.get(rule) ?? 0) >= signal)) {
  lines.push(
    `⚑ ${String(signal)} or more escapes from one rule: review them, and open a gap if they share a need.`,
    '',
  );
}

const fresh = base ? added(head, base) : [];
if (fresh.length > 0) {
  lines.push(
    '### Added on this branch',
    '',
    ...fresh.map(
      ({ file, line, rule, reason }) =>
        `- \`${file}:${String(line)}\` \`${rule}\`: ${reason || '(no reason)'}`,
    ),
    '',
  );
}

const report = lines.join('\n');
process.stdout.write(`${report}\n`);
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${report}\n`);
}
