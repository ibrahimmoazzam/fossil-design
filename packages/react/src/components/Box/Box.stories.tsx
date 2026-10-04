import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { tokenPx } from '../../../.storybook/token-px.js';
import { Text } from '../Text/Text.js';
import { Box } from './Box.js';
import { boxVariants } from './variants.js';

const meta = {
  title: 'Layout/Box',
  component: Box,
  args: {
    padding: 'l',
    surface: 'surface',
    radius: 'surface',
    children: <Text>Padding, surface and radius all come from tokens.</Text>,
  },
} satisfies Meta<typeof Box>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const box = canvasElement.firstElementChild;
    if (!(box instanceof HTMLElement)) throw new Error('Box did not render');
    const style = getComputedStyle(box);
    await expect(style.paddingBlockStart).toBe(tokenPx('--fossil-space-l'));
    await expect(style.paddingInlineEnd).toBe(tokenPx('--fossil-space-l'));
    await expect(style.borderTopLeftRadius).toBe(
      tokenPx('--fossil-radius-surface'),
    );
  },
};

export const LonghandOverShorthand: Story = {
  args: { padding: 'l', paddingInline: 'xs' },
  play: async ({ canvasElement }) => {
    const box = canvasElement.firstElementChild;
    if (!(box instanceof HTMLElement)) throw new Error('Box did not render');
    const style = getComputedStyle(box);
    await expect(style.paddingBlockStart).toBe(tokenPx('--fossil-space-l'));
    await expect(style.paddingInlineStart).toBe(tokenPx('--fossil-space-xs'));
  },
};

export const Element: Story = {
  args: {
    as: 'ul',
    display: 'flex',
    gap: 'm',
    children: ['One', 'Two', 'Three'].map((item) => (
      <Box as="li" key={item} padding="s" surface="page" radius="control">
        <Text as="span">{item}</Text>
      </Box>
    )),
  },
  play: async ({ canvasElement }) => {
    const list = canvasElement.firstElementChild;
    await expect(list?.tagName).toBe('UL');
    await expect(list?.children).toHaveLength(3);
    if (!(list instanceof HTMLElement)) throw new Error('Box did not render');
    await expect(getComputedStyle(list).columnGap).toBe(
      tokenPx('--fossil-space-m'),
    );
  },
};

/** Each surface sets its fill and paired text colour together; the a11y check verifies contrast. */
export const Surfaces: Story = {
  args: { surface: undefined, padding: undefined },
  render: () => (
    <Box display="grid" gap="m">
      {boxVariants.surface.map((surface) => (
        <Box key={surface} surface={surface} padding="m" radius="surface">
          <Text>surface=&quot;{surface}&quot;</Text>
        </Box>
      ))}
    </Box>
  ),
};

export const SurfacesDark: Story = {
  ...Surfaces,
  globals: { theme: 'dark' },
};
