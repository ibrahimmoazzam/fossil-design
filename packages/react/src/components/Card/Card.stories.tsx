import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { Box } from '../Box/Box.js';
import { Card } from './Card.js';

const meta = {
  title: 'Layout/Card',
  component: Card,
  args: {
    title: 'Accessible by default',
    titleAs: 'h3',
    children:
      'Native elements first, with keyboard support and a visible focus ring on everything interactive.',
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

/** One of a set of parallel items, with a title at the heading level that fits the page. */
export const Titled: Story = {
  tags: ['example'],
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { level: 3, name: 'Accessible by default' }),
    ).toBeVisible();
    await expect(canvas.getByRole('article')).toBeVisible();
  },
};

/** Without a title, a bold lead does the title's job. */
export const Untitled: Story = {
  tags: ['example'],
  args: {
    title: undefined,
    titleAs: undefined,
    children: (
      <>
        <strong>Tokens only.</strong> Every colour, space and radius comes from
        a token.
      </>
    ),
  },
};

export const InAList: Story = {
  render: (args) => (
    <Box as="ul" display="grid" gap="m">
      {['Tokens in git', 'Typed components', 'Figma variables'].map((title) => (
        <Card {...args} key={title} as="li" title={title} titleAs="h3" />
      ))}
    </Box>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole('listitem')).toHaveLength(3);
  },
};

export const Dark: Story = {
  globals: { theme: 'dark' },
  tags: ['!dev', '!autodocs'],
};
