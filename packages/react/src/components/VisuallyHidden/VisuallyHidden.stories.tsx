import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { Text } from '../Text/Text.js';
import { VisuallyHidden } from './VisuallyHidden.js';

const meta = {
  title: 'Content/VisuallyHidden',
  component: VisuallyHidden,
  args: { children: ', in Fossil Design' },
  render: (args) => (
    <Text>
      Read the docs
      <VisuallyHidden {...args} />
    </Text>
  ),
} satisfies Meta<typeof VisuallyHidden>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    const paragraph = canvas.getByText(/Read the docs/);
    await expect(paragraph).toHaveTextContent(
      'Read the docs, in Fossil Design',
    );
    const hidden = canvas.getByText(', in Fossil Design');
    const box = hidden.getBoundingClientRect();
    await expect(box.width * box.height).toBeLessThanOrEqual(1);
  },
};
