import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { tokenPx } from '../../../.storybook/token-px.js';
import { Box } from '../Box/Box.js';
import { Text } from '../Text/Text.js';
import { Stack } from './Stack.js';

const items = ['One', 'Two', 'Three'].map((item) => (
  <Box key={item} padding="s" surface="surface" radius="control">
    <Text as="span">{item}</Text>
  </Box>
));

const meta = {
  title: 'Layout/Stack',
  component: Stack,
  args: { gap: 'm', children: items },
} satisfies Meta<typeof Stack>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Column: Story = {
  play: async ({ canvasElement }) => {
    const stack = canvasElement.firstElementChild;
    if (!(stack instanceof HTMLElement))
      throw new Error('Stack did not render');
    const style = getComputedStyle(stack);
    await expect(style.display).toBe('flex');
    await expect(style.flexDirection).toBe('column');
    await expect(style.rowGap).toBe(tokenPx('--fossil-space-m'));
  },
};

export const Row: Story = {
  args: { direction: 'row', align: 'center', justify: 'space-between' },
  play: async ({ canvasElement }) => {
    const stack = canvasElement.firstElementChild;
    if (!(stack instanceof HTMLElement))
      throw new Error('Stack did not render');
    const style = getComputedStyle(stack);
    await expect(style.flexDirection).toBe('row');
    await expect(style.alignItems).toBe('center');
    await expect(style.justifyContent).toBe('space-between');
  },
};
