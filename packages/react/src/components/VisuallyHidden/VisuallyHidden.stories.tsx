import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { Link } from '../Link/Link.js';
import { Text } from '../Text/Text.js';
import { VisuallyHidden } from './VisuallyHidden.js';

const meta = {
  title: 'Content/VisuallyHidden',
  component: VisuallyHidden,
  args: { children: ', in the docs site' },
  render: (args) => (
    <Text>
      Read the docs
      <VisuallyHidden {...args} />
    </Text>
  ),
} satisfies Meta<typeof VisuallyHidden>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Says what sighted readers get from the layout around it: here, which docs the link opens. */
export const InALink: Story = {
  tags: ['example'],
  render: () => (
    <Link href="#docs">
      Read the docs
      <VisuallyHidden> for the docs site</VisuallyHidden>
    </Link>
  ),
};

export const Default: Story = {
  play: async ({ canvas }) => {
    const paragraph = canvas.getByText(/Read the docs/);
    await expect(paragraph).toHaveTextContent(
      'Read the docs, in the docs site',
    );
    const hidden = canvas.getByText(', in the docs site');
    const box = hidden.getBoundingClientRect();
    await expect(box.width * box.height).toBeLessThanOrEqual(1);
  },
};
