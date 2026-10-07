import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { tokenPx } from '../../../.storybook/token-px.js';
import { Stack } from '../Stack/Stack.js';
import {
  Text,
  textVariants,
  type HeadingVariant,
  type TextVariant,
} from './Text.js';

const isHeading = (variant: TextVariant): variant is HeadingVariant =>
  variant.startsWith('heading-');

const meta = {
  title: 'Content/Text',
  component: Text,
  args: { children: 'The quick brown fox jumps over the lazy dog.' },
} satisfies Meta<typeof Text>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Body: Story = {};

/** A heading: the style sets its size, and `as` its level in the outline. */
export const Heading: Story = {
  tags: ['example'],
  args: { as: 'h2', variant: 'heading-l', children: 'A section heading' },
  play: async ({ canvas }) => {
    const heading = canvas.getByRole('heading', {
      level: 2,
      name: 'A section heading',
    });
    await expect(getComputedStyle(heading).fontSize).toBe(
      tokenPx('--fossil-text-heading-l-font-size'),
    );
    await expect(getComputedStyle(heading).marginBlockStart).toBe('0px');
  },
};

/** Secondary text, such as a date under a title: a smaller style in the muted tone. */
export const Secondary: Story = {
  tags: ['example'],
  args: {
    variant: 'caption',
    tone: 'muted',
    children: 'Updated 6 October 2026',
  },
};

export const Variants: Story = {
  render: () => (
    <Stack gap="m">
      {textVariants.variant.map((variant) =>
        isHeading(variant) ? (
          <Text key={variant} as="h3" variant={variant}>
            {variant}
          </Text>
        ) : (
          <Text key={variant} variant={variant}>
            {variant}
          </Text>
        ),
      )}
    </Stack>
  ),
  play: async ({ canvasElement }) => {
    const label = within(canvasElement).getByText('label');
    await expect(getComputedStyle(label).textTransform).toBe('uppercase');
  },
};

/** Every tone on the page; the a11y check verifies each meets contrast. */
export const Tones: Story = {
  render: () => (
    <Stack gap="s">
      {textVariants.tone.map((tone) => (
        <Text key={tone} tone={tone}>
          tone=&quot;{tone}&quot;
        </Text>
      ))}
    </Stack>
  ),
};

export const TonesDark: Story = {
  ...Tones,
  globals: { theme: 'dark' },
  tags: ['!dev', '!autodocs'],
};
