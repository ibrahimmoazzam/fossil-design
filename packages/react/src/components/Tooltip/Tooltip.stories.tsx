import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';
import { CloseIcon } from '../../generated/icons.js';
import { Button } from '../Button/Button.js';
import { Tooltip } from './Tooltip.js';

const meta = {
  title: 'Overlays/Tooltip',
  component: Tooltip,
  args: {
    content: 'Close the panel',
    children: <Button icon={CloseIcon} label="Close" />,
  },
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Focus opens it at once, and it describes its trigger. */
export const Default: Story = {
  tags: ['example'],
  play: async ({ canvas, canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole('button', { name: 'Close' });
    trigger.focus();
    const tooltip = await page.findByRole('tooltip');
    await expect(tooltip).toHaveTextContent('Close the panel');
    await expect(trigger).toHaveAccessibleDescription('Close the panel');
    trigger.blur();
    await waitFor(() => expect(tooltip).not.toBeInTheDocument());
  },
};

export const WithArrow: Story = {
  args: { arrow: true, open: true },
};

/** A long tooltip wraps, and narrows to its longest line. */
export const Long: Story = {
  args: {
    open: true,
    content: 'Closes the panel and returns focus to the button that opened it.',
  },
};

export const OpenDark: Story = {
  args: { open: true },
  globals: { theme: 'dark' },
  tags: ['!dev', '!autodocs'],
};
