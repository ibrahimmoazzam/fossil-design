import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import { Button } from '../Button/Button.js';
import { Link } from '../Link/Link.js';
import { Text } from '../Text/Text.js';
import { Popover } from './Popover.js';

const meta = {
  title: 'Overlays/Popover',
  component: Popover,
  args: {
    label: 'About this project',
    onOpenChange: fn(),
    content: (
      <>
        <Text as="span" variant="caption">
          Fossil Design is open source.
        </Text>
        <Link href="#source">Read the source</Link>
      </>
    ),
    children: <Button>About</Button>,
  },
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A click on the trigger opens it. Its content may hold links and controls, unlike a tooltip's. */
export const Default: Story = {
  tags: ['example'],
  play: async ({ canvas, canvasElement, args, userEvent }) => {
    const page = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole('button', { name: 'About' });
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(trigger);
    const popover = await page.findByRole('dialog', {
      name: 'About this project',
    });
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(args.onOpenChange).toHaveBeenLastCalledWith(true);
    await userEvent.click(trigger);
    await waitFor(() => expect(popover).not.toBeInTheDocument());
  },
};

export const WithArrow: Story = {
  args: { arrow: true, open: true },
  // Open, the popover takes focus and would scroll its docs page to itself.
  tags: ['!autodocs'],
};

export const OpenDark: Story = {
  args: { open: true },
  globals: { theme: 'dark' },
  tags: ['!dev', '!autodocs'],
};
