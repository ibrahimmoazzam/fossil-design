import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';
import { Link } from '../Link/Link.js';
import { Text } from '../Text/Text.js';
import { Tabs } from './Tabs.js';

const meta = {
  title: 'Navigation/Tabs',
  component: Tabs,
  args: {
    label: 'Platform',
    onValueChange: fn(),
    tabs: [
      {
        id: 'web',
        label: 'Web',
        content: <Text>Plain JavaScript and one stylesheet.</Text>,
      },
      {
        id: 'figma',
        label: 'Figma',
        content: <Text>Variables and a generated library.</Text>,
      },
      {
        id: 'agents',
        label: 'Agents',
        content: (
          <Text>
            Bundled docs and an <Link href="#agents">AGENTS.md block</Link>.
          </Text>
        ),
      },
    ],
  },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Each tab is an id, a label and its panel's content. Tabs keeps the selection itself unless
 * the app passes `value`.
 */
export const Default: Story = {
  tags: ['example'],
  play: async ({ canvas, args, userEvent }) => {
    const figma = canvas.getByRole('tab', { name: 'Figma' });
    await userEvent.click(figma);
    await expect(figma).toHaveAttribute('aria-selected', 'true');
    await expect(args.onValueChange).toHaveBeenCalledWith('figma');
    await expect(
      canvas.getByRole('tabpanel', { name: 'Figma' }),
    ).toHaveTextContent('Variables and a generated library.');
  },
};

/** A panel with nothing focusable takes a tab stop; one with its own link doesn't. */
export const PanelFocus: Story = {
  args: { defaultValue: 'agents' },
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByRole('tabpanel')).toHaveAttribute(
      'tabindex',
      '-1',
    );
    await userEvent.click(canvas.getByRole('tab', { name: 'Web' }));
    await expect(canvas.getByRole('tabpanel')).toHaveAttribute('tabindex', '0');
  },
};

export const AlignStart: Story = {
  args: { align: 'start' },
};

export const Dark: Story = {
  globals: { theme: 'dark' },
};
