import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { Box } from '../Box/Box.js';
import { Text } from '../Text/Text.js';
import { SkipLink } from './SkipLink.js';

const meta = {
  title: 'Navigation/SkipLink',
  component: SkipLink,
  args: { href: '#main', children: 'Skip to content' },
  render: (args) => (
    <Box>
      <SkipLink {...args} />
      <Box as="nav" aria-label="Site" padding="m">
        <Text>Navigation</Text>
      </Box>
      <Box as="main" id="main" tabIndex={-1} padding="m">
        <Text>Main content</Text>
      </Box>
    </Box>
  ),
} satisfies Meta<typeof SkipLink>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Out of view until focused; Tab from the top of the page brings it in. */
export const Default: Story = {
  play: async ({ canvas }) => {
    const link = canvas.getByRole('link', { name: 'Skip to content' });
    await expect(link).toHaveAttribute('href', '#main');
    await expect(getComputedStyle(link).transform).not.toBe('none');
  },
};
