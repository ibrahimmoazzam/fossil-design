import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as fossil from '../src/index.ts';
import {
  agentsBlock,
  blockMarkers,
  collect,
  componentList,
  componentNames,
  demote,
  element,
  fill,
  freeNames,
  readContract,
  readExamples,
  readStories,
  unloadedFonts,
  type ComponentDocs,
  type Inputs,
  type Prop,
} from './docs.ts';

const contract = `Does one thing.

## When to use

- For that thing.

## When not to use

- For another: use \`Other\`.

## States

None: it isn't interactive.

## Accessibility

### Built in

Native semantics.

### Up to you

Name it.`;

describe('reading a JSDoc contract', () => {
  it('reads the summary and every section', () => {
    expect(readContract(contract)).toEqual({
      problems: [],
      contract: {
        summary: 'Does one thing.',
        whenToUse: '- For that thing.',
        whenNotToUse: '- For another: use `Other`.',
        states: "None: it isn't interactive.",
        accessibility: { builtIn: 'Native semantics.', upToYou: 'Name it.' },
      },
    });
  });

  it('names the sections it needs when one is missing or out of order', () => {
    expect(readContract('Does one thing.').problems).toEqual([
      'the JSDoc needs the sections "When to use", "When not to use", "States" and "Accessibility", in that order, but has none',
    ]);
    const swapped = contract.replace('## States', '## Stats');
    expect(readContract(swapped).problems[0]).toMatch(
      /but has "When to use", "When not to use", "Stats" and "Accessibility"$/,
    );
  });

  it('needs a summary, both halves of Accessibility and no empty section', () => {
    expect(
      readContract(contract.replace('Does one thing.', '')).problems,
    ).toEqual(['the JSDoc has no summary before its sections']);
    expect(
      readContract(contract.replace('### Up to you\n\nName it.', '')).problems,
    ).toEqual([
      'the JSDoc\'s "Accessibility" section needs "### Built in" and "### Up to you", but has "Built in"',
    ]);
    expect(
      readContract(contract.replace("None: it isn't interactive.", ''))
        .problems,
    ).toEqual(['the JSDoc\'s "States" section is empty']);
  });
});

describe('writing JSX', () => {
  it('keeps an element on one line when it fits', () => {
    expect(element('Button', ['tone="primary"'], 'Save')).toBe(
      '<Button tone="primary">Save</Button>',
    );
    expect(element('Icon', ['label="Close"'])).toBe('<Icon label="Close" />');
  });

  it('puts each attribute on its own line when it would not fit', () => {
    expect(
      element('Clip', [
        `caption="${'A long caption. '.repeat(5).trim()}"`,
        'src={video}',
      ]),
    ).toBe(
      `<Clip\n  caption="${'A long caption. '.repeat(5).trim()}"\n  src={video}\n/>`,
    );
  });

  it('finds the names code uses without declaring', () => {
    expect(
      freeNames(`function Demo() {
  const [open, setOpen] = useState(false);
  return <Stack gap="m"><Button onClick={() => { setOpen(true); }} label={copy.label} />{open && <div />}</Stack>;
}`),
    ).toEqual(['Button', 'Stack', 'copy', 'useState']);
  });
});

describe('reading examples from stories', () => {
  const inputs: Inputs = {
    root: '',
    exports: { Thing: {}, Text: {}, Stack: {} },
    packageName: '@fossil-design/react',
  };
  const props: Prop[] = [
    { name: 'tone', type: '"a" | "b"', required: false, description: 'Tone.' },
    { name: 'label', type: 'string', required: true, description: 'Name.' },
  ];
  const examples = (stories: string) =>
    readExamples(
      'Thing',
      readStories(
        'Thing.stories.tsx',
        `import { fn } from 'storybook/test';
const meta = {
  title: 'Content/Thing',
  args: { label: 'Close', onChange: fn() },
} satisfies Meta<typeof Thing>;
export default meta;
${stories}`,
      ),
      props,
      inputs,
      new Set(['useState']),
    );

  it('writes the component from its args, leaving out the spies', () => {
    const {
      examples: [example],
      problems,
    } = examples(`
/** The usual case. */
export const Default: Story = { tags: ['example'], args: { tone: 'b', children: 'Hello' } };`);
    expect(problems).toEqual([]);
    expect(example).toEqual({
      name: 'Default',
      description: 'The usual case.',
      code: `import { Thing } from '@fossil-design/react';\n\n<Thing label="Close" tone="b">Hello</Thing>`,
      placeholders: [],
    });
  });

  it('prints a render as written, with React and Fossil imports', () => {
    const {
      examples: [example],
    } = examples(`
/** With state. */
export const Stateful: Story = {
  tags: ['example'],
  render: function Stateful() {
    const [on, setOn] = useState(false);
    return (
      <Stack gap="s">
        <Thing label="Toggle" onChange={setOn} />
      </Stack>
    );
  },
};`);
    expect(example?.code).toBe(`import { useState } from 'react';
import { Stack, Thing } from '@fossil-design/react';

function Stateful() {
  const [on, setOn] = useState(false);
  return (
    <Stack gap="s">
      <Thing label="Toggle" onChange={setOn} />
    </Stack>
  );
}`);
  });

  it('lists a documented module constant as a value the app supplies', () => {
    const {
      examples: [example],
      problems,
    } = examples(`
/** The URL of your image. */
const image = 'data:,';
/** With an image. */
export const Pictured: Story = { tags: ['example'], render: () => <Thing label="Photo" src={image} /> };`);
    expect(problems).toEqual([]);
    expect(example?.placeholders).toEqual([
      ['image', 'The URL of your image.'],
    ]);
  });

  it("rejects a name an app doesn't have, a render that takes args and a missing required prop", () => {
    const { problems } = examples(`
const helper = 1;
/** Uses a helper. */
export const Helper: Story = { tags: ['example'], render: () => <Thing label="x" size={helper} /> };
/** Takes args. */
export const Args: Story = { tags: ['example'], render: (args) => <Thing {...args} /> };
/** Spies on the label. */
export const Spy: Story = { tags: ['example'], args: { label: fn() } };
export const Undescribed: Story = { tags: ['example'] };`);
    expect(problems).toEqual([
      "the example story Helper uses `helper`, which an app doesn't have. Use @fossil-design/react's and React's exports, or a module-level constant with a JSDoc comment saying what the app puts there",
      'the example story Args: its render takes args. Write it as an app would, with no args, or drop render and let the args make the example',
      'the example story Spy: its args leave out `label`, which is required. Give the story a render that shows how an app supplies it',
      'the example story Undescribed needs a JSDoc comment saying why an app would do this',
    ]);
  });

  it('needs at least one example', () => {
    expect(examples('export const Plain: Story = {};').problems).toEqual([
      "no story is tagged 'example'. Tag one or more stories that show how an app uses it",
    ]);
  });
});

describe('the docs placeholders', () => {
  it('fills the ones it knows and fails on the rest', () => {
    expect(fill('{{name}} and {{ default }}', { name: 'Fossil' })).toBe(
      'Fossil and {{ default }}',
    );
    expect(() => fill('{{nope}}', {})).toThrow('unknown placeholder {{nope}}');
  });
});

describe('the AGENTS.md block', () => {
  it('names its markers after the npm scope', () => {
    expect(blockMarkers('@fossil-design')).toEqual({
      start: '<!-- BEGIN:fossil-design-agent-rules -->',
      end: '<!-- END:fossil-design-agent-rules -->',
    });
  });

  it('wraps the body in its markers, with Prettier kept off it', () => {
    expect(
      agentsBlock(
        '\n## Rules\n\nBe kind.\n',
        blockMarkers('@acme'),
        'Managed.',
      ),
    ).toBe(
      [
        '<!-- BEGIN:acme-agent-rules -->',
        '<!-- Managed. -->',
        '<!-- prettier-ignore-start -->',
        '',
        '## Rules',
        '',
        'Be kind.',
        '',
        '<!-- prettier-ignore-end -->',
        '<!-- END:acme-agent-rules -->',
        '',
      ].join('\n'),
    );
  });

  it('moves headings down a level, so the rules sit under its heading', () => {
    expect(demote('## Building\n\n### Gaps\n\nNot #1.', 1)).toBe(
      '### Building\n\n#### Gaps\n\nNot #1.',
    );
  });

  it('lists the components by group, then the icons', () => {
    const component = (name: string, group: string) =>
      ({ name, group }) as ComponentDocs;
    expect(
      componentList(
        [
          component('Box', 'Layout'),
          component('Button', 'Actions'),
          component('Stack', 'Layout'),
        ],
        ['CloseIcon'],
      ),
    ).toBe(
      [
        '- Layout: `Box`, `Stack`',
        '- Actions: `Button`',
        '- Icons, for any `icon` prop: `CloseIcon`, or any SVG component of your own',
      ].join('\n'),
    );
  });
});

describe('the Make setup', () => {
  it('names the fonts it never loads, as written or in a URL', () => {
    const setup =
      'family=Space+Grotesk:wght@700 and Figtree, from Google Fonts';
    expect(
      unloadedFonts(setup, ['Space Grotesk', 'Figtree', 'Space Mono']),
    ).toEqual(['Space Mono']);
  });
});

describe("the package's docs", () => {
  // It builds a TypeScript program for every component: up to 5s on a CI runner.
  it('cover every component, with nothing missing', () => {
    const inputs: Inputs = {
      root: fileURLToPath(new URL('..', import.meta.url)),
      exports: fossil,
      packageName: '@fossil-design/react',
    };
    const { components, problems } = collect(inputs);
    expect(problems).toEqual([]);
    expect(components.map((c) => c.name)).toEqual(componentNames(inputs));
    expect(components).toHaveLength(16);
  }, 30_000);
});
