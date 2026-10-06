import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { tokenPx } from '../../../.storybook/token-px.js';
import { Box } from '../Box/Box.js';
import { Button } from '../Button/Button.js';
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

/**
 * A heading over its text, then the actions in a row from the tablet breakpoint up: the most
 * common layout, with no CSS of its own.
 */
export const Section: Story = {
  tags: ['example'],
  render: () => (
    <Stack gap="l">
      <Stack gap="xs">
        <Text as="h2" variant="heading-m">
          Release notes
        </Text>
        <Text tone="muted">Spacing, colour and type all come from tokens.</Text>
      </Stack>
      <Stack direction={{ default: 'column', tablet: 'row' }} gap="s">
        <Button tone="primary">Read the notes</Button>
        <Button>Dismiss</Button>
      </Stack>
    </Stack>
  ),
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
